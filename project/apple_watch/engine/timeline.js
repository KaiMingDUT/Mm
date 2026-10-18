// KROZO — "كيف تعرف ساعة Apple نبضات قلبك؟"  shots in story time (w(i) = start of word i of the voice-over).
const VOICE_END = 96.75;
const w = i => WT[i];
const sm = (a, b, t) => ease.inOut(prog(t, a, b));
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
const orbit = (c, d, az, elv) => v3(c.x + Math.sin(az) * Math.cos(elv) * d, c.y + Math.sin(elv) * d, c.z + Math.cos(az) * Math.cos(elv) * d);
const P2 = v => R().project(v);
function ovTag(txt, v, dx, dy, k = 1, cls = '') {
  if (k <= 0) return ''; const [x, y] = Array.isArray(v) ? v : P2(v), x2 = x + dx, y2 = y + dy;
  return `<svg class="ld" style="opacity:${k}"><line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}"/><circle cx="${x}" cy="${y}" r="6"/></svg><div class="tag ${cls}" style="opacity:${k};left:${x2}px;top:${y2}px">${txt}</div>`;
}
const ovNote = (txt = 'رسم توضيحي') => `<div class="note">${txt}</div>`;
window.POST3D = (sh, lt, t) => { const o = document.getElementById('ov'); if (o) o.innerHTML = sh && sh.ov ? sh.ov(lt, t, sh) : ''; };

// ───────── heartbeat model ─────────
// bpm over story time (resting 72; climbs while running; 148 on the watch)
const BPMK = [[0, 72], [w(36), 78], [w(41), 132], [w(44), 140], [w(47), 148], [w(48), 148], [w(52), 72], [200, 72]];
const bpmAt = t => { for (let i = 1; i < BPMK.length; i++) if (t <= BPMK[i][0]) { const [a, x] = BPMK[i - 1], [b, y] = BPMK[i]; return x + (y - x) * (t - a) / (b - a); } return 72; };
const PH = []; { let p = 0; for (let i = 0; i <= 11000; i++) { PH.push(p); p += bpmAt(i / 100) / 60 / 100; } }
const phase = t => { const i = clamp(t * 100, 0, 10999), k = Math.floor(i); return PH[k] + (PH[k + 1] - PH[k]) * (i - k); };
const frac = x => x - Math.floor(x);
// blood volume in the wrist over one beat: fast systolic rise, decay with a dicrotic notch (0..1)
const vol = p => p < .13 ? ease.inOut(p / .13) : Math.exp(-(p - .13) * 3.6) * .85 + .15 * Math.exp(-Math.pow((p - .42) / .07, 2)) + .0;
const pulse = t => vol(frac(phase(t)));
const beat = t => Math.exp(-frac(phase(t)) * 9);           // heart icon / ring kick
const bpmShow = t => Math.round(bpmAt(t));
const ppgTrace = t => u => 1 - .8 * vol(frac(phase(t - (1 - u) * 2.2)));   // watch-face mini trace

