# KROZO — كيف الكيبورد يعرف وش تقصد؟ (Keyboard touch zones)

**Files**
- `KROZO_Keyboard_Reel.mp4`: calm music bed about 24 dB under the voice, plus SFX
- `KROZO_Keyboard_Reel_NoMusic.mp4`: voice and SFX only, so trending audio can be added inside Instagram
- `KROZO_Keyboard_Reel.ar.srt`: Arabic captions in video time
- `contact_sheet.png`

**Format:** 1080×1920, 30 fps, H.264 + AAC 256k 48 kHz, −14 LUFS, −1.5 dBTP. Length ≈ 46.8 s (voice ≈ 44.3 s + KROZO outro).

## Script (transcribed from the recording, nothing cut)
كل زر في كيبورد جوالك أصغر من إبهامك، ومع ذلك غالبًا تضغط الحرف الصح. كيف؟
السر إن منطقة اللمس تحت كل حرف ممكن تتغير وأنت تكتب. خلنا نجرب:
تخيّل إنك تكتب كلمة "سلام"، وكتبت "سلا"… جوالك يتوقع إن الحرف الجاي ممكن يكون "ميم"،
فيوسّع منطقة اللمس الخاصة فيه، ويصغّر المناطق المحيطة، بدون ما يتغير شكل الأزرار على الشاشة.
يعني لو لمست بين حرفين، الجوال ممكن يرجّح الحرف اللي يناسب الكلمة، بدل ما يختار الأقرب لمكان لمستك.
يعني مو شرط إن إصبعك دقيق مثل ما تتخيل، الكيبورد نفسه يساعدك تكتب بدقة.
أرسل هذا المقطع لصاحبك اللي يلوم دايمًا التصحيح التلقائي على كل غلطة.

## Scenes
| Voice | Picture |
|---|---|
| كل زر… أصغر من إبهامك | 3D phone, holographic thumb over a single key ("زر واحد" / "إبهامك") |
| ومع ذلك… الحرف الصح | fast taps, a cyan ✓ on every key |
| كيف؟ (0.75 s beat) | screen dims, a big cyan ؟, heartbeat |
| السر إن منطقة اللمس… | exploded view: the keycaps lift off and the hidden touch-zone map shows underneath |
| خلنا نجرب / سلا… | top-down keyboard, س ل ا typed, the missing م in grey |
| يتوقع… ميم | "الحرف الجاي؟" panel (م / ح / ل) and the suggestion bar; the م key glows |
| فيوسّع… ويصغّر | the م zone grows, its neighbours shrink (live weighted-Voronoi map) |
| بدون ما يتغير شكل الأزرار | exploded again: same keycaps on top, the changed map below |
| لو لمست بين حرفين… | a touch between ن and م (closer to ن) lands inside the م zone, so سلام is typed with a ✓ |
| بدل ما يختار الأقرب | distance lines: ن is the closest (✕), م is the best fit (✓) |
| مو شرط إن إصبعك دقيق | sloppy taps all land on the right letters |
| الكيبورد نفسه يساعدك | hero shot, the zone map floats above the keys |
| أرسل هذا المقطع لصاحبك… | chat: the reel is sent, the friend replies "طيب… يمكن الغلط مني" → KROZO outro |

## Fact check
- **Hidden, resizing touch zones are real.** Apple holds a patent for this. The keyboard enlarges the touch area of the likely next key without changing how the key looks ([AppleInsider, 2012](https://appleinsider.com/articles/12/07/31/apple_granted_patent_for_predictive_text_input_ui)). Gizmodo gives the same example: you aim for O, hit P or I, and the phone still types O. Research calls this "key-target resizing" ([Microsoft Research paper](https://microsoft.com/en-us/research/wp-content/uploads/2016/02/paper-final.pdf)).
- **Picking the letter that fits the word, not the closest one.** Gboard's decoder combines a spatial (touch) score with a language-model score, so a slightly farther key can win when it fits the word better ([Google Research: The Machine Intelligence Behind Gboard](https://research.google/blog/the-machine-intelligence-behind-gboard/), [Spatial model personalization in Gboard](https://arxiv.org/pdf/2209.11311)).
- **Simplifications** (also marked "رسم توضيحي" on screen):
  - The zone map and the percentages in the "الحرف الجاي؟" panel are illustrative, not measured.
  - Real keyboards do this with probabilities rather than a literal map, but the visible result is the same. The narration says "ممكن" ("may"), which fits.
  - The keyboard layout is a generic Arabic layout, not Apple's or Google's exact one. There are no logos.

## Sync
- Word timing comes from CTC forced alignment (Omnilingual-ASR CTC + torchaudio `forced_align`), the same method as AirTag v7.
- Every comma and full stop falls on a real pause in the recording.
- Pauses: only 3 dramatic beats (after "كيف؟", "سلا…", "على الشاشة."). Other pauses longer than 0.28 s were shortened to 0.18 s by cutting only their silent part.
- The voice speed is the original. After the warp, every speech chunk matches the source with envelope correlation r = 1.000 and 0 ms lag.
