import json, sys, wave
import numpy as np
P = sys.argv[1]
ps = [tuple(map(float, l.split())) for l in open(P + '/pauses_m.txt') if l.strip()]
KEEP = {  # pause start -> new total pause length: intentional beats
    7.18: 0.60,    # after "إيش اللي تسمح له يسويه فعلًا؟" (question beat + heartbeat)
    38.30: 0.45,   # after "متى آخر مرة سويت «عدم السماح» للموقع؟" (question to the viewer)
}
END = 51.75
_w = wave.open(P + '/voice_clean.wav'); _sr = _w.getframerate()
_x = np.frombuffer(_w.readframes(_w.getnframes()), np.int16).reshape(-1, _w.getnchannels())[:, 0].astype(float) / 32768


def quiet_run(a, b, th=-50):
    """longest stretch inside [a, b] whose 20 ms RMS stays under th dBFS (true silence, not a word tail or a breath)"""
    n = int(.02 * _sr); seg = _x[int(a * _sr):int(b * _sr)]; seg = seg[:len(seg) // n * n]
    if not len(seg): return None
    q = 20 * np.log10(np.sqrt((seg.reshape(-1, n) ** 2).mean(1)) + 1e-9) < th
    best, cur = (0, 0), None
    for i, v in enumerate(list(q) + [False]):
        if v and cur is None: cur = i
        if not v and cur is not None:
            if i - cur > best[1] - best[0]: best = (cur, i)
            cur = None
    return (a + best[0] * .02, a + best[1] * .02) if best[1] > best[0] else None


# v2 (client: "pauses only where needed"): cut per word gap, breaths included.
# Each gap keeps the word's tail (≥ 0.10 s after its aligned end, extended while the audio is voiced or loud)
# and the next onset (≥ 0.06 s, extended the same way); only the unvoiced middle (silence + inhale) is removed,
# so the gap ends up ≈ TARGET. A drawn-out ending is voiced, so it is never cut (face_id v3 lesson).
W = json.load(open(P + '/words3.json'))
# v3 (client: "keep pauses where pauses are needed"): sentence ends / section changes breathe, commas stay tight.
# A pause is never longer than the real gap in the recording (no inserted silence).
# pauses where they are needed (client): hook beats, the two question beats, the suspense "المفاجأة…", sentence/section ends;
# commas stay tight. A pause is never longer than the real gap in the recording (no inserted silence).
KEEPW = {7: 0.35,    # …بشكل كبير… (hook suspense)
         11: 0.40,   # …بدون ما تسد أذنك! (end of the hook)
         12: 0.25,   # طيب،
         15: 0.60,   # وين يروح الصوت؟ (question beat + heartbeat)
         31: 0.30,   # …بالضبط.
         34: 0.29,   # …يلتقون… (suspense, as recorded)
         36: 0.25,   # يلغون بعض،
         38: 0.35,   # …وتُعزل الضوضاء.
         43: 0.30,   # …ما تمنع الصوت…
         48: 0.40,   # …صوت معاكس له!
         51: 0.45,   # بس هنا المفاجأة… (suspense)
         55: 0.30,   # …المحرك يختفي…
         61: 0.55,   # …ما يختفي؟ (question beat + heartbeat)
         65: 0.20,   # …ثابت،
         68: 0.30,   # …تتوقعه.
         77: 0.40,   # …ما تلحق عليه. (section end → call to action)
         85: 0.35,   # …وما يسكت.
         87: 0.30}   # وقول لي…
TARGET = 0.17
_n = int(.02 * _sr)
def voiced(t):
    f = _x[int(t * _sr):int(t * _sr) + _n]
    if len(f) < _n: return False
    lvl = 20 * np.log10(np.sqrt((f ** 2).mean()) + 1e-9)
    if lvl > -30: return True                      # loud = still a word
    if lvl < -48: return False
    f = f - f.mean(); ac = np.correlate(f, f, 'full')[len(f) - 1:]; ac /= ac[0] + 1e-12
    lo, hi = int(_sr / 400), int(_sr / 80)
    return ac[lo:hi].max() > .55                   # periodic = voiced tail/onset
plan = []
if W[0]['s'] > .3: plan.append((.02, W[0]['s'] - .10, .02))   # lead-in silence → ≈0.1 s
for i, (wa, wb) in enumerate(zip(W, W[1:])):
    if wa['e'] > END: break
    g = wb['s'] - wa['e']; target = min(KEEPW.get(i, TARGET), g)
    if g <= target + .06: continue
    a = wa['e'] + .10
    while a < wb['s'] - .1 and voiced(a): a += .02
    b = wb['s'] - .06
    while b > a + .04 and voiced(b - .02): b -= .02
    keep_outside = (a - wa['e']) + (wb['s'] - b)
    new = max(.02, target - keep_outside)
    if b - a - new < .05: continue
    plan.append((a, b, new))
    print(f"  {wa['w']:>14} → {wb['w']:<10} gap {g:.2f} → {keep_outside + new:.2f}")
knots = [[0.0, 0.0]]; ts = tv = 0.0
for a, b, new in plan:
    tva = tv + (a - ts)
    if a > 0: knots.append([a, round(tva, 4)])
    knots.append([b, round(tva + new, 4)])
    ts, tv = b, tva + new
json.dump({'knots': knots, 'plan': plan}, open(P + '/warp.json', 'w'))
print('voice end (video time)', round(knots[-1][1] + END - knots[-1][0], 2), 'cuts', len(plan))
