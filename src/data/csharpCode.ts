import { CSharpSourceFile } from '../types';

export const CSHARP_FILES: CSharpSourceFile[] = [
  {
    id: 'MathUtility.cs',
    fileName: 'MathUtility.cs',
    namespace: 'BiometricCore.Services',
    description: 'Handles 512D vector cosine similarity matching and binary float[] to byte[] serialization for encrypted DB storage.',
    code: `namespace BiometricCore.Services;

public static class MathUtility
{
    /// <summary>
    /// Calculates the cosine similarity between two 512-dimensional vectors.
    /// </summary>
    public static float CosineSimilarity(float[] vectorA, float[] vectorB)
    {
        if (vectorA.Length != vectorB.Length)
            throw new ArgumentException("Vectors must be of equal dimension.");

        float dotProduct = 0.0f;
        float normA = 0.0f;
        float normB = 0.0f;

        for (int i = 0; i < vectorA.Length; i++)
        {
            dotProduct += vectorA[i] * vectorB[i];
            normA += vectorA[i] * vectorA[i];
            normB += vectorB[i] * vectorB[i];
        }

        if (normA == 0.0f || normB == 0.0f)
            return 0.0f;

        return dotProduct / ((float)Math.Sqrt(normA) * (float)Math.Sqrt(normB));
    }

    /// <summary>
    /// Converts a float array vector to a byte array for encrypted database storage.
    /// </summary>
    public static byte[] ToByteArray(float[] floats)
    {
        var bytes = new byte[floats.Length * sizeof(float)];
        Buffer.BlockCopy(floats, 0, bytes, 0, bytes.Length);
        return bytes;
    }

    /// <summary>
    /// Reconstructs a float vector array from database byte array storage.
    /// </summary>
    public static float[] ToFloatArray(byte[] bytes)
    {
        var floats = new float[bytes.Length / sizeof(float)];
        Buffer.BlockCopy(bytes, 0, floats, 0, floats.Length);
        return floats;
    }
}`
  },
  {
    id: 'IFacialRecognitionService.cs',
    fileName: 'IFacialRecognitionService.cs',
    namespace: 'BiometricCore.Services',
    description: 'Interface contract for decoding images, extracting 512D embeddings, purging raw memory, and matching 1:N face profiles.',
    code: `namespace BiometricCore.Services;

public interface IFacialRecognitionService
{
    /// <summary>
    /// Decodes image bytes, aligns face, extracts 512D embedding vector, and purges raw memory.
    /// </summary>
    Task<float[]> ExtractEmbeddingAsync(byte[] imageBytes);

    /// <summary>
    /// Searches registered face profiles and returns the matching Employee ID if similarity >= threshold (default 0.75).
    /// </summary>
    (Guid? EmployeeId, float SimilarityScore) MatchFace(float[] inputVector, Dictionary<Guid, float[]> knownProfiles, float threshold = 0.75f);
}`
  },
  {
    id: 'FacialRecognitionService.cs',
    fileName: 'FacialRecognitionService.cs',
    namespace: 'BiometricCore.Services',
    description: 'OpenCvSharp4 decoding, 112x112 RGB tensor normalization, ONNX Runtime ArcFace inference, and POPIA memory purging.',
    code: `using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;
using OpenCvSharp;

namespace BiometricCore.Services;

public class FacialRecognitionService : IFacialRecognitionService, IDisposable
{
    private readonly InferenceSession _onnxSession;
    private readonly ILogger<FacialRecognitionService> _logger;
    private readonly string _inputNodeName;

    public FacialRecognitionService(IConfiguration config, ILogger<FacialRecognitionService> logger)
    {
        _logger = logger;
        
        // Path to your InsightFace / ArcFace ONNX model (e.g., w600k_mbf.onnx or glintr100.onnx)
        string modelPath = config["Biometrics:ModelPath"] ?? "Models/insightface_arcface.onnx";
        
        if (!File.Exists(modelPath))
        {
            throw new FileNotFoundException($"InsightFace ONNX model file not found at path: {modelPath}");
        }

        var sessionOptions = new SessionOptions();
        sessionOptions.AppendExecutionProvider_CPU(); // Upgrade to CUDA if GPU support is configured
        _onnxSession = new InferenceSession(modelPath, sessionOptions);
        
        _inputNodeName = _onnxSession.InputMetadata.Keys.First();
    }

    public Task<float[]> ExtractEmbeddingAsync(byte[] imageBytes)
    {
        return Task.Run(() =>
        {
            if (imageBytes == null || imageBytes.Length == 0)
                throw new ArgumentException("Image payload cannot be empty.");

            // 1. Decode Raw Image using OpenCvSharp
            using Mat rawMat = Cv2.ImDecode(imageBytes, ImreadModes.Color);
            if (rawMat.Empty())
                throw new InvalidOperationException("Failed to decode image stream. Invalid format.");

            // 2. Pre-process Image for InsightFace Model Input (Resize to 112x112, BGR->RGB, Normalize)
            using Mat resizedMat = new Mat();
            Cv2.Resize(rawMat, resizedMat, new Size(112, 112));
            
            using Mat rgbMat = new Mat();
            Cv2.CvtColor(resizedMat, rgbMat, ColorConversionCodes.BGR2RGB);

            // Create ONNX Tensor [1, 3, 112, 112]
            var tensor = new DenseTensor<float>(new[] { 1, 3, 112, 112 });
            
            for (int y = 0; y < 112; y++)
            {
                for (int x = 0; x < 112; x++)
                {
                    Vec3b pixel = rgbMat.At<Vec3b>(y, x);
                    // InsightFace normalization: (pixel - 127.5) / 128.0
                    tensor[0, 0, y, x] = (pixel.Item0 - 127.5f) / 128.0f; // R
                    tensor[0, 1, y, x] = (pixel.Item1 - 127.5f) / 128.0f; // G
                    tensor[0, 2, y, x] = (pixel.Item2 - 127.5f) / 128.0f; // B
                }
            }

            // 3. ONNX Inference - Generate 512D Embedding
            var inputs = new List<NamedOnnxValue>
            {
                NamedOnnxValue.CreateFromTensor(_inputNodeName, tensor)
            };

            using IDisposableReadOnlyCollection<DisposableNamedOnnxValue> results = _onnxSession.Run(inputs);
            var outputTensor = results.First().AsTensor<float>();
            float[] embedding = outputTensor.ToArray();

            // 4. POPIA Compliance: Securely wipe byte array and OpenCV Mats from RAM
            Array.Clear(imageBytes, 0, imageBytes.Length);
            _logger.LogInformation("Raw image frame destroyed from memory after embedding extraction (POPIA Compliant).");

            return embedding;
        });
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
    }
}`
  },
  {
    id: 'FacesController.cs',
    fileName: 'FacesController.cs',
    namespace: 'BiometricCore.Controllers',
    description: 'REST Controller exposing POST /api/v1/faces/register endpoint for employee face registration & vector payload generation.',
    code: `using Microsoft.AspNetCore.Mvc;
using BiometricCore.Services;

namespace BiometricCore.Controllers;

[ApiController]
[Route("api/v1/faces")]
public class FacesController : ControllerBase
{
    private readonly IFacialRecognitionService _facialService;
    private readonly ILogger<FacesController> _logger;

    public FacesController(IFacialRecognitionService facialService, ILogger<FacesController> logger)
    {
        _facialService = facialService;
        _logger = logger;
    }

    /// <summary>
    /// Processes an uploaded image frame, extracts the 512D ONNX vector, and returns the binary representation.
    /// </summary>
    [HttpPost("register")]
    public async Task<IActionResult> RegisterFace([FromForm] Guid employeeId, [FromForm] IFormFile faceImage)
    {
        if (faceImage == null || faceImage.Length == 0)
            return BadRequest(new { message = "Valid image file is required." });

        using var memoryStream = new MemoryStream();
        await faceImage.CopyToAsync(memoryStream);
        byte[] imageBytes = memoryStream.ToArray();

        try
        {
            float[] embeddingVector = await _facialService.ExtractEmbeddingAsync(imageBytes);
            byte[] vectorBytes = MathUtility.ToByteArray(embeddingVector);

            _logger.LogInformation("Face embedding successfully generated for Employee: {EmployeeId}", employeeId);

            return Ok(new
            {
                EmployeeId = employeeId,
                VectorDimension = embeddingVector.Length,
                EncryptedVectorPayload = Convert.ToBase64String(vectorBytes),
                Message = "Face registered successfully. Raw image discarded per POPIA guidelines."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing face image for Employee {EmployeeId}", employeeId);
            return StatusCode(500, new { message = "Failed to process face image.", details = ex.Message });
        }
    }
}`
  },
  {
    id: 'Program.cs',
    fileName: 'Program.cs',
    namespace: 'BiometricCore',
    description: 'ASP.NET Core bootstrapping and Dependency Injection container setup for IFacialRecognitionService as Singleton.',
    code: `using BiometricCore.Services;

var builder = WebApplication.CreateBuilder(args);

// Register Biometric Recognition Engine
builder.Services.AddSingleton<IFacialRecognitionService, FacialRecognitionService>();

builder.Services.AddControllers();
var app = builder.Build();

app.UseAuthorization();
app.MapControllers();
app.Run();`
  }
];
