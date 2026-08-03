namespace BiometricCore.Services;

/// <summary>
/// Simulated fingerprint matching: no physical scanner/SDK is wired up yet, so templates are
/// derived deterministically from the uploaded scan image bytes, mirroring the fallback path
/// FacialRecognitionService uses when no ONNX model is present. Swap ExtractTemplateAsync for a
/// real SDK call when hardware integration is available; MatchFingerprint's cosine-similarity
/// comparison stays the same.
/// </summary>
public class FingerprintService : IFingerprintService
{
    private readonly ILogger<FingerprintService> _logger;

    public FingerprintService(ILogger<FingerprintService> logger)
    {
        _logger = logger;
    }

    public Task<float[]> ExtractTemplateAsync(byte[] scanBytes)
    {
        return Task.Run(() =>
        {
            if (scanBytes == null || scanBytes.Length == 0)
                throw new ArgumentException("Fingerprint scan payload cannot be empty.");

            var template = new float[512];
            for (int i = 0; i < template.Length; i++)
            {
                int index = (i * 17 + scanBytes.Length) % scanBytes.Length;
                byte sample = scanBytes[index];
                template[i] = (sample / 255f) * 2f - 1f + (i % 13 - 6) * 0.01f;
            }

            Array.Clear(scanBytes, 0, scanBytes.Length);
            _logger.LogInformation("Raw fingerprint scan destroyed from memory after template extraction (POPIA compliant).");

            return template;
        });
    }

    public (Guid? EmployeeId, float SimilarityScore) MatchFingerprint(
        float[] inputVector,
        Dictionary<Guid, float[]> knownProfiles,
        float threshold = 0.75f)
    {
        Guid? matchedEmployeeId = null;
        float highestScore = 0.0f;

        foreach (var (employeeId, profileTemplate) in knownProfiles)
        {
            float similarity = MathUtility.CosineSimilarity(inputVector, profileTemplate);

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
}
