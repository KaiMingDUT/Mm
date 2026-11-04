// KROZO — "كيف رسالتك توصل لآخر العالم في ثواني؟"  shots in story time (w(i) = start of word i of the voice-over).
const VOICE_END = 63.12;
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
const shot = (s, e, update, o = {}) => { const x = Object.assign({ s, e, update }, o); S.push(x); return x; };
const P2 = v => R().project(v);
const r2 = x => Math.round(x * 100) / 100;
// frame an object: world height hW fills hPx pixels, its centre sits at (xPx, yPx); az/el orbit the camera around it
function aim(c, hW, hPx, yPx = 720, az = 0, el = 0, fov = 30, xPx = 540) {
  const visH = hW * 1920 / hPx, d = visH / (2 * Math.tan(fov * Math.PI / 360));
  const look = v3(c.x - (xPx - 540) / 1920 * visH * Math.cos(az), c.y - (960 - yPx) / 1920 * visH * Math.cos(el), c.z + (xPx - 540) / 1920 * visH * Math.sin(az) + (960 - yPx) / 1920 * visH * Math.sin(el));
  R().lookCam(v3(look.x + Math.sin(az) * Math.cos(el) * d, look.y + Math.sin(el) * d, look.z + Math.cos(az) * Math.cos(el) * d), look, fov);
}
function ovTag(txt, v, dx, dy, k = 1, cls = '') {
  if (k <= 0) return ''; const [x, y] = P2(v), x2 = x + dx, y2 = y + dy;
  return `<svg class="ld" style="opacity:${k}"><line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}"/><circle cx="${x}" cy="${y}" r="5"/></svg><div class="tag ${cls}" style="opacity:${k};left:${x2}px;top:${y2}px">${txt}</div>`;
}
const ovNote = (txt = 'رسم توضيحي') => `<div class="note">${txt}</div>`;
window.POST3D = (sh, lt, t) => { const o = document.getElementById('ov'); if (o) o.innerHTML = sh && sh.ov ? sh.ov(lt, t, sh) : ''; };
const lerpV = (a, b, k) => a.clone().lerp(b, k);
const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const lat = s => `<span class="latin">${s}</span>`;
const xmark = (x, y, k) => k > 0 ? `<div class="xbig" style="left:${x}px;top:${y}px;opacity:${k};transform:scale(${.7 + .3 * ease.back(clamp(k))})">✕</div>` : '';

// ── stages ──
function space(r) { r.globe.visible = true; r.scene.fog = null; r.scene.background = new r.THREE.Color(0x02040a); r.world.visible = false; r.stars.visible = true; r.bloom.strength = .6; r.bloom.threshold = .5; }
const MID = [44, -16];                               // between Riyadh and New York
// camera on a sphere around the globe: direction from (lat, lon), distance d, looking at `look`
function globeCam(la, lo, d, look = v3(0, 0, 0), fov = 30) { R().lookCam(R().ll(la, lo, d), look, fov); }
const slerpLL = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
function satsAround(t, n = 4, rad = 1.55, k = 1) {
  const r = R();
  for (let i = 0; i < n; i++) {
    const s = r.SATS[i], an = i / n * Math.PI * 2 + t * .12, inc = .5 + i * .2;
    s.visible = k > .01; s.position.set(Math.cos(an) * rad, Math.sin(an) * Math.sin(inc) * rad * .6 + .4, Math.sin(an) * Math.cos(inc) * rad);
    s.scale.setScalar(.035 * Math.max(.001, k)); s.rotation.set(an, an * .5, .3); s.updateMatrixWorld(true);
  }
}

