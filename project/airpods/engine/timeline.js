// KROZO — "كيف الإيربودز تخفّف صوت محرك الطيارة… بدون ما تسد أذنك؟"  shots in story time (w(i) = start of word i).
const VOICE_END = 51.75;
const w = i => WT[i];
const sm = (a, b, t) => ease.inOut(prog(t, a, b));
const bump = (t, a, d = .5) => Math.max(0, Math.sin(Math.PI * prog(t, a, a + d)));
const big = (txt, extra = '') => el(`<div style="position:absolute;left:50px;right:50px;text-align:center;${extra}">${txt}</div>`);
function popIn(node, t, at, dur = .3, rise = 30) {
  const k = ease.back(prog(t, at, at + dur));
  node.style.opacity = clamp(prog(t, at, at + dur * .5));
  node.style.transform = `translateY(${(1 - k) * rise}px) scale(${.86 + .14 * k})`;
  return k;
}
const R = () => window.R3;
const v3 = (x, y, z) => R().V(x, y, z);
const S = [];
let NOW = 0, NOWLT = 0, NOWSH = null;
const shot = (s, e, update, o = {}) => { const x = Object.assign({ s, e }, o); x.update = (lt, t, sh) => { NOW = t; NOWLT = lt; NOWSH = x; update(lt, t, sh); }; S.push(x); return x; };
// camera energy: a punch-in on key words, a whip-pan into some shots, a light handheld drift
const KICKW = [4, 11, 19, 24, 29, 35, 42, 45, 54, 59, 65, 72, 76, 80, 90];
const kick = t => KICKW.reduce((m, i) => { const a = WT[i]; return t < a ? m : Math.max(m, ease.out(prog(t, a, a + .07)) * Math.exp(-(t - a) * 4)); }, 0);
const hand = t => [Math.sin(t * 1.7) * .6 + Math.sin(t * 3.1 + 1) * .4, Math.sin(t * 1.3 + 2) * .6 + Math.sin(t * 2.7) * .4];
const P2 = v => R().project(v);
const r2 = x => Math.round(x * 100) / 100;
// frame an object: world height hW fills hPx pixels, its centre sits at (xPx, yPx); az/el orbit the camera around it
function aim(c, hW, hPx, yPx = 720, az = 0, el = 0, fov = 30, xPx = 540) {
  hPx *= 1 + .09 * kick(NOW);
  const wh = NOWSH && NOWSH.whip ? NOWSH.whip * (1 - ease.out(prog(NOWLT, 0, .38))) : 0;
  const [hx, hy] = hand(NOW); az += wh * .55 + hx * .012; el += hy * .008;
  const visH = hW * 1920 / hPx, d = visH / (2 * Math.tan(fov * Math.PI / 360));
  R().cam.near = Math.max(.002, d * .02);
  const look = v3(c.x - (xPx - 540) / 1920 * visH * Math.cos(az), c.y - (960 - yPx) / 1920 * visH, c.z + (xPx - 540) / 1920 * visH * Math.sin(az));
  R().lookCam(v3(look.x + Math.sin(az) * Math.cos(el) * d, look.y + Math.sin(el) * d, look.z + Math.cos(az) * Math.cos(el) * d), look, fov);
}
function ovTag(txt, v, dx, dy, k = 1, cls = '') {
  if (k <= 0) return ''; const [x, y] = P2(v), x2 = x + dx, y2 = y + dy;
  return `<svg class="ld" style="opacity:${k}"><line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}"/><circle cx="${x}" cy="${y}" r="5"/></svg><div class="tag ${cls}" style="opacity:${k};left:${x2}px;top:${y2}px">${txt}</div>`;
}
const ovNote = (txt = 'رسم توضيحي') => `<div class="note">${txt}</div>`;
// a tag pushed toward the frame centre (never off-screen): dx sign picked from the anchor's side, |dx| = dist
function tagIn(txt, v, dist, dy, k = 1, cls = '') { const [x] = P2(v); return ovTag(txt, v, x < 540 ? dist : -dist, dy, k, cls); }
window.POST3D = (sh, lt, t) => { const o = document.getElementById('ov'); if (o) o.innerHTML = sh && sh.ov ? sh.ov(lt, t, sh) : ''; };
const lerpV = (a, b, k) => a.clone().lerp(b, k);
const E = (x, y, z) => new (R().THREE.Euler)(x, y, z);
const BLUE = 0x168BFF, CYAN = 0x59C7FF, INK = 0xF4F7FB;

