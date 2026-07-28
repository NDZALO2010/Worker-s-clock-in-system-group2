namespace BiometricCore.Utilities;

public static class MathUtility
{
    public static float[] ToFloatArray(byte[] bytes)
    {
        if (bytes == null || bytes.Length == 0)
            return Array.Empty<float>();

        int floatCount = bytes.Length / sizeof(float);
        float[] result = new float[floatCount];

        for (int i = 0; i < floatCount; i++)
        {
            result[i] = BitConverter.ToSingle(bytes, i * sizeof(float));
        }

        return result;
    }
}
