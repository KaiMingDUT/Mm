// KROZO — "كيف يلقى الـAirTag شنطتك؟"  shots in story time (w(i) = start of word i of the voice-over).
const VOICE_END = 103.0;
const w = i => WT[i];
const sm = (a, b, t) => ease.inOut(prog(t, a, b));
const big = (txt, extra = '') => el(`<div style="position:absolute;left:50px;right:50px;text-align:center;${extra}">${txt}</div>`);
function popIn(node, t, at, dur = .3, rise = 30) {
  const k = ease.back(prog(t, at, at + dur));
  node.style.opacity = clamp(prog(t, at, at + dur * .5));
  node.style.transform = `translateY(${(1 - k) * rise}px) scale(${.86 + .14 * k})`;
  return k;
}
const hide = (node, t, at, d = .2) => node.style.opacity = Math.min(+node.style.opacity, 1 - prog(t, at, at + d));
const R = () => window.R3;
const v3 = (x, y, z) => R().V(x, y, z);
const noise = (t, f) => Math.sin(t * f) * .6 + Math.sin(t * f * 2.13 + 1.7) * .3 + Math.sin(t * f * 4.7 + .3) * .1;
const S = [];
const shot = (s, e, update, o = {}) => { const x = Object.assign({ s, e, update }, o); S.push(x); return x; };
const orbit = (c, d, az, el) => v3(c.x + Math.sin(az) * Math.cos(el) * d, c.y + Math.sin(el) * d, c.z + Math.cos(az) * Math.cos(el) * d);
const P2 = v => R().project(v);
const D2R = Math.PI / 180;
// globe helpers: face a lat/lon to the camera (+z)
function faceEarth(lat, lon, spin = 0) { R().earth.rotation.set(lat * D2R, (-lon + spin) * D2R, 0); R().earth.updateMatrixWorld(true); }
const onEarth = (lat, lon, r = 1) => R().ll(lat, lon, r).applyMatrix4(R().earth.matrixWorld);
function gcKm(a, b) { const p1 = a.lat * D2R, p2 = b.lat * D2R, dl = (b.lon - a.lon) * D2R; return 6371 * Math.acos(Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(dl)); }
const KM = Math.round(gcKm({ lat: 51.47, lon: -.4543 }, { lat: 24.9576, lon: 46.6988 }));
// plan (airport) layout, metres
const BAGP = { x: -4.5, z: -2 }, BAGS = 2.4;
function planBag(t, o = {}) { const r = R(); r.bag.visible = true; r.bag.scale.setScalar(BAGS); r.bag.position.set(BAGP.x, .03 * BAGS + .75 * BAGS * .0, BAGP.z); r.bag.position.y = (.31 + .055) * BAGS; r.bag.rotation.set(0, .5, 0); r.bagHolo(o.holo ?? true); }
const BAGC = () => v3(BAGP.x, 1.2, BAGP.z);
// readable glass label (HTML) attached to a 3D point
function ovTag(txt, v, dx, dy, k = 1, cls = '') {
  if (k <= 0) return ''; const [x, y] = P2(v), x2 = x + dx, y2 = y + dy;
  return `<svg class="ld" style="opacity:${k}"><line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}"/><circle cx="${x}" cy="${y}" r="5"/></svg><div class="tag ${cls}" style="opacity:${k};left:${x2}px;top:${y2}px">${txt}</div>`;
}
const ovNote = (txt = 'رسم توضيحي') => `<div class="note">${txt}</div>`;
window.POST3D = (sh, lt, t) => { const o = document.getElementById('ov'); if (o) o.innerHTML = sh && sh.ov ? sh.ov(lt, t, sh) : ''; };

