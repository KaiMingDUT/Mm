import json,sys
K=json.load(open('warp.json'))['knots']
def V(ts):
    for (s0,v0),(s1,v1) in zip(K,K[1:]):
        if ts<=s1: return v0+(ts-s0)*(v1-v0)/((s1-s0) or 1)
    return K[-1][1]+ts-K[-1][0]
print(','.join(f'{V(float(x)-.15):.2f}' for x in sys.argv[1].split(',')))
