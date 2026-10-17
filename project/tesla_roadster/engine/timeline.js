// KROZO — Tesla Roadster: "كيف تمشي مقلوبة وما تطيح؟"  (story time = original recording; WARP tightens pauses)
const VOICE_END = 102.95;
const w = i => WT[i];                                   // start time of word i
const CREDIT = 'لقطات: تسلا · عرض الرودستر 2026';

// ───────── helpers ─────────
function panel(r, { top = 0, h = 1920 } = {}) {
  const p = el(`<div class="pn" style="position:absolute;left:0;right:0;top:${top}px;height:${h}px;overflow:hidden">
    <img style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,11,18,.85) 0%,rgba(8,11,18,0) 22%,rgba(8,11,18,0) 58%,rgba(8,11,18,.55) 72%,rgba(8,11,18,.9) 100%)"></div>
    <div class="cr" style="position:absolute;left:28px;bottom:150px;font-size:22px;color:rgba(167,177,194,.9);background:rgba(8,11,18,.6);padding:4px 12px;border-radius:8px">${CREDIT}</div>
  </div>`);
  r.appendChild(p); return p;
}
// play a list of [startStory, endStory, clip, clipStart, rate] inside a panel
function playClips(p, t, list, zoom = .06) {
  const img = p.querySelector('img');
  const cur = list.find(c => t >= c[0] && t < c[1]) || list[list.length - 1];
  const [s0, s1, name, c0 = 0, rate = 1] = cur;
  setClip(img, name, c0 + Math.max(0, t - s0) * rate);
  const k = prog(t, s0, s1);
  img.style.transform = `scale(${1.04 + zoom * k})`;
}
const big = (txt, extra = '') => el(`<div class="bg" style="position:absolute;left:50px;right:50px;text-align:center;${extra}">${txt}</div>`);
function popIn(node, t, at, dur = .35, rise = 26) {
  const k = ease.back(prog(t, at, at + dur));
  node.style.opacity = clamp(prog(t, at, at + dur * .6));
  node.style.transform = `translateY(${(1 - k) * rise}px) scale(${.92 + .08 * k})`;
  return k;
}
const fade = (node, t, a, b, fi = .25, fo = .25) => node.style.opacity = Math.min(prog(t, a, a + fi), 1 - prog(t, b - fo, b));
const tag = (txt, color = C.blue) => `<span style="display:inline-block;padding:10px 26px;border-radius:16px;background:${color};color:${C.ink};font-weight:700">${txt}</span>`;
const sweep = (a, b, t) => ease.inOut(prog(t, a, b));
const V = (x, y, z) => G3.V(x, y, z);

// ───────── 1. Hook: real jump footage (0 – 2.85) ─────────
const sHook = {
  s: 0, e: 2.9, fi: .01, fo: .15,
  build(r) {
    this.p = panel(r);
    r.appendChild(big(`<div class="k" style="font-size:44px;color:${C.gray};font-weight:500">إيلون ماسك</div>
      <div class="h" style="font-size:118px;font-weight:700;line-height:1.1;margin-top:6px;text-shadow:0 6px 40px rgba(0,0,0,.8)"><span class="hl">جنّ</span> رسميًا!</div>`, 'top:170px'));
  },
  update(r, lt, t) {
    playClips(this.p, t, [[0, 2.9, 't_flip', 0, 1]], .06);
    popIn(r.querySelector('.k'), t, .1);
    const k = popIn(r.querySelector('.h'), t, w(2) - .05, .3, 40);
    r.querySelector('.h').style.transform += ` scale(${1 + .06 * Math.max(0, 1 - prog(t, w(2), w(2) + .4))})`;
  },
};

