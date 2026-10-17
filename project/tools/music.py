"""KROZO original ambient-tech music bed. Pure numpy synthesis, no samples.
usage: python3 music.py OUT.wav DURATION [REVEAL_TIME]
"""
import sys, wave
import numpy as np

SR = 44100
OUT, DUR = sys.argv[1], float(sys.argv[2])
REVEAL = float(sys.argv[3]) if len(sys.argv) > 3 else DUR * 0.68
BPM = 96.0
BEAT = 60.0 / BPM
BAR = BEAT * 4
N = int(DUR * SR)
t = np.arange(N) / SR
rng = np.random.default_rng(7)


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env_adsr(n, a, d, s, r):
    e = np.ones(n) * s
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    a = max(1, min(a, n // 2)); r = min(r, n // 2)
    e[:a] = np.linspace(0, 1, a)
    if d:
        e[a:a + d] = np.linspace(1, s, len(e[a:a + d]))
    if r:
        e[-r:] *= np.linspace(1, 0, r)
    return e


def lowpass(x, cutoff):
    # one-pole low-pass, cutoff may be an array (sweeps)
    c = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    a = np.exp(-2 * np.pi * c / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y


def lp_fast(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    from itertools import accumulate
    return np.fromiter(accumulate(x * (1 - a), lambda p, v: v + a * p), float, len(x))


# Chord progression (A minor, cinematic): Am9 - Fmaj7 - C(add9) - Em7
chords = [
    [57, 60, 64, 67, 71],
    [53, 57, 60, 64, 67],
    [48, 55, 60, 62, 64],
    [52, 55, 59, 62, 67],
]
bass_roots = [45, 41, 48, 40]

mix_l = np.zeros(N)
mix_r = np.zeros(N)

# ---- Intensity curve (music behaviour per section) ----
intensity = np.interp(t, [0, 3, REVEAL - 6, REVEAL - 0.3, REVEAL + 0.4, DUR - 6, DUR - 1.5, DUR],
                         [0.55, 0.7, 0.8, 0.95, 1.0, 0.9, 0.5, 0.0])

# ---- Pad: detuned saws, slow filter breathing ----
pad = np.zeros(N)
bar_n = int(BAR * SR)
for b in range(int(np.ceil(DUR / BAR)) + 1):
    s0 = b * bar_n
    if s0 >= N:
        break
    n = min(bar_n + int(0.8 * SR), N - s0)
    tt = np.arange(n) / SR
    seg = np.zeros(n)
    for m in chords[b % 4]:
        for det in (-0.09, 0.0, 0.08):
            f = midi(m + det)
            ph = rng.random()
            seg += 2 * ((f * tt + ph) % 1.0) - 1
    seg *= env_adsr(n, 0.9, 0.0, 1.0, 0.9)
    pad[s0:s0 + n] += seg
cut = 700 + 900 * (0.5 + 0.5 * np.sin(2 * np.pi * t / (BAR * 2))) * intensity
pad = lowpass(pad, cut)
pad = lowpass(pad, 2400)
pad *= 0.05

# ---- Sub bass: soft sine on each bar, enters after hook ----
sub = np.zeros(N)
for b in range(int(np.ceil(DUR / BAR)) + 1):
    s0 = b * bar_n
    if s0 >= N:
        break
    n = min(bar_n, N - s0)
    tt = np.arange(n) / SR
    f = midi(bass_roots[b % 4] - 12)
    sub[s0:s0 + n] += np.sin(2 * np.pi * f * tt) * env_adsr(n, 0.05, 0.4, 0.7, 0.3)
sub *= 0.16 * np.clip((t - 3.0) / 2.0, 0, 1)

# ---- Pulse arpeggio: plucked sine/triangle 16ths, cyan-like sparkle ----
arp = np.zeros(N)
step = BEAT / 2
pattern = [0, 2, 4, 3, 1, 4, 2, 3]
i = 0
tpos = 0.0
while tpos < DUR:
    b = int(tpos / BAR) % 4
    notes = chords[b % 4]
    m = notes[pattern[i % 8] % len(notes)] + 12
    s0 = int(tpos * SR)
    n = min(int(0.35 * SR), N - s0)
    tt = np.arange(n) / SR
    f = midi(m)
    tone = np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(2 * np.pi * 2 * f * tt)
    arp[s0:s0 + n] += tone * np.exp(-tt * 14)
    i += 1
    tpos += step
arp = lp_fast(arp, 3500)
arp *= 0.055 * np.clip((t - 1.0) / 3.0, 0, 1)

# ---- Soft hats from mid-section, rhythmic progression ----
hats = np.zeros(N)
tpos = BAR * 2 + BEAT / 2
while tpos < DUR - 2:
    s0 = int(tpos * SR)
    n = min(int(0.05 * SR), N - s0)
    noise = rng.standard_normal(n)
    noise = noise - lp_fast(noise, 7000)
    hats[s0:s0 + n] += noise * np.exp(-np.arange(n) / SR * 90)
    tpos += BEAT
hats *= 0.03 * np.clip((t - REVEAL + 14) / 4, 0, 1)

# ---- Kick-ish soft pulse (heartbeat) after reveal only ----
kick = np.zeros(N)
tpos = REVEAL
while tpos < DUR - 3:
    s0 = int(tpos * SR)
    n = min(int(0.3 * SR), N - s0)
    tt = np.arange(n) / SR
    f = 55 + 70 * np.exp(-tt * 30)
    kick[s0:s0 + n] += np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9)
    tpos += BEAT * 2
kick *= 0.12

# ---- Sidechain-style ducking from the pulse grid ----
duck = 1 - 0.25 * np.exp(-((t % BEAT) / 0.12)) * np.clip((t - 3) / 2, 0, 1)

# ---- Riser before reveal + resolution swell ----
rise = np.zeros(N)
r0 = int((REVEAL - 2.5) * SR)
r1 = int(REVEAL * SR)
n = r1 - r0
noise = rng.standard_normal(n)
rise[r0:r1] = lowpass(noise, np.linspace(300, 6000, n)) * np.linspace(0, 1, n) ** 2
rise *= 0.05

dry = (pad + arp * 0.9) * duck * intensity + sub * intensity + hats + kick + rise

# ---- Stereo: simple Haas width + short reverb tail ----
d = int(0.011 * SR)
left = dry.copy()
right = np.concatenate([np.zeros(d), dry[:-d]])
for delay, g in ((0.083, 0.28), (0.131, 0.22), (0.197, 0.16), (0.271, 0.11)):
    k = int(delay * SR)
    left[k:] += g * lp_fast(dry, 3000)[:-k]
    right[int(k * 1.07):] += g * lp_fast(dry, 3000)[:-int(k * 1.07)]

# Final fade-out
fade = np.clip((DUR - t) / 2.0, 0, 1)
fade *= np.clip(t / 0.6, 0, 1)
stereo = np.stack([left * fade, right * fade], axis=1)
stereo /= np.max(np.abs(stereo)) + 1e-9
stereo *= 0.89
pcm = (stereo * 32767).astype(np.int16)
with wave.open(OUT, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wrote", OUT, DUR)
