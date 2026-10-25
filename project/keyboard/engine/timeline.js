// KROZO — "كيف الكيبورد يعرف وش تقصد؟"  shots in story time (w(i) = start of word i of the voice-over).
const VOICE_END = 48.3;
const w = i => WT[i];
const sm = (a, b, t) => ease.inOut(prog(t, a, b));
const R = () => window.R3;
const S = [];
const shot = (s, e, update, o = {}) => { const x = Object.assign({ s, e, update }, o); S.push(x); return x; };
const v3 = (x, y, z) => R().V(x, y, z);
const P = (px, py, z = 0) => R().projPx(px, py, z);
// key centres on the 1180×2556 screen canvas (see kb3d.js)
const K = ch => R().KEY[ch];
const KX = { م: 296, ن: 394, ك: 198 }, ROW2 = 1799;
const TOUCH = { x: 353, y: 1812 };   // between ن and م, a little closer to ن
const BOOST_M = { م: 46, ن: -12, ك: -12, ت: -8, خ: -8, ح: -8, ظ: -8, ز: -8 };

// camera placed in the phone's own frame: above canvas point (px,py) at `dist`, tilted by (ax, ay) radians, phone-up = screen-up
function camOn(px, py, dist, o = {}) {
  const r = R(), ph = r.phone; ph.updateMatrixWorld(true);
  const tgt = r.loc(px, py, 0), ax = o.ax ?? 0, ay = o.ay ?? 0;
  const pos = tgt.clone().add(v3(Math.sin(ay) * dist * Math.cos(ax), -Math.sin(ax) * dist, Math.cos(ay) * Math.cos(ax) * dist));
  const up = v3(0, 1, 0).transformDirection(ph.matrixWorld);
  pos.applyMatrix4(ph.matrixWorld); tgt.applyMatrix4(ph.matrixWorld);
  r.cam.position.copy(pos); r.cam.up.copy(up); r.cam.fov = o.fov ?? 30; r.cam.lookAt(tgt); r.cam.updateProjectionMatrix();
}
// typing: taps = [{t, ch, x?, y?}] → text so far, the key being pressed, thumb pose
function typing(t, taps, base = '') {
  let text = base, press = null, pressK = 0;
  for (const tp of taps) if (t >= tp.t) { text += tp.ch === ' ' ? ' ' : tp.ch; const k = 1 - prog(t, tp.t + .1, tp.t + .28); if (k > 0) { press = tp.ch; pressK = k; } }
  return { text, press, pressK };
}
const tapXY = tp => [(tp.x ?? K(tp.ch).x) + (tp.dx || 0), (tp.y ?? K(tp.ch).y) + (tp.dy || 0)];
function thumbPath(t, taps, rest = [700, 2350]) {
  let i = taps.findIndex(tp => tp.t > t);
  if (i === -1) i = taps.length;
  const a = i > 0 ? taps[i - 1] : null, b = i < taps.length ? taps[i] : null;
  let x, y;
  if (a && b) { const k = ease.inOut(prog(t, a.t + .06, b.t - .03)); const [ax, ay] = tapXY(a), [bx, by] = tapXY(b); x = lerp(ax, bx, k); y = lerp(ay, by, k); }
  else if (b) { const k = ease.out(prog(t, b.t - .55, b.t - .03)); const [bx, by] = tapXY(b); x = lerp(rest[0], bx, k); y = lerp(rest[1], by, k); }
  else { const [ax, ay] = tapXY(a); const k = ease.inOut(prog(t, a.t + .15, a.t + .7)); x = lerp(ax, rest[0], k); y = lerp(ay, rest[1], k); }
  let d = 9; for (const tp of taps) d = Math.min(d, Math.abs(t - tp.t));
  return [x, y, .0006 + .011 * (1 - Math.exp(-((d / .09) ** 2)))];
}
function tapFx(t, taps, o = {}) {   // touch ring + glow where each tap lands
  const r = R();
  for (const tp of taps) {
    const age = t - tp.t; if (age < 0 || age > .6) continue; const [x, y] = tapXY(tp);
    r.ring(x, y, 30 + age * 160, r.COL.cyan, (1 - age / .6) * .9, { w: .12, z: o.z ?? 0 });
    r.glow(x, y, 70, 0x9fe1ff, (1 - age / .4) * .9, o.z ?? 0);
  }
}
function ovTag(txt, xy, dx, dy, k = 1, cls = '') {
  if (k <= 0) return ''; const [x, y] = xy, x2 = x + dx, y2 = y + dy;
  return `<svg class="ld" style="opacity:${k}"><line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}"/><circle cx="${x}" cy="${y}" r="6"/></svg><div class="tag ${cls}" style="opacity:${k};left:${x2}px;top:${y2}px">${txt}</div>`;
}
const ovNote = (txt = 'رسم توضيحي') => `<div class="note">${txt}</div>`;
const pop = (t, at, d = .3) => { const k = ease.back(prog(t, at, at + d)); return `opacity:${clamp(prog(t, at, at + d * .5))};transform:translateY(${(1 - k) * 30}px) scale(${.86 + .14 * k})`; };
window.POST3D = (sh, lt, t) => { const o = document.getElementById('ov'); if (o) o.innerHTML = sh && sh.ov ? sh.ov(lt, t, sh) : ''; };
const chat = (o = {}) => Object.assign({ bubbles: [{ t: 'وصلت؟', me: false }] }, o);

