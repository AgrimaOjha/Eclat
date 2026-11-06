
"use client";

import {
  useEffect,
  useId,
  useState,
} from "react";

import type {
  KeyboardEvent,
} from "react";

import { getSpectrum } from "./FrequencySpectrum";

import {
  calculateSpectralSimilarity,
} from "./lib/spectralSimilarity";

import AudioLevelComparison from "./AudioLevelComparison";
import SpectralFeaturesComparison from "./SpectralFeaturesComparison";
import BackendAcousticReport from "./BackendAcousticReport";

import type {
  BackendComparisonResponse,
} from "./BackendAcousticReport";

import styles from "./page.module.css";

// =====================================
// TYPES
// =====================================

type Spectrum =
  Awaited<ReturnType<typeof getSpectrum>>;

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

type DiscoveryTab =
  | "overview"
  | "frequency"
  | "levels"
  | "features";

// =====================================
// CONFIGURATION
// =====================================

const BAR_COUNT = 56;

const tabs: {
  id: DiscoveryTab;
  label: string;
  number: string;
}[] = [
  {
    id: "overview",
    label: "Overview",
    number: "01",
  },
  {
    id: "frequency",
    label: "Frequency",
    number: "02",
  },
  {
    id: "levels",
    label: "Levels",
    number: "03",
  },
  {
    id: "features",
    label: "Features",
    number: "04",
  },
];

// =====================================
// HELPERS
// =====================================

