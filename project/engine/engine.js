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
    scenesRoot.appendChild(sc.root);
  }
  built = true;
}

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
  cur.words.forEach((w, i) => {
    spans[i].className = 'w' + (t >= w.s ? ' on' : '') + (t >= w.s && t < w.e + .05 ? ' now' : '');
  });
}

window.seek = function (tv) {
  if (!built) buildAll();
  const t = TL.remap ? TL.remap(tv) : tv;
  const active = TL.scenes.filter(sc => t >= sc.s && t < sc.e);
  const focus = active.length ? active[active.length - 1].focus?.(t - active[active.length - 1].s, t) : null;
  drawBackground(t, focus);
  for (const sc of TL.scenes) {
    const on = t >= sc.s && t < sc.e;
    if (!on) { sc.root.style.opacity = 0; sc.root.style.display = 'none'; continue; }
    sc.root.style.display = '';
    sc.root.style.opacity = fadeIO(t, sc.s, sc.e, sc.fi ?? .3, sc.fo ?? .25);
    sc.update(sc.root, t - sc.s, t, sc);
  }
  renderSubs(t);
  bugEl.style.opacity = TL.bug ? TL.bug(t) : 1;
  progEl.style.width = (clamp(t / TL.voiceEnd) * W) + 'px';
  progEl.style.opacity = t < TL.voiceEnd ? .9 : 0;
  if (window.G3) G3.render(t);
  return true;
};
window.ready = () => document.fonts.ready.then(() => new Promise(r => { const k = () => window.G3ready ? r(1) : setTimeout(k, 50); k(); }));
