using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;
using OpenCvSharp;

namespace BiometricCore.Services;

public class FacialRecognitionService : IFacialRecognitionService, IDisposable
{
    private const int DetectorInputSize = 640;
    private const int RecognitionInputSize = 112;
    private const float DetectionScoreThreshold = 0.5f;
    private static readonly int[] DetectorStrides = { 8, 16, 32 };
    private const int DetectorAnchorsPerLocation = 2;

    // Canonical ArcFace 112x112 reference landmarks: left eye, right eye, nose tip, left mouth corner, right mouth corner.
    private static readonly Point2f[] ArcFaceReferenceLandmarks =
    {
        new(38.2946f, 51.6963f),
        new(73.5318f, 51.5014f),
        new(56.0252f, 71.7366f),
        new(41.5493f, 92.3655f),
        new(70.7299f, 92.2041f)
    };

    private readonly InferenceSession? _onnxSession;
    private readonly InferenceSession? _detectorSession;
    private readonly ILogger<FacialRecognitionService> _logger;
    private readonly string _inputNodeName;
    private readonly string _detectorInputNodeName;
    private readonly bool _usingFallback;
    private readonly bool _hasDetector;

    public FacialRecognitionService(IConfiguration config, ILogger<FacialRecognitionService> logger)
    {
        _logger = logger;

        string modelPath = config["Biometrics:ModelPath"] ?? "Models/insightface_arcface.onnx";

        if (!File.Exists(modelPath))
        {
            _logger.LogWarning("InsightFace ONNX model not found at {ModelPath}; using deterministic fallback embeddings for local development.", modelPath);
            _usingFallback = true;
            _inputNodeName = string.Empty;
            _detectorInputNodeName = string.Empty;
            return;
        }

        var sessionOptions = new Microsoft.ML.OnnxRuntime.SessionOptions();
        sessionOptions.AppendExecutionProvider_CPU();
        _onnxSession = new InferenceSession(modelPath, sessionOptions);
        _inputNodeName = _onnxSession.InputMetadata.Keys.First();
        _usingFallback = false;

        string detectorModelPath = config["Biometrics:DetectorModelPath"] ?? "Models/det_10g.onnx";
        if (!File.Exists(detectorModelPath))
        {
            _logger.LogWarning("SCRFD face detector model not found at {DetectorModelPath}; falling back to unaligned whole-image embeddings, which significantly degrades match accuracy.", detectorModelPath);
            _hasDetector = false;
            _detectorInputNodeName = string.Empty;
            return;
        }

        var detectorOptions = new Microsoft.ML.OnnxRuntime.SessionOptions();
        detectorOptions.AppendExecutionProvider_CPU();
        _detectorSession = new InferenceSession(detectorModelPath, detectorOptions);
        _detectorInputNodeName = _detectorSession.InputMetadata.Keys.First();
        _hasDetector = true;
    }

    public Task<float[]> ExtractEmbeddingAsync(byte[] imageBytes)
    {
        return Task.Run(() =>
        {
            if (imageBytes == null || imageBytes.Length == 0)
                throw new ArgumentException("Image payload cannot be empty.");

            if (_usingFallback || _onnxSession == null)
            {
                return CreateFallbackEmbedding(imageBytes);
            }

            using Mat rawMat = Cv2.ImDecode(imageBytes, ImreadModes.Color);
            if (rawMat.Empty())
                throw new InvalidOperationException("Failed to decode image stream. Invalid format.");

            using Mat alignedFace = _hasDetector && _detectorSession != null
                ? DetectAndAlignFace(rawMat)
                : FallbackResize(rawMat);

            using Mat rgbMat = new Mat();
            Cv2.CvtColor(alignedFace, rgbMat, ColorConversionCodes.BGR2RGB);

            var tensor = new DenseTensor<float>(new[] { 1, 3, RecognitionInputSize, RecognitionInputSize });

            for (int y = 0; y < RecognitionInputSize; y++)
            {
                for (int x = 0; x < RecognitionInputSize; x++)
                {
                    Vec3b pixel = rgbMat.At<Vec3b>(y, x);
                    tensor[0, 0, y, x] = (pixel.Item0 - 127.5f) / 128.0f;
                    tensor[0, 1, y, x] = (pixel.Item1 - 127.5f) / 128.0f;
                    tensor[0, 2, y, x] = (pixel.Item2 - 127.5f) / 128.0f;
                }
            }

            var inputs = new List<NamedOnnxValue>
            {
                NamedOnnxValue.CreateFromTensor(_inputNodeName, tensor)
            };

            using IDisposableReadOnlyCollection<DisposableNamedOnnxValue> results = _onnxSession.Run(inputs);
            var outputTensor = results.First().AsTensor<float>();
            float[] embedding = outputTensor.ToArray();

            Array.Clear(imageBytes, 0, imageBytes.Length);
            _logger.LogInformation("Raw image frame destroyed from memory after embedding extraction (POPIA Compliant).");

            return embedding;
        });
    }