// ═════════ HOOK: your phone quietly helps a stranger ═════════
// A1: airport (holo plan) — you walk past a lost bag; its ping touches your phone; a dot leaves for the sky
const A1 = shot(0, w(4) - .05, (lt, t) => {
  const r = R(); r.stage('plan', t); planBag(t);
  const x = -11.5 + lt * 1.6, ph = lt * 5.2, me = r.walkers[0];
  const near = Math.hypot(x - BAGP.x, 1.2 - BAGP.z) < 9;
  r.walk(me, v3(x, 0, 1.2), Math.PI / 2, ph, { scale: 1.8, lit: near ? 1 : 0 });
  r.emit(BAGC(), t, { R: 9, per: 1.1, life: 1.6, face: 'up', w: .02, col: 0x59c7ff, a: .9 });
  if (near) { const pp = v3(x, 2.1, 1.6); r.glow(pp, 1.4, 0x9fe1ff, .9); r.beam(pp, pp.clone().add(v3(0, 30, 0)), .06, 0x59c7ff, .8, { t: t * 3, n: 10, grow: clamp((lt - 1.6) * 1.5) }); }
  const c = v3(-7 + lt * .5, 1, 0); r.lookCam(orbit(c, 24 - lt * 1.2, .5 + lt * .03, .42), c, 55);
});
// A2: the stranger's phone (far away) — the bag pops up on their map
const A2 = shot(w(4) - .05, w(11) - .05, (lt, t) => {
  const r = R(); r.stage('studio', t);
  r.phoneAt(r.phoneB, v3(0, 0, 0), -.25, -.35 + lt * .06, .02);
  const k = sm(w(8), w(8) + .4, t);
  r.drawUI(r.phoneB, { mode: 'map', pin: k, pulse: (t * .7) % 1, when: 'آخر ظهور: الآن' });
  const c = v3(0, .005, 0); r.lookCam(orbit(c, .5 - lt * .02, -.3 + lt * .05, .08), c, 30);
  r.grade.flash.value = .25 * (t >= w(8) ? 1 - prog(t, w(8), w(8) + .25) : 0);
});
// A3: your phone — nothing on the lock screen
const A3 = shot(w(11) - .05, w(17) - .05, (lt, t) => {
  const r = R(); r.stage('studio', t);
  r.phoneAt(r.phoneA, v3(0, 0, 0), -.15, .3 - lt * .05, -.02);
  r.drawUI(r.phoneA, { mode: 'lock', time: '9:41' });
  const c = v3(0, .01, 0); r.lookCam(orbit(c, .42 - lt * .025, .25, .05), c, 30);
});
// A4: "ما تحتاج تسوي أي شيء" — phone on the floor, rings pass through, a report rises on its own
const A4 = shot(w(17) - .05, w(26) - .05, (lt, t) => {
  const r = R(); r.stage('studio', t);
  r.phoneAt(r.phoneA, v3(0, .0, 0), -Math.PI / 2, 0, .4);
  r.drawUI(r.phoneA, { mode: 'lock', time: '9:41', relay: 0 });
  r.emit(v3(-.25, .004, -.15), t, { R: .55, per: 1.0, life: 1.8, face: 'up', w: .02, a: .8 });
  const up = prog(t, w(22), w(25) + .4); const pp = v3(0, .02 + up * .6, 0);
  if (t > w(22)) { r.glow(pp, .05, 0x9fe1ff, 1 - prog(up, .8, 1)); r.beam(v3(0, .01, 0), pp, .002, 0x59c7ff, .7, { t: t * 4, n: 12 }); }
  const c = v3(0, .03, 0); r.lookCam(orbit(c, .6 - lt * .02, .4 + lt * .04, .55), c, 30);
});
// A5: "كيف يصير هذا؟" — pull back into space
const A5 = shot(w(26) - .05, w(30) - .05, (lt, t) => {
  const r = R(); r.stage('globe', t);
  faceEarth(36, 20, lt * 3);
  const k = ease.inOut(prog(lt, 0, 1.6));
  r.lookCam(v3(0, .1, 1.6 + 4.6 * k), v3(0, 0, 0), 30);
  r.grade.zb.value = .6 * (1 - k);
}, { noPunch: true });
// A6: two pins thousands of km apart, arc draws, distance counts up
const a6k = t => sm(w(37), w(40) + .3, t);
const A6 = shot(w(30) - .05, w(41) - .05, (lt, t) => {
  const r = R(); r.stage('globe', t);
  faceEarth(38, 20 + lt * 1.2);
  r.arcMesh.visible = true; r.arcM.uniforms.p.value = a6k(t);
  const L = onEarth(r.LON.lat, r.LON.lon, 1.006), Rr = onEarth(r.RUH.lat, r.RUH.lon, 1.006);
  r.glow(L, .12, 0x9fe1ff); r.glow(Rr, .12, 0x59c7ff);
  r.emit(L, t, { R: .12, per: 1, life: 1.4, a: .8 }); r.emit(Rr, t, { R: .12, per: 1, life: 1.4, a: .8, ph: .5 });
  r.lookCam(v3(0, .35 - lt * .01, 3.7 - lt * .08), v3(0, .45, 0), 30);
}, {
  ov: (lt, t) => {
    const r = R(), L = onEarth(r.LON.lat, r.LON.lon, 1.006), Rr = onEarth(r.RUH.lat, r.RUH.lon, 1.006), k = a6k(t);
    const n = Math.round(KM * ease.out(k)).toLocaleString('en-US');
    return ovTag('الشنطة', L, 90, -200, prog(lt, .2, .5)) + ovTag('صاحبها', Rr, 120, 160, prog(lt, .5, .8)) +
      (k > 0 ? `<div class="km" style="opacity:${clamp(k * 3)}"><span class="latin">${n}</span> كم</div>` : '');
  },
});

