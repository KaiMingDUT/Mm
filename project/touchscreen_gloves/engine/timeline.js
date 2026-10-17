// KROZO — "ليش الشاشة ما تحس بالقفاز؟"  One continuous 3D shot + text overlays on the narration.
const VOICE_END = 117.52;
const w = i => WT[i];
const V3 = (x, y, z) => G3.V(x, y, z);
const sm = (a, b, t) => ease.inOut(prog(t, a, b));
// piecewise track: [[t, v], ...] eased between keys
function track(t, K) {
  if (t <= K[0][0]) return K[0][1];
  for (let i = 0; i < K.length - 1; i++) if (t <= K[i + 1][0]) return lerp(K[i][1], K[i + 1][1], ease.inOut(prog(t, K[i][0], K[i + 1][0])));
  return K[K.length - 1][1];
}
const big = (txt, extra = '') => el(`<div style="position:absolute;left:50px;right:50px;text-align:center;${extra}">${txt}</div>`);
function popIn(node, t, at, dur = .35, rise = 26) {
  const k = ease.back(prog(t, at, at + dur));
  node.style.opacity = clamp(prog(t, at, at + dur * .6));
  node.style.transform = `translateY(${(1 - k) * rise}px) scale(${.92 + .08 * k})`;
  return k;
}
const fade = (node, t, a, b, fi = .25, fo = .25) => node.style.opacity = Math.min(prog(t, a, a + fi), 1 - prog(t, b - fo, b));
const tag = (txt, color = C.blue) => `<span style="display:inline-block;padding:12px 28px;border-radius:16px;background:${color};color:${C.ink};font-weight:700">${txt}</span>`;
const chip = (txt, cls = '') => `<span class="${cls}" style="display:inline-block;padding:10px 22px;border-radius:14px;background:rgba(8,11,18,.85);border:1.5px solid #2A3446;font-weight:700">${txt}</span>`;

// ───────── camera path (continuous) ─────────
function camAt(t, tp) {
  const A = [V3(3.4, 7.8, 7.6), V3(0, .3, .3)];                                  // hero
  const B = [V3(tp.x + 3.4, 5.2, tp.z + 6.4), V3(tp.x, 1.0, tp.z + .3)];             // touch shot (phone + finger in frame)
  const Cx = [V3(7.6, 6.4, 8.8), V3(0, 1.0, .2)];                                   // exploded layers
  const D = [V3(tp.x + 3.0, 3.4, tp.z + 4.4), V3(tp.x, 1.5, tp.z + .2)];          // low over the grid
  const Ef = [V3(tp.x + 3.4, 4.4, tp.z + 4.6), V3(tp.x, 2.0, tp.z + .2)];          // on the finger
  const keys = [[0, A], [1.4, B], [9.5, B], [17.6, B], [18.6, A], [29.9, A], [30.8, Ef], [34.3, Ef], [35.2, A], [43.1, A], [44.4, Cx], [53.4, Cx], [54.4, D],
    [61.8, D], [62.7, Ef], [67.5, Ef], [68.4, B], [75.9, B], [76.8, D], [78.8, D], [79.6, B], [92.8, B], [93.6, Ef], [98.8, Ef], [99.6, B], [107.7, B], [108.8, A], [125, A]];
  let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
  const [ta, a] = keys[i], [tb, b] = keys[i + 1], k = ease.inOut(prog(t, ta, tb));
  const orbit = Math.sin(t * .12) * .35;
  const cam = a[0].clone().lerp(b[0], k), look = a[1].clone().lerp(b[1], k);
  cam.sub(look).applyAxisAngle(V3(0, 1, 0), orbit).add(look);
  return { cam, look };
}

