// KROZO — "كيف البلايستيشن يقرأ القرص؟" 3D world: a generic console (no brand marks), a game disc (data side with a
// live spiral track + diffraction sheen), the disc surface under a microscope (pits/lands from one deterministic
// pattern, 1 unit = 1 µm), a laser cross-section with a reflection signal, 0/1 digits, data blocks, a holo board
// (RAM/CPU/GPU), a screen with a live game frame, a low-poly game world. timeline.js owns the shot list: every
// frame we reset, the active shot poses the world, then we render.
import * as THREE from 'three';
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
const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(7);
const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const tex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
function rr(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const AR = (g, px, wt = 700) => { g.font = `${wt} ${px}px Plex, PlexLatin`; g.direction = 'rtl'; };
const LA = (g, px, wt = 500) => { g.font = `${wt} ${px}px PlexLatin`; g.direction = 'ltr'; };

// product env (AirTag lesson): dark room + soft boxes, so glossy white/black parts read without blowing out
const pm = new THREE.PMREMGenerator(renderer);
const ENV = (() => {
  const es = new THREE.Scene(); es.background = new THREE.Color(0x020306);
  const box = (w, h, col, k, pos) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide })); m.position.copy(pos); m.lookAt(0, 0, 0); es.add(m); };
  box(4, 1.2, 0xffffff, 2.2, V(0, 4, 1)); box(1, 5, 0x168bff, 2.5, V(-4, 1, -1)); box(1, 5, 0x59c7ff, 1.6, V(4, 1, -1.5)); box(3, .5, 0xffffff, .8, V(0, .6, 4));
  return pm.fromScene(es, .02).texture;
})();
const DOT = (() => { const [c, g] = cnv(128, 128); const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.4, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return tex(c); })();

// ═════════ the disc surface pattern (shared by the microscope shader and the laser cross-section) ═════════
// Each track is a run of lands and pits whose lengths are 3T…11T (T = 0.2777 µm), as on a real CD (EFM).
// Track pitch 1.6 µm, pit width 0.5 µm. Mask canvas: 20 px/µm, 4096 px = 204.8 µm along the track, 64 tracks.
const T = .2777, PX = 20, LEN = 204.8, NTR = 64, PITCH = 1.6;
const PITS = [];
for (let j = 0; j < NTR; j++) {
  const runs = []; let c = 1 + Math.floor(rnd() * 8);
  while (true) {
    c += 3 + Math.floor(rnd() * 9);                          // land
    const n = 3 + Math.floor(rnd() * 9);                     // pit
    if ((c + n) * T > LEN - 1) break;
    runs.push([c, c + n]); c += n;
  }
  PITS.push(runs);
}
const trackZ = j => (31 - j) * PITCH;                          // world z of track j's centre (track 31 at z = 0)
const MASK = (() => {
  const [c, g] = cnv(4096, 2048); g.fillStyle = '#000'; g.fillRect(0, 0, 4096, 2048); g.fillStyle = '#fff';
  PITS.forEach((runs, j) => { const y = (j * PITCH + .8) * PX; for (const [a, b] of runs) { const x0 = a * T * PX, x1 = b * T * PX, r = .25 * PX; rr(g, x0, y - r, x1 - x0, 2 * r, r); g.fill(); } });
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16; t.minFilter = THREE.LinearMipmapLinearFilter; return t;
})();
// is pattern position xp (µm along the track) inside a pit of track j?
function inPit(j, xp) { xp = ((xp % LEN) + LEN) % LEN; const c = xp / T; for (const [a, b] of PITS[j]) { if (c < a) return false; if (c < b) return true; } return false; }

// ═════════ panels: a glass slab + a live canvas screen + a soft rim glow (cookies pattern) ═════════
const rimTex = (() => { const [c, g] = cnv(256, 256); g.strokeStyle = 'rgba(89,199,255,1)'; g.lineWidth = 6; g.shadowColor = '#59C7FF'; g.shadowBlur = 24; rr(g, 30, 30, 196, 196, 26); g.stroke(); return tex(c); })();
const slabM = () => new THREE.MeshPhysicalMaterial({ color: 0x0a1220, metalness: .4, roughness: .28, clearcoat: 1, clearcoatRoughness: .2, transparent: true });
const PANELS = [];
function panel(cw, ch, ww) {
  const wh = ww * ch / cw, grp = new THREE.Group(), [c, g] = cnv(cw, ch), t = tex(c);
  const slab = new THREE.Mesh(new RoundedBoxGeometry(ww + .05, wh + .05, .05, 4, .05), slabM()); slab.position.z = -.03; grp.add(slab);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), new THREE.MeshBasicMaterial({ map: t, toneMapped: false, transparent: true })); scr.position.z = .002; scr.renderOrder = 2; grp.add(scr);
  const rim = new THREE.Mesh(new THREE.PlaneGeometry(ww * 1.16, wh + ww * .16), new THREE.MeshBasicMaterial({ map: rimTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0 }));
  rim.position.z = -.06; grp.add(rim);
  grp.visible = false; scene.add(grp);
  const P = { g: grp, c, x: g, t, ww, wh, key: null, scr, slab, rim };
  P.paint = (key, fn) => { if (P.key === key) return; P.key = key; g.clearRect(0, 0, cw, ch); fn(g, cw, ch); t.needsUpdate = true; };
  P.at = (pos, rx = 0, ry = 0, rz = 0, s = 1, a = 1, rimA = .35) => {
    grp.visible = a > .002; grp.position.copy(pos); grp.rotation.set(rx, ry, rz); grp.scale.setScalar(s);
    scr.material.opacity = a; slab.material.opacity = a; rim.material.opacity = rimA * a; grp.updateMatrixWorld(true);
  };
  P.pt = (px, py, z = .01) => grp.localToWorld(V((px / cw - .5) * ww, (.5 - py / ch) * wh, z));
  PANELS.push(P);
  return P;
}
const SCOPE = panel(1000, 560, 3.4);       // the reflection signal → bits
const CARD_G = panel(600, 760, 1.25), CARD_A = panel(600, 760, 1.25), CARD_C = panel(600, 760, 1.25);
const SCREEN = panel(960, 600, 3.2);       // the TV with the game
const MAIN = panel(900, 1500, 1.8);        // comments (CTA)