// ═════════ THE AIRTAG ═════════
const tagHero = (t, sweepX, o = {}) => {
  const r = R(); r.stage('studio', t); r.tag.visible = true;
  r.sweep.intensity = (o.sweep ?? 0) * .02; r.sweep.position.set(sweepX, .12, .1); r.sweep.target.position.set(0, 0, 0);
};
const A7 = shot(w(41) - .05, w(47) - .05, (lt, t) => {
  const r = R(); const rev = sm(w(43), w(46) + .2, t);
  tagHero(t, -.2 + .4 * rev, { sweep: 2.5 * Math.sin(Math.PI * rev) });
  r.tag.rotation.set(1.15 - .25 * rev, lt * .25, 0);
  r.studio.userData.r1.intensity = 4 + 26 * rev; r.studio.userData.r2.intensity = 2 + 14 * rev; r.renderer.toneMappingExposure = .2 + .6 * sm(w(42), w(44), t);
  r.lookCam(orbit(v3(0, 0, 0), .2 - .05 * rev, .0, .12), v3(0, -.002, 0), 30);
  r.grade.flash.value = .35 * (t >= w(46) ? 1 - prog(t, w(46), w(46) + .3) : 0);
});
const A8 = shot(w(47) - .05, w(52) - .05, (lt, t) => {   // flips to show the steel back
  const r = R(); tagHero(t, 0);
  const f = ease.inOut(prog(lt, .3, 2.2));
  r.tag.rotation.set(1.1 + Math.PI * f, .4 + lt * .2, .1);
  r.lookCam(orbit(v3(0, 0, 0), .13 - lt * .01, .3, .2), v3(0, 0, 0), 30);
});
// A9: "جهاز صغير" — size callout
const A9 = shot(w(52) - .05, w(57) - .05, (lt, t) => {
  const r = R(); tagHero(t, 0); r.tag.rotation.set(Math.PI / 2 - .05, 0, 0);
  r.lookCam(v3(0, .002, .16 - lt * .006), v3(0, 0, 0), 30);
}, { ov: (lt, t) => { const k = sm(w(53), w(54), t), [x0] = P2(v3(-.016, 0, .004)), [x1, y1] = P2(v3(.016, 0, .004)); return k > 0 ? `<div class="dim" style="opacity:${k};left:${x0}px;width:${x1 - x0}px;top:${y1 + 230}px"><span class="latin">31.9 mm</span></div>` : ''; } });
// A10: into the suitcase
const A10 = shot(w(57) - .05, w(61) - .05, (lt, t) => {
  const r = R(); r.stage('studio', t);
  r.bag.visible = true; r.bag.rotation.set(-Math.PI / 2 + .12, 0, 0); r.bag.position.set(0, .12 + .0, 0);
  const open = 1 - sm(w(60) + .1, w(60) + .7, t); r.BAG.hinge.rotation.y = -1.9 * open;
  r.studio.userData.floor.position.y = 0;
  const drop = ease.inOut(prog(t, w(58), w(59) + .3));
  r.tag.visible = true; r.tag.rotation.set(-.2, 0, .1); r.tag.position.set(.0, .25 - .1 * drop + .002, -.12 + .0);
  r.tag.position.set(0, .25 * (1 - drop) + .14, -.12); r.tag.scale.setScalar(1.8); r.studio.userData.r1.intensity = 6; r.studio.userData.r2.intensity = 5;
  const c = v3(0, .15, -.1); r.lookCam(orbit(c, .55 - lt * .04, .3, .85), c, 34);
});
// A11: closed suitcase, x-ray glimpse of the tag inside
const A11 = shot(w(61) - .05, w(67) - .05, (lt, t) => {
  const r = R(); r.stage('studio', t);
  const x = sm(w(62), w(63), t);
  r.bag.visible = true; r.bag.position.set(0, .31 + .055, 0); r.bag.rotation.set(0, .5 + lt * .08, 0); r.bagHolo(x > .5); r.bagHoloM.uniforms.k.value = .8;
  r.tag.visible = x > .5; r.tag.scale.setScalar(2.2); r.tag.position.set(0, .31 + .055 + .12, 0); r.tag.rotation.set(Math.PI / 2, .5 + lt * .08, 0);
  if (x > .5) r.emit(r.tag.position.clone(), t, { R: .45, per: .9, life: 1.5, a: .9 });
  const c = v3(0, .36, 0); r.lookCam(orbit(c, 2.6 - lt * .06, .2, .12), c, 30);
});