// ═════════ HOOK: tap «إرسال» → the message rockets out → Earth zoom-out → across the planet ═════════
const TAP = () => w(0) + .02, OUT = () => w(1) + .12, ARR = () => w(6) - .02;
const H1 = shot(0, w(7) - .05, (lt, t) => {
  const r = R();
  if (t < OUT()) {
    { const z = ease.inOut(prog(t, 1.5, TAP() + .2)); aim(v3(lerp(.2, .05, z), lerp(-.1, -.5, z), 0), lerp(1.85, 1.05, z), 1250, 760, .04, .06, 32); }
    // extreme close-up on the phone: the tap, the bubble pops, the bubble launches at the camera
    r.paintPhone({ typed: 1, press: r2(prog(t, TAP(), TAP() + .2)), sent: t > TAP() + .12 ? 1 : 0, gone: r2(prog(t, TAP() + .25, TAP() + .4)), glow: 1 });
    r.phoneAt(v3(0, 0, 0), -.08, .12, 0);
    const send = r.phonePt(...r.SEND_PX), bub = r.phonePt(390, 622);
    r.click(send, t, TAP(), .22);
    const fly = prog(t, TAP() + .25, OUT());
    if (fly > 0) {
      r.paintBubble(1); const p = lerpV(bub, v3(.05, .35, 2.2), ease.inOut(fly) ** 1.6);
      r.BUBBLE.face(p, .32 + .2 * fly, 1, .9); r.glow(p, .9 + 1.5 * fly, 0x59c7ff, .8);
      for (let i = 0; i < 40; i++) { const k = hash(i) * fly; r.digit(lerpV(bub, p, k).add(v3((hash(i + 3) - .5) * .25, (hash(i + 5) - .5) * .25, 0)), hash(i + 7) > .5 ? 1 : 0, .05, (1 - k) * 1.2); }
    }
    r.grade.zb.value = .9 * fly * fly;
  } else {
    // Earth zoom-out from Riyadh, then the message streaks to New York
    space(r);
    const k = sm(OUT(), w(4) + .1, t), dir = slerpLL(r.CITY.RUH, MID, ease.out(k)), d = Math.exp(lerp(Math.log(1.06), Math.log(7.4), ease.out(k)));
    const look = lerpV(r.ll(...r.CITY.RUH, 1), v3(0, -.15, 0), ease.out(k));
    globeCam(dir[0] + 6 * k, dir[1], d, look, 32);
    r.grade.zb.value = .9 * (1 - prog(t, OUT(), OUT() + .45)); r.grade.flash.value = .55 * (1 - prog(t, OUT(), OUT() + .2));
    const ap = ease.inOut(prog(t, OUT() + .15, ARR())); r.MSGARC.m.uniforms.p.value = ap;
    r.cityDot.RUH.material.opacity = 1; r.cityDot.NYC.material.opacity = prog(t, ARR() - .3, ARR());
    if (ap > 0 && ap < 1) { const hp = r.MSGARC.curve.getPointAt(ap); r.glow(hp, .16, 0xffffff, 1); r.glow(hp, .4, 0x59c7ff, .8); }
    if (t > ARR()) { const nyc = r.ll(...r.CITY.NYC, 1.01); for (let i = 0; i < 3; i++) { const q = prog(t, ARR() + i * .15, ARR() + i * .15 + .9); if (q > 0 && q < 1) r.ring(nyc, .05 + .3 * q, 0x59c7ff, (1 - q) * 1.2); } r.glow(nyc, .25, 0x59c7ff, 1 - prog(t, ARR(), ARR() + .8)); }
    r.click(r.ll(...r.CITY.RUH, 1.01), t, OUT() + .1, .12);
  }
}, {
  noPunch: true,
  ov: (lt, t) => {
    if (t < OUT() + .1) return '';
    const p = prog(t, OUT() + .15, ARR()), ms = (.1 * ease.inOut(p)).toFixed(2), k = sm(OUT() + .1, OUT() + .35, t);
    return `<div class="chip2" style="opacity:${k}"><span>${ms} s</span><small>${p >= 1 ? 'وصلت!' : 'زمن الوصول'}</small></div>` + (p > .98 ? ovTag('نيويورك', R().ll(...R().CITY.NYC, 1.01), 120, -150, sm(ARR(), ARR() + .3, t)) : '') + ovTag('الرياض', R().ll(...R().CITY.RUH, 1.01), 60, 150, sm(OUT() + .3, OUT() + .6, t));
  },
});

