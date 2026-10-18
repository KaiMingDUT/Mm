"""Manual corrections after align.py (new recording): "لا، لا…" starts after the pause at 4.60."""
import json
W = json.load(open('words3.json')); nu = json.load(open('nuclei.json'))['t']
# words 0-10 (إذا … طائرة!) spread over the nuclei of 0.52-4.60 by syllables
ws = W[0:11]; n = [x for x in nu if .47 <= x <= 4.65]; Sy = sum(w['syl'] for w in ws); q = 0
for w in ws:
    i0 = min(len(n) - 1, int(q * len(n) / Sy)); i1 = min(len(n) - 1, int((q + w['syl'] - 1) * len(n) / Sy))
    w['s'] = max(.52, n[i0] - .09); w['e'] = min(4.60, n[i1] + .14); q += w['syl']
for x, y in zip(ws, ws[1:]):
    if x['e'] > y['s']: x['e'] = y['s']
ws[-1]['e'] = 4.60
# لا، لا… مو هذا اللي تتخيله!  (sub-pauses at 5.58-5.78 and 6.38-6.55)
for i, (s, e) in zip(range(11, 17), [(5.21, 5.40), (5.40, 5.58), (5.78, 5.95), (5.95, 6.14), (6.14, 6.38), (6.50, 6.94)]):
    W[i]['s'], W[i]['e'] = s, e
json.dump(W, open('words3.json', 'w'), ensure_ascii=False)
print(' '.join(f"{w['w']}@{w['s']:.2f}" for w in W[:18]))