// ═════════ NO GPS, NO SIM, NO INTERNET — exploded view ═════════
const partsShot = (t, lt, e, o = {}) => {
  const r = R(); r.stage('studio', t); r.studio.userData.floor.visible = false;
  r.setParts(e, (o.rot ?? 0) + lt * .25, .5);
  r.PARTS.bt.material.emissiveIntensity = o.bt ?? 0; r.PARTS.ant.material.emissiveIntensity = o.bt ?? 0;
  r.bloom.threshold = .9; r.bloom.strength = .3; r.studio.userData.r1.intensity = 14; r.studio.userData.r2.intensity = 8;
};
const xk = t => sm(w(67), w(69), t);
const A12 = shot(w(67) - .05, w(82) - .05, (lt, t) => {
  partsShot(t, lt, xk(t));
  const c = v3(0, 0, 0); R().lookCam(orbit(c, .29 - .02 * xk(t), .35 + lt * .02, .3), c, 30);
}, {
  ov: (lt, t) => {
    const r = R(), k = xk(t);
    return ovTag('بطارية صغيرة', r.partPos('bat'), 170, 120, prog(t, w(70), w(70) + .3) * k) + ovTag('شريحة بلوتوث', r.partPos('pcb'), -190, 40, prog(t, w(71), w(71) + .3) * k) +
      ovTag('سمّاعة', r.partPos('spk'), 160, -120, prog(t, w(72) - .2, w(72) + .1) * k) + ovNote();
  },
});
// A13: reassemble — "طيب، كيف يقدر يساعدك…؟"
const A13 = shot(w(82) - .05, w(89) - .05, (lt, t) => {
  const e = 1 - sm(w(83), w(85), t);
  partsShot(t, lt, e, { rot: 1 });
  R().lookCam(orbit(v3(0, 0, 0), .27 - lt * .01, .6, .35 - .1 * (1 - e)), v3(0, 0, 0), 30);
});
// A14: "خلني أشرح لك" — dive to the Bluetooth chip
const A14 = shot(w(89) - .05, w(92) - .05, (lt, t) => {
  const k = ease.inOut(prog(lt, 0, 1.4));
  partsShot(t, lt, .6, { rot: 2, bt: .6 * k });
  const c = R().partPos('pcb'); R().lookCam(orbit(c, .17 - .11 * k, .2, .9), c, 30);
  R().grade.zb.value = .7 * prog(lt, .8, 1.4);
}, { noPunch: true });