// ───────── 2. Real climb up the wall + live HUD (2.85 – 8.25) ─────────
const sRamp = {
  s: 2.85, e: 8.3, fi: .1, fo: .1,
  build(r) {
    this.p = panel(r);
    r.appendChild(el(`<div class="hud" style="position:absolute;left:70px;right:70px;top:1030px;display:flex;justify-content:space-between;direction:rtl">
      <div style="background:rgba(8,11,18,.82);border:1.5px solid #2A3446;border-radius:20px;padding:16px 26px;min-width:290px">
        <div style="font-size:28px;color:${C.gray}">الارتفاع</div><div style="font-size:72px;font-weight:700"><span class="hv latin" style="font-family:PlexLatin">0</span> <span style="font-size:36px">م</span></div></div>
      <div style="background:rgba(8,11,18,.82);border:1.5px solid #2A3446;border-radius:20px;padding:16px 26px;min-width:290px">
        <div style="font-size:28px;color:${C.gray}">الميلان</div><div style="font-size:72px;font-weight:700"><span class="av latin" style="font-family:PlexLatin">0</span><span style="font-size:44px">°</span></div></div>
    </div>`));
    r.appendChild(el(`<div class="tel" style="position:absolute;left:70px;right:70px;text-align:center;top:990px;font-size:24px;color:${C.gray}">أرقام من شاشة بث تسلا</div>`));
  },
  update(r, lt, t) {
    const rate = 1.22, c0 = 1.0;
    playClips(this.p, t, [[2.85, 8.3, 't_climb', c0, rate]], .04);
    const ct = c0 + (t - 2.85) * rate;
    const u = ease.inOut(prog(ct, 1.7, 7.4));
    r.querySelector('.hv').textContent = (21 * Math.sin(u * Math.PI / 2) ** 1.4).toFixed(u < .45 ? 1 : 0);
    r.querySelector('.av').textContent = Math.round(170 * u);
    const hud = r.querySelector('.hud'); popIn(hud, t, 3.0);
    hud.firstElementChild.style.boxShadow = (t > w(10) - .05 && t < w(10) + .6) ? `0 0 0 3px ${C.blue}, 0 0 40px rgba(22,139,255,.5)` : 'none';
    fade(r.querySelector('.tel'), t, 3.3, 8.3);
  },
};

// ───────── 3. Real: at the top, upside down (8.25 – 9.4) ─────────
const sUnder = {
  s: 8.25, e: 9.42, fi: .06, fo: .1,
  build(r) { this.p = panel(r); },
  update(r, lt, t) { playClips(this.p, t, [[8.25, 9.42, 't_top', 0, 1.0]], .08); },
};

// ───────── 4. Real: glued to the vertical wall — "ما تطيح!" (9.4 – 11.1) ─────────
const sGlued = {
  s: 9.38, e: 11.12, fi: .06, fo: .1,
  build(r) { this.p = panel(r); r.appendChild(big(`<div class="st" style="font-size:120px;font-weight:700;text-shadow:0 6px 40px rgba(0,0,0,.8)">ما <span class="hl">تطيح!</span></div>`, 'top:250px')); },
  update(r, lt, t) {
    playClips(this.p, t, [[9.38, 11.12, 't_wall', 0, .6]], .1);
    popIn(r.querySelector('.st'), t, w(22) - .05, .3, 30);
  },
};

// ───────── 5. Real: flip & landing (11.1 – 16.1) ─────────
const sFlight = {
  s: 11.1, e: 16.12, fi: .08, fo: .12,
  build(r) { this.p = panel(r); r.appendChild(big(`<div class="x" style="font-size:60px;font-weight:700">تتشقلب في الهوا… <span class="hl">وتنزل بهدوء</span></div>`, 'top:240px')); },
  update(r, lt, t) {
    playClips(this.p, t, [[11.1, 16.12, 't_fall', 0, 1.14]], .05);
    fade(r.querySelector('.x'), t, w(27), 16.1, .3, .2);
  },
};

