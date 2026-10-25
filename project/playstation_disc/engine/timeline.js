// KROZO — "كيف البلايستيشن يقرأ القرص؟"  shots in story time (w(i) = start of word i of the voice-over).
const VOICE_END = 65.8;
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
// a pit (or the land between two pits) of track j whose world-x centre lies in [x0, x1] at scroll `off`
function findRun(j, off, x0, x1, land = false) {
  const { PITS, T, LEN } = R(), P = PITS[j];
  for (const k of [0, 1, -1]) for (let i = 0; i < P.length - 1; i++) {
    const a = land ? P[i][1] : P[i][0], b = land ? P[i + 1][0] : P[i][1], c = (a + b) / 2 * T + k * LEN - off;
    if (c >= x0 && c <= x1) return c;
  }
  return null;
}
// disc into the slot: k 0..1 (outside, raised → inside)
function insertDisc(t, k, spin) {
  const r = R(), lift = 1 - sm(0, .55, k), slide = sm(.35, 1, k);
  r.discAt(v3(0, .05 + 1.2 * lift, 2.65 - 2.45 * slide), .55 * lift, 0, 0, 1, spin);
  return slide;
}

// ═════════ HOOK ═════════
// A1: the console; a disc floats in, slides into the slot; a holo game world grows out of the console. "؟"
const A1 = shot(0, w(10) - .05, (lt, t) => {
  const r = R(); r.con.visible = true; r.con.position.set(0, 0, 0); r.con.rotation.set(0, 0, 0);
  const ins = prog(t, w(5) - .1, w(6) + .45), slide = insertDisc(t, ins, t * (2.5 - 2 * ins));
  if (ins > .98) r.disc.visible = false;
  if (ins <= 0) { const k = ease.out(prog(t, w(3) - .4, w(4) + .1)); r.discAt(v3(0, 1.25 - .25 * (1 - k), 2.65 + .6 * (1 - k)), .55, 0, 0, Math.max(.001, k), t * 2.5); r.DISC.u.a.value = k; }
  const on = prog(t, w(6) + .3, w(6) + .6);
  r.CON.slotGlow.material.opacity = .9 * bump(t, w(6) + .3, .6); r.CON.cl.intensity = 3 * bump(t, w(6) + .35, .8);
  r.CON.strip.color.setHex(0x168bff).lerp(new r.THREE.Color(0x59c7ff), bump(t, w(6) + .35, .8));
  const gk = ease.out(prog(t, w(7) - .1, w(9) + .1));
  if (gk > 0) {
    r.gwAt(v3(0, .75 + 1.25 * gk, -.2), .95 * gk, t * .35, clamp(gk * 1.4), t);
    r.beam(v3(0, .48, -.2), v3(0, .7 + 1.25 * gk, -.2), .9 * gk, 0x168bff, .12 * gk, { t: t * 2 });
    for (let i = 0; i < 2; i++) r.ring(v3(0, .5, -.2), (.6 + ((t * .7 + i / 2) % 1) * 1.6) * gk, 0x59c7ff, (1 - ((t * .7 + i / 2) % 1)) * .5 * gk, { flat: true });
  }
  const back = sm(w(6), w(9) + .3, t), q = prog(t, w(9) + .3, w(10));
  aim(v3(0, lerp(.25, 1.35, back), lerp(.4, 0, back)), lerp(3.2, 5.0, back) - .25 * q, 1050, lerp(820, 760, back), lerp(.5, .2, back) + .05 * q, lerp(.4, .3, back), 34);
}, { noPunch: true });

