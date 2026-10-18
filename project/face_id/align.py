import json,sys
S=sys.argv[1]
nu=json.load(open(S+'/nuclei.json'))['t']
END=float(sys.argv[2])
P=[tuple(map(float,l.split())) for l in open(S+'/pauses_m.txt') if l.strip()]
TH=float(sys.argv[4]) if len(sys.argv)>4 else .25
big=P[:1]+[p for p in P[1:] if p[1]-p[0]>=TH]
# speech chunks between big pauses
ch=[];prev=big[0][1]
for a,b in big[1:]:
    if a-prev<0.15 and ch is not None: prev=b; continue   # breath/click between two pauses: not speech
    ch.append((prev,a));prev=b
if prev<END-0.2: ch.append((prev,END))
pass
chn=[[x for x in nu if a-.05<=x<=b+.05] for a,b in ch]
words=[];
for li,l in enumerate(open(S+'/syl.txt')):
    items=[it.rsplit(' ',1) for it in l.strip().split('|')]
    for k,(w,s) in enumerate(items):
        last=k==len(items)-1
        pen=0 if last else (0.6 if w[-1] in '،.!؟…' else 3.0)
        words.append({'w':w,'syl':int(s),'line':li,'pen':pen})
M=len(words);K=len(ch);INF=1e18
R=float(sys.argv[3]) if len(sys.argv)>3 else 0.845
def cost(i,j,k):
    s=sum(w['syl'] for w in words[i:j]);n=len(chn[k])
    inner=sum(1.4 for w in words[i:j-1] if w['w'][-1] in '،.!؟…:')   # punctuation should end a chunk
    return (R*s-n)**2/(0.25*n+2)+words[j-1]['pen']+inner
dp=[[INF]*(M+1) for _ in range(K+1)];bk=[[0]*(M+1) for _ in range(K+1)]
dp[0][0]=0
for k in range(K):
    for i in range(M):
        if dp[k][i]>=INF: continue
        for j in range(i+1,min(M,i+40)+1):
            c=dp[k][i]+cost(i,j,k)
            if c<dp[k+1][j]: dp[k+1][j]=c;bk[k+1][j]=i
j=M;segs=[]
for k in range(K,0,-1):
    i=bk[k][j];segs.append((i,j));j=i
segs.reverse()
for k,((i,j),(a,b)) in enumerate(zip(segs,ch)):
    ws=words[i:j];n=chn[k];Sy=sum(w['syl'] for w in ws)
    q=0
    for w in ws:
        if n:
            i0=min(len(n)-1,int(q*len(n)/Sy));i1=min(len(n)-1,int((q+w['syl']-1)*len(n)/Sy))
            w['s']=max(a,n[i0]-.09);w['e']=min(b,n[i1]+.14)
        else: w['s']=a+(b-a)*q/Sy;w['e']=a+(b-a)*(q+w['syl'])/Sy
        q+=w['syl']
    # make starts monotonic / contiguous
    for x,y in zip(ws,ws[1:]):
        if y['s']<x['e']: mid=(x['e']+y['s'])/2; x['e']=mid; y['s']=mid
    print(f"{a:6.2f}-{b:6.2f} n={len(n):2d} syl={Sy:2d} | "+' '.join(w['w'] for w in ws))
json.dump(words,open(S+'/words3.json','w'),ensure_ascii=False)
