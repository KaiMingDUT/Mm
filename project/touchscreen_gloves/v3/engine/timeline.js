// KROZO — "ليش الشاشة ما تحس بالقفاز؟"  v3: v2 shots in brand colours + magnified cross-section, ion fingertip, readings overlay.
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
  r.split([splitSide(r.handA, 'glove', .2 + b, 0x8a96aa), splitSide(r.handB, 'skin', .2 - b, 0x168bff)]);
});
const C11 = shot(w(53) - .05, w(59) - .05, (lt, t) => {
  const r = R(); r.stage('studio', t);
  phoneAt(v3(0, 0, 0), -.4, 0, 0);
  const at = w(56) + .05, k = tapK(t, [at], .2);
  const z = ease.inOut(prog(t, 29.3, 30.2));
  studioCam(lt, .55 - .12 * z, -.15, -.02, v3(0, .03, 0), 30);
  r.split([() => { splitSide(r.handA, 'glove', k, 0x8a96aa)(); r.setUI({ lock: false }); },
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

// ═════════ CROSS-SECTION helpers (xs stage, mm units) ═════════
// finger above the glass: x = centre, gap = height of the pad above the glass (mm)
// x = where the lowest point of the finger (or glove) lands; gap = its height above the glass (mm)
const XS_CAL = {};
function xsFinger(x, gap, mode = 'skin', o = {}) {
  const r = R(), base = { mode, dir: v3(.42, -1, -.05), pad: v3(0, -1, .1), scale: 1000, sleeve: null, noCuff: true };
  if (!XS_CAL[mode]) { r.setHand(r.handA, Object.assign({}, base, { at: v3(0, 0, 0) })); XS_CAL[mode] = r.lowest(r.handA); }
  const c = XS_CAL[mode];
  r.setHand(r.handA, Object.assign(base, o, { at: v3(x - c.x, gap - c.y, 0) }));
}
// readings under each electrode: 100 at rest; the dip follows the coupling under the finger
function readings(fx, depth, t, sig2 = 30) {
  return R().XE.map((x, i) => { const d = x - fx; const j = -(Math.sin(t * 11 + i * 7.3) > .55 ? 1 : 0); return Math.max(0, Math.round(100 - depth * Math.exp(-d * d / sig2)) + (depth > 2 ? 0 : j)); });
}
function xsCam(d, az, el, look, fov = 30, roll = 0) { R().lookCam(v3(look.x + Math.sin(az) * d, look.y + Math.sin(el) * d, look.z + Math.cos(az) * d), look, fov, roll); }
function xsBase(t, o = {}) {
  const r = R(); r.stage('xs', t); r.setUI({ lock: false });
  const a = r.xsArc; a.scanK.value = o.scanK || 0; a.scan.value = o.scan ?? -99;
  r.bloom.strength = .55; r.bloom.threshold = .55; r.bloom.radius = .6;
  r.grade.vig.value = .55;
}
// overlay builders (HTML strings; positioned with the live camera)
const P2 = (x, y, z) => R().project(v3(x, y, z));
function ovNums(vals, t, hot = 99) {
  let h = '';
  R().XE.forEach((x, i) => {
    const [px, py] = P2(x, -6.2, 6); if (px < 30 || px > 1050) return;
    const v = vals[i], on = v < hot;
    h += `<div class="num${on ? ' on' : ''}" style="left:${px.toFixed(1)}px;top:${py.toFixed(1)}px">${v}</div>`;
  });
  return h;
}
function ovLabel(txt, wx, wy, wz, dx, dy, k = 1, cls = '') {
  if (k <= 0) return '';
  const [x, y] = P2(wx, wy, wz), x2 = x + dx, y2 = y + dy;
  return `<svg class="ld" style="opacity:${k}"><line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}"/><circle cx="${x}" cy="${y}" r="5"/></svg>` +
    `<div class="tag ${cls}" style="opacity:${k};left:${x2}px;top:${y2}px">${txt}</div>`;
}
const ovNote = (txt = 'تكبير توضيحي · القيم للتوضيح') => `<div class="note">${txt}</div>`;
window.POST3D = (sh, lt, t) => { const o = document.getElementById('ov'); if (o) o.innerHTML = sh && sh.ov ? sh.ov(lt, t, sh) : ''; };

// ═════════ HOW CAPACITIVE SCREENS WORK ═════════
// X1: "ما تستجيب لأي شيء" — a pen taps the glass: the field ignores it, readings stay at 100
const X1 = shot(w(69) - .05, w(73) - .05, (lt, t) => {
  const r = R(); xsBase(t);
  const pk = tapK(t, [w(71), w(72) + .1], .16);
  r.pencil.visible = true; r.pencil.scale.setScalar(420); r.pencil.position.set(1, .02 + 7 * (1 - pk), 0); r.pencil.rotation.set(0, 0, -.42);
  xsCam(82 - lt * 3, -.06 + lt * .02, .1, v3(0, 5, 0), 30);
}, { ov: (lt, t) => ovNums(readings(0, 0, t), t) + ovLabel('زجاج', -6, -.3, 6, -40, -300, prog(lt, .15, .45)) + ovLabel('أقطاب الاستشعار', -2, -1.3, 6, -140, 260, prog(lt, .35, .65)) + ovLabel('بكسلات', 6, -2.1, 6, 120, 200, prog(lt, .55, .85)) + ovNote() });
const C14 = shot(w(73) - .05, w(76) - .05, (lt, t) => {
  const r = R(); r.stage('studio', t);
  phoneAt(v3(0, 0, 0), -Math.PI / 2, 0, 0); r.setUI({ lock: false });
  const dt = t - w(73);
  r.die.visible = true;
  const bounce = dt < 0 ? .12 : Math.abs(Math.cos(Math.min(dt, 2.2) * 6.5)) * .05 * Math.exp(-dt * 2.2) + .0125;
  r.die.position.set(-.006, bounce, .02 - Math.min(Math.max(dt, 0), 1) * .012); r.die.rotation.set(dt * 4, dt * 2.6, dt * 1.7);
  studioCam(lt, .24 - lt * .015, .55 + lt * .05, .14, v3(0, .01, 0), 32);
});
const C15 = shot(w(76) - .05, w(85) - .05, (lt, t) => {
  const r = R(); r.stage('studio', t);
  phoneAt(v3(0, 0, 0), -.08, -.9 + lt * .26, .0); r.setUI({ lock: false });
  const s = sm(w(82) - .2, w(82) + .4, t);
  studioCam(lt, .33 - .07 * s, .1, .02, v3(0, 0, 0), 30);
  r.studio.userData.r1.intensity = 26 + 30 * s; r.studio.userData.r2.position.set(.8 * Math.cos(t), .4, -.5);
  r.grade.flash.value = .3 * (t >= w(82) ? 1 - prog(t, w(82), w(82) + .25) : 0);
});
// inside the screen, top view (mm units)
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
// X2: "تراقب التغيّرات … باستمرار" — scan pulse sweeps the electrodes, readings tick at 100
const X2 = shot(w(94) - .05, w(102) - .05, (lt, t) => {
  const r = R(); const sc = ((lt * 6) % 26) - 13 + 10;
  xsBase(t, { scanK: 1, scan: sc });
  r.xsElec.forEach((m, i) => m.material.emissiveIntensity = .55 + 2.2 * Math.exp(-Math.pow(i - sc, 2) * .5));
  const k = ease.inOut(prog(lt, 0, 6));
  xsCam(95 - 25 * k, -.35 + .3 * k, .14 - .05 * k, v3(2 - 2 * k, 4, 0), 30);
}, { ov: (lt, t) => ovNums(readings(0, 0, t), t) + ovNote() });
const C18 = shot(w(102) - .05, w(106) - .05, (lt, t) => {   // "هنا يجي الجزء المثير" — whip around
  const r = R(); r.stage('studio', t);
  phoneAt(v3(0, 0, 0), -.2, 0, 0); r.setUI({ lock: false });
  const a = ease.inOut(prog(lt, 0, 1.9)) * Math.PI * 2;
  studioCam(lt, .3, a + .3, .04, v3(0, 0, 0), 30);
  r.grade.zb.value = .5 * Math.sin(prog(lt, 0, 1.9) * Math.PI);
  r.studio.userData.r1.intensity = 40;
});
// X3: the question — a bare finger slowly descends toward the field; readings start to stir
const x3gap = t => 22 - 19 * ease.inOut(prog(t, w(106), w(118) + .3));
const X3 = shot(w(106) - .05, w(119) - .05, (lt, t) => {
  const r = R(); xsBase(t);
  const g = x3gap(t); xsFinger(1, g, 'skin');
  r.xsArc.F.value.set(1, g, 0); r.xsArc.pull.value = .55 * Math.pow(clamp((10 - g) / 10), 1.6);
  const k = ease.inOut(prog(lt, 0, 12));
  xsCam(96 - 14 * k, .12 - .16 * k, .12, v3(.5, 8 - 3 * k, 0), 30);
}, { ov: (lt, t) => ovNums(readings(1, 10 * Math.pow(clamp((10 - x3gap(t)) / 10), 2), t), t, 99) + ovNote() });

// ═════════ WATER + SALTS: inside the fingertip ═════════
const ION = shot(w(119) - .05, w(128) - .05, (lt, t) => {
  const r = R(); r.stage('studio', t); r.studio.userData.floor.visible = false;
  const fl = sm(w(124) - .1, w(125), t);
  r.setHand(r.handA, { pose: 'point', mode: 'skin', at: v3(0, -.035, 0), dir: v3(.12, -1, .1), pad: v3(0, 0, 1), xray: .62, vein: .08 + .2 * fl, sleeve: 0x1c2230 });
  r.veinM.uniforms.t.value = t * (1 + 2 * fl);
  r.updIons(t, fl);
  const a = -.5 + lt * .08;
  r.lookCam(v3(Math.sin(a) * .085, -.02 + lt * .002, Math.cos(a) * .085), v3(.001, -.022, 0), 30);
  r.bloom.strength = .3 + .2 * fl; r.bloom.threshold = .85;
});

// ═════════ THE TOUCH (capacitance changes) ═════════
const C22 = shot(w(128) - .05, w(132) - .05, (lt, t) => {
  const r = R(); r.stage('desk', t);
  phoneAt(v3(0, 0, 0), -Math.PI / 2, 0, .3);
  const at = w(130), [u, v] = ICON(9);
  r.setUI({ lock: false, ripples: ripples(t, [at], u, v), hi: 9, hiK: t >= at ? 1 - prog(t, at + .1, at + .3) : 0 });
  fingerOn(r.handA, u, v, ease.inOut(prog(t, at - .5, at)) * (1 - sm(at + .5, at + .9, t)), { mode: 'skin', h: .02, tilt: .7, side: -.4, sleeve: 0x2a3140 });
  const tp = scr(u, v);
  camScr(u, v, .1, -1.25, -.1, 26, tp.clone().addScaledVector(nrm(), .01));
  r.screenLight.intensity = 0;
});
// X4: contact — the field lines leap into the fingertip, readings under it drop
const x4k = t => sm(w(132) - .1, w(133) + .5, t);
const X4 = shot(w(132) - .05, w(139) - .05, (lt, t) => {
  const r = R(); xsBase(t);
  const k = x4k(t), g = 3 * (1 - ease.out(prog(lt, 0, .5)));
  xsFinger(1, g, 'skin');
  r.xsArc.F.value.set(1, g, 0); r.xsArc.pull.value = .25 + .75 * k;
  r.xsElec.forEach((m, i) => { const d = r.XE[i] - 1; m.material.emissiveIntensity = .55 + 2.5 * k * Math.exp(-d * d / 30); });
  xsCam(80 - lt * 2.5, .2 - lt * .03, .1, v3(.5, 5, 0), 30);
  r.grade.flash.value = .25 * (t >= w(133) ? 1 - prog(t, w(133), w(133) + .25) : 0);
}, { ov: (lt, t) => ovNums(readings(1, 38 * x4k(t), t), t) + ovLabel('تتغيّر السعة', 2.5, 1.2, 0, 200, -260, sm(w(133), w(133) + .3, t), 'hot') + ovNote() });
// top view: per-crossing readings, the dip under the finger, then the coordinate lock
const HX = 4.2, HY = -6.1;
const C24 = shot(w(139) - .05, w(147) - .05, (lt, t) => {
  const r = R(); r.stage('tech', t); r.setUI({ lock: false });
  r.tech.userData.glass.visible = false;
  r.sensor.heat.value.set(HX, HY); r.sensor.heatK.value = 1; r.sensor.scanK.value = .5; r.sensor.scan.value = ((lt * 9) % 12) - 6;
  r.sensor.bright.value = .8;
  r.sensor.lock.value = sm(w(143) - .1, w(143) + .3, t);
  const z = ease.inOut(prog(t, w(144), w(146) + .3));
  techCam(v3(HX + 5 * (1 - z), 44 - 18 * z, HY + 18 - 11 * z), v3(HX, 0, HY), 40);
  r.grade.flash.value = .35 * (t >= w(146) ? 1 - prog(t, w(146), w(146) + .25) : 0);
}, {
  ov: (lt, t) => {
    let h = ''; const lk = sm(w(143) - .1, w(143) + .3, t);
    for (let i = -6; i <= 6; i++) for (let j = -7; j <= 4; j++) {
      const x = (i + .5) * 4, z = (j + .5) * 4, [px, py] = P2(x, 0, z);
      if (px < 40 || px > 1040 || py < 540 || py > 1700) continue;
      const d2 = (x - HX) ** 2 + (z - HY) ** 2, v = Math.round(100 - 38 * Math.exp(-d2 / 28));
      h += `<div class="num g${v < 97 ? ' on' : ''}" style="left:${px}px;top:${py}px">${v}</div>`;
    }
    const [cx, cy] = P2(HX, 0, HY);
    if (lk > 0) h += `<div class="ring" style="left:${cx}px;top:${cy}px;opacity:${lk};transform:translate(-50%,-50%) scale(${1.6 - .6 * ease.out(lk)})"></div>`;
    return h + ovNote();
  },
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
// glove in section: wool loops sit between the finger and the glass; the field can't reach the skin
function xsGlove(t, gap, o = {}) {
  const r = R(); xsBase(t);
  const mode = 'glove';   // in section the conductive part is shown by the silver loops
  xsFinger(1, gap + 2.3, mode, { glow: o.glow || 0 });          // the knit layer sits between pad and glass
  r.xsKnitAt(1, gap, 9, o.cond ? 1 : 0, o.glow || 0);
  r.xsArc.F.value.set(1, gap + (o.cond ? .3 : 1.4), 0);
  r.xsArc.pull.value = o.pull ?? .12;
  if (!o.cond) r.xsArc.cap.value = gap + .5;
  r.xsElec.forEach((m, i) => { const d = r.XE[i] - 1; m.material.emissiveIntensity = .55 + 2.5 * (o.lit || 0) * Math.exp(-d * d / 30); });
}
const x5gap = t => 5 * (1 - ease.inOut(prog(t, w(152) - .05, w(154))));
const X5 = shot(w(152) - .05, w(159) - .05, (lt, t) => {
  xsGlove(t, x5gap(t));
  xsCam(84 - lt * 2, -.18 + lt * .03, .1, v3(.5, 5, 0), 30);
}, { ov: (lt, t) => ovNums(readings(1, 3 * prog(t, w(153), w(154)), t), t, 98) + ovLabel('صوف = عازل', 6, 2.2, 1.5, -40, -330, sm(w(155) - .1, w(155) + .25, t), 'warn') + ovNote() });
const X6 = shot(w(159) - .05, w(170) - .05, (lt, t) => {
  xsGlove(t, 0);
  const a = .28 - lt * .05;
  xsCam(76, a, .14, v3(1, 5, 0), 30);
}, { ov: (lt, t) => ovNums(readings(1, 3, t), t, 98) + ovNote() });
const C28 = shot(w(170) - .05, w(176) - .05, (lt, t) => {   // "مو إن القفاز سميك"
  const r = R(); r.stage('studio', t);
  r.setHand(r.handA, { pose: 'open', mode: 'glove', at: v3(0, -.09, 0), dir: v3(.05, -1, .15), pad: v3(0, 0, 1), sleeve: 0x1c2230 });
  const a = .5 - lt * .15;
  r.lookCam(v3(Math.sin(a) * .4, .03, Math.cos(a) * .4), v3(0, 0, 0), 30);
});
// X7: macro on the wool loops — the field dies right at the fabric
const X7 = shot(w(176) - .05, w(183) - .05, (lt, t) => {
  xsGlove(t, 0);
  xsCam(46 - lt * 1.5, -.3 + lt * .05, .05, v3(-3, 2.6, 0), 30, .03);
}, { ov: (lt, t) => ovNums(readings(1, 3, t), t, 98) + ovNote() });

// ═════════ CONDUCTIVE GLOVES ═════════
const C30 = shot(w(183) - .05, w(188) - .05, (lt, t) => {
  const r = R(); r.stage('studio', t);
  r.setHand(r.handA, { pose: 'point', mode: 'cond', at: v3(0, -.09, 0), dir: v3(.05, -1, .15), pad: v3(0, 0, 1), sleeve: 0x1c2230, glow: .2 + .8 * sm(w(186), w(187), t) });
  const a = -.4 + lt * .2;
  r.lookCam(v3(Math.sin(a) * .38, .0, Math.cos(a) * .38), v3(0, -.02, 0), 30);
  r.bloom.threshold = .7;
});
const x8k = t => sm(w(190) - .1, w(190) + .5, t);
const X8 = shot(w(188) - .05, w(195) - .05, (lt, t) => {
  const g = x8k(t);
  xsGlove(t, 0, { cond: true, pull: .1 + .85 * g, glow: g * (.25 + .1 * Math.sin(t * 9)), lit: g });
  xsCam(82 - lt * 2.5, .25 - lt * .04, .1, v3(.5, 5, 0), 30);
  R().grade.flash.value = .22 * (t >= w(190) ? 1 - prog(t, w(190), w(190) + .25) : 0);
}, { ov: (lt, t) => ovNums(readings(1, 34 * x8k(t), t), t) + ovLabel('خيوط فضة موصلة', -4, 1.4, 1.5, 60, -330, sm(w(190), w(190) + .3, t), 'hot') + ovNote() });
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
  fingerOn(r.handA, .5, .44, ease.inOut(prog(t, at - .5, at)), { mode: 'skin', h: .04, tilt: -.6, side: -.35, sleeve: 0x2a3140 });
  camScr(.5, .5, .3 - lt * .01, .1, .45, 32, scr(.5, .45), upv());
  r.screenLight.intensity = 0;
});
// recap: replays of the strongest shots, faster and faster
const RECAP = [[C1, 1.0], [C7, w(32) - (w(29) - .05) + .2], [X4, 2.2], [C12, 2.6], [ION, 5.2], [X2, 3.5], [C24, 4.6], [X8, 3.4], [C32, w(196) - (w(195) - .05) + .4], [X1, 1.2], [C30, 2.5], [C15, 4.5]];
const RC0 = w(207) - .2, RC1 = VOICE_END + .12, RSEG = (RC1 - RC0) / RECAP.length;
const recapAt = lt => { const i = Math.min(RECAP.length - 1, Math.floor(lt / RSEG)), [src, off] = RECAP[i], l2 = lt - i * RSEG; return { src, l2, lt2: off + l2 * .6 }; };
const C34 = shot(RC0, RC1, (lt, t) => {
  const { src, l2, lt2 } = recapAt(lt);
  src.update(lt2, src.s + lt2, src);
  R().grade.zb.value = Math.max(R().grade.zb.value, .7 * Math.max(0, 1 - l2 / .14));
}, { ov: (lt, t) => { const { src, lt2 } = recapAt(lt); return src.ov ? src.ov(lt2, src.s + lt2, src) : ''; } });
window.SHOTS = S;

// ═════════ DOM callouts (minimal — the captions on top carry the words) ═════════
const T = (s, e, build, update) => ({ s, e, fi: .08, fo: .12, build, update });
const L = [];
const low = (html, top = 1480) => big(html, `top:${top}px`);
const badge = (txt, kind) => `<span class="badge ${kind}">${txt}</span>`;
L.push(T(0, w(7) - .05, r => { r.appendChild(low(`<div class="x">${badge('✕ ما في استجابة', 'no')}</div>`)); },
  (r, lt, t) => { popIn(r.querySelector('.x'), t, w(2) + .15); }));
L.push(T(w(7) - .05, w(11) - .05, r => {
  for (let i = 0; i < 3; i++) r.appendChild(el(`<div class="m${i} xmark">✕</div>`));
}, (r, lt, t) => {
  [w(8) + .05, w(9), w(10) + .05].forEach((a, i) => { const m = r.querySelector('.m' + i); m.style.left = (430 + i * 110) + 'px'; m.style.top = (1420 + (i % 2) * 70) + 'px'; m.style.opacity = t >= a ? 1 - prog(t, a + .35, a + .6) : 0; m.style.transform = `scale(${t >= a ? .6 + .4 * ease.back(prog(t, a, a + .2)) : .6})`; });
}));
L.push(T(w(11) - .05, w(18) - .05, r => { r.appendChild(low(`<div class="b">${badge('✕ ولا شي', 'no')}</div>`)); }, (r, lt, t) => { popIn(r.querySelector('.b'), t, w(17)); }));
L.push(T(w(29) - .05, w(34) - .05, r => { r.appendChild(low(`<div class="a">${badge('✓ استجابة فورية', 'yes')}</div>`)); }, (r, lt, t) => { popIn(r.querySelector('.a'), t, w(32) + .05, .35, 60); }));
L.push(T(w(46) - .05, w(59) - .05, r => {
  r.appendChild(el(`<div class="l" style="position:absolute;left:0;width:540px;top:1460px;text-align:center">${badge('قفاز', 'no')}</div>`));
  r.appendChild(el(`<div class="r" style="position:absolute;right:0;width:540px;top:1460px;text-align:center">${badge('إصبع', 'yes')}</div>`));
  r.appendChild(el(`<div class="lx" style="position:absolute;left:0;width:540px;top:1580px;text-align:center">${badge('✕', 'no')}</div>`));
  r.appendChild(el(`<div class="rx" style="position:absolute;right:0;width:540px;top:1580px;text-align:center">${badge('✓', 'yes')}</div>`));
}, (r, lt, t) => {
  popIn(r.querySelector('.l'), t, w(50) - .1); popIn(r.querySelector('.r'), t, w(50) + .1);
  popIn(r.querySelector('.lx'), t, w(56) + .15); popIn(r.querySelector('.rx'), t, w(56) + .2);
}));
L.push(T(w(76) - .05, w(85) - .05, r => {
  r.appendChild(low(`<div class="d latin kick">CAPACITIVE TOUCHSCREEN</div>`, 1500));
}, (r, lt, t) => { popIn(r.querySelector('.d'), t, w(82)); }));
L.push(T(w(119) - .05, w(128) - .05, r => {
  r.appendChild(low(`<div class="lb latin" style="display:flex;justify-content:center;gap:22px;font-size:46px;font-weight:700"><span class="chip">H₂O</span><span class="chip na">Na⁺</span><span class="chip cl">Cl⁻</span></div>`, 1470));
  r.appendChild(low(`<div class="b">${badge('⚡ توصّل الكهرباء', 'yes')}</div>`, 1590));
}, (r, lt, t) => { popIn(r.querySelector('.lb'), t, w(122)); popIn(r.querySelector('.b'), t, w(126) - .1); }));
L.push(T(w(139) - .05, w(147) - .05, r => {
  r.appendChild(el(`<div class="xy latin" style="position:absolute;left:0;right:0;top:1500px;text-align:center"><span class="badge yes">X 412 · Y 1187</span></div>`));
}, (r, lt, t) => { popIn(r.querySelector('.xy'), t, w(144)); }));
L.push(T(w(159) - .05, w(170) - .05, r => {
  r.appendChild(el(`<div class="m meter">
    <div style="display:flex;justify-content:space-between;font-size:34px;font-weight:700"><span>التغيّر الكهربائي</span><span class="v" style="color:${C.gray}">ضعيف ✕</span></div>
    <div class="bar"><i class="f"></i><i class="th"></i></div>
    <div style="font-size:26px;color:${C.gray};margin-top:12px;text-align:left">↑ الحد اللي تحتاجه الشاشة</div></div>`));
}, (r, lt, t) => {
  const m = r.querySelector('.m'); popIn(m, t, w(160));
  r.querySelector('.f').style.width = (8 * sm(w(161), w(163), t) + 1.5 * Math.sin(t * 7) * prog(t, w(161), w(163))) + '%';
}));
L.push(T(w(170) - .05, w(176) - .05, r => {
  r.appendChild(low(`<div class="c" style="position:relative;display:inline-block;font-size:92px;font-weight:700;${SH}">سميك؟<i class="sl" style="position:absolute;left:-16px;right:-16px;top:52%;height:10px;background:${C.blue};border-radius:5px;box-shadow:0 0 18px ${C.blue};transform-origin:right;transform:scaleX(0)"></i></div>`, 1440));
}, (r, lt, t) => { popIn(r.querySelector('.c'), t, w(174) - .1); r.querySelector('.sl').style.transform = `scaleX(${sm(w(176) - .25, w(176) + .05, t)})`; }));
L.push(T(w(195) - .05, w(201) - .05, r => { r.appendChild(low(`<div class="c">${badge('✓ تشتغل وأنت لابسها', 'yes')}</div>`)); }, (r, lt, t) => { popIn(r.querySelector('.c'), t, w(196) + .2, .35, 50); }));
L.push(T(w(207) - .2, VOICE_END + .12, r => {
  r.appendChild(big(`<div class="b" style="display:inline-block;padding:26px 46px;border-radius:30px;background:rgba(8,11,18,.88);border:2px solid ${C.blue}">
      <div style="font-size:66px;font-weight:700">تابع <span class="latin" style="font-family:PlexLatin;color:${C.blue}">KROZO</span></div>
      <div style="font-size:32px;color:${C.gray};margin-top:8px">كيف تشتغل الأشياء اللي نستخدمها كل يوم</div></div>`, 'top:1440px'));
}, (r, lt, t) => { popIn(r.querySelector('.b'), t, w(207) - .1, .4, 40); }));

const outro = outroScene(VOICE_END + .05, VOICE_END + 2.55);
L.push(outro);

// caption keywords (global word indices) get the KROZO selection box
const KEYS = new Set([6, 10, 17, 26, 33, 45, 49, 62, 65, 74, 84, 88, 101, 105, 117, 122, 123, 127, 133, 146, 151, 155, 175, 178, 190, 207]);

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
