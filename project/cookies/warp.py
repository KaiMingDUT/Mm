import json, sys, wave
import numpy as np
P = sys.argv[1]
ps = [tuple(map(float, l.split())) for l in open(P + '/pauses_m.txt') if l.strip()]
KEEP = {  # pause start -> new total pause length: intentional beats
    7.18: 0.60,    # after "إيش اللي تسمح له يسويه فعلًا؟" (question beat + heartbeat)
    38.30: 0.45,   # after "متى آخر مرة سويت «عدم السماح» للموقع؟" (question to the viewer)
}
END = 45.62
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
KEEPW = {8: 0.32,    # «السماح للكوكيز»… (the ellipsis: suspense)
         17: 0.55,   # …يسويه فعلًا؟ (question beat + heartbeat)
         27: 0.30,   # …وطلعت من الموقع. (end of the setup)
         35: 0.40,   # …لسه موجود! (the punchline)
         42: 0.40,   # …اللي سمحت فيها. → «الـCookies» (before the reveal)
         59: 0.32,   # …وسلة مشترياتك. (end of the explanation)
         76: 0.45,   # …لما ترجع له. → «متى آخر مرة» (new section)
         83: 0.45,   # …عدم السماح للموقع؟ (question to the viewer + heartbeat)
         88: 0.40}   # …دايمًا أسمح له. → the call to action
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
