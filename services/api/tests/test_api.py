
import io

import numpy as np
import soundfile as sf

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)

SAMPLE_RATE = 22050


def make_wav(
    frequency=440,
    duration=3.0,
    amplitude=0.5,
):
    """
    Generate a WAV file in memory.
    """

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


def upload_pair(audio_a, audio_b):
    """
    Upload two WAV files to the comparison API.
    """

    return client.post(
        "/compare",
        files={
            "file_a": (
                "track_a.wav",
                audio_a,
                "audio/wav",
            ),
            "file_b": (
                "track_b.wav",
                audio_b,
                "audio/wav",
            ),
        },
    )


def test_health_endpoint():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_successful_comparison():
    response = upload_pair(
        make_wav(440),
        make_wav(880),
    )

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "success"
    assert "result" in data
    assert "track_a" in data["result"]
    assert "track_b" in data["result"]
    assert "comparison" in data["result"]


def test_higher_frequency_comparison():
    response = upload_pair(
        make_wav(440),
        make_wav(880),
    )

    assert response.status_code == 200

    result = response.json()["result"]

    centroid_a = result["track_a"][
        "spectral_centroid_hz"
    ]
    centroid_b = result["track_b"][
        "spectral_centroid_hz"
    ]

    assert centroid_b > centroid_a


def test_identical_audio():
    audio = make_wav(440)

    response = upload_pair(audio, audio)

    assert response.status_code == 200

    features = response.json()["result"][
        "comparison"
    ]["features"]

    for feature in features.values():
        assert feature["normalized_difference"] == 0


def test_invalid_extension():
    response = client.post(
        "/compare",
        files={
            "file_a": (
                "track_a.txt",
                b"not audio",
                "text/plain",
            ),
            "file_b": (
                "track_b.wav",
                make_wav(880),
                "audio/wav",
            ),
        },
    )

    assert response.status_code == 400


def test_corrupt_wav_file():
    response = upload_pair(
        b"not a real WAV recording",
        make_wav(880),
    )

    assert response.status_code == 400


def test_missing_second_file():
    response = client.post(
        "/compare",
        files={
            "file_a": (
                "track_a.wav",
                make_wav(440),
                "audio/wav",
            ),
        },
    )

    assert response.status_code == 422


def test_audio_duration_limit():
    response = upload_pair(
        make_wav(440, duration=31),
        make_wav(880),
    )

    assert response.status_code == 400


def test_file_size_limit():
    # A deliberately oversized upload.
    oversized = (
        b"RIFF"
        + b"\x00" * 4
        + b"WAVE"
        + b"\x00" * (10 * 1024 * 1024)
    )

    response = upload_pair(
        oversized,
        make_wav(880),
    )

    assert response.status_code == 413