// ───────── 6. Real: "مو Rocket League… صار في الحياة الحقيقية" (16.1 – 20.95) ─────────
const sReal = {
  s: 16.1, e: 20.95, fi: .08, fo: .12,
  build(r) {
    this.p = panel(r);
    r.appendChild(el(`<div class="rl" style="position:absolute;left:0;right:0;top:260px;text-align:center">
      <span style="position:relative;display:inline-block;padding:14px 34px;border-radius:18px;background:rgba(8,11,18,.85);border:2px solid #2A3446;font-family:PlexLatin;font-weight:700;font-size:58px;direction:ltr">Rocket League
      <i class="sl" style="position:absolute;left:-10px;right:-10px;top:50%;height:7px;background:${C.blue};border-radius:4px;transform-origin:left;transform:scaleX(0)"></i></span>
      <div style="font-size:30px;color:${C.gray};margin-top:12px">مو لعبة فيديو</div></div>`));
    r.appendChild(big(`<div class="rv" style="font-size:72px;font-weight:700">${tag('حقيقي 100%')}</div>`, 'top:270px'));
  },
  update(r, lt, t) {
    playClips(this.p, t, [[16.1, 18.4, 't_land', 0, 1], [18.4, 20.95, 't_jump', .6, 1.1]], .06);
    const rl = r.querySelector('.rl');
    popIn(rl, t, w(39) - .1); rl.style.opacity = Math.min(+rl.style.opacity, 1 - prog(t, w(41) - .2, w(41)));
    r.querySelector('.sl').style.transform = `scaleX(${sweep(w(40), w(40) + .3, t)})`;
    popIn(r.querySelector('.rv'), t, w(44) - .05, .3, 30);
  },
};

// ───────── 7. Real: "هذي تسلا رودستر الجديدة… إيلون ماسك" (20.95 – 24.7) ─────────
const sName = {
  s: 20.95, e: 24.72, fi: .1, fo: .12,
  build(r) {
    this.p = panel(r);
    r.appendChild(el(`<div class="nm" style="position:absolute;left:70px;right:70px;top:250px">
      <div style="font-family:PlexLatin;font-weight:700;font-size:92px;direction:ltr;text-align:left;line-height:1">Tesla <span style="color:${C.blue}">Roadster</span></div>
      <div style="font-size:34px;color:${C.gray};margin-top:10px">الجيل الجديد · كُشف عنها 15 أكتوبر 2026</div>
      <div class="ms" style="margin-top:18px;opacity:0;font-size:38px">${tag('أعلن عنها إيلون ماسك')}</div></div>`));
  },
  update(r, lt, t) {
    playClips(this.p, t, [[20.95, 24.72, 't_rear', 0, .5]], .06);
    popIn(r.querySelector('.nm'), t, w(47) - .1, .4, 30);
    popIn(r.querySelector('.ms'), t, w(53) - .1);
  },
};

// ───────── 8. Question beat: "لكن لحظة… كيف…وما تطيح؟!" (24.7 – 29.45) ─────────
const sQ1 = {
  s: 24.7, e: 29.47, fi: .12, fo: .15,
  build(r) {
    r.appendChild(big(`<div class="k" style="font-size:52px;color:${C.gray}">لكن لحظة…</div>
      <div class="h" style="font-size:120px;font-weight:700;line-height:1.15;margin-top:18px">كيف ما <span class="hl">تطيح</span>؟</div>`, 'top:250px'));
  },
  update(r, lt, t) {
    const a = t * .35;
    G3.set({ opacity: .9, ramp: false, grid: false, pose: { p: V(0, 3, 0), q: G3.qMul(G3.Q(0, a, 0), G3.Q(0, 0, Math.PI)) }, cam: V(0, 3.6, 11), look: V(0, 3, 0), fov: 34, bloom: .9 });
    popIn(r.querySelector('.k'), t, w(55) - .05);
    const h = r.querySelector('.h'); popIn(h, t, w(57) - .05, .4, 30);
    h.style.filter = `blur(${(1 - prog(t, w(57), w(57) + .4)) * 8}px)`;
  },
};