// ═════════ HOOK: the engine roars… the earbud makes it quiet (the hook headline sits in the top third) ═════════
const ENG = { x: 3.3, y: -2.45, z: 5.9 };   // right engine intake (jet frame)
const K1 = shot(0, w(8) - .05, (lt, t) => {
  const r = R(); r.stage('sky', t); r.updClouds(t, 70); r.jet.visible = true; r.navLights(t);
  r.jet.position.set(0, 0, 0); r.jet.rotation.set(0, 0, .02 * Math.sin(t * .6));
  r.jet.updateMatrixWorld(true);
  const intake = r.jet.localToWorld(v3(ENG.x + .3, ENG.y, ENG.z));
  // engine roar: rings + noise waves rolling back over the wing
  r.emit(intake, t, { per: .32, life: 1.4, R: 4.2, col: BLUE, a: .8, wave: 1 });
  for (let i = 0; i < 3; i++) r.wave(r.jet.localToWorld(v3(ENG.x - 3 - i * 2.2, ENG.y + .2 + i * .9, ENG.z - 1.6 - i * 1.4)), E(0, .2, 0), 7, { t, amp: .55 - i * .1, k: 3, sp: 2.2, mode: 0, col: BLUE, a: .7 - i * .15, width: .06, seed: i });
  const z = sm(0, w(7) + .3, t);
  aim(r.jet.localToWorld(v3(ENG.x - 1.5 - 6 * z, ENG.y + .8 + 1.6 * z, ENG.z - 1 - 3.5 * z)), 7 + 5 * z, 900, 1150, .9 - .55 * z, .12 + .1 * z, 40);
}, { noPunch: true });
// K2: "بدون ما تسد أذنك!" — a holographic head wearing the earbud: the engine noise dies at the ear; the ear stays open
const K2 = shot(w(8) - .05, w(12) - .05, (lt, t) => {
  const r = R(); r.stage('holo', t); r.scene.background = new (r.THREE.Color)(0x04070d);
  const b = r.busts[0]; b.visible = true; b.position.set(0, 0, 0); b.rotation.set(0, .25, 0); b.updateMatrixWorld(true);
  const ear = b.localToWorld(b.userData.ear.clone());
  r.budAt(ear.clone().add(v3(.0, -.012, .012)), 0, .25 + Math.PI, -.25, .24);
  // noise arriving from the window side, shrinking to nothing at the earbud
  for (let i = 0; i < 5; i++) { const k = ((t * .8 + i / 5) % 1); r.ring(lerpV(ear.clone().add(v3(.5, .25, 1.3)), ear, k), .45 * (1 - k) + .02, BLUE, .75 * (1 - k) * Math.min(1, k * 6), { wave: 1, w: .05 }); }
  r.wave(ear.clone().add(v3(.35, .12, .75)), E(0, -1.0, -.2), .9, { t, amp: .05, k: 4, sp: 1.6, mode: 0, col: BLUE, a: .7, seed: 3 });
  const open = sm(w(10) - .1, w(11) + .2, t);
  r.ring(ear.clone().add(v3(0, 0, .03)), .07 + .01 * Math.sin(t * 6), CYAN, .4 + .6 * open, { w: .1 });
  aim(ear, .55, 820 - lt * 40, 1180, .55 - lt * .06, .1, 30);
}, { ov: (lt, t) => { const r = R(), b = r.busts[0]; return tagIn('الأذن مفتوحة ✓', b.localToWorld(b.userData.ear.clone()), 230, 120, sm(w(10) + .1, w(10) + .4, t), 'hot'); } });