// ═════════ HOOK ═════════
// S1: the back of the watch — the green lights come on
const S1 = shot(0, w(6) - .05, (lt, t) => {
  const r = R(); r.stage('studio', t);
  r.watch.visible = true; r.WATCH.band.visible = false; r.watch.rotation.set(Math.PI + .55 - .1 * lt, -.4 + lt * .08, .25);
  const on = sm(w(0) - .1, w(1) + .1, t); r.ledsOn(on * (.85 + .15 * Math.sin(t * 31)));
  r.glow(r.watchPt(0, 0, r.WATCH.apexZ - .001), .02 * on, 0x3bff8a, .3 * on);
  r.glow(r.watchPt(.0019, 0, r.WATCH.apexZ - .0006), .003, 0xbfffd5, .7 * on); r.glow(r.watchPt(-.0019, 0, r.WATCH.apexZ - .0006), .003, 0xbfffd5, .7 * on);
  r.lookCam(v3(0, -.004, .2 - lt * .012), v3(0, -.001, 0), 30);
  r.bloom.strength = .45 + .2 * on; r.bloom.threshold = .7;
}, { noPunch: true });
// S2: the front — a beating heart-rate screen
const S2 = shot(w(6) - .05, w(14) - .05, (lt, t) => {
  const r = R(); r.stage('studio', t);
  r.watch.visible = true; r.watch.rotation.set(-.12, .45 - lt * .06, .04);
  r.drawFace({ mode: 'hr', bpm: bpmShow(t), beat: +beat(t).toFixed(2), trace: null });
  const b = beat(t); if (t > w(10)) r.ring(r.watchPt(0, 0, .006), .03 + .05 * (1 - b), 0x59c7ff, .5 * b, .04);
  r.lookCam(orbit(v3(0, 0, 0), .2 - lt * .008, .25, .06), v3(0, .001, 0), 30);
});
// S3: "بدون ما يشوف قلبك" — the heart is far from the wrist
const bodyShot = (lt, t, o = {}) => {
  const r = R(); r.stage('track', t);
  r.pose(r.fig, v3(0, 0, 0), .35, 0, { run: 0, beat: beat(t), face: 1 });
  const P = r.fig.userData; P['sh-1'].rotation.set(-.5, 0, -.25); P['el-1'].rotation.set(-1.25, 0, 0);
  const hp = r.figHeart(r.fig), wp = r.figWatch(r.fig);
  r.glow(hp, .35 + .25 * beat(t), 0x59c7ff, .5 + .5 * beat(t)); r.glow(wp, .22, 0x3bff8a, .55);
  return { hp, wp };
};
const S3 = shot(w(14) - .05, w(19) - .05, (lt, t) => {
  const { hp, wp } = bodyShot(lt, t);
  const c = hp.clone().lerp(wp, .5); R().lookCam(orbit(c, 2.1 - lt * .1, .5, .12), c, 40);
}, { ov: (lt, t) => { const r = R(), hp = r.figHeart(r.fig), wp = r.figWatch(r.fig); return linkX(hp, wp, sm(w(14), w(15), t), sm(w(16), w(16) + .25, t)) + ovTag('القلب', hp, 150, -150, prog(lt, .1, .35)) + ovTag('الساعة', wp, -170, 120, prog(lt, .3, .55)); } });
// dashed link heart ↔ watch with a ✕ in the middle
function linkX(a, b, k, x) {
  if (k <= 0) return ''; const [x1, y1] = P2(a), [x2, y2] = P2(b), mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  return `<svg class="ld" style="opacity:${k}"><line x1="${x1}" y1="${y1}" x2="${x1 + (x2 - x1) * k}" y2="${y1 + (y2 - y1) * k}" style="stroke-dasharray:14 12;stroke:rgba(167,177,194,.8)"/></svg>` +
    (x > 0 ? `<div class="xmark" style="opacity:${x};left:${mx}px;top:${my}px;transform:scale(${.7 + .3 * ease.back(x)})">✕</div>` : '');
}
// S4: "كيف ضوء أخضر يقدر يكشف…" — down to the wrist, the glow on the skin
const S4 = shot(w(19) - .05, w(26) - .05, (lt, t) => {
  const r = R(); r.stage('studio', t);
  r.wristPose(v3(0, 0, 0), .0, .55 + .1 * Math.sin(t * 9), { lift: .0 });
  r.ledsOn(1); r.drawFace({ mode: 'hr', bpm: 72, beat: +beat(t).toFixed(2) });
  const k = ease.inOut(prog(lt, 0, 3.8));
  const c = v3(0, .018, 0); r.lookCam(orbit(c, .34 - .17 * k, .35 + .5 * k, .6 - .45 * k), c, 30);
  r.grade.zb.value = .6 * prog(t, w(26) - .5, w(26) - .05);
});

