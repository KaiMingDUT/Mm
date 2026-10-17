import json, sys
P = sys.argv[1]
ps = [tuple(map(float, l.split())) for l in open(P + '/pauses_m.txt') if l.strip()]
KEEP = {  # pause start (approx) -> new length (s): intentional beats
    10.73: 0.35,   # after "ما تطيح!"
    20.00: 0.25,   # before "هذي تسلا رودستر"
    25.42: 0.45,   # after "لكن لحظة…"
    28.82: 0.60,   # after "كيف … وما تطيح؟!" (question beat)
    53.06: 0.40,   # after "طيب لحظة…"
    59.38: 0.50,   # after "تقفز في الهواء؟"
    90.57: 0.30,   # before price
    98.75: 0.30,   # after "يا عزيزي المتابع"
}
plan = []
for a, b in ps:
    L = b - a
    if a == 0: new = 0.10
    elif a > 102.8: continue
    else:
        k = [v for t, v in KEEP.items() if abs(t - a) < 0.08]
        if k: new = min(L, k[0]) if k[0] < L else k[0]
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
end_voice = 102.95
print('voice after cut', round(knots[-1][1] + end_voice - knots[-1][0], 2), 'cuts', len(plan))
for a,b,n in plan:
    if n >= 0.25: print(f'  keep {a:6.2f} {b-a:.2f} -> {n:.2f}')
