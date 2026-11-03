
"""
ÉCLAT — Acoustic Comparison Engine

Compares two audio recordings using measurable features.

This module does NOT estimate perceptual or emotional
similarity. It reports interpretable feature differences.
"""

import math

from app.audio import analyze_audio


FEATURE_NAMES = (
    "rms_energy",
    "spectral_centroid_hz",
    "zero_crossing_rate",
)


def compare_feature(a: float, b: float) -> dict:
    """
    Compare two nonnegative feature values.

    The signed difference is B - A.
    The normalized difference is between 0 and 1.
    """

    a = float(a)
    b = float(b)

    if not (math.isfinite(a) and math.isfinite(b)):
        raise ValueError("Feature values must be finite.")

    if a < 0 or b < 0:
        raise ValueError("Feature values must be nonnegative.")

    signed_difference = b - a
    absolute_difference = abs(signed_difference)

    denominator = max(a, b)

    if denominator == 0:
        normalized_difference = 0.0
    else:
        normalized_difference = (
            absolute_difference / denominator
        )

    return {
        "track_a": a,
        "track_b": b,
        "signed_difference": round(signed_difference, 6),
        "absolute_difference": round(
            absolute_difference, 6
        ),
        "normalized_difference": round(
            normalized_difference, 6
        ),
    }


def compare_fingerprints(
    fingerprint_a: dict,
    fingerprint_b: dict,
) -> dict:
    """
    Compare two already extracted acoustic fingerprints.
    """

    features = {}

    for name in FEATURE_NAMES:
        features[name] = compare_feature(
            fingerprint_a[name],
            fingerprint_b[name],
        )

    # RMS level difference in decibels.
    rms_a = float(fingerprint_a["rms_energy"])
    rms_b = float(fingerprint_b["rms_energy"])

    if rms_a > 0 and rms_b > 0:
        rms_difference_db = round(
            20 * math.log10(rms_b / rms_a), 3
        )
    else:
        rms_difference_db = None

    # Spectral centroid ratio expressed in octaves.
    centroid_a = float(
        fingerprint_a["spectral_centroid_hz"]
    )
    centroid_b = float(
        fingerprint_b["spectral_centroid_hz"]
    )

    if centroid_a > 0 and centroid_b > 0:
        centroid_difference_octaves = round(
            math.log2(centroid_b / centroid_a), 3
        )
    else:
        centroid_difference_octaves = None

    return {
        "features": features,
        "additional_metrics": {
            "rms_difference_db": rms_difference_db,
            "centroid_difference_octaves": (
                centroid_difference_octaves
            ),
        },
        "interpretation_notes": {
            "normalized_difference": (
                "Pair-relative difference from 0 to 1; "
                "not a perceptual similarity score."
            ),
            "signed_difference": (
                "Positive means Track B is higher; "
                "negative means Track A is higher."
            ),
            "null_metrics": (
                "Logarithmic ratios are undefined "
                "when either value is zero."
            ),
        },
    }


def compare_audio(
    audio_a: bytes,
    audio_b: bytes,
) -> dict:
    """
    Analyze and compare two WAV recordings.
    """

    fingerprint_a = analyze_audio(audio_a)
    fingerprint_b = analyze_audio(audio_b)

    comparison = compare_fingerprints(
        fingerprint_a,
        fingerprint_b,
    )

    return {
        "track_a": fingerprint_a,
        "track_b": fingerprint_b,
        "comparison": comparison,
    }
