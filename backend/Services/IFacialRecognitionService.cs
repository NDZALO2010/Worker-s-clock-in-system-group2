namespace BiometricCore.Services;

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
}