// ── scope: square wave of the reflection under the laser (newest sample on the right), transitions = 1 ──
// s = {xp: pattern position under the laser, wave: 0..1 reveal, bits: 0..1 reveal, hot: transition flash}
function paintScope(s) {
  const key = `${s.xp.toFixed(2)}|${s.wave.toFixed(2)}|${s.bits.toFixed(2)}`;
  SCOPE.paint(key, (g, w, h) => {
    g.fillStyle = CSS.card; rr(g, 0, 0, w, h, 34); g.fill(); g.lineWidth = 3; g.strokeStyle = 'rgba(22,139,255,.55)'; g.stroke();
    AR(g, 40); g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillStyle = CSS.ink; g.fillText('الضوء المنعكس', w - 46, 58);
    LA(g, 28); g.textAlign = 'left'; g.fillStyle = CSS.gray; g.fillText('SIGNAL', 46, 60);
    const x0 = 50, x1 = w - 50, yH = 150, yL = 290, N = 26;      // N channel bits across the window
    const cw = (x1 - x0) / N, c1 = Math.floor(s.xp / T), fr = s.xp / T - c1;
    g.strokeStyle = '#1C2738'; g.lineWidth = 2; for (let i = 0; i <= N; i++) { const x = x1 - (i + fr) * cw; if (x > x0) { g.beginPath(); g.moveTo(x, 110); g.lineTo(x, 330); g.stroke(); } }
    AR(g, 26, 500); g.fillStyle = CSS.gray; g.textAlign = 'right'; g.fillText('مسطّح', w - 46, yH - 28); g.fillText('حفرة', w - 46, yL + 30);
    const nShow = Math.floor(N * clamp(s.wave)) + (s.wave > 0 ? 1 : 0);
    g.save(); g.beginPath(); g.rect(x0, 90, x1 - x0, 280); g.clip();
    g.strokeStyle = CSS.cyan; g.lineWidth = 7; g.lineJoin = 'round'; g.shadowColor = CSS.cyan; g.shadowBlur = 16; g.beginPath();
    for (let i = 0; i <= nShow; i++) {
      const c = c1 - i, xa = x1 - (i + fr) * cw, xb = xa + cw, y = inPit(31, (c + .5) * T) ? yL : yH;
      const xr = i === 0 ? x1 : xb;
      if (i === 0) g.moveTo(xr, y); else { g.lineTo(xr, y); }
      g.lineTo(Math.max(x0, xa), y);
      const yp = inPit(31, (c - .5) * T) ? yL : yH; if (yp !== y) g.lineTo(Math.max(x0, xa), yp);
    }
    g.stroke(); g.restore();
    // bits row: one per channel-bit cell; a pit↔land transition at the cell start = 1, otherwise 0
    if (s.bits > 0) {
      const nb = Math.floor(N * clamp(s.bits));
      for (let i = 1; i <= nb; i++) {
        const c = c1 - i, x = x1 - (i + fr) * cw + cw / 2; if (x < x0 + 10) continue;
        const one = inPit(31, (c + .5) * T) !== inPit(31, (c - .5) * T);
        LA(g, one ? 46 : 38, 700); g.textAlign = 'center'; g.fillStyle = one ? CSS.cyan : 'rgba(244,247,251,.6)';
        if (one) { g.shadowColor = CSS.cyan; g.shadowBlur = 14; }
        g.fillText(one ? '1' : '0', x, 430); g.shadowBlur = 0;
      }
      g.fillStyle = 'rgba(167,177,194,.6)'; AR(g, 26, 500); g.textAlign = 'center'; g.fillText('كل تغيّر = 1   ·   بدون تغيّر = 0', w / 2, 510);
    }
  });
}
// ── the three parts of the game ──
function paintCards(k) {
  const head = (g, w, ar, la, col) => {
    g.fillStyle = CSS.card; rr(g, 0, 0, w, 760, 40); g.fill(); g.lineWidth = 4; g.strokeStyle = col; g.stroke();
    AR(g, 52); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = CSS.ink; g.fillText(ar, w / 2, 610);
    LA(g, 30); g.fillStyle = CSS.gray; g.fillText(la, w / 2, 680);
  };
  CARD_G.paint('g', (g, w) => {
    head(g, w, 'الرسومات', 'GRAPHICS', 'rgba(89,199,255,.8)');
    // wireframe low-poly head + a texture swatch
    g.strokeStyle = CSS.cyan; g.lineWidth = 3; g.shadowColor = CSS.cyan; g.shadowBlur = 10;
    const P = []; for (let r = 0; r < 6; r++) for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + r * .2, y = -1 + r / 2.5, rad = Math.sqrt(Math.max(0, 1 - y * y)); P.push([300 + 170 * rad * Math.cos(a), 290 + 170 * y * .95 + 30 * rad * Math.sin(a)]); }
    g.beginPath(); for (let r = 0; r < 6; r++) for (let i = 0; i < 8; i++) { const p = P[r * 8 + i], q = P[r * 8 + (i + 1) % 8]; g.moveTo(...p); g.lineTo(...q); if (r < 5) { const d = P[(r + 1) * 8 + i]; g.moveTo(...p); g.lineTo(...d); } }
    g.stroke(); g.shadowBlur = 0;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#168BFF' : '#0d3a74'; g.fillRect(420 + i * 30, 70 + j * 30, 30, 30); }
  });
  CARD_A.paint('a', (g, w) => {
    head(g, w, 'الأصوات', 'AUDIO', 'rgba(89,199,255,.8)');
    g.fillStyle = CSS.cyan; g.shadowColor = CSS.cyan; g.shadowBlur = 10;
    for (let i = 0; i < 22; i++) { const hh = 30 + 150 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * .45)); rr(g, 70 + i * 21, 300 - hh / 2, 12, hh, 6); g.fill(); }
    g.shadowBlur = 0; g.fillStyle = CSS.ink; g.beginPath(); g.moveTo(260, 100); g.lineTo(300, 100); g.lineTo(350, 60); g.lineTo(350, 180); g.lineTo(300, 140); g.lineTo(260, 140); g.closePath(); g.fill();
    g.strokeStyle = CSS.ink; g.lineWidth = 6; for (const r of [30, 55]) { g.beginPath(); g.arc(355, 120, r, -.7, .7); g.stroke(); }
  });
  CARD_C.paint('c', (g, w) => {
    head(g, w, 'تعليمات التشغيل', 'CODE', 'rgba(89,199,255,.8)');
    const L = [['if', ' (press(X))', 0], ['  jump', '();', 1], ['score', ' += 10;', 0], ['  move', '(left);', 1], ['draw', '(world);', 0], ['  play', '(sound);', 1]];
    LA(g, 36, 500); g.textAlign = 'left'; g.textBaseline = 'middle';
    L.forEach(([a, b], i) => { g.fillStyle = i % 2 ? CSS.blue : CSS.cyan; g.fillText(a, 60, 110 + i * 68); const wa = g.measureText(a).width; g.fillStyle = CSS.ink; g.fillText(b, 60 + wa, 110 + i * 68); });
  });
}
// ── a live game frame (side-scroller in brand colours). a = assembly 0..1 (sky → world → hero → HUD), t = time ──
function drawGame(g, w, h, t, a = 1) {
  const u = w / 960; g.save(); rr(g, 0, 0, w, h, 26 * u); g.clip();
  g.fillStyle = '#04070d'; g.fillRect(0, 0, w, h);
  const k1 = clamp(a * 4), k2 = clamp(a * 4 - 1), k3 = clamp(a * 4 - 2), k4 = clamp(a * 4 - 3);
  g.globalAlpha = k1; const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#0a1f3f'); sky.addColorStop(1, '#0d3a74'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(244,247,251,.7)'; for (let i = 0; i < 30; i++) g.fillRect((i * 173 % 960) * u, (i * 97 % 260) * u, 3 * u, 3 * u);
  const sc = t * 90;
  g.fillStyle = '#123a6e'; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= 960; x += 40) g.lineTo(x * u, (360 - 90 * Math.abs(Math.sin((x + sc * .3) * .008))) * u); g.lineTo(w, h); g.fill();
  g.globalAlpha = k2; g.fillStyle = '#168BFF';
  const plat = [[0, 470, 2000]], floats = [[220, 330, 160], [520, 250, 140], [800, 360, 180], [1100, 290, 150]];
  for (const [x, y, len] of plat) { g.fillRect(x * u, y * u, len * u, h - y * u); }
  g.fillStyle = '#0f5fc0'; for (let x = -((sc) % 80); x < 960; x += 80) g.fillRect(x * u, 470 * u, 40 * u, 14 * u);
  for (const [x0, y, len] of floats) { const x = ((x0 - sc) % 1200 + 1200) % 1200 - 120; g.fillStyle = '#168BFF'; rr(g, x * u, y * u, len * u, 26 * u, 10 * u); g.fill(); }
  for (let i = 0; i < 6; i++) { const x = ((i * 190 + 100 - sc) % 1140 + 1140) % 1140 - 90, y = 200 + (i % 3) * 60, sx = Math.abs(Math.cos(t * 4 + i)); g.fillStyle = CSS.cyan; g.shadowColor = CSS.cyan; g.shadowBlur = 12 * u; g.beginPath(); g.ellipse(x * u, y * u, 16 * sx * u + 2, 16 * u, 0, 0, 7); g.fill(); g.shadowBlur = 0; }
  g.globalAlpha = k3;
  const jy = Math.max(0, Math.sin(t * 3.1)) * 120, hx = 300 * u, hy = (470 - 70 - jy) * u;
  g.fillStyle = CSS.ink; rr(g, hx - 28 * u, hy, 56 * u, 70 * u, 16 * u); g.fill();
  g.fillStyle = CSS.cyan; g.shadowColor = CSS.cyan; g.shadowBlur = 14 * u; rr(g, hx - 4 * u, hy + 14 * u, 30 * u, 16 * u, 8 * u); g.fill(); g.shadowBlur = 0;
  g.globalAlpha = k4; LA(g, 34 * u, 700); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = CSS.ink; g.fillText('SCORE ' + String(1200 + Math.floor(t * 37) * 10).padStart(6, '0'), 34 * u, 44 * u);
  g.fillStyle = CSS.cyan; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc((w - 60 * u) - i * 46 * u, 44 * u, 14 * u, 0, 7); g.fill(); }
  g.restore(); g.globalAlpha = 1;
}
function paintScreen(t, a) {
  SCREEN.paint(`${t.toFixed(3)}|${a.toFixed(2)}`, (g, w, h) => { drawGame(g, w, h, t, a); g.lineWidth = 6; g.strokeStyle = 'rgba(89,199,255,.6)'; rr(g, 3, 3, w - 6, h - 6, 26); g.stroke(); });
}
// ── comments (CTA), from the cookies reel ──
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
    const iy = h - 200 * u; g.fillStyle = '#0A101B'; g.fillRect(0, iy - 40 * u, w, 240 * u);
    rr(g, 180 * u, iy, w - 240 * u, 110 * u, 55 * u); g.fillStyle = '#141D2C'; g.fill(); g.lineWidth = 3 * u; g.strokeStyle = s.focus ? 'rgba(89,199,255,.8)' : 'rgba(167,177,194,.3)'; g.stroke();
    const word = 'تقنية', n = Math.round(word.length * clamp(s.type ?? 0)), typed = (s.post ?? 0) > 0 ? '' : word.slice(0, n);
    AR(g, 48 * u, typed ? 700 : 400); g.textAlign = 'right'; g.fillStyle = typed ? CSS.ink : 'rgba(167,177,194,.6)'; g.fillText(typed || 'أضف تعليقًا…', w - 110 * u, iy + 56 * u);
    g.save(); g.translate(100 * u, iy + 55 * u); const k = 1 - .1 * Math.sin(Math.PI * clamp(s.send ?? 0)); g.scale(k, k);
    g.fillStyle = typed ? CSS.blue : '#2A3446'; g.beginPath(); g.arc(0, 0, 52 * u, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-20 * u, -22 * u); g.lineTo(26 * u, 0); g.lineTo(-20 * u, 22 * u); g.lineTo(-10 * u, 0); g.closePath(); g.fill(); g.restore();
  });
}