// ═════════ "طيب، وين يروح الصوت؟" ═════════
const STUDIO_BUD = () => R().V(0, 1.0, 0);
function heroBud(t, s = 1, ry = 0, rx = .15) { const r = R(); r.stage('studio', t); r.studio.userData.bars.visible = true; r.budAt(STUDIO_BUD(), rx, ry, -.12, s); r.scene.fog = new (r.THREE.FogExp2)(0x05080e, .05); }
const K3 = shot(w(12) - .05, w(16) - .05, (lt, t) => {
  const r = R(); heroBud(t, 3, .4 + t * .35);
  const c = STUDIO_BUD();
  // noise waves arrive from the left and vanish at the earbud
  for (let i = 0; i < 3; i++) { const p = c.clone().add(v3(-1.1 - .1 * i, .3 - i * .3, -.2 + i * .15)); const fade = 1 - prog(t, w(13) + i * .1, w(15) + .3); r.wave(p, E(0, 0, -.12 + i * .1), 1.4, { t, amp: .1, k: 4, sp: 1.6, mode: 0, col: BLUE, a: .9 * fade, width: .015, seed: i, cancel: 1 - fade }); }
  r.ring(c, .55 + .05 * Math.sin(t * 3), CYAN, .25 + .5 * bump(t, w(15), .7), { w: .04 });
  aim(c, 1.25, 900 + lt * 60, 760, .15 - lt * .05, .08, 30);
});

// ═════════ the mics hear the noise ═════════
const K4 = shot(w(16) - .05, w(24) - .05, (lt, t) => {
  const r = R(); heroBud(t, 3, 2.6 + lt * .12, .05);   // back side: the outward mic faces the camera
  const on = sm(w(19) - .1, w(19) + .3, t);
  r.BUD.micPts.forEach((mp, i) => {
    const p = r.budPt(mp);
    r.ring(p, .04 + .03 * on, CYAN, on, { w: .12 }); if (on > 0) r.emit(p, t, { per: .5, life: 1, R: .2, col: CYAN, a: .6 * on });
    // noise flowing into each mic
    const into = sm(w(20) - .1, w(21) + .2, t);
    if (into > 0) for (let j = 0; j < 2; j++) { const src = p.clone().add(v3(-.9 + j * .15, .25 * (i ? -1 : 1) + j * .1, -.6)); const m = lerpV(src, p, .5); const dir = p.clone().sub(src); r.wave(m, E(0, Math.atan2(-dir.z, dir.x) * 0 + .6, Math.atan2(dir.y, dir.x) * .9), src.distanceTo(p), { t, amp: .05, k: 5, sp: 2, mode: 0, col: BLUE, a: .85 * into, width: .012, seed: i * 2 + j, grow: into }); }
  });
  aim(r.budPt(v3(.03, -.13, 0)), 1.4, 780 + lt * 30, 720, .2 + lt * .03, .1, 30);
}, { whip: 1, ov: (lt, t) => { const r = R(), k = sm(w(19), w(19) + .3, t); return tagIn('ميكروفون', r.budPt(r.BUD.micPts[0]), 240, -120, k, 'hot') + tagIn('ميكروفون', r.budPt(r.BUD.micPts[1]), 240, 60, sm(w(19) + .15, w(19) + .45, t), 'hot'); } });

