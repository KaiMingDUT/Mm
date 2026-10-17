// KROZO — "ليش الشاشة ما تحس بالقفاز؟"  v2: fast-cut, realistic multi-location 3D.
// SHOTS drive the 3D world (real3d.js); TL.scenes are the DOM text layers on top.
const VOICE_END = 117.52;
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
const SH = 'text-shadow:0 4px 24px rgba(0,0,0,.85),0 0 2px rgba(0,0,0,.9)';
const K = { red: '#FF453A', green: '#30D158', orange: '#FF9F0A', yellow: '#FFD60A', pink: '#FF5AA8' };
const pill = (txt, bg, fg = '#fff') => `<span style="display:inline-block;padding:14px 34px;border-radius:999px;background:${bg};color:${fg};font-weight:700;box-shadow:0 10px 40px rgba(0,0,0,.45)">${txt}</span>`;

// ───────── shot helpers ─────────
const R = () => window.R3;
const v3 = (x, y, z) => R().V(x, y, z);
const noise = (t, f) => Math.sin(t * f) * .6 + Math.sin(t * f * 2.13 + 1.7) * .3 + Math.sin(t * f * 4.7 + .3) * .1;
function shake(t, a, f = 9) { return v3(noise(t, f) * a, noise(t + 11.3, f * 1.1) * a, noise(t + 4.1, f * .9) * a * .5); }
// tap profile: 0 = resting height, 1 = contact. taps = [time,...]; each tap ≈ 0.28 s
function tapK(t, taps, d = .14) { let k = 0; for (const a of taps) { if (t >= a - d && t <= a + d * 1.2) k = Math.max(k, t < a ? ease.inOut(prog(t, a - d, a)) : 1 - ease.inOut(prog(t, a + d * .4, a + d * 1.2))); } return k; }
function ripples(t, taps, x, y, dur = .7) { return taps.filter(a => t >= a && t < a + dur).map(a => ({ x, y, k: (t - a) / dur })); }
// phone helpers: screen point from UI fraction (u,v); outward normal of the screen
function phoneAt(pos, rx = 0, ry = 0, rz = 0) { const P = R().phoneRig; P.visible = true; P.position.copy(pos); P.rotation.set(rx, ry, rz); P.updateMatrixWorld(true); }
function scr(u, v, lift = 0) { const p = R().phone; return p.group.localToWorld(v3((u - .5) * (p.w - .006), (.5 - v) * (p.h - .006), p.d / 2 + .0002 + lift)); }
function nrm() { const q = new (R().THREE.Quaternion)(); R().phone.group.getWorldQuaternion(q); return v3(0, 0, 1).applyQuaternion(q); }
function upv() { const q = new (R().THREE.Quaternion)(); R().phone.group.getWorldQuaternion(q); return v3(0, 1, 0).applyQuaternion(q); }
// finger tapping the screen at (u,v): h = hover height (m) when k=0
function fingerOn(rig, u, v, k, o = {}) {
  const n = nrm(), up = upv(), h = (o.h ?? .03) * (1 - k) + (o.mode && o.mode !== 'skin' ? .0028 : 0) - (o.press || 0);
  const at = scr(u, v).addScaledVector(n, h);
  const dir = n.clone().negate().addScaledVector(up, -(o.tilt ?? .55)).addScaledVector(v3(1, 0, 0), o.side ?? .25).normalize();
  R().setHand(rig, Object.assign({ at, dir, pad: n.clone().negate().addScaledVector(up, 1.2) }, o));
}
// camera orbiting a screen point: az = around the phone's up axis (neg = left), el = toward phone's up
function camScr(u, v, dist, az, el, fov = 30, look = null, roll = 0, sh = null) {
  const c = scr(u, v), n = nrm(), up = upv(), rt = new (R().THREE.Vector3)().crossVectors(up, n);
  const d = n.clone().multiplyScalar(Math.cos(az) * Math.cos(el)).addScaledVector(rt, Math.sin(az) * Math.cos(el)).addScaledVector(up, Math.sin(el));
  const pos = c.clone().addScaledVector(d, dist); if (sh) pos.add(sh);
  R().lookCam(pos, look || c, fov, roll);
}
const ICON = i => [(.5 / 4 + (i % 4) / 4) * .96 + .02, (110 + Math.floor(i / 4) * 166 + 52) / 1278];

const S = [];
const shot = (s, e, update, o = {}) => { const x = Object.assign({ s, e, update }, o); S.push(x); return x; };

// ═════════ HOOK (night, snow, red knit glove) ═════════
const C1 = shot(0, w(1) - .05, (lt, t) => {
  const r = R(); r.stage('night', t);
  phoneAt(v3(0, 0, 0), -.32, .18, .02); r.setUI({ lock: true });
  fingerOn(r.handA, .6, .55, 0, { mode: 'glove', h: .12 - .085 * ease.out(prog(lt, 0, 1.6)), tilt: .7, side: -.5 });
  const k = ease.out(prog(lt, 0, 1.6));
  camScr(.5, .5, .42 - .12 * k, -.38, .12, 30, scr(.52, .45), .03, shake(t, .002, 3));
  r.screenLight.intensity = 0; r.updSnow(t, r.cam.position);
});
const C2 = shot(w(1) - .05, w(7) - .05, (lt, t) => {
  const r = R(); r.stage('night', t);
  phoneAt(v3(0, 0, 0), -.32, .18, .02); r.setUI({ lock: true });
  const taps = [w(2) + .05, w(5) + .1, w(6) + .05];
  fingerOn(r.handA, .62, .55, tapK(t, taps), { mode: 'glove', h: .022, tilt: .7, side: -.5 });
  const tp = scr(.62, .55), n = nrm();
  camScr(.62, .55, .11 - lt * .006, -1.2, -.15, 28, tp.clone().addScaledVector(n, .012), -.05, shake(t, .0012, 4));
  r.screenLight.intensity = 0; r.updSnow(t, r.cam.position);
  r.grade.flash.value = 0;
});
const C3 = shot(w(7) - .05, w(11) - .05, (lt, t) => {
  const r = R(); r.stage('night', t);
  phoneAt(v3(0, 0, 0), -.95, 0, 0); r.setUI({ lock: false });
  const [u, v] = ICON(6), taps = [w(8) + .05, w(9), w(10) + .05];
  fingerOn(r.handA, u, v, tapK(t, taps), { mode: 'glove', h: .03, tilt: -.7, side: -.35 });
  camScr(.5, .55, .27, .12, -.45, 34, scr(.5, .48), .02, shake(t, .003, 5));
  r.screenLight.intensity = 0; r.updSnow(t, r.cam.position);
});
const C4 = shot(w(11) - .05, w(18) - .05, (lt, t) => {
  const r = R(); r.stage('night', t);
  const p = sm(w(13), w(13) + .25, t) * (1 - sm(w(17) + .45, w(17) + .7, t));
  phoneAt(v3(0, -.004 * p, 0), -.32 - .05 * p, .18, .02); r.setUI({ lock: true });
  fingerOn(r.handA, .5, .5, Math.max(p, sm(w(11), w(13), t) * .6), { mode: 'glove', h: .03, tilt: .7, side: -.3, press: .0012 * p });
  camScr(.5, .5, .2 - lt * .012, -.55, -.55, 30, scr(.5, .42), -.12, shake(t, .0035 * p + .0006, 14));
  r.screenLight.intensity = 0; r.updSnow(t, r.cam.position);
  r.grade.ca.value = .0015 + .004 * p;
});

