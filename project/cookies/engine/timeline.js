// KROZO — "إيش اللي تسمح له لما تضغط «سماح للكوكيز»؟"  shots in story time (w(i) = start of word i of the voice-over).
const VOICE_END = 45.55;
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
const KICKW = [7, 17, 23, 35, 39, 47, 50, 57, 59, 69, 73, 82, 87, 99];
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
  const look = v3(c.x - (xPx - 540) / 1920 * visH * Math.cos(az), c.y - (960 - yPx) / 1920 * visH, c.z + (xPx - 540) / 1920 * visH * Math.sin(az));
  R().lookCam(v3(look.x + Math.sin(az) * Math.cos(el) * d, look.y + Math.sin(el) * d, look.z + Math.cos(az) * Math.cos(el) * d), look, fov);
}
function ovTag(txt, v, dx, dy, k = 1, cls = '') {
  if (k <= 0) return ''; const [x, y] = P2(v), x2 = x + dx, y2 = y + dy;
  return `<svg class="ld" style="opacity:${k}"><line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}"/><circle cx="${x}" cy="${y}" r="5"/></svg><div class="tag ${cls}" style="opacity:${k};left:${x2}px;top:${y2}px">${txt}</div>`;
}
const ovNote = (txt = 'رسم توضيحي') => `<div class="note">${txt}</div>`;
window.POST3D = (sh, lt, t) => { const o = document.getElementById('ov'); if (o) o.innerHTML = sh && sh.ov ? sh.ov(lt, t, sh) : ''; };
const lerpV = (a, b, k) => a.clone().lerp(b, k);
// pixel centres of the banner buttons (900×470 banner canvas) and the shop / comments buttons (900×1500 page canvas)
const B_OK = [652, 372], B_NO = [247, 372], SHOP_BTN = [450, 1335], SEND_BTN = [100, 1355];

// ═════════ HOOK: every site, the same banner ═════════
// K1: a wall of sites; each one pops a cookie banner; you click «سماح» on the shop in the middle; the rest follow
const WALLP = i => { const c = i % 3 - 1, r = Math.floor(i / 3) - 1; return { p: v3(c * 1.06, -r * 1.64, -Math.abs(c) * .35 - Math.abs(r) * .25 + ((i * .37) % 1) * .15), c, r }; };
const K1 = shot(0, w(9) - .05, (lt, t) => {
  const r = R(), tc = w(7);
  for (let i = 0; i < 9; i++) {
    const { p, c, r: rw } = WALLP(i), d = Math.hypot(c, rw);
    const k = eo1(prog(t, w(1) - .1 + (i === 4 ? 0 : .25 + d * .22 + (i % 2) * .12), w(1) + .35 + (i === 4 ? 0 : .25 + d * .22 + (i % 2) * .12)));
    const pa = i === 4 ? prog(t, tc, tc + .25) : 0;
    const gone = i === 4 ? prog(t, tc + .18, tc + .5) : prog(t, w(8) + d * .1, w(8) + d * .1 + .35);
    r.paintWall(i, { k: r2(k), pa: r2(pa), gone: r2(gone), dim: r2(k * (1 - gone)) });
    const pos = p.clone(); pos.y += .04 * Math.sin(t * 1.3 + i * 1.7);
    r.WALL[i].at(pos, rw * .06, -c * .14, 0, 1, clamp(prog(t, .0 + d * .12, .35 + d * .12) + (t < .05 ? 1 : 0)), i === 4 ? .5 + .4 * bump(t, tc, .5) : .25);
  }
  const P = r.WALL[4], ok = P.pt(320, 689, .05);
  const ck = sm(w(5) - .3, tc - .05, t); r.cursorAt(lerpV(v3(1.3, -1.6, .6), ok, ck), .12, prog(t, tc, tc + .22));
  r.click(ok, t, tc, .35);
  const z = sm(0, w(6), t), hW = Math.exp(Math.log(5.6) + (Math.log(1.75) - Math.log(5.6)) * z);
  aim(v3(0, 0, 0), hW, 1150 - 150 * z, 700, .12 - .1 * z, .05);
}, { noPunch: true });
function eo1(k) { return ease.out(k); }

