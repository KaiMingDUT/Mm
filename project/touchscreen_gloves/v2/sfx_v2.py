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
    s = int(t * SR)
    if s < 0: sig = sig[-s:]; s = 0
    e = min(N, s + len(sig))
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


LEAD = 0.15
_V0 = V
V = lambda ts: _V0(ts - LEAD)      # picture leads the voice; SFX follow the picture
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


def puff(d=.35):
    t = tt(d); n = rng.standard_normal(len(t))
    s = hp(lp(n, 6000), 500) * np.exp(-t * 9) * np.clip(t / .005, 0, 1)
    return s / np.max(np.abs(s))


def ticks(d=1.3, n0=10, f0=1400, f1=2300):
    out = np.zeros(int(d * SR))
    k = np.linspace(0, 1, n0) ** 0.6
    for x in k:
        b = blip(f0 + (f1 - f0) * x, .03); s = int(x * (d - .05) * SR); out[s:s + len(b)] += b
    return out


def motor(d=5.0, f0=180, f1=820):
    t = tt(d); f = np.geomspace(f0, f1, len(t)); ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) + .5 * np.sin(2 * ph) + .25 * np.sin(3.01 * ph)
    s *= (1 + .15 * np.sin(2 * np.pi * 9 * t)) * np.clip(t / .4, 0, 1) * np.clip((d - t) / .3, 0, 1)
    return lp(s, 2500) / 2.2


def whirr(d=4.0):
    t = tt(d); n = rng.standard_normal(len(t))
    s = hp(lp(n, 1800), 300) * (.6 + .4 * np.sin(2 * np.pi * 38 * t)) + .4 * np.sin(2 * np.pi * 115 * t)
    s *= np.clip(t / .5, 0, 1) * np.clip((d - t) / .6, 0, 1)
    return s / np.max(np.abs(s))


def glitch(d=.32):
    out = np.zeros(int(max(d, .35) * SR))
    for k in range(6):
        b = blip(300 + 900 * rng.random(), .04, 200 + 1500 * rng.random()); s = int(k * .05 * SR); out[s:s + len(b)] += b * (.7 + .3 * rng.random())
    return out


def stamp():
    t = tt(.5)
    s = np.sin(2 * np.pi * np.cumsum(90 + 120 * np.exp(-t * 40)) / SR) * np.exp(-t * 10)
    s += hp(rng.standard_normal(len(t)), 2000) * np.exp(-t * 60) * .5
    return s / np.max(np.abs(s))


def thud(d=.6):
    t = tt(d)
    s = np.sin(2 * np.pi * np.cumsum(55 + 60 * np.exp(-t * 25)) / SR) * np.exp(-t * 8) + lp(rng.standard_normal(len(t)), 400) * np.exp(-t * 12) * .6
    return s / np.max(np.abs(s))


def deflate(d=1.4):
    t = tt(d); n = rng.standard_normal(len(t))
    f = 180 + 120 * np.sin(2 * np.pi * 11 * t) * (1 - t / d)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * .6 + hp(lp(n, 2500), 400) * .5
    s *= np.clip(t / .03, 0, 1) * np.clip((d - t) / .4, 0, 1)
    return s / np.max(np.abs(s))


def kaching():
    out = np.zeros(int(1.0 * SR))
    for k, f in enumerate((2637, 3136, 3951)):
        b = blip(f, .6, f) ; s = int(k * .045 * SR); out[s:s + len(b)] += b * .7
    out[:int(.05 * SR)] += hp(rng.standard_normal(int(.05 * SR)), 3000) * .4
    return out


def pop():
    t = tt(.12)
    return np.sin(2 * np.pi * np.cumsum(np.geomspace(400, 1400, len(t))) / SR) * np.exp(-t * 35)




def kaching():
    out = np.zeros(int(1.0 * SR))
    for k, f in enumerate((2637, 3136, 3951)):
        b = blip(f, .6, f) ; s = int(k * .045 * SR); out[s:s + len(b)] += b * .7
    out[:int(.05 * SR)] += hp(rng.standard_normal(int(.05 * SR)), 3000) * .4
    return out


def pop():
    t = tt(.12)
    return np.sin(2 * np.pi * np.cumsum(np.geomspace(400, 1400, len(t))) / SR) * np.exp(-t * 35)