// ═════════ the chip computes the opposite wave ═════════
// scope above, x-ray earbud below; row 1 = the noise, row 2 = the anti-noise (inverted), later they meet in the middle
const SCP = () => R().V(0, 2.25, 0);
function scopeScene(t, lt) { const r = R(); r.stage('studio', t); r.studio.userData.bars.visible = false; r.scene.fog = new (r.THREE.FogExp2)(0x05080e, .05); r.scopeAt(SCP(), 0, 1); }
const K5 = shot(w(24) - .05, w(32) - .05, (lt, t) => {
  const r = R(); scopeScene(t, lt);
  r.budAt(v3(0, .55, .3), .1, .9 + lt * .1, -.1, 2.4); r.budHolo(true, 1);
  const chipOn = sm(w(24), w(24) + .3, t); r.BUD.chip.material.color.setHex(0x59c7ff); r.BUD.chip.scale.setScalar(1 + .3 * bump(t, w(25), .5));
  r.ring(r.budPt(r.BUD.chip.position), .15 + .05 * Math.sin(t * 8), CYAN, .7 * chipOn, { w: .1 });
  const nz = sm(w(26) - .2, w(26) + .3, t), an = sm(w(27), w(29) + .2, t);
  r.scopeWave(.35, { t, amp: .22, k: 2.2, sp: .8, mode: 0, col: BLUE, a: nz, grow: nz, seed: 1 });
  r.scopeWave(-.35, { t, amp: .22, k: 2.2, sp: .8, mode: 0, inv: -1, col: CYAN, a: an, grow: an, seed: 1 });
  if (t > w(31)) r.grade.flash.value = .18 * (1 - prog(t, w(31), w(31) + .3));
  aim(v3(0, 1.55, 0), 3.1, 1180, 700, .05 * Math.sin(lt * .5), .04, 30);
}, { ov: (lt, t) => {
  const r = R(); return tagIn('الشريحة', r.budPt(r.BUD.chip.position), 230, 40, sm(w(24) + .1, w(24) + .4, t), 'hot') +
    ovTag('الضوضاء', r.scopePt(-1.1, .35), 70, -120, sm(w(26), w(26) + .3, t)) + ovTag('موجة معاكسة', r.scopePt(1.1, -.35), -90, 130, sm(w(28), w(28) + .3, t), 'hot');
} });
// K6: "ولما الموجتين يلتقون… يلغون بعض، وتُعزل الضوضاء." — the rows slide together and cancel to a flat line
const K6 = shot(w(32) - .05, w(39) - .05, (lt, t) => {
  const r = R(); scopeScene(t, lt);
  const meet = sm(w(33), w(34) + .4, t), can = sm(w(35) - .05, w(35) + .5, t);
  const y = .35 * (1 - meet);
  r.scopeWave(y, { t, amp: .22, k: 2.2, sp: .8, mode: 0, col: BLUE, a: 1 - can * .85, seed: 1 });
  r.scopeWave(-y, { t, amp: .22, k: 2.2, sp: .8, mode: 0, inv: -1, col: CYAN, a: 1 - can * .85, seed: 1, z: .005 });
  r.scopeWave(0, { t, amp: .22, k: 2.2, sp: .8, mode: 0, col: INK, a: can, cancel: can, width: .03, seed: 1, z: .01 });
  if (t > w(35)) r.grade.flash.value = .25 * (1 - prog(t, w(35), w(35) + .35));
  const q = sm(w(37), w(38) + .3, t); r.ring(r.scopePt(0, 0, .05), .3 + 1.4 * q, CYAN, .7 * (1 - q) * (q > 0 ? 1 : 0), { w: .04 });
  aim(SCP(), 1.7, 640 + lt * 30, 700, -.04 + .03 * lt, .03, 30);
}, { whip: -1, ov: (lt, t) => ovTag('هدوء', R().scopePt(0, 0), 0, -260, sm(w(37), w(37) + .3, t), 'hot') });

