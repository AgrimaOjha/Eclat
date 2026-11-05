
"use client";

import { useEffect, useState } from "react";
import SpectralFeaturesComparison from "./SpectralFeaturesComparison";
import { getSpectrum } from "./FrequencySpectrum";
import { calculateSpectralSimilarity } from "./lib/spectralSimilarity";
import styles from "./page.module.css";
import AudioLevelComparison from "./AudioLevelComparison";
// =====================================
// TYPES
// =====================================

type Spectrum = Awaited<ReturnType<typeof getSpectrum>>;

type ComparisonData = {
  fileA: File;
  fileB: File;
  trackA: Spectrum;
  trackB: Spectrum;
};

type AnalysisError = {
  fileA: File;
  fileB: File;
};

// =====================================
// CONFIGURATION
// =====================================

const BAR_COUNT = 56;

// =====================================
// PEAK FREQUENCY COMPARISON
// =====================================

function comparePeaks(a: number, b: number) {
  const valid = a > 0 && b > 0;

  return {
    differenceHz: Math.abs(a - b),
    ratio: valid
      ? Math.max(a, b) / Math.min(a, b)
      : null,
    octaves: valid
      ? Math.log2(b / a)
      : null,
  };
}

// =====================================
// SPECTRUM COMPARISON COMPONENT
// =====================================

