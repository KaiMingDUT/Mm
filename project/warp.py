# Build story-time -> video-time warp: tighten pauses, keep two dramatic ones, extend the question pause.
import json, sys
S = sys.argv[1]
P = [tuple(map(float, l.split())) for l in open(S + '/pauses.txt') if l.strip()]
plan = []
for a, b in P:
    L = b - a
    if a == 0: new = 0.12
    elif abs(a - 12.31) < .1: new = 1.26          # "طيب، كيف يعرف؟" — requested dramatic pause
    elif abs(a - 3.28) < .1: new = 0.32           # after "وفجأة"
    elif abs(a - 38.90) < .1: new = 0.42          # reveal beat after "بدأت تتحرك ببطء"
    elif L > 0.30: new = 0.20
    else: continue
    plan.append((a, b, new))
knots = [[0.0, 0.0]]
ts = tv = 0.0
for a, b, new in plan:
    tva = tv + (a - ts)
    if a > 0: knots.append([a, round(tva, 4)])
    knots.append([b, round(tva + new, 4)])
    ts, tv = b, tva + new
json.dump({'knots': knots, 'plan': plan}, open(S + '/warp.json', 'w'))
open(S + '/engine/warp.js', 'w').write('const WARP = ' + json.dumps(knots) + ';  // [storyTime, videoTime]\n')
end_story = 58.6
print('video length', round(knots[-1][1] + end_story - knots[-1][0], 3), 'knots', len(knots))
