namespace BiometricCore.Services;

public interface IFacialRecognitionService
{
    Task<float[]> ExtractEmbeddingAsync(byte[] imageBytes);
    FaceMatchResult MatchFace(float[] inputVector, Dictionary<Guid, float[]> knownProfiles, float threshold);
}

public record FaceMatchResult(Guid? EmployeeId, float SimilarityScore);
