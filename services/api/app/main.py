
from fastapi import FastAPI, File, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from app.audio import analyze_audio


app = FastAPI(
    title="ÉCLAT API",
    description="Explainable Music Intelligence Platform",
    version="0.1.0",
)

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


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    # WAV only in this first version.
    if not file.filename or not file.filename.lower().endswith(".wav"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a WAV file.",
        )

    # Read at most 10 MiB + 1 byte.
    data = await file.read(MAX_UPLOAD_BYTES + 1)
    await file.close()

    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail="File is too large. Maximum size is 10 MiB.",
        )

    try:
        # Audio processing is CPU-bound.
        result = await run_in_threadpool(analyze_audio, data)

        return {
            "filename": file.filename,
            "features": result,
        }

    except Exception as exc:
        if isinstance(exc, ValueError):
            raise HTTPException(
                status_code=400,
                detail=str(exc),
            ) from exc

        # For this local prototype, report invalid audio.
        # Unexpected failures should be logged separately in V1.
        raise HTTPException(
            status_code=400,
            detail="Unable to decode or analyze this WAV file.",
        ) from exc
