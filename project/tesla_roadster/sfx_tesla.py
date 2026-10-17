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


import json, os
_K = json.load(open(os.path.join(os.path.dirname(os.path.abspath(OUT)), 'warp.json')))['knots']


def V(ts):
    """story time -> video time (pause-tightening warp)"""
    for (s0, v0), (s1, v1) in zip(_K, _K[1:]):
        if ts <= s1:
            return v0 + (ts - s0) * (v1 - v0) / ((s1 - s0) or 1)
    return _K[-1][1] + ts - _K[-1][0]




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


W = json.load(open(os.path.join(os.path.dirname(os.path.abspath(OUT)), 'words3.json')))
w = lambda i: W[i]['s']


def hiss(d=1.2, rise=True):
    t = tt(d); n = rng.standard_normal(len(t))
    cut = np.geomspace(800, 6000, len(t)) if rise else np.geomspace(6000, 900, len(t))
    a = np.exp(-2 * np.pi * cut / SR); out = np.zeros(len(t)); acc = 0.0
    for i in range(len(t)):
        acc = (1 - a[i]) * n[i] + a[i] * acc; out[i] = acc
    env = np.clip(t / (d * .15), 0, 1) * np.clip((d - t) / (d * .25), 0, 1)
    s = hp(out, 300) * env
    return s / (np.max(np.abs(s)) + 1e-9)


def blast(d=1.6):
    t = tt(d); n = rng.standard_normal(len(t))
    s = hp(lp(n, 5000), 250) * np.exp(-t * 1.6) * np.clip(t / .02, 0, 1)
    s += lp(n, 300) * np.exp(-t * 3) * .8
    return s / np.max(np.abs(s))


def ticks(d=1.3, n0=10):
    out = np.zeros(int(d * SR))
    k = np.linspace(0, 1, n0) ** 0.6
    for j, x in enumerate(k):
        b = blip(1400 + 900 * x, .03); s = int(x * (d - .05) * SR); out[s:s + len(b)] += b
    return out


ev = [
    (whoosh(0.6), V(0.0), .22, 0),
    (impact(1.4, 50), V(w(2)), .40, 0),
    (whoosh(0.8, 300, 2600), V(2.65), .22, 0),
    (hiss(5.0, True), V(3.1), .06, 0),
    (blip(1300, .14, 1500), V(w(10)), .20, 0),
    (whoosh(0.5), V(8.1), .16, 0),
    (impact(1.5, 46), V(w(22)), .40, 0),
    (whoosh(0.9, 400, 3200), V(10.95), .22, 0),
    (click(), V(w(40)), .32, 0), (blip(700, .1, 520), V(w(40) + .1), .12, 0),
    (blip(1700, .2, 2100), V(w(44)), .24, 0),
    (shimmer(1.4), V(20.95), .14, 0),
    (click(), V(w(53)), .20, 0),
    (click(), V(w(55)), .22, 0),
    (impact(1.3, 52), V(w(57)), .26, 0),
    (heartbeat(), V(28.85), .40, 0), (reverse_swell(0.75), V(28.85), .2, 0),
    (impact(1.4, 48), V(29.45), .30, 0),
    (blip(1100, .14, 1300), V(w(73)), .18, 0),
    (hiss(1.2, False), V(w(74)), .08, 0),
    (whoosh(1.2, 300, 2000), V(w(86) - .1), .18, 0),
    (hiss(1.0, False), V(w(97)), .12, 0),
    (blip(1180, .14, 1400), V(w(101)), .18, 0),
    (click(), V(w(107)), .22, 0),
    (impact(1.0, 70), V(w(116)), .22, -.2), (impact(1.0, 70), V(w(118)), .24, .2),
    (click(), V(w(120)), .20, 0),
    (whoosh(0.9, 300, 3000), V(w(132) - .3), .22, 0),
    (heartbeat(), V(59.42), .40, 0), (reverse_swell(0.6), V(59.4), .2, 0),
    (impact(1.5, 46), V(w(135)), .34, 0),
    (blip(2100, .06), V(w(141)), .10, -.3), (blip(2300, .06), V(w(141) + .15), .09, .3), (blip(2000, .06), V(w(141) + .3), .08, 0),
    (blast(1.3), V(w(151) - .1), .16, 0),
    (hiss(1.8, True), V(w(152)), .09, 0),
    (blast(1.8), V(w(159)), .30, 0),
    (click(), V(w(164)), .22, -.2), (click(), V(w(167)), .22, .2),
    (blip(1180, .14, 1400), V(w(171)), .16, 0),
    (hiss(1.5, False), V(w(179)), .14, -.3),
    (blip(1500, .18, 1900), V(w(184)), .22, 0),
    (ticks(1.4, 12), V(w(190)), .16, 0),
    (impact(1.4, 50), V(w(197)), .32, 0),
    (blip(1400, .1, 1600), V(w(204)), .16, 0),
    (ticks(1.0, 9), V(w(209)), .14, 0),
    (blip(1500, .18, 1500), V(w(213)), .18, 0),
    (blip(1250, .1), V(w(224)), .16, -.2), (blip(1250, .1), V(w(225)), .16, .2),
    (whoosh(0.9, 500, 4000), V(102.7), .16, 0),
    (shimmer(2.0), V(103.0), .2, 0),
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
