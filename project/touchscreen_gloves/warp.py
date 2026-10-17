import json, sys
P = sys.argv[1]
ps = [tuple(map(float, l.split())) for l in open(P + '/pauses_m.txt') if l.strip()]
KEEP = {  # pause start -> new length: intentional beats
    3.96: 0.30,    # after "قفاز…"
    17.26: 0.35,   # after "تستجيب فورًا!"
    22.98: 0.35,   # after "قطعة قماش؟"
    29.85: 0.50,   # after "نفس الشاشة؟" (question beat)
    34.06: 0.35,   # after "خلّني أشرح لك…"
    55.16: 0.40,   # after "الجزء المثير…"
    61.41: 0.50,   # after "…الشبكة الكهربائية؟" (question beat)
    78.49: 0.35,   # after "بالضبط!"
    83.01: 0.30,   # "حاجز … عازل"
    95.11: 0.35,   # after "سميك…"
    107.36: 0.40,  # before the outro line
}
plan = []
for a, b in ps:
    L = b - a
    if a == 0: new = 0.10
    elif a > 117.4: continue
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
end_voice = 117.52
print('voice after cut', round(knots[-1][1] + end_voice - knots[-1][0], 2), 'cuts', len(plan))
for a,b,n in plan:
    if n >= 0.25: print(f'  keep {a:6.2f} {b-a:.2f} -> {n:.2f}')