// K2: "لكن هل تعرف إيش اللي تسمح له يسويه فعلًا؟" — the banner alone; a dark cookie waits behind it (2 angles)
function k2(lt, t, close) {
  const r = R();
  r.paintBanner({ k: 1, ga: r2(.9 * bump(t, w(14) - .1, .7) + .25 * Math.max(0, Math.sin(t * 3))) });
  r.BANNER.at(v3(0, 0, 0), .05, .16 - lt * .04 - .25 * close, 0, 1, 1, .4);
  r.cookie.visible = true; r.cookie.position.set(.75 - .5 * close, .95 - .3 * close, -3.0 + .6 * close); r.cookie.scale.setScalar(.62 + .25 * close); r.cookie.rotation.set(.35, -.5 + t * .25, .15);
  const q = t > w(17) ? Math.exp(-(t - w(17)) * 2.5) : 0; r.scene.environmentIntensity = .25;
  r.COOKIE.body.emissiveIntensity = .15; r.COOKIE.chipM.emissiveIntensity = .12 + 1.4 * q + .15 * bump(t, w(14), .8); r.COOKIE.kl.intensity = 2 * q;
  if (t > w(17)) { r.grade.ca.value = .0015 + .02 * Math.exp(-(t - w(17)) * 6); r.grade.flash.value = .12 * Math.exp(-(t - w(17)) * 8); }
  if (!close) aim(v3(0, .1, 0), 1.7, 860 + lt * 60, 700, .2 - lt * .05, .06);
  else aim(r.BANNER.pt(...B_OK, 0), .9, 700 + lt * 90, 760, -.35 + lt * .06, .1, 30, 600);
}
const K2a = shot(w(9) - .05, w(12) - .05, (lt, t) => k2(lt, t, 0));
const K2b = shot(w(12) - .05, w(18) - .05, (lt, t) => k2(lt, t, 1), { whip: -1 });

// ═════════ THE STORY: the shoe that stays in the cart ═════════
// K3: shopping; add the shoe to the cart; leave the site
function k3(lt, t, hero) {
  const r = R(), tp = w(22) + .05;
  r.paintShop({ add: r2(prog(t, tp, tp + .25)), added: t > tp + .2 ? 1 : 0, fly: r2(prog(t, tp + .25, w(24) + .15)), n: t > w(24) + .15 ? 1 : 0, nk: r2(prog(t, w(24) + .15, w(24) + .45)) });
  const lv = sm(w(25), w(27) + .35, t);
  r.MAIN.at(v3(3.4 * lv, .4 * lv, -2.5 * lv), -.05 * lv, .14 - lt * .02 - 1.0 * lv, -.15 * lv, 1 - .45 * lv, 1 - lv, .35);
  const btn = r.MAIN.pt(...SHOP_BTN, .06);
  if (t < w(25)) { const ck = sm(w(20), tp - .05, t); r.cursorAt(lerpV(v3(1.4, -2.2, .8), btn, ck), .16, prog(t, tp, tp + .22)); }
  r.click(btn, t, tp, .5);
  if (t > tp + .25 && t < w(24) + .3) r.glow(r.MAIN.pt(130, 260, .05), .5 * bump(t, w(24) + .05, .4), 0x59c7ff, .9);
  if (hero) aim(r.MAIN.pt(450, 560, 0), 1.25, 620 + lt * 60, 560, .55 - lt * .12, -.12 + lt * .03);
  else aim(v3(0, 0, 0), 3.0, 1060 - lt * 12, 735, .1, .04);
}
const K3a = shot(w(18) - .05, w(21) - .05, (lt, t) => k3(lt, t, 1), { whip: 1 });
const K3b = shot(w(21) - .05, w(28) - .05, (lt, t) => k3(lt, t, 0));
// K4: tomorrow (25 → 26) — you come back: the shoe is still in the cart
const K4 = shot(w(28) - .05, w(36) - .05, (lt, t) => {
  const r = R(), f = ease.inOut(prog(t, w(29), w(30) + .2)), back = sm(w(31) - .25, w(31) + .25, t);
  r.paintCal(f < .5 ? 25 : 26, f < .5 ? 'اليوم' : 'بكرة');
  r.CAL.at(lerpV(v3(0, .35, .3), v3(-1.0, 1.4, -.4), back), f < .5 ? -Math.PI * f : Math.PI * (1 - f), .1, 0, 1.55 - 1.05 * back, 1 - .55 * back, .4);
  const inK = sm(w(31) - .2, w(31) + .35, t);
  if (inK > 0) {
    r.paintShop({ n: 1, nk: 1, drawer: r2(prog(t, w(32), w(33) + .25)), ok: r2(prog(t, w(35) - .05, w(35) + .4)) });
    r.MAIN.at(v3(0, 0, -3 * (1 - inK)), 0, -.25 * (1 - inK) + .08, 0, 1, inK, .35 + .5 * bump(t, w(35), .6));
  }
  if (t > w(35)) r.glow(r.MAIN.pt(450, 1180, .05), 1.2 * bump(t, w(35) - .05, .6), 0x59c7ff, .6);
  const fl = ease.inOut(prog(t, w(29) - .1, w(30) + .3)); r.grade.zb.value = Math.max(r.grade.zb.value, .5 * Math.sin(Math.PI * fl));
  aim(v3(0, 0, 0), 3.0, 1060, 735, -.08 + lt * .02 + .5 * Math.sin(Math.PI * fl), .05 + .12 * Math.sin(Math.PI * fl));
});