// ═════════ BARE FINGER WORKS ═════════
const C5 = shot(w(18) - .05, w(24) - .05, (lt, t) => {
  const r = R(); r.stage('night', t);
  phoneAt(v3(0, 0, 0), -.32, .18, .02); r.setUI({ lock: true });
  const sl = ease.inOut(prog(t, w(22) - .05, w(23) + .25));
  fingerOn(r.handA, .5, .45, 0, { mode: sl >= 1 ? 'skin' : 'glove', slide: sl, h: .05, tilt: .7, side: -.5 });
  camScr(.5, .45, .42, -.75 + lt * .08, .25, 30, scr(.62, .3).addScaledVector(nrm(), .07));
  r.screenLight.intensity = 0; r.updSnow(t, r.cam.position);
});
const C6 = shot(w(24) - .05, w(29) - .05, (lt, t) => {
  const r = R(); r.stage('night', t);
  phoneAt(v3(0, 0, 0), -.32, .18, .02); r.setUI({ lock: false });
  const [u, v] = ICON(2);
  fingerOn(r.handA, u, v, ease.inOut(prog(lt, 0, 2.6)) * .82, { mode: 'skin', h: .03, tilt: .7, side: -.4 });
  const tp = scr(u, v), n = nrm();
  camScr(u, v, .085 - lt * .006, -1.15, .05, 24, tp.clone().addScaledVector(n, .012), .04);
  r.screenLight.intensity = 0; r.updSnow(t * .35, r.cam.position);  // slow-motion snow
});
const C7 = shot(w(29) - .05, w(34) - .05, (lt, t) => {
  const r = R(); r.stage('night', t);
  phoneAt(v3(0, 0, 0), -.32, .18, .02);
  const [u, v] = ICON(2), at = w(32);
  r.setUI({ lock: false, hi: 2, hiK: t >= at ? 1 - prog(t, at + .1, at + .3) : 0, ripples: ripples(t, [at], u, v), app: { k: ease.inOut(prog(t, at + .12, at + .55)), i: 2 } });
  fingerOn(r.handA, u, v, Math.min(1, ease.inOut(prog(t, at - .45, at))) * (1 - sm(at + .25, at + .7, t)), { mode: 'skin', h: .012, tilt: .7, side: -.4 });
  const k = ease.out(prog(t, at - .2, at + .6));
  camScr(.5, .5, .42 - .1 * k, -.3, .1, 30, scr(.52, .42), .02);
  r.screenLight.intensity = 0; r.updSnow(t, r.cam.position);
  r.grade.flash.value = .35 * (1 - prog(t, at, at + .25)) * (t >= at ? 1 : 0);
});

// ═════════ THE QUESTION (studio) ═════════
const studioCam = (lt, d, az, el, look, fov = 30) => R().lookCam(v3(Math.sin(az) * d, el, Math.cos(az) * d).add(look), look, fov);
const C8 = shot(w(34) - .05, w(42) - .05, (lt, t) => {
  const r = R(); r.stage('studio', t);
  phoneAt(v3(0, .012 * Math.sin(t * 1.3), 0), -.12, -.5 + lt * .22, .05); r.setUI({ lock: false });
  studioCam(lt, .36 - lt * .02, .25 + lt * .05, .03, v3(0, 0, 0), 30);
});
const C9 = shot(w(42) - .05, w(46) - .05, (lt, t) => {
  const r = R(); r.stage('studio', t);
  phoneAt(v3(0, 0, 0), -Math.PI / 2, 0, 0); r.setUI({ lock: false });
  const k = ease.out(prog(lt, 0, 1.25));
  const cl = r.cloth; cl.visible = true; cl.position.set(.004, .07 * (1 - k) + .0075, -.004); cl.rotation.set(-Math.PI / 2 + .5 * (1 - k), .3 * (1 - k), .4); r.updCloth(k, t);
  studioCam(lt, .3, .9 + lt * .1, .17, v3(0, .005, 0), 30);
});
// split screen: glove (left) vs finger (right)
function splitSide(rig, mode, k, rim) {
  return () => {
    const r = R(); r.handA.visible = r.handB.visible = false;
    r.studio.userData.r1.color.set(rim);
    fingerOn(rig, .5, .45, k, { mode, h: .035, tilt: .7, side: -.15 });
  };
}
const C10 = shot(w(46) - .05, w(53) - .05, (lt, t) => {
  const r = R(); r.stage('studio', t);
  phoneAt(v3(0, 0, 0), -.4, 0, 0); r.setUI({ lock: false });
  const b = .08 * Math.sin(t * 2);
  studioCam(lt, .55 - lt * .015, -.15, -.02, v3(0, .03, 0), 30);
  r.split([splitSide(r.handA, 'glove', .2 + b, 0xff5a3d), splitSide(r.handB, 'skin', .2 - b, 0x168bff)]);
});
const C11 = shot(w(53) - .05, w(59) - .05, (lt, t) => {
  const r = R(); r.stage('studio', t);
  phoneAt(v3(0, 0, 0), -.4, 0, 0);
  const at = w(56) + .05, k = tapK(t, [at], .2);
  const z = ease.inOut(prog(t, 29.3, 30.2));
  studioCam(lt, .55 - .12 * z, -.15, -.02, v3(0, .03, 0), 30);
  r.split([() => { splitSide(r.handA, 'glove', k, 0xff5a3d)(); r.setUI({ lock: false }); },
           () => { splitSide(r.handB, 'skin', k, 0x168bff)(); r.setUI({ lock: false, ripples: ripples(t, [at], .5, .45, .9), app: { k: ease.inOut(prog(t, at + .15, at + .6)), i: 6 } }); }]);
});

