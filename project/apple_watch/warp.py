import json, sys
P = sys.argv[1]
ps = [tuple(map(float, l.split())) for l in open(P + '/pauses_m.txt') if l.strip()]
KEEP = {  # pause start -> new length: intentional beats
    6.96: 0.30,    # after "بدون ما يشوف قلبك أصلًا!"
    11.40: 0.75,   # after "إيش يصير داخل جسمك؟" (question beat + heartbeat)
    19.84: 0.30,   # after "ارتفعت!"
    25.30: 0.60,   # after "وانت لابسها معصمك؟" (question beat + heartbeat)
    26.42: 0.30,   # "السر…"
    29.35: 0.35,   # after "تحت الساعة."
    42.88: 0.55,   # after "مو أحمر أو أزرق؟" (question beat)
    52.54: 0.30,   # after "مع كل نبضة."
    59.50: 0.35,   # after "بطريقة مختلفة."
    77.76: 0.28,   # after "نمط متكرر … في الضوء."
}
END = 96.75
plan = []
for a, b in ps:
    L = b - a
    if a == 0: new = 0.10
    elif a > END: continue
    else:
        k = [v for t, v in KEEP.items() if abs(t - a) < 0.08]
        if k: new = k[0] if k[0] > L else min(L, k[0])
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
print('voice end (video time)', round(knots[-1][1] + END - knots[-1][0], 2), 'cuts', len(plan))
