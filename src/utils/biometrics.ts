/**
 * Biometric Core Math Utility & Facial Recognition Engine
 * Mirrors C# MathUtility.cs & FacialRecognitionService.cs implementation
 */

/**
 * Calculates cosine similarity between two 512-dimensional vectors.
 * Exact mirror of C# MathUtility.CosineSimilarity
 */
export function cosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length) {
    throw new Error(`Vectors must be of equal dimension. Got ${vectorA.length} and ${vectorB.length}`);
  }

  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;

  for (let i = 0; i < vectorA.length; i++) {
    const valA = vectorA[i];
    const valB = vectorB[i];
    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }

  if (normA === 0.0 || normB === 0.0) {
    return 0.0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Converts a float array to a Uint8Array byte buffer (4 bytes per 32-bit float).
 * Exact mirror of C# MathUtility.ToByteArray
 */
export function toByteArray(floats: number[]): Uint8Array {
  const buffer = new ArrayBuffer(floats.length * 4);
  const view = new DataView(buffer);
  for (let i = 0; i < floats.length; i++) {
    view.setFloat32(i * 4, floats[i], true); // Little endian
  }
  return new Uint8Array(buffer);
}

/**
 * Reconstructs a float vector array from a byte buffer.
 * Exact mirror of C# MathUtility.ToFloatArray
 */
export function toFloatArray(bytes: Uint8Array): number[] {
  const floatCount = Math.floor(bytes.length / 4);
  const floats = new Array<number>(floatCount);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < floatCount; i++) {
    floats[i] = view.getFloat32(i * 4, true); // Little endian
  }
  return floats;
}

/**
 * Converts Uint8Array byte array to Base64 string.
 */
export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts Base64 string back to Uint8Array byte array.
 */
export function fromBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generates a normalized 512-dimensional vector.
 * If a seed string or face signature is given, produces a pseudo-deterministic vector.
 */
export function generate512DVector(seed?: string): number[] {
  const vector = new Array<number>(512);
  let hash = 0;
  if (seed) {
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
  }

  let sumSq = 0;
  for (let i = 0; i < 512; i++) {
    let pseudoRand: number;
    if (seed) {
      // Deterministic PRNG based on seed
      const x = Math.sin(hash + i * 9301 + 49297) * 233280;
      pseudoRand = (x - Math.floor(x)) * 2 - 1;
    } else {
      pseudoRand = Math.random() * 2 - 1;
    }
    vector[i] = pseudoRand;
    sumSq += pseudoRand * pseudoRand;
  }

  // Normalize vector to L2 unit length (common for ArcFace/InsightFace embeddings)
  const norm = Math.sqrt(sumSq) || 1;
  for (let i = 0; i < 512; i++) {
    vector[i] = vector[i] / norm;
  }

  return vector;
}

/**
 * Generates a slightly noisy variation of an existing vector (simulates webcam lighting/angle shifts)
 */
export function generateSimilarVector(baseVector: number[], noiseLevel = 0.12): number[] {
  const newVector = new Array<number>(512);
  let sumSq = 0;
  for (let i = 0; i < 512; i++) {
    const noise = (Math.random() * 2 - 1) * noiseLevel;
    const val = baseVector[i] + noise;
    newVector[i] = val;
    sumSq += val * val;
  }
  const norm = Math.sqrt(sumSq) || 1;
  for (let i = 0; i < 512; i++) {
    newVector[i] = newVector[i] / norm;
  }
  return newVector;
}

/**
 * Searches registered face profiles and returns matching Employee ID if similarity >= threshold (default 0.75).
 * Mirrors C# FacialRecognitionService.MatchFace
 */
export function matchFace(
  inputVector: number[],
  knownProfiles: Array<{ employeeId: string; vector: number[] }>,
  threshold = 0.75
): { matchedEmployeeId: string | null; highestScore: number } {
  let matchedEmployeeId: string | null = null;
  let highestScore = 0.0;

  for (const profile of knownProfiles) {
    const similarity = cosineSimilarity(inputVector, profile.vector);

    if (similarity > highestScore) {
      highestScore = similarity;
      matchedEmployeeId = profile.employeeId;
    }
  }

  if (highestScore >= threshold) {
    return { matchedEmployeeId, highestScore };
  }

  return { matchedEmployeeId: null, highestScore };
}