// ═════════ THE SECRET: body electricity ═════════
const C12 = shot(w(59) - .05, w(66) - .05, (lt, t) => {
  const r = R(); r.stage('studio', t);
  const k = sm(w(62) - .15, w(62) + .35, t);
  r.setHand(r.handA, { pose: 'open', mode: 'skin', at: v3(0, -.09, 0), dir: v3(.05, -1, .15), pad: v3(0, 0, 1), xray: .35 * k, vein: .55 * k, sleeve: 0x1c2230 });
  r.veinM.uniforms.t.value = t;
  const a = -.35 + lt * .12;
  r.lookCam(v3(Math.sin(a) * .42, .02, Math.cos(a) * .42), v3(0, .0, 0), 30);
  r.bloom.strength = .3 + .3 * k; r.bloom.threshold = .75;
  r.grade.flash.value = .4 * (t >= w(62) ? 1 - prog(t, w(62), w(62) + .25) : 0);
});
const C13 = shot(w(66) - .05, w(69) - .05, (lt, t) => {   // dive into the screen
  const r = R(); r.stage('studio', t);
  phoneAt(v3(0, 0, 0), 0, 0, 0); r.setUI({ lock: false });
  const k = ease.inOut(prog(lt, 0, 1.3));
  r.lookCam(v3(.01 * (1 - k), .0, .35 * Math.pow(1 - k, 2.2) + .004), v3(0, 0, 0), 30 - 8 * k);
  r.grade.zb.value = .9 * prog(lt, .6, 1.3);
}, { noPunch: true });

// ═════════ HOW CAPACITIVE SCREENS WORK ═════════
const C14 = shot(w(69) - .05, w(76) - .05, (lt, t) => {
  const r = R(); r.stage('studio', t);
  phoneAt(v3(0, 0, 0), -Math.PI / 2, 0, 0); r.setUI({ lock: false });
  // pencil eraser taps, a die bounces — nothing reacts
  const pk = tapK(t, [w(71), w(72) + .1], .16);
  r.pencil.visible = true; r.pencil.position.set(.012, .0045 + .03 * (1 - pk), -.01); r.pencil.rotation.set(.25, 0, -.35);
  const dt = t - w(73);
  r.die.visible = true;
  const bounce = dt < 0 ? .12 : Math.abs(Math.cos(Math.min(dt, 2.2) * 6.5)) * .05 * Math.exp(-dt * 2.2) + .0125;
  r.die.position.set(-.016, bounce, .03 - Math.min(Math.max(dt, 0), 1) * .012); r.die.rotation.set(dt * 4, dt * 2.6, dt * 1.7);
  studioCam(lt, .26 - lt * .015, .55 + lt * .05, .14, v3(0, .01, 0), 32);
});
const C15 = shot(w(76) - .05, w(85) - .05, (lt, t) => {
  const r = R(); r.stage('studio', t);
  phoneAt(v3(0, 0, 0), -.08, -.9 + lt * .26, .0); r.setUI({ lock: false });
  const s = sm(w(82) - .2, w(82) + .4, t);
  studioCam(lt, .33 - .07 * s, .1, .02, v3(0, 0, 0), 30);
  r.studio.userData.r1.intensity = 26 + 30 * s; r.studio.userData.r2.position.set(.8 * Math.cos(t), .4, -.5);
  r.grade.flash.value = .3 * (t >= w(82) ? 1 - prog(t, w(82), w(82) + .25) : 0);
});
// inside the screen (mm units)
const techCam = (pos, look, fov = 40, roll = 0) => R().lookCam(pos, look, fov, roll);
const C16 = shot(w(85) - .05, w(94) - .05, (lt, t) => {
  const r = R(); r.stage('tech', t);
  r.setUI({ lock: false });
  const lift = ease.inOut(prog(t, w(85) + .1, w(87)));
  r.tech.userData.glass.position.y = .35 + lift * 9;
  r.sensor.bright.value = .25 + .75 * sm(w(88) - .1, w(88) + .3, t);
  r.sensor.scanK.value = .4; r.sensor.scan.value = ((t * 5) % 12) - 6;
  const f = ease.inOut(prog(t, w(88), w(94)));
  techCam(v3(-30 + 34 * f, 18 - 14 * f, 40 - 30 * f), v3(-2 + 4 * f, -.5, 0), 38, .05 - .1 * f);
});
const C17 = shot(w(94) - .05, w(102) - .05, (lt, t) => {
  const r = R(); r.stage('tech', t);
  r.setUI({ lock: false });
  r.tech.userData.glass.position.y = .35;
  r.sensor.scanK.value = 1; r.sensor.scan.value = ((lt * 9) % 12) - 6;
  const a = .4 + lt * .07;
  techCam(v3(Math.sin(a) * 34, 30, Math.cos(a) * 34), v3(0, -1, 0), 40);
});
const C18 = shot(w(102) - .05, w(106) - .05, (lt, t) => {   // "هنا يجي الجزء المثير" — whip around
  const r = R(); r.stage('studio', t);
  phoneAt(v3(0, 0, 0), -.2, 0, 0); r.setUI({ lock: false });
  const a = ease.inOut(prog(lt, 0, 1.9)) * Math.PI * 2;
  studioCam(lt, .3, a + .3, .04, v3(0, 0, 0), 30);
  r.grade.zb.value = .5 * Math.sin(prog(lt, 0, 1.9) * Math.PI);
  r.studio.userData.r1.intensity = 40;
});
const C19 = shot(w(106) - .05, w(119) - .05, (lt, t) => {   // POV from inside the phone, finger coming down
  const r = R(); r.stage('tech', t);
  r.setUI({ lock: false });
  r.tech.userData.pix.visible = false;
  const y = 60 - 54 * ease.inOut(prog(t, w(106), w(118))) + 1.8 * (1 - prog(t, w(118), w(118) + .5)) * 0;
  r.setHand(r.handA, { mode: 'skin', at: v3(0, Math.max(y, 1.2), 0), dir: v3(0, -1, -.35), pad: v3(0, -1, 0), scale: 1000, sleeve: null });
  r.fieldLines.visible = true; r.field.k.value = .9; r.field.finger.value.set(0, Math.max(y, 1.2) + .25, 0); r.field.pull.value = clamp((22 - y) / 18);
  r.sensor.scanK.value = .7; r.sensor.scan.value = ((lt * 8) % 12) - 6;
  techCam(v3(16 - lt, -8, 22 - lt), v3(0, 12, 0), 56, .1);
});

