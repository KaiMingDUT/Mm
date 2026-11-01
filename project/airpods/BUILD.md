# AirPods ANC reel — build notes
Voice: `source/voice_airpods.m4a` (client, 53.3 s) → voice16.wav; script.txt = the client's text, spoken form ("يزعجك وما يسكت").
Words: `python3 ../tools/align_fa.py . MODEL_DIR` (CTC forced alignment) → words3.json.
Pauses: `warp.py` KEEPW = pauses where needed (hook, the two question beats, "المفاجأة…", sentence ends), commas 0.17 s, never longer than the real gap; lead-in trimmed. `../tools/voicewarp.py .` → voice_timed.wav (22 chunks verified r = 1.000, lag 0).
Engine: `engine/pods3d.js` = airplane_mode's world (jet, sky, cabin, studio, holo busts, phone) + generic earbud (shell, mic ports, x-ray chip/driver/mics), shader sound waves (engine / speech / anti-noise / cancel / prediction lag / dashed), oscilloscope, `setUI2` (share sheet + comments).
Hook headline: DOM canvas in `timeline.js` (`hookScene`) with the fixed cover layout (Alexandria font, `engine/fonts/Alexandria.ttf`), word-by-word glow; `TL.noSubs` hides the bottom captions during it.
Audio: `python3 sfx_airpods.py audio/sfx.wav 48.1`, `python3 ../tools/music.py audio/music.wav 48.1 17.3`, `./mix.sh`.
Render: `render_queue.sh` (16 segments) → concat → x264 crf 19 maxrate 4.2M → mux.
Not committed: `engine/lib/` (three@0.169.0) and the Plex fonts (copy from another engine); `engine/assets/moonless_golf_1k.hdr` is a symlink.
