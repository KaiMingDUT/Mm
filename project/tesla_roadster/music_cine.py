"""KROZO hype-tech score for the Roadster reel (pure numpy synthesis, original, no samples).
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
DUR = V(105.45 + LEAD)
N = int(DUR * SR)
t = np.arange(N) / SR
rng = np.random.default_rng(3)
BPM = 92.0
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


q1a, q1b = V(w(64) + .4), V(29.45)              # question beat 1 (after "وما تطيح؟!")
q2a, q2b = V(w(134) + .4), V(60.07)             # question beat 2 (after "تقفز في الهواء؟")
drop2 = V(60.07)                                 # "هنا يجي السر الثاني" — biggest drop
name = V(20.95)
outro = V(102.95)
kick = env([(0, 1), (V(2.85), 1), (V(2.86), .0), (V(6.0), .0), (V(6.01), .6), (V(9.3), .6), (V(9.38), 1), (name - .3, 1), (name, 0), (V(23.0), 0), (V(23.01), .5),
            (q1a, .5), (q1a + .01, 0), (q1b, 0), (q1b + .01, 0), (V(31.9), 0), (V(31.91), .7), (V(43.5), .7), (V(43.51), .85), (q2a - 1.6, .85), (q2a - 1.59, 0),
            (drop2, 0), (drop2 + .01, 1), (V(78.4), 1), (V(78.41), .4), (V(82.4), .4), (V(82.41), 0), (V(w(197)) - .02, 0), (V(w(197)), 1),
            (outro - .2, 1), (outro, 0), (DUR, 0)])
hats = np.clip(kick * 1.2, 0, 1) * env([(0, 1), (V(31.9), 1), (V(31.91), .6), (V(43.5), .8), (DUR, 1)])
bass = env([(0, 1), (V(2.85), 1), (V(2.86), .35), (V(9.38), .35), (V(9.39), 1), (name - .3, 1), (name, .4), (q1a, .4), (q1a + .01, 0), (q1b, 0), (q1b + .2, .6),
            (q2a - 1.6, .7), (q2a - 1.59, .2), (q2a, .2), (q2a + .01, 0), (drop2, 0), (drop2 + .01, 1), (V(78.4), 1), (V(78.41), .5), (V(82.4), .5),
            (V(82.41), .15), (V(w(197)) - .02, .15), (V(w(197)), 1), (outro - .2, 1), (outro, 0), (DUR, 0)])
pad = env([(0, .7), (q1a, .7), (q1a + .01, .15), (q1b, .15), (q1b + .3, .7), (q2a, .7), (q2a + .01, .15), (q2b, .15), (drop2 + .3, .6), (outro, .9), (DUR - 1, .6), (DUR, 0)])
arp = env([(0, 1), (V(2.85), .7), (V(9.38), .7), (V(9.39), 1), (name, 1), (name + .01, .5), (q1a, .5), (q1a + .01, 0), (q1b, 0), (q1b + .01, .7),
           (q2a, .7), (q2a + .01, 0), (drop2, 0), (drop2 + .01, 1), (outro, 1), (outro + .01, .4), (DUR, 0)])

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
B_ = lp(lp(B_, 260), 500) * np.maximum(bass, .35) * .55
sub = np.sin(2 * np.pi * np.cumsum(np.array([midi(prog[bar_of(x)] - 24) for x in np.arange(0, DUR, 1 / 200)]).repeat(SR // 200)[:N]) / SR)
sub = np.pad(sub, (0, max(0, N - len(sub))))[:N] * np.maximum(bass, .3) * .2

# ───────── arp: 16th plucks ─────────
A_ = np.zeros(N)
pat = [0, 12, 7, 12, 3, 12, 7, 15]
for j, b in enumerate(np.arange(0, DUR, STEP)):
    i = int(b * SR); n = min(int(.18 * SR), N - i)
    if n <= 0: break
    root = prog[bar_of(b)] + 12
    f = midi(root + pat[j % 8] - (0 if bar_of(b) in (0,) else 0))
    tt = np.arange(n) / SR
    A_[i:i + n] += (np.sign(np.sin(2 * np.pi * f * tt)) * .35 + np.sin(2 * np.pi * f * tt)) * np.exp(-tt * 22)
A_ = lp(A_, 1800) * arp * .085

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
for at, d in [(V(9.38), 2.2), (name, 1.4), (q1b, .0), (drop2, 3.0), (V(w(197)), 2.4)]:
    if d: riser(at, d)
for at, g in [(0.02, 1.), (V(9.38), .8), (name, .7), (q1b, .7), (drop2, 1.), (V(w(197)), .9), (outro, .6)]:
    boom(at, g)
R_ *= .16

mix = K_ * .0 + C_ * .0 + H_ * .25 + B_ * .55 + sub * .8 + A_ * .7 + P_ * 2.2 + R_ * .6
fade = np.clip((DUR - t) / 2.5, 0, 1) * np.clip(t / .02, 0, 1)
mix *= fade
d = int(.012 * SR)
L = mix + .25 * np.concatenate([np.zeros(d), lp(mix, 3000)[:-d]])
R = mix + .25 * np.concatenate([np.zeros(2 * d), lp(mix, 3000)[:-2 * d]])
st = np.stack([L, R], 1); st /= np.max(np.abs(st)) + 1e-9; st *= .9
with wave.open(OUT, 'wb') as wv:
    wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(SR); wv.writeframes((st * 32767).astype(np.int16).tobytes())
print('wrote', OUT, round(DUR, 2), 's; drop2 at', round(drop2, 2))