// ═════════ "السماعات ما تمنع الصوت… بل تصنع صوت معاكس له!" ═════════
const K7 = shot(w(39) - .05, w(49) - .05, (lt, t) => {
  const r = R(); heroBud(t, 3.2, Math.PI / 2 + .25, .05); r.budHolo(true, .9);
  const out = r.budPt(v3(.012, -.008, .2)), dir = v3(0, 0, 1).applyQuaternion(r.bud.quaternion);
  // outside noise (blue) from the back; the speaker answers with its anti-wave (cyan) toward the ear
  const mk = sm(w(44) - .1, w(45) + .3, t);
  r.wave(out.clone().add(dir.clone().multiplyScalar(.75)), E(0, -Math.atan2(dir.z, dir.x), 0), 1.3, { t, amp: .08, k: 3, sp: 1.2, mode: 0, col: BLUE, a: .9 * (1 - .8 * mk), seed: 2 });
  r.wave(out.clone().add(dir.clone().multiplyScalar(.75)).add(v3(0, 0, .002)), E(0, -Math.atan2(dir.z, dir.x), 0), 1.3, { t, amp: .08, k: 3, sp: 1.2, mode: 0, inv: -1, col: CYAN, a: mk, grow: mk, seed: 2 });
  r.BUD.driver.scale.setScalar(1 + .25 * mk * Math.abs(Math.sin(t * 20)));
  r.ring(out, .1 + .05 * Math.sin(t * 9), CYAN, .7 * mk, { w: .1 });
  aim(out.clone().add(dir.clone().multiplyScalar(.3)).add(v3(0, -.15, 0)), 2.4, 900 + lt * 30, 720, .05 + .04 * Math.sin(lt * .5), .1, 30, 640);
});

// ═════════ the twist: the engine disappears… your friend doesn't ═════════
// K8: "بس هنا المفاجأة…" — dark push-in, glitch
const K8 = shot(w(49) - .05, w(52) - .05, (lt, t) => {
  const r = R(); heroBud(t, 3, 4.2 + lt * .5, .1); r.renderer.toneMappingExposure = .7;
  r.grade.glitch.value = .35 * bump(t, w(51), .45); r.grade.vig.value = .8;
  aim(STUDIO_BUD(), 1.2, 700 + lt * 260, 760, -.3 + lt * .2, .12, 30);
}, { whip: 1 });
// K9: "ليش صوت المحرك يختفي… وصوت صديقك اللي يتكلم ما يختفي؟" — you (earbud) and your friend; engine waves die, speech stays
const YOU = { x: -.65, z: 0 }, FRIEND = { x: .65, z: 0 };
function twoBusts(t) {
  const r = R(); r.stage('holo', t);
  const [a, b] = r.busts; a.visible = b.visible = true;
  a.position.set(YOU.x, 0, YOU.z); a.rotation.set(0, -.15, 0); b.position.set(FRIEND.x, 0, FRIEND.z); b.rotation.set(0, Math.PI + .15, 0);
  a.updateMatrixWorld(true); b.updateMatrixWorld(true);
  const ear = a.localToWorld(a.userData.ear.clone()), mouth = b.localToWorld(b.userData.mouth.clone());
  r.budAt(ear.clone().add(v3(0, -.01, .02)), 0, -.15, -.2, .2);
  return { ear, mouth };
}
const K9 = shot(w(52) - .05, w(62) - .05, (lt, t) => {
  const r = R(); const { ear, mouth } = twoBusts(t);
  const eng = 1 - sm(w(54), w(55) + .5, t);   // the engine noise fades as the earbud cancels it
  for (let i = 0; i < 2; i++) r.wave(ear.clone().add(v3(-.75, .25 - i * .2, .35 + i * .1)), E(0, .35, -.25), 1.2, { t, amp: .07, k: 3, sp: 1.4, mode: 0, col: BLUE, a: .4 + .5 * eng, cancel: 1 - eng, seed: i });
  const sp = sm(w(56) - .1, w(57) + .3, t);   // the friend talks: speech reaches your ear and stays
  if (sp > 0) { const m = lerpV(mouth, ear, .5); const dir = ear.clone().sub(mouth); r.wave(m.add(v3(0, .02, .05)), E(0, -Math.atan2(dir.z, dir.x), Math.atan2(dir.y, Math.hypot(dir.x, dir.z))), mouth.distanceTo(ear), { t, amp: .06, k: 4, sp: 1.6, mode: 1, col: CYAN, a: sp, grow: sp, seed: 7 }); r.emit(mouth, t, { per: .3, life: .8, R: .25, col: CYAN, a: .5 * sp }); }
  r.ring(ear, .06, CYAN, .5, { w: .12 });
  aim(v3(0, .8, 0), 1.6, 880, 760, .02 + .05 * Math.sin(lt * .5), .1, 30);
}, { ov: (lt, t) => { const r = R(), [a, b] = r.busts; return tagIn('أنت', a.localToWorld(v3(0, 1.12, 0)), 60, -130, prog(lt, .2, .5)) + tagIn('صديقك', b.localToWorld(v3(0, 1.12, 0)), 60, -130, sm(w(57) - .1, w(57) + .2, t), 'hot'); } });

