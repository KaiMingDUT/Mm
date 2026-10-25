// KROZO — "الكوكيز" 3D world: floating browser windows (live canvas UI), a data cookie, the browser's cookie jar,
// the website's server, a 3D cursor. timeline.js owns the shot list; every frame we reset, the active shot poses
// the world, then we render.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

await Promise.all(['700 40px Plex', '500 30px Plex', '400 30px Plex', '700 40px PlexLatin', '500 30px PlexLatin'].map(f => document.fonts.load(f)));
const RS = +(new URLSearchParams(location.search).get('rs') || 1);
const W = Math.round(1080 * RS), H = Math.round(1920 * RS);
const canvas = document.getElementById('gl');
canvas.style.width = '1080px'; canvas.style.height = '1920px';
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(30, W / H, .01, 400);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const COL = { bg: 0x080B12, blue: 0x168BFF, cyan: 0x59C7FF, ink: 0xF4F7FB, gray: 0xA7B1C2 };
const CSS = { bg: '#080B12', blue: '#168BFF', cyan: '#59C7FF', ink: '#F4F7FB', gray: '#A7B1C2', card: '#0E1522', line: '#1C2738', deep: '#05070C' };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const pg = (t, a, b) => clamp((t - a) / (b - a));
const eo = k => 1 - Math.pow(1 - k, 3);
const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(11);
const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const tex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
function rr(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const AR = (g, px, wt = 700) => { g.font = `${wt} ${px}px Plex, PlexLatin`; g.direction = 'rtl'; };
const LA = (g, px, wt = 500) => { g.font = `${wt} ${px}px PlexLatin`; g.direction = 'ltr'; };

const pm = new THREE.PMREMGenerator(renderer);
const ENV = pm.fromScene(new RoomEnvironment(), .04).texture;
const DOT = (() => { const [c, g] = cnv(128, 128); const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.4, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return tex(c); })();

// ═════════ 2D UI kit (drawn into panel canvases) ═════════
// generic sneaker, side view (no brand marks): blue upper, cyan accent stripes, white sole
function sneaker(g, cx, cy, s, a = 1) {
  g.save(); g.translate(cx, cy); g.scale(s, s); g.globalAlpha *= a;
  const up = g.createLinearGradient(-150, -90, 150, 40); up.addColorStop(0, '#2a9bff'); up.addColorStop(1, '#0f5fc0');
  g.beginPath(); g.moveTo(-160, 20); g.bezierCurveTo(-165, -40, -120, -60, -95, -62); g.lineTo(-40, -95); g.bezierCurveTo(-10, -110, 20, -90, 30, -60);
  g.bezierCurveTo(70, -40, 120, -30, 150, -5); g.bezierCurveTo(170, 8, 168, 25, 160, 30); g.lineTo(-160, 30); g.closePath(); g.fillStyle = up; g.fill();
  g.beginPath(); g.moveTo(-168, 28); g.lineTo(166, 28); g.bezierCurveTo(176, 32, 176, 56, 160, 58); g.lineTo(-160, 58); g.bezierCurveTo(-176, 56, -178, 32, -168, 28); g.fillStyle = '#F4F7FB'; g.fill();
  g.fillStyle = '#A7B1C2'; g.fillRect(-160, 46, 320, 5);
  g.strokeStyle = '#59C7FF'; g.lineWidth = 9; g.lineCap = 'round';
  for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-60 + i * 34, -58 + i * 6); g.lineTo(-20 + i * 34, 18); g.stroke(); }
  g.fillStyle = '#F4F7FB'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(-58 + i * 18, -82 + i * 8, 5, 0, 7); g.fill(); }
  g.fillStyle = 'rgba(8,11,18,.45)'; g.beginPath(); g.ellipse(-118, -40, 22, 12, -.4, 0, 7); g.fill();
  g.restore();
}
// flat cookie icon (navy disc with a bite and cyan chips)
function cookieIcon(g, cx, cy, r, a = 1) {
  g.save(); g.globalAlpha *= a; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.arc(cx + r * .78, cy - r * .62, r * .36, 0, Math.PI * 2, true);
  g.fillStyle = '#1d4f96'; g.fill('evenodd'); g.strokeStyle = '#59C7FF'; g.lineWidth = r * .08; g.stroke();
  g.fillStyle = '#59C7FF'; for (const [x, y] of [[-.4, -.2], [.1, .35], [-.15, .55], [.35, -.05], [-.5, .3]]) { g.beginPath(); g.arc(cx + x * r, cy + y * r, r * .1, 0, 7); g.fill(); }
  g.restore();
}
function cartIcon(g, x, y, s, col) {
  g.save(); g.translate(x, y); g.scale(s, s); g.strokeStyle = col; g.lineWidth = 6; g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-34, -26); g.lineTo(-24, -26); g.lineTo(-14, 14); g.lineTo(26, 14); g.lineTo(34, -14); g.lineTo(-20, -14); g.stroke();
  g.fillStyle = col; g.beginPath(); g.arc(-8, 26, 5, 0, 7); g.arc(20, 26, 5, 0, 7); g.fill(); g.restore();
}
function check(g, x, y, r, col = CSS.cyan, k = 1) {
  g.save(); g.strokeStyle = col; g.lineWidth = r * .16; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
  g.beginPath(); const p = [[x - r * .42, y + r * .02], [x - r * .1, y + r * .32], [x + r * .45, y - r * .3]];
  g.moveTo(...p[0]); if (k > .5) { g.lineTo(...p[1]); g.lineTo(p[1][0] + (p[2][0] - p[1][0]) * (k - .5) * 2, p[1][1] + (p[2][1] - p[1][1]) * (k - .5) * 2); } else g.lineTo(p[0][0] + (p[1][0] - p[0][0]) * k * 2, p[0][1] + (p[1][1] - p[0][1]) * k * 2);
  g.stroke(); g.restore();
}
function button(g, x, y, w, h, label, kind, press = 0, glow = 0) {
  g.save(); const s = 1 - .06 * Math.sin(Math.PI * clamp(press)); g.translate(x + w / 2, y + h / 2); g.scale(s, s);
  if (glow > 0) { g.shadowColor = kind === 'fill' ? CSS.cyan : CSS.gray; g.shadowBlur = 40 * glow; }
  rr(g, -w / 2, -h / 2, w, h, h / 2);
  if (kind === 'fill') { const gr = g.createLinearGradient(-w / 2, 0, w / 2, 0); gr.addColorStop(0, CSS.blue); gr.addColorStop(1, '#3aa8ff'); g.fillStyle = gr; g.fill(); }
  else { g.fillStyle = `rgba(167,177,194,${.06 + .14 * glow})`; g.fill(); g.lineWidth = 4; g.strokeStyle = glow > 0 ? `rgba(244,247,251,${.5 + .5 * glow})` : 'rgba(167,177,194,.55)'; g.stroke(); }
  g.shadowBlur = 0; AR(g, h * .42); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = kind === 'fill' ? '#fff' : CSS.ink; g.fillText(label, 0, 2);
  g.restore();
}
// browser chrome: tab strip + URL pill. returns content top y
function chrome(g, w, h, url, o = {}) {
  const u = w / 900; g.fillStyle = CSS.card; rr(g, 0, 0, w, h, 46 * u); g.fill();
  g.save(); rr(g, 0, 0, w, h, 46 * u); g.clip();
  g.fillStyle = '#0A101B'; g.fillRect(0, 0, w, 190 * u);
  g.fillStyle = '#2A3446'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(60 * u + i * 36 * u, 54 * u, 11 * u, 0, 7); g.fill(); }
  g.fillStyle = CSS.card; rr(g, 200 * u, 22 * u, 380 * u, 70 * u, 18 * u); g.fill();
  LA(g, 28 * u); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = CSS.gray; g.fillText(o.tab ?? url, 236 * u, 58 * u);
  rr(g, 40 * u, 108 * u, w - 80 * u, 62 * u, 31 * u); g.fillStyle = '#141D2C'; g.fill();
  g.strokeStyle = CSS.gray; g.lineWidth = 3.5 * u; rr(g, 70 * u, 126 * u, 20 * u, 18 * u, 3 * u); g.stroke(); g.beginPath(); g.arc(80 * u, 126 * u, 8 * u, Math.PI, 0); g.stroke();
  LA(g, 30 * u); g.fillStyle = CSS.ink; g.textAlign = 'left'; g.fillText(url, 108 * u, 140 * u);
  g.restore(); return 190 * u;
}
const SITES = [   // index 4 (the centre of the wall) is the shop of the story
  { url: 'akhbar.news', t: 'أخبار اليوم', ic: 'news' }, { url: 'tabkh.food', t: 'وصفات', ic: 'plate' }, { url: 'tube.video', t: 'فيديو', ic: 'play' },
  { url: 'safar.trip', t: 'رحلات', ic: 'plane' }, { url: 'matjar.store', t: 'متجر', ic: 'shoe' }, { url: 'map.go', t: 'خرائط', ic: 'pin' },
  { url: 'learn.edu', t: 'دورات', ic: 'book' }, { url: 'music.fm', t: 'موسيقى', ic: 'note' }, { url: 'bank.app', t: 'حسابي', ic: 'chart' },
];
function glyph(g, ic, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s); g.strokeStyle = CSS.ink; g.fillStyle = CSS.ink; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
  if (ic === 'play') { g.beginPath(); g.moveTo(-22, -30); g.lineTo(32, 0); g.lineTo(-22, 30); g.closePath(); g.fill(); }
  else if (ic === 'pin') { g.beginPath(); g.arc(0, -12, 26, Math.PI * .85, Math.PI * .15); g.lineTo(0, 40); g.closePath(); g.stroke(); g.beginPath(); g.arc(0, -12, 9, 0, 7); g.fill(); }
  else if (ic === 'plane') { g.beginPath(); g.moveTo(-40, 6); g.lineTo(40, -6); g.moveTo(10, -2); g.lineTo(-10, -34); g.moveTo(10, -2); g.lineTo(-6, 30); g.moveTo(-34, 5); g.lineTo(-42, -12); g.stroke(); }
  else if (ic === 'plate') { g.beginPath(); g.arc(0, 0, 32, 0, 7); g.stroke(); g.beginPath(); g.arc(0, 0, 16, 0, 7); g.stroke(); }
  else if (ic === 'book') { g.beginPath(); g.moveTo(0, -24); g.lineTo(-38, -32); g.lineTo(-38, 26); g.lineTo(0, 34); g.lineTo(38, 26); g.lineTo(38, -32); g.closePath(); g.moveTo(0, -24); g.lineTo(0, 34); g.stroke(); }
  else if (ic === 'note') { g.beginPath(); g.moveTo(-8, 22); g.lineTo(-8, -32); g.lineTo(26, -40); g.lineTo(26, 14); g.stroke(); g.beginPath(); g.arc(-18, 24, 11, 0, 7); g.arc(16, 16, 11, 0, 7); g.fill(); }
  else if (ic === 'chart') { for (let i = 0; i < 4; i++) g.fillRect(-36 + i * 20, 30 - (14 + i * 14), 13, 14 + i * 14); }
  else if (ic === 'news') { g.lineWidth = 6; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-34, -24 + i * 16); g.lineTo(i ? 34 : 10, -24 + i * 16); g.stroke(); } }
  else if (ic === 'shoe') { g.restore(); sneaker(g, x, y, s * .22); return; }
  g.restore();
}
// a generic website page: hero card with an icon, a title, skeleton text
function sitePage(g, w, h, site, top) {
  const u = w / 900; const x0 = 50 * u, cw = w - 100 * u;
  const gr = g.createLinearGradient(0, top + 40 * u, w, top + 440 * u); gr.addColorStop(0, '#0d3a74'); gr.addColorStop(1, '#0a1f3f');
  g.fillStyle = gr; rr(g, x0, top + 40 * u, cw, 400 * u, 30 * u); g.fill();
  g.globalAlpha = .9; glyph(g, site.ic, w / 2, top + 240 * u, 2.4 * u); g.globalAlpha = 1;
  AR(g, 56 * u); g.textAlign = 'right'; g.textBaseline = 'alphabetic'; g.fillStyle = CSS.ink; g.fillText(site.t, w - x0, top + 540 * u);
  g.fillStyle = '#1C2738'; for (let i = 0; i < 7; i++) { const lw = cw * (i % 3 === 2 ? .55 : .92); rr(g, w - x0 - lw, top + 590 * u + i * 58 * u, lw, 22 * u, 11 * u); g.fill(); }
  for (let i = 0; i < 2; i++) { g.fillStyle = '#121B2A'; rr(g, x0 + i * (cw / 2 + 10 * u), top + 1010 * u, cw / 2 - 10 * u, 260 * u, 24 * u); g.fill(); }
}
// the cookie banner (bottom sheet). s = {k: slide 0..1, pa: press on سماح, pr: press on عدم السماح, ga/gr: glow, gone}
function bannerCard(g, x, y, w, h, s = {}) {
  const u = w / 900;
  g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 60 * u; rr(g, x, y, w, h, 40 * u); g.fillStyle = '#101826'; g.fill(); g.shadowBlur = 0;
  g.lineWidth = 3 * u; g.strokeStyle = 'rgba(22,139,255,.55)'; g.stroke();
  cookieIcon(g, x + w - 90 * u, y + 92 * u, 44 * u);
  AR(g, 46 * u); g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillStyle = CSS.ink; g.fillText('هذا الموقع يستخدم الكوكيز', x + w - 160 * u, y + 82 * u);
  AR(g, 32 * u, 400); g.fillStyle = CSS.gray; g.fillText('عشان يتذكّرك ويحسّن تجربتك', x + w - 160 * u, y + 140 * u);
  const bw = (w - 150 * u) / 2, by = y + h - 150 * u;
  button(g, x + w - 60 * u - bw, by, bw, 104 * u, 'سماح', 'fill', s.pa ?? 0, s.ga ?? 0);
  button(g, x + 60 * u, by, bw, 104 * u, 'عدم السماح', 'line', s.pr ?? 0, s.gr ?? 0);
  g.restore();
}
function siteWithBanner(g, w, h, site, s) {
  const top = chrome(g, w, h, site.url); sitePage(g, w, h, site, top);
  if (s.dim) { g.fillStyle = `rgba(5,7,12,${.45 * s.dim})`; rr(g, 0, top, w, h - top, 0); g.fill(); }
  const k = s.k ?? 0; if (k <= 0) return;
  const u = w / 900, bh = 440 * u; bannerCard(g, 30 * u, h - (bh + 30 * u) * eo(k) + (s.gone ?? 0) * (bh + 60 * u), w - 60 * u, bh, s);
}

