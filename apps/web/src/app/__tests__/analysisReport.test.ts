
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  generateAcousticReport,
  type ReportInput,
} from "../lib/analysisReport";

// =====================================
// TEST DATA
// =====================================

function makeInput(): ReportInput {
  return {
    trackA: {
      filename: "tone-440.wav",
      peakHz: 440,
      rms: 0.25,
      dbfs: -12.0412,
      rolloffHz: 450,
      flatness: 0.002,
    },

    trackB: {
      filename: "tone-880.wav",
      peakHz: 880,
      rms: 0.5,
      dbfs: -6.0206,
      rolloffHz: 900,
      flatness: 0.004,
    },

    similarity: {
      score: 25,
      cosineSimilarity: 0.25,
      level: "Very different",
      explanation:
        "The recordings have different spectral patterns.",
    },
  };
}

// =====================================
// TEST SUITE
// =====================================

describe("ÉCLAT — Acoustic Report Generator", () => {
  it("generates a structured report", () => {
    const report = generateAcousticReport(
      makeInput()
    );

    expect(report.schemaVersion).toBe("1.0");

    expect(report.title).toBe(
      "ÉCLAT Acoustic Analysis Report"
    );

    expect(report.tracks.a.filename).toBe(
      "tone-440.wav"
    );

    expect(report.tracks.b.filename).toBe(
      "tone-880.wav"
    );
  });

  it("preserves spectral similarity", () => {
    const report = generateAcousticReport(
      makeInput()
    );

    expect(
      report.comparison.spectralSimilarityPercent
    ).toBe(25);

    expect(
      report.comparison.spectralSimilarityLevel
    ).toBe("Very different");
  });

  it("calculates frequency differences", () => {
    const report = generateAcousticReport(
      makeInput()
    );

    expect(
      report.comparison.peakFrequencyDifferenceHz
    ).toBe(440);

    expect(
      report.comparison.rolloffDifferenceHz
    ).toBe(450);

    expect(
      report.comparison.flatnessDifference
    ).toBeCloseTo(0.002, 6);
  });

  it("calculates signed RMS differences", () => {
    const report = generateAcousticReport(
      makeInput()
    );

    expect(
      report.comparison.rmsDifferenceDb
    ).toBeCloseTo(6.0206, 4);
  });

  it("handles unavailable measurements", () => {
    const input = makeInput();

    input.trackA.dbfs = null;
    input.trackA.rolloffHz = null;
    input.trackA.flatness = null;

    input.similarity.score = null;
    input.similarity.cosineSimilarity = null;
    input.similarity.level = "Unavailable";

    const report = generateAcousticReport(input);

    expect(
      report.comparison.spectralSimilarityPercent
    ).toBeNull();

    expect(
      report.comparison.rmsDifferenceDb
    ).toBeNull();

    expect(
      report.comparison.rolloffDifferenceHz
    ).toBeNull();

    expect(
      report.comparison.flatnessDifference
    ).toBeNull();
  });

  it("includes observations and limitations", () => {
    const report = generateAcousticReport(
      makeInput()
    );

    expect(report.observations.length)
      .toBeGreaterThan(0);

    expect(report.limitations.length)
      .toBeGreaterThan(0);

    expect(
      report.observations.some(
        (observation) =>
          observation.includes("Track B")
      )
    ).toBe(true);
  });
});