// ═════════ WATER + SALTS ═════════
const C20 = shot(w(119) - .05, w(124) - .05, (lt, t) => {
  const r = R(); r.stage('body', t); r.updBody(t, 0);
  r.lookCam(v3(0, 0, 18 - lt * 2.2), v3(0, 0, -6), 40, .05 * Math.sin(t * .5));
  r.grade.sat.value = 1.15;
});
const C21 = shot(w(124) - .05, w(128) - .05, (lt, t) => {
  const r = R(); r.stage('body', t); r.updBody(t, ease.inOut(prog(lt, .2, .9)));
  r.lookCam(v3(-10 + lt * 2, 2, 12), v3(2, 0, -6), 44, -.08);
  r.bloom.strength = .6; r.bloom.threshold = .5; r.grade.sat.value = 1.15;
});

// ═════════ THE TOUCH (capacitance changes) ═════════
const C22 = shot(w(128) - .05, w(132) - .05, (lt, t) => {
  const r = R(); r.stage('desk', t);
  phoneAt(v3(0, 0, 0), -Math.PI / 2, 0, .3);
  const at = w(130), [u, v] = ICON(9);
  r.setUI({ lock: false, ripples: ripples(t, [at], u, v), hi: 9, hiK: t >= at ? 1 - prog(t, at + .1, at + .3) : 0 });
  fingerOn(r.handA, u, v, ease.inOut(prog(t, at - .5, at)) * (1 - sm(at + .5, at + .9, t)), { mode: 'skin', h: .02, tilt: .7, side: -.4, sleeve: 0x3b4252 });
  const tp = scr(u, v);
  camScr(u, v, .1, -1.25, -.1, 26, tp.clone().addScaledVector(nrm(), .01));
  r.screenLight.intensity = 0;
});
const C23 = shot(w(132) - .05, w(139) - .05, (lt, t) => {   // cross-section: field lines pulled into the fingertip
  const r = R(); r.stage('tech', t); r.setUI({ lock: false });
  r.setHand(r.handA, { mode: 'skin', at: v3(0, 1.0, 0), dir: v3(.0, -1, -.6), pad: v3(0, -1, 0), scale: 1000, sleeve: null });
  const k = sm(w(132) - .1, w(133) + .5, t);
  r.fieldLines.visible = true; r.field.k.value = 1; r.field.finger.value.set(0, 1.4, 0); r.field.pull.value = k;
  r.sensor.heat.value.set(0, 0); r.sensor.heatK.value = sm(w(134), w(136), t);
  techCam(v3(4, 9 + lt * .3, 110 - lt * 4), v3(0, 8, 0), 30);
});
const C24 = shot(w(139) - .05, w(147) - .05, (lt, t) => {   // top view: heat map + coordinate lock
  const r = R(); r.stage('tech', t); r.setUI({ lock: false });
  r.tech.userData.glass.visible = false;
  r.sensor.heat.value.set(4.2, -6.1); r.sensor.heatK.value = 1; r.sensor.scanK.value = .5; r.sensor.scan.value = ((lt * 9) % 12) - 6;
  r.sensor.lock.value = sm(w(143) - .1, w(143) + .3, t);
  const z = ease.inOut(prog(t, w(144), w(146) + .3));
  techCam(v3(4.2 + 6 * (1 - z), 46 - 22 * z, -6.1 + 22 - 14 * z), v3(4.2, 0, -6.1), 40);
  r.grade.flash.value = .35 * (t >= w(146) ? 1 - prog(t, w(146), w(146) + .25) : 0);
});