// ═════════ RUNNING ═════════
const S5 = shot(w(29) - .05, w(36) - .05, (lt, t) => {
  const r = R(); r.stage('track', t);
  const x = lt * 3.2; r.pose(r.fig, v3(x, 0, 0), Math.PI / 2, phase(t) * 0 + t * 9.5, { run: 1, beat: beat(t) * .5, face: 1 });
  r.trackFloor.uniforms.off.value = 0;
  const c = v3(x + .3, 1.0, 0); r.lookCam(orbit(c, 4.6 - lt * .12, -.55 + lt * .05, .12), c, 40);
}, { ov: (lt, t) => { const k = sm(w(33), w(33) + .25, t); if (!k) return ''; const m = Math.min(5, prog(t, w(33), w(36)) * 5), sec = Math.floor(m * 60); return `<div class="clock" style="opacity:${k}"><span class="latin">${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}</span><small>دقائق من الجري</small></div>`; } });
const S5b = shot(w(36) - .05, w(42) - .05, (lt, t) => {
  const r = R(); r.stage('track', t);
  const x = 22 + lt * 3.2; r.pose(r.fig, v3(x, 0, 0), Math.PI / 2, t * 9.5, { run: 1, beat: beat(t), face: 1 });
  const hp = r.figHeart(r.fig), b = beat(t);
  r.glow(hp, .3 + .35 * b, 0x59c7ff, .4 + .6 * b); r.ring(hp, .12 + .35 * (1 - b), 0x59c7ff, .8 * b, .05);
  const c = hp.clone().add(v3(0, .05, 0)); r.lookCam(orbit(c, 2.4 - lt * .08, -.9, .08), c, 40);
});
// S6: glance at the watch — the number climbs
const S6 = shot(w(42) - .05, w(48) - .05, (lt, t) => {
  const r = R(); r.stage('studio', t);
  r.wristPose(v3(0, 0, 0), .15, .5, {});
  const n = Math.round(lerp(96, 148, ease.out(prog(t, w(44), w(47) + .2))));
  r.drawFace({ mode: 'hr', bpm: t < w(44) ? 96 : n, beat: +beat(t).toFixed(2) });
  const c = v3(0, .026, 0); r.lookCam(orbit(c, .25 - lt * .01, -.2 + lt * .03, 1.0), c, 30, .2);
  r.grade.flash.value = .3 * (t >= w(47) ? 1 - prog(t, w(47), w(47) + .3) : 0);
});
// S7: "كيف الساعة عرفت…؟" — slow orbit to the side of the wrist
const S7 = shot(w(48) - .05, w(60) - .05, (lt, t) => {
  const r = R(); r.stage('studio', t);
  r.wristPose(v3(0, 0, 0), 0, .45, {});
  r.drawFace({ mode: 'hr', bpm: bpmShow(t), beat: +beat(t).toFixed(2) });
  const k = ease.inOut(prog(t, w(48), w(59) + .5));
  const c = v3(0, .016, 0); r.lookCam(orbit(c, .3 - .08 * k, -.9 + 1.35 * k, .6 - .5 * k), c, 30);
}, { ov: (lt, t) => ovTag('معصمك', R().watchPt(0, -.026, -.02), -120, 210, sm(w(59), w(59) + .25, t)) });

