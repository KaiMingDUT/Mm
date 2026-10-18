import json, sys, wave
import numpy as np
# Pause plan v2 (client: "the voice is a bit fast; pause a little in places").
# Every pause after a listed word is set to that length (extended with silence if the natural pause is shorter);
# other pauses > 0.34 s become 0.30 s. The whole voice is then slowed with rubberband (TEMPO) and the knots scaled.
P = sys.argv[1]
TEMPO = 0.93
ps = [tuple(map(float, l.split())) for l in open(P + '/pauses_m.txt') if l.strip()]
W = json.load(open(P + '/words3.json'))
_w = wave.open(P + '/voice16.wav'); SR = _w.getframerate(); X = np.frombuffer(_w.readframes(_w.getnframes()), np.int16).astype(float)
BEATS = {  # word index -> pause after it (s, before tempo)
    10: .35, 16: .55, 25: .5, 26: .3, 29: .7, 40: 1.0, 41: .55, 46: .6, 51: .75,
    56: .3, 60: .35, 66: .6, 74: .45, 77: .45, 81: .7, 82: .3, 88: .9, 91: .75,
    97: .45, 105: .65, 111: .4, 118: .55, 126: .4, 130: .7, 139: .35, 141: 1.25, 143: .7,
    147: .9, 151: .45, 161: .5, 162: .35, 169: .4, 172: .55,
}
plan = []
used = set()
for i, L in BEATS.items():
    e, nxt = W[i]['e'], W[i + 1]['s'] if i + 1 < len(W) else W[i]['e'] + 1
    cand = [(a, b) for a, b in ps if W[i]['s'] + .1 <= a <= nxt + .05 and a > 0 and a not in used]
    if cand:
        a, b = max(cand, key=lambda p: p[1] - p[0]); used.add(a); plan.append((a, b, L))
    else:   # no detectable pause: insert one at the boundary
        # no detected pause: split at the quietest 60 ms between this word and the next (a real inter-word gap)
        lo, hi = W[i]['s'] + .15, nxt + .25
        best = min(np.arange(lo, hi, .01), key=lambda t0: float(np.mean(X[int(t0 * SR):int((t0 + .06) * SR)] ** 2)))
        plan.append((best, best + .06, L))
for a, b in ps:
    if a == 0 or a in used or a > 102.8: continue
    if b - a > .34: plan.append((a, b, .30))
plan.sort()
plan = [(0.0, ps[0][1], .10)] + plan if ps[0][0] == 0 else plan
knots = [[0.0, 0.0]]; ts = tv = 0.0
for a, b, new in plan:
    tva = tv + (a - ts)
    if a > 0: knots.append([a, round(tva, 4)])
    knots.append([b, round(tva + new, 4)])
    ts, tv = knots[-1][0], tva + new
knots.append([140.0, round(knots[-1][1] + 140.0 - knots[-1][0], 4)])   # tail (outro) at the same rate
json.dump({'knots': knots, 'plan': plan, 'tempo': TEMPO}, open(P + '/warp_base.json', 'w'))
json.dump({'knots': [[s, round(v / TEMPO, 4)] for s, v in knots], 'plan': plan, 'tempo': TEMPO}, open(P + '/warp.json', 'w'))
print('voice after warp', round(knots[-1][1] + 103.4 - knots[-1][0], 2), '→ after tempo', round((knots[-1][1] + 103.4 - knots[-1][0]) / TEMPO, 2), 'beats', len(BEATS), 'cuts', len(plan))
