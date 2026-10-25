# CTC forced alignment of the script onto voice16.wav → word s/e in words3.json (story time).
# Emissions: Omnilingual-ASR CTC 1B (Meta, MMS successor; sherpa-onnx int8 export), Arabic characters natively.
# usage: python3 align_fa.py MODEL_DIR   (MODEL_DIR has model.int8.onnx + tokens.txt)
import json, re, sys, wave
import numpy as np, onnxruntime as ort, torch, torchaudio.functional as F

D = sys.argv[1]
tok = [l.rstrip('\n').rsplit(' ', 1)[0] for l in open(D + '/tokens.txt')]
ID = {t: i for i, t in enumerate(tok)}
BLANK, SP, FR = 0, ID[' '], 0.02

w = wave.open('voice16.wav'); x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
sess = ort.InferenceSession(D + '/model.int8.onnx')
# 20 s windows, 10 s hop, keep the middle 10 s of each (the model degrades on one 100 s pass)
N = len(x) // 320; WIN, HOP = 20 * 16000, 10 * 16000
E = np.full((N + 50, len(tok)), -1e4, np.float32); st = 0; last = 0
while True:
    seg = x[st:st + WIN]; seg = (seg - seg.mean()) / (seg.std() + 1e-7)
    l = sess.run(None, {'x': seg[None]})[0][0]
    l = l - l.max(1, keepdims=True); l -= np.log(np.exp(l).sum(1, keepdims=True))
    f0 = st // 320; lo = 0 if st == 0 else 250; hi = len(l) if st + WIN >= len(x) else 750
    E[f0 + lo:f0 + hi] = l[lo:hi]; last = f0 + hi
    if st + WIN >= len(x): break
    st += HOP
E = E[:last]

LATIN = {'AirTag': 'ايرتاق', 'GPS': 'جي بي اس', 'Apple': 'ابل'}
def norm(word):
    s = re.sub('[،.!؟…:]', '', word).replace('ـ', '')
    for k, v in LATIN.items(): s = s.replace(k, v)
    s = re.sub('[ً-ْ]', '', s)
    return re.sub('[أإآ]', 'ا', s)

W = json.load(open('words3.json'))
# closing line that is in the recording but was missing from script.txt (heard by ASR at ≈94–103 s)
EXTRA = 'وهنا 2|سر 1|الـAirTag: 3|جهاز 2|صغير 2|ما 1|عنده 2|GPS، 3|لكنه 2|يستفيد 3|من 1|أجهزة 3|Apple 2|القريبة 4|منه 2|عشان 2|يساعدك 3|تلقى 2|أغراضك. 3'
if len(W) == 182:
    items = [it.rsplit(' ', 1) for it in EXTRA.split('|')]; li = W[-1]['line'] + 1
    for k, (ww, s) in enumerate(items):
        W.append({'w': ww, 'syl': int(s), 'line': li, 'pen': 0 if k == len(items) - 1 else (0.6 if ww[-1] in '،.!؟…:' else 3.0)})

target, owner = [], []
for i, ww in enumerate(W):
    if i: target.append(SP); owner.append(-1)
    for c in norm(ww['w']):
        target.append(ID[' '] if c == ' ' else ID[c]); owner.append(i)
ali, sc = F.forced_align(torch.from_numpy(E)[None], torch.tensor([target], dtype=torch.int32), blank=BLANK)
spans = F.merge_tokens(ali[0], sc[0].exp())
assert len(spans) == len(target)
for i, ww in enumerate(W):
    sp = [s for s, o in zip(spans, owner) if o == i]
    ww['s'] = round(sp[0].start * FR, 3); ww['e'] = round(sp[-1].end * FR, 3)
    ww['conf'] = round(float(np.mean([s.score for s in sp])), 2)
json.dump(W, open('words3.json', 'w'), ensure_ascii=False)
for ww in W: print(f"{ww['s']:7.2f}-{ww['e']:6.2f} {ww['conf']:.2f} {ww['w']}")