// ═════════ panels: a glass slab + a live canvas screen + a soft rim glow ═════════
const rimTex = (() => { const [c, g] = cnv(256, 256); g.strokeStyle = 'rgba(89,199,255,1)'; g.lineWidth = 6; g.shadowColor = '#59C7FF'; g.shadowBlur = 24; rr(g, 30, 30, 196, 196, 26); g.stroke(); return tex(c); })();
const slabM = () => new THREE.MeshPhysicalMaterial({ color: 0x0a1220, metalness: .4, roughness: .28, clearcoat: 1, clearcoatRoughness: .2, transparent: true });
function panel(cw, ch, ww) {
  const wh = ww * ch / cw, grp = new THREE.Group(), [c, g] = cnv(cw, ch), t = tex(c);
  const slab = new THREE.Mesh(new RoundedBoxGeometry(ww + .05, wh + .05, .05, 4, .05), slabM()); slab.position.z = -.03; grp.add(slab);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), new THREE.MeshBasicMaterial({ map: t, toneMapped: false, transparent: true })); scr.position.z = .002; scr.renderOrder = 2; grp.add(scr);
  const rim = new THREE.Mesh(new THREE.PlaneGeometry(ww * 1.16, wh + ww * .16), new THREE.MeshBasicMaterial({ map: rimTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: .0 }));
  rim.position.z = -.06; grp.add(rim);
  grp.visible = false; scene.add(grp);
  const P = { g: grp, c, x: g, t, ww, wh, key: null, scr, slab, rim };
  P.paint = (key, fn) => { if (P.key === key) return; P.key = key; g.clearRect(0, 0, cw, ch); fn(g, cw, ch); t.needsUpdate = true; };
  P.at = (pos, rx = 0, ry = 0, rz = 0, s = 1, a = 1, rimA = .35) => {
    grp.visible = a > .002; grp.position.copy(pos); grp.rotation.set(rx, ry, rz); grp.scale.setScalar(s);
    scr.material.opacity = a; slab.material.opacity = a; rim.material.opacity = rimA * a; grp.updateMatrixWorld(true);
  };
  // world position of a canvas pixel (for cursors, labels, packets)
  P.pt = (px, py, z = .01) => grp.localToWorld(V((px / cw - .5) * ww, (.5 - py / ch) * wh, z));
  return P;
}
const WALL = SITES.map(() => panel(450, 750, .9));
const MAIN = panel(900, 1500, 1.8);
const BANNER = panel(900, 470, 1.8);
const CAL = panel(700, 820, 1.2);
const FILE = panel(820, 980, 1.5);
const LOGIN = panel(760, 440, 1.3), CART = panel(760, 440, 1.3), WELCOME = panel(760, 380, 1.3);
const PANELS = [...WALL, MAIN, BANNER, CAL, FILE, LOGIN, CART, WELCOME];