// ═════════ HOW IT WORKS ═════════
// A15: periodic Bluetooth pulses from the tag
const A15 = shot(w(92) - .05, w(98) - .05, (lt, t) => {
  const r = R(); tagHero(t, 0); r.studio.userData.floor.visible = false; r.tag.rotation.set(1.2, lt * .3, 0);
  r.tagLight.intensity = .05;
  r.emit(v3(0, 0, 0), t, { R: .09, per: 1.0, life: 1.6, a: 1, w: .04, from: w(93) - 1.2 });
  r.lookCam(orbit(v3(0, 0, 0), .16 + lt * .01, -.2, .25), v3(0, 0, 0), 30);
  r.bloom.threshold = .75; r.bloom.strength = .45;
}, { ov: (lt, t) => { const on = sm(w(96), w(96) + .3, t); if (!on) return ''; let h = '<div class="ticks" style="opacity:' + on + '">'; for (let i = 0; i < 9; i++) { const ph = ((t - i * 1.0) % 1 + 1) % 1; h += `<i style="opacity:${t - w(93) > i ? 1 : .25}"></i>`; } return h + '</div>'; } });
// A16: nearby compatible devices hear it
const DEVP = [[3.2, .9, 1.6], [-3.4, .8, 1.2], [2.6, .75, -2.8], [-2.2, .9, -3.2], [9, .9, 4], [-10, .8, -6]];
const A16 = shot(w(98) - .05, w(106) - .05, (lt, t) => {
  const r = R(); r.stage('plan', t); r.devices.visible = true;
  r.tag.visible = true; r.tag.scale.setScalar(25); r.tag.position.set(0, .45, 0); r.tag.rotation.set(0, 0, 0);
  const T0 = w(98);
  r.emit(v3(0, .5, 0), t, { R: 7, per: 1.1, life: 1.7, face: 'up', w: .02, a: .9 });
  r.DEV.forEach((d, i) => {
    const [x, y, z] = DEVP[i], dist = Math.hypot(x, z), inR = dist < 7, hit = T0 + .8 + dist * .2 + i * .15;
    d.position.set(x, y, z); d.rotation.set(d.children.length > 2 ? 0 : -.9, Math.atan2(-x, -z), 0); d.scale.setScalar(6);
    const on = inR && t > hit ? 1 : 0; d.userData.scr.opacity = .15 + .7 * on * (.75 + .25 * Math.sin(t * 8));
    if (on) r.beam(v3(x, y + .2, z), v3(x, y + 9, z), .05, 0x59c7ff, .7 * prog(t, hit, hit + .3), { t: t * 3, n: 8, grow: prog(t, hit, hit + .6) });
  });
  r.lookCam(orbit(v3(0, 0, 0), 20 - lt * .5, .6 + lt * .04, .62), v3(0, .5, 0), 55);
}, { ov: (lt, t) => ovNote('الأجهزة القريبة اللي في الشبكة') });

// ═════════ THE SCENARIO: lost at the airport ═════════
const A17 = shot(w(106) - .05, w(112) - .05, (lt, t) => {
  const r = R(); r.stage('plan', t); planBag(t);
  r.emit(BAGC(), t, { R: 6, per: 1.1, life: 1.6, face: 'up', w: .02, a: .8 });
  const ow = r.walkers[1]; r.walk(ow, v3(BAGP.x + 3 + lt * 1.5, 0, BAGP.z + 6 + lt * 1.6), Math.atan2(1.5, 1.6), lt * 5, { scale: 1.8, phone: false });
  const c = v3(BAGP.x + 2, 1, BAGP.z + 2); R().lookCam(orbit(c, 22 - lt * 1, -.4 + lt * .05, .5), c, 55);
}, { ov: (lt, t) => ovTag('شنطتك', BAGC().add(v3(0, 2, 0)), 140, -200, prog(t, w(108), w(108) + .3)) + ovNote() });
// A18: you fly to another city (jet along the arc)
const a18 = t => sm(w(112), w(118) + .6, t);
const A18 = shot(w(112) - .05, w(119) - .05, (lt, t) => {
  const r = R(); r.stage('globe', t);
  faceEarth(38, 22);
  const k = a18(t); r.arcMesh.visible = true; r.arcM.uniforms.p.value = k;
  r.jet.visible = true; const p = r.ARC.getPointAt(Math.min(.999, k)), q = r.ARC.getPointAt(Math.min(1, k + .01));
  r.jet.position.copy(p); r.jet.lookAt(q.clone().add(q.clone().sub(p))); r.jet.rotateY(-Math.PI / 2);
  r.glow(onEarth(r.LON.lat, r.LON.lon, 1.006), .1, 0x9fe1ff); r.glow(onEarth(r.RUH.lat, r.RUH.lon, 1.006), .1, 0x59c7ff, k);
  r.lookCam(v3(0, .5, 3.1 - lt * .06), v3(0, .5, 0), 30);
});
// A19: your phone can't hear it — Bluetooth range is a small circle around the bag
const A19 = shot(w(119) - .05, w(131) - .05, (lt, t) => {
  const r = R(); r.stage('globe', t);
  const z = ease.inOut(prog(t, w(127), w(129)));
  faceEarth(r.LON.lat * (1 - z) + 40 * z, r.LON.lon * (1 - z) + 22 * z);
  const L = onEarth(r.LON.lat, r.LON.lon, 1.003), Rr = onEarth(r.RUH.lat, r.RUH.lon, 1.003);
  r.glow(L, .08, 0x9fe1ff); r.glow(Rr, .08, 0x59c7ff);
  r.ring(L, .06 + .01 * Math.sin(t * 4), 0x59c7ff, .9, { face: L.clone().normalize(), w: .08, fill: 1 });
  r.emit(Rr, t, { R: .05, per: .9, life: 1.2, face: Rr.clone().normalize(), a: .8 });
  r.arcMesh.visible = true; r.arcM.uniforms.p.value = 1;
  r.lookCam(v3(0, .5 + .1 * (1 - z), 1.35 + 2.0 * z), v3(0, .45 * z + .1 * (1 - z), 0), 30);
}, { ov: (lt, t) => { const r = R(); const L = onEarth(r.LON.lat, r.LON.lon, 1.003), Rr = onEarth(r.RUH.lat, r.RUH.lon, 1.003); return ovTag('مدى البلوتوث', L, 160, -180, sm(w(128), w(129), t), 'hot') + ovTag('جوالك', Rr, 140, 150, sm(w(119), w(120), t)) + `<div class="km" style="opacity:${sm(w(122), w(123), t)}"><span class="latin">${KM.toLocaleString('en-US')}</span> كم ✕</div>`; } });