// ═════════ THE SECRET: green light under the watch ═════════
const S8 = shot(w(60) - .05, w(69) - .05, (lt, t) => {
  const r = R(); r.stage('studio', t);
  const up = ease.inOut(prog(t, w(61), w(64)));
  r.wristPose(v3(0, 0, 0), 0, .5, { lift: .05 * up, flip: 0 });
  r.watch.rotateX(-.9 * up); r.WATCH.band.visible = up < .02;
  r.ledsOn(.9 + .1 * Math.sin(t * 29));
  const gp = r.armM.uniforms.gp.value; r.glow(gp.clone().add(v3(0, .002, 0)), .035, 0x3bff8a, .25 + .15 * up);
  r.glow(r.watchPt(0, 0, r.WATCH.apexZ - .002), .015, 0x3bff8a, .4 * up);
  const c = v3(0, .02 + .03 * up, 0); r.lookCam(orbit(c, .3 - .02 * lt, .9, .18 + .25 * up), c, 30);
  r.bloom.strength = .4; r.bloom.threshold = .75;
}, { ov: (lt, t) => ovTag('الضوء الأخضر', R().armM.uniforms.gp.value, 170, 220, sm(w(64), w(64) + .3, t), 'hot') });
// S9/S10: the sensor up close — LEDs (slow motion blink) and the photodiodes
const backMacro = (lt, t, o = {}) => {
  const r = R(); r.stage('studio', t);
  r.watch.visible = true; r.watch.rotation.set(Math.PI + (o.tilt ?? .25), o.ry ?? 0, (o.rz ?? 0) + lt * .03); r.WATCH.band.visible = false;
  const blink = o.slow ? (frac(t * 2.2) < .5 ? 1 : .15) : 1;
  r.ledsOn(o.led * blink);
  if (o.led * blink > .3) { r.glow(r.watchPt(.0019, 0, r.WATCH.apexZ - .0006), .0035, 0xbfffd5, .6 * o.led * blink); r.glow(r.watchPt(-.0019, 0, r.WATCH.apexZ - .0006), .0035, 0xbfffd5, .6 * o.led * blink); }
  for (const d of r.WATCH.pds) d.material.emissiveIntensity = (o.pd ?? 0) * (.3 + .2 * Math.sin(t * 6));
  r.bloom.strength = .4; r.bloom.threshold = .75;
};
const S9 = shot(w(69) - .05, w(79) - .05, (lt, t) => {
  backMacro(lt, t, { led: 1, slow: t > w(75) - .05, tilt: .3 - .02 * lt });
  R().lookCam(v3(0, -.002, .062 - lt * .002), v3(0, -.0012, 0), 30);
}, {
  ov: (lt, t) => {
    const r = R(), k = sm(w(72), w(72) + .3, t);
    return ovTag('<span class="latin">LED</span> أخضر', r.watchPt(.0019, 0, r.WATCH.apexZ), 190, -260, k, 'hot') + ovTag('<span class="latin">LED</span> أخضر', r.watchPt(-.0019, 0, r.WATCH.apexZ), -200, -330, k, 'hot') +
      (t > w(75) ? `<div class="slow" style="opacity:${sm(w(75), w(75) + .2, t)}">تصوير بطيء جدًا · تومض مئات المرات في الثانية</div>` : '');
  },
});
const S10 = shot(w(79) - .05, w(85) - .05, (lt, t) => {
  backMacro(lt, t, { led: 1, pd: sm(w(80), w(81), t), tilt: .45, ry: .4 - lt * .05 });
  R().lookCam(v3(0, -.004, .07 - lt * .002), v3(0, -.001, 0), 30);
}, { ov: (lt, t) => { const r = R(), k = sm(w(80), w(80) + .3, t); const a = Math.PI / 4, q = .0078; return ovTag('حساسات ضوء', r.watchPt(Math.cos(a) * q, Math.sin(a) * q, r.WATCH.domeZ(q)), -150, -330, k) + ovTag('', r.watchPt(-Math.cos(a) * q, Math.sin(a) * q, r.WATCH.domeZ(q)), 0, 0, 0) ; } });