// ═════════ THE REVEAL: it was the cookie ═════════
// K5: "وهنا تجي وظيفة الكوكيز اللي سمحت فيها." — the page tilts back like a table; a cookie rises out of it
const K5 = shot(w(36) - .05, w(43) - .05, (lt, t) => {
  const r = R(), tilt = sm(0, 1.1, lt);
  r.paintShopGhost(r2(clamp(lt / 1.2)));
  r.MAIN.at(v3(0, -.9 * tilt, -.3 * tilt), -1.15 * tilt, 0, 0, 1, 1, .3 + .4 * tilt);
  const up = ease.out(prog(t, w(38) - .25, w(39) + .25));
  r.cookie.visible = up > 0; r.cookie.position.set(0, -.8 + 1.85 * up, .1); r.cookie.scale.setScalar(.25 + .55 * up);
  r.cookie.rotation.set(.25, t * .9, .12);
  r.COOKIE.kl.intensity = 3 * up; r.COOKIE.chipM.emissiveIntensity = .4 + 1.6 * up;
  for (let i = 0; i < 3; i++) r.ring(v3(0, -.75, .1), (.4 + ((t * .8 + i / 3) % 1) * 1.4) * up, 0x59c7ff, (1 - ((t * .8 + i / 3) % 1)) * .6 * up);
  r.glow(v3(0, -.8 + 1.85 * up, .1), 2.4 * up, 0x168bff, .45 * up);
  if (t > w(39)) r.grade.flash.value = .3 * (1 - prog(t, w(39), w(39) + .3));
  aim(v3(0, .45, 0), 3.4, 920 + lt * 50, 760, .45 - lt * .22, .32 - lt * .03);
}, { ov: (lt, t) => ovTag('<span class="latin">Cookie</span>', v3(-.5, 1.2, .1), -170, -90, sm(w(39) + .1, w(39) + .4, t), 'hot') });

// K6: "الـCookies عبارة عن ملفات نصية صغيرة، يحفظها المتصفح،" — the cookie unfolds into a small text file; the browser keeps it in its jar
const K6 = shot(w(43) - .05, w(51) - .05, (lt, t) => {   // whip set below
  const r = R(), op = ease.out(prog(t, w(46) - .15, w(46) + .35)), jin = sm(w(49) - .2, w(49) + .45, t), drop = sm(w(49) + .1, w(50) + .35, t);
  // cookie → file
  if (op < 1) { r.cookie.visible = true; r.cookie.position.set(0, .1 + .5 * op, .3 * op); r.cookie.scale.setScalar(.85 * (1 - .8 * op)); r.cookie.rotation.set(.15, .35 * Math.sin(lt * .9) + op * 2, .05); r.COOKIE.kl.intensity = 2; }
  if (op > 0) {
    r.paintFile(r2(prog(t, w(46) + .1, w(48) + .35)));
    const fs = (.25 + .75 * op) * (1 - .88 * drop);
    r.FILE.at(lerpV(v3(0, .15, 0), v3(0, -.35, 0), drop), 0, .1 * (1 - drop) - .05, 0, fs, 1 - .6 * prog(t, w(50), w(50) + .35), .45);
  }
  // the jar slides up from below
  if (jin > 0) {
    const jy = -3.6 + 3.0 * jin;
    r.jar.visible = true; r.jar.position.set(0, jy, -.2); r.jar.scale.setScalar(.85); r.jar.rotation.set(.08, .25 * Math.sin(lt * .6), 0);
    r.JAR.jl.intensity = 2.5 * bump(t, w(50) + .2, .8);
    if (t > w(50) + .25) r.mini(v3(0, jy - .6, -.2), .22, .4, -1.3);
  }
  r.click(v3(0, -.35, -.2), t, w(50) + .3, .7);
  aim(v3(0, -.1, 0), 2.0, 900, 720, .06, .05);
}, { whip: -1, ov: (lt, t) => { const r = R(); const k = sm(w(48), w(48) + .3, t) * (1 - prog(t, w(49) - .1, w(49) + .2)); return ovTag('أقل من <span class="latin">4 KB</span>', r.FILE.pt(760, 900, .05), -220, 170, k, 'hot'); } });

