
/**
 * ÉCLAT — Acoustic Analysis Report
 *
 * Combines independently calculated audio
 * measurements into one structured report.
 *
 * This module does not perform FFT or decoding.
 * It organizes results from existing engines.
 */

import type {
  SpectralSimilarityResult,
} from "./spectralSimilarity";

// =====================================
// TYPES
// =====================================

export type ReportTrack = {
  filename: string;
  peakHz: number;
  rms: number;
  dbfs: number | null;
  rolloffHz: number | null;
  flatness: number | null;
};

export type ReportInput = {
  trackA: ReportTrack;
  trackB: ReportTrack;
  similarity: SpectralSimilarityResult;
};

export type AcousticReport = {
  schemaVersion: "1.0";
  title: string;
  tracks: {
    a: ReportTrack;
    b: ReportTrack;
  };
  comparison: {
    spectralSimilarityPercent: number | null;
    spectralSimilarityLevel: string;
    rmsDifferenceDb: number | null;
    peakFrequencyDifferenceHz: number;
    rolloffDifferenceHz: number | null;
    flatnessDifference: number | null;
  };
  observations: string[];
  limitations: string[];
};

// =====================================
// HELPERS
// =====================================

function absoluteDifference(
  a: number | null,
  b: number | null
): number | null {
  if (a === null || b === null) {
    return null;
  }

  return Math.abs(a - b);
}

// =====================================
// REPORT GENERATOR
// =====================================

export function generateAcousticReport(
  input: ReportInput
): AcousticReport {
  const { trackA, trackB, similarity } = input;

  // Positive value: B has higher RMS level.
  // Negative value: B has lower RMS level.
  const rmsDifferenceDb =
    trackA.dbfs !== null &&
    trackB.dbfs !== null
      ? trackB.dbfs - trackA.dbfs
      : null;

  const peakFrequencyDifferenceHz = Math.abs(
    trackA.peakHz - trackB.peakHz
  );

  const rolloffDifferenceHz = absoluteDifference(
    trackA.rolloffHz,
    trackB.rolloffHz
  );

  const flatnessDifference = absoluteDifference(
    trackA.flatness,
    trackB.flatness
  );

  const observations: string[] = [];

  // =====================================
  // SPECTRAL SIMILARITY OBSERVATION
  // =====================================

  if (similarity.score === null) {
    observations.push(
      "Spectral similarity could not be calculated for this pair."
    );
  } else {
    observations.push(
      `Normalized spectral shape similarity is ${similarity.score.toFixed(2)}%.`
    );
  }

  // =====================================
  // SIGNAL LEVEL OBSERVATION
  // =====================================

  if (rmsDifferenceDb === null) {
    observations.push(
      "An RMS level difference is unavailable because at least one track has no measurable RMS amplitude."
    );
  } else if (Math.abs(rmsDifferenceDb) < 0.05) {
    observations.push(
      "The recordings have nearly equal RMS signal levels."
    );
  } else {
    const stronger =
      rmsDifferenceDb > 0 ? "B" : "A";

    observations.push(
      `Track ${stronger} has a higher RMS signal level by ${Math.abs(rmsDifferenceDb).toFixed(2)} dB.`
    );
  }

  // =====================================
  // FREQUENCY OBSERVATION
  // =====================================

  if (trackA.peakHz > 0 && trackB.peakHz > 0) {
    observations.push(
      `The strongest detected frequency peaks differ by ${peakFrequencyDifferenceHz.toFixed(1)} Hz.`
    );
  } else {
    observations.push(
      "At least one track has no detected frequency peak within the analyzed range."
    );
  }

  // =====================================
  // SPECTRAL ROLLOFF OBSERVATION
  // =====================================

  if (rolloffDifferenceHz !== null) {
    observations.push(
      `The 85% spectral rolloff frequencies differ by ${rolloffDifferenceHz.toFixed(1)} Hz.`
    );
  }

  // =====================================
  // SPECTRAL FLATNESS OBSERVATION
  // =====================================

  if (flatnessDifference !== null) {
    observations.push(
      `The spectral flatness values differ by ${flatnessDifference.toFixed(4)}.`
    );
  }

  return {
    schemaVersion: "1.0",
    title: "ÉCLAT Acoustic Analysis Report",

    tracks: {
      a: { ...trackA },
      b: { ...trackB },
    },

    comparison: {
      spectralSimilarityPercent: similarity.score,
      spectralSimilarityLevel: similarity.level,
      rmsDifferenceDb,
      peakFrequencyDifferenceHz,
      rolloffDifferenceHz,
      flatnessDifference,
    },

    observations,

    limitations: [
      "Spectral similarity measures alignment of normalized frequency patterns, not perceived audio similarity.",
      "RMS and dBFS describe digital signal level, not perceived loudness.",
      "Dominant frequency is not necessarily musical pitch.",
      "Spectral rolloff and flatness depend on the FFT settings and analyzed audio segments.",
      "This report does not identify songs, instruments, speakers, or copyrighted recordings.",
    ],
  };
}
