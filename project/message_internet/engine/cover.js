// Reel cover: the globe with the subsea-cable network and the Riyadh → New York light arc, the phone with the sent
// message, title on top. Key content stays inside the centre 1080×1350 (4:5 grid crop: y 285…1635).
window.SHOTS = [{ s: -1, e: 99, noPunch: true, update(lt, t) {
  const r = R(); space(r);
  globeCam(MID[0] - 2, MID[1] - 6, 7.4, v3(0, .42, 0), 32);
  r.CABLES.forEach(c => { c.m.uniforms.p.value = 1; c.m.uniforms.a.value = .85; c.m.uniforms.t.value = 1.3; });
  r.MSGARC.m.uniforms.p.value = 1; r.MSGARC.m.uniforms.t.value = 0;
  r.cityDot.RUH.material.opacity = 1; r.cityDot.NYC.material.opacity = 1;
  const nyc = r.ll(...r.CITY.NYC, 1.01), ruh = r.ll(...r.CITY.RUH, 1.01);
  r.glow(nyc, .35, 0x59c7ff, 1); r.glow(nyc, .12, 0xffffff, 1); r.ring(nyc, .1, 0x59c7ff, .9); r.ring(nyc, .17, 0x59c7ff, .45);
  r.glow(ruh, .25, 0x59c7ff, .9);
  const hp = r.MSGARC.curve.getPointAt(.62); r.glow(hp, .22, 0x59c7ff, .9); r.glow(hp, .07, 0xffffff, 1);
  // the phone in the lower-left corner, in front of the globe
  r.paintPhone({ typed: 1, sent: 1, ticks: 2, glow: 1 });
  const q = r.cam.quaternion, f = v3(0, 0, -1).applyQuaternion(q), rt = v3(1, 0, 0).applyQuaternion(q), up = v3(0, 1, 0).applyQuaternion(q);
  const pp = r.cam.position.clone().addScaledVector(f, 3.0).addScaledVector(rt, -.25).addScaledVector(up, -.42);
  r.phone.visible = true; r.phone.position.copy(pp); r.phone.quaternion.copy(q); r.phone.rotateY(.3); r.phone.rotateZ(.08); r.phone.scale.setScalar(.3); r.phone.updateMatrixWorld(true);
} }];
window.TL = Object.assign(window.TL, {
  remap: t => t, lead: 0, flashes: [], subs: [], bug: () => 0,
  scenes: [{ s: -1, e: 99, build(root) {
    document.getElementById('subband').style.display = 'none';
    root.appendChild(el(`<div style="position:absolute;left:40px;right:40px;top:310px;text-align:center;text-shadow:0 4px 24px rgba(0,0,0,.9)">
      <div style="display:inline-block;padding:12px 32px;border-radius:999px;background:rgba(8,11,18,.78);border:2px solid ${C.cyan};font-weight:700;font-size:40px;color:${C.ink}">كيف توصل رسالتك؟</div>
      <div style="font-weight:700;font-size:112px;line-height:1.18;margin-top:26px;color:${C.ink}">رسالتك تعبر العالم<br><span style="color:${C.cyan}">من تحت البحر!</span></div>
    </div>`));
    root.appendChild(el(`<div style="position:absolute;right:60px;top:1400px;text-align:center"><div style="padding:10px 30px;border-radius:999px;background:rgba(8,11,18,.82);border:2px solid ${C.cyan};box-shadow:0 0 30px rgba(89,199,255,.35);font-family:PlexLatin;font-weight:700;font-size:58px;color:${C.ink};direction:ltr">0.10 s</div><div style="margin-top:8px;font-weight:500;font-size:30px;color:${C.cyan}">من الرياض لنيويورك</div></div>`));
  }, update() {} }],
});
