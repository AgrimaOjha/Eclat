
/**
 * ÉCLAT — Spectral Similarity Engine
 *
 * Compares two normalized frequency spectra
 * using cosine similarity.
 *
 * This measures similarity of spectral shape,
 * not perceptual or musical similarity.
 */

export type SimilarityLevel =
  | "Very similar"
  | "Moderately similar"
  | "Low similarity"
  | "Very different";

export type SpectralSimilarityResult = {
  score: number | null;
  cosineSimilarity: number | null;
  level: SimilarityLevel | "Unavailable";
  explanation: string;
};

/**
 * Compare two nonnegative spectral vectors.
 *
 * A null score indicates that a meaningful
 * comparison cannot be calculated.
 */
export function calculateSpectralSimilarity(
  barsA: number[],
  barsB: number[]
): SpectralSimilarityResult {
  if (
    barsA.length === 0 ||
    barsB.length === 0 ||
    barsA.length !== barsB.length
  ) {
    return {
      score: null,
      cosineSimilarity: null,
      level: "Unavailable",
      explanation:
        "The recordings do not have compatible spectral data.",
    };
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < barsA.length; i++) {
    const a = barsA[i];
    const b = barsB[i];

    // Our FFT display spectra are nonnegative.
    if (
      !Number.isFinite(a) ||
      !Number.isFinite(b) ||
      a < 0 ||
      b < 0
    ) {
      return {
        score: null,
        cosineSimilarity: null,
        level: "Unavailable",
        explanation:
          "The spectral data contains invalid values.",
      };
    }

    dotProduct += a * b;
    magnitudeA += a * a;
    magnitudeB += b * b;
  }

  // A silent or empty spectrum has no direction,
  // so cosine similarity is undefined.
  if (magnitudeA === 0 || magnitudeB === 0) {
    return {
      score: null,
      cosineSimilarity: null,
      level: "Unavailable",
      explanation:
        "At least one recording has no measurable spectral energy in the analyzed frequency range.",
    };
  }

  const denominator =
    Math.sqrt(magnitudeA) *
    Math.sqrt(magnitudeB);

  const cosineSimilarity = Math.min(
    1,
    Math.max(0, dotProduct / denominator)
  );

  const score = Number(
    (cosineSimilarity * 100).toFixed(2)
  );

  let level: SimilarityLevel;
  let explanation: string;

  if (score >= 90) {
    level = "Very similar";
    explanation =
      "The recordings have strongly aligned normalized frequency patterns.";
  } else if (score >= 70) {
    level = "Moderately similar";
    explanation =
      "The recordings share several frequency characteristics, with noticeable differences.";
  } else if (score >= 40) {
    level = "Low similarity";
    explanation =
      "The recordings have limited overlap in their normalized frequency patterns.";
  } else {
    level = "Very different";
    explanation =
      "The recordings have substantially different normalized frequency patterns.";
  }

  return {
    score,
    cosineSimilarity,
    level,
    explanation,
  };
}
