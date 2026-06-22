#!/usr/bin/env python3
"""Synthesize every scene line with Kokoro (natural offline neural TTS).
Usage: python3 kokoro_tts.py lines.json out_dir
lines.json: {"0": "text", "1": "text", ...}  ->  out_dir/raw_0.wav ...
"""
import sys, json, os, warnings
warnings.filterwarnings("ignore")

VOICE = "af_bella"   # warm, natural female
SPEED = 0.93         # slightly relaxed for an unhurried, sultry read
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
MODEL = os.path.join(ROOT, ".voiceover", "kokoro", "kokoro-v1.0.onnx")
VOICES = os.path.join(ROOT, ".voiceover", "kokoro", "voices-v1.0.bin")

def main():
    lines_path, out_dir = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    lines = json.load(open(lines_path))
    from kokoro_onnx import Kokoro
    import soundfile as sf
    k = Kokoro(MODEL, VOICES)
    for idx, text in lines.items():
        samples, sr = k.create(text, voice=VOICE, speed=SPEED, lang="en-us")
        sf.write(os.path.join(out_dir, f"raw_{idx}.wav"), samples, sr)
        print(f"  · kokoro scene {idx}: {len(samples)/sr:.2f}s")

if __name__ == "__main__":
    main()
