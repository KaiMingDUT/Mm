// KROZO — "الكيبورد" 3D world.
// One studio stage: a generic phone whose live canvas screen shows a chat + Arabic keyboard, the hidden touch-zone layer
// (a weighted Voronoi map of the keys, drawn on its own plane so it can float above the glass), a holographic thumb,
// touch dots and rings. timeline.js owns the shot list; every frame we reset, the active shot poses the world, then render.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

await Promise.all(['700 60px Plex', '500 40px Plex', '700 40px PlexLatin', '500 30px PlexLatin'].map(f => document.fonts.load(f)));
const RS = +(new URLSearchParams(location.search).get('rs') || 1);
const W = Math.round(1080 * RS), H = Math.round(1920 * RS);
const canvas = document.getElementById('gl');
canvas.style.width = '1080px'; canvas.style.height = '1920px';
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(30, W / H, .001, 100);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const COL = { bg: 0x080B12, blue: 0x168BFF, cyan: 0x59C7FF, ink: 0xF4F7FB, gray: 0xA7B1C2 };
function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const tex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

// ───────── environment: dark room + soft boxes (glossy phone must not blow out) ─────────
const pm = new THREE.PMREMGenerator(renderer);
const ENV = { room: pm.fromScene(new RoomEnvironment(), .04).texture };
{
  const es = new THREE.Scene(); es.background = new THREE.Color(0x020306);
  const box = (w, h, col, k, pos) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide })); m.position.copy(pos); m.lookAt(0, 0, 0); es.add(m); };
  box(4, 1.2, 0xffffff, 2.0, V(0, 4, 1)); box(1, 5, 0x168bff, 2.5, V(-4, 1, -1)); box(1, 5, 0x59c7ff, 1.6, V(4, 1, -1.5)); box(3, .5, 0xffffff, .7, V(0, .6, 4));
  ENV.product = pm.fromScene(es, .02).texture;
}
const DOT = (() => { const [c, x] = cnv(128, 128); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.4, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();

// ═════════ the keyboard (canvas px of the 1180×2556 screen) ═════════
const SW = 1180, SH = 2556;
const KW = 86, KH = 138, GAP = 12, M = 8;
const ROWS = [
  { y: 1560, keys: 'ض ص ث ق ف غ ع ه خ ح ج د', off: 0 },
  { y: 1730, keys: 'ش س ي ب ل ا ت ن م ك ط', off: 49 },
  { y: 1900, keys: 'ذ ء ؤ ر ى ة و ز ظ', off: 30 },
];
const KEYS = [];   // {ch, x, y, w, h} — centre coordinates; first key of a row sits on the right (RTL)
ROWS.forEach((r, ri) => r.keys.split(' ').forEach((ch, i) => KEYS.push({ ch, row: ri, x: SW - M - r.off - KW / 2 - i * (KW + GAP), y: r.y + KH / 2, w: KW, h: KH })));
const SPECIAL = [
  { ch: '⌫', x: M + 150 / 2 + 4, y: 1900 + KH / 2, w: 150, h: KH, fn: 1 },
  { ch: '123', x: SW - M - 75, y: 2070 + KH / 2, w: 150, h: KH, fn: 1 },
  { ch: 'مسافة', x: SW / 2 + 40, y: 2070 + KH / 2, w: 560, h: KH, fn: 1 },
  { ch: 'إرسال', x: M + 110, y: 2070 + KH / 2, w: 220, h: KH, fn: 2 },
];
const KEY = Object.fromEntries(KEYS.map(k => [k.ch, k]));
const KB = { x0: 0, y0: 1420, x1: SW, y1: 2250 };   // keyboard panel incl. the suggestion bar
const ZB = { x0: 0, y0: 1540, x1: SW, y1: 2058 };   // area the touch-zone map covers (the three letter rows)

function drawKey(x, k, st) {
  const pr = st.press === k.ch ? (st.pressK ?? 1) : 0, hi = (st.hi || {})[k.ch] || 0;
  x.fillStyle = k.fn === 2 ? '#168BFF' : k.fn ? '#1B2433' : '#2A3446';
  rrect(x, k.x - k.w / 2, k.y - k.h / 2, k.w, k.h, 16); x.fill();
  x.fillStyle = 'rgba(0,0,0,.35)'; rrect(x, k.x - k.w / 2, k.y + k.h / 2 - 6, k.w, 6, 3); x.fill();
  if (hi) { x.strokeStyle = `rgba(89,199,255,${hi})`; x.lineWidth = 6; rrect(x, k.x - k.w / 2, k.y - k.h / 2, k.w, k.h, 16); x.stroke(); }
  if (pr) { x.fillStyle = `rgba(89,199,255,${.85 * pr})`; rrect(x, k.x - k.w / 2, k.y - k.h / 2, k.w, k.h, 16); x.fill(); }
  x.fillStyle = '#F4F7FB'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = k.fn ? (k.ch === '123' ? '500 40px PlexLatin' : '500 42px Plex') : '500 62px Plex';
  x.fillText(k.ch, k.x, k.y + (k.fn ? 0 : 4));
}
function drawKeyboard(x, st) {
  x.fillStyle = '#0D121C'; x.fillRect(KB.x0, KB.y0, KB.x1 - KB.x0, SH - KB.y0);
  // suggestion bar (QuickType-style): three candidates, separators
  const sg = st.sugg || ['', '', ''];
  x.strokeStyle = 'rgba(167,177,194,.25)'; x.lineWidth = 3;
  for (const sx of [SW / 3, 2 * SW / 3]) { x.beginPath(); x.moveTo(sx, KB.y0 + 34); x.lineTo(sx, KB.y0 + 104); x.stroke(); }
  sg.forEach((s, i) => {
    const cx = SW - SW / 6 - i * SW / 3, on = st.suggHi === i ? (st.suggK ?? 1) : 0;
    if (on) { x.fillStyle = `rgba(22,139,255,${.35 * on})`; rrect(x, cx - 170, KB.y0 + 22, 340, 96, 22); x.fill(); }
    x.fillStyle = on ? '#59C7FF' : '#F4F7FB'; x.font = '500 50px Plex'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = 'rtl'; x.fillText(s, cx, KB.y0 + 70);
  });
  if (st.keys !== false) { for (const k of KEYS) drawKey(x, k, st); for (const k of SPECIAL) drawKey(x, k, st); }
  // pressed-key magnifier bubble
  if (st.press && KEY[st.press] && (st.pressK ?? 1) > .05 && st.keys !== false) {
    const k = KEY[st.press], a = st.pressK ?? 1, bw = 130, bh = 190;
    x.globalAlpha = a; x.fillStyle = '#3A475E'; rrect(x, k.x - bw / 2, k.y - k.h / 2 - bh + 20, bw, bh, 24); x.fill();
    x.fillStyle = '#F4F7FB'; x.font = '700 92px Plex'; x.fillText(k.ch, k.x, k.y - k.h / 2 - bh / 2 + 26); x.globalAlpha = 1;
  }
  x.fillStyle = 'rgba(244,247,251,.8)'; rrect(x, SW / 2 - 140, SH - 40, 280, 12, 6); x.fill();   // home indicator
}
// chat screen: header (friend), bubbles, compose field with the typed text and a caret
function drawChat(x, st) {
  const g = x.createLinearGradient(0, 0, 0, SH); g.addColorStop(0, '#0B1426'); g.addColorStop(1, '#080B12'); x.fillStyle = g; x.fillRect(0, 0, SW, SH);
  x.fillStyle = '#F4F7FB'; x.font = '700 40px PlexLatin'; x.textAlign = 'left'; x.textBaseline = 'middle'; x.direction = 'ltr'; x.fillText('9:41', 90, 92);
  x.fillStyle = '#000'; rrect(x, SW / 2 - 124, 44, 248, 72, 36); x.fill();   // island
  // header
  x.fillStyle = 'rgba(20,28,44,.9)'; x.fillRect(0, 150, SW, 190);
  x.fillStyle = '#168BFF'; x.beginPath(); x.arc(SW / 2, 222, 46, 0, 7); x.fill();
  x.fillStyle = '#F4F7FB'; x.font = '700 46px Plex'; x.textAlign = 'center'; x.direction = 'rtl'; x.fillText('ص', SW / 2, 226);
  x.font = '500 36px Plex'; x.fillText('صاحبك', SW / 2, 304);
  // bubbles (bottom-up above the compose field)
  let by = (st.kb === false ? 1500 : KB.y0 - 170);
  for (const b of [...(st.bubbles || [])].reverse()) {
    const a = b.a ?? 1; if (a <= 0) continue; x.globalAlpha = a;
    if (b.card) {   // shared reel card
      const cw = 560, ch = 420, cx0 = SW - 70 - cw, cy0 = by - ch;
      x.fillStyle = '#168BFF'; rrect(x, cx0, cy0, cw, ch, 40); x.fill();
      x.fillStyle = '#080B12'; rrect(x, cx0 + 16, cy0 + 16, cw - 32, ch - 120, 28); x.fill();
      // mini keyboard thumbnail with a glowing zone
      for (let r = 0; r < 3; r++) for (let i = 0; i < 8; i++) { const kx = cx0 + 60 + i * 56, ky = cy0 + 90 + r * 70; const on = r === 1 && i === 5; x.fillStyle = on ? '#59C7FF' : '#2A3446'; rrect(x, kx, ky, 44, 54, 10); x.fill(); }
      x.fillStyle = '#F4F7FB'; x.font = '700 40px PlexLatin'; x.textAlign = 'center'; x.direction = 'ltr'; x.fillText('KROZO', cx0 + cw / 2, cy0 + ch - 60);
      by = cy0 - 40;
    } else {
      x.font = '500 48px Plex'; const tw = Math.min(760, x.measureText(b.t).width), bw = tw + 90, bh = 112;
      const me = b.me, bx = me ? SW - 70 - bw : 70, byy = by - bh;
      x.fillStyle = me ? '#168BFF' : '#222C3D'; rrect(x, bx, byy, bw, bh, 52); x.fill();
      x.fillStyle = '#F4F7FB'; x.textAlign = 'center'; x.direction = 'rtl'; x.fillText(b.t, bx + bw / 2, byy + bh / 2 + 2);
      by = byy - 34;
    }
    x.globalAlpha = 1;
  }
  // compose field
  if (st.kb !== false) {
    const fy = KB.y0 - 140;
    x.strokeStyle = 'rgba(167,177,194,.45)'; x.lineWidth = 3; rrect(x, 60, fy, SW - 120, 104, 52); x.stroke();
    x.textAlign = 'right'; x.direction = 'rtl'; x.font = '500 54px Plex';
    const txt = st.text || '';
    if (txt) { x.fillStyle = '#F4F7FB'; x.fillText(txt, SW - 110, fy + 54); }
    else { x.fillStyle = 'rgba(167,177,194,.6)'; x.fillText('رسالة', SW - 110, fy + 54); }
    const tw = txt ? x.measureText(txt).width : 0;
    if (st.caret ?? 1) { x.fillStyle = '#59C7FF'; x.fillRect(SW - 116 - tw - 8, fy + 22, 6, 64); }
    if (st.ghost) { x.fillStyle = 'rgba(89,199,255,.45)'; x.font = '500 54px Plex'; x.fillText(st.ghost, SW - 116 - tw - 22, fy + 54); }
    drawKeyboard(x, st);
  }
}

// ───────── touch-zone map: weighted Voronoi of the letter keys (zone = argmin |p − c| − boost) ─────────
const ZS = .5, ZWd = Math.round((ZB.x1 - ZB.x0) * ZS), ZHd = Math.round((ZB.y1 - ZB.y0) * ZS);
const [zc, zx] = cnv(ZWd, ZHd);
const zimg = zx.createImageData(ZWd, ZHd);
const OWN = new Int16Array(ZWd * ZHd);
function zoneMap(boost, o = {}) {
  const N = KEYS.length, kx = KEYS.map(k => (k.x - ZB.x0) * ZS), ky = KEYS.map(k => (k.y - ZB.y0) * ZS), b = KEYS.map(k => (boost[k.ch] || 0) * ZS);
  for (let py = 0; py < ZHd; py++) for (let px = 0; px < ZWd; px++) {
    let best = 1e9, bi = 0;
    for (let i = 0; i < N; i++) { const dx = px - kx[i], dy = (py - ky[i]) * 1.15; if (Math.abs(dy) > 140 || Math.abs(dx) > 160) continue; const d = Math.sqrt(dx * dx + dy * dy) - b[i]; if (d < best) { best = d; bi = i; } }
    OWN[py * ZWd + px] = bi;
  }
  const D = zimg.data, hot = o.hot ? KEYS.findIndex(k => k.ch === o.hot) : -1, sel = o.sel ? KEYS.findIndex(k => k.ch === o.sel) : -1;
  const fill = o.fill ?? .22, line = o.line ?? 1;
  for (let py = 0; py < ZHd; py++) for (let px = 0; px < ZWd; px++) {
    const i = py * ZWd + px, k = OWN[i];
    const edge = (px > 0 && OWN[i - 1] !== k) || (py > 0 && OWN[i - ZWd] !== k) || (px < ZWd - 1 && OWN[i + 1] !== k) || (py < ZHd - 1 && OWN[i + ZWd] !== k);
    const isHot = k === hot || k === sel;
    let r, g, bb, a;
    if (edge) { r = 89; g = 199; bb = 255; a = (isHot ? 1 : .75) * line; }
    else if (isHot) { r = 89; g = 199; bb = 255; a = (k === sel ? .62 : .42) * (o.hotK ?? 1) + fill * (1 - (o.hotK ?? 1)); }
    else { r = 22; g = 139; bb = 255; a = fill * (.75 + .25 * ((k * 7) % 3) / 2); }
    D[i * 4] = r; D[i * 4 + 1] = g; D[i * 4 + 2] = bb; D[i * 4 + 3] = Math.round(a * 255);
  }
  zx.putImageData(zimg, 0, 0);
  if (o.labels) {   // letter inside each zone (centroid would wander; the key centre is clear enough)
    zx.textAlign = 'center'; zx.textBaseline = 'middle'; zx.font = `700 ${Math.round(46 * ZS)}px Plex`;
    KEYS.forEach((k, i) => { zx.fillStyle = (i === hot || i === sel) ? 'rgba(244,247,251,1)' : `rgba(244,247,251,${.7 * o.labels})`; zx.fillText(k.ch, (k.x - ZB.x0) * ZS, (k.y - ZB.y0) * ZS + 2); });
  }
  return zc;
}
const ownerAt = (px, py) => KEYS[OWN[Math.min(ZHd - 1, Math.max(0, Math.round((py - ZB.y0) * ZS))) * ZWd + Math.min(ZWd - 1, Math.max(0, Math.round((px - ZB.x0) * ZS)))]].ch;

// ═════════ phone (generic, no logos) ═════════
const PW = .0716, PH = .1476, PD = .008, SCW = PW - .0042, SCH = PH - .0042;
function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
function uvFromBounds(g) {
  g.computeBoundingBox(); const b = g.boundingBox, P = g.attributes.position, uv = [];
  for (let i = 0; i < P.count; i++) uv.push((P.getX(i) - b.min.x) / (b.max.x - b.min.x), (P.getY(i) - b.min.y) / (b.max.y - b.min.y));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
}
const phone = new THREE.Group(); scene.add(phone);
const frameM = new THREE.MeshPhysicalMaterial({ color: 0x2b2f36, metalness: 1, roughness: .28, clearcoat: .3 });
phone.add(new THREE.Mesh(new RoundedBoxGeometry(PW, PH, PD, 6, .0095), frameM));
{
  const glass = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(PW - .0012, PH - .0012, .0088), 24), new THREE.MeshPhysicalMaterial({ color: 0x020203, roughness: .1, clearcoat: .5, clearcoatRoughness: .05, envMapIntensity: .12 }));
  glass.position.z = PD / 2 + .00005; phone.add(glass);
  for (const [y, l, s] of [[.03, .022, 1], [-.002, .012, -1], [.012, .012, -1]]) { const b = new THREE.Mesh(new RoundedBoxGeometry(.0016, l, .0026, 2, .0007), frameM); b.position.set(s * (PW / 2 + .0004), y, 0); phone.add(b); }
  const bump = new THREE.Mesh(new RoundedBoxGeometry(.036, .037, .0022, 4, .008), new THREE.MeshPhysicalMaterial({ color: 0x30343b, metalness: .2, roughness: .15, clearcoat: 1 }));
  bump.position.set(-PW / 2 + .021, PH / 2 - .021, -PD / 2 - .0008); phone.add(bump);
}
const [scrC, scrX] = cnv(SW, SH); const scrT = tex(scrC);
const sgeo = new THREE.ShapeGeometry(roundedRect(SCW, SCH, .0072), 24); uvFromBounds(sgeo);
const screenM = new THREE.MeshPhysicalMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: scrT, emissiveIntensity: .8, roughness: .4, clearcoat: 0, envMapIntensity: .04, specularIntensity: .1 });
const screen = new THREE.Mesh(sgeo, screenM); screen.position.z = PD / 2 + .0001; phone.add(screen);
// canvas px → phone-local metres (z = height above the glass)
const loc = (px, py, z = 0) => V((px / SW - .5) * SCW, (.5 - py / SH) * SCH, PD / 2 + .0002 + z);
const toW = (px, py, z = 0) => { phone.updateMatrixWorld(true); return loc(px, py, z).applyMatrix4(phone.matrixWorld); };
// floating layers over the keyboard: keycaps (lifted in the exploded view) and the touch-zone map
function layer(x0, y0, x1, y1, c, additive) {
  const t = tex(c); const m = new THREE.Mesh(new THREE.PlaneGeometry((x1 - x0) / SW * SCW, (y1 - y0) / SH * SCH),
    new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
  m.userData = { t, c: loc((x0 + x1) / 2, (y0 + y1) / 2) }; m.renderOrder = 4; phone.add(m); return m;
}
const zonesL = layer(ZB.x0, ZB.y0, ZB.x1, ZB.y1, zc, true);
const [capC, capX] = cnv(SW, KB.y1 - KB.y0 + 300);
const capsL = layer(0, KB.y0, SW, KB.y1 + 300, capC, false);
function drawCaps(st) {   // keycaps only, transparent background (the exploded "what you see" layer)
  capX.clearRect(0, 0, capC.width, capC.height); capX.save(); capX.translate(0, -KB.y0);
  for (const k of KEYS) drawKey(capX, k, st); for (const k of SPECIAL) drawKey(capX, k, st);
  capX.restore(); capsL.userData.t.needsUpdate = true;
}
// holographic thumb (capsule, fresnel rim) + its contact patch
const holoM = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
  uniforms: { t: { value: 0 }, k: { value: 1 }, col: { value: new THREE.Color(COL.blue) }, rim: { value: new THREE.Color(COL.cyan) } },
  vertexShader: 'varying vec3 vN, vV, vW; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); vV = normalize(-mv.xyz); vW = (modelMatrix*vec4(position,1.)).xyz; gl_Position = projectionMatrix*mv; }',
  fragmentShader: `varying vec3 vN, vV, vW; uniform float t, k; uniform vec3 col, rim;
    void main(){ float f = pow(1.-abs(dot(normalize(vN), normalize(vV))), 2.);
      float lines = smoothstep(.85,1.,abs(sin(vW.y*1400.+t*3.)))*.22;
      vec3 c = col*(.08+f*.75+lines) + rim*f*f*.9; gl_FragColor = vec4(c*k, 1.); }`,
});
const thumb = new THREE.Group(); scene.add(thumb);
{
  const tip = new THREE.Mesh(new THREE.CapsuleGeometry(.0085, .05, 12, 32), holoM); tip.position.y = .033; thumb.add(tip);   // ~19 mm wide pad
  const nail = new THREE.Mesh(new THREE.CapsuleGeometry(.0068, .012, 8, 24), holoM); nail.scale.set(1, 1, .35); nail.position.set(0, .03, -.0085); thumb.add(nail);
}
// pools: rings, glows, lines
const ringGeo = new THREE.PlaneGeometry(1, 1), ringPool = [];
for (let i = 0; i < 40; i++) {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    uniforms: { col: { value: new THREE.Color() }, a: { value: 1 }, w: { value: .08 }, fill: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec2 vUv; uniform vec3 col; uniform float a, w, fill;
      void main(){ float r = length(vUv-.5)*2.; float d = abs(r-(1.-w));
        float m = smoothstep(w, 0., d) + exp(-d*18.)*.35 + fill*smoothstep(1.,.0,r)*.5; m *= smoothstep(1.,.97,r); gl_FragColor = vec4(col*m*a, 1.); }`,
  });
  const r = new THREE.Mesh(ringGeo, m); r.visible = false; r.frustumCulled = false; r.renderOrder = 6; phone.add(r); ringPool.push(r);
}
let ringN = 0;
function ring(px, py, rad, col, a, o = {}) {   // on the screen plane (canvas px; rad in px)
  if (ringN >= ringPool.length || a <= .002 || rad <= 0) return;
  const r = ringPool[ringN++]; r.visible = true; r.position.copy(loc(px, py, (o.z ?? 0) + .0003)); const s = rad * 2 / SW * SCW; r.scale.set(s, s, 1);
  const u = r.material.uniforms; u.col.value.set(col); u.a.value = a; u.w.value = o.w ?? .08; u.fill.value = o.fill ?? 0;
}
const sprPool = [];
for (let i = 0; i < 40; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: DOT, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); s.visible = false; s.renderOrder = 7; phone.add(s); sprPool.push(s); }
let sprN = 0;
function glow(px, py, size, col, a = 1, z = 0) { if (sprN >= sprPool.length || a <= .002) return; const s = sprPool[sprN++]; s.visible = true; s.position.copy(loc(px, py, z + .0005)); s.scale.setScalar(size / SW * SCW); s.material.color.set(col); s.material.opacity = a; }

// ═════════ studio stage ═════════
const studio = new THREE.Group(); scene.add(studio);
const studioBg = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, uniforms: { c1: { value: new THREE.Color(0x0e2546) }, c2: { value: new THREE.Color(0x020306) }, spot: { value: new THREE.Vector2(0, .15) } },
  vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: 'varying vec3 vP; uniform vec3 c1, c2; uniform vec2 spot; void main(){ float s = pow(max(0., 1.-length(vP.xy-spot)*1.1), 2.); gl_FragColor = vec4(mix(c2, c1, s*.9), 1.); }',
});
studio.add(new THREE.Mesh(new THREE.SphereGeometry(20, 48, 24), studioBg));
const r1 = new THREE.SpotLight(0x168bff, 30, 8, .5, .6, 2); r1.position.set(-.8, .6, -.6);
const r2 = new THREE.SpotLight(0x59c7ff, 16, 8, .5, .6, 2); r2.position.set(.8, .4, -.5);
const key = new THREE.DirectionalLight(0xffffff, 1.0); key.position.set(.4, .8, 1);
studio.add(r1, r2, key, new THREE.AmbientLight(0x404a60, .4));
// engineering grid floor (dark, fine lines) — the phone often lies on it
const gridM = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, uniforms: { k: { value: 1 } },
  vertexShader: 'varying vec3 vW; void main(){ vW = (modelMatrix*vec4(position,1.)).xyz; gl_Position = projectionMatrix*viewMatrix*vec4(vW,1.); }',
  fragmentShader: `varying vec3 vW; uniform float k;
    float ln(vec2 p, float s, float w){ vec2 g = abs(fract(p/s - .5) - .5)*s; return 1. - smoothstep(0., w, min(g.x, g.y)); }
    void main(){ float a = ln(vW.xz, .02, .0004)*.10 + ln(vW.xz, .1, .0007)*.18; float f = smoothstep(.45, .05, length(vW.xz));
      gl_FragColor = vec4(vec3(.09,.35,.75)*a*f*k + vec3(.012,.018,.03)*f, .85*f); }`,
});
const grid = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), gridM); grid.rotation.x = -Math.PI / 2; grid.position.y = -PD / 2 - .0005; scene.add(grid);

// ═════════ post (bloom + grade: zoom blur, CA, vignette, grain, flash) ═════════
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, cam));
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), .35, .55, .85); composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, t: { value: 0 }, zb: { value: 0 }, ca: { value: .0015 }, vig: { value: .45 }, grain: { value: .04 }, flash: { value: 0 } },
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
let scrKey = '', zoneKey = '', capKey = '';
function setScreen(st) { const k = JSON.stringify(st); if (k === scrKey) return; scrKey = k; drawChat(scrX, st); scrT.needsUpdate = true; }
function setZones(boost, o = {}) { zonesL.visible = (o.a ?? 1) > .002; const k = JSON.stringify([boost, o]); if (k !== zoneKey) { zoneKey = k; zoneMap(boost, o); zonesL.userData.t.needsUpdate = true; } zonesL.position.copy(zonesL.userData.c); zonesL.position.z += o.z ?? 0; zonesL.material.opacity = o.a ?? 1; }
function setCaps(st, z, a = 1) { capsL.visible = a > .002; const k = JSON.stringify(st); if (k !== capKey) { capKey = k; drawCaps(st); } capsL.position.copy(capsL.userData.c); capsL.position.z += z; capsL.material.opacity = a; }
function thumbAt(px, py, h, o = {}) {   // thumb pad over canvas point, h = height above glass (m), tilt toward +y of the phone
  thumb.visible = true; phone.updateMatrixWorld(true);
  thumb.position.copy(toW(px, py, h + .0095)); thumb.quaternion.copy(phone.quaternion);
  thumb.rotateZ(o.roll ?? .5); thumb.rotateX(Math.PI - (o.tilt ?? .5));
  holoM.uniforms.k.value = .55 * (o.k ?? 1);
}
function reset() {
  phone.visible = true; phone.position.set(0, 0, 0); phone.rotation.set(0, 0, 0); phone.scale.setScalar(1);
  zonesL.visible = false; capsL.visible = false; thumb.visible = false; grid.visible = false; gridM.uniforms.k.value = 1;
  for (const r of ringPool) r.visible = false; for (const s of sprPool) s.visible = false; ringN = sprN = 0;
  scene.background = new THREE.Color(0x05070c); scene.environment = ENV.product; scene.environmentIntensity = 1;
  renderer.toneMappingExposure = 1; bloom.strength = .32; bloom.threshold = .82; bloom.radius = .55; screenM.emissiveIntensity = .8;
  studio.visible = true; r1.intensity = 30; r2.intensity = 16;
  cam.up.set(0, 1, 0); cam.fov = 30;
  grade.uniforms.zb.value = 0; grade.uniforms.flash.value = 0; grade.uniforms.vig.value = .45; grade.uniforms.ca.value = .0015;
}
function lookCam(pos, look, fov = 30, roll = 0) { cam.position.copy(pos); cam.fov = fov; cam.up.set(Math.sin(roll), Math.cos(roll), 0); cam.lookAt(look); cam.updateProjectionMatrix(); }
function project(v) { cam.updateMatrixWorld(); const p = v.clone().project(cam); return [(p.x * .5 + .5) * 1080, (-p.y * .5 + .5) * 1920]; }
const projPx = (px, py, z = 0) => project(toW(px, py, z));

window.R3 = {
  THREE, V, scene, cam, COL, phone, setScreen, setZones, setCaps, thumbAt, thumb, ring, glow, grid, gridM, studio, r1, r2, bloom, screenM,
  grade: grade.uniforms, reset, lookCam, project, projPx, toW, loc, KEY, KEYS, ownerAt, SW, SH, KB, ZB, holoM, renderer,
};
window.G3 = {
  render(t) {
    const sh = (window.SHOTS || []).find(s => t >= s.s && t < s.e);
    canvas.style.opacity = sh ? 1 : 0;
    if (!sh) { window.POST3D?.(null); return; }
    reset(); grade.uniforms.t.value = t; holoM.uniforms.t.value = t;
    const lt = t - sh.s;
    sh.update(lt, t, sh);
    if (!sh.noPunch && sh.s > 0) grade.uniforms.zb.value = Math.max(grade.uniforms.zb.value, .9 * Math.max(0, 1 - lt / .16));
    for (let i = 0; i < sprN; i++) sprPool[i].material.rotation = 0;
    window.POST3D?.(sh, lt, t);
    composer.render();
  },
};
window.G3ready = true;