// ── panel contents ──
function paintWall(i, s) {
  const P = WALL[i], key = `${(s.k ?? 0).toFixed(2)}|${(s.pa ?? 0).toFixed(2)}|${(s.gone ?? 0).toFixed(2)}`;
  P.paint(key, (g, w, h) => siteWithBanner(g, w, h, SITES[i], s));
}
// shop page states: add (press 0..1), added, badge count n, fly (shoe flying to the cart 0..1), drawer (cart drawer open 0..1)
function paintShop(s) {
  const key = 'shop|' + JSON.stringify(s);
  MAIN.paint(key, (g, w, h) => {
    const u = w / 900, top = chrome(g, w, h, 'matjar.store');
    AR(g, 50 * u); g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillStyle = CSS.ink; g.fillText('متجر', w - 60 * u, top + 70 * u);
    cartIcon(g, 110 * u, top + 70 * u, 1.3 * u, CSS.ink);
    if (s.n) { const k = eo(clamp(s.nk ?? 1)); g.save(); g.translate(152 * u, top + 40 * u); g.scale(k, k); g.fillStyle = CSS.blue; g.beginPath(); g.arc(0, 0, 28 * u, 0, 7); g.fill(); LA(g, 34 * u, 700); g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText(String(s.n), 0, 2 * u); g.restore(); }
    const cx = w / 2, py = top + 150 * u;
    const gr = g.createLinearGradient(0, py, 0, py + 620 * u); gr.addColorStop(0, '#103866'); gr.addColorStop(1, '#0a1730');
    g.fillStyle = gr; rr(g, 50 * u, py, w - 100 * u, 620 * u, 36 * u); g.fill();
    g.fillStyle = 'rgba(89,199,255,.10)'; g.beginPath(); g.ellipse(cx, py + 470 * u, 300 * u, 46 * u, 0, 0, 7); g.fill();
    if (!(s.fly > 0)) sneaker(g, cx, py + 330 * u, 1.9 * u);
    AR(g, 58 * u); g.textAlign = 'right'; g.fillStyle = CSS.ink; g.fillText('حذاء رياضي', w - 60 * u, py + 700 * u);
    AR(g, 44 * u, 500); g.fillStyle = CSS.cyan; g.fillText('249 ريال', w - 60 * u, py + 780 * u);
    g.fillStyle = '#1C2738'; for (let i = 0; i < 3; i++) { rr(g, w - 60 * u - (i === 2 ? 420 : 760) * u, py + 850 * u + i * 52 * u, (i === 2 ? 420 : 760) * u, 20 * u, 10 * u); g.fill(); }
    const label = s.added ? 'أُضيف للسلة ✓' : 'أضف للسلة';
    button(g, 60 * u, h - 230 * u, w - 120 * u, 130 * u, label, 'fill', s.add ?? 0, s.added ? .8 : 0);
    if (s.fly > 0) { const k = eo(s.fly), x = cx + (130 * u - cx) * k, y = py + 330 * u + (top + 70 * u - py - 330 * u) * k - Math.sin(k * Math.PI) * 180 * u; sneaker(g, x, y, (1.9 - 1.7 * k) * u, 1 - .7 * k); }
    if (s.drawer > 0) {
      const k = eo(s.drawer), dh = 430 * u, y = h - dh * k;
      g.fillStyle = `rgba(5,7,12,${.5 * k})`; g.fillRect(0, top, w, h - top);
      g.save(); rr(g, 20 * u, y, w - 40 * u, dh + 60 * u, 40 * u); g.fillStyle = '#101826'; g.fill(); g.lineWidth = 3 * u; g.strokeStyle = 'rgba(89,199,255,.6)'; g.stroke();
      AR(g, 48 * u); g.textAlign = 'right'; g.fillStyle = CSS.ink; g.fillText('سلتك (1)', w - 70 * u, y + 80 * u);
      g.fillStyle = '#0d2a52'; rr(g, w - 330 * u, y + 140 * u, 260 * u, 200 * u, 24 * u); g.fill(); sneaker(g, w - 200 * u, y + 250 * u, .62 * u);
      AR(g, 42 * u); g.fillStyle = CSS.ink; g.fillText('حذاء رياضي', w - 370 * u, y + 200 * u);
      AR(g, 36 * u, 500); g.fillStyle = CSS.cyan; g.fillText('249 ريال', w - 370 * u, y + 270 * u);
      if (s.ok > 0) check(g, 130 * u, y + 240 * u, 60 * u, CSS.cyan, s.ok);
      g.restore();
    }
  });
}
function paintNewTab(a = 1) {
  MAIN.paint('newtab', (g, w, h) => {
    const u = w / 900, top = chrome(g, w, h, '', { tab: 'صفحة جديدة' });
    AR(g, 50 * u, 500); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = CSS.gray; g.fillText('صفحة جديدة', w / 2, top + 420 * u);
    rr(g, 90 * u, top + 520 * u, w - 180 * u, 100 * u, 50 * u); g.fillStyle = '#141D2C'; g.fill();
    for (let i = 0; i < 4; i++) { g.fillStyle = '#121B2A'; rr(g, 110 * u + i * 180 * u, top + 720 * u, 140 * u, 140 * u, 30 * u); g.fill(); }
  });
}
// cookie-jar view of the browser (K5): the page fades to a translucent blueprint, the cookie rises from it
function paintShopGhost(a) {
  MAIN.paint('ghost' + a.toFixed(2), (g, w, h) => {
    const u = w / 900, top = chrome(g, w, h, 'matjar.store');
    g.globalAlpha = 1 - .65 * a; sneaker(g, w / 2, top + 480 * u, 1.9 * u); g.globalAlpha = 1;
    g.strokeStyle = `rgba(89,199,255,${.25 * a})`; g.lineWidth = 2; for (let y = top; y < h; y += 40 * u) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  });
}
function paintBanner(s) {
  BANNER.paint('b|' + JSON.stringify(s), (g, w, h) => bannerCard(g, 0, 0, w, h, s));
}
// calendar page: day (25 → 26) with a label; k = flip progress handled in 3D
function paintCal(day, lab) {
  CAL.paint('cal' + day, (g, w, h) => {
    const u = w / 700; g.fillStyle = CSS.card; rr(g, 0, 0, w, h, 50 * u); g.fill();
    g.save(); rr(g, 0, 0, w, h, 50 * u); g.clip(); const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, CSS.blue); gr.addColorStop(1, '#3aa8ff'); g.fillStyle = gr; g.fillRect(0, 0, w, 190 * u); g.restore();
    AR(g, 70 * u); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText('أكتوبر', w / 2, 98 * u);
    LA(g, 360 * u, 700); g.fillStyle = CSS.ink; g.fillText(String(day), w / 2, 470 * u);
    AR(g, 76 * u); g.fillStyle = lab === 'بكرة' ? CSS.cyan : CSS.gray; g.fillText(lab, w / 2, 710 * u);
  });
}
function paintFile(k, hl = -1) {
  FILE.paint('f' + k.toFixed(2) + hl, (g, w, h) => {
    const u = w / 820; g.fillStyle = '#0E1624'; rr(g, 0, 0, w, h, 40 * u); g.fill(); g.lineWidth = 3 * u; g.strokeStyle = 'rgba(89,199,255,.6)'; g.stroke();
    // file icon + name
    g.save(); g.translate(70 * u, 60 * u); g.fillStyle = '#1d4f96'; g.beginPath(); g.moveTo(0, 0); g.lineTo(60 * u, 0); g.lineTo(84 * u, 24 * u); g.lineTo(84 * u, 104 * u); g.lineTo(0, 104 * u); g.closePath(); g.fill();
    g.fillStyle = CSS.cyan; g.fillRect(14 * u, 52 * u, 56 * u, 6 * u); g.fillRect(14 * u, 70 * u, 40 * u, 6 * u); g.restore();
    LA(g, 52 * u, 700); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = CSS.ink; g.fillText('cookie.txt', 180 * u, 112 * u);
    AR(g, 34 * u, 500); g.textAlign = 'right'; g.fillStyle = CSS.gray; g.fillText('ملف نصي صغير', w - 60 * u, 112 * u);
    g.fillStyle = '#1C2738'; g.fillRect(50 * u, 200 * u, w - 100 * u, 3 * u);
    const L = [['site', 'matjar.store'], ['cart', 'shoe_249'], ['login', 'user_8f3a'], ['lang', 'ar'], ['expires', '30 days']];
    LA(g, 46 * u, 500); g.textAlign = 'left';
    L.forEach(([a, b], i) => {
      const r = clamp(k * L.length - i); if (r <= 0) return; const y = 290 * u + i * 128 * u;
      if (i === hl) { g.fillStyle = 'rgba(22,139,255,.22)'; rr(g, 40 * u, y - 52 * u, w - 80 * u, 104 * u, 20 * u); g.fill(); }
      const txt = `${a} = ${b}`, n = Math.round(txt.length * clamp(r * 1.2));
      g.fillStyle = CSS.cyan; g.fillText(a, 70 * u, y); const aw = g.measureText(a + ' ').width;
      g.fillStyle = CSS.ink; g.fillText(txt.slice(a.length, n), 70 * u + aw - g.measureText(' ').width, y);
    });
  });
}
function paintLogin(k) {
  LOGIN.paint('l' + k.toFixed(2), (g, w, h) => {
    const u = w / 760; g.fillStyle = '#101826'; rr(g, 0, 0, w, h, 40 * u); g.fill(); g.lineWidth = 3 * u; g.strokeStyle = 'rgba(89,199,255,.6)'; g.stroke();
    g.fillStyle = '#1d4f96'; g.beginPath(); g.arc(w - 140 * u, h / 2, 82 * u, 0, 7); g.fill();
    g.fillStyle = CSS.ink; g.beginPath(); g.arc(w - 140 * u, h / 2 - 22 * u, 28 * u, 0, 7); g.fill(); g.beginPath(); g.ellipse(w - 140 * u, h / 2 + 46 * u, 48 * u, 30 * u, 0, Math.PI, 0); g.fill();
    AR(g, 50 * u); g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillStyle = CSS.ink; g.fillText('تسجيل دخولك', w - 260 * u, h / 2 - 40 * u);
    AR(g, 38 * u, 500); g.fillStyle = CSS.cyan; g.fillText('محفوظ ✓', w - 260 * u, h / 2 + 40 * u);
    if (k > 0) check(g, 100 * u, h / 2, 54 * u, CSS.cyan, k);
  });
}
function paintCart(k) {
  CART.paint('c' + k.toFixed(2), (g, w, h) => {
    const u = w / 760; g.fillStyle = '#101826'; rr(g, 0, 0, w, h, 40 * u); g.fill(); g.lineWidth = 3 * u; g.strokeStyle = 'rgba(89,199,255,.6)'; g.stroke();
    g.fillStyle = '#0d2a52'; rr(g, w - 250 * u, 70 * u, 200 * u, h - 140 * u, 30 * u); g.fill(); sneaker(g, w - 150 * u, h / 2 + 10 * u, .5 * u);
    AR(g, 50 * u); g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillStyle = CSS.ink; g.fillText('سلة مشترياتك', w - 290 * u, h / 2 - 40 * u);
    AR(g, 38 * u, 500); g.fillStyle = CSS.cyan; g.fillText('حذاء رياضي ×1', w - 290 * u, h / 2 + 40 * u);
    if (k > 0) check(g, 90 * u, h / 2, 54 * u, CSS.cyan, k);
  });
}
function paintWelcome(k) {
  WELCOME.paint('w' + k.toFixed(2), (g, w, h) => {
    const u = w / 760; g.fillStyle = '#101826'; rr(g, 0, 0, w, h, 40 * u); g.fill(); g.lineWidth = 3 * u; g.strokeStyle = 'rgba(89,199,255,.7)'; g.stroke();
    AR(g, 60 * u); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = CSS.ink; g.fillText('أهلًا من جديد!', w / 2 + 50 * u, h / 2 - 40 * u);
    AR(g, 36 * u, 500); g.fillStyle = CSS.cyan; g.fillText('سلتك فيها 1 منتج', w / 2 + 50 * u, h / 2 + 50 * u);
    if (k > 0) check(g, 100 * u, h / 2, 50 * u, CSS.cyan, k);
  });
}
// comments: typed text, sent, posted bubble
function paintComments(s) {
  MAIN.paint('cm|' + JSON.stringify(s), (g, w, h) => {
    const u = w / 900; g.fillStyle = CSS.card; rr(g, 0, 0, w, h, 46 * u); g.fill();
    AR(g, 54 * u); g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillStyle = CSS.ink; g.fillText('التعليقات', w - 60 * u, 90 * u);
    g.fillStyle = '#1C2738'; g.fillRect(50 * u, 160 * u, w - 100 * u, 3 * u);
    const row = (y, len, mine, txt, k = 1) => {
      g.save(); g.globalAlpha = k; g.fillStyle = mine ? '#1d4f96' : '#1C2738'; g.beginPath(); g.arc(w - 100 * u, y, 42 * u, 0, 7); g.fill();
      if (mine) { g.fillStyle = CSS.ink; g.beginPath(); g.arc(w - 100 * u, y - 10 * u, 14 * u, 0, 7); g.fill(); g.beginPath(); g.ellipse(w - 100 * u, y + 22 * u, 24 * u, 15 * u, 0, Math.PI, 0); g.fill(); }
      g.fillStyle = mine ? 'rgba(22,139,255,.22)' : '#141D2C'; rr(g, w - 170 * u - len, y - 50 * u, len, 100 * u, 30 * u); g.fill();
      if (mine) { g.lineWidth = 3 * u; g.strokeStyle = 'rgba(89,199,255,.7)'; g.stroke(); }
      if (txt) { AR(g, 46 * u); g.textAlign = 'right'; g.fillStyle = CSS.ink; g.fillText(txt, w - 200 * u, y + 2 * u); }
      else { g.fillStyle = '#2A3446'; rr(g, w - 140 * u - len, y - 10 * u, len - 60 * u, 20 * u, 10 * u); g.fill(); }
      g.restore();
    };
    const sh = (s.post ?? 0) * 150 * u;
    if (s.post > 0) row(260 * u, 300 * u, true, 'تقنية', clamp(s.post * 2));
    row(260 * u + sh, 560 * u, false); row(410 * u + sh, 440 * u, false); row(560 * u + sh, 620 * u, false); row(710 * u + sh, 380 * u, false);
    if (s.post > 0) { const k = eo(clamp(s.post * 1.5 - .3)); g.fillStyle = CSS.cyan; AR(g, 40 * u, 500); g.textAlign = 'left'; g.fillText('♥ ' + Math.round(k * 128), 80 * u, 262 * u); }
    // input
    const iy = h - 200 * u; g.fillStyle = '#0A101B'; g.fillRect(0, iy - 40 * u, w, 240 * u);
    rr(g, 180 * u, iy, w - 240 * u, 110 * u, 55 * u); g.fillStyle = '#141D2C'; g.fill(); g.lineWidth = 3 * u; g.strokeStyle = s.focus ? 'rgba(89,199,255,.8)' : 'rgba(167,177,194,.3)'; g.stroke();
    const word = 'تقنية', n = Math.round(word.length * clamp(s.type ?? 0)), typed = (s.post ?? 0) > 0 ? '' : word.slice(0, n);
    AR(g, 48 * u, typed ? 700 : 400); g.textAlign = 'right'; g.fillStyle = typed ? CSS.ink : 'rgba(167,177,194,.6)'; g.fillText(typed || 'أضف تعليقًا…', w - 110 * u, iy + 56 * u);
    if (s.focus && !typed && !(s.post > 0)) { }
    g.save(); g.translate(100 * u, iy + 55 * u); const k = 1 - .1 * Math.sin(Math.PI * clamp(s.send ?? 0)); g.scale(k, k);
    g.fillStyle = typed ? CSS.blue : '#2A3446'; g.beginPath(); g.arc(0, 0, 52 * u, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-20 * u, -22 * u); g.lineTo(26 * u, 0); g.lineTo(-20 * u, 22 * u); g.lineTo(-10 * u, 0); g.closePath(); g.fill(); g.restore();
  });
}

