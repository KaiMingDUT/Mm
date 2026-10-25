# Cookies reel — build notes
Engine: `engine/` = engine.js + timeline.js (shots in story time) + cookie3d.js (3D "UI in space": floating browser windows with live canvas UI — sites + cookie banner, shop/cart, calendar, cookie.txt, login/cart/welcome cards, comments; a data cookie (extruded bitten disc, cyan chips); the browser's cookie jar; the website's server; a 3D cursor + click rings).
Not committed: `engine/lib/` (three@0.169.0 `build/three.module.js` + `examples/jsm`) and `engine/fonts/` (copy from another engine).
Voice: `source/voice_cookies.mov` (video track is black) → voice16.wav / voice_chain.txt (no gate).
Words: `python3 ../tools/align_fa.py . MODEL_DIR` (CTC forced alignment, Omnilingual-ASR 1B; see HANDOFF F2) → words3.json.
Pipeline: align_fa → warp.py → `../tools/voicewarp.py .` → subs.py → `sfx_cookies.py audio/sfx.wav 47.1` → `../tools/music.py audio/music.wav 47.1 15.3` → `./mix.sh`
Render: `render_queue.sh` (12 resumable segments, 4 workers) → concat → encode + mux.