// ═════════ why: steady vs fast-changing ═════════
// K10: "لأن صوت المحرك ثابت، والسماعة تقدر تتوقعه." — engine wave + the earbud's prediction (dashed) on top of it
const K10 = shot(w(62) - .05, w(69) - .05, (lt, t) => {
  const r = R(); scopeScene(t, lt);
  r.scopeWave(.15, { t, amp: .3, k: 2.2, sp: .8, mode: 0, col: BLUE, seed: 1 });
  const pr = sm(w(66), w(67) + .4, t);
  r.scopeWave(.15, { t, amp: .3, k: 2.2, sp: .8, mode: 0, col: CYAN, a: pr, grow: pr, dash: 1, width: .028, seed: 1, z: .006 });
  aim(SCP(), 1.7, 640 + lt * 25, 700, .06 - .02 * lt, .03, 30);
}, { whip: 1, ov: (lt, t) => { const r = R(); return ovTag('صوت المحرك: <span style="color:#59C7FF">ثابت</span>', r.scopePt(-.3, .62), 40, -110, prog(lt, .1, .4)) + ovTag('توقّع السماعة ✓', r.scopePt(.4, -.15), -40, 260, sm(w(67) + .2, w(67) + .5, t), 'hot'); } });
// K11: "أما صوت صديقك… يتغير بسرعة، والسماعة ما تلحق عليه." — speech wave; the prediction lags behind
const K11 = shot(w(69) - .05, w(78) - .05, (lt, t) => {
  const r = R(); scopeScene(t, lt);
  r.scopeWave(.15, { t, amp: .3, k: 2.2, sp: 1.1, mode: 1, col: CYAN, seed: 7 });
  const pr = sm(w(74), w(75) + .4, t), lagK = sm(w(75), w(76) + .4, t);
  r.scopeWave(.15, { t, amp: .3, k: 2.2, sp: 1.1, mode: 1, col: 0xA7B1C2, a: pr, grow: pr, dash: 1, width: .028, lag: -.35 * lagK, seed: 7, z: .006 });
  aim(SCP(), 1.7, 640 + lt * 25, 700, -.06 + .02 * lt, .03, 30);
}, { ov: (lt, t) => { const r = R(); return ovTag('صوت صديقك: <span style="color:#59C7FF">يتغير بسرعة</span>', r.scopePt(-.3, .62), 40, -110, prog(lt, .1, .4), 'hot') + ovTag('توقّع السماعة ✕', r.scopePt(.4, -.15), -40, 260, sm(w(76), w(76) + .3, t)); } });

