# Touchscreen gloves — v3 (reference-style cross-section, KROZO identity) build notes

v3 = v2's multi-shot 3D engine + new stages, all in brand colours:
- `real3d.js`: brand recolour (charcoal knit glove + blue cuff, cool bokeh, dark slate desk, cyan rims);
  new `xs` stage (magnified side cut: glass / electrodes / RGB pixels / backplane + animated fringe-field arcs
  in a shader that bend toward the finger `F` with `pull`, capped by `cap` for the glove), `xsKnitAt` (wool loops,
  silver for conductive), ion sprites (Na⁺/Cl⁻ + water) parented inside the fingertip (`updIons`),
  `lowest(rig)` to rest finger/glove exactly on the glass, and the `POST3D` hook for HTML overlays.
- `timeline.js`: shots X1–X8 (cross-section), ION, C24 with per-crossing readings; overlays via `ov(lt,t)` per shot
  (readings row, leader labels, "تكبير توضيحي" note). Minimal DOM callouts; captions carry the words.
- `engine.js`: top captions (≤3 words, word-by-word, keyword selection box from `TL.keys`); non-adjacent DOM
  layers are no longer stretched to the next layer.
- `engine/assets` is a symlink to `../../v2/engine/assets`.

Restore before rendering (not committed): `engine/lib/` (three@0.169.0 build + examples/jsm), `engine/fonts/`
(copy from `project/google_maps/engine/fonts`).

Audio (work dir = `../work`, not committed):
  ffmpeg -i ../source/voice_touchscreen_gloves.mp3 -af "$(cat ../../tools/voice_chain.txt)" -ac 1 work/voice_clean.wav
  cp ../warp.json ../words3.json work/ ; python3 ../../tools/voicewarp.py work
  python3 sfx_v3.py work/sfx.wav 108.1 ; python3 music_pulse.py work/music.wav
  EQ music → work/m_eq.wav (highpass 70, −8 dB@2.6k, −4 dB@1.2k, −4 dB@4.5k) ; cd work && VOICE=voice_timed.wav bash ../v3/mix.sh
Render: PAGE='index.html?rs=0.6667' node ../../tools/render.mjs engine part1.mp4 30 0 27  (4 chunks: 0-27, 27-54, 54-81, 81-108.05; ~2 s/frame each)