// ═════════ INSIDE THE DISC ═════════
// A2: "داخل الـCD فيه تفاصيل دقيقة جدًا،" — dive into the data side; the microscope takes over (×1 → ×12,000)
const SW = () => w(13) - .1;
const MAGF = (t) => Math.exp(lerp(Math.log(1), Math.log(12000), sm(w(10) + .1, w(15) + .2, t)));
const A2 = shot(w(10) - .05, w(16) - .05, (lt, t) => {
  const r = R();
  if (t < SW()) {
    r.discAt(v3(0, 0, 0), 0, 0, 0, 1, t * .25); r.DISC.u.L.value.set(.6, 1, .2);
    const k = sm(w(10) - .05, SW(), t), hW = Math.exp(lerp(Math.log(2.6), Math.log(.035), k));
    aim(v3(.68, 0, 0), hW, 1200, 760, 0, lerp(1.1, 1.45, k), 30);
    r.grade.zb.value = .8 * k * k;
  } else {
    r.world.visible = false; r.macro.visible = true; r.MAC.u.off.value = 40 + t * 1.2;
    const k = sm(SW(), w(16), t), hW = Math.exp(lerp(Math.log(420), Math.log(160), k));
    r.MAC.u.fr.value = hW * 1.2; r.MAC.u.focus.value.set(0, 0);
    aim(v3(0, 0, 0), hW, 1300, 720, .25, lerp(1.35, 1.0, k), 30);
    r.grade.zb.value = .8 * (1 - prog(t, SW(), SW() + .35));
    r.grade.flash.value = .5 * (1 - prog(t, SW(), SW() + .25));
  }
}, {
  ov: (lt, t) => {
    const m = MAGF(t), k = sm(w(10), w(10) + .3, t);
    return `<div class="mag" style="opacity:${k}">${lat('×' + Math.round(m).toLocaleString('en-US'))}<small>تكبير</small></div>`;
  },
});
// A3: "ما تقدر تشوفها بعينك المجردة." — a human hair lands across ~44 tracks
const A3 = shot(w(16) - .05, w(21) - .05, (lt, t) => {
  const r = R(); r.world.visible = false; r.macro.visible = true; r.MAC.u.off.value = 40 + t * 1.2;
  const hk = ease.out(prog(t, w(18) - .2, w(19) + .2));
  r.hair.visible = hk > 0; r.hair.rotation.set(Math.PI / 2, 0, 0); r.hair.position.set(lerp(-260, -12, hk), 36, 0);
  const hW = 170 - lt * 6; r.MAC.u.fr.value = hW * 1.3; r.MAC.u.focus.value.set(0, 0);
  aim(v3(0, 10, 0), hW, 1250, 720, .3 + lt * .02, .95, 30);
}, {
  ov: (lt, t) => {
    const r = R(), k1 = sm(w(19) + .1, w(19) + .45, t), k2 = sm(w(20) - .1, w(20) + .25, t);
    const eye = `<div class="eye" style="opacity:${sm(w(16), w(16) + .3, t)}"><svg width="260" height="150" viewBox="0 0 260 150"><path d="M15 75 Q130 -10 245 75 Q130 160 15 75Z" fill="none" stroke="#F4F7FB" stroke-width="9"/><circle cx="130" cy="75" r="30" fill="#59C7FF"/><line x1="40" y1="140" x2="220" y2="10" stroke="#A7B1C2" stroke-width="12" stroke-linecap="round"/></svg></div>`;
    return eye + ovTag(`شعرة ≈ ${lat('70 µm')}`, v3(-12, 60, 40), 170, -170, k1, 'hot') + ovTag(`مسار ≈ ${lat('1.6 µm')}`, v3(40, 0, -30), -200, 150, k2) + ovNote('رسم توضيحي بالمقياس الحقيقي تقريبًا');
  },
});