// H2: "الجواب مو اللي في بالك." — a satellite drifts in… ✕ … the camera tilts down to the ocean (cables glint)
const H2 = shot(w(7) - .05, w(12) - .05, (lt, t) => {
  const r = R(); space(r);
  const tilt = sm(w(9), w(11) + .5, t);
  globeCam(lerp(MID[0] + 6, 28, tilt), lerp(MID[1], -42, tilt), lerp(7.0, 2.3, tilt), v3(0, -.15 * (1 - tilt), 0), 32);
  r.MSGARC.m.uniforms.p.value = 1; r.MSGARC.m.uniforms.a.value = 1 - tilt;
  // a satellite close to the lens
  const sat = r.SATS[0], sk = sm(w(7) - .05, w(8) - .1, t) * (1 - sm(w(9), w(10), t));
  if (sk > 0) { const q = r.cam.quaternion, p = r.cam.position.clone().add(v3(0, 0, -1).applyQuaternion(q).multiplyScalar(3.4)).add(v3(.32 - .05 * lt, 0, 0).applyQuaternion(q)).add(v3(0, .62, 0).applyQuaternion(q)); sat.visible = true; sat.position.copy(p); sat.scale.setScalar(.05 * sk); window.SATXY = P2(p); sat.rotation.set(.4, lt * .3, .2); sat.updateMatrixWorld(true); r.glow(p, .25, 0x59c7ff, .4 * sk); }
  for (const c of r.CABLES) if (c.a[1] < -30 && c.b[1] < 20 && c.a[1] > -90) { c.m.uniforms.p.value = 1; c.m.uniforms.a.value = .9 * sm(w(10), w(11) + .4, t); }
  r.grade.zb.value = Math.max(r.grade.zb.value, .5 * prog(t, w(11) + .5, w(12) - .05));
}, {
  ov: (lt, t) => {
    const sk = sm(w(8) - .05, w(8) + .2, t) * (1 - sm(w(9), w(9) + .4, t));
    if (sk <= 0 || !window.SATXY) return '';
    const [x, y] = window.SATXY; return xmark(x, y, sk);
  },
});

// ═════════ STEP 1: send → 0/1 → packets ═════════
// S3: "أول ما تضغط إرسال، رسالتك،"
const S3 = shot(w(12) - .05, w(17) - .05, (lt, t) => {
  const r = R(), tp = w(15) - .05;
  r.paintPhone({ typed: r2(prog(t, w(12), w(14) + .1)), press: r2(prog(t, tp, tp + .2)), sent: t > tp + .1 ? 1 : 0, glow: r2(bump(t, w(16), .6)) });
  r.phoneAt(v3(0, 0, 0), -.12, .25 - lt * .04, 0);
  r.click(r.phonePt(...r.SEND_PX), t, tp, .25);
  aim(v3(0, -.05, 0), 1.85, 1100, 760, .15, .1, 30);
});
// S4: "تتحول إلى أرقام، صفر وواحد،" — the bubble lifts off the screen and dissolves into digits; 0 and 1 pop
const S4 = shot(w(17) - .05, w(22) - .05, (lt, t) => {
  const r = R(); aim(v3(0, .2, 0), 3.4, 1150, 700, .08, .08, 30);
  r.paintPhone({ typed: 1, sent: 1, gone: r2(prog(t, w(17), w(17) + .3)) });
  r.phoneAt(v3(0, -1.35, -.4), -.3, .15, 0);
  const lift = ease.out(prog(t, w(17) - .1, w(18) + .1)), dis = prog(t, w(19) - .2, w(19) + .5);
  const c = v3(0, .55, .4);
  if (dis < 1) { r.paintBubble(0); r.BUBBLE.face(lerpV(r.phonePt(390, 622), c, lift), .45 + .3 * lift, 1 - dis, .6); }
  for (let i = 0; i < 260 && dis > 0; i++) {
    const h1 = hash(i), h2 = hash(i + 50), k = clamp(dis * 1.4 - h1 * .4);
    const p0 = c.clone().add(v3((h1 - .5) * 1.1, (h2 - .5) * .4, 0)), p1 = v3((h1 - .5) * 2.6, .55 + (h2 - .5) * 2.0 + Math.sin(t * 1.5 + i) * .05, (hash(i + 9) - .5) * 1.5);
    r.digit(lerpV(p0, p1, ease.out(k)), hash(i + 3) > .5 ? 1 : 0, .09 + .05 * hash(i + 4), .5 + .5 * k);
  }
  for (const [d, wi, x] of [[0, 20, .45], [1, 21, -.45]]) { const k = ease.back(prog(t, w(wi), w(wi) + .3)); if (k > 0) { r.digit(v3(x, .7, .9), d, .55 * k, 1.2); r.glow(v3(x, .7, .85), 1.0 * k, 0x59c7ff, .35); } }
});
// S5: "وتتقطع إلى قطع صغيرة." — the stream is sliced into numbered packets
const PKX = i => v3((i - 2.5) * .62, .55 + (i % 2 ? .18 : -.18), 0);
const S5 = shot(w(22) - .05, w(26) - .05, (lt, t) => {
  const r = R(), cut = prog(t, w(22), w(23) + .2), form = ease.back(prog(t, w(24) - .2, w(24) + .3));
  for (let i = 0; i < 300 && form < 1; i++) {
    const seg = Math.floor(hash(i) * 6), p = PKX(seg).add(v3((hash(i + 1) - .5) * .55 * (1 - form), (hash(i + 2) - .5) * .9 * (1 - form), (hash(i + 3) - .5) * .5));
    p.x += (seg - 2.5) * .25 * cut;
    r.digit(p, hash(i + 4) > .5 ? 1 : 0, .08, (1 - form) * 1.1);
  }
  for (let k = 0; k < 5; k++) { const x = (k - 2) * .62 + .0, a = bump(t, w(22) + k * .07, .35); if (a > 0) r.beam(v3(x - .3, -.4, .1), v3(x - .3, 1.5, .1), .012, 0xf4f7fb, a); }
  const sh = 1 - .3 * sm(w(25), w(25) + .4, t);
  for (let i = 0; i < 6; i++) { const s = .42 * form * sh; if (s > .001) { r.packet(i, PKX(i).add(v3(0, .04 * Math.sin(t * 2 + i), 0)), s, clamp(form * 1.5), .3 * Math.sin(t * .8 + i)); } }
  aim(v3(0, .55, 0), 3.7, 1000, 700, .06, .06, 30);
}, { ov: (lt, t) => ovTag('حزمة بيانات', PKX(5).add(v3(.15, .2, 0)), -60, -260, sm(w(24) + .2, w(24) + .5, t), 'hot') });

