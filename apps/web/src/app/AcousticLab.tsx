
"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  ChangeEvent,
} from "react";

import AudioWaveform from "./AudioWaveform";
import FrequencySpectrum from "./FrequencySpectrum";
import SpectrumComparison from "./SpectrumComparison";

import type {
  BackendComparisonResponse,
} from "./BackendAcousticReport";

import styles from "./page.module.css";

// =====================================
// CONFIGURATION
// =====================================

const MAX_BYTES = 10 * 1024 * 1024;

// =====================================
// AUDIO UPLOAD SLOT
// =====================================

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
    const selected =
      event.target.files?.[0] ?? null;

    onFile(selected);

    // Allow selecting the same file again.
    event.target.value = "";
  }

  return (
    <div className={styles.audioSlot}>
      {/* TRACK HEADING */}

      <div className={styles.slotTop}>
        <span className={styles.slotNumber}>
          {number}
        </span>

        <span className={styles.slotLabel}>
          {label}
        </span>
      </div>

      {/* INTERACTIVE WAVEFORM */}

      <AudioWaveform file={file} />

      {/* SELECTED FILE / EMPTY STATE */}

      {file ? (
        <div className={styles.selectedFile}>
          <strong title={file.name}>
            {file.name}
          </strong>

          <span>
            {(file.size / 1024 / 1024).toFixed(2)}
            {" MB"}
          </span>
        </div>
      ) : (
        <p className={styles.emptyText}>
          A recording waiting to be discovered.
        </p>
      )}

      {/* FILE UPLOAD */}

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

      {/* INDIVIDUAL FFT SPECTRUM */}

      {file && (
        <FrequencySpectrum file={file} />
      )}
    </div>
  );
}

// =====================================
// MAIN ACOUSTIC LABORATORY
// =====================================

export default function AcousticLab() {
  // -------------------------------------
  // UPLOADED FILES
  // -------------------------------------

  const [fileA, setFileA] =
    useState<File | null>(null);

  const [fileB, setFileB] =
    useState<File | null>(null);

  // -------------------------------------
  // ANALYSIS STATE
  // -------------------------------------

  const [result, setResult] =
    useState<BackendComparisonResponse | null>(
      null
    );

  const [error, setError] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);

  // -------------------------------------
  // RESULTS REF
  // -------------------------------------

  const discoveriesRef =
    useRef<HTMLElement | null>(null);

  const [scrollToResults, setScrollToResults] =
    useState(false);

  const canAnalyze = Boolean(
    fileA && fileB && !loading
  );

  // =====================================
  // FILE UPDATES
  // =====================================

  function changeA(file: File | null) {
    setFileA(file);

    // Results belong to the previous pair.
    setResult(null);
    setError(null);
    setScrollToResults(false);
  }

  function changeB(file: File | null) {
    setFileB(file);

    setResult(null);
    setError(null);
    setScrollToResults(false);
  }

  // =====================================
  // AUTOMATIC RESULTS NAVIGATION
  // =====================================

  useEffect(() => {
    if (
      !scrollToResults ||
      !result ||
      !discoveriesRef.current
    ) {
      return;
    }

    const section = discoveriesRef.current;

    const prefersReducedMotion =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

    const frame = window.requestAnimationFrame(
      () => {
        section.scrollIntoView({
          behavior: prefersReducedMotion
            ? "instant"
            : "smooth",
          block: "start",
        });

        setScrollToResults(false);
      }
    );

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [result, scrollToResults]);

  // =====================================
  // BACKEND COMPARISON
  // =====================================

  async function analyze() {
    if (!fileA || !fileB || loading) {
      return;
    }

    setError(null);
    setResult(null);
    setScrollToResults(false);

    // -------------------------------------
    // VALIDATION
    // -------------------------------------

    for (const file of [fileA, fileB]) {
      if (
        !file.name.toLowerCase().endsWith(".wav")
      ) {
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

    // -------------------------------------
    // BUILD MULTIPART REQUEST
    // -------------------------------------

    const form = new FormData();

    form.append("file_a", fileA);
    form.append("file_b", fileB);

    setLoading(true);

    try {
      const response = await fetch(
        "/api/compare",
        {
          method: "POST",
          body: form,
        }
      );

      const data: unknown =
        await response.json();

      if (!response.ok) {
        let message =
          "Analysis failed. Please check the recordings.";

        if (
          typeof data === "object" &&
          data !== null &&
          "detail" in data &&
          typeof data.detail === "string"
        ) {
          message = data.detail;
        }

        throw new Error(message);
      }

      // API response follows the existing
      // FastAPI comparison contract.
      const comparison =
        data as BackendComparisonResponse;

      if (
        comparison.status !== "success" ||
        !comparison.result ||
        !comparison.filenames
      ) {
        throw new Error(
          "The acoustic engine returned an unexpected response."
        );
      }

      setResult(comparison);
      setScrollToResults(true);
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

  // =====================================
  // RENDER
  // =====================================

  return (
    <main className={styles.page}>
      {/* =====================================
          AMBIENT BACKGROUND
      ===================================== */}

      <div
        className={styles.ambient}
        aria-hidden="true"
      />

      <div className={styles.container}>
        {/* =====================================
            HEADER
        ===================================== */}

        <header className={styles.header}>
          <div className={styles.brand}>
            ÉCLAT<span>.</span>
          </div>

          <div className={styles.headerRight}>
            <span
              className={styles.statusDot}
              aria-hidden="true"
            />

            ACOUSTIC LAB / V0.4
          </div>
        </header>

        {/* =====================================
            HERO
        ===================================== */}

        <section className={styles.hero}>
          <p className={styles.eyebrow}>
            THE ART &amp; SCIENCE OF LISTENING
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

        {/* =====================================
            EXPERIMENT WORKSPACE
        ===================================== */}

        <section className={styles.workspace}>
          <div className={styles.sectionHeading}>
            <span>
              01 / THE EXPERIMENT
            </span>

            <span>
              WAV ONLY · MAX 30 SEC
            </span>
          </div>

          {/* TWO AUDIO UPLOADS */}

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
              "Analyzing your recordings…"
            ) : (
              <>
                Reveal the differences
                <span aria-hidden="true">
                  ↗
                </span>
              </>
            )}
          </button>

          {/* PRIVACY INFORMATION */}

          <p className={styles.privacyNote}>
            Your recordings are processed for this
            comparison. No audio is deliberately
            saved by our application.
          </p>

          {/* LOADING STATE */}

          {loading && (
            <div
              className={styles.loading}
              role="status"
            >
              <span
                className={styles.spinner}
                aria-hidden="true"
              />

              Extracting acoustic fingerprints
              and comparing features…
            </div>
          )}

          {/* ERROR STATE */}

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

        {/* =====================================
            DISCOVERIES WORKSPACE
        ===================================== */}

        {result && fileA && fileB && (
          <section
            ref={discoveriesRef}
            id="discoveries"
            className={styles.results}
            aria-label="Acoustic analysis results"
          >
            <div className={styles.sectionHeading}>
              <span>
                02 / YOUR ACOUSTIC REPORT
              </span>

              <span>
                ANALYSIS COMPLETE
              </span>
            </div>

            {/* ALL ANALYSIS IS NOW INSIDE TABS */}

            <SpectrumComparison
              fileA={fileA}
              fileB={fileB} backendReport={result}
            />
          </section>
        )}

        {/* =====================================
            FOOTER
        ===================================== */}

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