function comparePeaks(
  a: number,
  b: number
) {
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
// DISCOVERIES WORKSPACE
// =====================================

export default function SpectrumComparison({
  fileA,
  fileB,
  backendReport,
}: {
  fileA: File;
  fileB: File;
  backendReport: BackendComparisonResponse;
}) {
  // -------------------------------------
  // ACTIVE TAB
  // -------------------------------------

  const [activeTab, setActiveTab] =
    useState<DiscoveryTab>("overview");

  // -------------------------------------
  // FFT DATA
  // -------------------------------------

  const [data, setData] =
    useState<ComparisonData | null>(null);

  const [error, setError] =
    useState<AnalysisError | null>(null);

  // Unique accessible tab IDs.
  const instanceId = useId();

  // =====================================
  // LOAD SHARED FFT RESULTS
  // =====================================

  useEffect(() => {
    let cancelled = false;

    async function analyzeBoth() {
      try {
        const [trackA, trackB] =
          await Promise.all([
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
  // CURRENT FILE DATA ONLY
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
  // PEAK COMPARISON
  // =====================================

  const peakComparison = currentData
    ? comparePeaks(
        currentData.trackA.peakHz,
        currentData.trackB.peakHz
      )
    : null;

  // =====================================
  // FREQUENCY DIFFERENCE MAP
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
  // ACCESSIBLE TAB KEYBOARD NAVIGATION
  // =====================================

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) {
    let nextIndex = index;

    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % tabs.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex =
        (index - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();

    setActiveTab(tabs[nextIndex].id);

    const tabButtons =
      event.currentTarget.parentElement
        ?.querySelectorAll<HTMLButtonElement>(
          '[role="tab"]'
        );

    tabButtons?.[nextIndex]?.focus();
  }

  // =====================================
  // RENDER
  // =====================================

  return (
    <section
      className={styles.compareSpectrumSection}
      aria-label="ÉCLAT discoveries workspace"
    >
      {/* =====================================
          HEADER
      ===================================== */}

      <div className={styles.compareSpectrumHeading}>
        <p className={styles.compareSpectrumEyebrow}>
          THE DISCOVERIES
        </p>

        <h3>Inside the sound.</h3>

        <p className={styles.compareSpectrumDescription}>
          One experiment. Four acoustic
          perspectives. Explore the measurements
          that make each recording unique.
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
          INTERACTIVE NAVIGATION
      ===================================== */}

      <div
        className={styles.discoveryTabs}
        role="tablist"
        aria-label="Acoustic analysis views"
      >
        {tabs.map((tab, index) => {
          const selected =
            activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${instanceId}-tab-${tab.id}`}
              aria-controls={`${instanceId}-panel-${tab.id}`}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              className={
                selected
                  ? `${styles.discoveryTab} ${styles.discoveryTabActive}`
                  : styles.discoveryTab
              }
              onClick={() =>
                setActiveTab(tab.id)
              }
              onKeyDown={(event) =>
                handleTabKeyDown(event, index)
              }
            >
              <span className={styles.discoveryTabNumber}>
                {tab.number}
              </span>

              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =====================================
          TAB PANELS
      ===================================== */}

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${instanceId}-panel-${tab.id}`}
          aria-labelledby={`${instanceId}-tab-${tab.id}`}
          className={styles.discoveryPanel}
          hidden={activeTab !== tab.id}
        >
          {/* =====================================
              OVERVIEW
          ===================================== */}

          {tab.id === "overview" &&
            activeTab === "overview" && (
              <>
                {currentError ? (
                  <p
                    role="alert"
                    className={styles.spectrumError}
                  >
                    Unable to analyze the frequency
                    spectra. Please upload valid WAV
                    recordings.
                  </p>
                ) : !currentData || !similarity ? (
                  <p
                    role="status"
                    className={
                      styles.compareSpectrumLoading
                    }
                  >
                    Discovering your audio signatures…
                  </p>
                ) : (
                  <div
                    className={
                      styles.discoveryOverview
                    }
                  >
                    {/* OVERVIEW INTRO */}

                    <div
                      className={
                        styles.discoveryIntro
                      }
                    >
                      <span
                        className={
                          styles.discoveryEyebrow
                        }
                      >
                        THE BIG PICTURE
                      </span>

                      <h4>
                        Two recordings.
                        <br />
                        One comparison.
                      </h4>

                      <p>
                        Start with spectral shape
                        similarity, then explore
                        the detailed acoustic
                        measurements.
                      </p>
                    </div>

                    {/* =====================================
                        SIMILARITY SCORE
                    ===================================== */}

                    <div
                      className={
                        styles.similaritySection
                      }
                    >
                      <div
                        className={
                          styles.similarityHeader
                        }
                      >
                        <span>
                          SPECTRAL SHAPE SIMILARITY
                        </span>

                        <span>
                          COSINE SIMILARITY
                        </span>
                      </div>

                      <div
                        className={
                          styles.similarityScoreRow
                        }
                      >
                        <div>
                          <p
                            className={
                              styles.similarityEyebrow
                            }
                          >
                            NORMALIZED FREQUENCY MATCH
                          </p>

                          <h3
                            className={
                              styles.similarityScore
                            }
                          >
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

                      {/* SIMILARITY PROGRESS */}

                      {similarity.score !== null && (
                        <div
                          className={
                            styles.similarityProgress
                          }
                          role="progressbar"
                          aria-label="Spectral shape similarity"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={
                            similarity.score
                          }
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
                      )}

                      <p
                        className={
                          styles.similarityExplanation
                        }
                      >
                        {similarity.explanation}
                      </p>

                      <p
                        className={
                          styles.similarityDisclaimer
                        }
                      >
                        This compares normalized
                        frequency patterns, not
                        perceived similarity,
                        absolute loudness, or
                        musical identity.
                      </p>
                    </div>

                    {/* =====================================
                        QUICK FREQUENCY METRICS
                    ===================================== */}

                    <div
                      className={
                        styles.discoveryMetricGrid
                      }
                    >
                      <div
                        className={
                          styles.discoveryMetric
                        }
                      >
                        <span>
                          TRACK A · PEAK FREQUENCY
                        </span>

                        <strong>
                          {currentData.trackA.peakHz.toFixed(
                            1
                          )}{" "}
                          Hz
                        </strong>
                      </div>

                      <div
                        className={
                          styles.discoveryMetric
                        }
                      >
                        <span>
                          TRACK B · PEAK FREQUENCY
                        </span>

                        <strong>
                          {currentData.trackB.peakHz.toFixed(
                            1
                          )}{" "}
                          Hz
                        </strong>
                      </div>

                      <div
                        className={
                          styles.discoveryMetric
                        }
                      >
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
                    </div>

                    {/* =====================================
                        EXPANDABLE PYTHON REPORT
                    ===================================== */}

                    <details
                      className={
                        styles.backendReportDisclosure
                      }
                    >
                      <summary
                        className={
                          styles.backendReportToggle
                        }
                      >
                        <span>
                          <span
                            className={
                              styles.discoveryEyebrow
                            }
                          >
                            DEEPER ANALYSIS
                          </span>

                          <strong>
                            Explore Python acoustic
                            measurements
                          </strong>

                          <small>
                            RMS · Spectral centroid ·
                            Zero-crossing rate
                          </small>
                        </span>

                        <span
                          className={
                            styles.backendReportToggleIcon
                          }
                          aria-hidden="true"
                        >
                          +
                        </span>
                      </summary>

                      <div
                        className={
                          styles.backendReportContent
                        }
                      >
                        <BackendAcousticReport
                          report={backendReport}
                        />
                      </div>
                    </details>

                    <p
                      className={
                        styles.discoveryHint
                      }
                    >
                      Switch to Frequency, Levels,
                      or Features for additional
                      visualizations and measurements.
                    </p>
                  </div>
                )}
              </>
            )}

          {/* =====================================
              FREQUENCY TAB
          ===================================== */}

          {tab.id === "frequency" &&
            activeTab === "frequency" && (
              <>
                {currentError ? (
                  <p
                    role="alert"
                    className={styles.spectrumError}
                  >
                    Unable to compare the frequency
                    spectra.
                  </p>
                ) : !currentData ? (
                  <p
                    role="status"
                    className={
                      styles.compareSpectrumLoading
                    }
                  >
                    Analyzing both spectra…
                  </p>
                ) : (
                  <div
                    className={
                      styles.discoveryFrequency
                    }
                  >
                    {/* FREQUENCY INTRO */}

                    <div
                      className={
                        styles.discoveryIntro
                      }
                    >
                      <span
                        className={
                          styles.discoveryEyebrow
                        }
                      >
                        FREQUENCY ANALYSIS
                      </span>

                      <h4>
                        Two sounds.
                        <br />
                        One spectrum.
                      </h4>

                      <p>
                        Explore differences in
                        dominant frequencies
                        and normalized spectral
                        shapes.
                      </p>
                    </div>

                    {/* =====================================
                        COMBINED FFT SPECTRUM
                    ===================================== */}

                    <div
                      className={
                        styles.compareSpectrumChart
                      }
                      role="img"
                      aria-label={`Combined spectrum. Track A peak ${currentData.trackA.peakHz.toFixed(
                        1
                      )} Hz, Track B peak ${currentData.trackB.peakHz.toFixed(
                        1
                      )} Hz.`}
                    >
                      {Array.from(
                        { length: BAR_COUNT },
                        (_, index) => {
                          const a =
                            currentData.trackA.bars[
                              index
                            ] ?? 0;

                          const b =
                            currentData.trackB.bars[
                              index
                            ] ?? 0;

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
                                    2 +
                                    Math.round(a * 98)
                                  }%`,
                                }}
                              />

                              <span
                                className={
                                  styles.compareSpectrumBarB
                                }
                                style={{
                                  height: `${
                                    2 +
                                    Math.round(b * 98)
                                  }%`,
                                }}
                              />
                            </div>
                          );
                        }
                      )}
                    </div>

                    <div
                      className={
                        styles.compareSpectrumAxis
                      }
                    >
                      <span>60 Hz</span>
                      <span>~700 Hz</span>
                      <span>8 kHz</span>
                    </div>

                    {/* =====================================
                        PEAK FREQUENCIES
                    ===================================== */}

                    <div
                      className={
                        styles.compareSpectrumStats
                      }
                    >
                      <div>
                        <span>
                          TRACK A · STRONGEST PEAK
                        </span>

                        <strong>
                          {currentData.trackA.peakHz.toFixed(
                            1
                          )}{" "}
                          Hz
                        </strong>
                      </div>

                      <div>
                        <span>
                          TRACK B · STRONGEST PEAK
                        </span>

                        <strong>
                          {currentData.trackB.peakHz.toFixed(
                            1
                          )}{" "}
                          Hz
                        </strong>
                      </div>
                    </div>

                    {/* =====================================
                        SPECTRAL DIFFERENCE MAP
                    ===================================== */}

                    <div
                      className={
                        styles.spectralDifference
                      }
                    >
                      <div
                        className={
                          styles.spectralDifferenceHeading
                        }
                      >
                        <h4>
                          Spectral difference map
                        </h4>

                        <p>
                          Where do the normalized
                          frequency patterns differ?
                        </p>
                      </div>

                      <div
                        className={
                          styles.spectralDifferenceChart
                        }
                        role="img"
                        aria-label="Differences between independently normalized spectral magnitudes"
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
                                    Math.round(
                                      normalized * 98
                                    )
                                  }%`,
                                }}
                              />
                            );
                          }
                        )}
                      </div>

                      <div
                        className={
                          styles.compareSpectrumAxis
                        }
                      >
                        <span>60 Hz</span>
                        <span>~700 Hz</span>
                        <span>8 kHz</span>
                      </div>
                    </div>

                    {/* =====================================
                        FREQUENCY INSIGHTS
                    ===================================== */}

                    <div
                      className={
                        styles.spectralInsights
                      }
                    >
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
                          STRONGEST PEAK RATIO
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

                    <p
                      className={
                        styles.spectralInterpretation
                      }
                    >
                      Taller difference bars indicate
                      larger differences between
                      the two normalized spectra,
                      relative to the largest
                      difference in this pair.
                    </p>
                  </div>
                )}
              </>
            )}

          {/* =====================================
              LEVELS TAB
          ===================================== */}

          {tab.id === "levels" &&
            activeTab === "levels" && (
              <AudioLevelComparison
                fileA={fileA}
                fileB={fileB}
              />
            )}

          {/* =====================================
              FEATURES TAB
          ===================================== */}

          {tab.id === "features" &&
            activeTab === "features" && (
              <SpectralFeaturesComparison
                fileA={fileA}
                fileB={fileB}
              />
            )}
        </div>
      ))}

      {/* =====================================
          SCIENTIFIC DISCLAIMER
      ===================================== */}

      <p className={styles.compareSpectrumNote}>
        ÉCLAT analyzes digital audio signals.
        These measurements do not establish
        perceptual similarity, song identity,
        or perceived sound quality.
      </p>
    </section>
  );
}
