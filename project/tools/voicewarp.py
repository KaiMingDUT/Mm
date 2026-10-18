import json, sys, wave
import numpy as np
S = sys.argv[1]
K = json.load(open(S + '/warp.json'))['knots']
w = wave.open(S + '/voice_clean.wav'); sr = w.getframerate(); ch = w.getnchannels()
x = np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, ch).astype(np.float32)
out = []
xf = int(0.008 * sr)
def seg(a, b): return x[int(round(a * sr)):int(round(b * sr))]
K2 = K + [[x.shape[0] / sr, K[-1][1] + x.shape[0] / sr - K[-1][0]]]
for (s0, v0), (s1, v1) in zip(K2, K2[1:]):
    ds, dv = s1 - s0, v1 - v0
    if abs(ds - dv) < 1e-4:
        out.append(seg(s0, s1)); continue
    if dv < ds:   # shorten a pause: keep its head and tail, crossfade in the middle
        # exact length: nh + nt - xf == round(dv*sr), so the output never drifts from the warp map
        n = int(round(dv * sr)); nh = (n + xf) // 2; nt = n + xf - nh
        a0, b1 = int(round(s0 * sr)), int(round(s1 * sr))
        h = x[a0:a0 + nh]; t = x[b1 - nt:b1]
        r = np.linspace(1, 0, xf)[:, None]
        mid = h[-xf:] * r + t[:xf] * (1 - r)
        out.append(np.concatenate([h[:-xf], mid, t[xf:]]))
    else:         # extend a pause with true silence in the middle
        h = seg(s0, s0 + ds / 2); t = seg(s0 + ds / 2, s1)
        out.append(np.concatenate([h, np.zeros((int(round((dv - ds) * sr)), ch), np.float32), t]))
y = np.concatenate(out)
o = wave.open(S + '/voice_timed.wav', 'wb'); o.setnchannels(ch); o.setsampwidth(2); o.setframerate(sr)
o.writeframes(np.clip(y, -32768, 32767).astype(np.int16).tobytes()); o.close()
print('voice', round(len(y) / sr, 3), 's')
