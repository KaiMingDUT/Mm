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

# ── events ──


def key(d=.05):
    """keyboard key: short filtered click + body"""
    t = tt(d); n = rng.standard_normal(len(t))
    return hp(n, 1800) * np.exp(-t * 180) * .7 + np.sin(2 * np.pi * 260 * t) * np.exp(-t * 90) * .4


def flip(d=.4):
    """paper page flip"""
    t = tt(d); n = rng.standard_normal(len(t))
    return hp(lp(n, 6000), 900) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2 * (1 + .5 * np.sin(2 * np.pi * 34 * t))


# ── events ──
VE = 45.55
SH = [9, 18, 28, 36, 43, 51, 60, 66, 77, 89]
CUTS = [w(i) - .05 for i in SH]
ev = [(whoosh(.4, 700, 5200), V(c) - .22, .06, (-.35 if i % 2 else .35)) for i, c in enumerate(CUTS)]
hb = lambda x, g=.42, d=.33: [(heartbeat(), _V0(x), g, 0), (heartbeat(), _V0(x + d), g * .72, 0)]   # keep both beats inside the pause
# K1 banners pop up on every site (same stagger as timeline.js), then one click and the rest follow
for i in range(9):
    c, r = i % 3 - 1, i // 3 - 1; d = (c * c + r * r) ** .5
    st = w(1) - .1 + (0 if i == 4 else .25 + d * .22 + (i % 2) * .12)
    ev.append((pop(), V(st) + .05, .022 if i != 4 else .035, c * .5))
    if i != 4: ev.append((click(), V(w(8) + d * .1), .035, c * .5))
ev += [
    (impact(1.2, 46), V(0) + .02, .14, 0), (shimmer(1.0), V(.2), .06, 0),
    (click(), V(w(7)), .08, 0),
    # K2 the question, then the beat
    (riser(1.1), V(w(15)) - .3, .03, 0), (blip(330, .25, 220), G(w(17) + .15), .13, 0), *hb(gap(w(17) + .15) + .05, d=.26),
    # K3 add to cart, the shoe flies, the badge, you leave
    (click(), V(w(22) + .05), .08, 0), (whoosh(.5, 900, 4200), V(w(22) + .3), .05, .2), (pop(), G(w(24) + .15), .1, -.3), (chime(1568), G(w(24) + .2) + .04, .06, -.3),
    (whoosh(.9, 2600, 400), V(w(25)), .07, .4),
    # K4 tomorrow: page flip, back on the site, the cart drawer, still there ✓
    (flip(.45), V(w(29)), .09, 0), (flip(.35), V(w(30)), .06, 0), (whoosh(.6, 500, 3000), V(w(31)) - .2, .06, 0), (whoosh(.4, 1200, 3000), V(w(32)), .04, 0),
    (chime(1760), G(w(35)) + .08, .13, 0), (ping(2093, .9), G(w(35)) + .18, .05, 0),
    # K5 the reveal: the cookie rises
    (reverse_swell(1.1), V(w(39)) - 1.1, .08, 0), (shimmer(1.8), V(w(39)), .07, 0), (impact(1.0, 44), G(w(42) + .2) + .1, .15, 0), (shimmer(1.4), G(w(42) + .2) + .12, .1, 0),   # the hit lands in the gap before «الـCookies»
    # K6 cookie → text file (typed), into the jar
    (whoosh(.6, 500, 3500), V(w(46)) - .2, .06, 0), *[(key(), V(w(46) + .1) + k * .16, .07, (k % 3 - 1) * .2) for k in range(int((w(48) + .35 - w(46) - .1) / .16))],
    (whoosh(.7, 400, 2200), V(w(49)) - .2, .05, 0), (thud(.4), G(w(50) + .3) + .05, .1, 0), (ping(2637, .8), G(w(50) + .3) + .08, .05, 0),
    # K7 the jar remembers: login ✓, cart ✓
    (shimmer(1.0), V(w(53)), .03, 0), (whoosh(.4, 1200, 3600), V(w(56)) - .15, .06, -.2), (chime(1568), G(w(57) + .05), .08, -.2), (pop(), G(w(58) - .1), .1, .2), (chime(1760), G(w(59) + .05), .08, .2),
    # K8 in short: one click; save (server → jar), remember (jar → server), welcome back
    (click(), V(w(64) + .05), .08, 0),
    (whoosh(1.0, 600, 3000), V(w(69)) - .05, .06, -.3), (ping(2093, .8), G(w(71) + .25), .07, .4),
    (whoosh(1.0, 3000, 600), V(w(72)), .06, .3), (ping(1568, .8), G(w(74) + .15), .06, -.4), (chime(1976), G(w(75) + .2) + .12, .08, 0),
    # K9 the hover over «عدم السماح» … the beat
    (blip(330, .25, 220), G(w(83) + .2), .13, 0), (heartbeat(), _V0(gap(w(83) + .2) + .08), .42, 0),   # one beat: two do not fit in this 0.45 s pause
    # K10 … always allow: slide, click, cookies pop
    (whoosh(.35, 1500, 3500), V(w(85)), .04, 0), (click(), V(w(87)) - .05, .04, 0), *[(pop(), G(w(87) + .05) + k * .06, .08, (k - 1.5) * .3) for k in range(4)],
    # K11 type «تقنية», send, the comment lands
    *[(key(), V(w(98) + .05) + k * (w(99) + .3 - w(98) - .05) / 5, .05, 0) for k in range(5)],
    (click(), V(w(100)) - .05, .04, 0), (whoosh(.35, 1200, 4200), V(w(100)) + .1, .035, 0), (pop(), G(w(101) + .1), .14, 0), (chime(2093), G(w(101) + .1) + .05, .08, 0),
    # outro
    (whoosh(1.2, 300, 3000), V(VE) - .2, .18, 0), (impact(1.6, 44), V(VE + .35), .2, 0), (shimmer(2.0), V(VE + .4), .16, 0),
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
