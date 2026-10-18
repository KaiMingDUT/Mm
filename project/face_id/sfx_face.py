"""KROZO sound design for the Face ID reel — synthesized SFX placed on the narration timeline.
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
HERE = os.path.dirname(os.path.abspath(__file__))
_K = json.load(open(os.path.join(HERE, 'warp.json')))['knots']


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
W = json.load(open(os.path.join(HERE, 'words3.json')))
w = lambda i: W[i]['s']
e = lambda i: W[i]['e']


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




def ding():
    # cabin PA chime: high-low two-tone
    out = np.zeros(int(1.8 * SR))
    for k, f in enumerate((1318.5, 1046.5)):
        t = tt(1.3); s = (np.sin(2 * np.pi * f * t) + .35 * np.sin(2 * np.pi * 2 * f * t) + .12 * np.sin(2 * np.pi * 3 * f * t)) * np.exp(-t * 3.2) * np.clip(t / .004, 0, 1)
        st = int(k * .42 * SR); out[st:st + len(s)] += s[:len(out) - st]
    return out / np.max(np.abs(out))


def gsm_buzz(d=2.0):
    # the "dit-dit-dit" a GSM phone induces in speakers: 217 Hz TDMA bursts, grouped
    t = tt(d); g = (np.sin(2 * np.pi * 217 * t) > .6).astype(float)
    grp = ((t % .55) < .32).astype(float)
    s = hp(g * grp - (g * grp).mean(), 120) + .2 * np.sign(np.sin(2 * np.pi * 1733 * t)) * g * grp
    s *= np.clip(t / .05, 0, 1) * np.clip((d - t) / .1, 0, 1)
    return lp(s, 5000) / (np.max(np.abs(s)) + 1e-9)


def rewind(d=1.0):
    t = tt(d); f = 900 + 2500 * (t / d) ** .5
    s = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * .15 + hp(lp(rng.standard_normal(len(t)), 7000), 1500) * .5
    s *= (.6 + .4 * np.sin(2 * np.pi * 23 * t)) * np.clip(t / .05, 0, 1) * np.clip((d - t) / .15, 0, 1)
    return s / np.max(np.abs(s))


def dive(d=1.0):
    t = tt(d); f = np.geomspace(900, 160, len(t))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * .6 + hiss(d, False) * .5
    s *= np.clip(t / .05, 0, 1) * np.clip((d - t) / .2, 0, 1)
    return s / np.max(np.abs(s))


def static(d=1.0):
    t = tt(d); n = rng.standard_normal(len(t))
    s = hp(lp(n, 4000), 600) * (.5 + .5 * (rng.random(len(t)) > .995).astype(float).cumsum() % 2)
    s *= np.clip(t / .05, 0, 1) * np.clip((d - t) / .2, 0, 1)
    return s / (np.max(np.abs(s)) + 1e-9)


def ping(f=1400, d=1.2):
    t = tt(d)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 5) * np.clip(t / .002, 0, 1)
    s += np.sin(2 * np.pi * f * 1.5 * t) * np.exp(-t * 9) * .3
    return s / np.max(np.abs(s))


def cabin_air(d):
    # cruise ambience: engine drone + air-con hiss
    t = tt(d); n = rng.standard_normal(len(t))
    s = lp(lp(n, 260), 260) * 3 + .35 * np.sin(2 * np.pi * 83 * t) * (1 + .2 * np.sin(2 * np.pi * .3 * t)) + hp(lp(n, 3500), 900) * .12
    s *= np.clip(t / .4, 0, 1) * np.clip((d - t) / .4, 0, 1)
    return s / (np.max(np.abs(s)) + 1e-9)


def soft_voice(d=1.0):
    # filtered murmur standing in for "someone talking quietly"
    t = tt(d); n = rng.standard_normal(len(t))
    s = hp(lp(n, 900), 250) * (.5 + .5 * np.abs(np.sin(2 * np.pi * 3.3 * t + np.sin(2 * np.pi * .7 * t))))
    return s * np.clip(t / .1, 0, 1) * np.clip((d - t) / .2, 0, 1) / 3


def loud_voice(d=1.0):
    t = tt(d); n = rng.standard_normal(len(t))
    f = 180 + 40 * np.sin(2 * np.pi * 4.7 * t)
    s = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * .35 + hp(lp(n, 3000), 500) * .5
    s *= (.4 + .6 * np.abs(np.sin(2 * np.pi * 5.1 * t))) * np.clip(t / .05, 0, 1) * np.clip((d - t) / .15, 0, 1)
    return lp(s, 3500) / 1.5


def err_buzz():
    out = np.zeros(int(.5 * SR))
    for k, f in enumerate((233, 185)):
        t = tt(.16); s = np.sign(np.sin(2 * np.pi * f * t)) * np.exp(-t * 9) * np.clip(t / .004, 0, 1); st = int(k * .17 * SR); out[st:st + len(s)] += lp(s, 2500)
    return out / np.max(np.abs(out))


def unlock():
    out = np.zeros(int(1.0 * SR)); c = click(); out[:len(c)] += c * .8
    for k, f in enumerate((1568, 2093)):
        b = blip(f, .5, f * 1.01) * .7; st = int((.05 + k * .08) * SR); out[st:st + len(b)] += b
    return out / np.max(np.abs(out))


def swish(d=.5):
    t = tt(d); n = rng.standard_normal(len(t))
    s = hp(lp(n, 6000), 1200) * np.sin(np.pi * t / d) ** 3
    return s / np.max(np.abs(s))


VE = W[91]['e'] + .05
CUTS = [.78, w(5), w(8), w(13), w(18), e(20) + .55, w(31), w(35), w(44), w(48), w(56), w(63), e(66) + .4, w(74), w(81)]
ev = [(whoosh(.4, 700, 5200), V(c) - .22, .14, (-.35 if i % 2 else .35)) for i, c in enumerate(CUTS)]
hb = lambda x: [(heartbeat(), V(x), .42, 0), (heartbeat(), V(x + .33), .3, 0)]
ev += [
    (impact(1.4, 46), V(0) + .02, .22, 0), (shimmer(1.2), V(.1), .08, 0),
    (swish(.6), V(w(2)), .3, .4), (thud(.25), V(w(4) + .3), .12, 0),
    (scan(1.0), V(w(5)), .14, 0), (ticks(.8, 8, 1500, 2100), V(w(5)) + .1, .07, 0),
    (err_buzz(), V(w(7)) - .03, .3, 0), (thud(.4), V(w(7)), .22, 0),
    (swish(.6), V(w(8)), .25, -.4), (scan(1.0), V(w(10)), .14, 0),
    (unlock(), V(w(12)) - .03, .3, 0), (chime(1976), V(w(12)) + .02, .16, 0), (pop(), V(w(12)) + .55, .14, 0),
    (pop(), V(w(16)), .18, 0), (impact(1.0, 60), V(w(16)), .14, 0),
    *hb(e(20) + .05), (reverse_swell(.6), V(e(20)) - .1, .14, 0),
    (stamp(), V(w(30)) + .1, .2, 0),
    (blip(1800, .08), V(w(33)), .16, -.2), (blip(2200, .08), V(w(34)), .16, .2),
    (reverse_swell(.8), V(w(36)) - .7, .14, 0), (hiss(2.0, True), V(w(36)), .14, 0), (ticks(V(w(43)) - V(w(39)), 30, 1500, 2600), V(w(39)), .08, 0),
    (shimmer(1.2), V(w(43)), .12, 0),
    (click(), V(w(44)), .26, 0), (static(.6), V(w(44)), .05, 0),
    (whoosh(1.6, 300, 1800), V(w(48)), .18, 0),
    (shimmer(1.6), V(w(57)), .14, 0), (riser(1.2), V(w(63)) - 1.0, .1, 0), (impact(1.3, 50), V(w(63)), .26, 0), (shimmer(1.4), V(w(65)), .14, 0),
    (whoosh(1.4, 300, 2000), V(w(75)), .2, 0), (thud(.5), V(w(77)), .22, 0),
    (blip(900, .12, 1500), V(w(88)), .14, .3), (blip(1500, .12, 800), V(w(91)), .14, -.3),
    (reverse_swell(.4), V(0), .16, 0), (glitch(.3), V(.74), .14, 0),
    (impact(1.2, 50), V(e(91) + .1), .3, 0), (err_buzz(), V(e(91) + .1), .16, -.4), (unlock(), V(e(91) + .25), .2, .4),
    (whoosh(1.2, 300, 3000), V(VE) + .55, .2, 0), (impact(1.6, 44), V(VE + .9), .2, 0), (shimmer(2.0), V(VE + .95), .16, 0),
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
print('wrote', OUT, 'events', len(ev), 'video end', round(V(VE + 3.2), 2))
