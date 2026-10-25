# Keyboard reel — build notes

Topic: how the phone keyboard quietly enlarges the hidden touch zone of the letter it expects next
(client recording `source/voice_keyboard.m4a`, 50.2 s; no title or script was sent, so the script was transcribed from the audio).

1. `voice16.wav` = source, mono 16 kHz. `script.txt` transcribed with Omnilingual-ASR CTC 1B (greedy, several window offsets).
2. `python3 align_fa.py MODEL_DIR 16` → `words3.json` (CTC forced alignment, same method as airtag v7; timings identical with 12/16/20 s windows).
3. Voice: `voice_chain.txt` (= tools chain without `agate`; the recording is already clean, gaps ≈ −75 dB) → `voice_clean.wav`.
4. `python3 warp.py .` (3 beats: after "كيف؟", after "سلا…", after "على الشاشة."; lead-in trimmed to 0.12 s; other pauses → 0.18 s, only the silent stretch is cut) → `warp.json`; `python3 ../tools/voicewarp.py .` → `voice_timed.wav`. Every chunk checked by 1 ms envelope cross-correlation: r = 1.000, lag 0.
5. `python3 subs.py` → `engine/subs.js`, `engine/warp.js`, `keyboard.ar.srt`.
6. Audio: `python3 sfx_kb.py audio/sfx.wav 46.8`, `python3 ../tools/music.py audio/music.wav 46.8 27.9`, `./mix.sh`.
7. Video: `./render_queue.sh` (16 segments, resumable) → concat → mux.

Engine (`engine/kb3d.js`): generic phone with a 1180×2556 canvas screen (chat + Arabic keyboard + suggestion bar),
a touch-zone layer = weighted Voronoi of the keys (`zone = argmin |p − c| − boost`), a lifted keycap layer for the exploded view,
a holographic thumb, rings and glows. `timeline.js` holds the shots in story time.
Libs are gitignored: copy `google_maps/engine/fonts`, and `lib/` = three@0.169.0 `build/three.module.js` + `examples/jsm`.
