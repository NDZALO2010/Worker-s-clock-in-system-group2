namespace BiometricCore.Services;

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
        Buffer.BlockCopy(bytes, 0, floats, 0, bytes.Length);
        return floats;
    }
}