// ═════════ 3D actors ═════════
// data cookie: a bitten disc (extruded), metallic navy with glowing cyan chips
const cookie = new THREE.Group(); scene.add(cookie);
const COOKIE = {};
{
  const bites = [[V(.82, .56, 0), .36], [V(1.02, .05, 0), .28]];
  const sh = new THREE.Shape(), N = 160;
  for (let i = 0; i <= N; i++) {
    const a = i / N * Math.PI * 2, u = V(Math.cos(a), Math.sin(a), 0); let r = 1;
    for (const [c, b] of bites) { const uc = u.dot(c), D = uc * uc - (c.lengthSq() - b * b); if (D > 0) { const s1 = uc - Math.sqrt(D), s2 = uc + Math.sqrt(D); if (s1 < r && s2 > r * .98) r = Math.max(.2, s1); } }
    i ? sh.lineTo(u.x * r, u.y * r) : sh.moveTo(u.x * r, u.y * r);
  }
  const geo = new THREE.ExtrudeGeometry(sh, { depth: .2, bevelEnabled: true, bevelThickness: .08, bevelSize: .07, bevelSegments: 5, curveSegments: 4 }); geo.translate(0, 0, -.1);
  const body = new THREE.MeshPhysicalMaterial({ color: 0x1b4a8c, metalness: .55, roughness: .32, clearcoat: .9, clearcoatRoughness: .25, emissive: 0x08203f, emissiveIntensity: .6 });
  const disc = new THREE.Mesh(geo, body); cookie.add(disc);
  const chipM = new THREE.MeshStandardMaterial({ color: 0x59c7ff, emissive: 0x59c7ff, emissiveIntensity: 1.6, roughness: .3, toneMapped: false });
  const chipG = new THREE.SphereGeometry(1, 20, 12);
  for (const [x, y, s] of [[-.45, .25, .11], [.05, .5, .09], [-.1, -.15, .12], [.35, -.45, .1], [-.55, -.45, .09], [.4, .15, .08], [-.2, .65, .07], [.1, -.7, .08], [-.75, .0, .07]]) {
    for (const z of [.17, -.17]) { const c = new THREE.Mesh(chipG, chipM); c.position.set(x, y, z); c.scale.set(s, s, s * .45); disc.add(c); }
  }
  const kl = new THREE.PointLight(0x59c7ff, 0, 6, 2); kl.position.set(0, 0, 1.4); cookie.add(kl);
  Object.assign(COOKIE, { geo, body, chipM, kl, disc });
  cookie.visible = false;
}
// small cookies for the jar, packets and the banner icon
const MINI = [];
for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(COOKIE.geo, COOKIE.body); const c = COOKIE.disc.children.slice(0, 6).map(x => x.clone()); c.forEach(x => m.add(x)); m.visible = false; scene.add(m); MINI.push(m); }
let miniN = 0;
function mini(pos, s, rot = 0, rx = 0) { if (miniN >= MINI.length) return; const m = MINI[miniN++]; m.visible = true; m.position.copy(pos); m.scale.setScalar(s); m.rotation.set(rx, 0, rot); return m; }

