
"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";

import AudioWaveform from "./AudioWaveform";
import FrequencySpectrum from "./FrequencySpectrum";
import SpectrumComparison from "./SpectrumComparison";

import styles from "./page.module.css";

// ==================== TYPES ====================

type Fingerprint = {
  duration_seconds: number;
  sample_rate: number;
  rms_energy: number;
  spectral_centroid_hz: number;
  zero_crossing_rate: number;
};

type FeatureDifference = {
  track_a: number;
  track_b: number;
  signed_difference: number;
  absolute_difference: number;
  normalized_difference: number;
};

type ComparisonResponse = {
  status: string;
  filenames: {
    track_a: string;
    track_b: string;
  };
  result: {
    track_a: Fingerprint;
    track_b: Fingerprint;
    comparison: {
      features: Record<string, FeatureDifference>;
      additional_metrics: {
        rms_difference_db: number | null;
        centroid_difference_octaves: number | null;
      };
    };
  };
};

type MetricKey =
  | "rms_energy"
  | "spectral_centroid_hz"
  | "zero_crossing_rate";

// ==================== CONSTANTS ====================

const MAX_BYTES = 10 * 1024 * 1024;

const metrics: {
  key: MetricKey;
  label: string;
  unit: string;
}[] = [
  {
    key: "rms_energy",
    label: "RMS energy",
    unit: "",
  },
  {
    key: "spectral_centroid_hz",
    label: "Spectral centroid",
    unit: "Hz",
  },
  {
    key: "zero_crossing_rate",
    label: "Zero-crossing rate",
    unit: "",
  },
];

// ==================== AUDIO SLOT ====================

function AudioSlot({
  label,
  number,
  file,
  onFile,
}: {
  label: string;
  number: string;
  file: File | null;
  onFile: (file: File | null) => void;
}) {
  function handleChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    onFile(event.target.files?.[0] ?? null);

    // Allows the same file to be selected again.
    event.target.value = "";
  }

  return (
    <div className={styles.audioSlot}>
      <div className={styles.slotTop}>
        <span className={styles.slotNumber}>
          {number}
        </span>

        <span className={styles.slotLabel}>
          {label}
        </span>
      </div>

      {/* REAL WAVEFORM + INTERACTIVE PLAYBACK */}
      <AudioWaveform file={file} />

      {/* SELECTED FILE INFORMATION */}
      {file ? (
        <div className={styles.selectedFile}>
          <strong title={file.name}>
            {file.name}
          </strong>

          <span>
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </span>
        </div>
      ) : (
        <p className={styles.emptyText}>
          A recording waiting to be discovered.
        </p>
      )}

      {/* UPLOAD / REPLACE BUTTON */}
      <label className={styles.fileButton}>
        {file
          ? "Replace recording"
          : "Choose WAV recording"}

        <input
          type="file"
          accept=".wav,audio/wav"
          onChange={handleChange}
          aria-label={`Choose ${label}`}
        />
      </label>

      {/* INDIVIDUAL FREQUENCY SPECTRUM */}
      {file && (
        <FrequencySpectrum file={file} />
      )}
    </div>
  );
}

// ==================== MAIN HOME PAGE ====================

