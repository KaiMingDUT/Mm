# CTC forced alignment of script.txt onto voice16.wav → words3.json (word s/e in story time).
# Same method as airtag/align_fa.py: Omnilingual-ASR CTC 1B (sherpa-onnx int8) emissions + torchaudio forced_align.
# usage: python3 align_fa.py MODEL_DIR
import json, re, sys, wave
import numpy as np, onnxruntime as ort, torch, torchaudio.functional as F

D = sys.argv[1]
tok = [l.rstrip('\n').rsplit(' ', 1)[0] for l in open(D + '/tokens.txt')]
ID = {t: i for i, t in enumerate(tok)}
BLANK, SP, FR = 0, ID[' '], 0.02

w = wave.open('voice16.wav'); x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
sess = ort.InferenceSession(D + '/model.int8.onnx')
N = len(x) // 320; WIN, HOP = int(sys.argv[2]) * 16000 if len(sys.argv) > 2 else 20 * 16000, (int(sys.argv[2]) if len(sys.argv) > 2 else 20) * 8000
E = np.full((N + 50, len(tok)), -1e4, np.float32); st = 0; last = 0
while True:
    seg = x[st:st + WIN]; seg = (seg - seg.mean()) / (seg.std() + 1e-7)
    l = sess.run(None, {'x': seg[None]})[0][0]
    l = l - l.max(1, keepdims=True); l -= np.log(np.exp(l).sum(1, keepdims=True))
    f0 = st // 320; q = WIN // 320 // 4; lo = 0 if st == 0 else q; hi = len(l) if st + WIN >= len(x) else len(l) - q
    E[f0 + lo:f0 + hi] = l[lo:hi]; last = f0 + hi
    if st + WIN >= len(x): break
    st += HOP
E = E[:last]

def norm(word):
    s = re.sub('[،.!؟…:"«»]', '', word).replace('ـ', '')
    s = re.sub('[ً-ْ]', '', s)
    s = re.sub('[أإآ]', 'ا', s)
    return ''.join(c for c in s if c in ID)

W = []
for li, line in enumerate(open('script.txt', encoding='utf-8').read().split('\n')):
    for ww in line.split():
        W.append({'w': ww, 'line': li})
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
json.dump(W, open('words3.json', 'w'), ensure_ascii=False)
for i, ww in enumerate(W): print(f"{i:3d} {ww['s']:6.2f}-{ww['e']:6.2f} {ww['conf']:.2f} {ww['w']}")
