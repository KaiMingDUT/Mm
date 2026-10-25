import json,sys
S='.'
W=json.load(open('words3.json'))
K=json.load(open('warp.json'))['knots']
def V(ts):
    for (s0,v0),(s1,v1) in zip(K,K[1:]):
        if ts<=s1: return v0+(ts-s0)*(v1-v0)/((s1-s0) or 1)
    return K[-1][1]+ts-K[-1][0]
NOBRK={'ساعة','كمية','تدفّق','نبضات','الضوء','في','على','مع','عن','من','إن','ما','لو','هذا','هذي','مو','كل','أي','شبكة','موقع','مكان','جهاز','إشارة','ولا','لكن','قرص','جهاز','عالم','بيانات','قوس','ألوان','مثل','إلى'}
lines={}
for w in W: lines.setdefault(w['line'],[]).append(w)
subs=[]
for li in sorted(lines):
    ws=lines[li];groups=[];cur=[]
    for i,w in enumerate(ws):
        cur.append(w)
        brk = w['w'][-1] in '،.!؟…:' and len(ws)-i>1
        glue = w['w'] in NOBRK
        nxt_end = i+1<len(ws) and ws[i+1]['w'][-1] in '،.!؟…:'   # never leave the clause's last word alone
        if brk or (len(cur)>=4 and len(ws)-i>2 and not glue and not nxt_end): groups.append(cur);cur=[]
    if cur:
        if len(cur)==1 and groups and len(groups[-1])<5: groups[-1]+=cur
        else: groups.append(cur)
    for g in groups: subs.append({'s':round(g[0]['s']-0.06,3),'e':round(g[-1]['e']+0.2,3),'words':[{'w':x['w'],'s':round(x['s'],3),'e':round(x['e'],3)} for x in g]})
for a,b in zip(subs,subs[1:]):
    a['e']=min(a['e'],b['s']-0.02)
    if b['s']-a['e']<0.45: a['e']=b['s']-0.02
open('engine/subs.js','w').write('const SUBS='+json.dumps(subs,ensure_ascii=False)+';\nconst WT='+json.dumps([round(w['s'],3) for w in W])+';\n')
open('engine/warp.js','w').write('const WARP='+json.dumps(K)+';\n')
def ts(x):
    ms=int(round(x*1000));return f"{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}"
open('playstation.ar.srt','w',encoding='utf-8').write('\n'.join(f"{i}\n{ts(V(s['s']))} --> {ts(V(s['e']))}\n"+' '.join(w['w'] for w in s['words'])+"\n" for i,s in enumerate(subs,1)))
for i,w in enumerate(W): print(i,w['w'],round(w['s'],2),end=' | ')