// ═════════ THE GLOVE BLOCKS IT ═════════
const C25 = shot(w(147) - .05, w(152) - .05, (lt, t) => {
  const r = R(); r.stage('night', t);
  phoneAt(v3(0, 0, 0), -.32, .18, .02); r.setUI({ lock: false });
  const sl = 1 - ease.inOut(prog(t, w(149), w(150) + .35));
  fingerOn(r.handA, .5, .45, 0, { mode: sl >= 1 ? 'skin' : 'glove', slide: sl, h: .05, tilt: .7, side: -.5 });
  camScr(.5, .45, .42, -.5 - lt * .08, .2, 30, scr(.62, .3).addScaledVector(nrm(), .07));
  r.screenLight.intensity = 0; r.updSnow(t, r.cam.position);
});
function gloveSection(t, lt, opts) {
  const r = R(); r.stage('tech', t); r.setUI({ lock: false });
  r.fiber.visible = true; r.fiber.position.set(0, 2.0, 0); r.fiber.rotation.set(0, .2, 0);
  r.setHand(r.handA, { mode: opts.cond ? 'cond' : 'glove', at: v3(0, 3.9, 0), dir: v3(0, -1, -.6), pad: v3(0, -1, 0), scale: 1000, sleeve: null, glow: opts.glow || 0 });
  r.fieldLines.visible = true; r.field.k.value = 1; r.field.finger.value.set(0, 3.6, 0);
  r.field.pull.value = opts.pull; r.field.block.value = opts.block || 0;
  r.sensor.heat.value.set(0, 0); r.sensor.heatK.value = opts.heat || 0;
  if (opts.cond) for (const p of r.fiber.userData.plies) p.material = (p.userData.row % 2 === 0) ? r.fiber.userData.silver : r.fiber.userData.red;
  r.fiber.userData.silver.emissiveIntensity = opts.glow || 0;
}
const C26 = shot(w(152) - .05, w(159) - .05, (lt, t) => {
  gloveSection(t, lt, { pull: .0, block: sm(w(155) - .2, w(155) + .3, t) });
  techCam(v3(-8 + lt * .8, 7, 105 - lt * 3), v3(0, 7, 0), 30, -.04);
});
const C27 = shot(w(159) - .05, w(170) - .05, (lt, t) => {
  gloveSection(t, lt, { pull: .12, block: 1, heat: .12 });
  const a = -.5 + lt * .06;
  techCam(v3(Math.sin(a) * 110, 14 + lt * .3, Math.cos(a) * 110), v3(0, 6, 0), 30);
});
const C28 = shot(w(170) - .05, w(176) - .05, (lt, t) => {   // "مو إن القفاز سميك"
  const r = R(); r.stage('studio', t);
  r.setHand(r.handA, { pose: 'open', mode: 'glove', at: v3(0, -.09, 0), dir: v3(.05, -1, .15), pad: v3(0, 0, 1), sleeve: 0x1c2230 });
  const a = .5 - lt * .15;
  r.lookCam(v3(Math.sin(a) * .4, .03, Math.cos(a) * .4), v3(0, 0, 0), 30);
});
const C29 = shot(w(176) - .05, w(183) - .05, (lt, t) => {
  gloveSection(t, lt, { pull: .1, block: 1, heat: .08 });
  techCam(v3(30 - lt * 2, 5, 95 - lt * 2), v3(0, 6, 0), 30, .06);
  R().grade.tint.value.set(1.06, .96, .94);
});

// ═════════ CONDUCTIVE GLOVES ═════════
const C30 = shot(w(183) - .05, w(188) - .05, (lt, t) => {
  const r = R(); r.stage('studio', t);
  r.setHand(r.handA, { pose: 'point', mode: 'cond', at: v3(0, -.09, 0), dir: v3(.05, -1, .15), pad: v3(0, 0, 1), sleeve: 0x1c2230, glow: .2 + .8 * sm(w(186), w(187), t) });
  const a = -.4 + lt * .2;
  r.lookCam(v3(Math.sin(a) * .38, .0, Math.cos(a) * .38), v3(0, -.02, 0), 30);
  r.bloom.threshold = .7;
});
const C31 = shot(w(188) - .05, w(195) - .05, (lt, t) => {
  const g = sm(w(190) - .1, w(190) + .4, t);
  gloveSection(t, lt, { cond: true, pull: .85 * g, block: 1 - g, heat: g, glow: g * (.6 + .4 * Math.sin(t * 9)) });
  const a = .6 - lt * .08;
  techCam(v3(Math.sin(a) * 100, 9, Math.cos(a) * 100), v3(0, 6, 0), 30);
  R().bloom.strength = .5; R().bloom.threshold = .6;
});
const C32 = shot(w(195) - .05, w(201) - .05, (lt, t) => {
  const r = R(); r.stage('night', t);
  phoneAt(v3(0, 0, 0), -.32, .18, .02);
  const [u, v] = ICON(3), at = w(196) + .1;
  r.setUI({ lock: false, hi: 3, hiK: t >= at ? 1 - prog(t, at + .1, at + .3) : 0, ripples: ripples(t, [at], u, v), app: { k: ease.inOut(prog(t, at + .12, at + .55)), i: 3 } });
  fingerOn(r.handA, u, v, ease.inOut(prog(t, at - .45, at)) * (1 - sm(at + .3, at + .7, t)), { mode: 'cond', h: .025, tilt: .7, side: -.4, glow: t >= at ? 1 - prog(t, at, at + .8) : 0 });
  camScr(.5, .5, .45 - lt * .02, -.32, .12, 30, scr(.52, .42));
  r.screenLight.intensity = 0; r.updSnow(t, r.cam.position);
});

// ═════════ CTA: follow + recap montage ═════════
const C33 = shot(w(201) - .05, w(207) - .2, (lt, t) => {
  const r = R(); r.stage('desk', t);
  phoneAt(v3(0, 0, 0), -Math.PI / 2 + .5, 0, 0);
  const at = w(207) - .25;
  r.setUI({ follow: { k: t >= at ? 1 : 0, done: t >= at + .1 }, ripples: ripples(t, [at], .5, .44) });
  fingerOn(r.handA, .5, .44, ease.inOut(prog(t, at - .5, at)), { mode: 'skin', h: .04, tilt: -.6, side: -.35, sleeve: 0x3b4252 });
  camScr(.5, .5, .3 - lt * .01, .1, .45, 32, scr(.5, .45), upv());
  r.screenLight.intensity = 0;
});
// recap: replays of earlier shots, faster and faster
const RECAP = [[C1, 1.0], [C7, w(32) - (w(29) - .05) + .2], [C12, 2.6], [C16, 3.6], [C20, 1.6], [C24, 3.2], [C31, 2.6], [C32, w(196) - (w(195) - .05) + .4], [C19, 5.5], [C8, 1.3], [C30, 2.5], [C15, 4.5]];
const C34 = shot(w(207) - .2, VOICE_END + .12, (lt, t) => {
  const seg = (VOICE_END + .12 - (w(207) - .2)) / RECAP.length;
  const i = Math.min(RECAP.length - 1, Math.floor(lt / seg)), [src, off] = RECAP[i], l2 = lt - i * seg;
  src.update(off + l2 * .6, src.s + off + l2 * .6, src);
  R().grade.zb.value = Math.max(R().grade.zb.value, .7 * Math.max(0, 1 - l2 / .14));
});
window.SHOTS = S;