// ═════════ HOW IT WORKS ═════════
const S11 = shot(w(116) - .05, w(126) - .05, (lt, t) => {
  const r = R(); r.stage('studio', t);
  r.wristPose(v3(0, 0, 0), -.25 + lt * .05, .5, {});
  r.drawFace({ mode: 'hr', bpm: 72, beat: +beat(t).toFixed(2), trace: ppgTrace(t) });
  const c = v3(0, .026, 0); r.lookCam(orbit(c, .27 - lt * .006, .2, 1.0), c, 30);
});
// S12: "لكن بطريقة مختلفة" — whip-flip to the back: it uses light
const S12 = shot(w(126) - .05, w(129) - .05, (lt, t) => {
  const r = R(); r.stage('studio', t);
  const f = ease.inOut(prog(t, w(127), w(128) + .1));
  r.watch.visible = true; r.watch.rotation.set(-.15 + Math.PI * f, .3 + 2 * Math.PI * f * .25, 0);
  r.drawFace({ mode: 'hr', bpm: 72, beat: +beat(t).toFixed(2) }); r.ledsOn(f);
  r.glow(r.watchPt(0, 0, r.WATCH.apexZ - .001), .025 * f, 0x3bff8a, .4 * f);
  r.lookCam(v3(0, 0, .2), v3(0, 0, 0), 30);
  r.grade.zb.value = .8 * Math.sin(Math.PI * prog(t, w(127), w(128) + .1));
  r.bloom.strength = .5; r.bloom.threshold = .6;
});
// S13: every beat sends a pulse wave down the arm to the wrist
const S13 = shot(w(150) - .05, w(158) - .05, (lt, t) => {
  const r = R(); const { hp, wp } = bodyShot(lt, t);
  const P = r.fig.userData, sh = P['sh-1'].getWorldPosition(v3(0, 0, 0)), elb = P['el-1'].getWorldPosition(v3(0, 0, 0));
  const path = [hp, sh, elb, wp], seg = [0]; for (let i = 1; i < 4; i++) seg.push(seg[i - 1] + path[i].distanceTo(path[i - 1]));
  for (let k = 0; k < 3; k++) {
    const ph = frac(phase(t)) - k * .0, u = clamp(ph / .55) * seg[3];
    if (ph > .7 || k) continue;
    let i = 1; while (i < 3 && seg[i] < u) i++; const p = path[i - 1].clone().lerp(path[i], (u - seg[i - 1]) / (seg[i] - seg[i - 1]));
    r.glow(p, .22, 0x9fe1ff, 1 - prog(ph, .55, .7));
  }
  r.glow(wp, .3 * (.4 + .6 * pulse(t - .45)), 0x3bff8a, .6);
  const c = hp.clone().lerp(wp, .5); r.lookCam(orbit(c, 1.9 - lt * .05, .9, .1), c, 40);
}, { ov: () => ovNote('توضيح مبسّط') });
// S14: "ما تشوف قلبك ولا تقيس نبضه مباشرة" — callback: two ✕
const S14 = shot(w(181) - .05, w(190) - .05, (lt, t) => {
  const { hp, wp } = bodyShot(lt, t);
  const c = hp.clone().lerp(wp, .5); R().lookCam(orbit(c, 2.2 - lt * .06, -.4, .1), c, 40);
}, { ov: (lt, t) => { const r = R(), hp = r.figHeart(r.fig), wp = r.figWatch(r.fig); return linkX(hp, wp, sm(w(181), w(182), t), sm(w(184), w(184) + .25, t)) + (t > w(187) ? `<div class="pill" style="opacity:${sm(w(187), w(187) + .25, t)}">ما تقيس نبضه مباشرة ✕</div>` : ''); } });
// S15: the payoff — the number on the watch
const S15 = shot(w(199) - .05, VOICE_END + .12, (lt, t) => {
  const r = R(); r.stage('studio', t);
  r.wristPose(v3(0, 0, 0), .1 - lt * .04, .55, {});
  r.drawFace({ mode: 'hr', bpm: 72, beat: +beat(t).toFixed(2), trace: ppgTrace(t) });
  const k = ease.inOut(prog(lt, 0, 3.5)); const c = v3(0, .026, 0); r.lookCam(orbit(c, .18 + .14 * k, .1, 1.15 - .3 * k), c, 30);
  r.grade.flash.value = .25 * (t >= w(203) ? 1 - prog(t, w(203), w(203) + .3) : 0);
});
window.SHOTS = S;

