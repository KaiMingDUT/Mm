"""KROZO sound design for the AirTag reel — synthesized SFX placed on the narration timeline.
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

# ── extra library (AirTag v2) ──
def pa_chime():       # airport public-address "ding-dong"
    out = np.zeros(int(1.6 * SR))
    for k, f in enumerate((784, 622)):
        t = tt(1.1); s = sum(np.sin(2 * np.pi * f * m * t) * a for m, a in ((1, 1), (2, .35), (3, .12))) * np.exp(-t * 3.2)
        o = int(k * .42 * SR); out[o:o + len(s)] += s
    return out / np.max(np.abs(out))
def step():           # soft footstep on hard floor
    t = tt(.16); n = rng.standard_normal(len(t))
    s = lp(n, 900) * np.exp(-t * 38) + np.sin(2 * np.pi * 70 * t) * np.exp(-t * 30) * .6
    return s / np.max(np.abs(s))
def zipper(d=.5):
    t = tt(d); n = rng.standard_normal(len(t)); teeth = (np.sin(2 * np.pi * (60 + 140 * t / d) * t) > .6).astype(float)
    s = hp(n, 1500) * (.3 + teeth) * np.clip(t / .03, 0, 1) * np.clip((d - t) / .05, 0, 1)
    return s / np.max(np.abs(s))
def flyover(d=3.0):    # jet passing: filtered noise swelling with a falling whine (doppler)
    t = tt(d); n = rng.standard_normal(len(t)); env = np.exp(-((t - d * .45) / (d * .28)) ** 2)
    whine = np.sin(2 * np.pi * np.cumsum(1900 - 700 * t / d) / SR) * .12
    s = (lp(n, 1200) * .8 + whine) * env
    return s / np.max(np.abs(s))
def drop(d=1.8, f0=120, f1=32):   # cinematic sub drop
    t = tt(d); f = f1 + (f0 - f1) * np.exp(-t * 3.5)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6) * np.clip(t / .01, 0, 1)
    return s / np.max(np.abs(s))
def clock(d=2.0, bpm=150):
    out = np.zeros(int(d * SR)); per = 60 / bpm
    for k in range(int(d / per)):
        t = tt(.05); f = 2400 if k % 2 else 1800; s = np.sin(2 * np.pi * f * t) * np.exp(-t * 120)
        o = int(k * per * SR); out[o:o + len(s)] += s[:len(out) - o]
    return out
def chatter(d=1.2):   # data / encryption chatter
    out = np.zeros(int(d * SR)); k = 0
    while k * .045 < d - .05:
        t = tt(.03); f = rng.choice([1200, 1500, 1800, 2400, 3000]); s = np.sign(np.sin(2 * np.pi * f * t)) * np.exp(-t * 60) * .5
        o = int(k * .045 * SR); out[o:o + len(s)] += s; k += 1
    return lp(out, 6000)
def bt_chirp():       # signature "Bluetooth beacon" chirp
    t = tt(.28); f = 1400 + 1400 * t / .28
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * np.clip(t / .005, 0, 1)
    return s / np.max(np.abs(s))
def lock_click():
    return click() * .7 + np.concatenate([np.zeros(int(.06 * SR)), click()])[:len(click())] * 0 + click() * .3

# ── events ──
VE = 103.0
SH = [4, 11, 17, 26, 30, 41, 47, 52, 57, 61, 67, 82, 89, 92, 98, 106, 112, 119, 131, 142, 144, 148, 152, 162, 170, 173]
CUTS = [w(i) - .05 for i in SH]
ev = [(whoosh(.4, 700, 5200), V(c) - .22, .13, (-.35 if i % 2 else .35)) for i, c in enumerate(CUTS)]
hb = lambda x, g=.42: [(heartbeat(), V(x), g, 0), (heartbeat(), V(x + .33), g * .72, 0)]
ev += [
    # hook: lost bag beaconing in the airport, you walk by
    (pa_chime(), V(.1), .12, -.2), (impact(1.4, 46), V(0) + .02, .2, 0),
    *[(bt_chirp(), V(.3 + k * 1.1), .06, -.3) for k in range(4)],
    *[(step(), V(.2 + k * .55), .09, .15) for k in range(7)],
    (shimmer(1.2), V(2.2), .1, .2), (riser(.8), V(w(8)) - .8, .08, 0),
    (pop(), V(w(8)), .22, 0), (chime(1760), V(w(8)) + .04, .16, 0),
    (drop(1.2, 90, 40), V(w(16)) + .25, .2, 0),                                   # beat after "أصلًا!"
    (blip(330, .25, 220), V(w(13)), .14, 0),
    *[(bt_chirp(), V(w(17)) + k * 1.0, .05, 0) for k in range(5)], (riser(1.0), V(w(22)), .08, 0), (whoosh(.8, 300, 3000), V(w(24)), .1, 0),
    (dive(1.0), V(w(26)), .1, 0), *hb(w(29) + .55),
    (scan(1.3), V(w(37)), .14, 0), (ticks(V(w(40)) - V(w(37)) + .3, 16, 1400, 2400), V(w(37)), .08, 0), (stamp(), V(w(40)) + .2, .18, 0),
    *hb(w(40) + .6, .48), (drop(2.0), V(w(40)) + .45, .2, 0),                         # long question beat
    (reverse_swell(1.4), V(w(41)) - .9, .14, 0), (drop(1.6, 80, 30), V(w(41)) + .3, .16, 0),   # "السر…"
    (impact(1.6, 42), V(w(46)), .32, 0), (shimmer(1.8), V(w(46)) + .02, .18, 0), (blast(1.2), V(w(46)) + .02, .05, 0),
    (whoosh(1.2, 300, 2400), V(w(47)) + .3, .16, 0), (riser(1.0), V(w(51)) + .1, .08, 0),
    (blip(1600, .1), V(w(53)), .14, 0), (ticks(.6, 6, 2400, 2600), V(w(53)) + .1, .06, 0),
    (thud(.4), V(w(59)) + .2, .22, 0), (zipper(.55), V(w(60)) + .3, .14, .2), (click(), V(w(60)) + .9, .2, 0),
    (scan(1.2), V(w(62)), .12, 0), *[(bt_chirp(), V(w(63)) + k * .9, .07, 0) for k in range(3)],
    (whoosh(1.0, 300, 2600), V(w(67)), .2, 0), (deflate(1.0), V(w(67)) + .3, .06, 0),
    (glitch(.35), V(w(74)), .2, 0), (thud(.3), V(w(74)), .18, 0),
    (glitch(.35), V(w(76)) + .1, .2, 0), (thud(.3), V(w(76)) + .1, .18, 0),
    (glitch(.35), V(w(80)), .2, 0), (thud(.3), V(w(80)), .18, 0), (drop(1.2, 100, 40), V(w(81)) + .4, .16, 0),
    (whoosh(.9, 2000, 400), V(w(83)), .18, 0), (click(), V(w(85)), .2, 0), *hb(w(88) + .6),
    (dive(1.0), V(w(89)) + .2, .22, 0), (reverse_swell(.8), V(w(91)) + .1, .12, 0),
    *[(bt_chirp(), V(w(93)) + k * 1.0, .06, 0) for k in range(6)],
    *[(blip(1200 + 200 * k, .12), V(w(99)) + .8 + k * .45, .1, (k - 2.5) * .25) for k in range(4)], (chime(1568), V(w(105)) + .3, .1, 0),
    (pa_chime(), V(w(106)), .16, 0), *[(step(), V(w(107)) + k * .5, .08, .3) for k in range(8)],
    (flyover(3.2), V(w(113)), .2, 0), (motor(V(w(118)) - V(w(112)) + .4, 120, 260), V(w(112)), .04, 0),
    (blip(330, .25, 220), V(w(123)), .14, 0), (static(.8), V(w(126)), .05, 0), (drop(1.4, 90, 35), V(w(130)) + .3, .16, 0),
    *[(step(), V(w(131)) + k * .55, .09, -.2 + k * .04) for k in range(int((V(w(142)) - V(w(131))) / .55))],
    (clock(V(w(142)) - V(w(140)) - .1, 150), V(w(140)), .05, 0), (riser(2.4), V(w(142)) - 2.5, .09, 0), *hb(w(141) + .3, .5),
    (impact(1.4, 48), V(w(142)) - .05, .12, 0), (bt_chirp(), V(w(142)) - .03, .08, 0), (chime(1976), V(w(143)) + .55, .12, 0), (ping(2093, .9), V(w(143)) + .6, .07, 0),   # keep "يلتقط الإشارة!" clear
    (reverse_swell(1.2), V(w(146)) - 1.2, .16, 0), (shimmer(2.2), V(w(146)), .18, 0), (drop(2.2, 110, 30), V(w(147)) + .4, .16, 0),
    *[(ping(1046 + 262 * k, .8), V(w(149)) + k * .15, .08, (k - 1.5) * .3) for k in range(4)], (chatter(.6), V(w(150)), .05, 0),
    (stamp(), V(87.72), .15, 0), (thud(.5), V(87.72), .13, 0), (blip(1800, .12), V(87.8), .09, 0),   # in the gap after "اللي اكتشف فيه"
    (chatter(1.3), V(w(165)) - .2, .1, 0), (glitch(.35), V(w(165)) + .7, .12, 0), (click(), V(w(166)), .2, 0), (thud(.25), V(w(166)) + .03, .14, 0),
    (whoosh(1.2, 500, 4000), V(w(170)), .2, 0), (shimmer(1.2), V(w(172)), .12, 0),
    (pop(), V(w(178)) + .1, .22, 0), (chime(1568), V(w(179)), .2, 0), (ping(1760, 1.0), V(w(179)) + .2, .12, 0),
    (whoosh(1.2, 300, 3000), V(VE) - .2, .2, 0), (impact(1.6, 44), V(VE + .35), .22, 0), (shimmer(2.0), V(VE + .4), .18, 0),
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
print('wrote', OUT, 'events', len(ev), 'video end', round(V(VE + 2.6), 2))
