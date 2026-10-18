# KROZO | BEYOND TECH — AI Video Editor: Project Handoff

> **For a new chat/session:** read this file first. It has everything you need to continue the work: the brand rules, the client's preferences, the pipeline, the file layout, the status of each video, known issues and next steps.
> Repo: `kaimingdut/mm` · Branch: `claude/krozo-video-editor-30j869` (all work is committed and pushed here).

---

## 1. Who the client is and what they want

- **Brand:** KROZO | BEYOND TECH. Arabic tech-explainer reels about how everyday technology works from the inside.
- **Client workflow:** they send a **voice recording**, usually with the **Arabic script text** in the same message. Claude analyses the audio, plans the visuals, builds the motion graphics and 3D, mixes music and SFX, renders the final vertical video, reviews it and delivers it.
- **Chat language:** the client writes in Arabic and likes replies in **colloquial Arabic** (simple everyday Arabic, not formal). They asked for a script in "عامي" (general colloquial), *not* heavy Saudi dialect.
- **Delivery format:** Instagram Reels / TikTok / Shorts: **1080×1920, 30 fps, H.264 + AAC 256k 48 kHz, −14 LUFS integrated, −1.5 dBTP**.

### Brand palette (strict)
| Token | Hex |
|---|---|
| Background (navy-black) | `#080B12` |
| Primary accent (electric blue) | `#168BFF` |
| Secondary accent (cyan) | `#59C7FF` |
| Primary text (icy white) | `#F4F7FB` |
| Secondary text (metallic gray) | `#A7B1C2` |

- Font: **IBM Plex Sans Arabic** (SIL OFL), loaded from npm `@fontsource/ibm-plex-sans-arabic`.
- Logo: **not provided yet**. Only the text wordmark "KROZO • BEYOND TECH" is used. Never invent a logo.
- No red for "traffic/jam". Brand blue is used for emphasis instead.

### Client preferences learned (IMPORTANT)
1. **Sync matters most.** Visuals and subtitles must land exactly on the words. The first version was rejected for being out of sync, which is why we built the syllable-alignment pipeline below.
2. **Cut dead air.** Pauses > ~0.3 s are cut to ~0.18 s. Keep a few **intentional dramatic pauses**, for example after a question, with a heartbeat SFX and the music dropping out.
3. They asked for a **dramatic pause after the question line** (e.g. "طيب، كيف يعرف؟") with a suitable SFX.
4. **Voice must be clean and clear.** Apply the voice chain below.
5. **Music:** the client **disliked the hype/trap music** and said their voice wasn't clear over it. Current approved setting: **calm/ambient music about 24 dB under the voice** (music stem ≈ −37 LUFS vs voice ≈ −13 LUFS), with EQ carving the speech band and sidechain ducking. **Always also deliver a "NoMusic" version** (voice + SFX) so they can add licensed/trending audio inside Instagram.
6. They like **3D scenes**, **attention-grabbing SFX**, **blended transitions** (no dip to black), and the **picture leading the voice slightly** (lead = 0.15 s).
10. **Stay strictly on-brand.** When the client shares a reference video, copy its *visual ideas*, not its colours. Rebuild every element in the KROZO palette. v2 of the gloves video was too colourful.
7. They like progress updates while long renders run ("كم باقي"). Use a Monitor and give honest ETAs.
8. They want **100 % accurate facts.** Verify claims with web search, flag simplifications in the report, and never change their narration without asking.
9. **Real footage:** when real footage is needed, ask for the official source. The Tesla video ended up using **Tesla's official "The Ramp – Roadster"** short that the client uploaded.

---

## 2. Environment constraints (cloud container)