def chime(f=1760):
    t = tt(1.2)
    return (np.sin(2 * np.pi * f * t) + .5 * np.sin(2 * np.pi * 1.5 * f * t)) * np.exp(-t * 4) * np.clip(t / .003, 0, 1)



def wind(d):
    t = tt(d); n = rng.standard_normal(len(t))
    s = lp(lp(n, 500), 900) * (.6 + .4 * np.sin(2 * np.pi * .23 * t) * np.sin(2 * np.pi * .11 * t + 1))
    s += hp(lp(n, 5000), 2500) * .08
    s *= np.clip(t / .3, 0, 1) * np.clip((d - t) / .3, 0, 1)
    return s / (np.max(np.abs(s)) + 1e-9)


def fabric_tap():
    t = tt(.16); n = rng.standard_normal(len(t))
    s = lp(n, 700) * np.exp(-t * 40) + np.sin(2 * np.pi * np.cumsum(120 + 80 * np.exp(-t * 60)) / SR) * np.exp(-t * 30) * .6
    return s / np.max(np.abs(s))


def zap(d=.5):
    t = tt(d); out = np.zeros(len(t))
    for k in range(9):
        s = int(rng.random() * (d - .06) * SR); m = int(.03 * SR)
        out[s:s + m] += hp(rng.standard_normal(m), 3000) * np.exp(-np.arange(m) / SR * 90)
    buzz = np.sign(np.sin(2 * np.pi * 110 * t)) * .25 * np.exp(-t * 4)
    s = out + lp(buzz, 3000)
    return s / np.max(np.abs(s))


def bubbles(d=2.2):
    out = np.zeros(int(d * SR))
    for k in range(16):
        b = blip(500 + 900 * rng.random(), .08, 1400 + 1200 * rng.random()) * (.4 + .6 * rng.random()); s = int(rng.random() * (d - .1) * SR); out[s:s + len(b)] += b
    return out


def riser(d=1.2):
    t = tt(d); f = np.geomspace(200, 2400, len(t))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * .4 + hiss(d, True) * .7
    return s * (t / d) ** 2


VEND = V(117.64)
# cuts between shots (story time) -> whoosh, alternating pan
CUTS = [w(1) - .05, w(7) - .05, w(11) - .05, w(18) - .05, w(24) - .05, w(29) - .05, w(34) - .05, w(42) - .05, w(46) - .05, w(53) - .05, w(59) - .05, w(66) - .05,
        w(76) - .05, w(85) - .05, w(94) - .05, w(102) - .05, w(119) - .05, w(124) - .05, w(128) - .05, w(132) - .05, w(139) - .05, w(147) - .05,
        w(152) - .05, w(159) - .05, w(170) - .05, w(176) - .05, w(183) - .05, w(188) - .05, w(195) - .05, w(201) - .05, w(207) - .2]
ev = [(whoosh(.38, 700, 5200), V(c) - .2, .16, (-.35 if i % 2 else .35)) for i, c in enumerate(CUTS)]
# recap montage: rapid whooshes
rs, re_ = w(207) - .2, 117.64
for k in range(12):
    ev.append((whoosh(.25, 1200, 6000), V(rs + k * (re_ - rs) / 12) - .1, .1, (-.4 if k % 2 else .4)))
NIGHT = [(0, w(29) + 2.6), (w(147) - .05, w(152) - .05), (w(195) - .05, w(201) - .05)]
for a, b in NIGHT:
    ev.append((wind(V(b) - V(a) + .4), V(a) - .2, .05, 0))
