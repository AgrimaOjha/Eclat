
from pathlib import Path

from app.comparison import compare_audio


sample_dir = Path("tests/generated")

audio_a = (
    sample_dir / "tone_440.wav"
).read_bytes()

audio_b = (
    sample_dir / "tone_880.wav"
).read_bytes()

result = compare_audio(audio_a, audio_b)

print("\nÉCLAT — Acoustic Comparison\n")

for feature, values in result["comparison"]["features"].items():
    print(f"{feature}:")
    print(f"  Track A: {values['track_a']}")
    print(f"  Track B: {values['track_b']}")
    print(
        "  Normalized difference:",
        values["normalized_difference"],
    )
    print()
    
print(
    "Additional metrics:",
    result["comparison"]["additional_metrics"],
)