// ═════════ THE SPIRAL, THE PITS ═════════
// A4: "الـCD يحتوي على مسار حلزوني" — one spiral track lights up from the centre outwards
const A4 = shot(w(21) - .05, w(27) - .05, (lt, t) => {
  const r = R(); r.discAt(v3(0, 0, 0), 0, 0, 0, 1, -t * .15); r.DISC.u.L.value.set(.5, 1, -.3); r.DISC.u.sheen.value = .6;
  r.DISC.u.trk.value = sm(w(23) - .1, w(26) + .5, t); r.DISC.u.trkA.value = 1;
  const k = sm(0, 2, lt);
  aim(v3(0, 0, 0), 2.1, 1080 - 60 * k, 740, .2 * lt * .1, lerp(1.0, 1.2, k), 32);
}, {
  ov: (lt, t) => {
    const k = sm(w(25), w(25) + .35, t) * (1 - prog(t, w(27) - .4, w(27) - .1));
    return ovTag('مسار حلزوني واحد', v3(.55, .01, .55), 120, -560, k, 'hot') + `<div class="kick2" style="opacity:${sm(w(24), w(24) + .3, t)}">يبدأ من الداخل ← للخارج</div>`;
  },
});
// A5: "فيه حفر صغيرة ومناطق مستوية،" — the track under the microscope; pits glow, then the flat lands
const OFF5 = t => 60 + t * .9;
const A5 = shot(w(27) - .05, w(31) - .05, (lt, t) => {
  const r = R(); r.world.visible = false; r.macro.visible = true; r.MAC.u.off.value = OFF5(t);
  r.MAC.u.hlP.value = .9 * sm(w(27), w(27) + .3, t) * (1 - .6 * sm(w(29) - .1, w(29) + .2, t));
  r.MAC.u.hlL.value = sm(w(29), w(29) + .3, t);
  r.MAC.u.fr.value = 14; r.MAC.u.focus.value.set(0, 0);
  aim(v3(0, 0, 0), 9 - lt * .4, 1150, 700, .35 - lt * .04, .8, 30);
}, {
  ov: (lt, t) => {
    const off = OFF5(t), xp = findRun(31, off, -2.5, 1.5), xl = findRun(30, off, -1, 3, true);
    const k1 = sm(w(27) + .1, w(27) + .4, t), k2 = sm(w(29) + .1, w(29) + .4, t);
    return (xp !== null ? ovTag('حفرة', v3(xp, 0, 0), -170, -260, k1, 'hot') : '') + (xl !== null ? ovTag('منطقة مستوية', v3(xl, 0, 1.6), -60, -380, k2) : '') + ovNote(`تكبير تقريبي ${lat('×20,000')} · رسم توضيحي`);
  },
});

// ═════════ THE LASER → 0 / 1 ═════════
// A6: "والليزر يقرأ الاختلافات بينها، وبعدين البلايستيشن يحوّلها إلى بيانات رقمية من أصفار ووحدات."
// cross-section of one track: laser from below, strong reflection on flat, weak on a pit; the scope turns it into bits
const OFF6 = t => 30 + t * 1.25;
const A6 = shot(w(31) - .05, w(44) - .05, (lt, t) => {
  const r = R(); r.world.visible = false;
  const off = OFF6(t), refl = r.xsAt(off), on = sm(w(31) - .1, w(31) + .25, t);
  r.xs.position.set(0, 0, 0);
  const tip = v3(0, -.05, 0), lens = v3(0, -1.55, 0);
  r.cone(lens, tip, .025, .17, 0x59c7ff, .45 * on, t);
  if (on > 0) {
    r.glow(tip, .9 + .6 * refl, 0x59c7ff, on * (.35 + .65 * refl));
    r.cone(v3(.12, -1.55, 0), v3(.04, -.08, 0), .015, .09, 0x168bff, .5 * on * refl, -t);
    r.beam(v3(.2, -1.68, 0), v3(.72, -1.97, 0), .02, 0x59c7ff, .9 * on * refl);
    r.XS.sensor.material.color.setRGB(.05 + .3 * refl * on, .1 + .68 * refl * on, .2 + .8 * refl * on);
  } else r.XS.sensor.material.color.setRGB(.05, .1, .2);
  // the scope above the disc layer
  const sc = sm(w(35) - .2, w(36) + .3, t);
  if (sc > 0) {
    r.paintScope({ xp: r2(off * 4) / 4, wave: r2(prog(t, w(37) - .1, w(40))), bits: r2(prog(t, w(41) - .05, w(43) + .3)) });
    r.SCOPE.at(v3(0, 2.75, .4), 0, 0, 0, Math.max(.001, ease.out(sc)), clamp(sc * 1.5), .5);
  }
  // bits fly out of the scope at "ووحدات"
  const fly = prog(t, w(43) - .1, w(44) + .2);
  for (let i = 0; i < 70 && fly > 0; i++) {
    const k = clamp(fly * 1.6 - hash(i) * .6); if (k <= 0) continue;
    const p = v3(lerp(-1.4, 1.4, hash(i + 9)), 2.6 + lerp(-.3, .3, hash(i + 3)), .5);
    r.digit(p.add(v3((hash(i + 5) - .5) * 3 * k, (hash(i + 7) - .3) * 2.5 * k, 4 * k * k)), hash(i + 1) > .6 ? 1 : 0, .28, (1 - k) * 1.2);
  }
  const up = sm(w(35) - .2, w(37) + .2, t);
  aim(v3(0, lerp(-.8, 1.55, up), 0), lerp(2.5, 5.4, up), 1150, lerp(700, 700, up), lerp(.75, .2, up), lerp(-.22, .05, up), 30);
}, {
  ov: (lt, t) => {
    const off = OFF6(t), up = sm(w(35) - .2, w(37) + .2, t);
    const k1 = sm(w(31) + .15, w(31) + .45, t) * (1 - up), k2 = sm(w(33), w(33) + .3, t) * (1 - up);
    const pit = R().inPit(31, off);
    const xb = findRun(31, off, -2.2, -.5);
    return ovTag('ليزر', v3(0, -1.6, .2), -230, 60, k1, 'hot') + ovTag(pit ? 'انعكاس ضعيف' : 'انعكاس قوي', v3(.78, -1.97, .1), 90, -420, k2, pit ? '' : 'hot')
      + (xb !== null ? ovTag('حفرة', v3(xb, -.24, .3), -40, -300, k1 * sm(w(32), w(32) + .3, t)) : '') + ovNote('مقطع عرضي · رسم توضيحي مُبطّأ');
  },
});

