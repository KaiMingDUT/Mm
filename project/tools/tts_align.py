"""Forced alignment without ASR: synthesize the script word-by-word with espeak-ng (Arabic),
then DTW-align MFCCs of the synthetic speech to the real voice and carry the word boundaries over.
usage: python tts_align.py PROJECT_DIR VOICE16.wav  (reads script words from PROJECT/words3.json order,
       writes PROJECT/words_dtw.json with s/e per word in story time)
needs: espeakng-loader, numpy, numba (pip, PyPI)."""
import ctypes, json, sys, wave, os
import numpy as np
import numba
import espeakng_loader as EL

P, VOICE = sys.argv[1], sys.argv[2]
W = json.load(open(os.path.join(P, 'words3.json')))

# ── espeak-ng via ctypes (synchronous, collect samples through the callback) ──
lib = ctypes.CDLL(EL.get_library_path())
SYNTH_CB = ctypes.CFUNCTYPE(ctypes.c_int, ctypes.POINTER(ctypes.c_short), ctypes.c_int, ctypes.c_void_p)
buf = []
@SYNTH_CB
def _cb(wav, n, ev):
    if n > 0: buf.append(np.ctypeslib.as_array(wav, shape=(n,)).copy())
    return 0
lib.espeak_Initialize.restype = ctypes.c_int
SR_T = lib.espeak_Initialize(2, 500, os.path.dirname(EL.get_data_path()).encode(), 0)   # AUDIO_OUTPUT_SYNCHRONOUS
lib.espeak_SetSynthCallback(_cb)
lib.espeak_SetVoiceByName(b'ar')
lib.espeak_SetParameter(1, 175, 0)   # espeakRATE (wpm) ≈ conversational
def say(text):
    buf.clear(); b = text.encode('utf-8') + b'\0'
    lib.espeak_Synth(b, len(b), 0, 1, 0, 1, None, None)   # POS_CHARACTER, espeakCHARS_UTF8
    lib.espeak_Synchronize()
    return np.concatenate(buf).astype(float) if buf else np.zeros(1)

def clean(w):
    w = w.replace('الـAirTag', 'الإيرتاغ').replace('AirTag', 'إيرتاغ').replace('GPS', 'جي بي إس').replace('Apple', 'آبل')
    return ''.join(ch for ch in w if ch not in '،.!؟…')
# build the synthetic track word by word; punctuation adds a short gap (speakers pause there)
tts, bounds, pos = [], [], 0
for w in W:
    a = say(clean(w['w']))
    nz = np.nonzero(np.abs(a) > 200)[0]; a = a[max(0, nz[0] - 40):nz[-1] + 40] if len(nz) else a   # trim espeak's own silences
    bounds.append((pos, pos + len(a))); tts.append(a); pos += len(a)
    gap = int(SR_T * (.18 if w['w'][-1] in '،.!؟…' else .0))
    if gap: tts.append(np.zeros(gap)); pos += gap
tts = np.concatenate(tts)

# ── features: log-mel → MFCC (13) + deltas, 20 ms hop; both resampled to 16 kHz ──
def resample(x, sr, to=16000):
    n = int(len(x) * to / sr); return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x)
def mfcc(x, sr=16000, hop=.02, win=.032, nm=40, nc=13):
    h, n = int(hop * sr), int(win * sr); nf = 1 + (len(x) - n) // h
    fr = np.lib.stride_tricks.sliding_window_view(x, n)[::h][:nf] * np.hamming(n)
    S = np.abs(np.fft.rfft(fr, 512)) ** 2
    mel = lambda f: 2595 * np.log10(1 + f / 700); imel = lambda m: 700 * (10 ** (m / 2595) - 1)
    pts = imel(np.linspace(mel(80), mel(7600), nm + 2)); bins = np.floor((512 + 1) * pts / sr).astype(int)
    fb = np.zeros((nm, 257))
    for i in range(nm):
        a, b, c = bins[i], bins[i + 1], bins[i + 2]
        fb[i, a:b] = (np.arange(a, b) - a) / max(1, b - a); fb[i, b:c] = (c - np.arange(b, c)) / max(1, c - b)
    L = np.log(S @ fb.T + 1e-6)
    k = np.arange(nm); D = np.cos(np.pi / nm * (k[None, :] + .5) * np.arange(nc)[:, None])
    C = L @ D.T; C = (C - C.mean(0)) / (C.std(0) + 1e-6)
    E = np.log((fr ** 2).sum(1) + 1); E = (E - E.mean()) / (E.std() + 1e-6)
    d = np.gradient(C, axis=0)
    return np.hstack([C[:, 1:], d[:, 1:] * .7, E[:, None] * 1.5])
