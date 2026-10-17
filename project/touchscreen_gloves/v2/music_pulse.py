"""KROZO pulse-tech score for the touchscreen reel (lighter than hype: soft kick, no clap) (pure numpy synthesis, original, no samples).
Sections follow the edit: drops on reveals, silence on the question beats, biggest drop on "السر الثاني".
usage: python3 music_hype.py OUT.wav  (reads warp.json / words3.json next to OUT)
"""
import sys, os, json, wave
import numpy as np
from itertools import accumulate

SR = 44100
OUT = sys.argv[1]
D = os.path.dirname(os.path.abspath(OUT))
K = json.load(open(D + '/warp.json'))['knots']
W = json.load(open(D + '/words3.json'))
LEAD = 0.15


def V(ts):
    ts = ts - LEAD
    for (s0, v0), (s1, v1) in zip(K, K[1:]):
        if ts <= s1:
            return v0 + (ts - s0) * (v1 - v0) / ((s1 - s0) or 1)
    return K[-1][1] + ts - K[-1][0]


w = lambda i: W[i]['s']
DUR = V(117.64 + LEAD) + 2.6
N = int(DUR * SR)
t = np.arange(N) / SR
rng = np.random.default_rng(3)
BPM = 112.0
BEAT = 60 / BPM
STEP = BEAT / 4


def lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    return np.fromiter(accumulate(x * (1 - a), lambda p, v: v + a * p), float, len(x))


def hp(x, fc):
    return x - lp(x, fc)


def midi(m):
    return 440 * 2 ** ((m - 69) / 12)


# ───────── arrangement: (start, end, level) per stem, video time ─────────
def env(points):
    xs, ys = zip(*points)
    return np.interp(t, xs, ys)


q1a, q1b = V(29.3), V(30.15)                     # pause beat 1 (after "نفس الشاشة؟")
q2a, q2b = V(61.35), V(62.15)                    # pause beat 2 (before "جسمك يحتوي")
drop1 = V(w(32))                                 # first response
drop2 = V(w(62) - .1)                            # "بالكهرباء"
drop3 = V(w(105))                                # "الجزء المثير"
drop4 = V(w(196) + .1)                           # conductive glove works
outro = V(117.5)
kick = env([(0, 0), (V(w(1)) - .02, 0), (V(w(1)), .7), (drop1 - .6, .7), (drop1 - .59, 0), (drop1, 0), (drop1 + .01, 1), (q1a, 1), (q1a + .01, 0), (q1b, 0),
            (q1b + .01, 0), (drop2, 0), (drop2 + .01, .9), (V(w(85)), .9), (V(w(85)) + .01, .5), (drop3 - 1.2, .5), (drop3 - 1.19, 0), (drop3, 0), (drop3 + .01, 1),
            (q2a, 1), (q2a + .01, 0), (q2b, 0), (q2b + .01, .8), (V(w(147)), .8), (V(w(147)) + .01, .45), (drop4 - 1.0, .45), (drop4 - .99, 0), (drop4, 0), (drop4 + .01, 1),
            (outro - .2, 1), (outro, 0), (DUR, 0)])
hats = np.clip(kick * 1.1, 0, 1)
bass = np.clip(kick * 1.0 + .25 * (kick > 0), 0, 1)
pad = env([(0, .8), (q1a, .8), (q1a + .01, .2), (q1b, .2), (q1b + .3, .8), (q2a, .8), (q2a + .01, .2), (q2b, .2), (q2b + .3, .7), (outro, .9), (DUR - 1, .6), (DUR, 0)])
arp = env([(0, .5), (drop1, .5), (drop1 + .01, 1), (q1a, 1), (q1a + .01, 0), (q1b, 0), (q1b + .01, .6), (drop2, .6), (drop2 + .01, 1), (q2a, 1), (q2a + .01, 0), (q2b, 0),
           (q2b + .01, .8), (drop4, .8), (drop4 + .01, 1), (outro, 1), (outro + .01, .3), (DUR, 0)])

prog = [57, 53, 48, 55]      # Am – F – C – G
BAR = BEAT * 4
bar_of = lambda x: int(x / BAR) % 4

# ───────── kick (4 on the floor) ─────────
K_ = np.zeros(N)
kt = np.arange(int(.35 * SR)) / SR
kick_s = np.sin(2 * np.pi * np.cumsum(45 + 110 * np.exp(-kt * 28)) / SR) * np.exp(-kt * 7.5)
kick_s += hp(rng.standard_normal(len(kt)), 2500) * np.exp(-kt * 120) * .25
for b in np.arange(0, DUR, BEAT):
    i = int(b * SR); n = min(len(kick_s), N - i); K_[i:i + n] += kick_s[:n]
K_ *= kick

# sidechain pump from the kick grid
pump = 1 - .55 * np.exp(-((t % BEAT) / .09)) * np.clip(kick, 0, 1)

# ───────── clap on 2 and 4 + 16th hats ─────────
C_ = np.zeros(N); H_ = np.zeros(N)
ct = np.arange(int(.25 * SR)) / SR
clap = hp(lp(rng.standard_normal(len(ct)), 4500), 900) * (np.exp(-ct * 22) + .4 * np.exp(-((ct - .012) ** 2) / 1e-5))
for b in np.arange(BEAT, DUR, BEAT * 2):
    i = int(b * SR); n = min(len(clap), N - i); C_[i:i + n] += clap[:n]
