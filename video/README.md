# Mitti demo film — build pipeline

Renders `mockup/demo/mitti-demo.mp4`, a ~75s narrated walkthrough of the Mitti
storefront, **fully offline**. No browser, no screen recorder, no cloud APIs.

```
video/
  kit.js       design tokens, easing, SVG primitives, vessel placement, cursor
  scenes.js    the 8 scenes (title → glazes → shop → product → cart → checkout → done → close)
  build.js     synth voiceover → render frames → assemble audio → encode MP4
```

## How it works
1. **Voiceover** — each scene's narration is synthesized with [Piper](https://github.com/rhasspy/piper)
   (`en-gb-southern_english_female`), then pitch-shifted ~8% down and warmed
   (compressor + gentle echo + low-pass) with ffmpeg for a sultry read.
2. **Timeline** — each scene's length is stretched to fit its narration.
3. **Frames** — every frame is an animated SVG (shared `mockup/lib` art) rasterized
   to PNG by `sharp` at 1920×1080 / 30 fps.
4. **Audio** — timed voice track is mixed under a soft ambient pad.
5. **Encode** — H.264 / yuv420p via the static ffmpeg from `imageio-ffmpeg`, AAC audio.

## Rebuild
Requires (already fetched into `.voiceover/`, which is git-ignored):
```bash
pip install piper-tts imageio-ffmpeg
npm i sharp
# Piper voice: github.com/rhasspy/piper releases → en-gb-southern_english_female-low
node video/build.js
```
Output: `mockup/demo/mitti-demo.mp4` plus per-scene stills in `mockup/demo/frames/`.

## Narration script
The voiceover lines live in `scenes.js` (`vo:` on each scene) — edit there and
rebuild to change the script or voice.