// ───────── 9–10. Secret #1: suction (29.45 – 38.95) ─────────
const sFans = {
  s: 29.45, e: 38.95, fi: .12, fo: .15,
  build(r) {
    r.appendChild(el(`<div class="tt" style="position:absolute;left:70px;right:70px;top:250px;text-align:right">
      <div style="font-size:34px;color:${C.cyan};font-weight:500">السر الأول</div>
      <div style="font-size:84px;font-weight:700;line-height:1.15">قوة <span class="hl">الالتصاق</span> بالطريق</div></div>`));
    r.appendChild(el(`<div class="lt label c" style="opacity:0;font-size:32px">ضغط الهوا من الخارج</div>`));
    r.appendChild(el(`<div class="lb label" style="opacity:0;font-size:30px;color:${C.gray}">ضغط أقل تحت السيارة</div>`));
    r.appendChild(el(`<div class="lf label c" style="opacity:0;font-size:30px">مراوح تسحب الهوا</div>`));
  },
  update(r, lt, t) {
    const rot = Math.PI * sweep(w(86), w(90) + .3, t);                 // road + car flip to upside down
    const cosr = Math.cos(rot), sinr = Math.sin(rot);
    const carPos = V(-sinr * 0.0, cosr * 0.0, 0);
    const q = G3.Q(0, 0, rot);
    const xr = sweep(w(70), w(70) + .6, t);
    const camA = lerp(-.55, -.2, sweep(29.5, 38.9, t));
    G3.set({
      opacity: 1, road: true, roadRot: rot, grid: false, pose: { p: carPos, q }, xray: xr,
      fans: sweep(w(73) - .1, w(73) + .3, t), particles: 'suck', partK: sweep(w(74), w(74) + .5, t) * .9,
      botArrows: 1 - .75 * sweep(w(78), w(80), t), topArrows: sweep(w(81), w(82) + .3, t),
      cam: V(Math.sin(camA) * 9, lerp(lerp(1.2, 2.2, sweep(29.5, 33, t)), -3.2, rot / Math.PI), Math.cos(camA) * 9), look: V(0, lerp(.6, -.7, rot / Math.PI), 0), fov: 38, bloom: .6,
    });
    fade(r.querySelector('.tt'), t, 29.5, 31.6, .3, .35);
    const lab = (cls, p, a, b) => { const n = r.querySelector(cls), s = G3.project(p); n.style.left = (s[0] - 160) + 'px'; n.style.top = (s[1] - 30) + 'px'; fade(n, t, a, b); };
    lab('.lt', V(0, 3.4 * Math.cos(rot), 0), w(81), 38.9);
    lab('.lb', V(0, -.9 * Math.cos(rot), 0), w(78), 38.9);
    lab('.lf', V(1.6, .2 * Math.cos(rot), 1.6), w(73), w(78));
  },
};

// ───────── 11. Vacuum-cleaner analogy (38.95 – 43.5) ─────────
const sVac = {
  s: 38.95, e: 43.5, fi: .12, fo: .15,
  build(r) {
    r.appendChild(el(`<svg width="1080" height="1000" viewBox="0 0 1080 1000" style="position:absolute;left:0;top:240px">
      <rect x="760" y="80" width="40" height="760" rx="6" fill="#1A2233" stroke="#2A3446" stroke-width="3"/>
      <g class="vac">
        <path d="M300 520 L640 520 Q700 520 700 460 L700 380 Q700 330 750 330 L760 330 L760 610 L750 610 Q700 610 700 560 Z" fill="#E9EDF3"/>
        <path d="M120 470 Q220 470 300 500 L300 540 Q220 570 120 570 Z" fill="#A7B1C2"/>
        <rect x="40" y="440" width="90" height="160" rx="20" fill="#2A3446"/>
      </g>
      <g class="arr" fill="#59C7FF"></g>
    </svg>`));
    r.appendChild(big(`<div class="h" style="font-size:66px;font-weight:700">نفس فكرة <span class="hl">المكنسة</span></div>`, 'top:250px'));
    r.appendChild(el(`<div class="l2 label c" style="left:560px;top:900px;font-size:30px;opacity:0">تلتصق بالسطح</div>`));
  },
  update(r, lt, t) {
    popIn(r.querySelector('.h'), t, w(92) - .05);
    const k = sweep(w(96), w(96) + .5, t), vac = r.querySelector('.vac');
    const x = lerp(-60, 0, sweep(39, 39.8, t)) + (1 - k) * 0;
    vac.setAttribute('transform', `translate(${x} 0)`);
    let s = '';
    for (let i = 0; i < 6; i++) {
      const ph = (t * 1.4 + i / 6) % 1, y = 360 + i * 45;
      const ax = 520 + ph * 230;
      s += `<path d="M${ax} ${y} l-26 -12 l0 24 z" opacity="${(1 - Math.abs(ph - .5) * 2) * sweep(w(97), w(97) + .3, t)}" transform="rotate(180 ${ax} ${y})"/>`;
    }
    r.querySelector('.arr').innerHTML = s;
    popIn(r.querySelector('.l2'), t, w(99) - .05);
  },
};