// ═════════ STEP 2: waves → tower → network ═════════
// S6: "وهالقطع تطلع من جوالك كموجات وتروح لأقرب برج."
const PHP = () => v3(-1.0, 1.7, 2.6), TWP = () => v3(2.2, 0, -7);
const S6 = shot(w(26) - .05, w(34) - .05, (lt, t) => {
  const r = R(); aim(v3(.4, 2.8, -2.4), 7.6, 1180, 680, -.18 + lt * .02, .1, 42); r.tower.visible = true; r.tower.position.copy(TWP()); r.tower.rotation.set(0, .4, 0);
  r.paintPhone({ typed: 1, sent: 1, ticks: t > w(33) ? 1 : 0 });
  r.phoneAt(PHP(), -.25, .35, .05, 1.25);
  const top = TWP().add(r.TW.top), ph = PHP().add(v3(0, .35, .1));
  // packets slide into the phone
  const into = prog(t, w(26) - .1, w(27));
  for (let i = 0; i < 6; i++) {
    const go = prog(t, w(29) + i * .22, w(32) + i * .22 + .3);
    let p, s = .14;
    if (go <= 0) { p = lerpV(v3((i - 2.5) * .35 + .3, 2.4, 1.2), ph, ease.inOut(clamp(into * 1.3 - i * .05))); s = .14 * (1 - .6 * into); }
    else { p = lerpV(ph, top, ease.inOut(go)); p.y += Math.sin(Math.PI * go) * 1.0; s = .09 + .05 * Math.sin(Math.PI * go); }
    if (go < 1) { r.packet(i, p, s, 1, t + i); r.glow(p, .4, 0x59c7ff, .4); }
  }
  // radio waves: arcs that open from the phone toward the tower
  const [px, py] = P2(ph), [tx, ty] = P2(top), ang = Math.atan2(-(ty - py), tx - px);
  const q = r.cam.quaternion.clone().multiply(new r.THREE.Quaternion().setFromAxisAngle(v3(0, 0, 1), ang));
  const wv = sm(w(27) - .1, w(27) + .3, t) * (1 + .6 * bump(t, w(30), .8));
  for (let i = 0; i < 6; i++) { const f = (t * .9 + i / 6) % 1, pos = lerpV(ph, top, f * .9); r.ring(ph, .3 + f * ph.distanceTo(top) * .95, 0x59c7ff, (1 - f) * .9 * wv, { q, arc: .16, w: .05 }); }
  const lit = bump(t, w(33) - .05, .9);
  r.glow(top.clone().add(v3(0, .7, 0)), 1.2 + 2 * lit, 0x59c7ff, .4 + .6 * lit);
  if (lit > 0) for (let i = 0; i < 2; i++) { const f = prog(t, w(33) + i * .15, w(33) + i * .15 + .8); if (f > 0 && f < 1) r.ring(top, .3 + f * 1.4, 0x59c7ff, (1 - f)); }
}, { ov: (lt, t) => ovTag('برج الاتصالات', TWP().add(R().TW.top).add(v3(-.3, .4, 0)), -80, -200, sm(w(33), w(33) + .3, t), 'hot') + ovTag('موجات راديو', lerpV(PHP(), TWP().add(R().TW.top), .35), -120, 230, sm(w(30) + .1, w(30) + .4, t) * (1 - prog(t, w(33) - .2, w(33)))) });
// S7: "وأول ما توصل لشبكة الاتصالات، تبدأ رحلة أغرب…" — down the mast into the operator network; pulses spread
const S7 = shot(w(34) - .05, w(42) - .05, (lt, t) => {
  const r = R(); r.tower.visible = true; r.tower.position.set(0, 0, 0); r.tower.rotation.set(0, .4, 0); r.netw.visible = true;
  const N = r.NW, t0 = w(36);
  const down = ease.inOut(prog(t, w(34) - .05, w(36) + .3));
  if (down < 1) { const p = v3(0, lerp(6.7, .3, down), .3); r.glow(p, .8, 0x59c7ff, .9); r.packet(0, p, .16, 1, t); }
  // breadth-first pulses from node 0
  const depth = [0, ...Array(N.nodes.length - 1).fill(99)]; for (let it = 0; it < 8; it++) for (const [a, b] of N.edges) { depth[b] = Math.min(depth[b], depth[a] + 1); depth[a] = Math.min(depth[a], depth[b] + 1); }
  for (const [a, b] of N.edges) {
    const [s, e] = depth[a] <= depth[b] ? [a, b] : [b, a], st = t0 + depth[s] * .35, k = prog(t, st, st + .45);
    if (k > 0 && k < 1) { const p = lerpV(N.nodes[s], N.nodes[e], k); p.y = .15; r.glow(p, .6, 0x59c7ff, 1); }
    if (k >= 1) r.beam(N.nodes[s].clone().setY(.06), N.nodes[e].clone().setY(.06), .03, 0x59c7ff, .5, { t: t * 3 });
  }
  N.nodes.forEach((n, i) => { if (t > t0 + depth[i] * .35 + .4) r.glow(n.clone().setY(.6), .7, 0x59c7ff, .5); });
  const dive = sm(w(39), w(42) - .05, t);
  aim(lerpV(v3(0, 3.0, -1.0), v3(-3.5, .2, -4.5), dive), lerp(lerp(8.0, 12, sm(w(34), w(38), t)), 1.2, dive), 1150, 720, -.35 + .5 * dive, lerp(.55, .25, dive), 34);
  r.grade.zb.value = Math.max(r.grade.zb.value, .7 * prog(t, w(41), w(42) - .05));
}, { ov: (lt, t) => ovTag('شبكة شركة الاتصالات', v3(-3.5, .4, -4.5), 0, -330, sm(w(37), w(37) + .3, t) * (1 - prog(t, w(39) + .3, w(39) + .6)), 'hot') });