C_ *= kick * .5
ht = np.arange(int(.06 * SR)) / SR
hat = hp(rng.standard_normal(len(ht)), 7000) * np.exp(-ht * 70)
for j, b in enumerate(np.arange(0, DUR, STEP)):
    i = int(b * SR); n = min(len(hat), N - i); H_[i:i + n] += hat[:n] * (1.0 if j % 4 == 2 else .45)
H_ *= hats * .22

# ───────── bass: driving 8ths, saw → low-pass ─────────
B_ = np.zeros(N)
for j, b in enumerate(np.arange(0, DUR, BEAT / 2)):
    i = int(b * SR); n = min(int(BEAT / 2 * SR), N - i)
    if n <= 0: break
    f = midi(prog[bar_of(b)] - 24 + (12 if j % 8 == 7 else 0))
    tt = np.arange(n) / SR
    s = 2 * ((f * tt) % 1) - 1
    B_[i:i + n] += s * np.exp(-tt * 4) * np.clip(tt / .004, 0, 1)
B_ = lp(lp(B_, 420), 900) * bass * pump * .55
sub = np.sin(2 * np.pi * np.cumsum(np.array([midi(prog[bar_of(x)] - 24) for x in np.arange(0, DUR, 1 / 200)]).repeat(SR // 200)[:N]) / SR)
sub = np.pad(sub, (0, max(0, N - len(sub))))[:N] * bass * pump * .22

# ───────── arp: 16th plucks ─────────
A_ = np.zeros(N)
pat = [0, 7, 12, 7, 3, 7, 12, 15]
for j, b in enumerate(np.arange(0, DUR, STEP)):
    i = int(b * SR); n = min(int(.18 * SR), N - i)
    if n <= 0: break
    root = prog[bar_of(b)] + 12
    f = midi(root + pat[j % 8] - (0 if bar_of(b) in (0,) else 0))
    tt = np.arange(n) / SR
    A_[i:i + n] += (np.sign(np.sin(2 * np.pi * f * tt)) * .35 + np.sin(2 * np.pi * f * tt)) * np.exp(-tt * 22)
A_ = lp(A_, 3200) * arp * pump * .085

# ───────── pad ─────────
P_ = np.zeros(N)
for bi, b in enumerate(np.arange(0, DUR, BAR)):
    i = int(b * SR); n = min(int((BAR + .5) * SR), N - i)
    if n <= 0: break
    tt = np.arange(n) / SR
    ch = [prog[bi % 4], prog[bi % 4] + 3 + (1 if bi % 4 in (1, 2) else 0), prog[bi % 4] + 7, prog[bi % 4] + 12]
    seg = sum(2 * ((midi(m + d) * tt + rng.random()) % 1) - 1 for m in ch for d in (-.08, .07))
    P_[i:i + n] += seg * np.minimum(1, np.minimum(tt / .6, (n / SR - tt) / .5))
P_ = lp(lp(P_, 1400), 2200) * pad * .028

# ───────── risers into every drop + impacts on drops ─────────
R_ = np.zeros(N)
def riser(at, d):
    i0, i1 = int((at - d) * SR), int(at * SR)
    n = i1 - i0; x = rng.standard_normal(n)
    cut = np.geomspace(300, 9000, n); a = np.exp(-2 * np.pi * cut / SR); y = np.zeros(n); acc = 0.
    for k in range(n):
        acc = (1 - a[k]) * x[k] + a[k] * acc; y[k] = acc
    tt = np.arange(n) / SR
    tone = np.sin(2 * np.pi * np.cumsum(np.geomspace(200, 1600, n)) / SR) * .3
    R_[i0:i1] += (y + tone) * (tt / (d)) ** 2.2
def boom(at, g=1.):
    i = int(at * SR); bt = np.arange(int(2.2 * SR)) / SR
    s = np.sin(2 * np.pi * np.cumsum(32 + 70 * np.exp(-bt * 9)) / SR) * np.exp(-bt * 1.6)
    s += lp(rng.standard_normal(len(bt)), 600) * np.exp(-bt * 5) * .5
    n = min(len(s), N - i); R_[i:i + n] += s[:n] * g * 1.6
for at, d in [(drop1, 1.6), (drop2, 1.4), (drop3, 2.0), (q2b, .0), (drop4, 1.6)]:
    if d: riser(at, d)
for at, g in [(0.02, .8), (drop1, .7), (drop2, .9), (drop3, 1.), (q2b, .7), (drop4, .9), (outro, .6)]:
    boom(at, g)
R_ *= .16

mix = K_ * .45 + H_ * .8 + B_ * .8 + sub + A_ * 1.2 + P_ * 1.3 + R_ * .8
fade = np.clip((DUR - t) / 2.5, 0, 1) * np.clip(t / .02, 0, 1)
mix *= fade
d = int(.012 * SR)
L = mix + .25 * np.concatenate([np.zeros(d), lp(mix, 3000)[:-d]])
R = mix + .25 * np.concatenate([np.zeros(2 * d), lp(mix, 3000)[:-2 * d]])
st = np.stack([L, R], 1); st /= np.max(np.abs(st)) + 1e-9; st *= .9
with wave.open(OUT, 'wb') as wv:
    wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(SR); wv.writeframes((st * 32767).astype(np.int16).tobytes())
print('wrote', OUT, round(DUR, 2))
