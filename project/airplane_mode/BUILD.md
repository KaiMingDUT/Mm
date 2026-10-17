# Airplane-mode reel — build notes
Engine: `engine/` = engine.js (frame engine) + timeline.js (≈45 SHOTS + DOM text/HUD/labels, story time) + plane3d.js (stages: sky, cabin, cockpit, ground, studio/hangar, holo; actors: KROZO jet, phone with canvas UI, hologram busts, ring/beam pools; post: bloom + grade with glitch/rewind).
Not committed (restore before rendering):
- `engine/lib/`: `npm pack three@0.169.0` → `build/three.module.js` to `lib/`, `examples/jsm` to `lib/jsm`.
- `engine/fonts/`: copy from `project/google_maps/engine/fonts`.
- `engine/assets/moonless_golf_1k.hdr`: copy from `project/touchscreen_gloves/v2/engine/assets/`.
Audio pipeline (from `source/voice_airplane_mode.mp3`):
  voice16.wav → nuclei.json (tools/nuclei.py) → `python3 align.py . 124 1.057` → words3.json
  `python3 warp.py .` → warp.json ; voice chain (tools/voice_chain.txt) → voice_clean.wav ; `python3 ../tools/voicewarp.py .` → voice_timed.wav
  `python3 subs.py` → engine/subs.js, engine/warp.js, airplane_mode.ar.srt
  `python3 sfx_air.py audio/sfx.wav 113.4` ; `python3 ../tools/music.py audio/music.wav 113.4 88` ; `./mix.sh`
Render (GL at 0.75 res, DOM text native 1080p; 4 chunks 0-28.4, 28.4-56.8, 56.8-85.1, 85.1-113.4):
  PAGE='index.html?rs=0.75' node ../tools/render.mjs engine part.mp4 30 T0 T1
Stills (video time): node ../tools/render.mjs engine outdir 30 0 0 --stills t1,t2