// ═════════ STEP 3: light inside glass ═════════
// S8: "تتحول البيانات إلى نبضات ضوئية، تمشي داخل ألياف زجاجية رفيعة جدًا…" — zig-zag light pulses inside the core
const BITS = '1011001110100101101100111010';
const zig = s => { const L = 1.25, k = Math.floor(s / L), f = s / L - k; return v3(-14 + s, (k % 2 ? 1 : -1) * (.36 - .72 * f), 0); };   // bounce between the core walls
const S8 = shot(w(42) - .05, w(53) - .05, (lt, t) => {
  const r = R(); r.fib.visible = true; r.world.visible = false; r.scene.fog = null; r.scene.background = new r.THREE.Color(0x03060d);
  const on = sm(w(44), w(45) + .2, t), sp = 4.2;
  for (let s = 0; s < 28; s += 1.25) r.beam(zig(s + .001), zig(s + 1.249), .01, 0x168bff, .25 * on);
  for (let i = 0; i < BITS.length; i++) {
    if (BITS[i] !== '1') continue;
    const s = ((t * sp - i * .9) % 25.2 + 25.2) % 25.2; const p = zig(s);
    r.glow(p, .55, 0xffffff, on); r.glow(p, 1.2, 0x59c7ff, .6 * on);
  }
  const k = sm(w(42) - .05, w(53), t);
  aim(v3(lerp(-1.5, 1.5, k), 0, 0), lerp(2.4, 2.2, k), 700, 700, lerp(.5, .2, k), lerp(.15, .25, k), 32);
}, {
  ov: (lt, t) => ovTag('نبضات ضوء', v3(0, .3, 0), -150, -230, sm(w(45), w(45) + .3, t) * (1 - prog(t, w(48), w(48) + .3)), 'hot')
    + ovTag('ألياف زجاجية', v3(1.2, 1.0, 0), 60, -170, sm(w(49) + .1, w(49) + .4, t))
    + ovTag(`≈ ${lat('0.125 mm')} — قريب من سماكة الشعرة`, v3(-.5, -1.0, 0), 540 - P2(v3(-.5, -1.0, 0))[0], 200, sm(w(51), w(51) + .3, t)) + ovNote('رسم توضيحي'),
});