wv = wave.open(VOICE); sr_v = wv.getframerate(); v = np.frombuffer(wv.readframes(wv.getnframes()), np.int16).astype(float)
FA, FB = mfcc(resample(tts, SR_T)), mfcc(resample(v, sr_v) if sr_v != 16000 else v)

@numba.njit(cache=True)
def dtw(A, B, band):
    n, m = len(A), len(B); INF = 1e18
    D = np.full((n + 1, m + 1), INF); D[0, 0] = 0.
    for i in range(1, n + 1):
        c = int(i * m / n); lo, hi = max(1, c - band), min(m, c + band)
        for j in range(lo, hi + 1):
            d = 0.
            for k in range(A.shape[1]): t = A[i - 1, k] - B[j - 1, k]; d += t * t
            d = np.sqrt(d)
            D[i, j] = d + min(D[i - 1, j - 1], D[i - 1, j] + .3 * d, D[i, j - 1] + .3 * d)
    # backtrack
    i, j = n, m; path = np.zeros((n + m, 2), np.int64); k = 0
    while i > 0 and j > 0:
        path[k, 0] = i - 1; path[k, 1] = j - 1; k += 1
        a, b, c = D[i - 1, j - 1], D[i - 1, j], D[i, j - 1]
        if a <= b and a <= c: i -= 1; j -= 1
        elif b <= c: i -= 1
        else: j -= 1
    return path[:k][::-1]
def align_range(i0, i1, t0, t1):
    """DTW only words[i0:i1] against voice[t0:t1] (story seconds); returns [(s, e)] per word."""
    sa, sb = bounds[i0][0], bounds[i1 - 1][1]
    fa0, fa1 = int(sa / hopT), int(sb / hopT); fb0, fb1 = int(t0 / .02), int(t1 / .02)
    A, B = FA[fa0:fa1], FB[fb0:fb1]
    pth = dtw(np.ascontiguousarray(A), np.ascontiguousarray(B), int(max(len(A), len(B)) * .35))
    mp = np.zeros(len(A), np.int64)
    for a, b in pth: mp[a] = b if mp[a] == 0 else min(mp[a], b)
    for k in range(1, len(mp)): mp[k] = max(mp[k], mp[k - 1])
    res = []
    for k in range(i0, i1):
        s0, e0 = int(bounds[k][0] / hopT) - fa0, int(bounds[k][1] / hopT) - fa0
        res.append((round(t0 + mp[min(len(mp) - 1, max(0, s0))] * .02, 2), round(t0 + mp[min(len(mp) - 1, max(0, e0 - 1))] * .02, 2)))
    return res
hopT = SR_T * .02
if __name__ == '__main__':
    path = dtw(FA, FB, int(max(len(FA), len(FB)) * .25))
    mapA = np.zeros(len(FA), int)
    for a, b in path: mapA[a] = b if mapA[a] == 0 else min(mapA[a], b)
    for i in range(1, len(mapA)): mapA[i] = max(mapA[i], mapA[i - 1])
    hopT = SR_T * .02
    out = []
    for w, (s, e) in zip(W, bounds):
        fs, fe = min(len(mapA) - 1, int(s / hopT)), min(len(mapA) - 1, int(e / hopT))
        out.append({'w': w['w'], 's': round(mapA[fs] * .02, 3), 'e': round(mapA[fe] * .02, 3), 'syl': w.get('syl', 1), 'line': w.get('line', 0)})
    json.dump(out, open(os.path.join(P, 'words_dtw.json'), 'w'), ensure_ascii=False)
    print('tts', round(len(tts) / SR_T, 1), 's  voice', round(len(v) / sr_v, 1), 's  words', len(out))
    