// ═════════ HOOK: every key is smaller than your thumb ═════════
const TAP1 = [{ t: w(7) + .12, ch: 'ب' }];
const A1 = shot(0, w(8) - .05, (lt, t) => {
  const r = R(); r.phone.rotation.set(-.62, .38 - lt * .05, .06); r.grid.visible = false;
  const st = typing(t, TAP1);
  r.setScreen(chat({ text: '', press: st.press, pressK: st.pressK, hi: { ب: sm(w(5), w(5) + .3, t) * (1 - st.pressK) } }));
  const [x, y, h] = thumbPath(t, TAP1, [900, 2700]); r.thumbAt(x, y, h, { k: sm(w(4), w(5) + .2, t) });
  tapFx(t, TAP1);
  const k = ease.inOut(prog(lt, 0, w(5) + .3));
  camOn(lerp(590, 640, k), lerp(1500, 1900, k), lerp(.42, .19, k), { ax: lerp(.5, .32, k), ay: lerp(-.35, -.18, k) });
}, {
  noPunch: true,
  ov: (lt, t) => {
    const b = K('ب'), k1 = sm(w(5), w(5) + .3, t), k2 = sm(w(7), w(7) + .3, t);
    return ovTag('زر واحد', P(b.x, b.y - 60), -150, -330, k1) + ovTag('إبهامك', P(b.x + 40, b.y - 40, .02), 60, -520, k2, 'hot');
  },
});
// A2: "ومع ذلك غالبًا تضغط الحرف الصح" — fast taps, every one lands
const TAP2 = [['م', w(8) + .1], ['ر', w(9) + .05], ['ح', w(10) + .05], ['ب', w(11)], ['ا', w(12) + .05]].map(([ch, t]) => ({ ch, t }));
const A2 = shot(w(8) - .05, w(14) - .05, (lt, t) => {
  const r = R(); r.phone.rotation.set(-.3, -.12, 0);
  const st = typing(t, TAP2);
  r.setScreen(chat({ text: st.text, press: st.press, pressK: st.pressK }));
  const [x, y, h] = thumbPath(t, TAP2, [900, 2500]); r.thumbAt(x, y, h, { k: .9 });
  tapFx(t, TAP2);
  camOn(560, 1900 - lt * 20, .21 - lt * .006, { ax: .22, ay: .12 - lt * .03 });
}, {
  ov: (lt, t) => TAP2.filter(tp => t > tp.t + .05).map(tp => { const [x, y] = P(K(tp.ch).x, K(tp.ch).y - 130); const a = 1 - prog(t, tp.t + .55, tp.t + .8); return a > 0 ? `<div class="mk ok" style="left:${x}px;top:${y}px;opacity:${a};${pop(t, tp.t + .05, .22).replace(/opacity:[^;]*;/, '')}">✓</div>` : ''; }).join(''),
});
// A3: "كيف؟" — the screen dims, a question mark, heartbeat (pause 0.75 s)
const A3 = shot(w(14) - .05, w(15) - .05, (lt, t) => {
  const r = R(); r.phone.rotation.set(-.3, -.12 + lt * .04, 0);
  r.setScreen(chat({ text: 'مرحبا' })); r.screenM.emissiveIntensity = .8 - .5 * sm(0, .5, lt);
  r.grade.vig.value = .45 + .35 * sm(0, .6, lt); r.r1.intensity = 30 - 20 * sm(0, .6, lt);
  camOn(590, 1900, .27 + lt * .03, { ax: .22, ay: .05 });
}, { ov: (lt, t) => `<div class="q" style="${pop(t, w(14) - .02, .35)}">؟</div>` });