- **Blocked:** Hugging Face, YouTube, X/Twitter, tesla.com, alphacephei. **Allowed:** npm registry, PyPI, GitHub (git), Google Fonts gstatic.
- **ASR (speech-to-text) is effectively unavailable.** Running a Whisper model downloaded from a third-party npm package was **blocked by the auto-mode safety classifier**. Do not retry it. Instead, **the client provides the script text** and we align it to the audio using the syllable-nuclei pipeline (`tools/nuclei.py` + `align.py`). This works well.
- **WebFetch fails** (DNS) for most news sites. **WebSearch works.** Use it for fact-checking.
- Rendering: headless **Chromium via Playwright** (`/opt/node22/lib/node_modules/playwright`). WebGL2 works with SwiftShader (`--use-angle=swiftshader --enable-unsafe-swiftshader`). You must pass `--disable-accelerated-2d-canvas`, otherwise stale 2D canvas frames appear.
- Speed: 2D/clip scenes ≈ 0.6–1 s/frame. Full 3D scenes ≈ 3–3.5 s/frame. Render in **4 parallel chunks** and concat. A 108 s all-3D video takes ≈ 45 min.
- `rsync` and `column` are not installed. ffmpeg/ffprobe, numpy and node 22 are available.
- **Never `pkill -f` with a pattern that matches your own shell command**: it kills the Bash tool (exit 144).
- `rm` with unresolved variables is blocked by a safety check. Use literal paths or `find … -delete`.

---

## 3. Repository layout

```
HANDOFF.md                          ← this file
output/                             ← DELIVERABLES (what the client gets)
  README.md                         ← Google Maps video report
  KROZO_GoogleMaps_Traffic_Reel.mp4 (+ Cover .png/.jpg, .srt, contact_sheet.png)
  tesla_roadster/                   ← Tesla video: Reel.mp4, Reel_NoMusic.mp4, .srt, README.md, script_ar.md, contact_sheet.png
  touchscreen_gloves/               ← Gloves video v3: Reel.mp4, Reel_NoMusic.mp4, .srt, README.md, contact_sheet.png, v1_old/
project/                            ← SOURCES to rebuild/edit
  tools/                            ← shared pipeline scripts (see §4)
  google_maps/   engine/ source/ audio/ + warp/align data
  tesla_roadster/ engine/ source/ + music_*.py, sfx_*.py, warp/align data
  touchscreen_gloves/ engine/ (v1) v2/ v3/ (current) source/ + sfx_touch.py, warp/align data
```

- `project/*/source/` holds the **client's original voice recordings**. `tesla_roadster/source/` also holds the official Tesla short and the reference competitor video.
- `project/google_maps/engine/` contains `fonts/` and `lib/` (three.js 0.169.0 + postprocessing). The Tesla and Gloves engines **do not** include `fonts/`, `lib/` or `clips/`. Copy `fonts/` and `lib/` from `google_maps/engine/`, and regenerate the Tesla `clips/` (§6).

---

## 4. Pipeline (how a video is made)

All steps are scripts. Paths below assume a working dir `P` per video.

1. **Inspect audio:** `ffprobe`, loudness (`ebur128`), pauses (`silencedetect=n=-38dB:d=0.12`), then merge pauses that are less than 0.06 s apart → `pauses_m.txt`.
2. **Syllable nuclei:** `python3 tools/nuclei.py voice16.wav nuclei.json` (band energy 250–2500 Hz, peak picking).
3. **Script → syllables:** the script goes in `script.txt`, one phrase per line. A heuristic syllable count (inline in the session; see any `syl.txt`) produces `syl.txt` in the format `word N|word N`.
4. **Align:** `python3 align.py P END_TIME` runs a DP over speech chunks between pauses ≥ 0.25 s. It matches predicted syllables (×0.845) against detected nuclei and assigns word times inside each chunk from the nuclei → `words3.json`. **Check that every comma/full stop lands on a real pause.**
5. **Voice clean:** apply the `tools/voice_chain.txt` chain. That is highpass 85, afftdn, EQ (−1.5 dB @170, −3.5 dB @320, +4 dB @3.2 k, +0.5 dB @5.5 k, +1.5 dB high-shelf @9 k), deesser, compressor 3:1, gate, limiter → `voice_clean.wav`.
6. **Tighten pauses (warp):** `warp.py` holds a `KEEP` dict of intentional pauses (start→new length). Pauses > 0.28 s become 0.18 s → `warp.json` knots `[storyTime, videoTime]`. `tools/voicewarp.py P` builds `voice_timed.wav` (crossfaded cuts; it inserts silence when a pause is extended).
7. **Visuals:** an HTML engine renders each frame deterministically (§5). Story time = the original recording. `TL.remap` maps video→story via the WARP knots. `TL.lead = 0.15` makes the picture lead the voice.
8. **Subtitles:** generated from `words3.json` (≤ 4–5 words per group, word-by-word highlight) into `engine/subs.js` (`SUBS` + `WT` word start times). The SRT is written in **video time** via the warp.
9. **SFX:** `sfx_*.py` (numpy synth: whoosh, blip, click, impact, shimmer, heartbeat, reverse_swell, hiss, blast, puff, ticks, motor, whirr, glitch, stamp, thud, deflate, kaching, pop, chime). Events are placed at `V(storyTime)`, which applies the lead and the warp.
10. **Music:** `tools/music.py OUT DUR REVEAL` is the calm ambient bed the client currently accepts. `tesla_roadster/music_hype.py` and `music_cine.py` are alternates; the client **rejected hype**.
11. **Mix:** use this exact recipe.
    ```
    music: highpass 70, EQ −8 dB @2.6k (Q1.4), −4 dB @1.2k, −4 dB @4.5k; volume ≈ −10…−11.5 dB;
           sidechaincompress (key=voice) threshold .05 ratio 3 attack 20 release 450
    sfx:   volume −5 dB; sidechaincompress (key=voice) threshold .03 ratio 2.5
    amix normalize=0 → two-pass loudnorm I=-14 TP=-1.5 LRA=11 (linear)
    ```
    Produce `final_music.wav` and `final_nomusic.wav`.
