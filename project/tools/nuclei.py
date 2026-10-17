import wave,sys,json
import numpy as np
w=wave.open(sys.argv[1]);sr=w.getframerate();x=np.frombuffer(w.readframes(w.getnframes()),np.int16).astype(float)/32768
# band-pass 250-2500 Hz via FFT mask per frame (vowel energy)
hop=int(.01*sr);win=int(.03*sr);n=(len(x)-win)//hop
fr=np.stack([x[i*hop:i*hop+win]*np.hanning(win) for i in range(n)])
sp=np.abs(np.fft.rfft(fr,axis=1));f=np.fft.rfftfreq(win,1/sr)
band=sp[:,(f>250)&(f<2500)].sum(1);low=sp[:,(f>60)&(f<250)].sum(1)
e=20*np.log10(band+1e-9)
k=np.array([1,2,3,2,1],float);k/=k.sum();es=np.convolve(e,k,'same')
thr=np.percentile(es,25)+(np.percentile(es,95)-np.percentile(es,25))*.35
peaks=[]
for i in range(2,n-2):
    if es[i]>=es[i-1] and es[i]>es[i+1] and es[i]>thr:
        # prominence: dip on both sides >= 2 dB within 120ms
        l=es[max(0,i-12):i].min(); r=es[i+1:i+13].min()
        if es[i]-max(l,r)>=2.0:
            if peaks and i-peaks[-1]<9:
                if es[i]>es[peaks[-1]]: peaks[-1]=i
                continue
            peaks.append(i)
t=[(p*hop+win/2)/sr for p in peaks]
json.dump({'t':t,'e':es.tolist(),'thr':float(thr)},open(sys.argv[2],'w'))
print(len(t))
