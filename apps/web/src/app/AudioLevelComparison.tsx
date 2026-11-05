
"use client";

import { useEffect, useState } from "react";

import { getDecodedAudio } from "./lib/audioAnalysis";
import {
  compareAudioLevels,
  type AudioLevelComparison as AudioLevelResult,
} from "./lib/audioLevels";

import styles from "./page.module.css";

// =====================================
// TYPES
// =====================================

type LevelData = {
  fileA: File;
  fileB: File;
  result: AudioLevelResult;
};

type LevelError = {
  fileA: File;
  fileB: File;
};

// =====================================
// HELPERS
// =====================================

function formatDbfs(value: number | null): string {
  if (value === null) {
    return "−∞ dBFS";
  }

  return `${value.toFixed(1)} dBFS`;
}

function formatRms(value: number): string {
  return value.toFixed(4);
}

// Map dBFS to visual bar width.
// Display range: -60 dBFS to 0 dBFS.
function getLevelWidth(
  dbfs: number | null
): number {
  if (dbfs === null) {
    return 0;
  }

  const clamped = Math.max(
    -60,
    Math.min(0, dbfs)
  );

  return ((clamped + 60) / 60) * 100;
}

function describeDifference(
  differenceDb: number | null
): string {
  if (differenceDb === null) {
    return (
      "A signed dB difference is unavailable " +
      "because at least one recording is silent."
    );
  }

  if (Math.abs(differenceDb) < 0.05) {
    return (
      "Both recordings have nearly identical " +
      "RMS signal levels."
    );
  }

  const stronger =
    differenceDb > 0 ? "B" : "A";

  return (
    `Track ${stronger} has a higher RMS signal ` +
    `level by ${Math.abs(differenceDb).toFixed(2)} dB.`
  );
}

// =====================================
// AUDIO LEVEL COMPARISON COMPONENT
// =====================================

