
/**
 * ÉCLAT — Audio Level Analysis
 *
 * Calculates RMS amplitude and dBFS
 * from decoded PCM audio samples.
 *
 * This measures digital signal level,
 * not perceived loudness.
 */

export type AudioLevel = {
  rms: number;
  dbfs: number | null;
  peakAmplitude: number;
};

export type AudioLevelComparison = {
  trackA: AudioLevel;
  trackB: AudioLevel;
  differenceDb: number | null;
  absoluteDifferenceDb: number | null;
};

export function calculateAudioLevel(
  buffer: AudioBuffer
): AudioLevel {
  const channelCount = buffer.numberOfChannels;
  const sampleCount = buffer.length;

  if (channelCount <= 0 || sampleCount <= 0) {
    return {
      rms: 0,
      dbfs: null,
      peakAmplitude: 0,
    };
  }

  let sumSquares = 0;
  let peakAmplitude = 0;

  // Analyze samples across all channels.
  for (
    let channelIndex = 0;
    channelIndex < channelCount;
    channelIndex++
  ) {
    const samples =
      buffer.getChannelData(channelIndex);

    for (let i = 0; i < sampleCount; i++) {
      const sample = samples[i];

      if (!Number.isFinite(sample)) {
        throw new Error(
          "Audio contains non-finite samples."
        );
      }

      sumSquares += sample * sample;

      peakAmplitude = Math.max(
        peakAmplitude,
        Math.abs(sample)
      );
    }
  }

  const totalSamples =
    channelCount * sampleCount;

  const rms = Math.sqrt(
    sumSquares / totalSamples
  );

  // Silence corresponds to -Infinity dBFS.
  // Return null to represent that condition
  // without introducing non-finite values.
  const dbfs =
    rms > 0
      ? 20 * Math.log10(rms)
      : null;

  return {
    rms,
    dbfs,
    peakAmplitude,
  };
}

/**
 * Positive differenceDb:
 * Track B has a higher RMS signal level.
 *
 * Negative differenceDb:
 * Track B has a lower RMS signal level.
 *
 * Null:
 * At least one track is silent.
 */
export function compareAudioLevels(
  bufferA: AudioBuffer,
  bufferB: AudioBuffer
): AudioLevelComparison {
  const trackA = calculateAudioLevel(bufferA);
  const trackB = calculateAudioLevel(bufferB);

  const differenceDb =
    trackA.dbfs !== null &&
    trackB.dbfs !== null
      ? trackB.dbfs - trackA.dbfs
      : null;

  return {
    trackA,
    trackB,
    differenceDb,
    absoluteDifferenceDb:
      differenceDb === null
        ? null
        : Math.abs(differenceDb),
  };
}