    private Mat FallbackResize(Mat rawMat)
    {
        var resized = new Mat();
        Cv2.Resize(rawMat, resized, new Size(RecognitionInputSize, RecognitionInputSize));
        return resized;
    }

    private Mat DetectAndAlignFace(Mat rawMat)
    {
        var detection = DetectLargestFace(rawMat)
            ?? throw new InvalidOperationException("No face detected in the provided image. Please ensure your face is clearly visible, well-lit, and centered in frame.");

        return AlignFace(rawMat, detection.Landmarks);
    }

    private (Rect2f Box, Point2f[] Landmarks, float Score)? DetectLargestFace(Mat rawMat)
    {
        float detScale = Math.Min((float)DetectorInputSize / rawMat.Rows, (float)DetectorInputSize / rawMat.Cols);
        int newWidth = (int)Math.Round(rawMat.Cols * detScale);
        int newHeight = (int)Math.Round(rawMat.Rows * detScale);

        using Mat resized = new Mat();
        Cv2.Resize(rawMat, resized, new Size(newWidth, newHeight));

        using Mat canvas = new Mat(DetectorInputSize, DetectorInputSize, MatType.CV_8UC3, Scalar.Black);
        using (Mat roi = new Mat(canvas, new Rect(0, 0, newWidth, newHeight)))
        {
            resized.CopyTo(roi);
        }

        var tensor = new DenseTensor<float>(new[] { 1, 3, DetectorInputSize, DetectorInputSize });
        for (int y = 0; y < DetectorInputSize; y++)
        {
            for (int x = 0; x < DetectorInputSize; x++)
            {
                Vec3b pixel = canvas.At<Vec3b>(y, x);
                tensor[0, 0, y, x] = (pixel.Item2 - 127.5f) / 128.0f;
                tensor[0, 1, y, x] = (pixel.Item1 - 127.5f) / 128.0f;
                tensor[0, 2, y, x] = (pixel.Item0 - 127.5f) / 128.0f;
            }
        }

        var inputs = new List<NamedOnnxValue>
        {
            NamedOnnxValue.CreateFromTensor(_detectorInputNodeName, tensor)
        };

        using IDisposableReadOnlyCollection<DisposableNamedOnnxValue> results = _detectorSession!.Run(inputs);
        var outputs = results.ToDictionary(r => r.Name, r => r.AsTensor<float>().ToArray());

        float bestScore = float.MinValue;
        float bestCx = 0, bestCy = 0;
        float[] bestBoxDist = Array.Empty<float>();
        float[] bestKpsDist = Array.Empty<float>();
        int bestStride = 0;

        foreach (int stride in DetectorStrides)
        {
            int gridSize = DetectorInputSize / stride;
            int numLocations = gridSize * gridSize * DetectorAnchorsPerLocation;

            string? scoreKey = outputs.Keys.FirstOrDefault(k => outputs[k].Length == numLocations);
            string? bboxKey = outputs.Keys.FirstOrDefault(k => outputs[k].Length == numLocations * 4);
            string? kpsKey = outputs.Keys.FirstOrDefault(k => outputs[k].Length == numLocations * 10);

            if (scoreKey == null || bboxKey == null || kpsKey == null)
                continue;

            float[] scores = outputs[scoreKey];
            float[] bboxPreds = outputs[bboxKey];
            float[] kpsPreds = outputs[kpsKey];

            int idx = 0;
            for (int y = 0; y < gridSize; y++)
            {
                for (int x = 0; x < gridSize; x++)
                {
                    for (int a = 0; a < DetectorAnchorsPerLocation; a++)
                    {
                        float score = scores[idx];
                        if (score > bestScore)
                        {
                            bestScore = score;
                            bestCx = x * stride;
                            bestCy = y * stride;
                            bestBoxDist = new[]
                            {
                                bboxPreds[idx * 4 + 0] * stride,
                                bboxPreds[idx * 4 + 1] * stride,
                                bboxPreds[idx * 4 + 2] * stride,
                                bboxPreds[idx * 4 + 3] * stride
                            };
                            bestKpsDist = new float[10];
                            for (int k = 0; k < 10; k++)
                            {
                                bestKpsDist[k] = kpsPreds[idx * 10 + k] * stride;
                            }
                            bestStride = stride;
                        }
                        idx++;
                    }
                }
            }
        }

        if (bestScore < DetectionScoreThreshold || bestStride == 0)
            return null;

        float x1 = bestCx - bestBoxDist[0];
        float y1 = bestCy - bestBoxDist[1];
        float x2 = bestCx + bestBoxDist[2];
        float y2 = bestCy + bestBoxDist[3];

        var landmarks = new Point2f[5];
        for (int k = 0; k < 5; k++)
        {
            float lx = (bestCx + bestKpsDist[k * 2]) / detScale;
            float ly = (bestCy + bestKpsDist[k * 2 + 1]) / detScale;
            landmarks[k] = new Point2f(lx, ly);
        }

        var box = new Rect2f(x1 / detScale, y1 / detScale, (x2 - x1) / detScale, (y2 - y1) / detScale);
        return (box, landmarks, bestScore);
    }

