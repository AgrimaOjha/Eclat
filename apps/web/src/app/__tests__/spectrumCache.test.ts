
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { getDecodedAudio } from "../lib/audioAnalysis";
import { getSpectrum } from "../FrequencySpectrum";

// Mock only the decoding service.
// The real FFT and spectrum cache still run.
vi.mock("../lib/audioAnalysis", () => ({
  getDecodedAudio: vi.fn(),
}));

const SAMPLE_RATE = 22050;
const SAMPLE_COUNT = 8192;

function makeFile(name: string): File {
  return new File(
    [new Uint8Array([1, 2, 3])],
    name,
    { type: "audio/wav" }
  );
}

function makeBuffer(frequency: number): AudioBuffer {
  const samples = new Float32Array(
    SAMPLE_COUNT
  );

  for (let i = 0; i < SAMPLE_COUNT; i++) {
    samples[i] =
      0.5 *
      Math.sin(
        (2 * Math.PI * frequency * i) /
          SAMPLE_RATE
      );
  }

  return {
    sampleRate: SAMPLE_RATE,
    length: SAMPLE_COUNT,
    numberOfChannels: 1,
    getChannelData: () => samples,
  } as unknown as AudioBuffer;
}

describe("ÉCLAT — FFT Spectrum Cache", () => {
  beforeEach(() => {
    vi.mocked(getDecodedAudio).mockReset();
  });

  it("calculates a spectrum successfully", async () => {
    const file = makeFile("tone-440.wav");

    vi.mocked(getDecodedAudio)
      .mockResolvedValue(makeBuffer(440));

    const result = await getSpectrum(file);

    expect(result.bars).toHaveLength(56);
    expect(result.peakHz).toBeCloseTo(440, -1);

    expect(getDecodedAudio)
      .toHaveBeenCalledTimes(1);
  });

  it("reuses the same pending spectrum Promise", async () => {
    const file = makeFile("shared-spectrum.wav");

    vi.mocked(getDecodedAudio)
      .mockResolvedValue(makeBuffer(440));

    const first = getSpectrum(file);
    const second = getSpectrum(file);

    expect(first).toBe(second);

    const [resultA, resultB] =
      await Promise.all([first, second]);

    expect(resultA).toBe(resultB);

    expect(getDecodedAudio)
      .toHaveBeenCalledTimes(1);
  });

  it("reuses an already calculated spectrum", async () => {
    const file = makeFile("cached-spectrum.wav");

    vi.mocked(getDecodedAudio)
      .mockResolvedValue(makeBuffer(880));

    const first = await getSpectrum(file);
    const second = await getSpectrum(file);

    expect(first).toBe(second);

    expect(first.peakHz).toBeCloseTo(880, -1);

    expect(getDecodedAudio)
      .toHaveBeenCalledTimes(1);
  });

  it("keeps different files independent", async () => {
    const fileA = makeFile("tone-a.wav");
    const fileB = makeFile("tone-b.wav");

    vi.mocked(getDecodedAudio)
      .mockImplementation((file) => {
        return Promise.resolve(
          makeBuffer(file === fileA ? 440 : 880)
        );
      });

    const [a, b] = await Promise.all([
      getSpectrum(fileA),
      getSpectrum(fileB),
    ]);

    expect(a.peakHz).toBeCloseTo(440, -1);
    expect(b.peakHz).toBeCloseTo(880, -1);

    expect(getDecodedAudio)
      .toHaveBeenCalledTimes(2);
  });

  it("retries after spectrum analysis fails", async () => {
    const file = makeFile("retry-spectrum.wav");

    vi.mocked(getDecodedAudio)
      .mockRejectedValueOnce(
        new Error("Audio unavailable")
      )
      .mockResolvedValueOnce(makeBuffer(440));

    await expect(
      getSpectrum(file)
    ).rejects.toThrow("Audio unavailable");

    const result = await getSpectrum(file);

    expect(result.peakHz).toBeCloseTo(440, -1);

    expect(getDecodedAudio)
      .toHaveBeenCalledTimes(2);
  });
});
