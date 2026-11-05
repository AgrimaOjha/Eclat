
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { getDecodedAudio } from "../lib/audioAnalysis";

describe("ÉCLAT — Shared Audio Decoder", () => {
  // =====================================
  // TEST HELPERS
  // =====================================

  const makeFile = (name: string) =>
    new File(
      [new Uint8Array([1, 2, 3, 4])],
      name,
      { type: "audio/wav" }
    );

  const fakeBuffer = {
    sampleRate: 22050,
    length: 8192,
    numberOfChannels: 1,
  } as AudioBuffer;

  let decodeMock: ReturnType<typeof vi.fn>;
  let closeMock: ReturnType<typeof vi.fn>;
  let contextMock: ReturnType<typeof vi.fn>;

  // =====================================
  // SETUP
  // =====================================

  beforeEach(() => {
    decodeMock = vi.fn().mockResolvedValue(
      fakeBuffer
    );

    closeMock = vi.fn().mockResolvedValue(
      undefined
    );

    // Use a regular function as a constructor.
    // Arrow functions cannot be called with "new".
    contextMock = vi.fn().mockImplementation(
      function MockAudioContext() {
        return {
          decodeAudioData: decodeMock,
          close: closeMock,
        };
      }
    );

    vi.stubGlobal("AudioContext", contextMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // =====================================
  // TEST 1 — DECODE FILE
  // =====================================

  it("decodes an uploaded file", async () => {
    const file = makeFile("track-a.wav");

    const result = await getDecodedAudio(file);

    expect(result).toBe(fakeBuffer);

    expect(decodeMock)
      .toHaveBeenCalledTimes(1);

    expect(contextMock)
      .toHaveBeenCalledTimes(1);

    expect(closeMock)
      .toHaveBeenCalledTimes(1);
  });

  // =====================================
  // TEST 2 — REUSE PENDING PROMISE
  // =====================================

  it("reuses the same pending Promise", async () => {
    const file = makeFile("shared.wav");

    const first = getDecodedAudio(file);
    const second = getDecodedAudio(file);

    expect(first).toBe(second);

    await Promise.all([first, second]);

    expect(decodeMock)
      .toHaveBeenCalledTimes(1);
  });

  // =====================================
  // TEST 3 — REUSE SUCCESSFUL DECODE
  // =====================================

  it("reuses a successful decode", async () => {
    const file = makeFile("cached.wav");

    const first = await getDecodedAudio(file);
    const second = await getDecodedAudio(file);

    expect(first).toBe(second);

    expect(decodeMock)
      .toHaveBeenCalledTimes(1);
  });

  // =====================================
  // TEST 4 — INDEPENDENT FILES
  // =====================================

  it("decodes different files independently", async () => {
    const fileA = makeFile("track-a.wav");
    const fileB = makeFile("track-b.wav");

    await Promise.all([
      getDecodedAudio(fileA),
      getDecodedAudio(fileB),
    ]);

    expect(decodeMock)
      .toHaveBeenCalledTimes(2);

    expect(contextMock)
      .toHaveBeenCalledTimes(2);
  });

  // =====================================
  // TEST 5 — RETRY FAILED DECODING
  // =====================================

  it("retries after a decode failure", async () => {
    const file = makeFile("retry.wav");

    decodeMock
      .mockRejectedValueOnce(
        new Error("Decode failed")
      )
      .mockResolvedValueOnce(fakeBuffer);

    await expect(
      getDecodedAudio(file)
    ).rejects.toThrow("Decode failed");

    const result = await getDecodedAudio(file);

    expect(result).toBe(fakeBuffer);

    expect(decodeMock)
      .toHaveBeenCalledTimes(2);

    expect(closeMock)
      .toHaveBeenCalledTimes(2);
  });
});