// ═════════ 2D scenes: cross-section, waveform, callouts ═════════
const L = [];
const T = (s, e, build, update) => ({ s, e, fi: .08, fo: .12, build, update });
// cross-section scene: opts(lt, t) → XS.draw options; labels(lt, t, cam, pdHit) → html for the label layer
function X(s, e, opts, labels) {
  return {
    s, e, xs: true, fi: .25, fo: .25,
    build(root) { root.appendChild(el('<canvas width="1080" height="1920" style="position:absolute;inset:0"></canvas>')); root.appendChild(el('<div class="xl" style="position:absolute;inset:0"></div>')); },
    update(root, lt, t) {
      const o = opts(lt, t); o.t = t;
      const hit = XS.draw(root.firstChild.getContext('2d'), o);
      root.lastChild.innerHTML = labels ? labels(lt, t, o.cam, hit, o) : '';
    },
  };
}
const xTag = (txt, x, y, c, dx, dy, k, cls = '') => k > 0 ? ovTag(txt, XS.pt(x, y, c), dx, dy, k, cls) : '';
const CAM0 = { x: 540, y: 1150, s: 1 };
const camL = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), s: lerp(a.s, b.s, k) });
// X1: "إيش يصير داخل جسمك؟" — the wrist opens into a magnified section
const X1 = X(w(26) - .05, w(29) - .05, (lt, t) => ({ cam: camL({ x: 540, y: 880, s: 2.6 }, CAM0, ease.inOut(prog(lt, 0, 1.6))), rays: { g: .6 * sm(w(27), w(28), t) }, pulse: pulse(t) * .5 }), (lt, t) => `<div class="note">رسم توضيحي مكبّر</div>`);
// X2: "…كمية الضوء اللي يرجع من جلدك"
const X2 = X(w(85) - .05, w(88) - .05, (lt, t) => ({ cam: camL({ x: 540, y: 1000, s: 1.25 }, { x: 540, y: 1050, s: 1.1 }, prog(lt, 0, 2.5)), rays: { g: 1 }, pulse: pulse(t) * .4, absorbK: .2 }),
  (lt, t, c) => xTag('ضوء راجع', XS.PD[1], XS.dome(XS.PD[1]) + 20, c, 40, 280, sm(w(85), w(85) + .3, t), 'hot') + `<div class="note">رسم توضيحي مكبّر</div>`);
// X3: "ليش أخضر؟ مو أحمر أو أزرق؟" — three colours, three fates
const rgbK = t => ({ g: sm(w(89), w(90), t) * (1 - .7 * sm(w(93), w(94), t)), r: sm(w(94), w(94) + .3, t) * (1 - .7 * sm(w(95), w(96), t)), b: sm(w(96), w(96) + .3, t) });
const X3 = X(w(88) - .05, w(97) - .05, (lt, t) => {
  const k = rgbK(t), col = k.b > .5 ? '80,140,255' : k.r > .5 ? '255,84,96' : '59,255,138';
  return { cam: CAM0, rays: k, pulse: pulse(t) * .4, ledX: [540], ledCol: col, ledA: 1 };
}, (lt, t) => {
  const k = rgbK(t), chip = (c, txt, a, on) => `<span class="cchip" style="opacity:${.35 + .65 * a};border-color:${c};${on ? `box-shadow:0 0 26px ${c}` : ''}"><i style="background:${c}"></i>${txt}</span>`;
  return `<div class="chips">${chip('#3BFF8A', 'أخضر', sm(w(90), w(91), t), t < w(94))}${chip('#FF5460', 'أحمر', sm(w(94), w(94) + .2, t), t >= w(94) && t < w(96))}${chip('#508CFF', 'أزرق', sm(w(96), w(96) + .2, t), t >= w(96))}</div><div class="note">رسم توضيحي مكبّر</div>`;
});
// X4: "لأن الدم يمتص الضوء الأخضر بشكل جيد" — close on the vessel
const X4 = X(w(97) - .05, w(104) - .05, (lt, t) => ({ cam: camL({ x: 540, y: 1150, s: 1.15 }, { x: 540, y: 1230, s: 1.55 }, ease.inOut(prog(lt, 0, 3))), rays: { g: 1 }, pulse: pulse(t) * .4, absorbK: .85, vesselGlow: sm(w(99), w(100), t) }),
  (lt, t, c) => xTag('الدم يمتص الأخضر', 760, XS.VY, c, -60, 300, sm(w(99), w(99) + .3, t), 'hot') + `<div class="note">رسم توضيحي مكبّر</div>`);
