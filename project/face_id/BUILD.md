# Face ID reel — build notes
Engine: `engine/` = engine.js + timeline.js (shots, story time) + face3d.js (head, photo, phone with Face ID UI, 30k IR dots, depth heat, wire mesh, split-screen).
Assets: `engine/assets/LeePerrySmith.glb` + `Map-COL.jpg` + normal map, from the three.js repo (r169 examples). Head scan by Infinite-Realities (Lee Perry-Smith), CC BY 3.0.
Not committed: `engine/lib/` (three@0.169.0: build + examples/jsm) and `engine/fonts/` (copy from project/google_maps/engine/fonts).
Voice: noisy room recording → `voice_chain.txt` (RNNoise model `project/tools/rnnoise/sh.rnnn` "somnolent-hogwash", recording-noise/speech, not copyrightable per its repo).
Pipeline: voice16c.wav (from voice_clean) → nuclei → `python3 align.py . 49.9 0.845 0.11` (short pauses as chunk breaks) → warp.py → voicewarp → subs.py → sfx_face.py audio/sfx.wav 53.3 → tools/music.py audio/music.wav 53.3 40 → ./mix.sh
Render: `render/queue.sh` (resumable 3 s segments, 4 workers), then concat + 2-pass 6 Mbps encode + mux.
