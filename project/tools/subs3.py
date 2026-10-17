import json,sys
S=sys.argv[1]
W=json.load(open(S+'/words3.json'))
lines={}
for w in W: lines.setdefault(w['line'],[]).append(w)
subs=[]
for li in sorted(lines):
    ws=lines[li];n=len(ws);k=1 if n<=4 else (n+3)//4;size=-(-n//k)
    groups=[];cur=[]
    for i,w in enumerate(ws):
        if len(cur)>=size and w['w']!='Maps' and len(ws)-i>=2: groups.append(cur);cur=[]
        cur.append(w)
    if len(cur)==1 and groups and len(groups[-1])<5: groups[-1]+=cur
    else: groups.append(cur)
    # merge very short groups (<0.7s) forward when result stays <=5 words
    m=[]
    for g in groups:
        if m and ((m[-1][-1]['e']-m[-1][0]['s']<0.7 and len(m[-1])+len(g)<=5) or (m[-1][-1]['e']-m[-1][0]['s']<0.5 and len(m[-1])+len(g)<=7)): m[-1]+=g
        else: m.append(g)
    for g in m: subs.append({'s':round(g[0]['s']-0.06,3),'e':round(g[-1]['e']+0.2,3),'words':[{'w':x['w'],'s':round(x['s'],3),'e':round(x['e'],3)} for x in g]})
for a,b in zip(subs,subs[1:]):
    a['e']=min(a['e'],b['s']-0.02)
    if b['s']-a['e']<0.45: a['e']=b['s']-0.02
open(S+'/engine/subs.js','w').write('const SUBS='+json.dumps(subs,ensure_ascii=False)+';\n')
def ts(x):
    m=int(x//60);s=x%60;return f"00:{m:02}:{int(s):02},{int(round((s-int(s))*1000)):03}"
open(S+'/krozo_google_maps_traffic.ar.srt','w',encoding='utf-8').write('\n'.join(f"{i}\n{ts(s['s'])} --> {ts(s['e'])}\n"+' '.join(w['w'] for w in s['words'])+"\n" for i,s in enumerate(subs,1)))
for s in subs: print(f"{s['s']:6.2f}-{s['e']:6.2f} "+' '.join(w['w'] for w in s['words']))