export default function AudioLevelComparison({
  fileA,
  fileB,
}: {
  fileA: File;
  fileB: File;
}) {
  const [data, setData] =
    useState<LevelData | null>(null);

  const [error, setError] =
    useState<LevelError | null>(null);

  // =====================================
  // ANALYZE BOTH RECORDINGS
  // =====================================

  useEffect(() => {
    let cancelled = false;

    async function analyzeLevels() {
      try {
        // Reuse the same decoded AudioBuffers
        // as waveform and frequency analysis.
        const [bufferA, bufferB] =
          await Promise.all([
            getDecodedAudio(fileA),
            getDecodedAudio(fileB),
          ]);

        const result = compareAudioLevels(
          bufferA,
          bufferB
        );

        if (!cancelled) {
          setData({
            fileA,
            fileB,
            result,
          });

          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError({
            fileA,
            fileB,
          });
        }
      }
    }

    void analyzeLevels();

    return () => {
      cancelled = true;
    };
  }, [fileA, fileB]);

  // =====================================
  // CURRENT RESULTS ONLY
  // =====================================

  const currentData =
    data?.fileA === fileA &&
    data?.fileB === fileB
      ? data.result
      : null;

  const currentError =
    error?.fileA === fileA &&
    error?.fileB === fileB;

  const difference =
    currentData?.differenceDb ?? null;

  // =====================================
  // RENDER
  // =====================================

  return (
    <section
      className={styles.audioLevelsSection}
      aria-label="Audio signal level comparison"
    >
      {/* HEADER */}

      <div className={styles.audioLevelsHeader}>
        <span>05 / AUDIO LEVEL ANALYSIS</span>
        <span>RMS · dBFS</span>
      </div>

      <div className={styles.audioLevelsHeading}>
        <h3>Same sound. Different strength?</h3>

        <p>
          Compare the average digital signal
          levels of your two recordings.
        </p>
      </div>

      {/* ERROR STATE */}

      {currentError ? (
        <p
          className={styles.spectrumError}
          role="alert"
        >
          Unable to analyze audio levels.
          Please try valid WAV recordings.
        </p>
      ) : !currentData ? (
        <p
          className={styles.compareSpectrumLoading}
          role="status"
        >
          Measuring RMS and dBFS levels…
        </p>
      ) : (
        <>
          {/* =====================================
              TRACK LEVELS
          ===================================== */}

          <div className={styles.audioLevelsGrid}>
            {/* TRACK A */}

            <div className={styles.audioLevelCard}>
              <span
                className={styles.audioLevelTrack}
              >
                TRACK A
              </span>

              <strong
                className={styles.audioLevelValue}
              >
                {formatDbfs(
                  currentData.trackA.dbfs
                )}
              </strong>

              <div
                className={styles.audioLevelMeter}
                role="meter"
                aria-label="Track A RMS level"
                aria-valuemin={-60}
                aria-valuemax={0}
                aria-valuenow={
                  currentData.trackA.dbfs === null
                    ? -60
                    : Math.max(
                        -60,
                        Math.min(
                          0,
                          currentData.trackA.dbfs
                        )
                      )
                }
                aria-valuetext={formatDbfs(
                  currentData.trackA.dbfs
                )}
              >
                <div
                  className={
                    styles.audioLevelMeterA
                  }
                  style={{
                    width: `${getLevelWidth(
                      currentData.trackA.dbfs
                    )}%`,
                  }}
                />
              </div>

              <div
                className={styles.audioLevelDetails}
              >
                <span>
                  RMS:{" "}
                  {formatRms(
                    currentData.trackA.rms
                  )}
                </span>

                <span>
                  Peak:{" "}
                  {currentData.trackA.peakAmplitude.toFixed(
                    3
                  )}
                </span>
              </div>
            </div>

            {/* TRACK B */}

            <div className={styles.audioLevelCard}>
              <span
                className={styles.audioLevelTrack}
              >
                TRACK B
              </span>

              <strong
                className={styles.audioLevelValue}
              >
                {formatDbfs(
                  currentData.trackB.dbfs
                )}
              </strong>

              <div
                className={styles.audioLevelMeter}
                role="meter"
                aria-label="Track B RMS level"
                aria-valuemin={-60}
                aria-valuemax={0}
                aria-valuenow={
                  currentData.trackB.dbfs === null
                    ? -60
                    : Math.max(
                        -60,
                        Math.min(
                          0,
                          currentData.trackB.dbfs
                        )
                      )
                }
                aria-valuetext={formatDbfs(
                  currentData.trackB.dbfs
                )}
              >
                <div
                  className={
                    styles.audioLevelMeterB
                  }
                  style={{
                    width: `${getLevelWidth(
                      currentData.trackB.dbfs
                    )}%`,
                  }}
                />
              </div>

              <div
                className={styles.audioLevelDetails}
              >
                <span>
                  RMS:{" "}
                  {formatRms(
                    currentData.trackB.rms
                  )}
                </span>

                <span>
                  Peak:{" "}
                  {currentData.trackB.peakAmplitude.toFixed(
                    3
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* =====================================
              LEVEL DIFFERENCE
          ===================================== */}

          <div
            className={
              styles.audioLevelDifference
            }
          >
            <span
              className={
                styles.audioLevelDifferenceLabel
              }
            >
              RMS LEVEL DIFFERENCE · B − A
            </span>

            <strong
              className={
                styles.audioLevelDifferenceValue
              }
            >
              {difference === null
                ? "N/A"
                : `${
                    difference > 0 ? "+" : ""
                  }${difference.toFixed(2)} dB`}
            </strong>

            <p>
              {describeDifference(difference)}
            </p>
          </div>
        </>
      )}

      {/* TECHNICAL DISCLAIMER */}

      <p className={styles.audioLevelNote}>
        dBFS describes digital signal level,
        not perceived loudness. Meters display
        RMS level over a −60 to 0 dBFS range.
        Values outside that range are visually
        clamped.
      </p>
    </section>
  );
}
