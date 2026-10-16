"""KROZO sound design — synthesized SFX placed on the narration timeline.
usage: python3 sfx.py OUT.wav DURATION
"""
import sys, wave
import numpy as np
from itertools import accumulate

SR = 44100
OUT, DUR = sys.argv[1], float(sys.argv[2])
N = int(DUR * SR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(11)


def lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    return np.fromiter(accumulate(x * (1 - a), lambda p, v: v + a * p), float, len(x))


def hp(x, fc):
    return x - lp(x, fc)


def place(sig, t, gain=1.0, pan=0.0):
    s = int(t * SR); e = min(N, s + len(sig))
    L[s:e] += sig[:e - s] * gain * np.sqrt((1 - pan) / 2) * 1.414
    R[s:e] += sig[:e - s] * gain * np.sqrt((1 + pan) / 2) * 1.414


def tt(d):
    return np.arange(int(d * SR)) / SR


def whoosh(d=0.7, f0=400, f1=3200):
    t = tt(d); n = rng.standard_normal(len(t))
    # band-limited noise sweep with smooth swell
    cut = np.geomspace(f0, f1, len(t))
    out = np.zeros(len(t)); acc = 0.0
    a = np.exp(-2 * np.pi * cut / SR)
    for i in range(len(t)):
        acc = (1 - a[i]) * n[i] + a[i] * acc; out[i] = acc
    out = hp(out, 200)
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    return out * env / (np.max(np.abs(out * env)) + 1e-9)


def blip(f=1600, d=0.09, f2=None):
    t = tt(d); f2 = f2 or f
    ph = 2 * np.pi * np.cumsum(np.linspace(f, f2, len(t))) / SR
    return np.sin(ph) * np.exp(-t * 38) * np.clip(t / 0.003, 0, 1)


def click(d=0.03):
    t = tt(d); n = rng.standard_normal(len(t))
    return hp(n, 2500) * np.exp(-t * 260) * 0.8 + np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 120) * .5


def impact(d=1.6, f=48):
    t = tt(d)
    f_t = f + 60 * np.exp(-t * 18)
    body = np.sin(2 * np.pi * np.cumsum(f_t) / SR) * np.exp(-t * 3.2)
    air = lp(rng.standard_normal(len(t)), 900) * np.exp(-t * 9) * .6
    s = body + air
    return s / np.max(np.abs(s))


def chirp_signal(d=0.9):
    # GPS "signal received": three soft rising pings
    out = np.zeros(int(d * SR))
    for i, f in enumerate((1320, 1560, 1760)):
        b = blip(f, 0.22, f * 1.02) * .8
        s = int(i * 0.16 * SR); out[s:s + len(b)] += b[:len(out) - s]
    return out


def shimmer(d=1.4):
    t = tt(d); out = np.zeros(len(t))
    for k, f in enumerate((1760, 2093, 2637, 3136, 3520)):
        st = int(k * 0.06 * SR)
        seg = np.sin(2 * np.pi * f * t[:len(t) - st]) * np.exp(-t[:len(t) - st] * 4)
        out[st:] += seg
    return out / np.max(np.abs(out)) * np.clip(t / .02, 0, 1)


def scan(d=1.3):
    t = tt(d); n = rng.standard_normal(len(t))
    bp = hp(lp(n, 3500), 1500)
    trem = .5 + .5 * np.sin(2 * np.pi * 14 * t)
    return bp * trem * np.sin(np.pi * t / d) ** 2 / 3


V = lambda ts: ts if ts < 12.35 else ts + 0.8


def heartbeat():
    t = tt(0.5)
    f = 50 + 30 * np.exp(-t * 25)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11)
    return s / np.max(np.abs(s))


def reverse_swell(d=1.0):
    t = tt(d); n = rng.standard_normal(len(t))
    tone = sum(np.sin(2 * np.pi * f * t) for f in (220, 330, 440, 659)) / 4
    s = (lp(n, 2500) * .6 + tone * .5) * (t / d) ** 3
    return s / np.max(np.abs(s))


ev = [
    (whoosh(0.75), V(2.55), .30, .1),
    (blip(980, .14, 1180), V(5.64), .22, 0),
    (click(), V(6.66), .35, -.2), (blip(700, .1, 520), V(7.11), .12, -.2),
    (click(), V(8.61), .35, 0), (blip(700, .1, 520), V(9.06), .12, 0),
    (click(), V(9.70), .35, .2), (blip(700, .1, 520), V(10.15), .12, .2),
    (impact(1.4, 52), V(11.74), .30, 0),
    (blip(1500, .18, 1500), V(12.85), .20, 0), (blip(1500, .18, 1500), V(13.13), .10, 0),
    (shimmer(1.4), V(14.45), .14, 0),
    (blip(2100, .06), V(18.25), .10, -.3), (blip(2300, .06), V(18.50), .09, .3), (blip(2000, .06), V(18.75), .08, 0),
    (chirp_signal(), V(21.35), .20, 0),
    (click(), V(23.85), .26, 0), (click(), V(24.85), .26, 0), (click(), V(25.85), .26, 0),
    (blip(1180, .14, 1400), V(26.02), .18, 0),
    (blip(820, .16, 640), V(32.72), .18, 0),
    (whoosh(1.0, 300, 2400), V(36.75), .18, 0),
    (impact(1.8, 44), V(37.61), .42, 0),
    (scan(1.4), V(39.65), .35, 0), (blip(1900, .12, 1700), V(41.07), .14, 0),
    (blip(2100, .06), V(42.30), .10, -.3), (blip(2300, .06), V(42.55), .09, .3), (blip(2000, .06), V(42.80), .08, 0), (blip(2200, .06), V(43.05), .07, 0),
    (blip(1180, .14, 1400), V(46.02), .18, 0),
    (blip(760, .2, 520), V(49.72), .16, 0),
    (impact(1.6, 50), V(52.70), .30, 0),
    (blip(1400, .16, 1700), V(54.72), .22, 0),
    (whoosh(0.9, 500, 4000), V(55.55), .16, 0),
    (shimmer(2.0), V(56.2), .2, 0),
    # dramatic pause after "كيف يعرف؟": two soft heartbeats + reverse swell into the answer
    (heartbeat(), 12.52, .40, 0), (heartbeat(), 12.98, .30, 0),
    (reverse_swell(1.05), 12.53, .22, 0),
]
for sig, t, g, pan in ev:
    place(sig, t, g, pan)
st = np.stack([L, R], 1)
peak = np.max(np.abs(st))
if peak > 0.98:
    st *= 0.98 / peak
with wave.open(OUT, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((st * 32767).astype(np.int16).tobytes())
print('wrote', OUT, 'events', len(ev))