// X5: "…تلتقط التغيّرات الصغيرة في تدفّق الدم مع كل نبضة" — the vessel pulses, the sensors flicker
const meter = (lvl, k, lab = 'الضوء الراجع للحساس') => `<div class="meter2" style="opacity:${k}"><div class="ml">${lab}</div><div class="bar"><div class="f" style="width:${(lvl * 100).toFixed(1)}%"></div></div></div>`;
const X5 = X(w(104) - .05, w(116) - .05, (lt, t) => ({ cam: camL({ x: 540, y: 1150, s: 1.05 }, { x: 540, y: 1100, s: 1 }, prog(lt, 0, 6)), rays: { g: 1 }, pulse: pulse(t), absorbK: .3 }),
  (lt, t) => meter(.35 + .55 * (1 - pulse(t)), sm(w(107), w(107) + .3, t)) + `<div class="note">التمدد مبالغ فيه للتوضيح</div>`);
// X6: "لما تتغيّر كمية الدم… تتغيّر كمية الضوء اللي ترجع" — manual swell: more blood → less light back
const sw6 = t => sm(w(135), w(137), t) * (1 - sm(w(147) + .1, w(148) + .2, t));
const X6 = X(w(129) - .05, w(150) - .05, (lt, t) => ({ cam: camL({ x: 540, y: 1150, s: 1.3 }, { x: 540, y: 1080, s: 1.02 }, sm(w(142), w(143) + .2, t)), rays: { g: 1 }, pulse: sw6(t), absorbK: .25 }),
  (lt, t, c) => {
    const s = sw6(t), more = s > .5;
    return xTag(more ? 'دم أكثر' : 'دم أقل', 300, XS.VY, c, 60, 260, sm(w(136), w(136) + .3, t) * (1 - sm(w(142), w(142) + .2, t)) + sm(w(148), w(148) + .3, t) * 0, 'hot') +
      meter(.25 + .65 * (1 - s), sm(w(143), w(143) + .3, t), more ? 'ضوء راجع أقل' : 'ضوء راجع أكثر') + `<div class="note">رسم توضيحي مكبّر</div>`;
  });
// X7: "فتلتقط الساعة نمط متكرر…" — the trace builds under the section
function ppgSVG(t, x0, x1, y0, h, span = 3.2, o = {}) {
  let d = ''; const n = 160;
  for (let i = 0; i <= n; i++) { const u = i / n, tt = t - (1 - u) * span; if (tt < (o.from ?? -1e9)) continue; const x = x1 - (1 - u) * (x1 - x0), y = y0 + h - h * (1 - .85 * vol(frac(phase(tt)))) * .9 - h * .05; d += (d ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); }
  return `<path d="${d}" fill="none" stroke="#59C7FF" stroke-width="7" stroke-linejoin="round" stroke-linecap="round" style="filter:drop-shadow(0 0 10px rgba(89,199,255,.8))"/>`;
}
const X7 = X(w(158) - .05, w(166) - .05, (lt, t) => ({ cam: { x: 540, y: 1250, s: 1.0 }, rays: { g: 1 }, pulse: pulse(t), absorbK: .3 }),
  (lt, t) => { const k = sm(w(158), w(158) + .4, t); return `<div class="scope" style="opacity:${k}"><div class="sl">كمية الضوء الراجع</div><svg width="900" height="300" style="position:absolute;left:30px;top:70px">${ppgSVG(t, 0, 900, 0, 260, 3.2, { from: w(158) - .3 })}</svg></div><div class="note">رسم توضيحي</div>`; });
