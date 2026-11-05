
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  calculateSpectralSimilarity,
} from "../lib/spectralSimilarity";

describe("ÉCLAT — Spectral Similarity Engine", () => {
  it("returns 100% for identical spectra", () => {
    const spectrum = [0.1, 0.5, 1, 0.3];

    const result = calculateSpectralSimilarity(
      spectrum,
      spectrum
    );

    expect(result.score).toBe(100);
    expect(result.level).toBe("Very similar");
  });

  it("returns 0% for non-overlapping spectra", () => {
    const result = calculateSpectralSimilarity(
      [1, 0, 0],
      [0, 1, 0]
    );

    expect(result.score).toBe(0);
    expect(result.level).toBe("Very different");
  });

  it("calculates partial similarity", () => {
    const result = calculateSpectralSimilarity(
      [1, 1, 0],
      [1, 0, 1]
    );

    expect(result.cosineSimilarity)
      .toBeCloseTo(0.5, 5);

    expect(result.score).toBe(50);
    expect(result.level).toBe("Low similarity");
  });

  it("does not confuse amplitude scaling with shape", () => {
    const result = calculateSpectralSimilarity(
      [0.1, 0.3, 0.5],
      [0.2, 0.6, 1]
    );

    expect(result.score).toBe(100);
  });

  it("returns unavailable for silence", () => {
    const result = calculateSpectralSimilarity(
      [0, 0, 0],
      [0.2, 0.5, 1]
    );

    expect(result.score).toBeNull();
    expect(result.level).toBe("Unavailable");
  });

  it("returns unavailable for two silent spectra", () => {
    const result = calculateSpectralSimilarity(
      [0, 0, 0],
      [0, 0, 0]
    );

    expect(result.score).toBeNull();
  });

  it("rejects incompatible vector lengths", () => {
    const result = calculateSpectralSimilarity(
      [0.2, 0.5],
      [0.2, 0.5, 0.8]
    );

    expect(result.score).toBeNull();
  });

  it("rejects invalid spectral values", () => {
    const result = calculateSpectralSimilarity(
      [1, Number.NaN, 0],
      [1, 0.5, 0]
    );

    expect(result.score).toBeNull();
  });
});