// ═════════ the console: generic slim box (white shells, black core, blue light strips, slot loader). No brand marks. ═════════
const con = new THREE.Group(); scene.add(con);
const CON = {};
{
  const white = new THREE.MeshPhysicalMaterial({ color: 0xc4ccd8, roughness: .34, clearcoat: 1, clearcoatRoughness: .12 });
  const core = new THREE.MeshPhysicalMaterial({ color: 0x0b1019, metalness: .55, roughness: .32, clearcoat: .8, clearcoatRoughness: .2 });
  const strip = new THREE.MeshBasicMaterial({ color: 0x168bff, toneMapped: false });
  con.add(new THREE.Mesh(new RoundedBoxGeometry(4.2, .62, 3.0, 4, .08), core));
  for (const y of [.39, -.39]) { const m = new THREE.Mesh(new RoundedBoxGeometry(4.5, .16, 3.2, 5, .075), white); m.position.y = y; con.add(m); }
  // top vents (fine grooves) on the upper shell
  const vent = new THREE.MeshPhysicalMaterial({ color: 0xc8d0dc, roughness: .5 });
  for (let i = 0; i < 9; i++) { const v = new THREE.Mesh(new THREE.BoxGeometry(2.6, .01, .035), vent); v.position.set(0, .472, -1.2 + i * .08); con.add(v); }
  for (const y of [.29, -.29]) { const s = new THREE.Mesh(new THREE.BoxGeometry(3.9, .03, .02), strip); s.position.set(0, y, 1.505); con.add(s); }
  const slot = new THREE.Mesh(new THREE.BoxGeometry(2.25, .055, .03), new THREE.MeshBasicMaterial({ color: 0x010204 })); slot.position.set(0, .05, 1.5); con.add(slot);
  const slotGlow = new THREE.Mesh(new THREE.BoxGeometry(2.25, .012, .032), new THREE.MeshBasicMaterial({ color: 0x59c7ff, toneMapped: false, transparent: true, opacity: 0 })); slotGlow.position.set(0, .015, 1.5); con.add(slotGlow);
  const btnM = new THREE.MeshPhysicalMaterial({ color: 0x1a2333, metalness: .6, roughness: .3 });
  for (const x of [1.55, 1.75]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .02, 20), btnM); b.rotation.x = Math.PI / 2; b.position.set(x, -.12, 1.51); con.add(b); }
  const led = new THREE.Mesh(new THREE.CircleGeometry(.02, 16), new THREE.MeshBasicMaterial({ color: 0x59c7ff, toneMapped: false })); led.position.set(-1.75, -.12, 1.512); con.add(led);
  const cl = new THREE.PointLight(0x168bff, 0, 5, 2); cl.position.set(0, 0, 2.2); con.add(cl);
  Object.assign(CON, { strip, slotGlow, cl, white, core });
  con.visible = false;
}