// ═════════ THE SECRET: a hidden touch-zone layer under the keys ═════════
const lift = t => sm(w(16), w(17) + .2, t) * (1 - sm(w(26) - .5, w(26) - .1, t));
const wob = t => { const b = {}; const k = sm(w(22), w(23), t); if (k <= 0) return b; for (const [i, ch] of ['م', 'ل', 'ي', 'ع', 'و', 'ت'].entries()) b[ch] = k * 26 * Math.max(0, Math.sin((t - w(22)) * 3.2 + i * 1.7)); return b; };
const A4 = shot(w(15) - .05, w(26) - .05, (lt, t) => {
  const r = R(); r.phone.rotation.set(-Math.PI / 2, 0, 0); r.grid.visible = true;
  const L = lift(t);
  r.setScreen(chat({ text: 'مرحبا', keys: L < .02 }));
  if (L >= .02) r.setCaps({}, .0005 + .02 * L, 1);
  const za = sm(w(17), w(18) + .2, t);
  r.setZones(wob(t), { a: za, fill: .2, labels: .5, z: .0003 });
  r.bloom.strength = .45;
  camOn(600, 1820, .3 - lt * .008, { ax: .55, ay: -.95 + lt * .04, fov: 34 });
}, {
  ov: (lt, t) => {
    const L = lift(t), za = sm(w(17), w(18) + .2, t);
    return ovTag('الأزرار اللي تشوفها', P(900, 1600, .0005 + .02 * L), -60, -330, sm(w(16) + .2, w(16) + .5, t)) +
      ovTag('مناطق اللمس المخفية', P(260, 1820, .0003), 80, -560, za, 'hot');
  },
});
// A5: "خلنا نجرب:" — the layers settle, camera rises to a top-down view
const A5 = shot(w(26) - .05, w(28) - .05, (lt, t) => {
  const r = R(); r.phone.rotation.set(-Math.PI / 2, 0, 0); r.grid.visible = true;
  r.setScreen(chat({ text: '' }));
  const k = ease.inOut(prog(lt, 0, 1.1));
  camOn(590, lerp(1900, 1950, k), lerp(.2, .25, k), { ax: lerp(1.0, .12, k), ay: lerp(.3, 0, k) });
});
// A6: "تخيّل إنك تكتب كلمة سلام، وكتبت سلا…"
const TAP6 = [['س', w(33) + .05], ['ل', w(33) + .35], ['ا', w(34) - .12]].map(([ch, t]) => ({ ch, t }));
const A6 = shot(w(28) - .05, w(35) - .05, (lt, t) => {
  const r = R(); r.phone.rotation.set(-Math.PI / 2, 0, 0); r.grid.visible = true;
  const st = typing(t, TAP6);
  r.setScreen(chat({ text: st.text, press: st.press, pressK: st.pressK, caret: (t * 2 % 1) < .55 ? 1 : 0, sugg: st.text ? [st.text, '', ''] : ['', '', ''] }));
  const [x, y, h] = thumbPath(t, TAP6, [900, 2450]); r.thumbAt(x, y, h, { k: sm(w(32), w(33), t) });
  tapFx(t, TAP6);
  camOn(590, 1950 - lt * 10, .25 - lt * .004, { ax: .12, ay: 0 });
}, {
  ov: (lt, t) => {
    const n = TAP6.filter(tp => t >= tp.t).length, k = sm(w(32) - .1, w(32) + .2, t);
    const letters = ['س', 'ل', 'ا', 'م'].map((c, i) => i < n ? c : i === 3 && n === 3 ? `<u>${c}</u>` : `<s>${c}</s>`).join('');
    return k > 0 ? `<div class="word" style="opacity:${k}"><b>${letters}</b></div>` : '';
  },
});
// A7: "جوالك يتوقع إن الحرف الجاي ممكن يكون ميم" — prediction panel, suggestion bar
const PRED = [['م', 'سلام', .78], ['ح', 'سلاح', .12], ['ل', 'سلال', .06]];
const A7 = shot(w(35) - .05, w(43) - .05, (lt, t) => {
  const r = R(); r.phone.rotation.set(-Math.PI / 2, 0, 0); r.grid.visible = true;
  const hk = sm(w(42), w(42) + .25, t);
  r.setScreen(chat({ text: 'سلا', caret: (t * 2 % 1) < .55 ? 1 : 0, sugg: ['سلام', 'سلاح', 'سلامات'], suggHi: 0, suggK: sm(w(36), w(37), t), hi: { م: hk }, ghost: hk > .5 ? 'م' : '' }));
  if (hk > 0) r.glow(KX['م'], ROW2, 260, 0x59c7ff, .5 * hk);
  camOn(560, 1840 - lt * 15, .24 - lt * .006, { ax: .18, ay: .05 });
}, {
  ov: (lt, t) => {
    const k = sm(w(36), w(36) + .3, t), g = sm(w(37), w(41), t);
    const rows = PRED.map(([c, wd, p], i) => `<div class="row ${i === 0 && t > w(42) ? 'on' : ''}"><div class="ch">${c}</div><div class="wd">${wd}</div><div class="bar"><i style="width:${p * 100 * ease.out(prog(g, i * .1, .6 + i * .1))}%"></i></div></div>`).join('');
    const kw = 1 - sm(w(36) - .2, w(36) + .1, t);
    return (kw > 0 ? `<div class="word" style="opacity:${kw}"><b>سلا<s>م</s></b></div>` : '') + (k > 0 ? `<div class="panel" style="opacity:${k}"><div class="pt">الحرف الجاي؟</div>${rows}</div>${ovNote()}` : '');
  },
});
// A8: "فيوسّع منطقة اللمس الخاصة فيه، ويصغّر المناطق المحيطة"
const grow = t => sm(w(43), w(44) + .4, t), shrink = t => sm(w(48), w(50), t);
const boostAt = t => { const b = { م: BOOST_M['م'] * grow(t) }; for (const [c, v] of Object.entries(BOOST_M)) if (c !== 'م') b[c] = v * shrink(t); return b; };
const A8 = shot(w(43) - .05, w(51) - .05, (lt, t) => {
  const r = R(); r.phone.rotation.set(-Math.PI / 2, 0, 0); r.grid.visible = true;
  r.setScreen(chat({ text: 'سلا', caret: 1, sugg: ['سلام', 'سلاح', 'سلامات'] }));
  r.setZones(boostAt(t), { a: sm(0, .25, lt), hot: 'م', hotK: grow(t), fill: .24, labels: 1, z: .0004 });
  r.bloom.strength = .4;
  camOn(310, 1880, .15 - lt * .004, { ax: .35, ay: -.15 + lt * .03 });
}, {
  ov: (lt, t) => ovTag('منطقة الميم تكبر', P(KX['م'], ROW2 - 40, .0004), 120, -380, sm(w(44), w(44) + .3, t), 'hot') +
    ovTag('اللي حولها تصغر', P(KX['ن'] + 20, ROW2 - 60, .0004), 260, -180, sm(w(48) + .2, w(48) + .5, t)) + ovNote(),
});
// A9: "بدون ما يتغير شكل الأزرار على الشاشة." — exploded again: same keycaps on top, the changed map below
const lift9 = t => sm(w(51), w(52) + .4, t) * (1 - sm(w(56), w(57) + .2, t));
const A9 = shot(w(51) - .05, w(58) - .05, (lt, t) => {
  const r = R(); r.phone.rotation.set(-Math.PI / 2, 0, 0); r.grid.visible = true;
  const L = lift9(t);
  r.setScreen(chat({ text: 'سلا', caret: 1, sugg: ['سلام', 'سلاح', 'سلامات'], keys: L < .02 }));
  if (L >= .02) r.setCaps({}, .0005 + .02 * L, 1);
  r.setZones(boostAt(99), { a: L, hot: 'م', fill: .22, labels: .5, z: .0003 });
  r.bloom.strength = .45;
  camOn(560, 1820, .28 - lt * .01, { ax: .55, ay: .95 - lt * .04, fov: 34 });
}, {
  ov: (lt, t) => { const L = lift9(t); return ovTag('الشكل نفسه', P(200, 1600, .0005 + .02 * L), 80, -330, L) + ovTag('اللي تغيّر', P(KX['م'], ROW2, .0003), 300, -560, L * sm(w(53), w(54), t), 'hot'); },
});

