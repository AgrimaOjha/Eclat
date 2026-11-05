
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  calculateSpectralFeatures,
} from "../lib/spectralFeatures";

const SAMPLE_RATE = 22050;
const SAMPLE_COUNT = SAMPLE_RATE * 2;

function makeTone(frequency: number): Float32Array {
  const samples = new Float32Array(SAMPLE_COUNT);

  for (let i = 0; i < samples.length; i++) {
    samples[i] =
      0.5 *
      Math.sin(
        2 * Math.PI * frequency * i /
        SAMPLE_RATE
      );
  }

  return samples;
}

function makeNoise(): Float32Array {
  const samples = new Float32Array(SAMPLE_COUNT);

  // Deterministic pseudo-random noise.
  let seed = 123456789;

  for (let i = 0; i < samples.length; i++) {
    seed = (
      Math.imul(seed, 1664525) + 1013904223
    ) >>> 0;

    samples[i] = (
      seed / 4294967296 - 0.5
    ) * 0.8;
  }

  return samples;
}

function makeBuffer(
  channels: Float32Array[]
): AudioBuffer {
  return {
    sampleRate: SAMPLE_RATE,
    length: channels[0].length,
    numberOfChannels: channels.length,
    getChannelData: (index: number) =>
      channels[index],
  } as unknown as AudioBuffer;
}

describe("ÉCLAT — Advanced Spectral Features", () => {
  it("detects rolloff near a 440 Hz tone", () => {
    const result = calculateSpectralFeatures(
      makeBuffer([makeTone(440)])
    );

    expect(result.rolloffHz).not.toBeNull();
    expect(result.rolloffHz!).toBeGreaterThan(400);
    expect(result.rolloffHz!).toBeLessThan(480);
  });

  it("detects higher rolloff for 880 Hz", () => {
    const low = calculateSpectralFeatures(
      makeBuffer([makeTone(440)])
    );

    const high = calculateSpectralFeatures(
      makeBuffer([makeTone(880)])
    );

    expect(high.rolloffHz!).toBeGreaterThan(
      low.rolloffHz!
    );
  });

  it("returns unavailable values for silence", () => {
    const result = calculateSpectralFeatures(
      makeBuffer([
        new Float32Array(SAMPLE_COUNT),
      ])
    );

    expect(result.rolloffHz).toBeNull();
    expect(result.flatness).toBeNull();
  });

  it("gives tonal audio low flatness", () => {
    const result = calculateSpectralFeatures(
      makeBuffer([makeTone(440)])
    );

    expect(result.flatness).not.toBeNull();
    expect(result.flatness!).toBeGreaterThanOrEqual(0);
    expect(result.flatness!).toBeLessThan(0.1);
  });

  it("gives broadband noise higher flatness", () => {
    const tone = calculateSpectralFeatures(
      makeBuffer([makeTone(440)])
    );

    const noise = calculateSpectralFeatures(
      makeBuffer([makeNoise()])
    );

    expect(noise.flatness!).toBeGreaterThan(
      tone.flatness!
    );

    expect(noise.flatness!).toBeLessThanOrEqual(1);
  });

  it("handles identical stereo channels", () => {
    const samples = makeTone(440);

    const result = calculateSpectralFeatures(
      makeBuffer([samples, samples])
    );

    expect(result.rolloffHz!).toBeGreaterThan(400);
    expect(result.rolloffHz!).toBeLessThan(480);
  });

  it("rejects non-finite samples", () => {
    const samples = makeTone(440);
    samples[12000] = Number.NaN;

    expect(() =>
      calculateSpectralFeatures(
        makeBuffer([samples])
      )
    ).toThrow("Audio contains non-finite samples.");
  });
});
