
import { describe, expect, it } from "vitest";
import { calculateSpectrum } from "../FrequencySpectrum";

const SAMPLE_RATE = 22050;
const DURATION = 3;

// Generate synthetic audio samples.
function makeTone(
  frequency: number,
  amplitude = 0.5
): Float32Array {
  const length = SAMPLE_RATE * DURATION;
  const samples = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    const time = i / SAMPLE_RATE;

    samples[i] =
      amplitude *
      Math.sin(2 * Math.PI * frequency * time);
  }

  return samples;
}

// The FFT needs only these AudioBuffer properties.
// We don't need a real browser AudioContext.
function makeAudioBuffer(
  samples: Float32Array[]
): AudioBuffer {
  return {
    sampleRate: SAMPLE_RATE,
    length: samples[0].length,
    numberOfChannels: samples.length,
    getChannelData: (channel: number) =>
      samples[channel],
  } as unknown as AudioBuffer;
}

describe("ÉCLAT — Frequency Spectrum DSP", () => {
  it("detects a 440 Hz tone", () => {
    const buffer = makeAudioBuffer([
      makeTone(440),
    ]);

    const result = calculateSpectrum(buffer);

    expect(result.peakHz).toBeCloseTo(440, -1);
  });

  it("detects an 880 Hz tone", () => {
    const buffer = makeAudioBuffer([
      makeTone(880),
    ]);

    const result = calculateSpectrum(buffer);

    expect(result.peakHz).toBeCloseTo(880, -1);
  });

  it("returns 0 Hz for silence", () => {
    const silence = new Float32Array(
      SAMPLE_RATE * DURATION
    );

    const result = calculateSpectrum(
      makeAudioBuffer([silence])
    );

    expect(result.peakHz).toBe(0);
    expect(result.bars.every((bar) => bar === 0))
      .toBe(true);
  });

  it("produces exactly 56 spectrum bars", () => {
    const result = calculateSpectrum(
      makeAudioBuffer([makeTone(440)])
    );

    expect(result.bars).toHaveLength(56);
  });

  it("keeps normalized bars between 0 and 1", () => {
    const result = calculateSpectrum(
      makeAudioBuffer([makeTone(880)])
    );

    for (const bar of result.bars) {
      expect(bar).toBeGreaterThanOrEqual(0);
      expect(bar).toBeLessThanOrEqual(1);
    }
  });

  it("detects frequency in stereo audio", () => {
    const result = calculateSpectrum(
      makeAudioBuffer([
        makeTone(440),
        makeTone(440),
      ])
    );

    expect(result.peakHz).toBeCloseTo(440, -1);
  });

  it("identifies the 880 Hz tone as higher", () => {
    const low = calculateSpectrum(
      makeAudioBuffer([makeTone(440)])
    );

    const high = calculateSpectrum(
      makeAudioBuffer([makeTone(880)])
    );

    expect(high.peakHz).toBeGreaterThan(
      low.peakHz
    );

    expect(high.peakHz / low.peakHz)
      .toBeCloseTo(2, 1);
  });
});