// K7: "تساعد المواقع تتذكّر أشياء مثل تسجيل دخولك وسلة مشترياتك." — the jar remembers: login + cart
const JARP = { x: 0, y: -.35, z: 0 };
function jarWithCookies(t, n = 3, s = .8) {
  const r = R(); r.jar.visible = true; r.jar.position.set(JARP.x, JARP.y, JARP.z); r.jar.scale.setScalar(s); r.jar.rotation.set(.06, .2 * Math.sin(t * .5), 0);
  for (let i = 0; i < n; i++) r.mini(v3(JARP.x + (i % 2 ? .18 : -.15) * s, JARP.y + (-.7 + i * .14) * s, JARP.z + (i === 1 ? .12 : -.05) * s), .26 * s, i * 1.3, -1.35 + i * .12);
}
const K7 = shot(w(51) - .05, w(60) - .05, (lt, t) => {
  const r = R(); jarWithCookies(t, 3);
  r.JAR.jl.intensity = 1.2 + 1.2 * bump(t, w(53), .7); r.JAR.glass.uniforms.k.value = 1 + .5 * bump(t, w(53), .7);
  const pl = ease.back(prog(t, w(56) - .1, w(56) + .25)), pc = ease.back(prog(t, w(58) - .1, w(58) + .25));
  r.paintLogin(r2(prog(t, w(57) + .05, w(57) + .45))); r.paintCart(r2(prog(t, w(59) + .05, w(59) + .45)));
  r.LOGIN.at(v3(-.05, 2.4, .1), .04, .12, 0, 1.45 * Math.max(.001, pl), clamp(pl * 2), .45);
  r.CART.at(v3(.05, 1.2, .2), .04, -.1, 0, 1.45 * Math.max(.001, pc), clamp(pc * 2), .45);
  const top = v3(0, .55, 0);
  if (pl > 0) r.beam(top, v3(-.05, 1.85, .1), .012, 0x59c7ff, .7 * clamp(pl), { t: t * 3, grow: clamp(pl) });
  if (pc > 0) r.beam(top, v3(.05, .65, .2), .012, 0x59c7ff, .7 * clamp(pc), { t: t * 3, grow: clamp(pc) });
  aim(v3(0, .95, 0), 3.95, 1060 + lt * 25, 730, .45 * Math.sin(lt * .7), .05 + .04 * Math.sin(lt * .5));
});