// ═════════ DOM text layers (kinetic type) ═════════
const T = (s, e, build, update) => ({ s, e, fi: .08, fo: .12, build, update });
const L = [];
L.push(T(0, w(7) - .05, r => {
  r.appendChild(big(`<div class="a" style="font-size:120px;font-weight:700;color:${C.ink};${SH}">أتحداك!</div>`, 'top:260px'));
  r.appendChild(big(`<div class="b" style="font-size:62px;font-weight:700;${SH}">المس الشاشة <span style="color:${K.orange}">وأنت لابس قفاز</span></div>`, 'top:420px'));
  r.appendChild(big(`<div class="x">${pill('✕ ولا أي استجابة', K.red)}</div>`, 'top:560px;font-size:44px'));
}, (r, lt, t) => { popIn(r.querySelector('.a'), t, .05, .35, 60); hide(r.querySelector('.a'), t, w(1) + .1); popIn(r.querySelector('.b'), t, w(1) - .05); popIn(r.querySelector('.x'), t, w(2) + .15); }));
L.push(T(w(7) - .05, w(11) - .05, r => {
  r.appendChild(big(`<div class="a" style="font-size:66px;font-weight:700;${SH}">تتوقع تستجيب؟</div>`, 'top:300px'));
  for (let i = 0; i < 3; i++) r.appendChild(el(`<div class="m${i}" style="position:absolute;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;border:8px solid ${K.red};display:flex;align-items:center;justify-content:center;color:${K.red};font-size:72px;font-weight:700;opacity:0">✕</div>`));
}, (r, lt, t) => {
  popIn(r.querySelector('.a'), t, w(7));
  [w(8) + .05, w(9), w(10) + .05].forEach((a, i) => { const m = r.querySelector('.m' + i); m.style.left = (430 + i * 110) + 'px'; m.style.top = (720 + (i % 2) * 70) + 'px'; m.style.opacity = t >= a ? 1 - prog(t, a + .35, a + .6) : 0; m.style.transform = `scale(${t >= a ? .6 + .4 * ease.back(prog(t, a, a + .2)) : .6})`; });
}));
L.push(T(w(11) - .05, w(18) - .05, r => {
  r.appendChild(big(`<div class="a" style="font-size:92px;font-weight:700;${SH}">بكل <span style="color:${K.orange}">قوتك</span>…</div>`, 'top:280px'));
  r.appendChild(big(`<div class="b">${pill('ولا شي ✕', K.red)}</div>`, 'top:440px;font-size:54px'));
}, (r, lt, t) => { const k = popIn(r.querySelector('.a'), t, w(15) - .1, .3, 0); r.querySelector('.a').style.transform += ` scale(${1 + .08 * Math.sin(prog(t, w(16), w(17) + .3) * Math.PI)})`; popIn(r.querySelector('.b'), t, w(17)); }));
L.push(T(w(18) - .05, w(24) - .05, r => {
  r.appendChild(big(`<div class="a" style="font-size:96px;font-weight:700;${SH}">الغريب…</div>`, 'top:280px'));
  r.appendChild(big(`<div class="b" style="font-size:70px;font-weight:700;${SH}">شِل <span style="color:${K.orange}">القفاز</span></div>`, 'top:420px'));
}, (r, lt, t) => { popIn(r.querySelector('.a'), t, w(18)); hide(r.querySelector('.a'), t, w(21)); popIn(r.querySelector('.b'), t, w(22) - .1); }));
L.push(T(w(24) - .05, w(29) - .05, r => {
  r.appendChild(big(`<div class="a" style="font-size:64px;font-weight:500;color:${C.gray};${SH}">مجرد</div><div class="b" style="font-size:104px;font-weight:700;${SH}">لمسة <span class="hl" style="color:${C.cyan}">خفيفة</span></div>`, 'top:260px'));
}, (r, lt, t) => { popIn(r.querySelector('.a'), t, w(24)); popIn(r.querySelector('.b'), t, w(25) - .05); }));
L.push(T(w(29) - .05, w(34) - .05, r => {
  r.appendChild(big(`<div class="a">${pill('استجابة فورية ✓', K.green)}</div>`, 'top:300px;font-size:60px'));
}, (r, lt, t) => { popIn(r.querySelector('.a'), t, w(32) + .05, .35, 60); }));
L.push(T(w(34) - .05, w(46) - .05, r => {
  r.appendChild(big(`<div class="a" style="font-size:58px;font-weight:500;color:${C.gray};${SH}">كيف يعرف الجوال</div><div class="b" style="font-size:96px;font-weight:700;${SH}">إنه <span style="color:${C.cyan}">إصبعك</span>؟</div>`, 'top:250px'));
  r.appendChild(big(`<div class="c" style="font-size:84px;font-weight:700;${SH}">مو <span style="color:${K.orange}">قطعة قماش</span>؟</div>`, 'top:1040px'));
}, (r, lt, t) => { popIn(r.querySelector('.a'), t, w(35)); popIn(r.querySelector('.b'), t, w(40)); popIn(r.querySelector('.c'), t, w(44) - .05); }));
L.push(T(w(46) - .05, w(59) - .05, r => {
  r.appendChild(el(`<div class="l" style="position:absolute;left:0;width:540px;top:250px;text-align:center;font-size:64px;font-weight:700;color:${K.orange};${SH}">القفاز</div>`));
  r.appendChild(el(`<div class="r" style="position:absolute;right:0;width:540px;top:250px;text-align:center;font-size:64px;font-weight:700;color:${C.cyan};${SH}">إصبعك</div>`));
  r.appendChild(el(`<div class="lx" style="position:absolute;left:0;width:540px;top:900px;text-align:center;font-size:46px">${pill('✕', K.red)}</div>`));
  r.appendChild(el(`<div class="rx" style="position:absolute;right:0;width:540px;top:900px;text-align:center;font-size:46px">${pill('✓', K.green)}</div>`));
  r.appendChild(big(`<div class="q" style="font-size:80px;font-weight:700;${SH}">نفس الشاشة… <span style="color:${K.yellow}">ليش؟</span></div>`, 'top:1060px'));
}, (r, lt, t) => {
  popIn(r.querySelector('.l'), t, w(50) - .1); popIn(r.querySelector('.r'), t, w(50) + .1);
  popIn(r.querySelector('.lx'), t, w(56) + .15); popIn(r.querySelector('.rx'), t, w(56) + .2); popIn(r.querySelector('.q'), t, w(58) - .1);
}));
L.push(T(w(59) - .05, w(69) - .05, r => {
  r.appendChild(big(`<div class="a" style="font-size:46px;font-weight:500;color:${C.cyan};letter-spacing:2px;${SH}">السر</div><div class="b" style="font-size:112px;font-weight:700;${SH}">كهرباء <span style="color:${C.cyan}">جسمك</span> ⚡</div>`, 'top:250px'));
}, (r, lt, t) => { popIn(r.querySelector('.a'), t, w(59)); popIn(r.querySelector('.b'), t, w(62) - .05, .35, 50); hide(r.querySelector('.b'), t, w(66)); hide(r.querySelector('.a'), t, w(66)); }));
L.push(T(w(69) - .05, w(85) - .05, r => {
  r.appendChild(big(`<div class="a" style="font-size:70px;font-weight:700;${SH}">ما تستجيب <span style="color:${K.orange}">لأي شيء</span></div>`, 'top:270px'));
  r.appendChild(big(`<div class="b" style="font-size:44px;font-weight:500;color:${C.gray};${SH}">أغلب الجوالات الحديثة</div><div class="c" style="font-size:94px;font-weight:700;line-height:1.2;${SH}">شاشة اللمس <span style="color:${C.blue}">السعوية</span></div><div class="d latin" style="font-size:38px;font-weight:500;color:${C.cyan};letter-spacing:4px;margin-top:10px">CAPACITIVE TOUCHSCREEN</div>`, 'top:250px'));
}, (r, lt, t) => { popIn(r.querySelector('.a'), t, w(72)); hide(r.querySelector('.a'), t, w(76) - .1); popIn(r.querySelector('.b'), t, w(77)); popIn(r.querySelector('.c'), t, w(82) - .05, .35, 50); popIn(r.querySelector('.d'), t, w(84)); }));
L.push(T(w(85) - .05, w(102) - .05, r => {
  r.appendChild(big(`<div class="a" style="font-size:72px;font-weight:700;${SH}">شبكة <span style="color:${C.cyan}">مسارات كهربائية</span></div><div class="a2" style="font-size:46px;color:${C.gray};font-weight:500;${SH}">تحت الزجاج مباشرة</div>`, 'top:250px'));
  r.appendChild(big(`<div class="b" style="font-size:66px;font-weight:700;${SH}">تراقب التغيّرات <span style="color:${C.cyan}">باستمرار</span></div>`, 'top:250px'));
  r.appendChild(el(`<svg class="osc" width="760" height="200" viewBox="0 0 760 200" style="position:absolute;left:160px;top:960px;opacity:0"><rect x="1" y="1" width="758" height="198" rx="24" fill="rgba(8,11,18,.82)" stroke="#2A3446" stroke-width="2"/><text x="730" y="44" fill="#A7B1C2" font-size="26" text-anchor="end" font-family="Plex">الإشارة</text><path class="ln" d="" stroke="#59C7FF" stroke-width="5" fill="none"/></svg>`));
}, (r, lt, t) => {
  popIn(r.querySelector('.a'), t, w(88) - .05); popIn(r.querySelector('.a2'), t, w(92)); hide(r.querySelector('.a'), t, w(94) - .1); hide(r.querySelector('.a2'), t, w(94) - .1);
  popIn(r.querySelector('.b'), t, w(95) - .05);
  const o = r.querySelector('.osc'); o.style.opacity = sm(w(96), w(96) + .3, t) * (1 - prog(t, w(102) - .3, w(102) - .1));
  let d = ''; for (let x = 0; x <= 700; x += 6) d += (x ? 'L' : 'M') + (30 + x) + ' ' + (120 + Math.sin(x * .09 + t * 14) * 4 + Math.sin(x * .23 - t * 9) * 3).toFixed(1);
  o.querySelector('.ln').setAttribute('d', d);
}));
L.push(T(w(102) - .05, w(119) - .05, r => {
  r.appendChild(big(`<div class="a" style="font-size:100px;font-weight:700;${SH}">الجزء <span style="color:${K.yellow}">المثير</span> ⚡</div>`, 'top:300px'));
  r.appendChild(big(`<div class="b" style="font-size:66px;font-weight:700;${SH}">كيف لمسة إصبعك…</div><div class="c" style="font-size:66px;font-weight:700;${SH}">تغيّر <span style="color:${C.cyan}">الشبكة</span>؟</div>`, 'top:250px'));
}, (r, lt, t) => { popIn(r.querySelector('.a'), t, w(103) - .1, .35, 60); hide(r.querySelector('.a'), t, w(106) - .15); popIn(r.querySelector('.b'), t, w(107)); popIn(r.querySelector('.c'), t, w(112)); }));
L.push(T(w(119) - .05, w(128) - .05, r => {
  r.appendChild(big(`<div class="a" style="font-size:88px;font-weight:700;${SH}"><span style="color:${C.cyan}">ماء</span> + <span style="color:${K.green}">أملاح</span></div>`, 'top:260px'));
  r.appendChild(big(`<div class="b">${pill('= توصيل للكهرباء ⚡', C.blue)}</div>`, 'top:430px;font-size:52px'));
  r.appendChild(el(`<div class="lb" style="position:absolute;left:120px;top:1040px;display:flex;gap:26px;font-size:40px;font-weight:700;direction:ltr">
    <span style="color:#FF6B60">H₂O</span><span style="color:#B48CFF">Na⁺</span><span style="color:#3DDC84">Cl⁻</span></div>`));
}, (r, lt, t) => { popIn(r.querySelector('.a'), t, w(122) - .1); popIn(r.querySelector('.lb'), t, w(123)); popIn(r.querySelector('.b'), t, w(126) - .1); }));
L.push(T(w(128) - .05, w(147) - .05, r => {
  r.appendChild(big(`<div class="a" style="font-size:70px;font-weight:700;${SH}">لما تلمس…</div>`, 'top:270px'));
  r.appendChild(big(`<div class="b" style="font-size:44px;font-weight:500;color:${C.gray};${SH}">تتغيّر</div><div class="c" style="font-size:90px;font-weight:700;${SH}">السعة <span style="color:${K.yellow}">الكهربائية</span></div>`, 'top:250px'));
  r.appendChild(big(`<div class="d">${pill('تحدد مكان إصبعك بالضبط 🎯', C.blue)}</div>`, 'top:300px;font-size:52px'));
  r.appendChild(el(`<div class="xy latin" style="position:absolute;left:0;right:0;top:1040px;text-align:center;font-size:48px;font-weight:700;color:${C.cyan};${SH}">X 412 · Y 1187</div>`));
}, (r, lt, t) => { popIn(r.querySelector('.a'), t, w(129)); hide(r.querySelector('.a'), t, w(132) - .1); popIn(r.querySelector('.b'), t, w(132)); popIn(r.querySelector('.c'), t, w(133)); hide(r.querySelector('.b'), t, w(139) - .1); hide(r.querySelector('.c'), t, w(139) - .1); popIn(r.querySelector('.d'), t, w(143)); popIn(r.querySelector('.xy'), t, w(144)); }));
L.push(T(w(147) - .05, w(176) - .05, r => {
  r.appendChild(big(`<div class="a" style="font-size:80px;font-weight:700;${SH}">مع <span style="color:${K.orange}">قفاز عادي</span>…</div>`, 'top:270px'));
  r.appendChild(big(`<div class="b">${pill('حاجز عازل', K.orange, '#1a0d00')}</div>`, 'top:290px;font-size:64px'));
  r.appendChild(el(`<div class="m" style="position:absolute;left:150px;right:150px;top:980px;padding:26px 34px;border-radius:26px;background:rgba(8,11,18,.85);border:2px solid #2A3446">
    <div style="display:flex;justify-content:space-between;font-size:34px;font-weight:700"><span>التغيّر الكهربائي</span><span class="v" style="color:${K.red}">ضعيف ✕</span></div>
    <div style="position:relative;height:26px;margin-top:18px;border-radius:13px;background:#1a2130"><i class="f" style="position:absolute;right:0;top:0;bottom:0;border-radius:13px;background:${K.red};width:0"></i><i style="position:absolute;right:62%;top:-10px;bottom:-10px;width:4px;background:${C.ink}"></i></div>
    <div style="font-size:26px;color:${C.gray};margin-top:12px;text-align:left">الحد اللي تحتاجه الشاشة ↑</div></div>`));
  r.appendChild(big(`<div class="c" style="position:relative;display:inline-block;font-size:96px;font-weight:700;${SH}">سميك؟<i class="sl" style="position:absolute;left:-16px;right:-16px;top:52%;height:10px;background:${K.red};border-radius:5px;transform-origin:right;transform:scaleX(0)"></i></div>`, 'top:260px'));
}, (r, lt, t) => {
  popIn(r.querySelector('.a'), t, w(148)); hide(r.querySelector('.a'), t, w(152) - .1);
  popIn(r.querySelector('.b'), t, w(155) - .1); hide(r.querySelector('.b'), t, w(170) - .1);
  const m = r.querySelector('.m'); popIn(m, t, w(160)); hide(m, t, w(170) - .1);
  r.querySelector('.f').style.width = (24 * sm(w(161), w(163), t) + 3 * Math.sin(t * 7) * prog(t, w(161), w(163))) + '%';
  popIn(r.querySelector('.c'), t, w(174) - .1); r.querySelector('.sl').style.transform = `scaleX(${sm(w(176) - .25, w(176) + .05, t)})`;
}));
L.push(T(w(176) - .05, w(183) - .05, r => {
  r.appendChild(big(`<div class="a" style="font-size:62px;font-weight:500;color:${C.gray};${SH}">المشكلة إنه</div><div class="b" style="font-size:104px;font-weight:700;${SH}">يعزل <span style="color:${K.orange}">كهربائيًا</span></div>`, 'top:250px'));
}, (r, lt, t) => { popIn(r.querySelector('.a'), t, w(176)); popIn(r.querySelector('.b'), t, w(178) - .05, .35, 50); }));
L.push(T(w(183) - .05, w(201) - .05, r => {
  r.appendChild(big(`<div class="a" style="font-size:86px;font-weight:700;${SH}">قفازات <span style="color:${C.cyan}">خاصة</span></div>`, 'top:250px'));
  r.appendChild(big(`<div class="b">${pill('أطراف موصلة للكهرباء ⚡', C.blue)}</div>`, 'top:270px;font-size:54px'));
  r.appendChild(big(`<div class="c">${pill('تشتغل وأنت لابسها ✓', K.green)}</div>`, 'top:290px;font-size:56px'));
}, (r, lt, t) => { popIn(r.querySelector('.a'), t, w(186) - .1); hide(r.querySelector('.a'), t, w(188) - .1); popIn(r.querySelector('.b'), t, w(190) - .05); hide(r.querySelector('.b'), t, w(195) - .1); popIn(r.querySelector('.c'), t, w(196) + .2, .35, 50); }));
L.push(T(w(201) - .05, VOICE_END + .12, r => {
  r.appendChild(big(`<div class="a" style="font-size:58px;font-weight:700;line-height:1.35;${SH}">أول مرة تعرف هذي المعلومة؟</div>`, 'top:240px'));
  r.appendChild(big(`<div class="b" style="display:inline-block;padding:26px 46px;border-radius:30px;background:rgba(8,11,18,.88);border:2px solid ${C.blue}">
      <div style="font-size:66px;font-weight:700">تابع <span class="latin" style="font-family:PlexLatin;color:${C.blue}">KROZO</span></div>
      <div style="font-size:32px;color:${C.gray};margin-top:8px">كيف تشتغل الأشياء اللي نستخدمها كل يوم</div></div>`, 'top:1000px'));
}, (r, lt, t) => { popIn(r.querySelector('.a'), t, w(201)); hide(r.querySelector('.a'), t, w(207) - .3); popIn(r.querySelector('.b'), t, w(207) - .1, .4, 40); }));

const outro = outroScene(VOICE_END + .05, VOICE_END + 2.55);
L.push(outro);

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
  scenes: L,
};
