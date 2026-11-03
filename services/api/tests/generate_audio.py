
import numpy as np
import soundfile as sf
from pathlib import Path


SAMPLE_RATE = 22050
DURATION = 3

# Three seconds of sample timestamps.
t = np.arange(
    SAMPLE_RATE * DURATION
) / SAMPLE_RATE


def create_sine_wave(frequency, filename):
    amplitude = 0.5

    audio = amplitude * np.sin(
        2 * np.pi * frequency * t
    )

    output_dir = Path("tests/generated")
    output_dir.mkdir(parents=True, exist_ok=True)

    output_path = output_dir / filename

    sf.write(
        output_path,
        audio,
        SAMPLE_RATE,
    )

    print(f"Created: {output_path}")


create_sine_wave(440, "tone_440.wav")
create_sine_wave(880, "tone_880.wav")

# Silent recording.
silence = np.zeros_like(t)

sf.write(
    "tests/generated/silence.wav",
    silence,
    SAMPLE_RATE,
)

print("Created: tests/generated/silence.wav")