// the browser's cookie jar: glass (fresnel), brand-blue lid, label
const jar = new THREE.Group(); scene.add(jar);
const JAR = {};
{
  const prof = [[0, -1], [.62, -1], [.78, -.9], [.84, -.6], [.84, .55], [.74, .75], [.6, .82], [.6, .95]].map(([x, y]) => new THREE.Vector2(x, y));
  const glass = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false,
    uniforms: { k: { value: 1 } },
    vertexShader: 'varying vec3 vN, vV; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'varying vec3 vN, vV; uniform float k; void main(){ float f = pow(1.-abs(dot(normalize(vN), normalize(vV))), 2.2); gl_FragColor = vec4((vec3(.05,.2,.45)*.5 + vec3(.35,.78,1.)*f*1.1)*k, 1.); }',
  });
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), glass); jar.add(body);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(.68, .68, .2, 64), new THREE.MeshPhysicalMaterial({ color: 0x168bff, metalness: .7, roughness: .25, clearcoat: 1 }));
  lid.position.y = 1.04; jar.add(lid);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(.16, 24, 16), lid.material); knob.position.y = 1.18; jar.add(knob);
  const [c, g] = cnv(512, 256); g.fillStyle = 'rgba(8,11,18,.85)'; rr(g, 8, 8, 496, 240, 40); g.fill(); g.lineWidth = 6; g.strokeStyle = '#59C7FF'; g.stroke();
  g.strokeStyle = '#F4F7FB'; g.lineWidth = 8; g.beginPath(); g.arc(420, 128, 52, 0, 7); g.moveTo(368, 128); g.lineTo(472, 128); g.stroke(); g.beginPath(); g.ellipse(420, 128, 24, 52, 0, 0, 7); g.stroke();
  AR(g, 84); g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillStyle = '#F4F7FB'; g.fillText('المتصفح', 345, 134);
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .55), new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, toneMapped: false }));
  lab.position.set(0, -.15, .86); lab.renderOrder = 4; jar.add(lab);
  const jl = new THREE.PointLight(0x59c7ff, 0, 4, 2); jl.position.set(0, -.3, 0); jar.add(jl);
  Object.assign(JAR, { glass, lid, lab, jl });
  jar.visible = false;
}
// the website's server: three stacked units with blinking LEDs and a label
const server = new THREE.Group(); scene.add(server);
const SRV = { leds: [] };
{
  const m = new THREE.MeshPhysicalMaterial({ color: 0x141c2b, metalness: .8, roughness: .3, clearcoat: .6 });
  for (let i = 0; i < 3; i++) {
    const u = new THREE.Mesh(new RoundedBoxGeometry(1.4, .5, 1, 4, .06), m); u.position.y = i * .58; server.add(u);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(1.0, .05, .02), new THREE.MeshBasicMaterial({ color: 0x168bff, toneMapped: false })); strip.position.set(-.05, i * .58, .51); server.add(strip);
    for (let j = 0; j < 3; j++) { const l = new THREE.Mesh(new THREE.CircleGeometry(.035, 16), new THREE.MeshBasicMaterial({ color: 0x59c7ff, toneMapped: false })); l.position.set(.5 + j * .0 - .0, i * .58 + (j - 1) * .1, .51); l.position.x = .55; l.position.y = i * .58 - .1 + j * .1; server.add(l); SRV.leds.push(l); }
  }
  const [c, g] = cnv(512, 200); g.fillStyle = 'rgba(8,11,18,.85)'; rr(g, 8, 8, 496, 184, 40); g.fill(); g.lineWidth = 6; g.strokeStyle = '#168BFF'; g.stroke();
  AR(g, 80); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#F4F7FB'; g.fillText('الموقع', 256, 104);
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .43), new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, toneMapped: false })); lab.position.set(0, 1.62, 0); server.add(lab); SRV.lab = lab;
  server.visible = false;
}
// cursor arrow (extruded), white with a soft glow
const cursor = new THREE.Group(); scene.add(cursor);
{
  const s = new THREE.Shape(); const P = [[0, 0], [0, -1], [.26, -.76], [.46, -1.18], [.62, -1.1], [.42, -.7], [.74, -.7]]; s.moveTo(0, 0); P.slice(1).forEach(p => s.lineTo(p[0], p[1])); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: .08, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 3 });
  const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: 0xf4f7fb, metalness: .1, roughness: .35, clearcoat: 1, emissive: 0x223047, emissiveIntensity: .4 }));
  cursor.add(m); cursor.scale.setScalar(.16); cursor.visible = false;
}
function cursorAt(pos, s = .16, press = 0) { cursor.visible = true; cursor.position.copy(pos); cursor.scale.setScalar(s * (1 - .15 * Math.sin(Math.PI * clamp(press)))); cursor.quaternion.copy(cam.quaternion); cursor.rotateZ(.35); cursor.updateMatrixWorld(true); }

