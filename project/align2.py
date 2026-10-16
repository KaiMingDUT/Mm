import json,re,sys
pauses=[tuple(map(float,l.split())) for l in open(sys.argv[1]) if l.strip()]
FR=[
("تخيل",0.38,0.99),
("إنك تسوق على طريق سريع،",1.13,2.49),
("وفجأة",2.78,3.28),
("تشوف على Google Maps",3.79,5.93),
("إنه الطريق زحمة،",6.31,7.67),
("مع إنه ما فيه",7.80,9.19),
("كاميرات تراقب الطريق،",9.52,10.93),
("ولا حساسات",11.39,12.31),
("ولا أحد بلّغ عن حادث!",12.77,13.96),
("طيب، كيف يعرف؟",14.41,16.35),
("جوالك اللي بيدك،",17.01,17.84),
("وجوالات مئات الناس اللي حولك،",18.15,19.71),
("هي اللي",20.12,20.70),
("تساعد Google Maps يكتشف الزحمة!",21.00,23.31),
("الجوال يحدد موقعك باستخدام الـ GPS،",23.75,25.56),
("ولما تغيّر موقعك مع الوقت،",25.92,28.21),
("يقدر النظام يقدّر سرعتك.",28.77,31.01),
("لكن لو جوال واحد يتحرك ببطء",31.37,33.08),
("ما يعني بالضرورة",33.63,34.59),
("إن فيه زحمة…",34.91,36.15),
("لكن اتخيل لو مئات الجوالات على نفس الطريق",36.36,38.90),
("بدأت تتحرك ببطء،",39.62,41.77),
("هنا يبدا النظام يلاحظ شيء غريب.",42.21,45.49),
("ويبدا يجمع بيانات كل الجوالات في هذاك الطريق،",46.00,48.47),
("ويقارن سرعتها بالسرعة المعتادة،",49.04,50.25),
("وإذا لاحظ إن الحركة أبطأ بكثير من الطبيعي،",50.42,52.11),
("وهنا يقدر يستنتج إن فيه زحمة",52.67,56.06),
]
SP={'Google':6,'Maps':5,'GPS':7,'الـ':2}
wt=lambda w:SP.get(re.sub(r'[^\w]','',w),len(re.sub(r'[^\w]','',w)))+1.2
words=[];frags=[]
for text,s,e in FR:
    segs=[(s,e)]
    for a,b in pauses:
        if s<a and b<e:
            x,y=segs.pop();segs+= [(x,a),(b,y)]
    L=sum(b-a for a,b in segs);ws=text.split();ww=[wt(w) for w in ws];acc=0
    def at(x):
        for a,b in segs:
            if x<=b-a+1e-9:return a+x
            x-=b-a
        return e
    fw=[]
    for w,k in zip(ws,ww):
        a=at(acc/sum(ww)*L);acc+=k;fw.append({'w':w,'s':round(a,3),'e':round(at(acc/sum(ww)*L),3)})
    words+=fw;frags.append({'text':text,'s':s,'e':e,'words':fw})
# subtitle groups: fragments, split into <=4 words; merge 1-word frags with next if tiny gap
subs=[]
for f in frags:
    ws=f['words'];n=len(ws)
    k=1 if n<=4 else (n+3)//4
    size=-(-n//k)
    for i in range(0,n,size):
        g=ws[i:i+size];subs.append({'s':g[0]['s']-0.08,'e':g[-1]['e']+0.25,'words':g})
for a,b in zip(subs,subs[1:]):
    a['e']=min(a['e'],b['s']-0.02)
    if b['s']-a['e']<0.5: a['e']=b['s']-0.02   # hold subtitle through short pauses
json.dump({'frags':frags,'subs':subs},open(sys.argv[2],'w'),ensure_ascii=False)
for s in subs: print(f"{s['s']:6.2f}-{s['e']:6.2f} "+' '.join(w['w'] for w in s['words']))
