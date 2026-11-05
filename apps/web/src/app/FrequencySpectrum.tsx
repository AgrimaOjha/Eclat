
"use client";

import { useEffect, useState } from "react";
import { getDecodedAudio } from "./lib/audioAnalysis";
import styles from "./page.module.css";

// =====================================
// CONFIGURATION
// =====================================

const FFT_SIZE = 8192;
const BAR_COUNT = 56;
const MIN_HZ = 60;
const MAX_HZ = 8000;

// =====================================
// TYPES
// =====================================

type SpectrumValues = {
  bars: number[];
  peakHz: number;
};

type SpectrumResult = SpectrumValues & {
  file: File;
};

type SpectrumError = {
  file: File;
  message: string;
};

// =====================================
// FAST FOURIER TRANSFORM
// =====================================

// Radix-2 Cooley-Tukey FFT.
// Converts time-domain audio samples
// into frequency-domain coefficients.

function fft(
  real: Float64Array,
  imag: Float64Array
): void {
  const n = real.length;

  // Bit-reversal permutation.
  let j = 0;

  for (let i = 1; i < n; i++) {
    let bit = n >> 1;

    while (j & bit) {
      j ^= bit;
      bit >>= 1;
    }

    j ^= bit;

    if (i < j) {
      [real[i], real[j]] = [
        real[j],
        real[i],
      ];

      [imag[i], imag[j]] = [
        imag[j],
        imag[i],
      ];
    }
  }

  // Iterative FFT butterfly stages.
  for (let len = 2; len <= n; len *= 2) {
    const angle = (-2 * Math.PI) / len;

    const stepReal = Math.cos(angle);
    const stepImag = Math.sin(angle);

    for (
      let start = 0;
      start < n;
      start += len
    ) {
      let wr = 1;
      let wi = 0;

      for (
        let k = 0;
        k < len / 2;
        k++
      ) {
        const even = start + k;
        const odd = even + len / 2;

        const tr =
          real[odd] * wr -
          imag[odd] * wi;

        const ti =
          real[odd] * wi +
          imag[odd] * wr;

        const er = real[even];
        const ei = imag[even];

        // Even butterfly output.
        real[even] = er + tr;
        imag[even] = ei + ti;

        // Odd butterfly output.
        real[odd] = er - tr;
        imag[odd] = ei - ti;

        // Update complex twiddle factor.
        const nextWr =
          wr * stepReal -
          wi * stepImag;

        wi =
          wr * stepImag +
          wi * stepReal;

        wr = nextWr;
      }
    }
  }
}

// =====================================
// SPECTRUM CALCULATION
// =====================================

export function calculateSpectrum(
  buffer: AudioBuffer
): SpectrumValues {
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;

  const channels = Array.from(
    { length: buffer.numberOfChannels },
    (_, index) =>
      buffer.getChannelData(index)
  );

  const spectrum =
    new Float64Array(FFT_SIZE / 2);

  // Analyze three different sections:
  // 25%, 50%, and 75% of the recording.
  const positions = [0.25, 0.5, 0.75];

  for (const position of positions) {
    const center = Math.floor(
      length * position
    );

    const start = Math.max(
      0,
      Math.min(
        center - FFT_SIZE / 2,
        Math.max(0, length - FFT_SIZE)
      )
    );

    const real =
      new Float64Array(FFT_SIZE);

    const imag =
      new Float64Array(FFT_SIZE);

    // =====================================
    // PREPARE AUDIO SAMPLES
    // =====================================

    for (
      let i = 0;
      i < FFT_SIZE;
      i++
    ) {
      const sampleIndex =
        Math.floor(start) + i;

      if (sampleIndex >= length) {
        break;
      }

      // Combine channels into mono.
      let sample = 0;

      for (const channel of channels) {
        sample += channel[sampleIndex];
      }

      sample /= channels.length;

      // Hann window reduces spectral leakage.
      const window =
        0.5 -
        0.5 *
          Math.cos(
            (2 * Math.PI * i) /
              (FFT_SIZE - 1)
          );

      real[i] = sample * window;
    }

    // Convert samples to frequency domain.
    fft(real, imag);

    // Accumulate frequency magnitudes.
    for (
      let bin = 0;
      bin < spectrum.length;
      bin++
    ) {
      const magnitude = Math.hypot(
        real[bin],
        imag[bin]
      );

      spectrum[bin] += magnitude;
    }
  }

  // =====================================
  // AVERAGE FFT RESULTS
  // =====================================

  for (
    let i = 0;
    i < spectrum.length;
    i++
  ) {
    spectrum[i] /= positions.length;
  }

  const frequencyPerBin =
    sampleRate / FFT_SIZE;

  const maxFrequency = Math.min(
    MAX_HZ,
    sampleRate / 2
  );

  // =====================================
  // FIND STRONGEST FREQUENCY PEAK
  // =====================================

  let strongestBin = 0;
  let strongestMagnitude = 0;

  for (
    let bin = 1;
    bin < spectrum.length;
    bin++
  ) {
    const frequency =
      bin * frequencyPerBin;

    if (
      frequency < MIN_HZ ||
      frequency > maxFrequency
    ) {
      continue;
    }

    if (
      spectrum[bin] >
      strongestMagnitude
    ) {
      strongestMagnitude =
        spectrum[bin];

      strongestBin = bin;
    }
  }

  const peakHz =
    strongestMagnitude > 1e-10
      ? strongestBin *
        frequencyPerBin
      : 0;

  // =====================================
  // LOGARITHMIC FREQUENCY BARS
  // =====================================

  const rawBars = Array.from(
    { length: BAR_COUNT },
    (_, index) => {
      const low =
        MIN_HZ *
        Math.pow(
          maxFrequency / MIN_HZ,
          index / BAR_COUNT
        );

      const high =
        MIN_HZ *
        Math.pow(
          maxFrequency / MIN_HZ,
          (index + 1) / BAR_COUNT
        );

      const startBin = Math.max(
        1,
        Math.ceil(
          low / frequencyPerBin
        )
      );

      const endBin = Math.min(
        spectrum.length - 1,
        Math.floor(
          high / frequencyPerBin
        )
      );

      let magnitude = 0;

      for (
        let bin = startBin;
        bin <= endBin;
        bin++
      ) {
        magnitude = Math.max(
          magnitude,
          spectrum[bin]
        );
      }

      return magnitude;
    }
  );

  // =====================================
  // NORMALIZE FOR VISUALIZATION
  // =====================================

  const maximum = Math.max(
    ...rawBars,
    0
  );

  const bars = rawBars.map(
    (value) =>
      maximum > 1e-10
        ? Math.pow(
            value / maximum,
            0.65
          )
        : 0
  );

  return {
    bars,
    peakHz,
  };
}

