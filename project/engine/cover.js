// KROZO Reel cover — one still frame. Key content kept inside the centre 1080x1350 (profile-grid crop).
const coverScene = {
  s: 0, e: 100, fi: 0, fo: 0,
  focus: () => ({ x: 540, y: 1100, r: 900, a: .1 }),
  build(r) {
    r.appendChild(el(`<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,11,18,.96) 0%,rgba(8,11,18,.88) 22%,rgba(8,11,18,.55) 40%,rgba(8,11,18,0) 52%,rgba(8,11,18,0) 82%,rgba(8,11,18,.9) 100%)"></div>`));
    r.appendChild(el(`<div style="position:absolute;left:70px;right:70px;top:330px;text-align:center">
      <div style="display:inline-flex;align-items:center;gap:14px;direction:ltr;font-family:PlexLatin;font-weight:700;font-size:30px;letter-spacing:9px;color:${C.gray}">
        KROZO<i style="width:9px;height:9px;border-radius:50%;background:${C.blue};box-shadow:0 0 14px ${C.blue}"></i><span style="font-weight:500;font-size:24px;letter-spacing:6px">BEYOND TECH</span></div>
      <div style="font-weight:700;font-size:118px;line-height:1.18;margin-top:34px;color:${C.ink};text-shadow:0 6px 40px rgba(0,0,0,.7)">كيف يعرف<br><span class="latin" style="font-family:PlexLatin;color:${C.blue}">Google Maps</span><br>إن فيه زحمة؟</div>
    </div>`));
    r.appendChild(el(`<div class="tag" style="position:absolute;padding:16px 36px;border-radius:22px;background:${C.blue};color:${C.ink};font-size:58px;font-weight:700;box-shadow:0 12px 50px rgba(22,139,255,.55)">زحمة</div>`));
    r.appendChild(el(`<div style="position:absolute;left:0;right:0;top:1500px;text-align:center">
      <div style="display:inline-block;padding:18px 40px;border-radius:999px;background:rgba(8,11,18,.82);border:2px solid ${C.cyan};font-size:46px;font-weight:700;color:${C.ink}">السر في <span style="color:${C.cyan}">جوالك</span></div></div>`));
  },
  update(r, lt, t) {
    const zc = WORLD.at((WORLD.ZONE[0] + WORLD.ZONE[1]) / 2, 0);
    G3.setMap({ x: zc[0] + 30, y: zc[1] - 420, z: 1.3, pitch: 40, yaw: -28 });
    document.getElementById('subband').style.display = 'none';
    G3.set({ opacity: 1, cars: 1, jam: 1, bloom: 1.0 });
    const p = G3.project(zc, 4), tag = r.querySelector('.tag');
    tag.style.left = Math.min(p[0] + 40, W - 300) + 'px'; tag.style.top = (p[1] - 175) + 'px';
  },
};
window.TL = { voiceEnd: 1, bug: () => 0, subs: [], scenes: [coverScene] };
