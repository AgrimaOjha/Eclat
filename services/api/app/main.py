
import logging

import soundfile as sf

from fastapi import (
    FastAPI,
    File,
    HTTPException,
    UploadFile,
)
from starlette.concurrency import run_in_threadpool

from app.audio import analyze_audio
from app.comparison import compare_audio


app = FastAPI(
    title="ÉCLAT API",
    description="Explainable Music Intelligence Platform",
    version="0.2.0",
)

logger = logging.getLogger(__name__)

MAX_UPLOAD_BYTES = 10 * 1024 * 1024


@app.get("/")
def root():
    return {
        "message": "Welcome to ÉCLAT",
        "engine": "SYNAPSE",
        "status": "running",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "eclat-api",
    }


async def validate_audio_file(file: UploadFile) -> bytes:
    """
    Validate and read an uploaded WAV file.

    Returns the file contents as bytes.
    """

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="A filename is required.",
        )

    if not file.filename.lower().endswith(".wav"):
        raise HTTPException(
            status_code=400,
            detail="Only WAV files are supported.",
        )

    # Read one byte beyond the limit so oversized
    # uploads can be detected without reading
    # the entire file into memory.
    data = await file.read(MAX_UPLOAD_BYTES + 1)

    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Maximum file size is 10 MiB.",
        )

    if len(data) == 0:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty.",
        )

    # Basic WAV container signature.
    if (
        len(data) < 12
        or data[:4] != b"RIFF"
        or data[8:12] != b"WAVE"
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid WAV file.",
        )

    return data


def run_audio_analysis(data: bytes) -> dict:
    """
    Run the existing single-track analysis.
    """
    return analyze_audio(data)


def run_audio_comparison(
    audio_a: bytes,
    audio_b: bytes,
) -> dict:
    """
    Run the existing two-track comparison.
    """
    return compare_audio(audio_a, audio_b)


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    try:
        data = await validate_audio_file(file)

        result = await run_in_threadpool(
            run_audio_analysis,
            data,
        )

        return {
            "filename": file.filename,
            "features": result,
        }

    except HTTPException:
        raise

    except (ValueError, sf.LibsndfileError) as exc:
        raise HTTPException(
            status_code=400,
            detail="Invalid audio: " + str(exc),
        ) from exc

    except Exception as exc:
        logger.exception("Audio analysis failed")

        raise HTTPException(
            status_code=500,
            detail="Audio analysis failed.",
        ) from exc

    finally:
        await file.close()


@app.post("/compare")
async def compare(
    file_a: UploadFile = File(...),
    file_b: UploadFile = File(...),
):
    """
    Receive two WAV recordings and return
    their acoustic comparison.
    """

    try:
        # Validate both recordings.
        audio_a = await validate_audio_file(file_a)
        audio_b = await validate_audio_file(file_b)

        # Run the comparison outside the event loop.
        result = await run_in_threadpool(
            run_audio_comparison,
            audio_a,
            audio_b,
        )

        return {
            "status": "success",
            "filenames": {
                "track_a": file_a.filename,
                "track_b": file_b.filename,
            },
            "result": result,
        }

    except HTTPException:
        raise

    except (ValueError, sf.LibsndfileError) as exc:
        raise HTTPException(
            status_code=400,
            detail="Invalid audio: " + str(exc),
        ) from exc

    except Exception as exc:
        logger.exception("Audio comparison failed")

        raise HTTPException(
            status_code=500,
            detail="Audio comparison failed.",
        ) from exc

    finally:
        await file_a.close()
        await file_b.close()