12. **Render:** `node tools/render.mjs ENGINE_DIR out.mp4 30 t0 t1` (or `--stills t1,t2…`). It serves the engine over a local `python http.server`, which is needed for ES modules. Set `PAGE=cover.html` to render a cover. Render 4 chunks in parallel, then `ffmpeg -f concat … -c copy`, then mux audio (`-c:a aac -b:a 256k -ar 48000 -movflags +faststart`).
13. **Review:** contact sheet (`fps=1/2,tile`), loudness check, and mid-transition stills. Then commit, push, `SendUserFile` and `PushNotification`.

---

## 5. Engine architecture (`project/*/engine/`)

- `index.html`: 1080×1920 stage with these layers: `#bg` canvas (brand background, dot grid, vignette) → `#gl` WebGL canvas → `#scenes` (DOM per scene) → `#flash` → `#bug` (wordmark) → `#subband` (dark band behind subtitles) → `#subs` → `#prog` (progress bar).
- `engine.js`: helpers (`clamp/lerp/prog/ease/el/fadeIO`) and `seek(tv)`.
  - `seek` is async: it awaits clip image decodes in the `PENDING` array.
  - It applies `TL.remap` and `TL.lead`, then updates every active scene.
  - **Blended transitions:** consecutive scenes overlap 0.26 s. There is special handling for 3D↔clip/DOM pairs, a 6 % punch-in zoom on each cut, flashes at `TL.flashes`, and `window.CUR_FADE` scales the 3D opacity.
  - `setClip(img, name, t)` handles frame-accurate real footage from JPEG sequences (`CLIPS` dict holds frame counts).
- `brand.js`: `outroScene(s, e)` shows the KROZO wordmark reveal.
- `subs.js`: generated (`SUBS`, `WT`). `warp.js`: generated (`WARP`).
- `timeline.js`: the per-video edit. It contains scenes `{s, e, fi, fo, is3d, build(root), update(root, lt, t)}` and `window.TL = {voiceEnd, lead, flashes, remap, bug, subs, scenes}`.
- 3D modules (three.js r169 + UnrealBloom). Each one exposes `window.G3 = {set(state), render(t), project(v), …}`, and the last `G3.set` in a frame wins.
  - `google_maps/engine/g3.js` + `world.js`: blueprint 3D city, Bezier highway, deterministic traffic with a jam density warp, GPS overlays.
  - `tesla_roadster/engine/tesla3d.js`: illustrative roadster (extruded profile), wall loop ramp (R = 10.6 → about 21 m, 170°), fans, COPV tanks, nozzles and plumes, pressure arrows, ghost cars.
  - `touchscreen_gloves/engine/touch3d.js`: phone with a canvas-texture UI, exploded layers (glass / ITO grid / display), field dots that bend to the finger, finger with aura and ions, knit glove, conductive tip, insulating barrier, ripple and cell highlight. The camera is one continuous keyframe path (`camAt`) in `timeline.js`.

---

## 6. Status of each deliverable