// ═════════ TOUCH BETWEEN TWO LETTERS ═════════
const TAPM = { t: w(60) + .1, ch: 'م', x: TOUCH.x, y: TOUCH.y };
const pick = t => sm(w(66), w(66) + .2, t);
const A10 = shot(w(58) - .05, w(70) - .05, (lt, t) => {
  const r = R(); r.phone.rotation.set(-Math.PI / 2, 0, 0); r.grid.visible = true;
  const pk = pick(t), both = sm(w(61), w(61) + .2, t) * (1 - pk);
  r.setScreen(chat({ text: pk > .5 ? 'سلام' : 'سلا', caret: 1, sugg: ['سلام', 'سلاح', 'سلامات'], hi: { ن: both, م: Math.max(both, pk) }, press: pk > 0 && pk < 1 ? 'م' : null, pressK: 1 - prog(t, w(66) + .3, w(66) + .5) }));
  const za = sm(w(63), w(63) + .3, t);
  r.setZones(BOOST_M, { a: za * (1 - .6 * pk), hot: 'م', sel: t > w(65) ? 'م' : null, fill: .22, labels: 1, z: .0004 });
  const [x, y, h] = thumbPath(t, [TAPM], [700, 2300]); r.thumbAt(x, y, h, { k: 1 - .7 * za });
  tapFx(t, [TAPM]);
  if (t > TAPM.t) r.glow(TOUCH.x, TOUCH.y, 44, 0xffffff, .95, .0006), r.ring(TOUCH.x, TOUCH.y, 22, 0xffffff, .9, { w: .3, z: .0006, fill: .6 });
  if (pk > 0) r.glow(KX['م'], ROW2, 300, 0x59c7ff, .45 * pk * (1 - prog(t, w(68), w(69) + .3)));
  camOn(350, 1850, .145 - lt * .002, { ax: .1, ay: 0 });
}, {
  ov: (lt, t) => (t > w(66) + .1 ? (() => { const [x, y] = P(KX['م'], ROW2 - 160); return `<div class="mk ok" style="left:${x}px;top:${y}px;${pop(t, w(66) + .1, .25)}">✓</div>`; })() : '') +
    ovTag('لمستك', P(TOUCH.x, TOUCH.y, .0006), 200, -380, sm(w(60) + .3, w(60) + .6, t) * (1 - sm(w(63), w(63) + .2, t))),
});
// A11: "بدل ما يختار الأقرب لمكان لمستك." — distances: ن is closer, م is chosen
const A11 = shot(w(70) - .05, w(76) - .05, (lt, t) => {
  const r = R(); r.phone.rotation.set(-Math.PI / 2, 0, 0); r.grid.visible = true;
  r.setScreen(chat({ text: 'سلام', caret: 1, sugg: ['سلام', 'سلامات', 'سلامتك'], hi: { م: 1, ن: .5 } }));
  r.glow(TOUCH.x, TOUCH.y, 44, 0xffffff, .95, .0006); r.ring(TOUCH.x, TOUCH.y, 22, 0xffffff, .9, { w: .3, z: .0006, fill: .6 });
  camOn(350, 1830, .16 + lt * .004, { ax: .08, ay: 0 });
}, {
  ov: (lt, t) => {
    const [tx, ty] = P(TOUCH.x, TOUCH.y, .0006), [nx, ny] = P(KX['ن'], ROW2), [mx, my] = P(KX['م'], ROW2);
    const kn = sm(w(73), w(73) + .3, t), km = sm(w(74), w(74) + .3, t);
    const ln = (x2, y2, k, c, d) => `<line x1="${tx}" y1="${ty}" x2="${tx + (x2 - tx) * k}" y2="${ty + (y2 - ty) * k}" stroke="${c}" stroke-width="7" stroke-dasharray="${d}" stroke-linecap="round"/>`;
    return `<svg class="dist">${ln(nx, ny, kn, '#A7B1C2', '14 14')}${ln(mx, my, km, '#59C7FF', '0')}</svg>` +
      ovTag('الأقرب ✕', [nx, ny - 70], 170, -560, kn) + ovTag('الأنسب ✓', [mx, my - 70], -130, -400, km, 'hot');
  },
});

