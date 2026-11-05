
import { fft } from "./fft";

const FFT_SIZE = 8192;
const ROLLOFF_PERCENT = 0.85;

export type SpectralFeatures = {
  rolloffHz: number | null;
  flatness: number | null;
};

/**
 * Analyze three Hann-windowed sections
 * of decoded audio.
 *
 * Returns:
 * - 85% spectral rolloff in Hz
 * - spectral flatness between 0 and 1
 *
 * Null means insufficient spectral energy.
 */
export function calculateSpectralFeatures(
  buffer: AudioBuffer
): SpectralFeatures {
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const channelCount = buffer.numberOfChannels;

  if (
    !Number.isFinite(sampleRate) ||
    sampleRate <= 0 ||
    length <= 0 ||
    channelCount <= 0
  ) {
    return {
      rolloffHz: null,
      flatness: null,
    };
  }

  const channels = Array.from(
    { length: channelCount },
    (_, index) => buffer.getChannelData(index)
  );

  const power = new Float64Array(
    FFT_SIZE / 2 + 1
  );

  const positions = [0.25, 0.5, 0.75];

  for (const position of positions) {
    const center = Math.floor(length * position);

    const start = Math.max(
      0,
      Math.min(
        Math.floor(center - FFT_SIZE / 2),
        Math.max(0, length - FFT_SIZE)
      )
    );

    const real = new Float64Array(FFT_SIZE);
    const imag = new Float64Array(FFT_SIZE);

    for (let i = 0; i < FFT_SIZE; i++) {
      const sampleIndex = start + i;

      if (sampleIndex >= length) {
        break;
      }

      let sample = 0;

      for (const channel of channels) {
        const value = channel[sampleIndex];

        if (!Number.isFinite(value)) {
          throw new Error(
            "Audio contains non-finite samples."
          );
        }

        sample += value;
      }

      sample /= channelCount;

      // Hann window.
      const window =
        0.5 -
        0.5 *
          Math.cos(
            (2 * Math.PI * i) /
              (FFT_SIZE - 1)
          );

      real[i] = sample * window;
    }

    fft(real, imag);

    for (let bin = 0; bin < power.length; bin++) {
      power[bin] +=
        real[bin] * real[bin] +
        imag[bin] * imag[bin];
    }
  }

  // Average the three power spectra.
  for (let i = 0; i < power.length; i++) {
    power[i] /= positions.length;
  }

  // Exclude DC when computing rolloff and flatness.
  const startBin = 1;
  const endBin = power.length - 1;

  let totalPower = 0;
  let maximumPower = 0;

  for (let bin = startBin; bin <= endBin; bin++) {
    const value = power[bin];

    totalPower += value;
    maximumPower = Math.max(maximumPower, value);
  }

  if (maximumPower === 0 || totalPower === 0) {
    return {
      rolloffHz: null,
      flatness: null,
    };
  }

  // =====================================
  // SPECTRAL ROLLOFF — 85%
  // =====================================

  const threshold =
    totalPower * ROLLOFF_PERCENT;

  let cumulativePower = 0;
  let rolloffBin = endBin;

  for (let bin = startBin; bin <= endBin; bin++) {
    cumulativePower += power[bin];

    if (cumulativePower >= threshold) {
      rolloffBin = bin;
      break;
    }
  }

  const rolloffHz =
    rolloffBin * sampleRate / FFT_SIZE;

  // =====================================
  // SPECTRAL FLATNESS
  // =====================================

  // Scale by the maximum to improve numerical
  // stability. This does not change flatness.
  const numberOfBins =
    endBin - startBin + 1;

  let logSum = 0;
  let arithmeticSum = 0;

  for (let bin = startBin; bin <= endBin; bin++) {
    const normalized =
      power[bin] / maximumPower;

    arithmeticSum += normalized;

    // A zero-power bin makes the geometric
    // mean zero in the exact definition.
    if (normalized === 0) {
      return {
        rolloffHz,
        flatness: 0,
      };
    }

    logSum += Math.log(normalized);
  }

  const geometricMean = Math.exp(
    logSum / numberOfBins
  );

  const arithmeticMean =
    arithmeticSum / numberOfBins;

  const flatness =
    arithmeticMean > 0
      ? Math.min(
          1,
          Math.max(
            0,
            geometricMean / arithmeticMean
          )
        )
      : null;

  return {
    rolloffHz,
    flatness,
  };
}
