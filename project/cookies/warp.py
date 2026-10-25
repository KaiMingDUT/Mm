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


# Only the silent part of a pause is shortened: drawn-out word endings and breaths are never cut (face_id v3 lesson).
plan = []
for a, b in ps:
    L = b - a
    if a > END: continue
    k = [v for t, v in KEEP.items() if abs(t - a) < 0.08]
    target = k[0] if k else (0.10 if a == 0 else 0.18)
    if not k and L <= 0.28 and a > 0: continue
    q = quiet_run(a, b)
    if not q: print(f'  keep {a:.2f} intact (no silent stretch)'); continue
    qa, qb = q; qL = qb - qa
    newq = max(0.08, target - (L - qL))
    if target > L: newq = qL + (target - L)          # an intentional beat longer than the pause: add silence
    if abs(newq - qL) < .03 or (newq < qL and qL < .12) or (newq > qL and target <= L): continue
    plan.append((qa, qb, newq))
knots = [[0.0, 0.0]]; ts = tv = 0.0
for a, b, new in plan:
    tva = tv + (a - ts)
    if a > 0: knots.append([a, round(tva, 4)])
    knots.append([b, round(tva + new, 4)])
    ts, tv = b, tva + new
json.dump({'knots': knots, 'plan': plan}, open(P + '/warp.json', 'w'))
print('voice end (video time)', round(knots[-1][1] + END - knots[-1][0], 2), 'cuts', len(plan))