// ═════════ IN SHORT: allow = the site may save info about you ═════════
// K8a: "يعني باختصار، لما تضغط «سماح للكوكيز»،" — the banner, one click
const K8a = shot(w(60) - .05, w(66) - .05, (lt, t) => {
  const r = R(), tc = w(64) + .05;
  r.paintBanner({ k: 1, pa: r2(prog(t, tc, tc + .25)), ga: r2(.8 * bump(t, tc - .05, .6)) });
  r.BANNER.at(v3(0, 0, 0), .03, -.12 + lt * .03, 0, 1, 1, .4 + .5 * bump(t, tc, .5));
  const ok = r.BANNER.pt(...B_OK, .06), ck = sm(w(62), tc - .05, t);
  r.cursorAt(lerpV(v3(1.6, -1.4, .6), ok, ck), .14, prog(t, tc, tc + .22)); r.click(ok, t, tc, .45);
  aim(v3(0, 0, 0), 1.6, 820 + lt * 30, 700, -.12, .05);
});
// K8b: "أنت تسمح للموقع يحفظ معلومات عنك، عشان يتذكّرك لما ترجع له." — server → jar (save), jar → server (remember)
const SRVP = { x: -1.3, y: -.75, z: 0 }, JAR2 = { x: 1.3, y: -.55, z: 0 };
function k8b(lt, t, back) {
  const r = R(); r.server.visible = true; r.server.position.set(SRVP.x, SRVP.y, SRVP.z); r.server.scale.setScalar(.95); r.server.rotation.set(0, .35, 0);
  r.jar.visible = true; r.jar.position.set(JAR2.x, JAR2.y, JAR2.z); r.jar.scale.setScalar(.72); r.jar.rotation.set(.05, -.3, 0);
  const a = v3(SRVP.x, 1.05, 0), b = v3(JAR2.x, .35, 0);
  const p1 = sm(w(69) - .05, w(71) + .25, t), p2 = sm(w(72), w(74) + .15, t);
  const n0 = 2 + (t > w(71) + .25 ? 1 : 0);
  for (let i = 0; i < n0; i++) r.mini(v3(JAR2.x + (i % 2 ? .13 : -.11), JAR2.y - .5 + i * .1, (i === 1 ? .09 : -.04)), .19, i * 1.3, -1.35 + i * .12);
  const arc = (p, up) => { const v = lerpV(a, b, p); v.y += Math.sin(Math.PI * p) * up; return v; };
  if (p1 > 0 && p1 < 1) { const v = arc(p1, .9); r.mini(v, .2, t * 4, -.3); r.glow(v, .9, 0x59c7ff, .7); r.beam(a, b, .006, 0x168bff, .35, { t: t * 3, grow: p1 }); }
  if (p2 > 0 && p2 < 1) { const v = arc(1 - p2, -.6); v.z += .3; r.mini(v, .2, -t * 4, -.3); r.glow(v, .9, 0x59c7ff, .7); }
  r.click(b, t, w(71) + .25, .6); r.click(v3(SRVP.x, .55, .5), t, w(74) + .15, .7);
  r.JAR.jl.intensity = 2 * bump(t, w(71) + .2, .7);
  const wk = ease.back(prog(t, w(75) - .1, w(75) + .25));
  if (wk > 0) { r.paintWelcome(r2(prog(t, w(75) + .2, w(75) + .6))); r.WELCOME.at(v3(-.1, 2.05, .3), .04, .12, 0, 1.5 * Math.max(.001, wk), clamp(wk * 2), .5); }
  const f = back ? 1 - p2 : p1, fc = lerpV(v3(SRVP.x, .35, 0), v3(JAR2.x, .25, 0), ease.inOut(f));
  if (!back) aim(fc, 3.6, 1150, 720, -.25 + .5 * f, .12);
  else { const z = sm(w(74) + .1, w(75) + .4, t); aim(lerpV(fc, v3(0, .6, 0), z), 3.6 + 2.8 * z, 1150 + 350 * z, 720, .25 - .5 * f * (1 - z), .12 - .04 * z); }
}
const K8b1 = shot(w(66) - .05, w(72) - .05, (lt, t) => k8b(lt, t, 0), { ov: (lt, t) => { const k1 = sm(w(69) + .1, w(69) + .4, t) * (1 - prog(t, w(71) + .2, w(71) + .5)); return ovTag('معلومات عنك', v3(0, .95, 0), 0, 260, k1, 'hot'); } });
const K8b2 = shot(w(72) - .05, w(77) - .05, (lt, t) => k8b(lt, t, 1), { whip: 1 });

