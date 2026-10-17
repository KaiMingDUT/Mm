# Touchscreen gloves — v2 (fast-cut, realistic 3D) build notes

Engine: `engine/` = engine.js (frame engine) + timeline.js (34 SHOTS + DOM text layers) + real3d.js (stages/actors/post) + assets3d.js (hand bake/FK + Loop subdivision, knit/skin shaders, phone + UI).
Not committed (restore before rendering):
- `engine/lib/`: `npm pack three@0.169.0` → copy `build/three.module.js` to `lib/` and `examples/jsm` to `lib/jsm`.
- `engine/fonts/`: copy from `project/google_maps/engine/fonts`.
Assets: `assets/hand_right.glb` (WebXR Input Profiles generic-hand, MIT), HDRs from three.js repo (Poly Haven, CC0).
The hand joints in that glb are flat (no parent chain) → `bakeHand` does its own FK (`rotChain`).

Render (GL at 2/3 res, DOM text at native 1080p; ~1.7 s/frame on 4 cores):
  PAGE='index.html?rs=0.6667' node ../../tools/render.mjs engine part1.mp4 30 0 27   (4 chunks: 0-27, 27-54, 54-81, 81-108.05)
Audio: needs warp.json/words3.json next to the scripts (from ../), and ../p3 voice_timed.wav (voice chain + warp of the source mp3).
  python3 sfx_v2.py sfx.wav 108.1 ; python3 music_pulse.py music.wav ; EQ music → m_eq.wav ; ./mix.sh
Stills for checking: node ../../tools/render.mjs engine outdir 30 0 0 --stills t1,t2   (video time; use s2v.py to convert story time)