// ───────── 12. "ضعف وزن السيارة… وزن سيارتين" (43.5 – 52.55) ─────────
const s2G = {
  s: 43.5, e: 52.58, fi: .12, fo: .15,
  build(r) {
    r.appendChild(el(`<div class="g" style="position:absolute;left:90px;right:90px;top:250px;padding:30px 36px;border-radius:28px;background:rgba(10,14,22,.9);border:1.5px solid #2A3446">
      <div style="display:flex;justify-content:space-between;align-items:baseline"><div style="font-size:36px;font-weight:700">قوة الالتصاق</div><div style="font-size:26px;color:${C.gray}">حسب تسلا</div></div>
      <div style="margin-top:22px;height:40px;border-radius:20px;background:#151C2A;overflow:hidden"><div class="b" style="height:100%;width:0;background:linear-gradient(270deg,#59C7FF,#168BFF);border-radius:20px"></div></div>
      <div style="display:flex;justify-content:space-between;margin-top:12px;font-size:28px;color:${C.gray}"><span>0</span><span>وزن السيارة</span><span class="two" style="color:${C.ink};font-weight:700">ضعف الوزن</span></div></div>`));
    r.appendChild(big(`<div class="eq" style="font-size:64px;font-weight:700">= وزن <span class="hl">سيارتين</span></div>`, 'top:480px'));
  },
  update(r, lt, t) {
    const a = lerp(-.7, -.3, sweep(43.5, 52.5, t));
    G3.set({ opacity: 1, road: true, grid: false, pose: { p: V(0, 0, 0), q: G3.Q(0, 0, 0) }, xray: .15, ghosts: [sweep(w(116), w(116) + .5, t), sweep(w(118), w(118) + .5, t)],
      topArrows: sweep(w(110), w(111) + .4, t) * (1 - sweep(w(116), w(117), t)),
      cam: V(Math.sin(a) * 14, 4.2, Math.cos(a) * 14), look: V(0, 2.9, 0), fov: 38, bloom: .55 });
    popIn(r.querySelector('.g'), t, w(101) - .1);
    r.querySelector('.b').style.width = (sweep(w(105), w(107) + .2, t) * 100) + '%';
    popIn(r.querySelector('.eq'), t, w(118) - .05, .35, 30);
  },
};

// ───────── 13. Beat 2: "طيب لحظة… فكيف تقفز في الهواء؟" (52.55 – 60.0) ─────────
const sQ2 = {
  s: 52.55, e: 60.02, fi: .1, fo: .15,
  build(r) {
    this.p = panel(r);
    r.appendChild(big(`<div class="k" style="font-size:52px;color:${C.gray}">طيب لحظة…</div>`, 'top:260px'));
    r.appendChild(big(`<div class="h" style="font-size:112px;font-weight:700;line-height:1.15">وكيف <span class="hl">تقفز</span>؟</div>`, 'top:330px'));
  },
  update(r, lt, t) {
    playClips(this.p, t, [[52.55, 56.7, 't_climb', 3.8, .75], [56.7, 60.02, 't_land', 0, .42]], .05);
    const k = r.querySelector('.k'); popIn(k, t, w(120) - .05); k.style.opacity = Math.min(+k.style.opacity, 1 - prog(t, w(128) - .3, w(128)));
    popIn(r.querySelector('.h'), t, w(132) - .1, .35, 30);
  },
};