ev += [
    (impact(1.4, 46), V(0) + .02, .3, 0), (shimmer(1.2), V(.2), .08, 0),
    *[(fabric_tap(), V(x), .3, 0) for x in (w(2) + .05, w(5) + .1, w(6) + .05, w(8) + .05, w(9), w(10) + .05)],
    *[(blip(330, .16, 250), V(x) + .05, .12, 0) for x in (w(2) + .05, w(5) + .1, w(6) + .05, w(8) + .05, w(9), w(10) + .05)],
    (thud(.6), V(w(13)), .45, 0), (impact(1.4, 44), V(w(13)) + .02, .3, 0), (blip(300, .3, 220), V(w(17)), .2, 0),
    (whoosh(.6, 3000, 600), V(w(22) - .05), .3, .2),
    (riser(1.0), V(w(32)) - 1.0, .08, 0), (click(), V(w(32)), .28, 0), (chime(1760), V(w(32)), .26, 0), (pop(), V(w(32) + .12), .2, 0),
    (pop(), V(w(40)), .18, 0), (whoosh(.9, 300, 1600), V(w(42)) - .05, .2, 0), (thud(.3), V(w(42) + 1.2), .18, 0),
    (fabric_tap(), V(w(56) + .05), .28, -.4), (click(), V(w(56) + .05), .25, .4), (chime(1976), V(w(56) + .1), .22, .4), (blip(330, .2, 250), V(w(56) + .1), .14, -.4),
    (heartbeat(), V(29.9), .4, 0), (reverse_swell(.55), V(29.88), .2, 0),
    (impact(1.5, 46), V(w(62) - .1), .34, 0), (zap(.9), V(w(62)), .22, 0), (zap(.7), V(w(63) + .2), .14, .3),
    (riser(1.2), V(w(69)) - 1.25, .2, 0), (impact(1.0, 60), V(w(69)) - .03, .2, 0),
    (click(), V(w(71)), .2, 0), (click(), V(w(72) + .1), .2, 0), *[(thud(.15), V(w(73)) + d, .2 * (1 - k * .25), 0) for k, d in enumerate((.05, .3, .5, .66))],
    (impact(1.3, 52), V(w(82)), .28, 0), (shimmer(1.4), V(w(82)) + .05, .12, 0),
    (whoosh(1.0, 300, 2400), V(w(85)), .22, 0), (motor(3.0, 90, 140), V(w(88)), .06, 0),
    (scan(1.3), V(w(95)), .16, 0), (ticks(3.0, 20, 1500, 2200), V(w(96)), .08, 0),
    (whoosh(1.9, 400, 3000), V(w(102)), .26, 0), (impact(1.3, 50), V(w(105)), .26, 0),
    (riser(3.5), V(w(118)) - 3.5, .1, 0),
    (heartbeat(), V(61.45), .4, 0), (reverse_swell(.55), V(61.43), .2, 0),
    (bubbles(2.4), V(w(119)), .14, 0), (shimmer(1.0), V(w(122)), .12, -.2), (shimmer(1.0), V(w(123)), .12, .2), (zap(.8), V(w(126)), .16, 0), (bubbles(2.0), V(w(125)), .1, 0),
    (thud(.3), V(w(130)), .22, 0), (click(), V(w(130)), .2, 0), (hiss(1.4, True), V(w(132)), .12, 0), (zap(.5), V(w(133)), .1, 0),
    (blip(2200, .08), V(w(143)), .2, 0), (blip(2600, .08), V(w(143) + .1), .18, 0), (impact(1.0, 56), V(w(146)), .24, 0), (chime(1568), V(w(146)) + .02, .18, 0),
    (whoosh(.7, 600, 2600), V(w(149)), .26, -.2),
    (thud(.45), V(w(155)), .3, 0), (blip(300, .3, 220), V(w(163)), .2, 0), (blip(280, .3, 200), V(w(169)), .15, 0),
    (whoosh(.3, 2000, 6000), V(w(176) - .2), .2, 0), (impact(1.3, 48), V(w(178)), .3, 0), (zap(.4), V(w(178)) + .05, .14, 0),
    (shimmer(1.4), V(w(186)), .16, 0), (zap(1.0), V(w(190)), .18, 0), (shimmer(1.4), V(w(191)), .12, 0),
    (fabric_tap(), V(w(196) + .1), .26, 0), (click(), V(w(196) + .1), .22, 0), (chime(1976), V(w(196) + .15), .26, 0), (kaching(), V(w(196) + .2), .1, 0),
    (click(), V(w(207) - .25), .26, 0), (pop(), V(w(207) - .2), .22, 0), (impact(1.2, 48), V(w(207)), .22, 0),
    (whoosh(0.9, 500, 4000), V(117.3), .16, 0), (shimmer(2.0), V(117.6), .2, 0),
]
for sig, t, g, pan in ev:
    place(sig, t, g, pan)
st = np.stack([L, R], 1)
peak = np.max(np.abs(st))
if peak > 0.98:
    st *= 0.98 / peak
with wave.open(OUT, 'wb') as wv:
    wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(SR)
    wv.writeframes((st * 32767).astype(np.int16).tobytes())
print('wrote', OUT, 'events', len(ev))
