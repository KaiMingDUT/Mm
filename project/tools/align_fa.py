# CTC forced alignment of script.txt onto voice16.wav → words3.json (story time), one entry per word.
# Emissions: Omnilingual-ASR CTC 1B (Meta, MMS successor; sherpa-onnx int8 export, GitHub release asr-models).
# usage: python3 align_fa.py P MODEL_DIR   (P has script.txt + voice16.wav; MODEL_DIR has model.int8.onnx + tokens.txt)
import json, re, sys, wave
import numpy as np, onnxruntime as ort, torch, torchaudio.functional as F

P, D = sys.argv[1], sys.argv[2]
tok = [l.rstrip('\n').rsplit(' ', 1)[0] for l in open(D + '/tokens.txt')]
ID = {t: i for i, t in enumerate(tok)}
BLANK, SP, FR = 0, ID[' '], 0.02

w = wave.open(P + '/voice16.wav'); x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
sess = ort.InferenceSession(D + '/model.int8.onnx')
# Dense 10 s windows (2 s hop), averaged per frame. A single window sometimes degenerates to all blanks
# (a 20 s window of the cookies voice decoded to nothing), so windows whose non-blank rate is far below
# the median are dropped, and 1 s at each inner window edge is ignored.
N = len(x) // 320; WIN, HOP, EDGE = 10 * 16000, 2 * 16000, 50
starts = sorted(set(list(range(0, max(1, len(x) - WIN), HOP)) + [max(0, len(x) - WIN)]))   # last one ends at the file end
runs = []
for st in starts:
    seg = x[st:st + WIN]; seg = (seg - seg.mean()) / (seg.std() + 1e-7)
    l = sess.run(None, {'x': seg[None]})[0][0]
    l = l - l.max(1, keepdims=True); l -= np.log(np.exp(l).sum(1, keepdims=True))
    runs.append((st // 320, l, float((l.argmax(1) != BLANK).mean()), st + WIN >= len(x)))
med = float(np.median([r[2] for r in runs]))
acc = np.zeros((N + 600, len(tok)), np.float32); cnt = np.zeros(N + 600)
for f0, l, nb, tail in runs:
    if nb < .5 * med: print(f'  drop window {f0 * FR:.0f}s (non-blank {nb:.2f}, median {med:.2f})'); continue
    lo = 0 if f0 == 0 else EDGE; hi = len(l) if tail else len(l) - EDGE
    acc[f0 + lo:f0 + hi] += l[lo:hi]; cnt[f0 + lo:f0 + hi] += 1
last = int(np.nonzero(cnt)[0].max()) + 1
E = acc[:last] / np.maximum(cnt[:last], 1)[:, None]

# spoken form of Latin words (the model writes Arabic speech in Arabic letters)
LATIN = {'AirTag': 'ايرتاق', 'GPS': 'جي بي اس', 'Apple': 'ابل', 'Cookies': 'كوكيز'}
def norm(word):
    s = re.sub('[،.!؟…:«»"]', '', word).replace('ـ', '')
    for k, v in LATIN.items(): s = s.replace(k, v)
    s = re.sub('[ً-ْ]', '', s)
    return re.sub('[أإآ]', 'ا', s)

W = [{'w': ww, 'line': li} for li, l in enumerate(open(P + '/script.txt')) for ww in l.split()]
target, owner = [], []
for i, ww in enumerate(W):
    if i: target.append(SP); owner.append(-1)
    for c in norm(ww['w']):
        target.append(ID[c]); owner.append(i)
ali, sc = F.forced_align(torch.from_numpy(E)[None], torch.tensor([target], dtype=torch.int32), blank=BLANK)
spans = F.merge_tokens(ali[0], sc[0].exp())
assert len(spans) == len(target)
for i, ww in enumerate(W):
    sp = [s for s, o in zip(spans, owner) if o == i]
    ww['s'] = round(sp[0].start * FR, 3); ww['e'] = round(sp[-1].end * FR, 3)
    ww['conf'] = round(float(np.mean([s.score for s in sp])), 2)
json.dump(W, open(P + '/words3.json', 'w'), ensure_ascii=False)
for i, ww in enumerate(W): print(f"{i:3d} {ww['s']:6.2f}-{ww['e']:6.2f} {ww['conf']:.2f} {ww['w']}")
