
import io

import numpy as np
import soundfile as sf

from app.audio import analyze_audio


SAMPLE_RATE = 22050


def make_wav(frequency, duration=3.0, amplitude=0.5):
    t = np.arange(
        int(SAMPLE_RATE * duration)
    ) / SAMPLE_RATE

    y = amplitude * np.sin(2 * np.pi * frequency * t)

    buffer = io.BytesIO()
    sf.write(buffer, y, SAMPLE_RATE, format="WAV")

    return buffer.getvalue()


def test_silence():
    y = np.zeros(SAMPLE_RATE, dtype=np.float32)

    buffer = io.BytesIO()
    sf.write(buffer, y, SAMPLE_RATE, format="WAV")

    result = analyze_audio(buffer.getvalue())

    assert result["rms_energy"] == 0
    assert result["spectral_centroid_hz"] == 0


def test_higher_frequency_has_higher_centroid():
    low = analyze_audio(make_wav(440))
    high = analyze_audio(make_wav(880))

    assert (
        high["spectral_centroid_hz"]
        > low["spectral_centroid_hz"]
    )


def test_equal_amplitudes_have_similar_rms():
    low = analyze_audio(make_wav(440))
    high = analyze_audio(make_wav(880))

    assert abs(
        low["rms_energy"] - high["rms_energy"]
    ) < 0.01


def test_duration_is_correct():
    result = analyze_audio(make_wav(440, duration=3))

    assert result["duration_seconds"] == 3.0
