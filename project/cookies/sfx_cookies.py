"""KROZO sound design for the cookies reel — synthesized SFX placed on the narration timeline.
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

# ── heartbeat model (same as engine/timeline.js) ──
def beep(f=1000, d=.12):
    t = tt(d); return np.sin(2 * np.pi * f * t) * np.clip(t / .004, 0, 1) * np.clip((d - t) / .03, 0, 1) * .8

# hits/chimes never sit on a spoken word: gap(ts) = ts if it falls in a pause, else the start of the next pause (story time)
PZ = [tuple(map(float, l.split())) for l in open(os.path.join(HERE, 'pauses_m.txt')) if l.strip()]
PZ = [(x, y) for x, y in PZ if y - x >= .12]
def gap(ts):
    for x, y in PZ:
        if x - .02 <= ts <= y - .05: return ts
        if x > ts: return x + .02
    return ts
G = lambda ts: _V0(gap(ts))   # voice time, no picture lead: the lead would pull the hit back into the word
_PLAN = json.load(open(os.path.join(HERE, 'warp.json')))['plan']
def Gt(i):
    """story time of the splice in the gap after word i (where warp.py removed the silence/breath): the voiced tail is over"""
    for a, b, new in _PLAN:
        if W[i]['e'] - .05 <= a <= W[i + 1]['s']: return a + .01
    return W[i]['e'] + .12
Gw = lambda i: _V0(Gt(i))

def key(d=.05):
    """keyboard key: short filtered click + body"""
    t = tt(d); n = rng.standard_normal(len(t))
    return hp(n, 1800) * np.exp(-t * 180) * .7 + np.sin(2 * np.pi * 260 * t) * np.exp(-t * 90) * .4


def flip(d=.4):
    """paper page flip"""
    t = tt(d); n = rng.standard_normal(len(t))
    return hp(lp(n, 6000), 900) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2 * (1 + .5 * np.sin(2 * np.pi * 34 * t))


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


def braam(d=1.6, f=55):
    """low brass-like hit: detuned saws through an opening low-pass, slow decay"""
    t = tt(d); ph = 2 * np.pi * np.cumsum(np.full(len(t), f)) / SR
    saw = sum(((ph * m / (2 * np.pi) + k * .37) % 1) * 2 - 1 for m, k in ((1, 0), (1.006, 1), (1.5, 2), (2.003, 3)))
    env = np.clip(t / .03, 0, 1) * np.exp(-t * 2.2)
    out = np.zeros(len(t)); acc = 0.0; cut = 200 + 1800 * np.exp(-t * 3)
    a = np.exp(-2 * np.pi * cut / SR)
    for i in range(len(t)): acc = (1 - a[i]) * saw[i] + a[i] * acc; out[i] = acc
    s = out * env; return s / np.max(np.abs(s))


def dg(f=1760, d=.5):
    """short bright ding for the 0.17 s gaps: rings out before the next word"""
    t = tt(d); return (np.sin(2 * np.pi * f * t) + .5 * np.sin(2 * np.pi * 1.5 * f * t)) * np.exp(-t * 11) * np.clip(t / .003, 0, 1)


def swish(d=.28):
    """fast whip-pan swish"""
    return whoosh(d, 1800, 7000)


# ── events (v2: more energy; hits/booms only in gaps, everything under a word stays ≥ 15 dB down) ──
VE = 45.55
SH = [9, 12, 18, 21, 28, 36, 43, 51, 60, 66, 72, 77, 89]
WHIP = {12, 18, 43, 72}
CUTS = [w(i) - .05 for i in SH]
ev = [(whoosh(.4, 700, 5200), V(c) - .22, .07, (-.35 if k % 2 else .35)) for k, c in enumerate(CUTS)]
ev += [(swish(), V(w(i) - .05) - .12, .06, (.5 if i % 2 else -.5)) for i in WHIP]
hb = lambda x, g=.42, d=.33: [(heartbeat(), _V0(x), g, 0), (heartbeat(), _V0(x + d), g * .72, 0)]   # keep both beats inside the pause
for i in range(9):
    c, r = i % 3 - 1, i // 3 - 1; d = (c * c + r * r) ** .5
    st = w(1) - .1 + (0 if i == 4 else .25 + d * .22 + (i % 2) * .12)
    ev.append((pop(), V(st) + .05, .022 if i != 4 else .035, c * .5))
    if i != 4: ev.append((click(), V(w(8) + d * .1), .03, c * .5))
ev += [
    # K1 hook: a hit before the first word, a riser into the click, a sub-drop in the first gap
    (impact(1.0, 46), V(0) + .02, .2, 0), (shimmer(1.0), V(.1), .08, 0),
    (riser(1.2), V(w(7)) - 1.15, .035, 0), (click(), V(w(7)), .08, 0),
    (drop(1.0, 110, 34), Gw(8), .3, 0), (pop(), Gw(8), .1, 0),
    # K2 the question: tension under it, then glitch + boom + heartbeat in the beat
    (braam(2.4, 41), V(w(10)), .035, 0), (ticks(1.4, 10, 900, 1300), V(w(13)), .03, 0),
    (glitch(.3), Gw(17), .1, 0), (drop(1.4, 100, 30), Gw(17), .3, 0), *hb(Gt(17) + .08, d=.26),
    # K3 shopping: add to cart, the shoe flies, ka-ching in the gap, you leave with a whoosh
    (click(), V(w(22) + .05), .08, 0), (whoosh(.5, 900, 4200), V(w(22) + .3), .05, .2),
    (kaching(), Gw(24), .1, -.3), (pop(), Gw(24), .1, -.3),
    (whoosh(.9, 2600, 400), V(w(25)), .07, .4), (thud(.5), Gw(27), .2, 0),
    # K4 tomorrow: the clock races, the page flips, still there ✓ (chime + boom in the gap)
    (clock(1.1, 300), V(w(28)), .03, 0), (flip(.45), V(w(29)), .08, 0), (flip(.35), V(w(30)), .05, 0), (riser(.9), V(w(31)) - .7, .03, 0),
    (whoosh(.6, 500, 3000), V(w(31)) - .2, .05, 0), (whoosh(.4, 1200, 3000), V(w(32)), .035, 0),
    (dg(1760), Gw(35) + .03, .1, 0), (drop(.9, 120, 40), Gw(35) + .02, .2, 0), (dg(2093, .4), Gw(35) + .1, .05, 0),
    # K5 the reveal: riser under "وهنا تجي وظيفة الكوكيز", braam + impact in the gap before «الـCookies»
    (reverse_swell(1.3), V(w(39)) - 1.3, .05, 0), (shimmer(1.6), V(w(39)), .03, 0),
    (braam(1.2, 49), Gw(42) + .02, .11, 0), (impact(1.0, 44), Gw(42) + .02, .1, 0), (shimmer(1.4), Gw(42) + .06, .04, 0),
    # K6 cookie → text file (typed), into the jar (thud + glass ping in the gap)
    (whoosh(.6, 500, 3500), V(w(46)) - .2, .05, 0), *[(key(), V(w(46) + .1) + k * .16, .06, (k % 3 - 1) * .2) for k in range(int((w(48) + .35 - w(46) - .1) / .16))],
    (whoosh(.7, 400, 2200), V(w(49)) - .2, .05, 0), (thud(.4), Gw(50) + .02, .12, 0), (dg(2637, .25), Gw(50) + .02, .025, 0),
    # K7 the jar remembers: login ✓, cart ✓ (each chime in its gap)
    (shimmer(1.0), V(w(53)), .03, 0), (whoosh(.4, 1200, 3600), V(w(56)) - .15, .05, -.2),
    (dg(1568, .25), Gw(57), .045, -.2), (dg(1760), Gw(59), .1, .2), (drop(.8, 120, 45), Gw(59), .16, 0),
    # K8 in short: one click; save (server → jar), remember (jar → server), welcome back
    (riser(1.0), V(w(64)) - 1.0, .02, 0), (click(), V(w(64) + .05), .08, 0), (drop(.9, 110, 36), Gw(65), .22, 0),
    (whoosh(1.0, 600, 3000), V(w(69)) - .05, .06, -.3), (dg(2093, .4), Gw(71), .07, .4),
    (whoosh(1.0, 3000, 600), V(w(72)), .06, .3), (dg(1568, .4), Gw(76), .07, -.4), (dg(1976), Gw(76) + .05, .08, 0), (impact(.9, 50), Gw(76), .12, 0),
    # K9 the hover over «عدم السماح»: a ticking clock + riser under the question, then boom + heartbeat in the beat
    (clock(1.6, 160), V(w(78)), .035, 0), (riser(1.4), V(w(83)) - 1.2, .035, 0),
    (drop(1.2, 100, 30), Gw(83), .3, 0), (heartbeat(), _V0(Gt(83) + .08), .42, 0),   # one beat: two do not fit in this 0.45 s pause
    # K10 … always allow: slide, click, cookies pop (in the gap)
    (whoosh(.35, 1500, 3500), V(w(85)), .025, 0), (click(), V(w(87)) - .05, .05, 0),
    *[(pop(), Gw(88) + k * .05, .045, (k - 1.5) * .3) for k in range(4)], (kaching(), Gw(88), .06, 0),
    # K11 type «تقنية», send, the comment lands with likes
    *[(key(), V(w(98) + .05) + k * (w(99) + .3 - w(98) - .05) / 5, .05, 0) for k in range(5)],
    (click(), V(w(100)) - .05, .04, 0), (whoosh(.35, 1200, 4200), V(w(100)) + .1, .035, 0), (pop(), Gw(101), .14, 0), (chime(2093), Gw(101) + .05, .12, 0),
    # outro
    (whoosh(1.2, 300, 3000), V(VE) - .2, .18, 0), (braam(2.0, 49), V(VE + .35), .22, 0), (impact(1.6, 44), V(VE + .35), .22, 0), (shimmer(2.0), V(VE + .4), .16, 0),
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
if os.environ.get('SFXWHY'):   # debug: which events sound inside the given video-time windows (speech band)
    for tw in map(float, os.environ['SFXWHY'].split(',')):
        rows = []
        for k, (sig, t, g, pan) in enumerate(ev):
            a = int((tw - t) * SR); b = a + int(.1 * SR)
            if b <= 0 or a >= len(sig): continue
            seg = sig[max(0, a):max(0, b)] * g; X = np.fft.rfft(seg); X[np.fft.rfftfreq(len(seg), 1 / SR) < 150] = 0
            rows.append((20 * np.log10(np.sqrt((np.fft.irfft(X, len(seg)) ** 2).mean()) + 1e-9) - 5, k, round(t, 2)))
        print(tw, sorted(rows, reverse=True)[:3])
