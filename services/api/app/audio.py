
import io

import librosa
import numpy as np
import soundfile as sf


SAMPLE_RATE = 22050
MAX_DURATION_SECONDS = 30


def analyze_audio(audio_bytes: bytes) -> dict:
    """
    Convert a WAV recording into basic acoustic features.
    """

    # 1. Read the WAV file from memory.
    audio, original_sr = sf.read(
        io.BytesIO(audio_bytes),
        dtype="float32",
        always_2d=True,
    )

    if len(audio) == 0:
        raise ValueError("The audio file is empty.")

    duration = len(audio) / original_sr

    if duration > MAX_DURATION_SECONDS:
        raise ValueError("Audio must be 30 seconds or shorter.")

    # 2. Convert stereo/multichannel audio to mono.
    y = np.mean(audio, axis=1)

    # 3. Resample audio to our standard rate.
    if original_sr != SAMPLE_RATE:
        y = librosa.resample(
            y,
            orig_sr=original_sr,
            target_sr=SAMPLE_RATE,
        )

    # 4. Compute RMS energy.
    rms = librosa.feature.rms(y=y)[0]
    mean_rms = float(np.mean(rms))

    # 5. Compute spectral centroid.
    centroid = librosa.feature.spectral_centroid(
        y=y,
        sr=SAMPLE_RATE,
    )[0]

    mean_centroid = float(np.mean(centroid))

    # 6. Compute zero-crossing rate.
    zcr = librosa.feature.zero_crossing_rate(y=y)[0]
    mean_zcr = float(np.mean(zcr))

    # 7. Return a structured acoustic fingerprint.
    return {
        "duration_seconds": round(duration, 3),
        "sample_rate": SAMPLE_RATE,
        "rms_energy": round(mean_rms, 6),
        "spectral_centroid_hz": round(mean_centroid, 2),
        "zero_crossing_rate": round(mean_zcr, 6),
    }
