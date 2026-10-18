import json, sys
P = sys.argv[1]
ps = [tuple(map(float, l.split())) for l in open(P + '/pauses_m.txt') if l.strip()]
KEEP = {  # pause start -> new length: intentional beats
    3.70: 0.40,    # after "ما يفتح؟"
    6.39: 0.35,    # after "يفتح؟!"
    8.10: 0.35,    # after "نفس الوجه…"
    9.80: 0.60,    # after "وش الفرق؟" (question beat + heartbeat)
    21.70: 0.35,   # after "ما يقدر يشوفها…"
    32.99: 0.40,   # after "خريطة ثلاثية الأبعاد لوجهك." (reveal beat)
}
plan = []
for a, b in ps:
    L = b - a
    if a == 0: new = 0.10
    elif a > 41.5: continue
    else:
        k = [v for t, v in KEEP.items() if abs(t - a) < 0.08]
        if k: new = k[0]
        elif L > 0.4: new = 0.25
        else: continue
    plan.append((a, b, new))
knots = [[0.0, 0.0]]; ts = tv = 0.0
for a, b, new in plan:
    tva = tv + (a - ts)
    if a > 0: knots.append([a, round(tva, 4)])
    knots.append([b, round(tva + new, 4)])
    ts, tv = b, tva + new
json.dump({'knots': knots, 'plan': plan}, open(P + '/warp.json', 'w'))
end_voice = 41.62
print('voice after cut', round(knots[-1][1] + end_voice - knots[-1][0], 2), 'cuts', len(plan))