const sMain = {
  s: 0, e: VOICE_END + 2.6, fi: .01, fo: .3, is3d: true,
  build() {},
  update(r, lt, t) {
    const tp = G3.iconPos(9);
    const { cam, look } = camAt(t, tp);
    const h = track(t, [[0, 1.8], [w(1) - .25, 1.8], [w(1) + .3, .08], [w(4), .08], [w(7), .9], [w(13) - .2, .9], [w(13) + .25, .02], [9.2, .02], [9.9, 1.4],
      [w(22) + .9, 1.4], [w(25) - .25, 1.0], [w(25) + .45, 0], [16.9, 0], [17.6, 1.2], [53.4, 1.2], [54.0, 1.3], [61.8, 1.3], [62.5, 1.6], [67.5, 1.6],
      [w(129) - .3, 1.4], [w(129) + .35, 0], [78.8, 0], [79.6, 1.4], [w(150) - .2, 1.4], [w(150) + .3, .08], [98.8, .08], [99.6, .9], [w(196) - .25, .9], [w(196) + .2, .08], [107.6, .08], [108.4, 1.6]]);
    const fk = Math.max(track(t, [[0, 1], [17.3, 1], [17.6, 0], [29.9, 0], [30.4, 1], [34.2, 1], [34.6, 0], [53.4, 0], [53.9, 1], [107.7, 1], [108.3, 0]]), 0);
    const glove = (t < 17.6) ? 1 : (t >= 78.8 && t < 98.8) ? 1 : (t >= 98.8 && t < 108.3) ? 2 : 0;
    const off = t < 17.6 ? sm(w(22) - .05, w(22) + .8, t) : 0;
    const touchOK = (k0, a) => (t >= a ? 1 : 0) * k0;
    const respond = Math.max(sm(w(32) - .1, w(32) + .2, t) * (1 - sm(17.1, 17.6, t)),
      sm(w(140) - .1, w(140) + .25, t) * (1 - sm(78.6, 79.0, t)), sm(w(196) + .1, w(196) + .4, t) * (1 - sm(107.4, 107.8, t)));
    const ripStart = t >= w(196) + .1 ? w(196) + .1 : t >= w(140) - .1 ? w(140) - .1 : w(32) - .1;
    G3.set({
      opacity: 1, cam, look, fov: 36, bloom: .7, touch: tp,
      finger: { k: fk, h, glove, off, aura: Math.max(sm(30.4, 31.2, t) * (1 - sm(34.0, 34.4, t)), .55 * sm(61.9, 62.6, t) * (1 - sm(67.3, 67.8, t)), .35 * sm(w(132), w(132) + .5, t) * (1 - sm(78.6, 79.0, t))),
        ions: Math.max(sm(w(122) - .2, w(122) + .4, t) * (1 - sm(67.6, 68.2, t)), .25 * sm(30.6, 31.4, t) * (1 - sm(34.0, 34.4, t))) },
      press: sm(w(13) + .15, w(13) + .35, t) * (1 - sm(9.1, 9.5, t)),
      explode: sm(w(85) - .1, w(86) + .5, t) * (1 - .4 * sm(53.4, 54.4, t)) * (1 - sm(107.7, 108.8, t)),
      grid: sm(w(88) - .1, w(88) + .4, t) * (1 - sm(107.7, 108.6, t)),
      scan: sm(w(95) - .1, w(95) + .3, t) * (1 - sm(53.2, 53.8, t)) + .3 * sm(67.6, 68.2, t) * (1 - sm(107.6, 108, t)),
      field: sm(w(96), w(96) + .5, t) * (1 - sm(107.7, 108.5, t)),
      couple: Math.max(sm(w(132) - .2, w(132) + .7, t) * (1 - sm(78.6, 79.2, t)), .15 * sm(w(150) + .1, w(150) + .5, t) * (1 - sm(98.6, 99.2, t)), .85 * sm(w(196), w(196) + .5, t) * (1 - sm(107.5, 108, t))),
      cell: Math.max(sm(w(140) - .1, w(140) + .3, t) * (1 - sm(78.6, 79, t)), sm(w(196) + .2, w(196) + .5, t) * (1 - sm(107.5, 107.9, t))),
      ripple: respond > .01 ? 1 : 0, ripplePh: (t - ripStart) * 1.3,
      iconHi: 9, iconK: respond,
      barrier: .35 * sm(w(155) - .1, w(155) + .4, t) * (1 - sm(98.6, 99.0, t)),
    });
  },
};