// ───────── 14–15. Secret #2: compressed-air thrust system (60.0 – 67.95) ─────────
const sThrustA = {
  s: 60.0, e: 66.5, fi: .12, fo: .1,
  build(r) {
    r.appendChild(el(`<div class="tt" style="position:absolute;left:70px;right:70px;top:250px;text-align:right">
      <div style="font-size:34px;color:${C.cyan};font-weight:500">السر الثاني</div>
      <div style="font-size:80px;font-weight:700;line-height:1.15">دفع بـ<span class="hl">الهوا المضغوط</span></div></div>`));
    r.appendChild(el(`<div class="lt label c" style="opacity:0;font-size:30px">خزانات هوا مضغوط</div>`));
    r.appendChild(el(`<div class="ln label" style="opacity:0;font-size:30px">فتحات دفع</div>`));
  },
  update(r, lt, t) {
    const a = lerp(.9, .45, sweep(60, 66.5, t));
    G3.set({ opacity: 1, road: false, grid: true, pose: { p: V(0, 0, 0), q: G3.Q(0, 0, 0) }, xray: .3 + .55 * sweep(w(140), w(141), t),
      tanks: sweep(w(144), w(145), t), nozzles: sweep(w(141), w(142) + .6, t),
      cam: V(Math.sin(a) * 15, 5, Math.cos(a) * -15), look: V(0, 1.8, -.4), fov: 36, bloom: .55 });
    fade(r.querySelector('.tt'), t, 60.05, 66.5, .3, .3);
    const lt_ = r.querySelector('.lt'), s1 = G3.project(V(0, 1.2, -.5)); lt_.style.left = (s1[0] - 140) + 'px'; lt_.style.top = (s1[1] - 90) + 'px'; fade(lt_, t, w(144), 66.5);
    const ln = r.querySelector('.ln'), s2 = G3.project(V(0, .45, -2.4)); ln.style.left = (s2[0] - 90) + 'px'; ln.style.top = (s2[1] + 30) + 'px'; fade(ln, t, w(142), 66.5);
  },
};
const sPlume = {
  s: 66.45, e: 68.05, fi: .06, fo: .1,
  build(r) { this.p = panel(r); r.appendChild(big(`<div class="h" style="font-size:66px;font-weight:700">مبدأ <span class="hl">الصواريخ</span></div>`, 'top:250px')); },
  update(r, lt, t) { playClips(this.p, t, [[66.45, 68.05, 't_jets', 0, 1]], .08); popIn(r.querySelector('.h'), t, w(151) - .1); },
};

// ───────── 16. Store → release → air backwards → push forwards (68.0 – 78.4) ─────────
const sThrustB = {
  s: 68.0, e: 78.42, fi: .1, fo: .15,
  build(r) {
    r.appendChild(el(`<div class="pg" style="position:absolute;left:90px;right:90px;top:250px;padding:26px 32px;border-radius:24px;background:rgba(10,14,22,.9);border:1.5px solid #2A3446">
      <div style="display:flex;justify-content:space-between"><div style="font-size:34px;font-weight:700">ضغط الهوا في الخزانات</div><div class="pv" style="font-size:34px;font-weight:700;color:${C.cyan}">عالي</div></div>
      <div style="margin-top:16px;height:30px;border-radius:15px;background:#151C2A;overflow:hidden"><div class="b" style="height:100%;width:0;background:linear-gradient(270deg,#59C7FF,#168BFF)"></div></div></div>`));
    r.appendChild(el(`<div class="la label c" style="opacity:0;font-size:34px;font-weight:700">الهوا للخلف ←</div>`));
    r.appendChild(el(`<div class="lc label" style="opacity:0;font-size:34px;font-weight:700;border-color:${C.blue}">→ السيارة لقدّام</div>`));
    r.appendChild(big(`<div class="nw" style="font-size:44px;font-weight:700;padding:18px 30px;border-radius:20px;background:rgba(8,11,18,.85);display:inline-block">قوة دفع <span class="hl">بالاتجاه المعاكس</span></div>`, 'top:1110px'));
  },
  update(r, lt, t) {
    const fire = sweep(w(159) - .05, w(159) + .25, t);
    const dz = 6 * ease.inOut(prog(t, w(159), 78.4)) ;
    const a = lerp(-1.25, -1.45, sweep(68, 78.4, t));
    G3.set({ opacity: 1, grid: true, pose: { p: V(0, 0, dz), q: G3.Q(0, 0, 0) }, xray: .55 * (1 - fire) + .1, tanks: 1 - .6 * fire, nozzles: 1,
      thrust: fire * (1 - .3 * sweep(77.3, 78.4, t)), particles: 'thrust', partK: fire, wheelSpin: dz * 2.7,
      cam: V(Math.sin(a) * 10.5, 2.6, dz * .7 + Math.cos(a) * 10.5), look: V(0, .7, dz * .7 - 1), fov: 40, bloom: .95 });
    popIn(r.querySelector('.pg'), t, w(152) - .05);
    r.querySelector('.b').style.width = (sweep(w(153), w(157), t) * 100 * (1 - .7 * fire)) + '%';
    r.querySelector('.pv').textContent = fire > .5 ? 'ينطلق!' : 'عالي';
    const la = r.querySelector('.la'), s1 = G3.project(V(0, .8, dz - 4.2)); la.style.left = (s1[0] - 150) + 'px'; la.style.top = (s1[1] - 110) + 'px'; popIn(la, t, w(164) - .05);
    const lc = r.querySelector('.lc'), s2 = G3.project(V(0, 1.6, dz + 1.5)); lc.style.left = (s2[0] - 150) + 'px'; lc.style.top = (s2[1] - 110) + 'px'; popIn(lc, t, w(167) - .05);
    popIn(r.querySelector('.nw'), t, w(171) - .1);
  },
};

