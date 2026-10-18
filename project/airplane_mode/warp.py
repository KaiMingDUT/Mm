import json, sys
P = sys.argv[1]
ps = [tuple(map(float, l.split())) for l in open(P + '/pauses_m.txt') if l.strip()]
KEEP = {  # pause start -> new length: intentional beats
    4.60: 0.45,    # after "إسقاط طائرة!" (hook lands)
    12.13: 0.32,   # after "متن الطائرة."
    18.17: 0.40,   # after "ضخمة؟"
    21.47: 0.50,   # after "وضع الطيران؟" (question beat + heartbeat)
    22.72: 0.65,   # after "خلّني أشرح لك…" (requested beat + SFX)
    33.61: 0.75,   # after "صح؟" (requested beat + SFX)
    59.93: 0.50,   # after "ما تشغّله؟" (question beat)
    72.37: 0.30,   # before "وهنا يجي دور وضع الطيران"
    84.67: 0.40,   # before "فالخلاصة"
    98.44: 0.30,   # before the closing advice
}
plan = []
for a, b in ps:
    L = b - a
    if a == 0: new = 0.10
    elif a > 107.3: continue
    else:
        k = [v for t, v in KEEP.items() if abs(t - a) < 0.08]
        if k: new = k[0]
        elif L > 0.28: new = 0.18
        else: continue
    plan.append((a, b, new))
knots = [[0.0, 0.0]]; ts = tv = 0.0
for a, b, new in plan:
    tva = tv + (a - ts)
    if a > 0: knots.append([a, round(tva, 4)])
    knots.append([b, round(tva + new, 4)])
    ts, tv = b, tva + new
json.dump({'knots': knots, 'plan': plan}, open(P + '/warp.json', 'w'))
end_voice = 107.35
print('voice after cut', round(knots[-1][1] + end_voice - knots[-1][0], 2), 'cuts', len(plan))
