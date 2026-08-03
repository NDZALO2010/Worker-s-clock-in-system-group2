namespace BiometricCore.Services;

public interface IFingerprintService
{
    /// <summary>
    /// Derives a 512-dimensional template vector from a fingerprint scan image and purges raw memory.
    /// </summary>
    Task<float[]> ExtractTemplateAsync(byte[] scanBytes);

    /// <summary>
    /// Searches registered fingerprint profiles and returns the matching Employee ID if similarity >= threshold (default 0.75).
    /// </summary>
    (Guid? EmployeeId, float SimilarityScore) MatchFingerprint(float[] inputVector, Dictionary<Guid, float[]> knownProfiles, float threshold = 0.75f);
}