// ───────── 17. Balloon analogy (78.4 – 82.4) ─────────
const sBalloon = {
  s: 78.4, e: 82.42, fi: .12, fo: .12,
  build(r) {
    r.appendChild(el(`<svg width="1080" height="1000" viewBox="0 0 1080 1000" style="position:absolute;left:0;top:240px"><g class="bal"></g></svg>`));
    r.appendChild(big(`<div class="h" style="font-size:66px;font-weight:700">مثل <span class="hl">البالون</span></div>`, 'top:250px'));
  },
  update(r, lt, t) {
    popIn(r.querySelector('.h'), t, w(173) - .05);
    const go = sweep(w(179), w(183) + .4, t), x = 640 - go * 420, wob = Math.sin(t * 18) * 6 * go;
    let jets = '';
    for (let i = 0; i < 10; i++) { const ph = (t * 2.2 + i / 10) % 1; jets += `<circle cx="${x + 120 + ph * 260}" cy="${560 + Math.sin(i * 7) * 14 * ph}" r="${7 - ph * 4}" fill="#59C7FF" opacity="${(1 - ph) * go}"/>`; }
    r.querySelector('.bal').innerHTML = `${jets}
      <g transform="translate(${x} ${560 + wob}) rotate(${wob})">
        <ellipse cx="0" cy="0" rx="${150 - go * 40}" ry="${120 - go * 30}" fill="#168BFF"/>
        <ellipse cx="-50" cy="-40" rx="30" ry="18" fill="#59C7FF" opacity=".6"/>
        <path d="M${150 - go * 40} 0 l26 -14 l0 28 z" fill="#168BFF"/></g>
      <text x="${x}" y="760" fill="#A7B1C2" font-size="32" text-anchor="middle" font-family="Plex" opacity="${go}">الهوا يطلع لورا ← البالون يروح لقدّام</text>`;
  },
};

// ───────── 18. "والأغرب؟" 0 → 96 in under a second (82.4 – 91.0) ─────────
const sAccel = {
  s: 82.4, e: 91.0, fi: .1, fo: .15,
  build(r) {
    this.p = panel(r);
    r.appendChild(big(`<div class="wq" style="font-size:96px;font-weight:700">والأغرب<span class="hl">؟</span></div>`, 'top:300px'));
    r.appendChild(el(`<div class="sp" style="position:absolute;left:0;right:0;top:300px;text-align:center;opacity:0">
      <div style="display:inline-block;padding:24px 48px;border-radius:30px;background:rgba(8,11,18,.85);border:2px solid #2A3446">
        <div style="font-family:PlexLatin;font-weight:700;font-size:150px;line-height:1;direction:ltr"><span class="v">0</span><span style="font-size:44px;color:${C.gray}"> كم/س</span></div>
        <div class="u" style="margin-top:10px;font-size:46px;font-weight:700;opacity:0">في <span class="hl">أقل من ثانية</span></div>
        <div class="n" style="margin-top:8px;font-size:24px;color:${C.gray};opacity:0">الهدف المعلن للنسخ المزودة بالدفع بالهوا</div>
      </div></div>`));
  },
  update(r, lt, t) {
    playClips(this.p, t, [[82.4, 91.0, 't_jump', 0, .38]], .05);
    const wq = r.querySelector('.wq'); popIn(wq, t, w(184) - .05); wq.style.opacity = Math.min(+wq.style.opacity, 1 - prog(t, w(185), w(185) + .2));
    const sp = r.querySelector('.sp'); popIn(sp, t, w(186) - .1);
    r.querySelector('.v').textContent = Math.round(96 * ease.out(prog(t, w(190), w(193) + .3)));
    popIn(r.querySelector('.u'), t, w(197) - .05); popIn(r.querySelector('.n'), t, w(198) + .1);
  },
};