// ═════════ call to action ═════════
// K12: "أرسل المقطع لصديقك اللي دايمًا يزعجك وما يسكت." — share sheet: the friend with the endless speech bubble
const K12 = shot(w(78) - .05, w(86) - .05, (lt, t) => {
  const r = R(); r.stage('studio', t); r.studio.userData.bars.visible = true;
  r.setUI2({ mode: 'share', sheet: r2(ease.out(prog(t, w(78), w(79) + .2))), pick: t > w(80) + .1 ? 1 : 0, blah: r2(prog(t, w(82), w(85))), sent: t > w(85) + .1 ? 1 : 0 });
  r.phoneAt(v3(0, 1, 0), -.08, .22 - lt * .05, 0, 9);
  r.phoneLight.intensity = 1;
  if (t > w(85) + .1) r.ring(r.phonePt(.5, .74, .002), .25 + .3 * prog(t, w(85) + .1, w(85) + .6), CYAN, 1 - prog(t, w(85) + .1, w(85) + .6), { w: .08 });
  aim(v3(0, 1, 0), 1.35, 1120 + lt * 20, 720, .12 - lt * .03, .05, 30);
}, { whip: -1 });
// K13: "وقول لي… وش أكثر صوت تتمنى السماعة تلغيه؟" — the comments fill with sounds people want gone
const K13 = shot(w(86) - .05, VOICE_END + .12, (lt, t) => {
  const r = R(); r.stage('studio', t); r.studio.userData.bars.visible = true;
  const rows = [{ t: 'شخير أخوي', likes: 214 }, { t: 'منبّه الصباح', likes: 187 }, { t: 'بكاء الأطفال بالطيارة', likes: 342 }, { t: 'صوت المكيف', likes: 96 }];
  rows.forEach((x, i) => { x.k = r2(prog(t, w(88) + i * .45, w(88) + i * .45 + .3)); });
  r.setUI2({ mode: 'comments', rows, focus: t > w(90) ? 1 : 0 });
  r.phoneAt(v3(0, 1, 0), -.06, -.18 + lt * .04, 0, 9); r.phoneLight.intensity = 1;
  aim(v3(0, 1, 0), 1.35, 1100 + lt * 25, 720, -.1 + lt * .03, .05, 30);
});
window.SHOTS = S;

