import json, sys
P = sys.argv[1]
ps = [tuple(map(float, l.split())) for l in open(P + '/pauses_m.txt') if l.strip()]
KEEP = {  # pause start -> new length: intentional beats
    12.87: 0.30,   # after "بنفسك،" (before the question)
    15.20: 0.40,   # after "كيف يصير هذا؟"
    21.38: 0.60,   # after "آلاف الكيلومترات؟" (question beat + heartbeat)
    22.33: 0.30,   # "السر…"
    24.77: 0.30,   # after "AirTag…"
    27.89: 0.45,   # after "أغرب مما تتوقع."
    42.48: 0.35,   # after "بالإنترنت بنفسه!"
    45.86: 0.50,   # after "مكان أغراضك؟" (question beat)
    47.26: 0.40,   # after "خلني أشرح لك…"
    75.15: 0.70,   # "ممكن جواله … يلتقط الإشارة!" (suspense)
    78.80: 0.30,   # after "يلتقط الإشارة!"
}
plan = []
for a, b in ps:
    L = b - a
    if a == 0: new = 0.10
    elif a > 102.8: continue
    else:
        k = [v for t, v in KEEP.items() if abs(t - a) < 0.08]
        if k: new = min(L, k[0])
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
end_voice = 103.4
print('voice after cut', round(knots[-1][1] + end_voice - knots[-1][0], 2), 'cuts', len(plan))