// ───────── 19. Price (91.0 – 96.65) ─────────
const sPrice = {
  s: 91.0, e: 96.68, fi: .1, fo: .15,
  build(r) {
    this.p = panel(r);
    r.appendChild(el(`<div class="pc" style="position:absolute;left:0;right:0;top:300px;text-align:center;opacity:0">
      <div style="display:inline-block;padding:30px 54px;border-radius:30px;background:rgba(8,11,18,.88);border:2px solid ${C.blue}">
        <div style="font-size:40px;color:${C.gray}">العربون المعلن لبعض النسخ</div>
        <div style="font-family:PlexLatin;font-weight:700;font-size:140px;line-height:1.05;direction:ltr;margin-top:8px">$<span class="v">0</span></div>
        <div style="font-size:26px;color:${C.gray};margin-top:6px">عربون حجز · مو السعر النهائي</div></div></div>`));
  },
  update(r, lt, t) {
    playClips(this.p, t, [[91.0, 96.68, 't_rear', 0, .33]], .05);
    popIn(r.querySelector('.pc'), t, w(204) - .1);
    const v = Math.round(250000 * ease.out(prog(t, w(209), w(211) + .4)) / 1000) * 1000;
    r.querySelector('.v').textContent = v.toLocaleString('en-US');
  },
};

// ───────── 20. Question to the viewer (96.65 – 102.95) ─────────
const sPoll = {
  s: 96.65, e: 102.98, fi: .12, fo: .2,
  build(r) {
    this.p = panel(r);
    r.appendChild(el(`<div class="q" style="position:absolute;left:70px;right:70px;top:280px;padding:36px 40px;border-radius:30px;background:rgba(8,11,18,.9);border:1.5px solid #2A3446;opacity:0">
      <div style="font-size:34px;color:${C.cyan};font-weight:500">سؤال لك</div>
      <div style="font-size:60px;font-weight:700;line-height:1.3;margin-top:8px">لو عندك <span class="latin" style="font-family:PlexLatin">$250,000</span>… تحجزها؟</div>
      <div style="display:flex;gap:24px;margin-top:28px">
        <div class="o1" style="flex:1;padding:22px;border-radius:20px;background:${C.blue};text-align:center;font-size:44px;font-weight:700">أحجز</div>
        <div class="o2" style="flex:1;padding:22px;border-radius:20px;background:#1A2233;border:2px solid #2A3446;text-align:center;font-size:44px;font-weight:700">لا</div></div>
      <div class="cm" style="margin-top:22px;font-size:34px;color:${C.gray};text-align:center;opacity:0">اكتب رأيك في التعليقات</div></div>`));
  },
  update(r, lt, t) {
    playClips(this.p, t, [[96.65, 102.98, 't_smoke', 0, .48]], .05);
    popIn(r.querySelector('.q'), t, w(213) - .05);
    popIn(r.querySelector('.o1'), t, w(224) - .1); popIn(r.querySelector('.o2'), t, w(225));
    popIn(r.querySelector('.cm'), t, w(227));
  },
};

const outro = outroScene(102.95, 105.45);

window.TL = {
  voiceEnd: VOICE_END,
  remap: tv => {
    let i = 0; while (i < WARP.length - 2 && tv > WARP[i + 1][1]) i++;
    const [s0, v0] = WARP[i], [s1, v1] = WARP[i + 1];
    if (tv >= v1) return s1 + (tv - v1);
    return s0 + (tv - v0) * (s1 - s0) / ((v1 - v0) || 1);
  },
  bug: t => (t < 2.85 ? 0 : 1) * (1 - prog(t, 102.7, 103)),
  subs: SUBS.filter(s => !((s.s >= 24.6 && s.e <= 29.6) || (s.s >= 56.7 && s.e <= 60.1))),
  scenes: [sHook, sRamp, sUnder, sGlued, sFlight, sReal, sName, sQ1, sFans, sVac, s2G, sQ2, sThrustA, sPlume, sThrustB, sBalloon, sAccel, sPrice, sPoll, outro],
};