// A7: "لكن كيف تتحوّل الأصفار والوحدات للعبة؟" — a vortex of digits; a ghost of the game world inside it. "؟"
const A7 = shot(w(44) - .05, w(50) - .05, (lt, t) => {
  const r = R(); r.world.visible = true; r.gridM.uniforms.a.value = .5;
  const br = 1 + .8 * bump(t, w(47) - .1, 1.2);
  for (let i = 0; i < 620; i++) {
    const h1 = hash(i), h2 = hash(i + 1000), rad = 1.1 + h1 * 2.2, y = ((h2 + t * (.08 + h1 * .05)) % 1) * 7 - 3.2;
    const an = i * 2.399 + t * (.5 + (1 - h1) * .7);
    const a = Math.min(1, 3.2 - Math.abs(y)) * (.45 + .55 * hash(i + 7)) * br * clamp(lt * 2 - h1);
    r.digit(v3(Math.cos(an) * rad, y, Math.sin(an) * rad), hash(i + 3) > .55 ? 1 : 0, .16 + .1 * hash(i + 5), a);
  }
  const g = sm(w(49) - .1, w(49) + .5, t);
  if (g > 0) r.gwAt(v3(0, -.2, 0), .75, t * .5, .45 * g, t);
  aim(v3(0, .1, 0), 6.0 - lt * .25, 1200, 700, t * .05, .12, 32);
});

// ═════════ DATA = PARTS OF THE GAME ═════════
// A8: "هذي البيانات تحتوي على أجزاء من اللعبة، مثل الرسومات والأصوات وتعليمات التشغيل،"
const CARDP = [[-.72, 1.15], [.72, 1.15], [0, -.6]];
const A8 = shot(w(50) - .05, w(62) - .05, (lt, t) => {
  const r = R(); r.world.visible = true; r.gridM.uniforms.a.value = .6;
  const asm = ease.out(prog(t, w(50), w(53))), split = sm(w(57) - .1, w(58) + .1, t);
  // digit stream falling into the block
  const st = 1 - prog(t, w(56), w(57));
  for (let i = 0; i < 160 && st > 0; i++) {
    const k = ((t * .55 + hash(i)) % 1), an = hash(i + 2) * 6.283, rr0 = (1 - k) * (1.6 + hash(i + 4));
    r.digit(v3(Math.cos(an) * rr0, 4.2 - 4.0 * k, Math.sin(an) * rr0 * .5), hash(i + 6) > .55 ? 1 : 0, .17, (1 - k) * st * 1.1);
  }
  r.block.visible = true; r.block.position.set(0, .2, 0); r.block.rotation.set(.35 * (1 - split), t * .4 * (1 - split), 0);
  r.BLK.l.intensity = 2 + 3 * bump(t, w(56), .6);
  const ci = [w(58), w(59), w(60)];
  r.BLK.parts.forEach((g, i) => {
    const s0 = clamp(asm * 3 - (2 - i)); g.scale.setScalar(Math.max(.001, s0));
    const fk = sm(ci[i] - .25, ci[i] + .15, t), [cx, cy] = CARDP[i];
    g.position.set(lerp(0, cx, split * .3 + fk * .7), lerp((i - 1) * .52 * (1 + split), cy - .2, fk), 0);
    if (fk > .95) g.scale.setScalar(.001);
  });
  r.paintCards(1);
  [r.CARD_G, r.CARD_A, r.CARD_C].forEach((P, i) => {
    const k = ease.back(prog(t, ci[i] - .05, ci[i] + .3)); if (k <= 0) return;
    const [cx, cy] = CARDP[i];
    P.at(v3(cx, cy, .1), 0, .06 * Math.sin(t * .7 + i), 0, Math.max(.001, k), clamp(k * 1.5), .45 + .5 * bump(t, ci[i], .5));
  });
  aim(v3(0, .3, 0), 3.9, 1060, 740, .08 * Math.sin(lt * .3), .04, 32);
});