// ═════════ YOUR FINGER DOESN'T HAVE TO BE PRECISE ═════════
const JIT = [[-34, 22], [30, -26], [-26, -30], [36, 18], [-30, 30], [24, -34], [-38, -8]];
const TAP12 = [' ', 'ك', 'ي', 'ف', ' ', 'ح', 'ا', 'ل', 'ك'].reduce((a, ch) => { if (ch !== ' ') a.push({ ch, t: w(77) + a.length * .36 }); return a; }, []).map((tp, i) => ({ ...tp, dx: JIT[i % 7][0], dy: JIT[i % 7][1] }));
const A12 = shot(w(76) - .05, w(85) - .05, (lt, t) => {
  const r = R(); r.phone.rotation.set(-.55, .3 - lt * .04, .05); r.grid.visible = false;
  const st = typing(t, TAP12, 'سلام ');
  const text = st.text.slice(0, 5) + st.text.slice(5, 8) + (st.text.length > 8 ? ' ' + st.text.slice(8) : '');
  r.setScreen(chat({ text, press: st.press, pressK: st.pressK }));
  const [x, y, h] = thumbPath(t, TAP12, [900, 2500]); r.thumbAt(x, y, h, { k: .9 });
  tapFx(t, TAP12);
  for (const tp of TAP12) if (t > tp.t) r.glow(...tapXY(tp), 36, 0xffffff, .8, .0006);
  camOn(600, 1900, .24 - lt * .006, { ax: .35, ay: -.2 + lt * .03 });
}, {
  ov: (lt, t) => TAP12.filter(tp => t > tp.t + .05).map(tp => { const [x, y] = P(K(tp.ch).x, K(tp.ch).y - 120); const a = 1 - prog(t, tp.t + .45, tp.t + .7); return a > 0 ? `<div class="mk ok" style="left:${x}px;top:${y}px;opacity:${a}">✓</div>` : ''; }).join(''),
});
// A13: "الكيبورد نفسه يساعدك تكتب بدقة." — hero: the zone map floats above the keys, glowing
const A13 = shot(w(85) - .05, w(90) - .05, (lt, t) => {
  const r = R(); r.phone.rotation.set(-.75, -.45 + lt * .12, -.05); r.grid.visible = true;
  r.setScreen(chat({ text: 'سلام كيف حالك', caret: 1, sugg: ['حالك', 'حالكم', 'حال'] }));
  const k = sm(w(85), w(86), t), pulse = .5 + .5 * Math.sin(lt * 4);
  r.setZones({ ك: 30 * pulse, ل: 20 * (1 - pulse) }, { a: k * .9, fill: .2, labels: .6, z: .002 + .006 * k });
  r.bloom.strength = .5;
  const c = ease.inOut(prog(lt, 0, 3));
  camOn(590, lerp(1700, 1500, c), lerp(.25, .4, c), { ax: .45, ay: .25, fov: 34 });
}, { ov: (lt, t) => ovTag('يساعدك بصمت', P(590, 1700, .008), 0, -520, sm(w(87), w(87) + .3, t), 'hot') });

// ═════════ CTA: send it to the friend who blames autocorrect ═════════
const A14 = shot(w(90) - .05, VOICE_END + .12, (lt, t) => {
  const r = R(); r.phone.rotation.set(-.12, .22 - lt * .05, 0); r.grid.visible = false;
  const sent = sm(w(90) + .1, w(90) + .4, t), rep = sm(w(98), w(98) + .3, t);
  r.setScreen({ kb: false, bubbles: [{ t: 'وصلت؟', me: false }, { t: 'سلام كيف حالك', me: true }, { card: 1, a: sent }, { t: 'طيب… يمكن الغلط مني', me: false, a: rep }] });
  const c = ease.inOut(prog(lt, 0, 4.5));
  camOn(590, lerp(1380, 1300, c), lerp(.24, .2, c), { ax: .05, ay: -.15 + c * .1 });
});
window.SHOTS = S;

// ═════════ DOM layer: only the outro (everything else is drawn by the 3D shots) ═════════
const L = [];
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
  bug: t => (t < .6 ? 0 : 1) * (1 - prog(t, VOICE_END - .2, VOICE_END + .1)),
  subs: SUBS,
  scenes: L,
};