    private static Mat AlignFace(Mat rawMat, Point2f[] landmarks)
    {
        (float scale, float rotation, float tx, float ty) = EstimateSimilarityTransform(landmarks, ArcFaceReferenceLandmarks);

        float cos = (float)Math.Cos(rotation) * scale;
        float sin = (float)Math.Sin(rotation) * scale;

        using Mat m = new Mat(2, 3, MatType.CV_32F);
        m.Set(0, 0, cos);
        m.Set(0, 1, -sin);
        m.Set(0, 2, tx);
        m.Set(1, 0, sin);
        m.Set(1, 1, cos);
        m.Set(1, 2, ty);

        var aligned = new Mat();
        Cv2.WarpAffine(rawMat, aligned, m, new Size(RecognitionInputSize, RecognitionInputSize), InterpolationFlags.Linear, BorderTypes.Constant, Scalar.Black);
        return aligned;
    }

    /// <summary>
    /// Closed-form 2D similarity transform (uniform scale + rotation + translation) mapping src points onto dst points,
    /// via the complex-number formulation of Umeyama's method.
    /// </summary>
    private static (float Scale, float Rotation, float Tx, float Ty) EstimateSimilarityTransform(Point2f[] src, Point2f[] dst)
    {
        int n = src.Length;
        float srcMeanX = src.Average(p => p.X);
        float srcMeanY = src.Average(p => p.Y);
        float dstMeanX = dst.Average(p => p.X);
        float dstMeanY = dst.Average(p => p.Y);

        double a = 0, b = 0, denom = 0;
        for (int i = 0; i < n; i++)
        {
            double sx = src[i].X - srcMeanX;
            double sy = src[i].Y - srcMeanY;
            double dx = dst[i].X - dstMeanX;
            double dy = dst[i].Y - dstMeanY;

            a += dx * sx + dy * sy;
            b += dy * sx - dx * sy;
            denom += sx * sx + sy * sy;
        }

        float scale = (float)(Math.Sqrt(a * a + b * b) / denom);
        float rotation = (float)Math.Atan2(b, a);

        float cos = (float)Math.Cos(rotation) * scale;
        float sin = (float)Math.Sin(rotation) * scale;
        float tx = dstMeanX - (cos * srcMeanX - sin * srcMeanY);
        float ty = dstMeanY - (sin * srcMeanX + cos * srcMeanY);

        return (scale, rotation, tx, ty);
    }

    private static float[] CreateFallbackEmbedding(byte[] imageBytes)
    {
        var embedding = new float[512];
        for (int i = 0; i < embedding.Length; i++)
        {
            int index = (i * 13 + imageBytes.Length) % imageBytes.Length;
            byte sample = imageBytes[index == 0 ? 0 : index];
            embedding[i] = (sample / 255f) * 2f - 1f + (i % 17 - 8) * 0.01f;
        }

        return embedding;
    }

    public (Guid? EmployeeId, float SimilarityScore) MatchFace(
        float[] inputVector,
        Dictionary<Guid, float[]> knownProfiles,
        float threshold = 0.75f)
    {
        Guid? matchedEmployeeId = null;
        float highestScore = 0.0f;

        foreach (var (employeeId, profileEmbedding) in knownProfiles)
        {
            float similarity = MathUtility.CosineSimilarity(inputVector, profileEmbedding);

            if (similarity > highestScore)
            {
                highestScore = similarity;
                matchedEmployeeId = employeeId;
            }
        }

        if (highestScore >= threshold)
        {
            return (matchedEmployeeId, highestScore);
        }

        return (null, highestScore);
    }

    public void Dispose()
    {
        _onnxSession?.Dispose();
        _detectorSession?.Dispose();
    }
}