// ═════════ DOM: the hook headline (fixed cover layout, top third) + callouts ═════════
const T = (s, e, build, update) => ({ s, e, fi: .08, fo: .12, build, update });
const L = [];
// headline: line 1 white, line 2 cyan, framed box (cover_title.mjs positions); each word lights up as it is spoken
const HOOK = { l1: [0, 1, 2], l2: [3, 4, 5], box: [6, 7, 8, 9, 10, 11], cyanBox: new Set([8, 9, 10, 11]) };
const HW = ['كيف', 'الإيربودز', 'تخفّف', 'صوت', 'محرك', 'الطيارة', 'بشكل', 'كبير…', 'بدون', 'ما', 'تسد', 'أذنك!'];
function hookScene(s, e) {
  return { s, e, fi: .01, fo: .3, noPunch: true,
    build(root) { const c = document.createElement('canvas'); c.width = 1080; c.height = 700; c.style.cssText = 'position:absolute;left:0;top:0;width:1080px;height:700px'; root.appendChild(c); root._g = c.getContext('2d'); },
    update(root, lt, t) {
      const x = root._g, W = 1080, H = 1920; x.clearRect(0, 0, W, 700);
      const g0 = x.createLinearGradient(0, 0, 0, H * .36); g0.addColorStop(0, 'rgba(2,6,16,.8)'); g0.addColorStop(.75, 'rgba(2,6,16,.5)'); g0.addColorStop(1, 'rgba(2,6,16,0)'); x.fillStyle = g0; x.fillRect(0, 0, W, 700);
      x.direction = 'rtl'; x.textBaseline = 'alphabetic';
      const ts = t - .15;   // words follow the voice (t carries the 0.15 s picture lead)
      const fit = (txt, w, h, wt) => { let s = 260, m; for (; s > 10; s -= 2) { x.font = `${wt} ${s}px Alex`; m = x.measureText(txt); if (m.width <= w && m.actualBoundingBoxAscent + m.actualBoundingBoxDescent <= h) break; } return { s, m }; };
      const words = (ids, top, h, wt, colOf, glowOf, boxW) => {
        const txt = ids.map(i => HW[i]).join(' '); const { s, m } = fit(txt, boxW ?? W * .84, h, wt); x.font = `${wt} ${s}px Alex`;
        const y = top + (boxW ? h / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2 : m.actualBoundingBoxAscent);
        let cx = W / 2 + m.width / 2; const sp = x.measureText(' ').width; x.textAlign = 'right';
        for (const i of ids) {
          const ww = x.measureText(HW[i]).width, on = ts >= w(i) - .03 && ts < w(i + 1) - .03, k = on ? ease.out(prog(ts, w(i) - .03, w(i) + .12)) : 0;
          x.save(); x.translate(cx - ww / 2, y - s * .35); x.scale(1 + .08 * k, 1 + .08 * k); x.translate(-(cx - ww / 2), -(y - s * .35));
          x.shadowColor = on ? 'rgba(89,199,255,.95)' : glowOf(i); x.shadowBlur = on ? 40 : 30; x.fillStyle = on ? '#8FF3FF' : colOf(i, top, h); x.fillText(HW[i], cx, y);
          x.shadowColor = 'rgba(0,0,0,.65)'; x.shadowBlur = 10; x.shadowOffsetY = 5; x.fillText(HW[i], cx, y); x.restore();
          cx -= ww + sp;
        }
      };
      const cg = (top, h) => { const g = x.createLinearGradient(0, top, 0, top + h); g.addColorStop(0, '#8FF3FF'); g.addColorStop(.55, '#2FD2FF'); g.addColorStop(1, '#1A9BFF'); return g; };
      words(HOOK.l1, H * .088, H * .086, 900, () => '#FFFFFF', () => 'rgba(140,200,255,.35)');
      words(HOOK.l2, H * .183, H * .076, 900, (i, top, h) => cg(top, h), () => 'rgba(40,190,255,.75)');
      const bx = W * .08, by = H * .264, bw = W * .84, bh = H * .062, rr = 18;
      x.save(); x.beginPath(); x.roundRect(bx, by, bw, bh, rr); x.fillStyle = 'rgba(4,14,32,.82)'; x.fill(); x.shadowColor = '#22C8FF'; x.shadowBlur = 26; x.lineWidth = 3; x.strokeStyle = '#3FD0FF'; x.stroke(); x.restore();
      x.save(); x.beginPath(); x.roundRect(bx + 9, by + 9, bw - 18, bh - 18, rr - 6); x.lineWidth = 1.2; x.strokeStyle = 'rgba(120,220,255,.35)'; x.stroke(); x.restore();
      words(HOOK.box, by + bh * .16, bh * .68, 800, i => HOOK.cyanBox.has(i) ? '#3FD6FF' : '#FFFFFF', i => HOOK.cyanBox.has(i) ? 'rgba(40,190,255,.8)' : 'rgba(0,0,0,0)', bw * .9);
    } };
}
const HOOK_END = () => w(12) - .05;
L.push(hookScene(0, w(12) + .2));
const low = (html, top = 330) => big(html, `top:${top}px`);
const badge = (txt, kind) => `<span class="badge ${kind}">${txt}</span>`;
const qmark = `<div class="a" style="font-size:170px;font-weight:700;color:#59C7FF;text-shadow:0 0 40px rgba(89,199,255,.6)">؟</div>`;
L.push(T(w(15), w(16) - .05, r => { r.appendChild(low(qmark, 250)); }, (r, lt, t) => popIn(r.querySelector('.a'), t, w(15) + .2, .35)));
L.push(T(w(61), w(62) - .05, r => { r.appendChild(low(qmark, 250)); }, (r, lt, t) => popIn(r.querySelector('.a'), t, w(61) + .25, .35)));
L.push(T(w(41) - .05, w(49) - .05, r => {
  r.appendChild(low(`<div style="display:flex;justify-content:center;gap:22px"><span class="x1">${badge('تمنع الصوت ✕', 'no')}</span><span class="x2">${badge('تصنع صوت معاكس ✓', 'yes')}</span></div>`, 300));
}, (r, lt, t) => { popIn(r.querySelector('.x1'), t, w(42)); popIn(r.querySelector('.x2'), t, w(45)); }));
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
  noSubs: ts => ts < w(12) - .1,   // the hook headline carries the words
  bug: t => (t < w(12) ? 0 : 1) * (1 - prog(t, VOICE_END - .2, VOICE_END + .1)),   // the headline owns the top third during the hook
  subs: SUBS,
  scenes: L,
};