// ═════════ stage: void with a holographic grid floor + dust ═════════
const world = new THREE.Group(); scene.add(world);
const gridM = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, toneMapped: false,
  uniforms: { t: { value: 0 }, a: { value: 1 } },
  vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
  fragmentShader: `varying vec3 vW; uniform float t, a;
    void main(){ vec2 g = abs(fract(vW.xz*.5)-.5); float l = smoothstep(.485,.5,max(g.x,g.y));
      float d = length(vW.xz); float fade = exp(-d*.07);
      float sweep = exp(-pow(mod(d - t*2.5, 18.) - 9., 2.)*.25)*.6;
      gl_FragColor = vec4(vec3(.09,.55,1.)*(l*(.13+sweep*.45))*fade*a + vec3(.02,.05,.1)*fade*.2*a, (l*.5+.06)*fade*a); }`,
});
{
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), gridM); fl.rotation.x = -Math.PI / 2; fl.position.y = -2.2; world.add(fl);
  const pts = []; for (let i = 0; i < 1400; i++) pts.push((rnd() - .5) * 40, (rnd() - .3) * 20, (rnd() - .8) * 40);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  world.add(new THREE.Points(g, new THREE.PointsMaterial({ map: DOT, size: .09, color: 0x6fb8ff, transparent: true, opacity: .55, depthWrite: false, toneMapped: false })));
  const key = new THREE.DirectionalLight(0xdfeaff, 2.2); key.position.set(3, 5, 6); world.add(key);
  const fill = new THREE.DirectionalLight(0x168bff, 1.6); fill.position.set(-5, 1, 2); world.add(fill);
  const back = new THREE.DirectionalLight(0x59c7ff, 2.4); back.position.set(0, 3, -6); world.add(back);
  world.add(new THREE.HemisphereLight(0x2b4f8f, 0x05070c, .6));
}

