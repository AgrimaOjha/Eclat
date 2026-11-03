
import { NextRequest, NextResponse } from "next/server";


const MAX_BYTES = 10 * 1024 * 1024;

function validFile(value: FormDataEntryValue | null): value is File {
  return (
    value instanceof File &&
    value.name.toLowerCase().endsWith(".wav") &&
    value.size > 0 &&
    value.size <= MAX_BYTES
  );
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();

    const fileA = form.get("file_a");
    const fileB = form.get("file_b");

    if (!validFile(fileA) || !validFile(fileB)) {
      return NextResponse.json(
        { detail: "Choose two non-empty WAV files, each under 10 MiB." },
        { status: 400 }
      );
    }

    const body = new FormData();
    body.append("file_a", fileA, fileA.name);
    body.append("file_b", fileB, fileB.name);

    const backend =
      process.env.ECLAT_API_URL ?? "http://127.0.0.1:8000";

    const response = await fetch(`${backend}/compare`, {
      method: "POST",
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(90_000),
    });

    const result = await response.json();

    return NextResponse.json(result, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error && error.name === "TimeoutError"
        ? "Audio analysis timed out. Try shorter recordings."
        : "Unable to connect to the audio analysis service.";

    return NextResponse.json(
      { detail: message },
      { status: 502 }
    );
  }
}