// ═════════ THE TWIST: satellites? no — under the sea ═════════
// S9: "طيب، تتوقع أن هالبيانات تنتقل عبر الأقمار الصناعية؟"
const S9 = shot(w(53) - .05, w(61) - .05, (lt, t) => {
  const r = R(); space(r); r.globe.visible = true;
  globeCam(MID[0] + 4, MID[1] + lt * 1.5, 8.2, v3(0, -.45, 0), 32);
  satsAround(t, 4, 1.55, 2.2 * sm(w(54) - .2, w(55), t));
  r.cityDot.RUH.material.opacity = 1; r.cityDot.NYC.material.opacity = 1;
  const s = r.SATS[1].position, a = r.ll(...r.CITY.RUH, 1.01), b = r.ll(...r.CITY.NYC, 1.01);
  const k1 = prog(t, w(57) - .1, w(58) + .2), k2 = prog(t, w(58) + .1, w(60) + .2);
  if (k1 > 0) r.beam(a, lerpV(a, s, k1), .008, 0x59c7ff, .8, { t: t * 3 });
  if (k2 > 0) r.beam(s, lerpV(s, b, k2), .008, 0x59c7ff, .8, { t: t * 3 });
  r.glow(s, .3, 0x59c7ff, .6 * clamp(k1 * 3));
});
// S10: "لا! الحقيقة أغرب من كذا." — the satellite links snap off; the camera dives into the Atlantic
const S10 = shot(w(61) - .05, w(66) - .05, (lt, t) => {
  const r = R(); space(r);
  const dive = ease.inOut(prog(t, w(62), w(66) - .05)) ;
  globeCam(lerp(MID[0] + 4, 30, dive), lerp(MID[1] + 12, -40, dive), Math.exp(lerp(Math.log(8.2), Math.log(1.03), dive ** 1.4)), lerpV(v3(0, -.45, 0), r.ll(30, -40, 1), dive), 32);
  const off = sm(w(61) - .1, w(61) + .3, t);
  satsAround(t, 4, 1.55, 2.2 * (1 - .999 * sm(w(62), w(63), t)));
  r.SATS.forEach(s => s.traverse(o => { if (o.material && o.material.emissiveIntensity !== undefined) o.material.emissiveIntensity = .3 * (1 - off); }));
  r.cityDot.RUH.material.opacity = 1; r.cityDot.NYC.material.opacity = 1;
  r.grade.zb.value = Math.max(r.grade.zb.value, .7 * bump(t, w(61) - .05, .3));
  r.grade.zb.value = Math.max(r.grade.zb.value, .8 * prog(t, w(65), w(66) - .05));
}, {
  ov: (lt, t) => { const r = R(), k = sm(w(61) - .1, w(61) + .2, t) * (1 - prog(t, w(62) + .3, w(62) + .6)); if (k <= 0) return ''; const [x, y] = P2(r.SATS[1].position); return xmark(clamp(x, 170, 910), clamp(y, 300, 1150), k); },
});
// S11: "جزء كبير من الإنترنت ينتقل تحت البحر!" — down through the water to a glowing cable on the sea floor
const S11 = shot(w(66) - .05, w(75) - .05, (lt, t) => {
  const r = R(); r.sea.visible = true; r.underwater(true);
  const k = ease.out(prog(t, w(66) - .05, w(72)));
  r.SEA.pulseM.uniforms.a.value = sm(w(70), w(72), t);
  r.lookCam(v3(lerp(-2, 1.5, k), lerp(13, 2.2, k), lerp(9, 6.5, k)), v3(lerp(0, 0, k), lerp(9, .2, k), lerp(-2, -1, k)), 40);
  r.grade.flash.value = .3 * (1 - prog(t, w(66) - .05, w(66) + .3));
}, { noPunch: true, ov: (lt, t) => ovTag('كيبل إنترنت بحري', v3(-.5, .3, -1.1), 60, -330, sm(w(72) + .1, w(72) + .4, t), 'hot') + ovNote('رسم توضيحي') });
// S12a: "عن طريق كوابل ضخمة ممتدة في قاع المحيطات،" — the cable cut open: fibres inside steel and plastic
const S12a = shot(w(75) - .05, w(81) - .05, (lt, t) => {
  const r = R(); r.underwater(true); r.lights.visible = true; r.xsec.visible = true; r.xsec.position.set(0, 0, 0); r.xsec.rotation.set(0, 0, 0);
  r.XS.fm.color.setHex(0x59c7ff);
  r.glow(r.XS.tip.clone().add(v3(.05, 0, 0)), .9 + .4 * bump(t, w(76), .8), 0x59c7ff, .8);
  const k = sm(w(75) - .05, w(81), t);
  aim(v3(.4, 0, 0), 4.4, 900, 680, lerp(1.0, .75, k), lerp(.35, .22, k), 32);
}, {
  ov: (lt, t) => ovTag('ألياف ضوئية', v3(5.3, .1, 0), -60, -260, sm(w(76), w(76) + .3, t), 'hot') + ovTag('أسلاك فولاذية للحماية', v3(.8, .8, 0), 40, -230, sm(w(77), w(77) + .3, t))
    + ovTag('ممتد آلاف الكيلومترات', v3(-4, -.9, 0), 160, 220, sm(w(79), w(79) + .3, t)) + ovNote('مقطع توضيحي · الكيبل في الأعماق قطره تقريبًا 2 سم'),
});
// S12b: "وتربط قارات العالم ببعض." — the globe: cable routes draw themselves between continents
const S12b = shot(w(81) - .05, w(85) - .05, (lt, t) => {
  const r = R(); space(r);
  globeCam(18, 20 - lt * 6, 7.8, v3(0, -.5, 0), 32);
  r.CABLES.forEach((c, i) => { c.m.uniforms.p.value = ease.out(prog(t, w(81) - .1 + hash(i) * .8, w(81) + .9 + hash(i) * .8)); });
}, {
  ov: (lt, t) => `<div class="chip2" style="opacity:${sm(w(82), w(82) + .3, t)}"><span>570+</span><small>كيبل بحري في الخدمة · طولها ≈ 1.4 مليون كم</small></div>` + ovNote('خريطة تقريبية للتوضيح'),
});