// ═════════ A STRANGER WALKS BY ═════════
const a20x = t => -18 + 16 * ease.inOut(prog(t, w(131), w(142) + .2));
const A20 = shot(w(131) - .05, w(142) - .05, (lt, t) => {
  const r = R(); r.stage('plan', t); planBag(t);
  r.ring(v3(BAGP.x, .05, BAGP.z), 7, 0x59c7ff, .5, { face: 'up', w: .01, fill: .25 });
  r.emit(BAGC(), t, { R: 7, per: 1.1, life: 1.6, face: 'up', w: .02, a: .7 });
  const x = a20x(t), st = r.walkers[2]; r.walk(st, v3(x, 0, 3.5), Math.PI / 2, t * 5.2, { scale: 1.8, lit: 0 });
  const c = v3((x + BAGP.x) / 2, 1, 1); R().lookCam(orbit(c, 20 - lt * .6, .9 - lt * .03, .55), c, 55);
}, { ov: (lt, t) => ovTag('شخص معه آيفون', v3(a20x(t), 4.2, 3.5), 120, -220, sm(w(138), w(139), t)) });
// A21: caught! the ring touches the passer-by's phone
const A21 = shot(w(142) - .05, w(144) - .05, (lt, t) => {
  const r = R(); r.stage('plan', t); planBag(t);
  r.emit(BAGC(), t, { R: 7, per: .7, life: 1.2, face: 'up', w: .025, a: 1 });
  const st = r.walkers[2], x = -2 + lt * .8; r.walk(st, v3(x, 0, 3.5), Math.PI / 2, t * 5.2, { scale: 1.8, lit: 1, phoneUp: true });
  const pp = v3(x, 3.2, 4.2); r.glow(pp, 2.2, 0x9fe1ff, .9); r.beam(BAGC(), pp, .05, 0x59c7ff, 1, { t: t * 4, n: 8 });
  const c = v3(-3, 2, 2); R().lookCam(orbit(c, 13 - lt * .8, .2, .25), c, 50);
  r.grade.flash.value = .4 * (1 - prog(lt, 0, .3));
});

