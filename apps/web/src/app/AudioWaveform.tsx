
"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent, KeyboardEvent } from "react";

import { getDecodedAudio } from "./lib/audioAnalysis";
import styles from "./page.module.css";

// =====================================
// CONFIGURATION
// =====================================

const BAR_COUNT = 45;

// =====================================
// TYPES
// =====================================

type WaveformData = {
  file: File;
  peaks: number[];
};

type AudioSource = {
  file: File;
  url: string;
};

type PlaybackPosition = {
  file: File;
  seconds: number;
};

type AudioDuration = {
  file: File;
  seconds: number;
};

// =====================================
// EXTRACT WAVEFORM PEAKS
// =====================================

function extractPeaks(buffer: AudioBuffer): number[] {
  const channels = Array.from(
    { length: buffer.numberOfChannels },
    (_, index) => buffer.getChannelData(index)
  );

  const samplesPerBar = Math.max(
    1,
    Math.ceil(buffer.length / BAR_COUNT)
  );

  const peaks = Array.from(
    { length: BAR_COUNT },
    (_, bar) => {
      const start = bar * samplesPerBar;
      const end = Math.min(
        start + samplesPerBar,
        buffer.length
      );

      let peak = 0;

      for (let i = start; i < end; i++) {
        for (const channel of channels) {
          peak = Math.max(
            peak,
            Math.abs(channel[i])
          );
        }
      }

      return peak;
    }
  );

  const maxPeak = Math.max(...peaks, 0);

  // Normalize each peak between 0 and 1.
  return peaks.map((peak) =>
    maxPeak === 0 ? 0 : peak / maxPeak
  );
}

// =====================================
// FORMAT PLAYBACK TIME
// =====================================

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;

  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

// =====================================
// AUDIO WAVEFORM COMPONENT
// =====================================