### A. Google Maps traffic (DONE, delivered)
- `output/KROZO_GoogleMaps_Traffic_Reel.mp4`: v3, 54.97 s. It has the 3D city, syllable-synced subtitles, a 0.8 s dramatic pause after "كيف يعرف؟", cut pauses, and a cleaned voice.
- Cover: `output/KROZO_GoogleMaps_Traffic_Cover.png/.jpg` (title + 3D jam, safe for the 4:5 grid crop).
- Music: the ambient bed, at the level of that time. **The cleaner mix (−24 dB music + EQ carve) and the NoMusic version were NOT applied to this older video.** That is a possible next step.

### B. Tesla Roadster (DONE, delivered)
- `output/tesla_roadster/KROZO_Tesla_Roadster_Reel.mp4` (calm music −24 dB) and `…_NoMusic.mp4`. Length 98.1 s.
- Uses **Tesla's official "The Ramp – Roadster"** footage full-screen, with a HUD on the climb (height → 21 m, pitch → 170°) and 3D explainers (fans/pressure, 2G ghosts, tanks/nozzles, thrust). It also has 88 SFX, blended transitions and lead 0.15.
- Clips are **not in the repo**. Regenerate the frames with this command (output into `engine/clips/<name>/%04d.jpg`):
  ```
  SRC=project/tesla_roadster/source/tesla_official_the_ramp_roadster.mp4
  for name t0 dur: t_flip 27.0 3.0 | t_climb 2.0 7.8 | t_top 9.0 1.4 | t_wall 18.0 1.2 | t_fall 19.0 5.8 | t_land 11.0 2.4
                   t_jump 36.5 3.4 | t_rear 0.0 2.0 | t_drive 15.0 2.9 | t_jets 20.0 1.8 | t_smoke 23.5 3.2
  ffmpeg -nostdin -i $SRC -ss t0 -t dur -vf "eq=contrast=1.04:saturation=1.05" -r 30 -q:v 3 clips/name/%04d.jpg
  ```
  The older reference-video clip names in `CLIPS` (jump, ramp, under, …) are no longer used by the timeline.
- Fact-check table and sources: `output/tesla_roadster/README.md` and `script_ar.md`.
- Copyright note: the footage belongs to Tesla. Short clips used with commentary are common but not guaranteed safe. The client was told this.

### C. Touchscreen & gloves (v3 DONE, delivered; v1 kept in `output/touchscreen_gloves/v1_old/`)
- **v3 is the current deliverable:** `output/touchscreen_gloves/KROZO_Touchscreen_Gloves_Reel.mp4` + `_NoMusic.mp4`, 108.05 s.
- **Why v3 exists:** the client sent a reference reel ("How does the touchscreen really work", getkeyframes.com) and asked for "scenes like these but with my visual identity and better".
  - Reference style: a dark macro cross-section (glass / wires / RGB pixels) with golden fringe-field arcs, a row of "100" readings under the wires that dip under the finger, a pen that is ignored, Na⁺/Cl⁻ inside a fingertip, wool loops, a top-down diamond grid with readings, and top captions with the keyword boxed.
  - v3 rebuilds all of that **in brand colours only** (blue/cyan arcs, cyan readings, blue selection box with cyan corner handles). It is mixed with the realistic v2 shots: snow night, hands, phone, split screen, veins, whip pan.
- **v2** (`project/touchscreen_gloves/v2/`): a fast-cut realistic version. It was never delivered as a final because it was too colourful (red glove, purple UI), which is off-brand. v3 reuses its engine.
- **Sources:** `project/touchscreen_gloves/v3/` (see `BUILD.md`). The audio work dir `project/touchscreen_gloves/work/` is git-ignored and gets regenerated.
- **Brand decisions in v3:**
  - No red, orange or purple anywhere.
  - Fail = metallic gray ✕, success = cyan ✓.
  - Glove = charcoal knit with a brand-blue cuff.
  - Phone UI = navy wallpaper with blue, white and navy tiles.
- **Science flag** (in the README): "the problem is not thickness, it's insulation" is an acceptable simplification. The cross-section is labelled on screen as a magnified illustration with illustrative values.
- **Possible next step:** a cover for this video. Watch the client's feedback on the caption position (top, like the reference).