// W1: "تتكرر مع نبضات قلبك… تحسب عدد النبضات في الدقيقة" — count the peaks
const W1s = w(166) - .05, W1e = w(181) - .05;
const W1 = {
  s: W1s, e: W1e, xs: true, fi: .25, fo: .25,
  build(root) { root.appendChild(el('<div class="mon" style="position:absolute;inset:0"></div>')); },
  update(root, lt, t) {
    const pk = []; const p0 = Math.ceil(phase(t - 3.4)); for (let p = p0; p <= phase(t); p++) { // peak of beat p sits at phase p + .13
      let lo = t - 3.4, hi = t; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (phase(m) < p + .13) lo = m; else hi = m; } if (phase(hi) >= p + .13 && hi <= t) pk.push([hi, p]); }
    const cnt = Math.max(0, Math.floor(phase(t) - phase(w(170)))), c2 = sm(w(176), w(180), t);
    const x = tt => 80 + (1 - (t - tt) / 3.4) * 920;
    let marks = ''; for (const [tt, p] of pk) { if (tt < w(170)) continue; const n = Math.floor(p + .13 - phase(w(170))) + 1; if (n < 1) continue; marks += `<div class="pk" style="left:${x(tt)}px;top:${1090 - 330 * .9 * .85 - 70}px">${n}</div>`; }
    const sec = Math.min(60, prog(t, w(176), w(180)) * 60);
    root.firstChild.innerHTML = `<svg width="1080" height="1920" style="position:absolute;inset:0"><line x1="60" y1="1110" x2="1020" y2="1110" stroke="rgba(167,177,194,.25)" stroke-width="2"/>${ppgSVG(t, 80, 1000, 750, 360, 3.4)}</svg>${marks}
      <div class="cnt" style="opacity:${1 - c2}"><b class="latin">${Math.max(0, cnt)}</b><small>نبضة</small></div>
      <div class="rate" style="opacity:${c2}"><div class="timer"><div style="width:${sec / 60 * 100}%"></div></div><div class="tl"><span class="latin">${Math.round(sec)}</span> ثانية</div><b class="latin">${Math.round(lerp(0, 72, ease.out(c2)))}</b><small>نبضة في الدقيقة</small></div>
      <div class="note">رسم توضيحي</div>`;
  },
};
// X8: "هي تراقب تغيّرات الضوء المرتبطة بتدفّق الدم تحت جلدك" — everything together, pull out
const X8 = X(w(190) - .05, w(199) - .05, (lt, t) => ({ cam: camL({ x: 540, y: 1180, s: 1.2 }, { x: 540, y: 1080, s: .92 }, ease.inOut(prog(lt, 0, 5))), rays: { g: 1 }, pulse: pulse(t), absorbK: .3 }),
  (lt, t) => `<div class="scope sm" style="opacity:${sm(w(192), w(192) + .3, t)}"><svg width="900" height="200" style="position:absolute;left:30px;top:20px">${ppgSVG(t, 0, 900, 0, 170)}</svg></div><div class="note">رسم توضيحي مكبّر</div>`);
for (const x of [X1, X2, X3, X4, X5, X6, X7, W1, X8]) L.push(x);

// blending between 2D sections and 3D shots (no dips to black)
{
  const all = [...S.map(s => ({ s: s.s, e: s.e, ref: s, is3: true })), ...L.filter(x => x.xs).map(x => ({ s: x.s, e: x.e, ref: x, is3: false }))].sort((a, b) => a.s - b.s);
  for (let i = 0; i < all.length - 1; i++) {
    const a = all[i], b = all[i + 1]; if (b.s - a.e > .3) continue;
    if (!a.is3) { a.ref.e = b.s + .26; a.ref.fo = b.is3 ? .26 : .03; if (!b.is3) b.ref.fi = .22; }
    else if (!b.is3) { a.ref.e = b.s + .3; b.ref.fi = .25; }
  }
}

// DOM callouts
const badge = (txt, kind) => `<span class="badge ${kind}">${txt}</span>`;
const low = (html, top = 1580) => big(html, `top:${top}px`);
L.push(T(w(126) - .05, w(129) + .2, r => { r.appendChild(low(`<div class="a">${badge('بالضوء ✓', 'yes')}</div>`)); }, (r, lt, t) => popIn(r.querySelector('.a'), t, w(128))));
L.push(T(w(48) - .05, w(60) - .05, r => { r.appendChild(low(`<div class="a" style="font-size:150px;font-weight:700;color:#59C7FF;text-shadow:0 0 40px rgba(89,199,255,.6)">؟</div>`, 330)); }, (r, lt, t) => { popIn(r.querySelector('.a'), t, w(59) + .3, .35); }));
const outro = outroScene(VOICE_END + .05, VOICE_END + 2.55);
L.push(outro);

// caption keywords (global word indices) get the KROZO selection box
const KEYS = new Set([1, 10, 17, 22, 28, 32, 47, 59, 64, 73, 80, 87, 91, 99, 112, 115, 128, 137, 145, 161, 178, 189, 195, 201]);

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
