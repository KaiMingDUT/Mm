import json, sys
# v2 (client: "cut the long pauses, keep the important ones"): every gap between two words is tightened, breaths
# included, keeping 0.08 s after the word end and 0.06 s before the next onset so no word is clipped. Only the
# dramatic beats below keep their length.
P = sys.argv[1]
W = json.load(open(P + '/words3.json'))
KEEP = {  # index of the word before the pause -> new total gap
    6: 0.55,    # after the hook question "…في ثواني؟" (؟ + heartbeat)
    60: 0.50,   # after "…عبر الأقمار الصناعية؟" (before "لا!")
    61: 0.30,   # "لا!" lands, then the answer
    65: 0.55,   # after "الحقيقة أغرب من كذا." (dive + splash + sub-drop)
}
TARGET, PRE, POST, MIN = 0.20, 0.08, 0.06, 0.30
plan = []
lead_cut = W[0]['s'] - 0.10                     # trim the silence before the first word to 0.10 s
if lead_cut > .05: plan.append((0.0, lead_cut, 0.05))
for i, (a, b) in enumerate(zip(W, W[1:])):
    g = b['s'] - a['e']; tgt = KEEP.get(i, TARGET)
    if g <= max(MIN, tgt) and i not in KEEP: continue
    if g <= tgt: continue
    ca, cb = a['e'] + PRE, b['s'] - POST
    if cb - ca < .05: continue
    keep = tgt - PRE - POST
    plan.append((ca, cb, max(.03, keep)))
knots = [[0.0, 0.0]]; ts = tv = 0.0
for a, b, new in plan:
    tva = tv + (a - ts)
    if a > 0: knots.append([a, round(tva, 4)])
    knots.append([b, round(tva + new, 4)])
    ts, tv = b, tva + new
END = W[-1]['e'] + .02
json.dump({'knots': knots, 'plan': plan}, open(P + '/warp.json', 'w'))
print('voice end (video time)', round(knots[-1][1] + END - knots[-1][0], 2), 'cuts', len(plan))