### D. Airplane mode (DONE, delivered)
- `output/airplane_mode/KROZO_Airplane_Mode_Reel.mp4` + `_NoMusic.mp4` (113.4 s, ~6 Mbps so it fits GitHub's 100 MB limit), cover `.png/.jpg`, `.srt`, README with fact-check (FAA AC 91.21-1C, AC 20-164A, FCC ground-network rule).
- Made in the style of a client-supplied reference (stylised 3D + HUD chips) but in KROZO identity. Sources in `project/airplane_mode/` (see its `BUILD.md`). New engine `plane3d.js`: KROZO-livery jet, cabin, cockpit, ground towers, hangar, hologram busts, phone with live canvas UI (control centre + airplane toggle), ring/beam pools, glitch/rewind grade. Shots in `timeline.js` (story time), 3D-anchored labels via `shot.after` + `LAB`.
- Gotcha: the livery canvas uses flipY=false, and the text needs `scale(-1,1)` (upper +z band) / `scale(1,-1)` (lower band). Check both sides with a still before you render.
- **Sync bug found and fixed (Oct 18):** `tools/voicewarp.py` added 8 ms (the crossfade length) at every shortened pause, so the voice drifted later than the picture/subs: ≈0.35 s by the end with ~43 cuts. It is now exact (verified by envelope cross-correlation: ±0.01 s). **Older videos (Google Maps, Tesla, Touchscreen) were built with the buggy version** and drift the same way (cuts × 8 ms). To fix them: re-run voicewarp + mix and remux with `-c:v copy` (no re-render).
- Forced alignment with eSpeak-NG + DTW was tried and failed (synthetic Arabic without diacritics doesn't match the speaker); keep the nuclei alignment.
- Gotcha: never put `pkill`/`pgrep` patterns in the same command line as `render.mjs`, or they match your own shell (exit 144).

---

## 7. Known issues / bugs / caveats

1. **No ASR.** Word timing comes from the alignment. It is accurate at phrase level, but a word inside a phrase can be off by up to ~0.2 s. If the client's spoken words differ from the pasted script, alignment can drift, so ask for the exact script.
2. **Touchscreen v1** (archived) had a cropped conductive-glove framing. v3 replaces it.
3. **Tesla 3D car** is a stylised wedge, not Tesla's design. It is labelled illustrative in the README.
4. **Google Maps video** still uses the older, louder music mix (see 6A) and has no NoMusic version.
5. Music is synthesized in numpy. The client did not like the hype style. If they want specific music, ask for a track or suggest adding Instagram library audio to the NoMusic version.
6. Large MP4s (35–72 MB) trigger GitHub "large file" warnings. The pushes still succeed. Consider Git LFS if the repo grows.
7. The render timing estimate in the Monitor counter is coarse, because it only updates every 150 frames. Report ETAs from the log rates instead.

---

## 8. Next steps (suggested)

- If the client wants consistency: remix the **Google Maps** video with the approved clean mix and produce its **NoMusic** version. Audio-only work, then remux with `-c:v copy`.
- **Covers** for the Tesla and Touchscreen videos, using the same approach as `project/google_maps/engine/cover.html` + `cover.js`. Keep the key content inside the centre 1080×1350.
- When the client provides the **official KROZO logo** (PNG/SVG, transparent), add it to the bug/outro.
- For new videos, follow §4 exactly:
  1. Ask for, or use, the provided script.
  2. Verify the facts with WebSearch.
  3. Use calm music at −24 dB and deliver a NoMusic version.
  4. Lead 0.15, blended transitions, dramatic pauses after questions with heartbeat SFX.
  5. Use 3D where it explains the mechanism.
  6. Give progress updates during the render.

---

## 9. Quick start in a new session

```bash
git clone … && git checkout claude/krozo-video-editor-30j869
cd project
# restore heavy assets for an engine:
cp -r google_maps/engine/fonts google_maps/engine/lib touchscreen_gloves/engine/
# preview stills of a video (video-time seconds):
node tools/render.mjs touchscreen_gloves/engine /tmp/stills 30 0 0 --stills 5,30,60
# full render in chunks:
node tools/render.mjs touchscreen_gloves/engine part1.mp4 30 0 27   # …repeat for other ranges
```
`render.mjs` resolves Playwright from `/opt/node22/lib/node_modules/`. `music.py` and `sfx*.py` need numpy only. The `sfx_*.py` scripts read `warp.json` and `words3.json` from the **output directory**, so run them with the output path inside the project folder.
