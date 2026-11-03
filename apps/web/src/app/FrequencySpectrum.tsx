
"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

const FFT_SIZE = 8192;
const BAR_COUNT = 56;
const MIN_HZ = 60;
const MAX_HZ = 8000;

type SpectrumResult = {
  file: File;
  bars: number[];
  peakHz: number;
};

type SpectrumError = {
  file: File;
  message: string;
};

// Fast Fourier Transform (radix-2 Cooley-Tukey)
function fft(
  real: Float64Array,
  imag: Float64Array
): void {
  const n = real.length;

  // Rearrange samples into bit-reversed order.
  let j = 0;

  for (let i = 1; i < n; i++) {
    let bit = n >> 1;

    while (j & bit) {
      j ^= bit;
      bit >>= 1;
    }

    j ^= bit;

    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }

  // Combine progressively larger FFT blocks.
  for (let len = 2; len <= n; len *= 2) {
    const angle = (-2 * Math.PI) / len;

    const stepReal = Math.cos(angle);
    const stepImag = Math.sin(angle);

    for (let start = 0; start < n; start += len) {
      let wr = 1;
      let wi = 0;

      for (let k = 0; k < len / 2; k++) {
        const even = start + k;
        const odd = even + len / 2;

        const tr =
          real[odd] * wr - imag[odd] * wi;

        const ti =
          real[odd] * wi + imag[odd] * wr;

        const er = real[even];
        const ei = imag[even];

        real[even] = er + tr;
        imag[even] = ei + ti;

        real[odd] = er - tr;
        imag[odd] = ei - ti;

        const nextWr =
          wr * stepReal - wi * stepImag;

        wi = wr * stepImag + wi * stepReal;
        wr = nextWr;
      }
    }
  }
}

function calculateSpectrum(
  buffer: AudioBuffer
): Omit<SpectrumResult, "file"> {
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;

  const channels = Array.from(
    { length: buffer.numberOfChannels },
    (_, index) => buffer.getChannelData(index)
  );

  const spectrum = new Float64Array(
    FFT_SIZE / 2
  );

  // Analyze three positions across the recording.
  const positions = [0.25, 0.5, 0.75];

  for (const position of positions) {
    const center = Math.floor(length * position);

    const start = Math.max(
      0,
      Math.min(
        center - FFT_SIZE / 2,
        Math.max(0, length - FFT_SIZE)
      )
    );

    const real = new Float64Array(FFT_SIZE);
    const imag = new Float64Array(FFT_SIZE);

    for (let i = 0; i < FFT_SIZE; i++) {
      const sampleIndex = Math.floor(start) + i;

      if (sampleIndex >= length) {
        break;
      }

      // Mix channels to mono.
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
            (2 * Math.PI * i) / (FFT_SIZE - 1)
          );

      real[i] = sample * window;
    }

    fft(real, imag);

    for (let bin = 0; bin < spectrum.length; bin++) {
      const magnitude = Math.hypot(
        real[bin],
        imag[bin]
      );

      spectrum[bin] += magnitude;
    }
  }

  // Average the three FFT measurements.
  for (let i = 0; i < spectrum.length; i++) {
    spectrum[i] /= positions.length;
  }

  const frequencyPerBin =
    sampleRate / FFT_SIZE;

  const maxFrequency = Math.min(
    MAX_HZ,
    sampleRate / 2
  );

  // Find strongest frequency in the displayed range.
  let strongestBin = 0;
  let strongestMagnitude = 0;

  for (let bin = 1; bin < spectrum.length; bin++) {
    const frequency = bin * frequencyPerBin;

    if (
      frequency < MIN_HZ ||
      frequency > maxFrequency
    ) {
      continue;
    }

    if (spectrum[bin] > strongestMagnitude) {
      strongestMagnitude = spectrum[bin];
      strongestBin = bin;
    }
  }

  const peakHz =
    strongestMagnitude > 1e-10
      ? strongestBin * frequencyPerBin
      : 0;

  // Convert FFT bins into 56 logarithmic bars.
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
        Math.ceil(low / frequencyPerBin)
      );

      const endBin = Math.min(
        spectrum.length - 1,
        Math.floor(high / frequencyPerBin)
      );

      let magnitude = 0;

      for (let bin = startBin; bin <= endBin; bin++) {
        magnitude = Math.max(
          magnitude,
          spectrum[bin]
        );
      }

      return magnitude;
    }
  );

  const maximum = Math.max(...rawBars, 0);

  // Normalize for display.
  const bars = rawBars.map((value) =>
    maximum > 1e-10
      ? Math.pow(value / maximum, 0.65)
      : 0
  );

  return {
    bars,
    peakHz,
  };
}

export default function FrequencySpectrum({
  file,
}: {
  file: File;
}) {
  const [result, setResult] =
    useState<SpectrumResult | null>(null);

  const [error, setError] =
    useState<SpectrumError | null>(null);

  useEffect(() => {
    let cancelled = false;
    const selectedFile = file;

    async function analyze() {
      let context: AudioContext | null = null;

      try {
        context = new AudioContext();

        const bytes = await selectedFile.arrayBuffer();

        const decoded =
          await context.decodeAudioData(bytes);

        const spectrum = calculateSpectrum(decoded);

        if (!cancelled) {
          setResult({
            file: selectedFile,
            ...spectrum,
          });
        }
      } catch {
        if (!cancelled) {
          setError({
            file: selectedFile,
            message: "Unable to analyze frequency spectrum.",
          });
        }
      } finally {
        if (context) {
          await context.close().catch(() => {});
        }
      }
    }

    void analyze();

    return () => {
      cancelled = true;
    };
  }, [file]);

  const currentResult =
    result?.file === file ? result : null;

  const currentError =
    error?.file === file ? error : null;

  return (
    <div className={styles.spectrumCard}>
      <div className={styles.spectrumHeader}>
        <span>FREQUENCY SPECTRUM</span>

        <span>
          {currentResult
            ? "FFT ANALYSIS"
            : currentError
              ? "UNAVAILABLE"
              : "ANALYZING"}
        </span>
      </div>

      <div
        className={styles.spectrumBars}
        role="img"
        aria-label={
          currentResult
            ? `Frequency spectrum with strongest peak near ${Math.round(currentResult.peakHz)} hertz`
            : "Frequency spectrum loading"
        }
      >
        {Array.from(
          { length: BAR_COUNT },
          (_, index) => {
            const amplitude =
              currentResult?.bars[index] ?? 0;

            const height =
              3 + amplitude * 97;

            return (
              <span
                key={index}
                style={{
                  height: `${Math.round(height)}%`,
                }}
              />
            );
          }
        )}
      </div>

      <div className={styles.spectrumAxis}>
        <span>60 Hz</span>
        <span>~700 Hz</span>
        <span>8 kHz</span>
      </div>

      {currentResult && (
        <div className={styles.spectrumPeak}>
          <span>STRONGEST FREQUENCY PEAK</span>
          <strong>
            {currentResult.peakHz.toFixed(1)} Hz
          </strong>
        </div>
      )}

      {currentError && (
        <p className={styles.spectrumError}>
          {currentError.message}
        </p>
      )}

      <p className={styles.spectrumNote}>
        Log-frequency view · Relative magnitude ·
        Averaged across three audio segments
      </p>
    </div>
  );
}
