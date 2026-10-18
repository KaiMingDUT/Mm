# Apple Watch green-light reel — build notes
Engine: `engine/` = engine.js + timeline.js (shots in story time) + watch3d.js (generic smartwatch with live face + sensor back, holo forearm, holo runner with heart, studio/track stages) + xsec.js (2D magnified wrist cross-section: watch cutaway, skin layers, pulsing vessel, LED→tissue→photodiode light paths).
Not committed: `engine/lib/` (three@0.169.0: `build/three.module.js` + `examples/jsm`, from npm) and `engine/fonts/` (copy from project/google_maps/engine/fonts).
Voice: clean recording (gaps ≈ −70 dB) → `voice_chain.txt` (no RNNoise, no gate: the recording is already clean).
Pipeline: voice16 → nuclei → `python3 align.py . 97.0 0.845 0.12` → warp.py → `../tools/voicewarp.py .` → subs.py → `sfx_watch.py audio/sfx.wav 96.0` → `../tools/music.py audio/music.wav 96.0 25.04` → `./mix.sh`
Render: `render_queue.sh` (resumable segments, 4 workers) → concat → encode + mux.
Colour rule: green appears ONLY as the LED light (it is the real colour of the light and the subject of the script); blood is a muted wine red; everything else is KROZO navy/blue/cyan.
