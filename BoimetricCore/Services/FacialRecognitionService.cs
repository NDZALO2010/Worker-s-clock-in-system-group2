namespace BiometricCore.Services;

public class FacialRecognitionService : IFacialRecognitionService
{
    public Task<float[]> ExtractEmbeddingAsync(byte[] imageBytes)
    {
        // Placeholder implementation for facial feature extraction.
        // In a real system, replace this with model inference.
        float[] embedding = Enumerable.Range(0, 128).Select(i => (float)(imageBytes.Length % 256) / 255f).ToArray();
        return Task.FromResult(embedding);
    }

    public FaceMatchResult MatchFace(float[] inputVector, Dictionary<Guid, float[]> knownProfiles, float threshold)
    {
        if (knownProfiles.Count == 0)
        {
            return new FaceMatchResult(null, 0f);
        }

        Guid? bestId = null;
        float bestScore = 0f;

        foreach (var (employeeId, profileVector) in knownProfiles)
        {
            float score = CosineSimilarity(inputVector, profileVector);
            if (score > bestScore)
            {
                bestScore = score;
                bestId = employeeId;
            }
        }

        return bestScore >= threshold ? new FaceMatchResult(bestId, bestScore) : new FaceMatchResult(null, bestScore);
    }

    private static float CosineSimilarity(float[] a, float[] b)
    {
        if (a.Length != b.Length || a.Length == 0)
            return 0f;

        float dot = 0f;
        float magA = 0f;
        float magB = 0f;

        for (int i = 0; i < a.Length; i++)
        {
            dot += a[i] * b[i];
            magA += a[i] * a[i];
            magB += b[i] * b[i];
        }

        if (magA == 0 || magB == 0)
            return 0f;

        return dot / (float)(Math.Sqrt(magA) * Math.Sqrt(magB));
    }
}
