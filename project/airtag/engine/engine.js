// KROZO deterministic frame engine: everything is a pure function of time t.
const W = 1080, H = 1920;
const C = { bg: '#080B12', blue: '#168BFF', cyan: '#59C7FF', ink: '#F4F7FB', gray: '#A7B1C2' };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const ease = {
  out: k => 1 - Math.pow(1 - k, 3),
  inOut: k => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  back: k => { const c = 1.4; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
};
function el(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; }
function svg(w, h, inner, style = '') {
  return el(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="position:absolute;${style}">${inner}</svg>`);
}
// fade helper for a scene element: in over `fi`, out over `fo`
function fadeIO(t, s, e, fi = .35, fo = .3) { return Math.min(prog(t, s, s + fi), 1 - prog(t, e - fo, e)); }

const bg = document.getElementById('bg').getContext('2d');
function drawBackground(t, focus) {
  bg.fillStyle = C.bg; bg.fillRect(0, 0, W, H);
  // soft key light (never floods the frame)
  const fx = focus?.x ?? 540, fy = focus?.y ?? 820, fr = focus?.r ?? 760, fa = focus?.a ?? .16;
  const g = bg.createRadialGradient(fx, fy, 0, fx, fy, fr);
  g.addColorStop(0, `rgba(22,139,255,${fa})`); g.addColorStop(.55, `rgba(22,139,255,${fa * .25})`); g.addColorStop(1, 'rgba(22,139,255,0)');
  bg.fillStyle = g; bg.fillRect(0, 0, W, H);
  // fine engineering dot grid, slow drift
  const off = (t * 6) % 60;
  bg.fillStyle = 'rgba(167,177,194,0.07)';
  for (let y = -60 + off; y < H; y += 60) for (let x = 30; x < W; x += 60) bg.fillRect(x, y, 2, 2);
  // vignette
  const v = bg.createRadialGradient(540, 960, 500, 540, 960, 1250);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  bg.fillStyle = v; bg.fillRect(0, 0, W, H);
}

const scenesRoot = document.getElementById('scenes');
const subsEl = document.getElementById('subs');
const bugEl = document.getElementById('bug');
const progEl = document.getElementById('prog');
let built = false;

function buildAll() {
  for (const sc of TL.scenes) {
    sc.root = el('<div class="layer" style="opacity:0"></div>');
    sc.build(sc.root, sc);
    sc.isClip = !!sc.p;
    scenesRoot.appendChild(sc.root);
  }
  // blended transitions: each scene overlaps the next; no dip to black between them
  const L = TL.scenes;
  for (let i = 0; i < L.length - 1; i++) {
    const a = L[i], b = L[i + 1], ov = .26;
    if (b.s - a.e > .3) continue;               // not adjacent: keep its own end
    a.e = Math.max(a.e, b.s + ov);
    if (b.is3d && !a.is3d) { a.fo = ov; b.fi = .04; }      // fade the top layer away to reveal 3D underneath
    else if (a.is3d && !b.is3d && !b.isClip) { a.fo = ov; b.fi = ov; }
    else { a.fo = .03; b.fi = .22; }                      // new shot dissolves in over the previous one
  }
  built = true;
}
const flashEl = document.getElementById('flash');

let lastSub = null;
function renderSubs(t) {
  const cur = TL.subs.find(s => t >= s.s && t < s.e);
  if (!cur) { subsEl.innerHTML = ''; lastSub = null; return; }
  if (lastSub !== cur) {
    subsEl.innerHTML = '<span class="line">' + cur.words.map((w, i) => `<span class="w" data-i="${i}">${w.w}</span>`).join(' ') + '</span>';
    lastSub = cur;
  }
  const a = clamp(Math.min(prog(t, cur.s, cur.s + .12), 1 - prog(t, cur.e - .1, cur.e)));
  subsEl.style.opacity = a;
  subsEl.style.transform = `translateY(${(1 - ease.out(prog(t, cur.s, cur.s + .2))) * 14}px)`;
  const spans = subsEl.querySelectorAll('.w');
  cur.words.forEach((w, i) => { spans[i].className = 'w' + (t >= w.s ? ' on' : '') + (t >= w.s && t < w.e + .05 ? ' now' : ''); });
}

window.PENDING = [];
window.seek = async function (tv) {
  if (!built) buildAll();
  PENDING.length = 0;
  const ts = TL.remap ? TL.remap(tv) : tv;
  const t = ts + (TL.lead ?? 0);           // picture leads the voice slightly (cut on the beat, not after it)
  const active = TL.scenes.filter(sc => t >= sc.s && t < sc.e);
  const focus = active.length ? active[active.length - 1].focus?.(t - active[active.length - 1].s, t) : null;
  drawBackground(t, focus);
  for (const sc of TL.scenes) {
    const on = t >= sc.s && t < sc.e;
    if (!on) { sc.root.style.opacity = 0; sc.root.style.display = 'none'; continue; }
    sc.root.style.display = '';
    const f = fadeIO(t, sc.s, sc.e, sc.fi ?? .3, sc.fo ?? .25);
    sc.root.style.opacity = f;
    window.CUR_FADE = f;
    sc.update(sc.root, t - sc.s, t, sc);
    window.CUR_FADE = 1;
    const k = sc.s > 0 ? ease.out(prog(t, sc.s, sc.s + .32)) : 1;   // punch-in on every cut
    sc.root.style.transform = k < 1 ? `scale(${1.06 - .06 * k})` : '';
  }
  if (flashEl) { let fl = 0; for (const x of (TL.flashes || [])) if (t >= x) fl = Math.max(fl, 1 - prog(t, x, x + .28)); flashEl.style.opacity = fl * .5; }
  renderSubs(ts + .18);   // highlight ~0.14 s ahead: word onsets precede the vowel nuclei we align on
  bugEl.style.opacity = TL.bug ? TL.bug(t) : 1;
  progEl.style.width = (clamp(t / TL.voiceEnd) * W) + 'px';
  progEl.style.opacity = t < TL.voiceEnd ? .9 : 0;
  if (window.G3) G3.render(t);
  if (PENDING.length) await Promise.all(PENDING);
  return true;
};
window.ready = () => document.fonts.ready.then(() => new Promise(r => { const k = () => window.G3ready ? r(1) : setTimeout(k, 50); k(); }));

// Real footage as pre-extracted 30 fps JPEG sequences (frame-accurate in headless render).
const CLIPS = { t_flip: 90, t_climb: 234, t_top: 42, t_wall: 36, t_fall: 174, t_land: 72, t_jump: 102, t_rear: 60, t_drive: 87, t_jets: 54, t_smoke: 96, jump: 87, ramp: 69, under: 23, flight: 147, truck: 87, launch: 57, side: 21, doors: 117, musk: 117, smoke: 57, plume: 42, redramp: 20 };
function setClip(img, name, ct) {
  const n = CLIPS[name];
  const i = Math.max(1, Math.min(n, Math.floor(ct * 30) + 1));
  const src = `clips/${name}/${String(i).padStart(4, '0')}.jpg`;
  if (img.dataset.src !== src) {
    img.dataset.src = src; img.src = src;
    PENDING.push(img.decode().catch(() => {}));
  }
}
