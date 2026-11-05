
import { describe, expect, it } from "vitest";

import {
  calculateAudioLevel,
  compareAudioLevels,
} from "../lib/audioLevels";

// =====================================
// TEST HELPER
// =====================================

// Create a lightweight AudioBuffer mock.
// We don't need a real browser AudioContext
// to test RMS and dBFS calculations.

function makeBuffer(
  channels: number[][]
): AudioBuffer {
  const data = channels.map(
    (channel) => new Float32Array(channel)
  );

  return {
    length: data[0].length,
    numberOfChannels: data.length,
    getChannelData: (index: number) =>
      data[index],
  } as unknown as AudioBuffer;
}

// =====================================
// AUDIO LEVEL TEST SUITE
// =====================================

describe("ÉCLAT — Audio Level Analysis", () => {
  // =====================================
  // TEST 1 — RMS CALCULATION
  // =====================================

  it("calculates RMS correctly", () => {
    const buffer = makeBuffer([
      [1, -1, 1, -1],
    ]);

    const result = calculateAudioLevel(buffer);

    expect(result.rms).toBeCloseTo(1, 6);
    expect(result.dbfs).toBeCloseTo(0, 6);
  });

  // =====================================
  // TEST 2 — LOWER AMPLITUDE
  // =====================================

  it("calculates a lower amplitude level", () => {
    const buffer = makeBuffer([
      [0.5, -0.5],
    ]);

    const result = calculateAudioLevel(buffer);

    expect(result.rms).toBeCloseTo(0.5, 6);

    expect(result.dbfs).toBeCloseTo(
      -6.0206,
      3
    );
  });

  // =====================================
  // TEST 3 — SILENCE
  // =====================================

  it("handles silence", () => {
    const buffer = makeBuffer([
      [0, 0, 0, 0],
    ]);

    const result = calculateAudioLevel(buffer);

    expect(result.rms).toBe(0);
    expect(result.dbfs).toBeNull();
    expect(result.peakAmplitude).toBe(0);
  });

  // =====================================
  // TEST 4 — PEAK AMPLITUDE
  // =====================================

  it("detects peak amplitude", () => {
    const buffer = makeBuffer([
      [0.1, -0.8, 0.3],
    ]);

    const result = calculateAudioLevel(buffer);

    expect(result.peakAmplitude).toBeCloseTo(
      0.8,
      6
    );
  });

  // =====================================
  // TEST 5 — STEREO RMS
  // =====================================

  it("calculates RMS across stereo channels", () => {
    const buffer = makeBuffer([
      [1, 1],
      [0, 0],
    ]);

    const result = calculateAudioLevel(buffer);

    expect(result.rms).toBeCloseTo(
      Math.sqrt(0.5),
      6
    );
  });

  // =====================================
  // TEST 6 — EQUAL SIGNAL LEVELS
  // =====================================

  it("returns 0 dB difference for equal levels", () => {
    const result = compareAudioLevels(
      makeBuffer([[0.5, -0.5]]),
      makeBuffer([[0.5, -0.5]])
    );

    expect(result.differenceDb).toBeCloseTo(
      0,
      6
    );

    expect(result.absoluteDifferenceDb).toBeCloseTo(
      0,
      6
    );
  });

  // =====================================
  // TEST 7 — AMPLITUDE DOUBLES
  // =====================================

  it("detects a 6 dB increase when amplitude doubles", () => {
    const result = compareAudioLevels(
      makeBuffer([[0.25, -0.25]]),
      makeBuffer([[0.5, -0.5]])
    );

    expect(result.differenceDb).toBeCloseTo(
      6.0206,
      3
    );

    expect(result.absoluteDifferenceDb).toBeCloseTo(
      6.0206,
      3
    );
  });

  // =====================================
  // TEST 8 — TRACK B IS QUIETER
  // =====================================

  it("detects a lower signal level for Track B", () => {
    const result = compareAudioLevels(
      makeBuffer([[0.5, -0.5]]),
      makeBuffer([[0.25, -0.25]])
    );

    expect(result.differenceDb).toBeCloseTo(
      -6.0206,
      3
    );

    expect(result.absoluteDifferenceDb).toBeCloseTo(
      6.0206,
      3
    );
  });

  // =====================================
  // TEST 9 — SILENT TRACK COMPARISON
  // =====================================

  it("returns an undefined difference for silence", () => {
    const result = compareAudioLevels(
      makeBuffer([[0, 0]]),
      makeBuffer([[0.5, -0.5]])
    );

    expect(result.differenceDb).toBeNull();
    expect(result.absoluteDifferenceDb).toBeNull();
  });

  // =====================================
  // TEST 10 — INVALID AUDIO SAMPLES
  // =====================================

  it("rejects invalid audio samples", () => {
    const buffer = makeBuffer([
      [0.2, Number.NaN],
    ]);

    expect(() =>
      calculateAudioLevel(buffer)
    ).toThrow(
      "Audio contains non-finite samples."
    );
  });
});
