
import io
import math

import numpy as np
import pytest
import soundfile as sf

from app.comparison import (
    compare_audio,
    compare_feature,
    compare_fingerprints,
)


SAMPLE_RATE = 22050


def make_wav(
    frequency=440,
    amplitude=0.5,
    duration=3.0,
):
    """Generate a synthetic WAV recording."""

    t = np.arange(
        int(SAMPLE_RATE * duration)
    ) / SAMPLE_RATE

    samples = amplitude * np.sin(
        2 * np.pi * frequency * t
    )

    buffer = io.BytesIO()

    sf.write(
        buffer,
        samples,
        SAMPLE_RATE,
        format="WAV",
    )

    return buffer.getvalue()


def test_identical_values():
    result = compare_feature(0.35, 0.35)

    assert result["absolute_difference"] == 0
    assert result["normalized_difference"] == 0
    assert result["signed_difference"] == 0


def test_normalized_difference():
    result = compare_feature(440, 880)

    assert result["absolute_difference"] == 440
    assert result["normalized_difference"] == 0.5
    assert result["signed_difference"] == 440


def test_zero_values():
    result = compare_feature(0, 0)

    assert result["normalized_difference"] == 0


def test_one_zero_value():
    result = compare_feature(0, 0.5)

    assert result["normalized_difference"] == 1.0


def test_invalid_values():
    for value in [
        float("nan"),
        float("inf"),
        -1,
    ]:
        with pytest.raises(ValueError):
            compare_feature(value, 1.0)


def test_comparison_symmetry():
    forward = compare_feature(440, 880)
    reverse = compare_feature(880, 440)

    assert (
        forward["absolute_difference"]
        == reverse["absolute_difference"]
    )

    assert (
        forward["normalized_difference"]
        == reverse["normalized_difference"]
    )

    assert (
        forward["signed_difference"]
        == -reverse["signed_difference"]
    )


def test_logarithmic_metrics():
    a = {
        "rms_energy": 0.2,
        "spectral_centroid_hz": 440,
        "zero_crossing_rate": 0.04,
    }

    b = {
        "rms_energy": 0.4,
        "spectral_centroid_hz": 880,
        "zero_crossing_rate": 0.08,
    }

    result = compare_fingerprints(a, b)
    metrics = result["additional_metrics"]

    assert metrics["rms_difference_db"] == pytest.approx(
        20 * math.log10(2),
        abs=0.001,
    )

    assert metrics["centroid_difference_octaves"] == 1.0


def test_silence_has_no_logarithmic_ratio():
    a = {
        "rms_energy": 0,
        "spectral_centroid_hz": 0,
        "zero_crossing_rate": 0,
    }

    b = {
        "rms_energy": 0.5,
        "spectral_centroid_hz": 880,
        "zero_crossing_rate": 0.08,
    }

    result = compare_fingerprints(a, b)

    assert (
        result["additional_metrics"]["rms_difference_db"]
        is None
    )

    assert (
        result["additional_metrics"][
            "centroid_difference_octaves"
        ]
        is None
    )


def test_real_audio_comparison():
    audio_a = make_wav(frequency=440)
    audio_b = make_wav(frequency=880)

    result = compare_audio(audio_a, audio_b)

    assert "track_a" in result
    assert "track_b" in result
    assert "comparison" in result

    centroid_a = result["track_a"][
        "spectral_centroid_hz"
    ]
    centroid_b = result["track_b"][
        "spectral_centroid_hz"
    ]

    assert centroid_b > centroid_a

    assert (
        result["comparison"]["features"][
            "spectral_centroid_hz"
        ]["signed_difference"]
        > 0
    )