// =====================================
// SHARED FFT CACHE
// =====================================

// Stores a spectrum calculation for each
// uploaded File object.
//
// Individual spectra and the shared
// comparison can reuse the same result.

const spectrumCache = new WeakMap<
  File,
  Promise<SpectrumValues>
>();

export function getSpectrum(
  file: File
): Promise<SpectrumValues> {
  const cached =
    spectrumCache.get(file);

  if (cached) {
    return cached;
  }

  // =====================================
  // UNIFIED AUDIO DECODING
  // =====================================

  const task = (async (): Promise<SpectrumValues> => {
    // Reuse the shared decoded AudioBuffer.
    // No separate AudioContext is created here.
    const decoded =
      await getDecodedAudio(file);

    // Run the FFT on the decoded samples.
    return calculateSpectrum(decoded);
  })();

  // Cache the pending calculation immediately.
  spectrumCache.set(
    file,
    task
  );

  // Remove failures so users can retry.
  void task.catch(() => {
    if (
      spectrumCache.get(file) === task
    ) {
      spectrumCache.delete(file);
    }
  });

  return task;
}

// =====================================
// FREQUENCY SPECTRUM COMPONENT
// =====================================

export default function FrequencySpectrum({
  file,
}: {
  file: File;
}) {
  const [result, setResult] =
    useState<SpectrumResult | null>(
      null
    );

  const [error, setError] =
    useState<SpectrumError | null>(
      null
    );

  // =====================================
  // ANALYZE SELECTED FILE
  // =====================================

  useEffect(() => {
    let cancelled = false;

    const selectedFile = file;

    async function analyze() {
      try {
        // Uses the shared FFT cache.
        const spectrum =
          await getSpectrum(
            selectedFile
          );

        if (!cancelled) {
          setResult({
            file: selectedFile,
            ...spectrum,
          });

          // Clear an earlier error.
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError({
            file: selectedFile,
            message:
              "Unable to analyze frequency spectrum.",
          });
        }
      }
    }

    void analyze();

    return () => {
      cancelled = true;
    };
  }, [file]);

  // =====================================
  // DISPLAY CURRENT FILE ONLY
  // =====================================

  const currentResult =
    result?.file === file
      ? result
      : null;

  const currentError =
    error?.file === file
      ? error
      : null;

  // =====================================
  // RENDER
  // =====================================

  return (
    <div className={styles.spectrumCard}>
      {/* HEADER */}
      <div className={styles.spectrumHeader}>
        <span>
          FREQUENCY SPECTRUM
        </span>

        <span>
          {currentResult
            ? "FFT ANALYSIS"
            : currentError
              ? "UNAVAILABLE"
              : "ANALYZING"}
        </span>
      </div>

      {/* FREQUENCY BARS */}
      <div
        className={styles.spectrumBars}
        role="img"
        aria-label={
          currentResult
            ? `Frequency spectrum with strongest peak near ${Math.round(
                currentResult.peakHz
              )} hertz`
            : "Frequency spectrum loading"
        }
      >
        {Array.from(
          { length: BAR_COUNT },
          (_, index) => {
            const amplitude =
              currentResult?.bars[
                index
              ] ?? 0;

            const height =
              3 + amplitude * 97;

            return (
              <span
                key={index}
                style={{
                  height: `${Math.round(
                    height
                  )}%`,
                }}
              />
            );
          }
        )}
      </div>

      {/* FREQUENCY AXIS */}
      <div className={styles.spectrumAxis}>
        <span>60 Hz</span>
        <span>~700 Hz</span>
        <span>8 kHz</span>
      </div>

      {/* STRONGEST FREQUENCY */}
      {currentResult && (
        <div
          className={styles.spectrumPeak}
        >
          <span>
            STRONGEST FREQUENCY PEAK
          </span>

          <strong>
            {currentResult.peakHz.toFixed(
              1
            )}{" "}
            Hz
          </strong>
        </div>
      )}

      {/* ERROR MESSAGE */}
      {currentError && (
        <p
          className={styles.spectrumError}
          role="alert"
        >
          {currentError.message}
        </p>
      )}

      {/* EXPLANATION */}
      <p className={styles.spectrumNote}>
        Log-frequency view · Relative magnitude ·
        Averaged across three audio segments
      </p>
    </div>
  );
}