// ═════════ FX pools: rings, beams, glow sprites ═════════
const ringGeo = new THREE.PlaneGeometry(1, 1), ringPool = [];
for (let i = 0; i < 60; i++) {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    uniforms: { col: { value: new THREE.Color() }, a: { value: 1 }, w: { value: .08 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec2 vUv; uniform vec3 col; uniform float a, w;
      void main(){ float r = length(vUv-.5)*2.; float d = abs(r-(1.-w)); float m = smoothstep(w, 0., d) + exp(-d*18.)*.35; m *= smoothstep(1.,.97,r); gl_FragColor = vec4(col*m*a, 1.); }`,
  });
  const r = new THREE.Mesh(ringGeo, m); r.visible = false; r.frustumCulled = false; r.renderOrder = 6; scene.add(r); ringPool.push(r);
}
let ringN = 0;
function ring(pos, rad, col, a, o = {}) {
  if (ringN >= ringPool.length || a <= .002 || rad <= 0) return;
  const r = ringPool[ringN++]; r.visible = true; r.position.copy(pos); r.scale.set(rad * 2, rad * 2, 1);
  r.material.uniforms.col.value.set(col); r.material.uniforms.a.value = a; r.material.uniforms.w.value = o.w ?? .06;
}
// a click: two expanding rings from `at`
function click(pos, t, at, size = .35) {
  for (const d of [0, .12]) { const k = pg(t, at + d, at + d + .55); if (k > 0 && k < 1) ring(pos, size * (.15 + eo(k)), COL.cyan, (1 - k) * 1.2); }
}
const beamGeo = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true), beamPool = [];
for (let i = 0; i < 20; i++) {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    uniforms: { col: { value: new THREE.Color() }, a: { value: 1 }, t: { value: 0 }, grow: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec2 vUv; uniform vec3 col; uniform float a, t, grow;
      void main(){ float y = 1.-vUv.y; if (y > grow) discard; float p = .35 + .65*pow(.5+.5*sin((y*6. - t)*6.2832), 6.); gl_FragColor = vec4(col*p*a, 1.); }`,
  });
  const b = new THREE.Mesh(beamGeo, m); b.visible = false; b.frustumCulled = false; b.renderOrder = 5; scene.add(b); beamPool.push(b);
}
let beamN = 0;
function beam(a, b, rad, col, al, o = {}) {
  if (beamN >= beamPool.length || al <= .002) return;
  const m = beamPool[beamN++]; m.visible = true; const d = b.clone().sub(a), len = d.length();
  m.position.copy(a).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); m.scale.set(rad, len, rad);
  const u = m.material.uniforms; u.col.value.set(col); u.a.value = al; u.t.value = o.t ?? 0; u.grow.value = o.grow ?? 1;
}
const sprPool = [];
for (let i = 0; i < 60; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: DOT, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); s.visible = false; s.renderOrder = 7; scene.add(s); sprPool.push(s); }
let sprN = 0;
function glow(pos, size, col, a = 1) { if (sprN >= sprPool.length || a <= .002) return; const s = sprPool[sprN++]; s.visible = true; s.position.copy(pos); s.scale.setScalar(size); s.material.color.set(col); s.material.opacity = a; }

