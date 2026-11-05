
"use client";

import { useEffect, useState } from "react";

import { getDecodedAudio } from "./lib/audioAnalysis";
import {
  calculateSpectralFeatures,
  type SpectralFeatures,
} from "./lib/spectralFeatures";

import styles from "./page.module.css";

// =====================================
// TYPES
// =====================================

type FeatureData = {
  fileA: File;
  fileB: File;
  trackA: SpectralFeatures;
  trackB: SpectralFeatures;
};

type FeatureError = {
  fileA: File;
  fileB: File;
};

// =====================================
// HELPERS
// =====================================

function formatHz(value: number | null): string {
  if (value === null) {
    return "N/A";
  }

  return `${value.toFixed(1)} Hz`;
}

function formatFlatness(
  value: number | null
): string {
  if (value === null) {
    return "N/A";
  }

  return value.toFixed(4);
}

function describeFlatness(
  value: number | null
): string {
  if (value === null) {
    return "Insufficient spectral energy";
  }

  if (value < 0.1) {
    return "Strongly tonal spectrum";
  }

  if (value < 0.5) {
    return "Mixed tonal and noise-like content";
  }

  return "Broadly distributed spectral energy";
}

function formatDifference(
  a: number | null,
  b: number | null,
  unit: string,
  decimals: number
): string {
  if (a === null || b === null) {
    return "N/A";
  }

  const difference = Math.abs(a - b);

  return `${difference.toFixed(decimals)}${unit}`;
}

// =====================================
// ADVANCED SPECTRAL FEATURES
// =====================================

export default function SpectralFeaturesComparison({
  fileA,
  fileB,
}: {
  fileA: File;
  fileB: File;
}) {
  const [data, setData] =
    useState<FeatureData | null>(null);

  const [error, setError] =
    useState<FeatureError | null>(null);

  // =====================================
  // ANALYZE BOTH RECORDINGS
  // =====================================

  useEffect(() => {
    let cancelled = false;

    async function analyze() {
      try {
        // Share decoded AudioBuffers with
        // the waveform, FFT and RMS features.
        const [bufferA, bufferB] =
          await Promise.all([
            getDecodedAudio(fileA),
            getDecodedAudio(fileB),
          ]);

        const trackA =
          calculateSpectralFeatures(bufferA);

        const trackB =
          calculateSpectralFeatures(bufferB);

        if (!cancelled) {
          setData({
            fileA,
            fileB,
            trackA,
            trackB,
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

    void analyze();

    return () => {
      cancelled = true;
    };
  }, [fileA, fileB]);

  // =====================================
  // CURRENT FILE RESULTS ONLY
  // =====================================

  const currentData =
    data?.fileA === fileA &&
    data?.fileB === fileB
      ? data
      : null;

  const currentError =
    error?.fileA === fileA &&
    error?.fileB === fileB;

  // =====================================
  // RENDER
  // =====================================

  return (
    <section
      className={styles.advancedSpectralSection}
      aria-label="Advanced spectral feature comparison"
    >
      <div className={styles.advancedSpectralHeader}>
        <span>
          06 / ADVANCED SPECTRAL FEATURES
        </span>

        <span>FFT POWER ANALYSIS</span>
      </div>

      <div className={styles.advancedSpectralHeading}>
        <h3>Beyond the frequency peak.</h3>

        <p>
          Understand how spectral energy is
          distributed across both recordings.
        </p>
      </div>

      {currentError ? (
        <p
          role="alert"
          className={styles.spectrumError}
        >
          Unable to calculate advanced spectral
          features for these recordings.
        </p>
      ) : !currentData ? (
        <p
          role="status"
          className={styles.compareSpectrumLoading}
        >
          Analyzing spectral rolloff and flatness…
        </p>
      ) : (
        <>
          <div className={styles.advancedSpectralGrid}>
            {/* TRACK A */}
            <article
              className={styles.advancedSpectralCard}
            >
              <div
                className={
                  styles.advancedSpectralTrackA
                }
              >
                TRACK A
              </div>

              <div
                className={
                  styles.advancedSpectralMetric
                }
              >
                <span>85% SPECTRAL ROLLOFF</span>

                <strong>
                  {formatHz(
                    currentData.trackA.rolloffHz
                  )}
                </strong>
              </div>

              <div
                className={
                  styles.advancedSpectralMetric
                }
              >
                <span>SPECTRAL FLATNESS</span>

                <strong>
                  {formatFlatness(
                    currentData.trackA.flatness
                  )}
                </strong>

                <p>
                  {describeFlatness(
                    currentData.trackA.flatness
                  )}
                </p>
              </div>
            </article>

            {/* TRACK B */}
            <article
              className={styles.advancedSpectralCard}
            >
              <div
                className={
                  styles.advancedSpectralTrackB
                }
              >
                TRACK B
              </div>

              <div
                className={
                  styles.advancedSpectralMetric
                }
              >
                <span>85% SPECTRAL ROLLOFF</span>

                <strong>
                  {formatHz(
                    currentData.trackB.rolloffHz
                  )}
                </strong>
              </div>

              <div
                className={
                  styles.advancedSpectralMetric
                }
              >
                <span>SPECTRAL FLATNESS</span>

                <strong>
                  {formatFlatness(
                    currentData.trackB.flatness
                  )}
                </strong>

                <p>
                  {describeFlatness(
                    currentData.trackB.flatness
                  )}
                </p>
              </div>
            </article>
          </div>

          {/* DIFFERENCE SUMMARY */}
          <div
            className={
              styles.advancedSpectralSummary
            }
          >
            <h4>Feature differences</h4>

            <div
              className={
                styles.advancedSpectralDifferenceGrid
              }
            >
              <div>
                <span>ROLLOFF DIFFERENCE</span>

                <strong>
                  {formatDifference(
                    currentData.trackA.rolloffHz,
                    currentData.trackB.rolloffHz,
                    " Hz",
                    1
                  )}
                </strong>
              </div>

              <div>
                <span>FLATNESS DIFFERENCE</span>

                <strong>
                  {formatDifference(
                    currentData.trackA.flatness,
                    currentData.trackB.flatness,
                    "",
                    4
                  )}
                </strong>
              </div>
            </div>
          </div>

          <p
            className={
              styles.advancedSpectralInterpretation
            }
          >
            Spectral rolloff describes the
            frequency below which 85% of
            measured spectral power lies.
            Spectral flatness describes how
            concentrated or evenly distributed
            that power is.
          </p>
        </>
      )}

      <p className={styles.advancedSpectralNote}>
        Values are calculated from averaged
        Hann-windowed FFT power spectra.
        These features describe signal
        characteristics, not perceived sound
        quality or musical identity.
        Flatness descriptions are heuristic.
      </p>
    </section>
  );
}
