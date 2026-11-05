
"use client";

import { useEffect, useState } from "react";
import { calculateSpectrum } from "./FrequencySpectrum";
import styles from "./page.module.css";

type Spectrum = ReturnType<typeof calculateSpectrum>;

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

const BAR_COUNT = 56;

function comparePeaks(a: number, b: number) {
  const valid = a > 0 && b > 0;

  return {
    differenceHz: Math.abs(a - b),
    ratio: valid ? Math.max(a, b) / Math.min(a, b) : null,
    octaves: valid ? Math.log2(b / a) : null,
  };
}

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

  useEffect(() => {
    let cancelled = false;

    async function analyzeBoth() {
      const contexts: AudioContext[] = [];

      async function analyzeFile(file: File) {
        const context = new AudioContext();
        contexts.push(context);

        const bytes = await file.arrayBuffer();
        const decoded =
          await context.decodeAudioData(bytes);

        return calculateSpectrum(decoded);
      }

      try {
        const [trackA, trackB] = await Promise.all([
          analyzeFile(fileA),
          analyzeFile(fileB),
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
          setError({ fileA, fileB });
        }
      } finally {
        await Promise.all(
          contexts.map((context) =>
            context.close().catch(() => {})
          )
        );
      }
    }

    void analyzeBoth();

    return () => {
      cancelled = true;
    };
  }, [fileA, fileB]);

  const currentData =
    data?.fileA === fileA &&
    data?.fileB === fileB
      ? data
      : null;

  const currentError =
    error?.fileA === fileA &&
    error?.fileB === fileB;

  const differences = currentData
    ? Array.from({ length: BAR_COUNT }, (_, i) => {
        const a = currentData.trackA.bars[i] ?? 0;
        const b = currentData.trackB.bars[i] ?? 0;
        return Math.abs(a - b);
      })
    : [];

  const peakComparison = currentData
    ? comparePeaks(
        currentData.trackA.peakHz,
        currentData.trackB.peakHz
      )
    : null;

  const strongestDifference = differences.length
    ? Math.max(...differences)
    : 0;

  return (
    <section
      className={styles.compareSpectrumSection}
      aria-label="Combined frequency spectrum"
    >
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

      <div className={styles.compareSpectrumLegend}>
        <div className={styles.compareLegendItem}>
          <span
            className={styles.compareLegendA}
            aria-hidden="true"
          />
          <span>TRACK A · {fileA.name}</span>
        </div>

        <div className={styles.compareLegendItem}>
          <span
            className={styles.compareLegendB}
            aria-hidden="true"
          />
          <span>TRACK B · {fileB.name}</span>
        </div>
      </div>

      {currentError ? (
        <p role="alert" className={styles.spectrumError}>
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
          {/* SHARED SPECTRUM */}
          <div
            className={styles.compareSpectrumChart}
            role="img"
            aria-label={`Shared frequency spectrum.
              Track A peak ${currentData.trackA.peakHz.toFixed(1)}
              hertz, Track B peak
              ${currentData.trackB.peakHz.toFixed(1)} hertz.`}
          >
            {Array.from(
              { length: BAR_COUNT },
              (_, i) => {
                const a = currentData.trackA.bars[i] ?? 0;
                const b = currentData.trackB.bars[i] ?? 0;

                return (
                  <div
                    key={i}
                    className={styles.compareSpectrumBarGroup}
                    aria-hidden="true"
                  >
                    <span
                      className={styles.compareSpectrumBarA}
                      style={{
                        height: `${2 + Math.round(a * 98)}%`,
                      }}
                    />
                    <span
                      className={styles.compareSpectrumBarB}
                      style={{
                        height: `${2 + Math.round(b * 98)}%`,
                      }}
                    />
                  </div>
                );
              }
            )}
          </div>

          <div className={styles.compareSpectrumAxis}>
            <span>60 Hz</span>
            <span>~700 Hz</span>
            <span>8 kHz</span>
          </div>

          {/* PEAK FREQUENCIES */}
          <div className={styles.compareSpectrumStats}>
            <div>
              <span>TRACK A · STRONGEST PEAK</span>
              <strong>
                {currentData.trackA.peakHz.toFixed(1)} Hz
              </strong>
            </div>

            <div>
              <span>TRACK B · STRONGEST PEAK</span>
              <strong>
                {currentData.trackB.peakHz.toFixed(1)} Hz
              </strong>
            </div>
          </div>

          {/* NEW: SPECTRAL DIFFERENCE MAP */}
          <div className={styles.spectralDifference}>
            <div className={styles.spectralDifferenceHeading}>
              <h4>Spectral difference map</h4>
              <p>
                Where do the normalized frequency
                patterns differ?
              </p>
            </div>

            <div
              className={styles.spectralDifferenceChart}
              role="img"
              aria-label={
                "Absolute differences between the tracks' " +
                "independently normalized frequency magnitudes"
              }
            >
              {differences.map((difference, i) => {
                const normalized =
                  strongestDifference > 0
                    ? difference / strongestDifference
                    : 0;

                return (
                  <span
                    key={i}
                    style={{
                      height: `${
                        2 + Math.round(normalized * 98)
                      }%`,
                    }}
                  />
                );
              })}
            </div>

            <div className={styles.compareSpectrumAxis}>
              <span>60 Hz</span>
              <span>~700 Hz</span>
              <span>8 kHz</span>
            </div>
          </div>

          {/* NEW: DIFFERENCE METRICS */}
          <div className={styles.spectralInsights}>
            <div>
              <span>ABSOLUTE PEAK DIFFERENCE</span>
              <strong>
                {peakComparison!.differenceHz.toFixed(1)} Hz
              </strong>
            </div>

            <div>
              <span>STRONGEST PEAK FREQUENCY RATIO</span>
              <strong>
                {peakComparison!.ratio !== null
                  ? `${peakComparison!.ratio.toFixed(2)}×`
                  : "Undefined"}
              </strong>
            </div>

            <div>
              <span>DIRECTIONAL OCTAVE DIFFERENCE</span>
              <strong>
                {peakComparison!.octaves !== null
                  ? `${peakComparison!.octaves.toFixed(3)} oct`
                  : "Undefined"}
              </strong>
            </div>
          </div>

          <p className={styles.spectralInterpretation}>
            The difference map compares normalized
            spectral shapes. Taller bars indicate
            larger differences at those frequency
            regions, relative to the largest difference
            in this pair.
          </p>
        </>
      )}

      <p className={styles.compareSpectrumNote}>
        FFT magnitude · Logarithmic frequency axis ·
        Independent normalization per recording.
        These comparisons do not measure perceived
        similarity, absolute loudness, or musical pitch.
      </p>
    </section>
  );
}
