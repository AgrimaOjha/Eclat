
import styles from "./page.module.css";

// =====================================
// TYPES
// =====================================

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

export type BackendComparisonResponse = {
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

// =====================================
// METRIC CONFIGURATION
// =====================================

const metrics = [
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
] as const;

// =====================================
// HELPERS
// =====================================

function formatNumber(
  value: number,
  decimals = 4
): string {
  return Number.isFinite(value)
    ? value.toFixed(decimals)
    : "N/A";
}

function getBarWidth(
  value: number,
  maximum: number
): string {
  if (
    !Number.isFinite(value) ||
    !Number.isFinite(maximum) ||
    maximum <= 0
  ) {
    return "0%";
  }

  const percentage = Math.min(
    100,
    Math.max(0, (Math.abs(value) / maximum) * 100)
  );

  return `${percentage}%`;
}

// =====================================
// BACKEND ACOUSTIC REPORT
// =====================================

export default function BackendAcousticReport({
  report,
}: {
  report: BackendComparisonResponse;
}) {
  const comparison = report.result.comparison;

  const rmsDifference =
    comparison.additional_metrics.rms_difference_db;

  const centroidDifference =
    comparison.additional_metrics
      .centroid_difference_octaves;

  return (
    <section
      className={styles.backendReport}
      aria-label="Python acoustic fingerprint"
    >
      {/* =====================================
          REPORT HEADING
      ===================================== */}

      <div className={styles.backendReportHeading}>
        <div>
          <span className={styles.discoveryEyebrow}>
            THE PYTHON ENGINE
          </span>

          <h4>Under the surface.</h4>
        </div>

        <p>
          Acoustic measurements extracted by
          the FastAPI signal-processing engine.
        </p>
      </div>

      {/* =====================================
          TRACK SUMMARY
      ===================================== */}

      <div className={styles.summaryGrid}>
        <div>
          <span>TRACK A</span>

          <strong title={report.filenames.track_a}>
            {report.filenames.track_a}
          </strong>

          <small>
            {formatNumber(
              report.result.track_a.duration_seconds,
              2
            )}
            {" s · "}
            {report.result.track_a.sample_rate.toLocaleString()}
            {" Hz"}
          </small>
        </div>

        <div>
          <span>TRACK B</span>

          <strong title={report.filenames.track_b}>
            {report.filenames.track_b}
          </strong>

          <small>
            {formatNumber(
              report.result.track_b.duration_seconds,
              2
            )}
            {" s · "}
            {report.result.track_b.sample_rate.toLocaleString()}
            {" Hz"}
          </small>
        </div>
      </div>

      {/* =====================================
          ACOUSTIC FEATURE COMPARISON
      ===================================== */}

      <div className={styles.metricList}>
        {metrics.map((metric) => {
          const value =
            comparison.features[metric.key];

          if (!value) {
            return null;
          }

          const maximum = Math.max(
            Math.abs(value.track_a),
            Math.abs(value.track_b),
            0.000001
          );

          return (
            <div
              className={styles.metric}
              key={metric.key}
            >
              <div className={styles.metricHeader}>
                <h3>{metric.label}</h3>

                <span>
                  Normalized difference:{" "}
                  {formatNumber(
                    value.normalized_difference,
                    3
                  )}
                </span>
              </div>

              {/* TRACK A */}

              <div className={styles.barRow}>
                <span>A</span>

                <div className={styles.barTrack}>
                  <div
                    className={styles.barA}
                    style={{
                      width: getBarWidth(
                        value.track_a,
                        maximum
                      ),
                    }}
                  />
                </div>

                <strong>
                  {formatNumber(value.track_a)}
                  {metric.unit
                    ? ` ${metric.unit}`
                    : ""}
                </strong>
              </div>

              {/* TRACK B */}

              <div className={styles.barRow}>
                <span>B</span>

                <div className={styles.barTrack}>
                  <div
                    className={styles.barB}
                    style={{
                      width: getBarWidth(
                        value.track_b,
                        maximum
                      ),
                    }}
                  />
                </div>

                <strong>
                  {formatNumber(value.track_b)}
                  {metric.unit
                    ? ` ${metric.unit}`
                    : ""}
                </strong>
              </div>
            </div>
          );
        })}
      </div>

      {/* =====================================
          ADDITIONAL BACKEND METRICS
      ===================================== */}

      <div className={styles.extraMetrics}>
        <div>
          <span>
            RMS level difference
          </span>

          <strong>
            {rmsDifference === null
              ? "Undefined"
              : `${formatNumber(
                  rmsDifference,
                  3
                )} dB`}
          </strong>
        </div>

        <div>
          <span>
            Spectral centroid difference
          </span>

          <strong>
            {centroidDifference === null
              ? "Undefined"
              : `${formatNumber(
                  centroidDifference,
                  3
                )} octaves`}
          </strong>
        </div>
      </div>

      {/* =====================================
          TECHNICAL NOTE
      ===================================== */}

      <p className={styles.backendReportNote}>
        These metrics describe measurable
        properties of audio signals. They do
        not establish emotional similarity,
        perceived sound quality, or whether
        two recordings contain the same song.
      </p>
    </section>
  );
}