export default function AudioWaveform({
  file,
}: {
  file: File | null;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);

  const [waveform, setWaveform] =
    useState<WaveformData | null>(null);

  const [source, setSource] =
    useState<AudioSource | null>(null);

  const [position, setPosition] =
    useState<PlaybackPosition | null>(null);

  const [duration, setDuration] =
    useState<AudioDuration | null>(null);

  const [decodeError, setDecodeError] =
    useState<File | null>(null);

  // =====================================
  // LOAD AUDIO WHEN FILE CHANGES
  // =====================================

  useEffect(() => {
    if (!file) {
      return;
    }

    let cancelled = false;
    const selectedFile = file;

    // Create a local browser URL for playback.
    const url = URL.createObjectURL(selectedFile);

    // Capture the current element for cleanup.
    const audioElement = audioRef.current;

    async function prepareAudio() {
      try {
        // Both waveform and FFT reuse the
        // same decoded AudioBuffer.
        const decoded =
          await getDecodedAudio(selectedFile);

        const peaks = extractPeaks(decoded);

        if (!cancelled) {
          setWaveform({
            file: selectedFile,
            peaks,
          });

          // Clear errors after a successful decode.
          setDecodeError(null);
        }
      } catch {
        if (!cancelled) {
          setDecodeError(selectedFile);
        }
      }
    }

    // Avoid a synchronous state update in the effect.
    queueMicrotask(() => {
      if (!cancelled) {
        setSource({
          file: selectedFile,
          url,
        });
      }
    });

    void prepareAudio();

    return () => {
      cancelled = true;

      audioElement?.pause();

      // Release the temporary browser URL.
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // =====================================
  // CURRENT FILE DATA
  // =====================================

  const peaks =
    file && waveform?.file === file
      ? waveform.peaks
      : null;

  const audioUrl =
    file && source?.file === file
      ? source.url
      : null;

  const currentTime =
    file && position?.file === file
      ? position.seconds
      : 0;

  const durationSeconds =
    file && duration?.file === file
      ? duration.seconds
      : 0;

  const validDuration =
    Number.isFinite(durationSeconds) &&
    durationSeconds > 0
      ? durationSeconds
      : 0;

  const progress =
    validDuration > 0
      ? Math.min(
          1,
          Math.max(0, currentTime / validDuration)
        )
      : 0;

  // =====================================
  // SEEK TO A POSITION
  // =====================================

  function seekTo(fraction: number) {
    const audio = audioRef.current;

    if (
      !audio ||
      !file ||
      !Number.isFinite(audio.duration) ||
      audio.duration <= 0
    ) {
      return;
    }

    const clamped = Math.min(
      1,
      Math.max(0, fraction)
    );

    const nextTime = clamped * audio.duration;

    audio.currentTime = nextTime;

    setPosition({
      file,
      seconds: nextTime,
    });
  }

  // =====================================
  // CLICK TO SEEK
  // =====================================

  function handleWaveformClick(
    event: MouseEvent<HTMLButtonElement>
  ) {
    const rect =
      event.currentTarget.getBoundingClientRect();

    if (rect.width === 0) {
      return;
    }

    const fraction =
      (event.clientX - rect.left) / rect.width;

    seekTo(fraction);
  }

  // =====================================
  // KEYBOARD SEEKING
  // =====================================

  function handleWaveformKey(
    event: KeyboardEvent<HTMLButtonElement>
  ) {
    if (!file || validDuration === 0) {
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();

      seekTo(
        (currentTime + 1) / validDuration
      );
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();

      seekTo(
        (currentTime - 1) / validDuration
      );
    }
  }

  // =====================================
  // RENDER
  // =====================================

  return (
    <>
      {/* INTERACTIVE WAVEFORM */}
      <button
        type="button"
        className={`${styles.waveArt} ${styles.seekableWaveform}`}
        onClick={handleWaveformClick}
        onKeyDown={handleWaveformKey}
        disabled={!audioUrl || validDuration === 0}
        aria-label={
          file
            ? `Seek within ${file.name}, current position ${formatTime(
                currentTime
              )} of ${formatTime(validDuration)}`
            : "No recording selected"
        }
        title={
          file
            ? "Click or use arrow keys to seek within the recording"
            : "Choose a recording first"
        }
      >
        {Array.from(
          { length: BAR_COUNT },
          (_, index) => {
            // Decorative bars before uploading a file.
            const fallback =
              12 +
              Math.abs(
                Math.sin(index * 0.57) *
                  Math.cos(index * 0.13)
              ) * 65;

            // Real waveform amplitudes after decoding.
            const height = peaks
              ? 4 + peaks[index] * 76
              : fallback;

            const played =
              index / BAR_COUNT <= progress;

            return (
              <span
                key={index}
                aria-hidden="true"
                style={{
                  height: `${Math.round(height)}%`,
                  opacity: played ? 1 : 0.42,
                }}
              />
            );
          }
        )}

        {/* MOVING PLAYHEAD */}
        {file && audioUrl && (
          <i
            className={styles.waveformPlayhead}
            aria-hidden="true"
            style={{
              left: `${progress * 100}%`,
            }}
          />
        )}
      </button>

      {/* AUDIO PLAYER */}
      {file && audioUrl && (
        <div className={styles.waveformPlayback}>
          <audio
            ref={audioRef}
            key={audioUrl}
            controls
            preload="metadata"
            src={audioUrl}
            className={styles.audioPlayer}
            onLoadedMetadata={(event) => {
              const audio = event.currentTarget;

              setDuration({
                file,
                seconds: audio.duration,
              });

              setPosition({
                file,
                seconds: 0,
              });
            }}
            onTimeUpdate={(event) => {
              setPosition({
                file,
                seconds: event.currentTarget.currentTime,
              });
            }}
            onSeeked={(event) => {
              setPosition({
                file,
                seconds: event.currentTarget.currentTime,
              });
            }}
            onEnded={(event) => {
              setPosition({
                file,
                seconds: event.currentTarget.duration,
              });
            }}
          />

          {/* PLAYBACK TIMESTAMPS */}
          <div className={styles.waveformTime}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(validDuration)}</span>
          </div>
        </div>
      )}

      {/* DECODING ERROR */}
      {file && decodeError === file && (
        <p
          className={styles.waveformError}
          role="alert"
        >
          Waveform preview unavailable for this recording.
        </p>
      )}
    </>
  );
}
