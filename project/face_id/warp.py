import json, sys
P = sys.argv[1]
ps = [tuple(map(float, l.split())) for l in open(P + '/pauses_m.txt') if l.strip()]
KEEP = {  # pause start -> new length: intentional beats
    3.71: 0.40,    # after "ما يفتح؟"
    6.40: 0.35,    # after "يفتح؟!"
    8.10: 0.35,    # after "نفس الوجه…"
    9.80: 0.60,    # after "وش الفرق؟" (question beat + heartbeat)
    21.94: 0.35,   # after "ما يقدر يشوفها…"
    31.91: 0.45,   # after "خريطة ثلاثية الأبعاد لوجهك." (reveal beat)
    45.36: 0.35,   # before "وعشان كذا…" (conclusion beat)
}
import wave, numpy as np
_w = wave.open(P + '/voice_clean.wav'); _sr = _w.getframerate()
_x = np.frombuffer(_w.readframes(_w.getnframes()), np.int16).reshape(-1, _w.getnchannels())[:, 0].astype(float) / 32768
def safe_to_cut(a, b, new):   # never cut a 'pause' that still has sound in the part we would remove
    seg = _x[int((a + new / 2) * _sr):int((b - new / 2) * _sr)]
    return len(seg) == 0 or 20 * np.log10(np.max(np.abs(seg)) + 1e-9) < -45
plan = []
for a, b in ps:
    L = b - a
    if a == 0: new = 0.10
    elif a > 49.5: continue
    else:
        k = [v for t, v in KEEP.items() if abs(t - a) < 0.08]
        if k: new = k[0]
        elif L > 0.4: new = 0.25
        else: continue
        if new < L and not safe_to_cut(a, b, new): print(f'  keep {a:.2f} intact (sound inside)'); continue
    plan.append((a, b, new))
knots = [[0.0, 0.0]]; ts = tv = 0.0
for a, b, new in plan:
    tva = tv + (a - ts)
    if a > 0: knots.append([a, round(tva, 4)])
    knots.append([b, round(tva + new, 4)])
    ts, tv = b, tva + new
json.dump({'knots': knots, 'plan': plan}, open(P + '/warp.json', 'w'))
end_voice = 49.6
print('voice after cut', round(knots[-1][1] + end_voice - knots[-1][0], 2), 'cuts', len(plan))
