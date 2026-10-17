// Reel cover: KROZO jet at night + title (key content inside the centre 1080×1350 for the 4:5 grid crop).
window.SHOTS = [{ s: -1, e: 99, update(lt, t) {
  exterior(2.0, 0); const r = R();
  r.lookCam(v3(36, -9, 34), v3(-1, 1.5, 0), 34);
  r.phoneAt(v3(9, -3.2, 24), -.25, .5, .12, 60); r.setUI({ lock: false, cc: 1, plane: 1, bars: 0 });
  r.emit(v3(4, 0, 0), 1.3, { R: 30, per: .5, life: 1.6, a: .35 });
}, noPunch: true }];
window.TL = Object.assign(window.TL, {
  remap: t => t, lead: 0, flashes: [], subs: [], bug: () => 1,
  scenes: [{ s: -1, e: 99, build(root) {
    root.appendChild(el(`<div style="position:absolute;left:50px;right:50px;top:330px;text-align:center;${SH}">
      <div style="display:inline-block;padding:12px 30px;border-radius:999px;background:rgba(8,11,18,.75);border:2px solid ${K.orange};font-weight:700;font-size:40px;color:${C.ink}">✈ وضع الطيران</div>
      <div style="font-weight:700;font-size:118px;line-height:1.18;margin-top:28px;color:${C.ink}">جوالك ممكن<br><span style="color:${C.cyan}">يطيّح طائرة؟</span></div>
    </div>`));
  }, update() {} }],
});