// ═════════ LIGHT SPEED ═════════
// S13: "والأغرب إن البيانات داخل هالكوابل تنتقل على شكل ضوء، بسرعة تقارب 200 ألف كيلومتر في الثانية!"
const S13 = shot(w(85) - .05, w(101) - .05, (lt, t) => {
  const r = R();
  if (t < w(89) + .2) {
    r.underwater(true); r.lights.visible = true; r.xsec.visible = true; r.xsec.position.set(0, 0, 0);
    const k = ease.inOut(prog(t, w(85) - .05, w(89) + .2));
    r.glow(r.XS.tip.clone().add(v3(.05, 0, 0)), .9 + 2 * k, 0x59c7ff, .9);
    r.lookCam(lerpV(v3(9.5, 1.6, 5.0), v3(5.55, 0, 0), k ** 1.5), lerpV(v3(3.0, 0, 0), v3(4.0, 0, 0), k), 32);
    r.grade.zb.value = .9 * k * k; r.grade.flash.value = .5 * prog(t, w(89), w(89) + .2);
  } else {
    r.world.visible = false; r.scene.fog = null; r.scene.background = new r.THREE.Color(0x01030a); r.tunnel.visible = true;
    const v = Math.exp(lerp(Math.log(8), Math.log(140), sm(w(90), w(98), t)));
    r.TU.u.sp.value = v; r.TU.u.t.value = t;
    r.lookCam(v3(.0, 0, 0), v3(.06 * Math.sin(t * 2), .04 * Math.cos(t * 1.7), -10), lerp(60, 75, sm(w(94), w(98), t)), .1 * Math.sin(t * .8));
    r.grade.zb.value = .2 * sm(w(94), w(98), t) + .5 * (1 - prog(t, w(89) + .2, w(89) + .6));
    r.grade.flash.value = .35 * bump(t, w(93), .35);
    r.bloom.strength = .5; r.bloom.threshold = .8;
  }
}, {
  noPunch: true,
  ov: (lt, t) => {
    const k = sm(w(94), w(94) + .3, t); if (k <= 0) return '';
    const n = Math.round(200000 * ease.out(prog(t, w(94) + .1, w(98) + .2)) / 1000) * 1000;
    return `<div class="speed" style="opacity:${k}">${n.toLocaleString('en-US')}<small>كيلومتر في الثانية</small></div>`;
  },
});