// A9: "والبلايستيشن يعالجها ويجمعها عشان تظهر لك اللعبة عالشاشة." — RAM → CPU → GPU → the screen
const A9 = shot(w(62) - .05, w(70) - .05, (lt, t) => {
  const r = R(); r.world.visible = true; r.gridM.uniforms.a.value = .4;
  r.board.visible = true; r.board.position.set(0, -.6, 0);
  const C = r.BRD.chips, bp = n => C[n].top.clone().add(v3(0, -.6, 0));
  const ram = bp('RAM'), cpu = bp('CPU'), gpu = bp('GPU');
  // three data cubes fall into the RAM
  const fin = prog(t, w(62) - .05, w(63) - .1);
  r.BLK.parts.forEach((g, i) => {
    const k = ease.inOut(clamp(fin * 1.4 - i * .2));
    if (k >= 1) { g.scale.setScalar(.001); return; }
    g.scale.setScalar(.32 * (1 - .5 * k)); g.position.copy(lerpV(v3(-1.2 + i * 1.2, 2.6, .6), ram.clone().sub(v3(0, .2, 0)), k)).sub(v3(0, .2, 0));
  });
  r.block.visible = fin < 1; r.block.position.set(0, .2, 0); r.block.rotation.set(0, 0, 0); r.BLK.l.intensity = 2;
  const pulse = (a, b, at, d = .45) => { const k = prog(t, at, at + d); if (k > 0 && k < 1) { const v = lerpV(a, b, ease.inOut(k)); r.glow(v, .7, 0x59c7ff, .9); r.beam(a, b, .025, 0x168bff, .5 * (1 - k), { t: t * 4 }); } };
  C.RAM.glow.material.opacity = .9 * bump(t, w(63) - .2, .7);
  for (let i = 0; i < 3; i++) pulse(ram, cpu, w(63) + i * .14);
  C.CPU.glow.material.opacity = .9 * bump(t, w(63) + .2, 1.0);
  for (let i = 0; i < 3; i++) pulse(cpu, gpu, w(64) + i * .14);
  C.GPU.glow.material.opacity = .9 * bump(t, w(64) + .2, 1.1);
  // the screen rises behind the board and the game assembles
  const sk = ease.out(prog(t, w(65) - .1, w(66) + .3));
  if (sk > 0) {
    r.paintScreen(t, prog(t, w(66) - .1, w(69) + .2));
    r.SCREEN.at(v3(0, .9 + 1.6 * sk, -2.2), -.05, 0, 0, Math.max(.001, sk), clamp(sk * 1.4), .5 + .4 * bump(t, w(69), .6));
    r.beam(gpu, v3(0, .9 + 1.6 * sk - .9, -2.2), .03, 0x59c7ff, .6 * sk * (1 - prog(t, w(69), w(70))), { t: t * 4 });
  }
  const pb = sm(w(65) - .2, w(66) + .4, t);
  aim(v3(0, lerp(-.5, .9, pb), lerp(.2, -1.0, pb)), lerp(4.6, 6.6, pb), 1100, 720, .06 * Math.sin(lt * .4), lerp(.8, .32, pb), 32);
});