// ═════════ THE GENIUS PART ═════════
// A22: "وهنا تبدأ الفكرة العبقرية" — network wakes up around the globe
const A22 = shot(w(144) - .05, w(148) - .05, (lt, t) => {
  const r = R(); r.stage('globe', t); faceEarth(30, 15 + lt * 4);
  r.net.visible = true; const k = sm(w(146), w(147) + .3, t);
  r.lookCam(v3(0, .2, 4.2 - .6 * k), v3(0, .1, 0), 30);
  r.bloom.strength = .6 + .5 * k;
});
// A23: the iPhone knows its own location (GPS satellites)
const A23 = shot(w(148) - .05, w(152) - .05, (lt, t) => {
  const r = R(); r.stage('sats', t);
  r.phoneAt(r.phoneA, v3(0, 0, 0), -Math.PI / 2 + .25, 0, 0); r.drawUI(r.phoneA, { mode: 'map', pin: 0, title: 'موقعي', sub: 'مطار هيثرو · لندن', when: '51.47° N · 0.45° W' });
  r.phoneA.rig.scale.setScalar(20);
  const SP = [[-9, 14, -6], [8, 16, -4], [-3, 18, -12], [11, 13, -11]];
  r.SATS.forEach((s, i) => { const [x, y, z] = SP[i]; s.position.set(x, y, z); s.rotation.set(.3, t * .2 + i, .2); s.scale.setScalar(.8);
    const on = prog(t, w(149) + i * .15, w(149) + i * .15 + .3); r.beam(v3(x, y - 1, z), v3(0, .3, 0), .04, 0x59c7ff, .9 * on, { t: t * 3, n: 10, grow: on }); });
  r.lookCam(v3(5 - lt * .4, 1.5, 15), v3(0, 7, -3), 60);
});
// A24: it stamps the place where it heard the tag
const A24 = shot(w(152) - .05, w(162) - .05, (lt, t) => {
  const r = R(); r.stage('plan', t); planBag(t, { holo: true });
  const st = r.walkers[2]; r.walk(st, v3(1 + lt * .6, 0, 3.5), Math.PI / 2, t * 5.2, { scale: 1.8, lit: 1, phoneUp: true });
  const drop = ease.out(prog(t, w(155), w(156)));
  const pin = v3(BAGP.x, 6 + 8 * (1 - drop), BAGP.z); r.glow(pin, 2.4, 0x59c7ff, drop); r.beam(v3(BAGP.x, .1, BAGP.z), pin, .06, 0x59c7ff, drop, { t: t * 3, n: 6 });
  if (drop >= 1) r.ring(v3(BAGP.x, .06, BAGP.z), 2 + 3 * prog(t, w(156), w(156) + .8), 0x9fe1ff, 1 - prog(t, w(156), w(156) + .8), { face: 'up', w: .05 });
  const c = v3(BAGP.x + 2, 1, BAGP.z + 1); R().lookCam(orbit(c, 18 - lt * .4, -.2 + lt * .03, .9), c, 55);
}, { ov: (lt, t) => { const k = sm(w(156), w(156) + .3, t); return k ? `<div class="coord" style="opacity:${k}"><span class="latin">51.4700° N · 0.4543° W</span><small>موقع اكتشاف الإشارة</small></div>` : ''; } });
// A25: the encrypted report (phone close-up + scrambling card)
const A25 = shot(w(162) - .05, w(170) - .05, (lt, t) => {
  const r = R(); r.stage('studio', t);
  r.phoneAt(r.phoneA, v3(0, 0, 0), -.2, -.3 + lt * .05, 0); r.drawUI(r.phoneA, { mode: 'lock', time: '9:41' });
  const c = v3(0, .01, 0); r.lookCam(orbit(c, .55 - lt * .02, -.2, .05), c, 30);
}, {
  ov: (lt, t) => {
    const k = sm(w(163), w(163) + .3, t), e = prog(t, w(165) - .1, w(165) + .8), src = '51.4700N 0.4543W · 2026-10-18 09:41';
    let s = ''; for (let i = 0; i < src.length; i++) { const c = src[i]; s += (i / src.length < e && c !== ' ') ? '0123456789ABCDEF'[(i * 7 + Math.floor(t * 20)) % 16] : c; }
    return k ? `<div class="card" style="opacity:${k}"><div class="ct">تقرير الموقع ${e >= 1 ? '🔒' : ''}</div><div class="cx latin">${s}</div><div class="cs">${e >= 1 ? 'مشفّر — ما يقدر يقراه إلا صاحب الـ<span class="latin">AirTag</span>' : ''}</div></div>` : '';
  },
});
// A26: up to the network, then down to the owner
const a26 = t => prog(t, w(170) - .05, w(173) + .2);
const A26 = shot(w(170) - .05, w(173) - .05, (lt, t) => {
  const r = R(); r.stage('globe', t); faceEarth(36, 20); r.net.visible = true;
  const k = ease.inOut(a26(t)), L = onEarth(r.LON.lat, r.LON.lon, 1.01), hub = r.NET_HUB.clone().applyMatrix4(r.earth.matrixWorld), Rr = onEarth(r.RUH.lat, r.RUH.lon, 1.01);
  const p = k < .5 ? L.clone().lerp(hub, k * 2) : hub.clone().lerp(Rr, k * 2 - 1);
  r.glow(p, .16, 0xffffff); r.glow(hub, .2, 0x59c7ff, .8); r.beam(L, hub, .006, 0x59c7ff, .8, { t: t * 3, n: 6 }); r.beam(hub, Rr, .006, 0x59c7ff, .8 * prog(k, .5, .6), { t: t * 3, n: 6 });
  r.lookCam(v3(0, .4, 3.4), v3(0, .45, 0), 30);
}, { ov: (lt, t) => { const r = R(); return ovTag('شبكة <span class="latin">Find My</span>', r.NET_HUB.clone().applyMatrix4(r.earth.matrixWorld), 0, -200, prog(lt, .1, .4), 'hot'); } });
// A27: and you see it on your phone
const A27 = shot(w(173) - .05, VOICE_END + .12, (lt, t) => {
  const r = R(); r.stage('studio', t);
  r.phoneAt(r.phoneB, v3(0, 0, 0), -.12, .25 - lt * .05, 0);
  const k = sm(w(178), w(179), t);
  r.drawUI(r.phoneB, { mode: 'map', pin: k, pulse: (t * .7) % 1, when: 'آخر ظهور: قبل دقيقة' });
  const c = v3(0, .0, 0); r.lookCam(orbit(c, .55 - .2 * ease.inOut(prog(lt, 0, 4.5)), .1, .03), c, 30);
  r.grade.flash.value = .25 * (t >= w(179) ? 1 - prog(t, w(179), w(179) + .25) : 0);
});
window.SHOTS = S;