export default function Home() {
  const [fileA, setFileA] =
    useState<File | null>(null);

  const [fileB, setFileB] =
    useState<File | null>(null);

  const [result, setResult] =
    useState<ComparisonResponse | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);

  const canAnalyze = Boolean(
    fileA && fileB && !loading
  );

  // ==================== FILE UPDATES ====================

  function changeA(file: File | null) {
    setFileA(file);
    setResult(null);
    setError(null);
  }

  function changeB(file: File | null) {
    setFileB(file);
    setResult(null);
    setError(null);
  }

  // ==================== API COMPARISON ====================

  async function analyze() {
    if (!fileA || !fileB || loading) {
      return;
    }

    setError(null);
    setResult(null);

    // Validate both uploaded WAV files.
    for (const file of [fileA, fileB]) {
      if (!file.name.toLowerCase().endsWith(".wav")) {
        setError(
          "Please choose WAV recordings only."
        );
        return;
      }

      if (
        file.size === 0 ||
        file.size > MAX_BYTES
      ) {
        setError(
          "Each recording must be between 1 byte and 10 MiB."
        );
        return;
      }
    }

    const form = new FormData();

    form.append("file_a", fileA);
    form.append("file_b", fileB);

    setLoading(true);

    try {
      const response = await fetch("/api/compare", {
        method: "POST",
        body: form,
      });

      const data = await response.json();

      if (!response.ok) {
        const message =
          typeof data.detail === "string"
            ? data.detail
            : "Analysis failed. Please check the recordings.";

        throw new Error(message);
      }

      setResult(data as ComparisonResponse);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something unexpected happened."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==================== PAGE UI ====================

  return (
    <main className={styles.page}>
      {/* AMBIENT BACKGROUND */}
      <div
        className={styles.ambient}
        aria-hidden="true"
      />

      <div className={styles.container}>
        {/* HEADER */}
        <header className={styles.header}>
          <div className={styles.brand}>
            ÉCLAT<span>.</span>
          </div>

          <div className={styles.headerRight}>
            <span className={styles.statusDot} />
            ACOUSTIC LAB / V0.4
          </div>
        </header>

        {/* HERO */}
        <section className={styles.hero}>
          <p className={styles.eyebrow}>
            THE ART & SCIENCE OF LISTENING
          </p>

          <h1>
            Every sound
            <br />
            tells a <em>story.</em>
          </h1>

          <p className={styles.heroDescription}>
            Two recordings. Countless details.
            Discover the measurable differences
            hidden inside sound.
          </p>
        </section>

        {/* EXPERIMENT WORKSPACE */}
        <section className={styles.workspace}>
          <div className={styles.sectionHeading}>
            <span>
              01 / THE EXPERIMENT
            </span>

            <span>
              WAV ONLY · MAX 30 SEC
            </span>
          </div>

          {/* AUDIO UPLOAD CARDS */}
          <div className={styles.uploadGrid}>
            <AudioSlot
              number="A"
              label="TRACK ONE"
              file={fileA}
              onFile={changeA}
            />

            <AudioSlot
              number="B"
              label="TRACK TWO"
              file={fileB}
              onFile={changeB}
            />
          </div>

          {/* ANALYZE BUTTON */}
          <button
            type="button"
            className={styles.analyzeButton}
            onClick={analyze}
            disabled={!canAnalyze}
          >
            {loading ? (
              <>Analyzing your recordings…</>
            ) : (
              <>
                Reveal the differences
                <span>↗</span>
              </>
            )}
          </button>

          <p className={styles.privacyNote}>
            Your recordings are processed for this comparison.
            No audio is deliberately saved by our application.
          </p>

          {/* LOADING */}
          {loading && (
            <div
              className={styles.loading}
              role="status"
            >
              <span className={styles.spinner} />
              Extracting acoustic fingerprints
              and comparing features…
            </div>
          )}

          {/* ERROR */}
          {error && (
            <div
              className={styles.error}
              role="alert"
            >
              <strong>
                Analysis interrupted.
              </strong>

              <p>{error}</p>
            </div>
          )}
        </section>

        {/* ==================== RESULTS ==================== */}

        {result && (
          <section
            className={styles.results}
            aria-live="polite"
          >
            <div className={styles.sectionHeading}>
              <span>
                02 / YOUR ACOUSTIC REPORT
              </span>

              <span>
                ANALYSIS COMPLETE
              </span>
            </div>

            <h2>
              The sound, decoded.
            </h2>

            <p className={styles.resultIntro}>
              Every value below comes from
              the Python acoustic comparison engine.
            </p>

            {/* TRACK SUMMARY */}
            <div className={styles.summaryGrid}>
              <div>
                <span>TRACK A</span>

                <strong>
                  {result.filenames.track_a}
                </strong>

                <small>
                  {result.result.track_a.duration_seconds.toFixed(2)}
                  s
                  {" · "}
                  {result.result.track_a.sample_rate.toLocaleString()}
                  {" Hz"}
                </small>
              </div>

              <div>
                <span>TRACK B</span>

                <strong>
                  {result.filenames.track_b}
                </strong>

                <small>
                  {result.result.track_b.duration_seconds.toFixed(2)}
                  s
                  {" · "}
                  {result.result.track_b.sample_rate.toLocaleString()}
                  {" Hz"}
                </small>
              </div>
            </div>

            {/* ACOUSTIC METRIC COMPARISONS */}
            <div className={styles.metricList}>
              {metrics.map((metric) => {
                const value =
                  result.result.comparison.features[
                    metric.key
                  ];

                const max = Math.max(
                  value.track_a,
                  value.track_b,
                  0.000001
                );

                return (
                  <div
                    className={styles.metric}
                    key={metric.key}
                  >
                    <div className={styles.metricHeader}>
                      <h3>
                        {metric.label}
                      </h3>

                      <span>
                        Normalized difference:{" "}
                        {value.normalized_difference.toFixed(3)}
                      </span>
                    </div>

                    {/* TRACK A BAR */}
                    <div className={styles.barRow}>
                      <span>A</span>

                      <div className={styles.barTrack}>
                        <div
                          className={styles.barA}
                          style={{
                            width: `${
                              (value.track_a / max) * 100
                            }%`,
                          }}
                        />
                      </div>

                      <strong>
                        {value.track_a.toFixed(4)}
                        {" "}
                        {metric.unit}
                      </strong>
                    </div>

                    {/* TRACK B BAR */}
                    <div className={styles.barRow}>
                      <span>B</span>

                      <div className={styles.barTrack}>
                        <div
                          className={styles.barB}
                          style={{
                            width: `${
                              (value.track_b / max) * 100
                            }%`,
                          }}
                        />
                      </div>

                      <strong>
                        {value.track_b.toFixed(4)}
                        {" "}
                        {metric.unit}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ADDITIONAL METRICS */}
            <div className={styles.extraMetrics}>
              <div>
                <span>
                  RMS level difference
                </span>

                <strong>
                  {result.result.comparison
                    .additional_metrics
                    .rms_difference_db?.toFixed(3) ??
                    "Undefined"}

                  {result.result.comparison
                    .additional_metrics
                    .rms_difference_db !== null &&
                    " dB"}
                </strong>
              </div>

              <div>
                <span>
                  Spectral centroid ratio
                </span>

                <strong>
                  {result.result.comparison
                    .additional_metrics
                    .centroid_difference_octaves?.toFixed(3) ??
                    "Undefined"}

                  {result.result.comparison
                    .additional_metrics
                    .centroid_difference_octaves !== null &&
                    " octaves"}
                </strong>
              </div>
            </div>

            {/* ==================== MODULE 04 ==================== */}

            {/* SHARED FREQUENCY COMPARISON */}
            {fileA && fileB && (
              <SpectrumComparison
                fileA={fileA}
                fileB={fileB}
              />
            )}

            {/* INTERPRETATION DISCLAIMER */}
            <p className={styles.disclaimer}>
              These are acoustic measurements,
              not emotional similarity scores.
              Normalized difference ranges
              from 0 (equal values) to 1
              (maximum pair-relative difference).
            </p>
          </section>
        )}

        {/* FOOTER */}
        <footer className={styles.footer}>
          <span>
            ÉCLAT — SOUND INTELLIGENCE
          </span>

          <span>
            POWERED BY THE SYNAPSE VISION
          </span>
        </footer>
      </div>
    </main>
  );
}