// ═════════ RAINBOW ═════════
// A10: "وإذا شفت ألوان قوس قزح على الـCD،" — tilt the disc under a light: the sheen turns into a rainbow
const A10 = shot(w(70) - .05, w(77) - .05, (lt, t) => {
  const r = R(); r.world.visible = true; r.gridM.uniforms.a.value = .5;
  r.discAt(v3(0, .1, 0), .95 - .25 * sm(0, 3, lt), 0, -.15, 1, t * .25);
  r.DISC.u.rain.value = sm(w(72) - .3, w(74) + .3, t);
  const s = sm(0, 3, lt); r.DISC.u.L.value.set(lerp(-.9, .9, s), 1, lerp(.6, -.2, s));
  r.bloom.strength = .55;
  aim(v3(0, .1, 0), 2.3, 1000, 720, -.25 + .2 * s, .25, 32);
});
// A11: "فهي ناتجة عن تفاعل الضوء مع المسارات الدقيقة والمتقاربة على سطحه." — white light in, a fan of colours out
const SPEC = [0x8a5cff, 0x3d6bff, 0x168bff, 0x59c7ff, 0x46d98a, 0xffd85a, 0xff9a4a, 0xff5a6a];
const A11 = shot(w(77) - .05, w(88) - .05, (lt, t) => {
  const r = R(); r.world.visible = false; r.macro.visible = true; r.MAC.u.off.value = 100; r.MAC.u.fr.value = 16; r.MAC.u.focus.value.set(0, 0);
  const hit = v3(0, 0, 0), src = v3(-5.5, 7.5, 2.2);
  const inK = prog(t, w(80) - .2, w(81) + .1);
  r.beam(src, lerpV(src, hit, Math.max(.001, inK)), .12, 0xf4f7fb, .9 * clamp(inK * 4));
  if (inK >= 1) {
    r.glow(hit, 2.2, 0xf4f7fb, .8);
    SPEC.forEach((c, i) => {
      const k = ease.out(prog(t, w(81) + .05 + i * .07, w(83) + i * .07)); if (k <= 0) return;
      const an = lerp(.45, 1.05, i / 7), end = v3(Math.cos(an) * 9, Math.sin(an) * 9, -1.8 + i * .12);
      r.beam(hit, lerpV(hit, end, k), .07, c, .85);
    });
    for (let i = 0; i < 2; i++) r.ring(hit, .5 + ((t * .8 + i / 2) % 1) * 1.6, 0x59c7ff, (1 - ((t * .8 + i / 2) % 1)) * .5, { flat: true });
  }
  r.bloom.strength = .6;
  aim(v3(1, 2.4, 0), 9.5 - lt * .15, 1150, 690, .55, .35, 32);
}, {
  ov: (lt, t) => {
    const k1 = sm(w(80) - .1, w(80) + .2, t) * (1 - prog(t, w(84) - .3, w(84))), k2 = sm(w(84), w(84) + .3, t);
    let dim = '';
    if (k2 > 0) { const [x1, y1] = P2(v3(1.2, 0, 0)), [x2, y2] = P2(v3(1.2, 0, 1.6)); dim = `<svg class="ld" style="opacity:${k2}"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke:#59C7FF;stroke-width:5"/><circle cx="${x1}" cy="${y1}" r="7"/><circle cx="${x2}" cy="${y2}" r="7"/></svg><div class="tag hot" style="opacity:${k2};left:${(x1 + x2) / 2 - 60}px;top:${(y1 + y2) / 2 + 110}px">بين المسارات ${lat('1.6 µm')}</div>`; }
    return ovTag('ضوء أبيض', v3(-2.6, 3.55, 1.05), 170, -120, k1) + dim + ovNote('المسارات المتقاربة تفرّق الضوء لألوان · رسم توضيحي');
  },
});