// ═════════ PAYOFF ═════════
// S14: "يعني رسالتك ممكن تعبر محيطات وقارات في ثوانٍ…" — across the globe again, now along the sea
const S14 = shot(w(101) - .05, w(109) - .05, (lt, t) => {
  const r = R(); space(r);
  globeCam(MID[0] + 2, MID[1] - 8 + lt * 2, 7.6, v3(0, -.3, 0), 32);
  r.CABLES.forEach(c => { c.m.uniforms.p.value = 1; c.m.uniforms.a.value = .55; });
  const ap = ease.inOut(prog(t, w(104) - .1, w(108) + .2)); r.MSGARC.m.uniforms.p.value = ap;
  r.cityDot.RUH.material.opacity = 1; r.cityDot.NYC.material.opacity = 1;
  if (ap > 0 && ap < 1) { const hp = r.MSGARC.curve.getPointAt(ap); r.glow(hp, .16, 0xffffff, 1); r.glow(hp, .45, 0x59c7ff, .8); }
  if (ap >= 1) { const nyc = r.ll(...r.CITY.NYC, 1.01), q = prog(t, w(108) + .2, w(108) + 1); if (q < 1) r.ring(nyc, .05 + .3 * q, 0x59c7ff, (1 - q) * 1.2); }
}, {
  ov: (lt, t) => { const p = prog(t, w(104) - .1, w(108) + .2), k = sm(w(104) - .2, w(104) + .1, t); return `<div class="chip2" style="opacity:${k}"><span>≈ ${(.1 * ease.inOut(p)).toFixed(2)} s</span><small>من الرياض لنيويورك</small></div>`; },
});
// S15: "وتوصل لصاحبك، وهو للحين ما رد عليك!" — ✓ → ✓✓ → read … typing … nothing
const S15 = shot(w(109) - .05, w(116) - .05, (lt, t) => {
  const r = R();
  const ticks = t < w(109) + .3 ? 1 : t < w(110) + .4 ? 2 : 3, ty = sm(w(111), w(111) + .3, t) * (1 - sm(w(113) - .1, w(113) + .1, t));
  r.paintPhone({ typed: 1, sent: 1, ticks, typing: r2(ty), tt: r2(t) });
  r.phoneAt(v3(0, 0, 0), -.06, .1 * Math.sin(lt * .3), 0);
  const push = sm(w(109), w(116), t);
  aim(v3(.05, .32, 0), lerp(1.7, 1.2, push), 1100, 760, .08, .05, 30);
  r.grade.zb.value = .5 * bump(t, w(115), .3);
});
// S16: "منشنه في التعليقات."
const S16 = shot(w(116) - .05, VOICE_END + 1.2, (lt, t) => {   // last shot holds to the end: no logo outro (client rule)
  const r = R(), ts = w(118) + .25;
  r.paintComments({ focus: 1, type: r2(prog(t, w(116), w(117) + .2)), send: r2(prog(t, ts, ts + .25)), post: r2(prog(t, ts + .15, ts + .8)) });
  const inK = sm(0, .4, lt);
  r.MAIN.at(v3(0, 0, -2 * (1 - inK)), 0, .1 - lt * .02, 0, 1, inK, .4 + .5 * bump(t, ts + .2, .6));
  r.click(r.MAIN.pt(100, 1355, .06), t, ts, .5);
  aim(v3(0, 0, 0), 3.0, 1040 + lt * 10, 735, -.06, .04);
});
window.SHOTS = S;

// ═════════ DOM callouts ═════════
const T = (s, e, build, update) => ({ s, e, fi: .08, fo: .12, build, update });
const L = [];
const low = (html, top = 330) => big(html, `top:${top}px`);
const qmark = `<div class="a" style="font-size:170px;font-weight:700;color:#59C7FF;text-shadow:0 0 40px rgba(89,199,255,.6)">؟</div>`;
L.push(T(w(6) + .45, w(7) - .05, r => { r.appendChild(low(qmark, 470)); }, (r, lt, t) => popIn(r.querySelector('.a'), t, w(6) + .5, .3)));
L.push(T(w(60) + .35, w(61) - .1, r => { r.appendChild(low(qmark, 470)); }, (r, lt, t) => popIn(r.querySelector('.a'), t, w(60) + .4, .3)));

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
  bug: () => 0,   // no top wordmark (client rule, Nov 4)
  subs: SUBS,
  scenes: L,
};