// ═════════ the disc: data side up (silver, spiral track, diffraction sheen), label side down ═════════
const disc = new THREE.Group(); scene.add(disc);
const DISC = {
  u: { rain: { value: 0 }, trk: { value: 0 }, trkA: { value: 0 }, L: { value: V(.3, 1, .4) }, a: { value: 1 }, sheen: { value: 1 }, ph: { value: 0 } },
};
{
  const geo = new THREE.RingGeometry(.125, 1, 160, 6); geo.rotateX(-Math.PI / 2);
  const m = new THREE.ShaderMaterial({
    uniforms: DISC.u, transparent: true, side: THREE.FrontSide,
    vertexShader: `varying vec2 vL; varying vec3 vW, vN, vT;
      void main(){ vL = position.xz; vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz;
        vN = normalize(mat3(modelMatrix)*vec3(0.,1.,0.)); float a = atan(position.z, position.x);
        vT = normalize(mat3(modelMatrix)*vec3(-sin(a), 0., cos(a))); gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `varying vec2 vL; varying vec3 vW, vN, vT; uniform float rain, trk, trkA, a, sheen, ph; uniform vec3 L;
      vec3 hue(float h){ return clamp(abs(fract(h + vec3(0., .667, .333))*6. - 3.) - 1., 0., 1.); }
      void main(){
        float r = length(vL), ang = atan(vL.y, vL.x); if (ang < 0.) ang += 6.28318;
        vec3 Vd = normalize(cameraPosition - vW), N = normalize(vN), Tg = normalize(vT), Ld = normalize(L);
        vec3 R = reflect(-Vd, N);
        float env = .25 + .75*smoothstep(-.3, 1., dot(R, normalize(vec3(.2, 1., .3))));
        float spec = pow(max(dot(R, Ld), 0.), 24.);
        float band = smoothstep(.37, .40, r)*smoothstep(.99, .975, r);
        vec3 silver = vec3(.27, .31, .39)*env + vec3(.8, .88, 1.)*spec*.55;
        // diffraction sheen: the track tangent decides which colour reaches the eye (grating along the spiral)
        float g = dot(Tg, Ld) + dot(Tg, Vd);
        float I = band*(.35 + .65*pow(1. - abs(dot(N, Vd)), .8));
        vec3 brand = mix(vec3(.09, .55, 1.), vec3(.35, .78, 1.), .5 + .5*sin(g*5. + r*9. + ph));
        vec3 rb = hue(fract(g*.85 + r*.35 + ph*.1))*(.6 + .4*sin(g*3. + r*14.));
        vec3 col = silver*(1. - .35*band*(1. + rain)) + I*mix(brand*.5*sheen, rb*.95, rain);
        // fine grooves (concentric hint) + clamp area (clear plastic) + stacking ring
        col *= .93 + .07*sin(r*260.);
        if (r < .37) col = vec3(.05, .08, .14)*env + vec3(.8, .9, 1.)*spec*.6 + vec3(.1, .2, .35)*smoothstep(.3, .29, abs(r - .3)*30.);
        if (r > .985) col *= .5;
        // the spiral track drawn from the inside out (18 visible turns)
        float r0 = .40, r1 = .975, Nt = 18., p = (r1 - r0)/Nt;
        float u = (r - r0)/p - ang/6.28318, k = floor(u + .5), d = abs(u - k)*p;
        float s = (k + ang/6.28318)/Nt;
        float on = step(0., s)*step(s, trk)*step(r0, r)*step(r, r1);
        float line = smoothstep(.0045, .0, d)*on, halo = smoothstep(.02, .0, d)*on*.35;
        float head = exp(-pow((s - trk)*Nt*6., 2.))*smoothstep(.03, .0, d)*step(s, trk + .02);
        col += vec3(.35, .78, 1.)*(line + halo + head*2.)*trkA;
        gl_FragColor = vec4(col, a);
      }`,
  });
  const top = new THREE.Mesh(geo, m); top.position.y = .011; disc.add(top);
  const [c, g] = cnv(1024, 1024);
  g.fillStyle = '#0c1424'; g.beginPath(); g.arc(512, 512, 512, 0, 7); g.fill();
  const gr = g.createLinearGradient(0, 0, 1024, 1024); gr.addColorStop(0, '#0d3a74'); gr.addColorStop(1, '#0a1f3f'); g.fillStyle = gr; g.beginPath(); g.arc(512, 512, 500, 0, 7); g.fill();
  g.strokeStyle = 'rgba(89,199,255,.5)'; g.lineWidth = 4; for (const r of [200, 360, 470]) { g.beginPath(); g.arc(512, 512, r, 0, 7); g.stroke(); }
  LA(g, 92, 700); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#F4F7FB'; g.fillText('GAME DISC', 512, 290);
  LA(g, 40, 500); g.fillStyle = '#59C7FF'; g.fillText('KROZO • BEYOND TECH', 512, 760);
  g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(512, 512, 64, 0, 7); g.fill();
  const lab = new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.MeshStandardMaterial({ map: tex(c), transparent: true, roughness: .55, metalness: .1 }));
  lab.rotation.x = Math.PI / 2; lab.position.y = -.011; disc.add(lab);
  const edge = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, .022, 128, 1, true), new THREE.MeshPhysicalMaterial({ color: 0x8794a8, metalness: .9, roughness: .25 })); disc.add(edge);
  DISC.top = top; DISC.lab = lab; DISC.edge = edge;
  disc.visible = false;
}
function discAt(pos, rx, ry, rz, s = 1, spin = 0) { disc.visible = true; disc.position.copy(pos); disc.rotation.set(rx, ry, rz); disc.rotateY(spin); disc.scale.setScalar(s); disc.updateMatrixWorld(true); }

// ═════════ the microscope surface (1 unit = 1 µm): lands silver-blue, pits dark with lit rims ═════════
const MAC = { u: { mask: { value: MASK }, off: { value: 0 }, hlP: { value: 0 }, hlL: { value: 0 }, a: { value: 1 }, focus: { value: new THREE.Vector2() }, fr: { value: 60 } } };
const macro = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
  uniforms: MAC.u, transparent: true, depthWrite: true,
  vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
  fragmentShader: `varying vec3 vW; uniform sampler2D mask; uniform float off, hlP, hlL, a, fr; uniform vec2 focus;
    float M(vec2 p){ return texture2D(mask, vec2((p.x + off)/${LEN.toFixed(1)}, (p.y + 52.)/102.4)).r; }
    void main(){
      vec2 p = vW.xz; float m = M(p), e = .07;
      float gx = M(p + vec2(e, 0.)) - M(p - vec2(e, 0.)), gz = M(p + vec2(0., e)) - M(p - vec2(0., e));
      float edge = clamp(length(vec2(gx, gz))*1.6, 0., 1.);
      vec3 Vd = normalize(cameraPosition - vW);
      float sh = pow(1. - abs(Vd.y), 1.5);
      vec3 land = vec3(.25, .30, .40)*(.8 + .2*sin(p.x*.031 + p.y*.017)) + vec3(.12, .35, .75)*sh*.3;
      vec3 pit = vec3(.03, .06, .13);
      vec3 col = mix(land, pit, m*.92);
      col += vec3(.55, .78, 1.)*clamp(-gx - gz, 0., 1.)*.45 - vec3(.25)*clamp(gx + gz, 0., 1.);
      col += vec3(.35, .78, 1.)*(edge*1.3 + m*.3)*hlP + vec3(.2, .5, 1.)*(1. - m)*hlL*.45;
      float d = length(p - focus)/fr; col *= exp(-d*d*1.2);
      gl_FragColor = vec4(col*a, a);
    }`,
}));
scene.add(macro); macro.visible = false;
// hair for scale: ≈70 µm thick, scaly fresnel cylinder
const hair = new THREE.Mesh(new THREE.CylinderGeometry(35, 35, 900, 64, 1), new THREE.ShaderMaterial({
  transparent: true, uniforms: { a: { value: 1 } },
  vertexShader: 'varying vec3 vN, vV; varying float vY; void main(){ vY = position.y; vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
  fragmentShader: `varying vec3 vN, vV; varying float vY; uniform float a;
    void main(){ float f = pow(1. - abs(dot(normalize(vN), normalize(vV))), 2.); float sc = .85 + .15*smoothstep(.0, .2, fract(vY/9.));
      vec3 c = vec3(.07, .075, .09)*sc + vec3(.35, .78, 1.)*f*.7 + vec3(.6)*pow(max(dot(normalize(vN), normalize(vec3(.3,.8,.5))), 0.), 12.)*.4; gl_FragColor = vec4(c, a); }`,
}));
hair.rotation.z = Math.PI / 2; hair.visible = false; scene.add(hair);

// ═════════ laser cross-section of track 31 (pits as bumps toward the laser — that is how the laser sees them) ═════════
const xs = new THREE.Group(); scene.add(xs);
const XS = {};
{
  const metal = new THREE.MeshPhysicalMaterial({ color: 0xc9d4e4, metalness: .85, roughness: .25, emissive: 0x3a4a62, emissiveIntensity: .5 });
  const layer = new THREE.Mesh(new THREE.BoxGeometry(30, .08, 1.6), metal); xs.add(layer);
  const lacq = new THREE.Mesh(new THREE.BoxGeometry(30, .14, 1.6), new THREE.MeshPhysicalMaterial({ color: 0x0a1f3f, roughness: .5 })); lacq.position.y = .11; xs.add(lacq);
  const plastic = new THREE.Mesh(new THREE.BoxGeometry(30, 1.0, 1.6), new THREE.MeshBasicMaterial({ color: 0x168bff, transparent: true, opacity: .035, depthWrite: false })); plastic.position.y = -.54; xs.add(plastic);
  const pe = new THREE.LineSegments(new THREE.EdgesGeometry(plastic.geometry), new THREE.LineBasicMaterial({ color: 0x59c7ff, transparent: true, opacity: .14 })); pe.position.copy(plastic.position); xs.add(pe);
  const bumpG = new RoundedBoxGeometry(1, .22, .5, 2, .08); // pit depth exaggerated ×2 for legibility
  const bumps = new THREE.InstancedMesh(bumpG, new THREE.MeshPhysicalMaterial({ color: 0x59c7ff, metalness: .6, roughness: .25, emissive: 0x168bff, emissiveIntensity: .55 }), 80); bumps.count = 0; bumps.frustumCulled = false; xs.add(bumps);
  // laser head: housing + objective lens
  const head = new THREE.Group(); head.position.y = -1.7; head.scale.setScalar(.6); xs.add(head);
  const hm = new THREE.MeshPhysicalMaterial({ color: 0x141c2b, metalness: .8, roughness: .3, clearcoat: .6 });
  const housing = new THREE.Mesh(new RoundedBoxGeometry(2.2, .9, 1.6, 4, .1), hm); housing.position.y = -.45; head.add(housing);
  const lens = new THREE.Mesh(new THREE.SphereGeometry(.42, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x59c7ff, metalness: .2, roughness: .05, clearcoat: 1, emissive: 0x168bff, emissiveIntensity: .4 }));
  head.add(lens);
  const sensor = new THREE.Mesh(new THREE.BoxGeometry(.5, .3, .5), new THREE.MeshBasicMaterial({ color: 0x59c7ff, toneMapped: false })); sensor.position.set(1.3, -.45, 0); head.add(sensor);
  const sbase = new THREE.Mesh(new RoundedBoxGeometry(.75, .5, .75, 3, .06), hm); sbase.position.set(1.3, -.6, 0); head.add(sbase);
  Object.assign(XS, { bumps, head, lens, sensor, layer });
  xs.visible = false;
}
const _m4 = new THREE.Matrix4();
// off = pattern position under the laser (x = 0)
function xsAt(off) {
  xs.visible = true; let n = 0;
  for (const [a, b] of PITS[31]) for (const k of [-1, 0, 1]) {
    const x0 = a * T + k * LEN - off, x1 = b * T + k * LEN - off;
    if (x1 < -16 || x0 > 16 || n >= 80) continue;
    _m4.makeScale(x1 - x0, 1, 1).setPosition((x0 + x1) / 2, -.13, 0); XS.bumps.setMatrixAt(n++, _m4);
  }
  XS.bumps.count = n; XS.bumps.instanceMatrix.needsUpdate = true;
  return inPit(31, off) ? .28 : 1;
}

// ═════════ cones (laser beams) ═════════
const conePool = [];
for (let i = 0; i < 6; i++) {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    uniforms: { col: { value: new THREE.Color() }, a: { value: 1 }, rA: { value: .02 }, rB: { value: .5 }, t: { value: 0 } },
    vertexShader: 'uniform float rA, rB; varying vec2 vUv; void main(){ vUv = uv; vec3 p = position; p.xz *= mix(rB, rA, p.y + .5); gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.); }',
    fragmentShader: `varying vec2 vUv; uniform vec3 col; uniform float a, t;
      void main(){ float e = pow(sin(3.14159*vUv.x*2.)*.5 + .5, .5); float f = .6 + .4*smoothstep(0., 1., vUv.y); float s = .85 + .15*sin(vUv.y*40. - t*12.);
        gl_FragColor = vec4(col*a*(.25 + .75*(1. - e*.0))*f*s*.9, 1.); }`,
  });
  const c = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 32, 1, true), m); c.visible = false; c.frustumCulled = false; c.renderOrder = 5; scene.add(c); conePool.push(c);
}
let coneN = 0;
function cone(a, b, rA, rB, col, al, t = 0) {   // rA at b (tip), rB at a (base)
  if (coneN >= conePool.length || al <= .002) return;
  const m = conePool[coneN++]; m.visible = true; const d = b.clone().sub(a), len = d.length();
  m.position.copy(a).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); m.scale.set(1, len, 1);
  const u = m.material.uniforms; u.col.value.set(col); u.a.value = al; u.rA.value = rA; u.rB.value = rB; u.t.value = t;
}

// ═════════ 0/1 digits: one instanced billboard batch ═════════
const DIGN = 900;
const DIG = (() => {
  const [c, g] = cnv(256, 128); LA(g, 104, 700); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 8;
  g.fillText('0', 64, 68); g.fillText('1', 192, 68);
  const geo = new THREE.InstancedBufferGeometry(); const base = new THREE.PlaneGeometry(1, 1);
  geo.index = base.index; geo.setAttribute('position', base.attributes.position); geo.setAttribute('uv', base.attributes.uv);
  const aP = new THREE.InstancedBufferAttribute(new Float32Array(DIGN * 3), 3), aD = new THREE.InstancedBufferAttribute(new Float32Array(DIGN * 3), 3);
  aP.setUsage(THREE.DynamicDrawUsage); aD.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aP', aP); geo.setAttribute('aD', aD); geo.instanceCount = 0;
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, uniforms: { map: { value: new THREE.CanvasTexture(c) } },
    vertexShader: 'attribute vec3 aP, aD; varying vec2 vUv; varying vec2 vD; void main(){ vUv = uv; vD = aD.xy; vec4 mv = modelViewMatrix*vec4(aP, 1.); mv.xy += position.xy*aD.z; gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform sampler2D map; varying vec2 vUv; varying vec2 vD; void main(){ float t = texture2D(map, vec2(vUv.x*.5 + vD.x*.5, vUv.y)).a; vec3 c = mix(vec3(.8,.86,.95), vec3(.35,.78,1.), vD.x); gl_FragColor = vec4(c*t*vD.y*1.4, 1.); }',
  });
  const mesh = new THREE.Mesh(geo, m); mesh.frustumCulled = false; mesh.renderOrder = 8; scene.add(mesh);
  return { geo, aP, aD, mesh, n: 0 };
})();
function digit(p, d, size, a = 1) {
  if (DIG.n >= DIGN || a <= .002) return; const i = DIG.n++;
  DIG.aP.array.set([p.x, p.y, p.z], i * 3); DIG.aD.array.set([d, Math.min(1, a), size], i * 3);
}

// ═════════ data block (three slabs = graphics / audio / code) ═════════
const block = new THREE.Group(); scene.add(block);
const BLK = { parts: [] };
{
  const m = new THREE.MeshPhysicalMaterial({ color: 0x0d3a74, metalness: .3, roughness: .2, clearcoat: 1, emissive: 0x168bff, emissiveIntensity: .35, transparent: true, opacity: .92 });
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group(); const b = new THREE.Mesh(new RoundedBoxGeometry(1.5, .46, 1.5, 3, .05), m); g.add(b);
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.5, .46, 1.5)), new THREE.LineBasicMaterial({ color: 0x59c7ff, transparent: true, opacity: .8 })));
    g.position.y = (i - 1) * .52; block.add(g); BLK.parts.push(g);
  }
  BLK.m = m; const bl = new THREE.PointLight(0x59c7ff, 0, 6, 2); block.add(bl); BLK.l = bl;
  block.visible = false;
}

// ═════════ holo board: RAM, CPU, GPU on a circuit plate ═════════
const board = new THREE.Group(); scene.add(board);
const BRD = { chips: {} };
{
  const [c, g] = cnv(1536, 1024); g.fillStyle = '#060b14'; g.fillRect(0, 0, 1536, 1024);
  g.strokeStyle = 'rgba(22,139,255,.55)'; g.lineWidth = 5;
  for (let i = 0; i < 46; i++) { let x = rnd() * 1536, y = rnd() * 1024; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { if (k % 2) y += (rnd() - .5) * 400; else x += (rnd() - .5) * 500; g.lineTo(x, y); } g.stroke(); g.fillStyle = '#59C7FF'; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(89,199,255,.35)'; g.lineWidth = 3; rr(g, 20, 20, 1496, 984, 40); g.stroke();
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 4.4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, toneMapped: false }));
  board.add(plate); BRD.plate = plate;
  const chipM = new THREE.MeshPhysicalMaterial({ color: 0x0b1019, metalness: .6, roughness: .3, clearcoat: .8 });
  const mk = (name, sub, x, z, w, d) => {
    const g2 = new THREE.Group(); g2.position.set(x, 0, z);
    { const cb = new THREE.Mesh(new RoundedBoxGeometry(w, .22, d, 3, .04), chipM); cb.position.y = .11; g2.add(cb); }
    const [cc, gg] = cnv(512, 512 * d / w); const H2 = 512 * d / w;
    gg.fillStyle = '#0e1522'; rr(gg, 10, 10, 492, H2 - 20, 30); gg.fill(); gg.lineWidth = 6; gg.strokeStyle = '#168BFF'; gg.stroke();
    LA(gg, 120, 700); gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.fillStyle = '#F4F7FB'; gg.fillText(name, 256, H2 / 2 - 30);
    AR(gg, 54, 500); gg.fillStyle = '#59C7FF'; gg.fillText(sub, 256, H2 / 2 + 70);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(w * .94, d * .94).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex(cc), toneMapped: false })); top.position.y = .225; g2.add(top);
    const pin = new THREE.MeshPhysicalMaterial({ color: 0x9fb0c8, metalness: 1, roughness: .3 });
    for (let i = 0; i < 8; i++) for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.05, .04, .14), pin); p.position.set(-w / 2 + .15 + i * (w - .3) / 7, .03, s * (d / 2 + .05)); g2.add(p); }
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.5, d * 1.5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: rimTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0 })); gl.position.y = .01; g2.add(gl);
    board.add(g2); BRD.chips[name] = { g: g2, glow: gl, top: V(x, .3, z) };
  };
  mk('RAM', 'الذاكرة', -2.1, .9, 1.5, 1.0); mk('CPU', 'المعالج', 0, -.6, 1.6, 1.6); mk('GPU', 'الرسومات', 2.1, .9, 1.5, 1.2);
  board.visible = false;
}

// ═════════ low-poly game world (floating island, trees, tower, hero, coins), holo edges ═════════
const gw = new THREE.Group(); scene.add(gw);
const GW = { mats: [], coins: [] };
{
  const M = (o) => { const m = new THREE.MeshStandardMaterial(Object.assign({ flatShading: true, transparent: true, roughness: .6 }, o)); GW.mats.push(m); return m; };
  const edgesM = new THREE.LineBasicMaterial({ color: 0x59c7ff, transparent: true, opacity: .35 }); GW.edgesM = edgesM;
  const add = (mesh, edges = true) => { gw.add(mesh); if (edges) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 20), edgesM); e.position.copy(mesh.position); e.rotation.copy(mesh.rotation); e.scale.copy(mesh.scale); gw.add(e); } return mesh; };
  const topG = new THREE.CylinderGeometry(2.2, 2.0, .4, 9, 1); const pa = topG.attributes.position;
  for (let i = 0; i < pa.count; i++) if (pa.getY(i) > 0) pa.setY(i, pa.getY(i) + .08 * Math.sin(pa.getX(i) * 3.1 + pa.getZ(i) * 2.3));
  topG.computeVertexNormals();
  add(new THREE.Mesh(topG, M({ color: 0x168bff, emissive: 0x0a2a55, emissiveIntensity: .5 })));
  const rock = new THREE.Mesh(new THREE.ConeGeometry(2.0, 2.2, 9, 2), M({ color: 0x0c1a30 })); rock.rotation.x = Math.PI; rock.position.y = -1.3; add(rock);
  for (const [x, z, s] of [[-1.2, -.6, 1], [-.6, -1.3, .8], [1.3, -.9, .9], [-1.5, .6, .7], [.9, 1.2, .65]]) {
    const tr = new THREE.Mesh(new THREE.ConeGeometry(.32 * s, .9 * s, 6), M({ color: 0x59c7ff, emissive: 0x1d6fae, emissiveIntensity: .45 })); tr.position.set(x, .2 + .45 * s + .1, z); add(tr);
    const tk = new THREE.Mesh(new THREE.CylinderGeometry(.06 * s, .07 * s, .2 * s, 5), M({ color: 0x2a3446 })); tk.position.set(x, .3 + .1 * s, z); add(tk, false);
  }
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(.35, .42, 1.3, 8), M({ color: 0xdfe6f0 })); tower.position.set(1.1, .85, -.2); add(tower);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(.5, .6, 8), M({ color: 0x168bff, emissive: 0x0a2a55 })); roof.position.set(1.1, 1.8, -.2); add(roof);
  const hero = new THREE.Group(); gw.add(hero);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.16, .25, 4, 10), M({ color: 0xf4f7fb, flatShading: false })); body.position.y = .28; hero.add(body);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(.2, .08, .06), new THREE.MeshBasicMaterial({ color: 0x59c7ff, toneMapped: false, transparent: true })); visor.position.set(0, .38, .15); hero.add(visor); GW.visor = visor;
  hero.position.set(-.2, .2, .7); GW.hero = hero;
  const coinG = new THREE.TorusGeometry(.13, .045, 8, 20);
  for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(coinG, new THREE.MeshBasicMaterial({ color: 0x59c7ff, toneMapped: false, transparent: true })); gw.add(c); GW.coins.push(c); }
  const gl = new THREE.PointLight(0x59c7ff, 0, 8, 2); gl.position.set(0, 2, 1); gw.add(gl); GW.l = gl;
  gw.visible = false;
}
function gwAt(pos, s, ry, a, t, rx = 0) {
  gw.visible = a > .002; gw.position.copy(pos); gw.scale.setScalar(Math.max(.001, s)); gw.rotation.set(rx, ry, 0);
  for (const m of GW.mats) m.opacity = a; GW.edgesM.opacity = .35 * a; GW.visor.material.opacity = a;
  GW.hero.position.y = .2 + Math.max(0, Math.sin(t * 3.4)) * .45; GW.hero.rotation.y = Math.sin(t * .8) * .6;
  GW.coins.forEach((c, i) => { const an = i / 6 * Math.PI * 2 + t * .4; c.position.set(Math.cos(an) * 1.5, 1.0 + .25 * Math.sin(t * 2 + i), Math.sin(an) * 1.5); c.rotation.y = t * 3 + i; c.material.opacity = a; });
  GW.l.intensity = 3 * a; gw.updateMatrixWorld(true);
}

// cursor arrow (CTA)
const cursor = new THREE.Group(); scene.add(cursor);
{
  const s = new THREE.Shape(); const P = [[0, 0], [0, -1], [.26, -.76], [.46, -1.18], [.62, -1.1], [.42, -.7], [.74, -.7]]; s.moveTo(0, 0); P.slice(1).forEach(p => s.lineTo(p[0], p[1])); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: .08, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 3 });
  cursor.add(new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: 0xf4f7fb, metalness: .1, roughness: .35, clearcoat: 1, emissive: 0x223047, emissiveIntensity: .4 })));
  cursor.scale.setScalar(.16); cursor.visible = false;
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
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), gridM); floor.rotation.x = -Math.PI / 2; floor.position.y = -1.2; world.add(floor);
{
  const pts = []; for (let i = 0; i < 1400; i++) pts.push((rnd() - .5) * 40, (rnd() - .3) * 20, (rnd() - .8) * 40);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  world.add(new THREE.Points(g, new THREE.PointsMaterial({ map: DOT, size: .09, color: 0x6fb8ff, transparent: true, opacity: .55, depthWrite: false, toneMapped: false })));
}
const key = new THREE.DirectionalLight(0xdfeaff, 2.2); key.position.set(3, 5, 6); scene.add(key);
const fill = new THREE.DirectionalLight(0x168bff, 1.6); fill.position.set(-5, 1, 2); scene.add(fill);
const back = new THREE.DirectionalLight(0x59c7ff, 2.4); back.position.set(0, 3, -6); scene.add(back);
scene.add(new THREE.HemisphereLight(0x2b4f8f, 0x05070c, .6));

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
  const r = ringPool[ringN++]; r.visible = true; r.position.copy(pos); r.scale.set(rad * 2, rad * 2, 1); r.userData.flat = o.flat;
  r.material.uniforms.col.value.set(col); r.material.uniforms.a.value = a; r.material.uniforms.w.value = o.w ?? .06;
}
function click(pos, t, at, size = .35) {
  for (const d of [0, .12]) { const k = pg(t, at + d, at + d + .55); if (k > 0 && k < 1) ring(pos, size * (.15 + eo(k)), COL.cyan, (1 - k) * 1.2); }
}
const beamGeo = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true), beamPool = [];
for (let i = 0; i < 30; i++) {
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
  con.visible = disc.visible = macro.visible = hair.visible = xs.visible = block.visible = board.visible = gw.visible = cursor.visible = false;
  for (const r of ringPool) r.visible = false; for (const b of beamPool) b.visible = false; for (const s of sprPool) s.visible = false; for (const c of conePool) c.visible = false;
  ringN = beamN = sprN = coneN = 0; DIG.n = 0;
  scene.background = new THREE.Color(0x04060b); scene.fog = new THREE.FogExp2(0x04060b, .035); scene.environment = ENV; scene.environmentIntensity = .8;
  renderer.toneMappingExposure = 1; bloom.strength = .45; bloom.threshold = .72; bloom.radius = .6;
  gridM.uniforms.t.value = t; gridM.uniforms.a.value = 1; world.visible = true;
  cam.fov = 30; cam.up.set(0, 1, 0);
  grade.uniforms.zb.value = 0; grade.uniforms.flash.value = 0; grade.uniforms.vig.value = .45; grade.uniforms.ca.value = .0015;
  CON.strip.color.setHex(0x168bff); CON.slotGlow.material.opacity = 0; CON.cl.intensity = 0;
  Object.assign(DISC.u, {}); DISC.u.rain.value = 0; DISC.u.trk.value = 0; DISC.u.trkA.value = 0; DISC.u.a.value = 1; DISC.u.sheen.value = 1; DISC.u.ph.value = t * .3; DISC.u.L.value.set(.3, 1, .4);
  MAC.u.hlP.value = 0; MAC.u.hlL.value = 0; MAC.u.a.value = 1; MAC.u.fr.value = 60;
  hair.material.uniforms.a.value = 1; BLK.l.intensity = 0; BLK.m.opacity = .92;
  for (const k in BRD.chips) BRD.chips[k].glow.material.opacity = 0;
  for (const g of BLK.parts) { g.position.x = 0; g.position.z = 0; g.rotation.set(0, 0, 0); g.scale.setScalar(1); }
}
function lookCam(pos, look, fov = 30, roll = 0) {
  cam.position.copy(pos); cam.fov = fov; cam.up.set(Math.sin(roll), Math.cos(roll), 0); cam.lookAt(look);
  const d = pos.distanceTo(look); cam.near = Math.max(.001, d / 300); cam.far = Math.max(60, d * 40);
  cam.updateProjectionMatrix(); cam.updateMatrixWorld();
}
function project(v) { cam.updateMatrixWorld(); const p = v.clone().project(cam); return [(p.x * .5 + .5) * 1080, (-p.y * .5 + .5) * 1920]; }

window.R3 = {
  THREE, V, scene, cam, COL, T, LEN, PITCH, PITS, trackZ, inPit,
  con, CON, disc, DISC, discAt, macro, MAC, hair, xs, XS, xsAt, SCOPE, paintScope, CARD_G, CARD_A, CARD_C, paintCards, SCREEN, paintScreen,
  MAIN, paintComments, cursorAt, block, BLK, board, BRD, gw, GW, gwAt, digit,
  ring, click, beam, cone, glow, bloom, grade: grade.uniforms, gridM, world, floor, reset, lookCam, project, renderer,
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
    for (let i = 0; i < ringN; i++) if (!ringPool[i].userData.flat) ringPool[i].quaternion.copy(cam.quaternion); else ringPool[i].rotation.set(-Math.PI / 2, 0, 0);
    DIG.geo.instanceCount = DIG.n; DIG.aP.needsUpdate = true; DIG.aD.needsUpdate = true;
    window.POST3D?.(sh, lt, t);
    composer.render();
  },
};
window.G3ready = true;