// ═════════ IN SHORT ═════════
// A12: "يعني بالنهاية، قرص صغير يحمل بيانات هائلة، يقرأها الجهاز ويحوّلها إلى عالم كامل تلعب فيه."
const A12 = shot(w(88) - .05, w(103) - .05, (lt, t) => {
  const r = R(); r.world.visible = true;
  const ins = prog(t, w(95) - .15, w(96) + .5), gk = ease.out(prog(t, w(97) - .1, w(99) + .2));
  r.con.visible = true; r.con.position.set(0, 0, 0);
  if (ins <= 0) {
    r.discAt(v3(0, 1.25, 2.65), .55, 0, 0, 1, t * 1.8); r.DISC.u.sheen.value = 1.4;
    // data spirals into the disc ("بيانات هائلة")
    const dk = sm(w(92) - .2, w(93), t) * (1 - prog(t, w(94) + .3, w(95)));
    for (let i = 0; i < 260 && dk > 0; i++) {
      const k = (t * .5 + hash(i)) % 1, an = hash(i + 3) * 6.283 + k * 3, rad = .2 + (1 - k) * 2.2;
      r.digit(v3(Math.cos(an) * rad, 1.25 + (1 - k) * 1.6 * (hash(i + 8) - .3), 2.65 + Math.sin(an) * rad * .6), hash(i + 2) > .55 ? 1 : 0, .13, dk * (1 - k) * 1.3);
    }
  } else { insertDisc(t, ins, t * 1.8); if (ins > .98) r.disc.visible = false; }
  r.CON.slotGlow.material.opacity = .9 * bump(t, w(96) + .2, .6); r.CON.cl.intensity = 3 * bump(t, w(96) + .25, .9);
  r.CON.strip.color.setHex(0x168bff).lerp(new r.THREE.Color(0x59c7ff), bump(t, w(96) + .25, .9));
  if (gk > 0) {
    r.gwAt(v3(0, .9 + 1.6 * gk, -.4), 1.1 * gk, t * .3, clamp(gk * 1.3), t);
    for (let i = 0; i < 3; i++) r.ring(v3(0, .5, -.3), (.6 + ((t * .6 + i / 3) % 1) * 3) * gk, 0x59c7ff, (1 - ((t * .6 + i / 3) % 1)) * .45 * gk, { flat: true });
    if (t < w(98) + .3) r.grade.flash.value = .25 * bump(t, w(97) - .05, .35);
  }
  const p1 = sm(w(94) + .2, w(96), t), p2 = sm(w(97) - .2, w(99) + .4, t);
  const c = lerpV(lerpV(v3(0, 1.25, 2.65), v3(0, .5, .8), p1), v3(0, 2.4, -.4), p2);
  aim(c, lerp(lerp(2.4, 3.2, p1), 7.4, p2) - lt * .03, 1000, 740, lerp(.2, .35, p1) + .25 * p2 * Math.sin(lt * .25), lerp(lerp(.45, .35, p1), .22, p2), 34);
}, {
  ov: (lt, t) => {
    const k = sm(w(93), w(93) + .3, t) * (1 - prog(t, w(95) - .3, w(95)));
    return ovTag(`حتى ${lat('700 MB')}`, v3(.7, 1.3, 2.65), 140, -260, k, 'hot');
  },
});

// ═════════ CTA ═════════
// A13: "إذا كنت حاب تعرف كيف تسوي مثل هذي الفيديوهات، اكتب «تقنية» في التعليقات."
const A13 = shot(w(103) - .05, VOICE_END + .12, (lt, t) => {
  const r = R(), ts = w(115) + .12;
  r.paintComments({ focus: t > w(112) ? 1 : 0, type: r2(prog(t, w(113) - .1, w(114) + .2)), send: r2(prog(t, ts, ts + .25)), post: r2(prog(t, ts + .15, ts + .8)) });
  const inK = sm(0, .5, lt);
  r.MAIN.at(v3(0, 0, -2 * (1 - inK)), 0, .1 - lt * .02, 0, 1, inK, .4 + .5 * bump(t, ts + .2, .6));
  const send = r.MAIN.pt(100, 1355, .06), ck = sm(w(114), ts - .05, t);
  if (t > w(112)) r.cursorAt(lerpV(v3(1.2, -2.2, .8), send, ck), .16, prog(t, ts, ts + .22));
  r.click(send, t, ts, .5);
  aim(v3(0, 0, 0), 3.0, 1040 + lt * 10, 735, -.06, .04);
});
window.SHOTS = S;

// ═════════ DOM callouts ═════════
const T = (s, e, build, update) => ({ s, e, fi: .08, fo: .12, build, update });
const L = [];
const low = (html, top = 330) => big(html, `top:${top}px`);
const qmark = `<div class="a" style="font-size:170px;font-weight:700;color:#59C7FF;text-shadow:0 0 40px rgba(89,199,255,.6)">؟</div>`;
L.push(T(w(9) + .3, w(10) - .05, r => { r.appendChild(low(qmark, 250)); }, (r, lt, t) => popIn(r.querySelector('.a'), t, w(9) + .35, .35)));
L.push(T(w(49) + .25, w(50) - .05, r => { r.appendChild(low(qmark, 250)); }, (r, lt, t) => popIn(r.querySelector('.a'), t, w(49) + .3, .35)));
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