// ═════════ post (bloom + grade: zoom blur, CA, vignette, grain, flash) ═════════
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, cam));
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), .35, .55, .85); composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, t: { value: 0 }, zb: { value: 0 }, ca: { value: .0015 }, vig: { value: .45 }, grain: { value: .035 }, flash: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float t, zb, ca, vig, grain, flash; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    void main(){ vec2 c = vec2(.5), d = vUv - c; vec3 col = vec3(0.); float n = zb > .001 ? 10. : 1.;
      for (float i = 0.; i < 10.; i++) { if (i >= n) break; float s = 1. - zb*i/10.*.12; vec2 uv = c + d*s; float k = ca*(1.+zb*6.)*length(d)*2.;
        col += vec3(texture2D(tDiffuse, uv + d*k).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - d*k).b); }
      col /= n; col *= 1. - vig*smoothstep(.35, 1.0, length(d*vec2(1.,.62))*1.6);
      col += (h(floor(vUv*vec2(1080.,1920.)) + fract(t*7.)*100.) - .5)*grain; col = mix(col, vec3(1.), flash);
      gl_FragColor = vec4(col, 1.); }`,
});
composer.addPass(grade);

// ═════════ per-frame API ═════════
function reset(t) {
  for (const P of PANELS) P.g.visible = false;
  cookie.visible = false; jar.visible = false; server.visible = false; cursor.visible = false;
  for (const m of MINI) m.visible = false; miniN = 0;
  for (const r of ringPool) r.visible = false; for (const b of beamPool) b.visible = false; for (const s of sprPool) s.visible = false; ringN = beamN = sprN = 0;
  scene.background = new THREE.Color(0x04060b); scene.fog = new THREE.FogExp2(0x04060b, .035); scene.environment = ENV; scene.environmentIntensity = .9;
  renderer.toneMappingExposure = 1; bloom.strength = .45; bloom.threshold = .72; bloom.radius = .6;
  gridM.uniforms.t.value = t; gridM.uniforms.a.value = 1; world.visible = true;
  cam.fov = 30; cam.up.set(0, 1, 0);
  grade.uniforms.zb.value = 0; grade.uniforms.flash.value = 0; grade.uniforms.vig.value = .45; grade.uniforms.ca.value = .0015;
  COOKIE.kl.intensity = 0; COOKIE.chipM.emissiveIntensity = 1.6; COOKIE.body.emissiveIntensity = .6; JAR.jl.intensity = 0; JAR.glass.uniforms.k.value = 1;
  cookie.scale.setScalar(1); cookie.rotation.set(0, 0, 0); jar.scale.setScalar(1); jar.rotation.set(0, 0, 0); server.scale.setScalar(1); server.rotation.set(0, 0, 0);
  SRV.leds.forEach((l, i) => l.material.color.setHex(Math.sin(t * (5 + i * 1.7) + i * 2.1) > .2 ? 0x59c7ff : 0x16345e));
}
function lookCam(pos, look, fov = 30, roll = 0) { cam.position.copy(pos); cam.fov = fov; cam.up.set(Math.sin(roll), Math.cos(roll), 0); cam.lookAt(look); cam.updateProjectionMatrix(); cam.updateMatrixWorld(); }
function project(v) { cam.updateMatrixWorld(); const p = v.clone().project(cam); return [(p.x * .5 + .5) * 1080, (-p.y * .5 + .5) * 1920]; }

window.R3 = {
  THREE, V, scene, cam, COL, WALL, MAIN, BANNER, CAL, FILE, LOGIN, CART, WELCOME, SITES,
  paintWall, paintShop, paintNewTab, paintShopGhost, paintBanner, paintCal, paintFile, paintLogin, paintCart, paintWelcome, paintComments,
  cookie, COOKIE, mini, jar, JAR, server, SRV, cursorAt, ring, click, beam, glow, bloom, grade: grade.uniforms, gridM, world, reset, lookCam, project, renderer,
};
window.G3 = {
  render(t) {
    const sh = (window.SHOTS || []).find(s => t >= s.s && t < s.e);
    canvas.style.opacity = sh ? (window.CUR3D ?? 1) : 0;
    if (!sh) { window.POST3D?.(null); return; }
    reset(t); grade.uniforms.t.value = t;
    const lt = t - sh.s;
    sh.update(lt, t, sh);
    if (!sh.noPunch && sh.s > 0) grade.uniforms.zb.value = Math.max(grade.uniforms.zb.value, .9 * Math.max(0, 1 - lt / .16));
    for (let i = 0; i < ringN; i++) ringPool[i].quaternion.copy(cam.quaternion);
    window.POST3D?.(sh, lt, t);
    composer.render();
  },
};
window.G3ready = true;