export default function SpectrumComparison({
  fileA,
  fileB,
}: {
  fileA: File;
  fileB: File;
}) {
  const [data, setData] =
    useState<ComparisonData | null>(null);

  const [error, setError] =
    useState<AnalysisError | null>(null);

  // =====================================
  // ANALYZE BOTH TRACKS
  // =====================================

  useEffect(() => {
    let cancelled = false;

    async function analyzeBoth() {
      try {
        // Reuse the shared FFT cache.
        const [trackA, trackB] = await Promise.all([
          getSpectrum(fileA),
          getSpectrum(fileB),
        ]);

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

    void analyzeBoth();

    return () => {
      cancelled = true;
    };
  }, [fileA, fileB]);

  // =====================================
  // CURRENT FILE RESULTS
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
  // SPECTRAL SIMILARITY
  // =====================================

  const similarity = currentData
    ? calculateSpectralSimilarity(
        currentData.trackA.bars,
        currentData.trackB.bars
      )
    : null;

  // =====================================
  // SPECTRAL DIFFERENCE MAP
  // =====================================

  const differences = currentData
    ? Array.from(
        { length: BAR_COUNT },
        (_, index) => {
          const a =
            currentData.trackA.bars[index] ?? 0;

          const b =
            currentData.trackB.bars[index] ?? 0;

          return Math.abs(a - b);
        }
      )
    : [];

  const strongestDifference =
    differences.length > 0
      ? Math.max(...differences)
      : 0;

  // =====================================
  // PEAK FREQUENCY METRICS
  // =====================================

  const peakComparison = currentData
    ? comparePeaks(
        currentData.trackA.peakHz,
        currentData.trackB.peakHz
      )
    : null;

  // =====================================
  // RENDER
  // =====================================

  return (
    <section
      className={styles.compareSpectrumSection}
      aria-label="Combined frequency spectrum"
    >
      {/* =====================================
          HEADER
      ===================================== */}

      <div className={styles.compareSpectrumHeading}>
        <p className={styles.compareSpectrumEyebrow}>
          03 / SPECTRAL COMPARISON
        </p>

        <h3>Two sounds. One spectrum.</h3>

        <p className={styles.compareSpectrumDescription}>
          Explore where the frequency content of
          two recordings differs.
        </p>
      </div>

      {/* =====================================
          TRACK LEGEND
      ===================================== */}

      <div className={styles.compareSpectrumLegend}>
        <div className={styles.compareLegendItem}>
          <span
            className={styles.compareLegendA}
            aria-hidden="true"
          />

          <span>
            TRACK A · {fileA.name}
          </span>
        </div>

        <div className={styles.compareLegendItem}>
          <span
            className={styles.compareLegendB}
            aria-hidden="true"
          />

          <span>
            TRACK B · {fileB.name}
          </span>
        </div>
      </div>

      {/* =====================================
          LOADING / ERROR / RESULTS
      ===================================== */}

      {currentError ? (
        <p
          role="alert"
          className={styles.spectrumError}
        >
          Unable to compare the frequency spectra.
          Please upload valid WAV recordings.
        </p>
      ) : !currentData ? (
        <p
          role="status"
          className={styles.compareSpectrumLoading}
        >
          Analyzing both frequency spectra…
        </p>
      ) : (
        <>
          {/* =====================================
              COMBINED FREQUENCY SPECTRUM
          ===================================== */}

          <div
            className={styles.compareSpectrumChart}
            role="img"
            aria-label={`Shared frequency spectrum. Track A peak ${currentData.trackA.peakHz.toFixed(
              1
            )} hertz, Track B peak ${currentData.trackB.peakHz.toFixed(
              1
            )} hertz.`}
          >
            {Array.from(
              { length: BAR_COUNT },
              (_, index) => {
                const a =
                  currentData.trackA.bars[index] ?? 0;

                const b =
                  currentData.trackB.bars[index] ?? 0;

                return (
                  <div
                    key={index}
                    className={
                      styles.compareSpectrumBarGroup
                    }
                    aria-hidden="true"
                  >
                    <span
                      className={
                        styles.compareSpectrumBarA
                      }
                      style={{
                        height: `${
                          2 + Math.round(a * 98)
                        }%`,
                      }}
                    />

                    <span
                      className={
                        styles.compareSpectrumBarB
                      }
                      style={{
                        height: `${
                          2 + Math.round(b * 98)
                        }%`,
                      }}
                    />
                  </div>
                );
              }
            )}
          </div>

          {/* FREQUENCY AXIS */}

          <div className={styles.compareSpectrumAxis}>
            <span>60 Hz</span>
            <span>~700 Hz</span>
            <span>8 kHz</span>
          </div>

          {/* =====================================
              PEAK FREQUENCY STATS
          ===================================== */}

          <div className={styles.compareSpectrumStats}>
            <div>
              <span>
                TRACK A · STRONGEST PEAK
              </span>

              <strong>
                {currentData.trackA.peakHz.toFixed(1)} Hz
              </strong>
            </div>

            <div>
              <span>
                TRACK B · STRONGEST PEAK
              </span>

              <strong>
                {currentData.trackB.peakHz.toFixed(1)} Hz
              </strong>
            </div>
          </div>

          {/* =====================================
              SPECTRAL DIFFERENCE MAP
          ===================================== */}

          <div className={styles.spectralDifference}>
            <div
              className={
                styles.spectralDifferenceHeading
              }
            >
              <h4>Spectral difference map</h4>

              <p>
                Where do the normalized frequency
                patterns differ?
              </p>
            </div>

            <div
              className={
                styles.spectralDifferenceChart
              }
              role="img"
              aria-label={
                "Absolute differences between the tracks' " +
                "independently normalized frequency magnitudes"
              }
            >
              {differences.map(
                (difference, index) => {
                  const normalized =
                    strongestDifference > 0
                      ? difference /
                        strongestDifference
                      : 0;

                  return (
                    <span
                      key={index}
                      style={{
                        height: `${
                          2 +
                          Math.round(normalized * 98)
                        }%`,
                      }}
                    />
                  );
                }
              )}
            </div>

            <div className={styles.compareSpectrumAxis}>
              <span>60 Hz</span>
              <span>~700 Hz</span>
              <span>8 kHz</span>
            </div>
          </div>

          {/* =====================================
              DIFFERENCE METRICS
          ===================================== */}

          <div className={styles.spectralInsights}>
            <div>
              <span>
                ABSOLUTE PEAK DIFFERENCE
              </span>

              <strong>
                {peakComparison
                  ? `${peakComparison.differenceHz.toFixed(
                      1
                    )} Hz`
                  : "—"}
              </strong>
            </div>

            <div>
              <span>
                STRONGEST PEAK FREQUENCY RATIO
              </span>

              <strong>
                {peakComparison?.ratio != null
                  ? `${peakComparison.ratio.toFixed(
                      2
                    )}×`
                  : "Undefined"}
              </strong>
            </div>

            <div>
              <span>
                DIRECTIONAL OCTAVE DIFFERENCE
              </span>

              <strong>
                {peakComparison?.octaves != null
                  ? `${peakComparison.octaves.toFixed(
                      3
                    )} oct`
                  : "Undefined"}
              </strong>
            </div>
          </div>

          {/* DIFFERENCE INTERPRETATION */}

          <p className={styles.spectralInterpretation}>
            The difference map compares normalized
            spectral shapes. Taller bars indicate
            larger differences at those frequency
            regions, relative to the largest difference
            in this pair.
          </p>

          {/* =====================================
              NEW — SPECTRAL SIMILARITY SCORE
          ===================================== */}

          {similarity && (
            <div className={styles.similaritySection}>
              <div className={styles.similarityHeader}>
                <span>
                  04 / SPECTRAL SIMILARITY
                </span>

                <span>
                  COSINE SIMILARITY
                </span>
                <AudioLevelComparison fileA={fileA} fileB={fileB} />
                <SpectralFeaturesComparison fileA={fileA}fileB={fileB}/>
              </div>

              <div className={styles.similarityScoreRow}>
                <div>
                  <p
                    className={
                      styles.similarityEyebrow
                    }
                  >
                    NORMALIZED FREQUENCY MATCH
                  </p>

                  <h3 className={styles.similarityScore}>
                    {similarity.score === null
                      ? "N/A"
                      : `${similarity.score.toFixed(
                          1
                        )}%`}
                  </h3>
                </div>

                <span
                  className={
                    styles.similarityLevel
                  }
                >
                  {similarity.level}
                </span>
              </div>

              {/* SIMILARITY PROGRESS BAR */}

              {similarity.score !== null ? (
                <div
                  className={
                    styles.similarityProgress
                  }
                  role="progressbar"
                  aria-label="Spectral shape similarity"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={similarity.score}
                >
                  <div
                    className={
                      styles.similarityProgressFill
                    }
                    style={{
                      width: `${similarity.score}%`,
                    }}
                  />
                </div>
              ) : (
                <p
                  className={
                    styles.similarityDisclaimer
                  }
                >
                  No valid similarity score can be
                  calculated for this pair.
                </p>
              )}

              {/* INTERPRETATION */}

              <p
                className={
                  styles.similarityExplanation
                }
              >
                {similarity.explanation}
              </p>

              {/* SCIENTIFIC DISCLAIMER */}

              <p
                className={
                  styles.similarityDisclaimer
                }
              >
                This score compares normalized
                spectral patterns. It does not
                measure perceived audio similarity,
                identify matching songs, or
                compare absolute loudness.
              </p>
            </div>
          )}
        </>
      )}

      {/* =====================================
          TECHNICAL NOTE
      ===================================== */}

      <p className={styles.compareSpectrumNote}>
        FFT magnitude · Logarithmic frequency axis ·
        Independent normalization per recording.
        These comparisons do not measure perceived
        audio similarity, absolute loudness, or
        musical pitch.
      </p>
    </section>
  );
}
