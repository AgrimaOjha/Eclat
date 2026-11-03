
"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent, KeyboardEvent } from "react";
import styles from "./page.module.css";

const BAR_COUNT = 45;

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

function extractPeaks(buffer: AudioBuffer): number[] {
  const channels = Array.from(
    { length: buffer.numberOfChannels },
    (_, i) => buffer.getChannelData(i)
  );

  const samplesPerBar = Math.ceil(
    buffer.length / BAR_COUNT
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

  return peaks.map((peak) =>
    maxPeak === 0 ? 0 : peak / maxPeak
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;

  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

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

  const [duration, setDuration] = useState(0);

  const [decodeError, setDecodeError] =
    useState<File | null>(null);

  useEffect(() => {
    if (!file) {
      return;
    }

    
    let cancelled = false;
    const url = URL.createObjectURL(file);
    const audioElement = audioRef.current;


    async function prepareAudio() {
      let context: AudioContext | null = null;

      try {
        context = new AudioContext();

        const bytes = await file!.arrayBuffer();
        const decoded =
          await context.decodeAudioData(bytes);

        const peaks = extractPeaks(decoded);

        if (!cancelled) {
          setWaveform({ file: file!, peaks });
        }
      } catch {
        if (!cancelled) {
          setDecodeError(file);
        }
      } finally {
        if (context) {
          await context.close().catch(() => {});
        }
      }
    }

    // Update the source after the effect setup.
    queueMicrotask(() => {
      if (!cancelled) {
        setSource({ file, url });
      }
    });

    void prepareAudio();

    
    return () => {
        cancelled = true;
        audioElement?.pause();
        URL.revokeObjectURL(url);
    };

  }, [file]);

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

  const validDuration =
    Number.isFinite(duration) && duration > 0
      ? duration
      : 0;

  const progress =
    validDuration > 0
      ? Math.min(
          1,
          Math.max(0, currentTime / validDuration)
        )
      : 0;

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

  function handleWaveformKey(
    event: KeyboardEvent<HTMLButtonElement>
  ) {
    if (!file) {
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      seekTo(
        (currentTime + 1) / (validDuration || 1)
      );
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      seekTo(
        (currentTime - 1) / (validDuration || 1)
      );
    }
  }

  return (
    <>
      <button
        type="button"
        className={`${styles.waveArt} ${styles.seekableWaveform}`}
        onClick={handleWaveformClick}
        onKeyDown={handleWaveformKey}
        disabled={!audioUrl || validDuration === 0}
        aria-label={
          file
            ? `Seek within ${file.name}`
            : "No recording selected"
        }
        title={
          file
            ? "Click to jump to a moment in the audio"
            : "Choose a recording first"
        }
      >
        {Array.from(
          { length: BAR_COUNT },
          (_, i) => {
            const fallback =
              12 +
              Math.abs(
                Math.sin(i * 0.57) *
                  Math.cos(i * 0.13)
              ) * 65;

            const height = peaks
              ? 4 + peaks[i] * 76
              : fallback;

            const played =
              i / BAR_COUNT <= progress;

            return (
              <span
                key={i}
                aria-hidden="true"
                style={{
                  height: `${Math.round(height)}%`,
                  opacity: played ? 1 : 0.42,
                }}
              />
            );
          }
        )}

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

      {file && audioUrl && (
        <div className={styles.waveformPlayback}>
          <audio
            ref={audioRef}
            controls
            preload="metadata"
            src={audioUrl}
            className={styles.audioPlayer}
            onLoadedMetadata={(event) => {
              const audio = event.currentTarget;

              setDuration(audio.duration);
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
            onEnded={() => {
              setPosition({
                file,
                seconds: validDuration,
              });
            }}
          />

          <div className={styles.waveformTime}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(validDuration)}</span>
          </div>
        </div>
      )}

      {file && decodeError === file && (
        <p className={styles.waveformError}>
          Waveform preview unavailable for this recording.
        </p>
      )}
    </>
  );
}