// ───────── text overlays (DOM) ─────────
const sHook = {
  s: 0, e: 9.62, fi: .01,
  build(r) {
    r.appendChild(big(`<div class="k" style="font-size:48px;color:${C.cyan};font-weight:700">أتحداك!</div>
      <div class="h" style="font-size:74px;font-weight:700;line-height:1.25;margin-top:6px;text-shadow:0 6px 30px rgba(0,0,0,.8)">المس الشاشة <span class="hl">وأنت لابس قفاز</span></div>`, 'top:170px'));
    r.appendChild(big(`<div class="n1">${chip('لا استجابة ✕', 'c1')}</div>`, 'top:1060px'));
    r.appendChild(big(`<div class="n2">${chip('حتى بكل قوتك… ولا شي ✕')}</div>`, 'top:1060px'));
  },
  update(r, lt, t) {
    popIn(r.querySelector('.k'), t, .1); popIn(r.querySelector('.h'), t, .35);
    const n1 = r.querySelector('.n1'); popIn(n1, t, w(1) + .4); n1.style.opacity = Math.min(+n1.style.opacity, 1 - prog(t, w(11) - .3, w(11)));
    popIn(r.querySelector('.n2'), t, w(13) + .45);
  },
};
const sBare = {
  s: 9.6, e: 17.62,
  build(r) {
    r.appendChild(big(`<div class="k" style="font-size:60px;font-weight:700;text-shadow:0 6px 30px rgba(0,0,0,.8)">شِل القفاز…</div>`, 'top:180px'));
    r.appendChild(big(`<div class="ok" style="font-size:56px;font-weight:700">${tag('استجابة فورية ✓')}</div>`, 'top:1060px'));
  },
  update(r, lt, t) { const k = r.querySelector('.k'); popIn(k, t, w(22) - .1); k.style.opacity = Math.min(+k.style.opacity, 1 - prog(t, w(24), w(24) + .3)); popIn(r.querySelector('.ok'), t, w(32)); },
};
const sCompare = {
  s: 17.6, e: 30.0,
  build(r) {
    r.appendChild(el(`<div class="cmp" style="position:absolute;left:60px;right:60px;top:300px;display:flex;gap:30px;justify-content:center">
      <div class="g" style="flex:1;padding:30px;border-radius:28px;background:rgba(8,11,18,.88);border:2px solid #2A3446;text-align:center">
        <svg width="150" height="190" viewBox="0 0 150 190"><path d="M35 185V95q0-14 14-14t14 14V40q0-14 14-14t14 14v55q0-14 14-14t14 14v90z" fill="#4A5468" stroke="#A7B1C2" stroke-width="4"/><path d="M40 120h75M40 140h75M40 160h75" stroke="#3E4759" stroke-width="6"/></svg>
        <div style="font-size:48px;font-weight:700;margin-top:10px">قطعة قماش</div></div>
      <div class="f" style="flex:1;padding:30px;border-radius:28px;background:rgba(8,11,18,.88);border:2px solid ${C.blue};text-align:center">
        <svg width="150" height="190" viewBox="0 0 150 190"><path d="M45 185V100q0-12 12-12t12 12V35q0-12 12-12t12 12v65q0-12 12-12t12 12v85z" fill="#D9DFE8"/><circle cx="81" cy="40" r="22" fill="#59C7FF" opacity=".35"/></svg>
        <div style="font-size:48px;font-weight:700;margin-top:10px">إصبعك</div></div></div>`));
    r.appendChild(big(`<div class="q" style="font-size:96px;font-weight:700">كيف <span class="hl">يفرّق</span>؟</div>`, 'top:820px'));
  },
  update(r, lt, t) { popIn(r.querySelector('.cmp'), t, w(35)); popIn(r.querySelector('.q'), t, w(49) - .1, .4, 30); },
};
const sSecret = {
  s: 30.0, e: 34.42,
  build(r) { r.appendChild(big(`<div class="k" style="font-size:40px;color:${C.cyan};font-weight:500">السر</div><div class="h" style="font-size:96px;font-weight:700;line-height:1.15">كهرباء <span class="hl">جسمك</span></div>`, 'top:200px')); },
  update(r, lt, t) { popIn(r.querySelector('.k'), t, 30.05); popIn(r.querySelector('.h'), t, w(62) - .1, .4, 30); },
};
const sTech = {
  s: 34.4, e: 43.2,
  build(r) {
    r.appendChild(big(`<div class="a" style="font-size:52px;font-weight:700;text-shadow:0 6px 30px rgba(0,0,0,.8)">ما تستجيب لأي شيء</div>`, 'top:200px'));
    r.appendChild(big(`<div class="b" style="display:inline-block;padding:26px 40px;border-radius:28px;background:rgba(8,11,18,.88);border:2px solid ${C.blue}">
      <div style="font-size:30px;color:${C.gray}">التقنية في أغلب الجوالات الحديثة</div>
      <div style="font-size:76px;font-weight:700;line-height:1.2">شاشة اللمس <span class="hl">السَّعَوية</span></div>
      <div class="latin" style="font-family:PlexLatin;font-size:34px;color:${C.gray};margin-top:6px">Capacitive Touchscreen</div></div>`, 'top:1000px'));
  },
  update(r, lt, t) { const a = r.querySelector('.a'); popIn(a, t, w(71) - .1); a.style.opacity = Math.min(+a.style.opacity, 1 - prog(t, w(79) - .3, w(79))); popIn(r.querySelector('.b'), t, w(82) - .15, .4, 30); },
};
const sLayers = {
  s: 43.2, e: 53.5,
  build(r) {
    for (const [cls, txt] of [['lg', 'الزجاج'], ['ls', 'شبكة مسارات كهربائية شفافة'], ['ld', 'الشاشة']]) r.appendChild(el(`<div class="${cls} label c" style="opacity:0;font-size:32px">${txt}</div>`));
    r.appendChild(big(`<div class="m" style="font-size:48px;font-weight:700">${tag('تراقب التغيّرات باستمرار')}</div>`, 'top:1060px'));
  },
  update(r, lt, t) {
    const ex = sm(w(85) - .1, w(86) + .5, t);
    const place = (cls, v, a) => { const n = r.querySelector(cls), s = G3.project(v); n.style.left = Math.max(30, Math.min(1080 - n.offsetWidth - 30, s[0] - n.offsetWidth - 20)) + 'px'; n.style.top = (s[1] - 30) + 'px'; popIn(n, t, a); };
    place('.lg', V3(-1.7, .3 + ex * 1.5 + .05, 1.2), w(86));
    place('.ls', V3(-1.7, .29 + ex * .75, 1.9), w(88));
    place('.ld', V3(-1.7, .3, 2.6), w(86) + .4);
    popIn(r.querySelector('.m'), t, w(95));
  },
};
const sQ2 = {
  s: 53.5, e: 61.95,
  build(r) { r.appendChild(big(`<div class="k" style="font-size:52px;color:${C.gray}">الجزء المثير…</div><div class="h" style="font-size:96px;font-weight:700;line-height:1.15;margin-top:10px">كيف تغيّرها <span class="hl">لمسة</span>؟</div>`, 'top:190px')); },
  update(r, lt, t) { popIn(r.querySelector('.k'), t, w(102)); popIn(r.querySelector('.h'), t, w(108) - .1, .4, 30); },
};
const sBody = {
  s: 61.9, e: 67.6,
  build(r) {
    r.appendChild(big(`<div class="i" style="display:flex;gap:18px;justify-content:center;font-size:44px">${chip('ماء 💧'.replace(' 💧', ''), 'w1')} ${chip('أملاح', 'w2')} <span class="latin w3" style="font-family:PlexLatin;font-weight:700;color:${C.cyan}">Na⁺ Cl⁻</span></div>`, 'top:220px'));
    r.appendChild(big(`<div class="h" style="font-size:64px;font-weight:700">${tag('= جسمك يوصّل الكهرباء')}</div>`, 'top:1060px'));
  },
  update(r, lt, t) { popIn(r.querySelector('.w1'), t, w(122) - .1); popIn(r.querySelector('.w2'), t, w(123) - .1); popIn(r.querySelector('.w3'), t, w(123) + .2); popIn(r.querySelector('.h'), t, w(126) - .1); },
};
// capacitance meter shared by the three touch tests
function meterHTML() {
  return `<div class="mt" style="position:absolute;left:80px;right:80px;top:220px;padding:26px 32px;border-radius:24px;background:rgba(10,14,22,.9);border:1.5px solid #2A3446;opacity:0">
    <div style="display:flex;justify-content:space-between;align-items:baseline"><div style="font-size:34px;font-weight:700">تغيّر السعة عند نقطة اللمس</div><div class="st" style="font-size:32px;font-weight:700"></div></div>
    <div style="position:relative;margin-top:18px;height:34px;border-radius:17px;background:#151C2A;overflow:hidden"><div class="b" style="height:100%;width:0;background:linear-gradient(270deg,#59C7FF,#168BFF)"></div></div>
    <div style="position:relative;height:0"><div style="position:absolute;right:58%;top:-46px;width:4px;height:46px;background:${C.ink}"></div><div style="position:absolute;right:calc(58% - 110px);top:4px;font-size:22px;color:${C.gray}">الحد اللازم للاستجابة</div></div>
    <div style="height:30px"></div></div>`;
}
function meterUpdate(r, t, at, val, okText, noText) {
  const m = r.querySelector('.mt'); popIn(m, t, at);
  const v = val * ease.out(prog(t, at + .2, at + 1.0));
  r.querySelector('.b').style.width = (v * 100) + '%';
  const st = r.querySelector('.st'); const done = prog(t, at + 1.0, at + 1.1) > 0;
  st.textContent = done ? (val >= .58 ? okText : noText) : ''; st.style.color = val >= .58 ? C.cyan : C.gray;
}
const sTouch = {
  s: 67.6, e: 78.95,
  build(r) { r.appendChild(el(meterHTML())); r.appendChild(big(`<div class="d" style="font-size:52px;font-weight:700">${tag('تحدد مكان إصبعك بالضبط')}</div>`, 'top:1060px')); r.appendChild(el(`<svg class="xh" width="1080" height="1920" style="position:absolute;inset:0;opacity:0"><g stroke="#59C7FF" stroke-width="3" fill="none"></g></svg>`)); },
  update(r, lt, t) {
    meterUpdate(r, t, w(132) - .1, .9, 'تم الاكتشاف ✓', '');
    popIn(r.querySelector('.d'), t, w(143) - .1);
    const xh = r.querySelector('.xh'), k = sm(w(143), w(143) + .4, t); xh.style.opacity = k;
    if (k > 0) { const p = G3.project(G3.iconPos(9)); const s = 70 + 40 * (1 - k); xh.querySelector('g').innerHTML = `<circle cx="${p[0]}" cy="${p[1]}" r="${s}"/><path d="M${p[0] - s - 40} ${p[1]}h${s * 2 + 80}M${p[0]} ${p[1] - s - 40}v${s * 2 + 80}"/>`; }
  },
};
const sGlove = {
  s: 78.9, e: 92.95,
  build(r) { r.appendChild(el(meterHTML())); r.appendChild(el(`<div class="ba label" style="opacity:0;font-size:32px;font-weight:700">حاجز عازل</div>`)); r.appendChild(big(`<div class="no" style="font-size:48px;font-weight:700">${chip('تغيّر غير كافٍ… ما فيه استجابة ✕')}</div>`, 'top:1060px')); },
  update(r, lt, t) {
    meterUpdate(r, t, w(150) + .1, .15, '', 'غير كافٍ ✕');
    const ba = r.querySelector('.ba'), p = G3.project(G3.iconPos(9).add(V3(0, 1.0, 0))); ba.style.left = (p[0] + 90) + 'px'; ba.style.top = (p[1] - 20) + 'px'; popIn(ba, t, w(155) - .1);
    popIn(r.querySelector('.no'), t, w(163));
  },
};
const sNotThick = {
  s: 92.9, e: 98.95,
  build(r) {
    r.appendChild(big(`<div class="a" style="position:relative;display:inline-block;font-size:76px;font-weight:700">سميك؟<i class="sl" style="position:absolute;left:-14px;right:-14px;top:52%;height:8px;background:${C.blue};border-radius:4px;transform-origin:right;transform:scaleX(0)"></i></div>`, 'top:220px'));
    r.appendChild(big(`<div class="b" style="font-size:80px;font-weight:700">عازل <span class="hl">كهربائيًا</span></div>`, 'top:360px'));
  },
  update(r, lt, t) { popIn(r.querySelector('.a'), t, w(174) - .1); r.querySelector('.sl').style.transform = `scaleX(${sm(w(176) - .2, w(176) + .1, t)})`; popIn(r.querySelector('.b'), t, w(178) - .1, .4, 30); },
};
const sSpecial = {
  s: 98.9, e: 107.8,
  build(r) {
    r.appendChild(el(meterHTML()));
    r.appendChild(big(`<div class="h" style="font-size:52px;font-weight:700">${tag('قفاز بأطراف موصلة للكهرباء')}</div>`, 'top:1060px'));
  },
  update(r, lt, t) { popIn(r.querySelector('.h'), t, w(189) - .1); meterUpdate(r, t, w(196) - .1, .85, 'يشتغل ✓', ''); },
};
const sCTA = {
  s: 107.8, e: VOICE_END + .1,
  build(r) {
    r.appendChild(big(`<div class="a" style="font-size:52px;font-weight:700;line-height:1.35">أول مرة تعرف هذي المعلومة؟</div>`, 'top:220px'));
    r.appendChild(big(`<div class="b" style="display:inline-block;padding:28px 46px;border-radius:30px;background:rgba(8,11,18,.9);border:2px solid ${C.blue}">
      <div style="font-size:64px;font-weight:700">تابع <span class="latin" style="font-family:PlexLatin;color:${C.blue}">KROZO</span></div>
      <div style="font-size:32px;color:${C.gray};margin-top:8px">كيف تشتغل الأشياء اللي نستخدمها كل يوم</div></div>`, 'top:1000px'));
  },
  update(r, lt, t) { popIn(r.querySelector('.a'), t, w(201)); popIn(r.querySelector('.b'), t, w(207) - .1, .4, 30); },
};

const outro = outroScene(VOICE_END + .05, VOICE_END + 2.55);

window.TL = {
  voiceEnd: VOICE_END,
  lead: 0.15,
  flashes: [w(32), w(85), w(140), w(196) + .1],
  remap: tv => {
    let i = 0; while (i < WARP.length - 2 && tv > WARP[i + 1][1]) i++;
    const [s0, v0] = WARP[i], [s1, v1] = WARP[i + 1];
    if (tv >= v1) return s1 + (tv - v1);
    return s0 + (tv - v0) * (s1 - s0) / ((v1 - v0) || 1);
  },
  bug: t => (t < 1 ? 0 : 1) * (1 - prog(t, VOICE_END - .2, VOICE_END + .1)),
  subs: SUBS,
  scenes: [sMain, sHook, sBare, sCompare, sSecret, sTech, sLayers, sQ2, sBody, sTouch, sGlove, sNotThick, sSpecial, sCTA, outro],
};