// ═════════ YOUR TURN ═════════
// K9: "متى آخر مرة سويت «عدم السماح» للموقع؟" — the cursor hovers over «عدم السماح»…
const K9 = shot(w(77) - .05, w(84) - .05, (lt, t) => {
  const r = R(), hv = sm(w(79), w(81), t);
  r.paintBanner({ k: 1, gr: r2(hv * (.7 + .3 * Math.sin(t * 4))) });
  r.BANNER.at(v3(0, 0, 0), .04, .1 - lt * .02, 0, 1, 1, .4);
  const no = r.BANNER.pt(...B_NO, .06); r.cursorAt(lerpV(v3(-1.5, -1.5, .6), no, hv).add(v3(.015 * Math.sin(t * 7), .01 * Math.sin(t * 5), 0)), .14);
  const z = sm(.2, w(83) + .4 - (w(77) - .05), lt), no2 = r.BANNER.pt(...B_NO, 0);
  aim(lerpV(v3(0, 0, 0), no2, z), 1.6, 800 + 520 * z, 700, .1 - lt * .02, .05);
});
// K10: "بالنسبة لي، دايمًا أسمح له." — …and slides over to «سماح». Click. Cookies pop out.
const K10 = shot(w(84) - .05, w(89) - .05, (lt, t) => {
  const r = R(), tc = w(87) - .05, mv = sm(w(85) - .1, w(86) + .3, t);
  r.paintBanner({ k: 1, gr: r2(.7 * (1 - mv)), pa: r2(prog(t, tc, tc + .25)), ga: r2(mv * .9) });
  r.BANNER.at(v3(0, 0, 0), .04, .06 - lt * .02, 0, 1, 1, .4 + .5 * bump(t, tc, .5));
  const no = r.BANNER.pt(...B_NO, .06), ok = r.BANNER.pt(...B_OK, .06);
  r.cursorAt(lerpV(no, ok, mv), .14, prog(t, tc, tc + .22)); r.click(ok, t, tc, .5);
  for (let i = 0; i < 4; i++) { const k = ease.out(prog(t, tc + .1 + i * .06, tc + .9 + i * .06)); if (k > 0 && k < 1) { const v = ok.clone().add(v3((i - 1.5) * .35 * k, .2 + 1.1 * k - .4 * k * k, .2)); r.mini(v, .14 * (1 - .3 * k), t * 3 + i, -.4); r.glow(v, .5, 0x59c7ff, .6 * (1 - k)); } }
  const z = 1 - ease.out(prog(t, w(85) - .15, w(86) + .35)), no2 = r.BANNER.pt(...B_NO, 0);
  aim(lerpV(v3(0, 0, 0), no2, z), 1.6, 825 + 495 * z, 700, .08, .05);
}, { noPunch: true });
// K11: "إذا كنت حاب تعرف كيف تسوي مثل هذه الفيديوهات، اكتب «تقنية» في التعليقات."
const K11 = shot(w(89) - .05, VOICE_END + .12, (lt, t) => {
  const r = R(), ts = w(100) - .05;
  r.paintComments({ focus: t > w(97) ? 1 : 0, type: r2(prog(t, w(98) + .05, w(99) + .3)), send: r2(prog(t, ts, ts + .25)), post: r2(prog(t, ts + .2, w(101) + .5)) });
  const inK = sm(0, .5, lt);
  r.MAIN.at(v3(0, 0, -2 * (1 - inK)), 0, .1 - lt * .02, 0, 1, inK, .4 + .5 * bump(t, ts + .2, .6));
  const send = r.MAIN.pt(...SEND_BTN, .06), ck = sm(w(99) + .3, ts - .05, t);
  if (t > w(97)) r.cursorAt(lerpV(v3(1.2, -2.2, .8), send, ck), .16, prog(t, ts, ts + .22));
  r.click(send, t, ts, .5);
  const hp = prog(t, w(101) - .1, w(101) + 1.2);
  if (hp > 0 && hp < 1) for (let i = 0; i < 10; i++) { const k = clamp(hp * 1.4 - i * .04), v = r.MAIN.pt(120, 260, .1).add(v3(Math.sin(i * 2.4) * .5 * k, .9 * k + (i % 3) * .08 * k, .1 + i * .02)); r.glow(v, .22, i % 2 ? 0x59c7ff : 0x168bff, (1 - k) * .9); }
  aim(v3(0, 0, 0), 3.0, 1040 + lt * 30, 735, -.06 + .1 * Math.sin(lt * .8), .04);
});
window.SHOTS = S;

// ═════════ DOM callouts ═════════
const T = (s, e, build, update) => ({ s, e, fi: .08, fo: .12, build, update });
const L = [];
const low = (html, top = 330) => big(html, `top:${top}px`);
const qmark = `<div class="a" style="font-size:170px;font-weight:700;color:#59C7FF;text-shadow:0 0 40px rgba(89,199,255,.6)">؟</div>`;
L.push(T(w(17), w(18) - .05, r => { r.appendChild(low(qmark, 250)); }, (r, lt, t) => popIn(r.querySelector('.a'), t, w(17) + .15, .35)));
L.push(T(w(83), w(84) - .05, r => { r.appendChild(low(qmark, 250)); }, (r, lt, t) => popIn(r.querySelector('.a'), t, w(83) + .2, .35)));
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