// ═════════ DOM callouts (minimal — captions on top carry the words) ═════════
const T = (s, e, build, update) => ({ s, e, fi: .08, fo: .12, build, update });
const L = [];
const low = (html, top = 1480) => big(html, `top:${top}px`);
const badge = (txt, kind) => `<span class="badge ${kind}">${txt}</span>`;
L.push(T(w(11) - .05, w(17) - .05, r => { r.appendChild(low(`<div class="a">${badge('ولا إشعار', 'no')}</div>`)); }, (r, lt, t) => popIn(r.querySelector('.a'), t, w(13))));
L.push(T(w(67) - .05, w(82) - .05, r => {
  r.appendChild(low(`<div style="display:flex;justify-content:center;gap:18px"><span class="x1">${badge('<span class="latin">GPS</span> ✕', 'no')}</span><span class="x2">${badge('شريحة ✕', 'no')}</span><span class="x3">${badge('إنترنت ✕', 'no')}</span></div>`, 1520));
}, (r, lt, t) => { popIn(r.querySelector('.x1'), t, w(74)); popIn(r.querySelector('.x2'), t, w(76) + .1); popIn(r.querySelector('.x3'), t, w(80)); }));
L.push(T(w(92) - .05, w(98) - .05, r => { r.appendChild(low(`<div class="a">${badge('إشارة بلوتوث', 'yes')}</div>`)); }, (r, lt, t) => popIn(r.querySelector('.a'), t, w(95))));
L.push(T(w(142) - .05, w(144) - .05, r => { r.appendChild(low(`<div class="a">${badge('✓ التقط الإشارة', 'yes')}</div>`)); }, (r, lt, t) => popIn(r.querySelector('.a'), t, w(142) + .05)));
const outro = outroScene(VOICE_END + .05, VOICE_END + 2.55);
L.push(outro);

// caption keywords (global word indices) get the KROZO selection box
const KEYS = new Set([3, 7, 15, 25, 29, 40, 46, 51, 56, 60, 74, 77, 80, 95, 97, 102, 111, 118, 130, 139, 143, 147, 150, 165, 172, 181]);

window.TL = {
  voiceEnd: VOICE_END,
  lead: 0.15,
  flashes: [],
  remap: tv => {
    let i = 0; while (i < WARP.length - 2 && tv > WARP[i + 1][1]) i++;
    const [s0, v0] = WARP[i], [s1, v1] = WARP[i + 1];
    if (tv >= v1) return s1 + (tv - v1);
    return s0 + (tv - v0) * (s1 - s0) / ((v1 - v0) || 1);
  },
  bug: t => (t < 1 ? 0 : 1) * (1 - prog(t, VOICE_END - .2, VOICE_END + .1)),
  subs: SUBS,
  keys: KEYS,
  scenes: L,
};
