// KROZO — "كيف رسالتك توصل لآخر العالم في ثواني؟" 3D world: a phone with a live chat UI, the message bubble,
// 0/1 digits, numbered packets, a cell tower with radio waves, the operator network, a glass fibre with light pulses,
// the dotted globe (Natural Earth land) with satellites and an approximate subsea-cable map, the sea floor with a
// cable, a cable cutaway, a light tunnel inside the fibre, and a comments panel. timeline.js owns the shot list:
// every frame we reset, the active shot poses the world, then we render.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { makePhone } from './assets3d.js';

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
const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(5);
const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const tex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
function rr(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const AR = (g, px, wt = 700) => { g.font = `${wt} ${px}px Plex, PlexLatin`; g.direction = 'rtl'; };
const LA = (g, px, wt = 500) => { g.font = `${wt} ${px}px PlexLatin`; g.direction = 'ltr'; };

const pm = new THREE.PMREMGenerator(renderer);
const ENV = (() => {
  const es = new THREE.Scene(); es.background = new THREE.Color(0x020306);
  const box = (w, h, col, k, pos) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide })); m.position.copy(pos); m.lookAt(0, 0, 0); es.add(m); };
  box(4, 1.2, 0xffffff, 2.2, V(0, 4, 1)); box(1, 5, 0x168bff, 2.5, V(-4, 1, -1)); box(1, 5, 0x59c7ff, 1.6, V(4, 1, -1.5)); box(3, .5, 0xffffff, .8, V(0, .6, 4));
  return pm.fromScene(es, .02).texture;
})();
const DOT = (() => { const [c, g] = cnv(128, 128); const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.4, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return tex(c); })();
const fresnel = (base, rim, k = 1) => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false, uniforms: { a: { value: 1 }, k: { value: k } },
  vertexShader: 'varying vec3 vN, vV; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
  fragmentShader: `varying vec3 vN, vV; uniform float a, k; void main(){ float f = pow(1.-abs(dot(normalize(vN), normalize(vV))), 2.2); gl_FragColor = vec4((vec3(${base})*.35 + vec3(${rim})*f*1.1)*a*k, 1.); }`,
});

// ═════════ panels (cookies pattern): bubble, comments ═════════
const rimTex = (() => { const [c, g] = cnv(256, 256); g.strokeStyle = 'rgba(89,199,255,1)'; g.lineWidth = 6; g.shadowColor = '#59C7FF'; g.shadowBlur = 24; rr(g, 30, 30, 196, 196, 26); g.stroke(); return tex(c); })();
const PANELS = [];
function panel(cw, ch, ww, slab = true) {
  const wh = ww * ch / cw, grp = new THREE.Group(), [c, g] = cnv(cw, ch), t = tex(c);
  const sl = new THREE.Mesh(new RoundedBoxGeometry(ww + .05, wh + .05, .05, 4, .05), new THREE.MeshPhysicalMaterial({ color: 0x0a1220, metalness: .4, roughness: .28, clearcoat: 1, transparent: true })); sl.position.z = -.03; sl.visible = slab; grp.add(sl);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), new THREE.MeshBasicMaterial({ map: t, toneMapped: false, transparent: true })); scr.position.z = .002; scr.renderOrder = 2; grp.add(scr);
  const rim = new THREE.Mesh(new THREE.PlaneGeometry(ww * 1.16, wh + ww * .16), new THREE.MeshBasicMaterial({ map: rimTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0 }));
  rim.position.z = -.06; grp.add(rim); grp.visible = false; scene.add(grp);
  const P = { g: grp, c, x: g, t, ww, wh, key: null, scr, slab: sl, rim };
  P.paint = (key, fn) => { if (P.key === key) return; P.key = key; g.clearRect(0, 0, cw, ch); fn(g, cw, ch); t.needsUpdate = true; };
  P.at = (pos, rx = 0, ry = 0, rz = 0, s = 1, a = 1, rimA = .35) => { grp.visible = a > .002; grp.position.copy(pos); grp.rotation.set(rx, ry, rz); grp.scale.setScalar(s); scr.material.opacity = a; sl.material.opacity = a; rim.material.opacity = rimA * a; grp.updateMatrixWorld(true); };
  P.face = (pos, s = 1, a = 1, rimA = .35, roll = 0) => { P.at(pos, 0, 0, 0, s, a, rimA); grp.quaternion.copy(cam.quaternion); grp.rotateZ(roll); grp.updateMatrixWorld(true); };
  P.pt = (px, py, z = .01) => grp.localToWorld(V((px / cw - .5) * ww, (.5 - py / ch) * wh, z));
  PANELS.push(P); return P;
}
const MSG_TXT = 'هلا! وينك؟';
const BUBBLE = panel(600, 220, 1.3, false);
function paintBubble(glow = 0) {
  BUBBLE.paint('b' + glow.toFixed(2), (g, w, h) => {
    g.save(); g.shadowColor = CSS.cyan; g.shadowBlur = 30 + 50 * glow;
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#3aa8ff'); gr.addColorStop(1, CSS.blue);
    rr(g, 20, 20, w - 40, h - 40, 70); g.fillStyle = gr; g.fill(); g.restore();
    AR(g, 76); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(MSG_TXT, w / 2, h / 2 + 4);
  });
}
const MAIN = panel(900, 1500, 1.8);
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
    if (s.post > 0) row(260 * u, 360 * u, true, '@صاحبك', clamp(s.post * 2));
    row(260 * u + sh, 560 * u, false); row(410 * u + sh, 440 * u, false); row(560 * u + sh, 620 * u, false); row(710 * u + sh, 380 * u, false);
    const iy = h - 200 * u; g.fillStyle = '#0A101B'; g.fillRect(0, iy - 40 * u, w, 240 * u);
    rr(g, 180 * u, iy, w - 240 * u, 110 * u, 55 * u); g.fillStyle = '#141D2C'; g.fill(); g.lineWidth = 3 * u; g.strokeStyle = s.focus ? 'rgba(89,199,255,.8)' : 'rgba(167,177,194,.3)'; g.stroke();
    const word = '@صاحبك', n = Math.round(word.length * clamp(s.type ?? 0)), typed = (s.post ?? 0) > 0 ? '' : word.slice(0, n);
    AR(g, 48 * u, typed ? 700 : 400); g.textAlign = 'right'; g.fillStyle = typed ? CSS.cyan : 'rgba(167,177,194,.6)'; g.fillText(typed || 'أضف تعليقًا…', w - 110 * u, iy + 56 * u);
    g.save(); g.translate(100 * u, iy + 55 * u); const k = 1 - .1 * Math.sin(Math.PI * clamp(s.send ?? 0)); g.scale(k, k);
    g.fillStyle = typed ? CSS.blue : '#2A3446'; g.beginPath(); g.arc(0, 0, 52 * u, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-20 * u, -22 * u); g.lineTo(26 * u, 0); g.lineTo(-20 * u, 22 * u); g.lineTo(-10 * u, 0); g.closePath(); g.fill(); g.restore();
  });
}

// ═════════ the phone (generic, no logos) with a live chat screen ═════════
// st: {typed 0..1, press 0..1 (send button), sent 0/1 (bubble in the chat), gone 0..1 (bubble leaving), ticks 0..3, typing 0..1, seen 0..1}
const PH = makePhone(); const phone = new THREE.Group(); phone.add(PH.group); PH.group.scale.setScalar(12); scene.add(phone); phone.visible = false;
const SEND_PX = [86, 1176];                                  // send button centre on the 590×1278 screen canvas
function chatScreen(g, w, h, st) {
  g.fillStyle = '#070b14'; g.fillRect(0, 0, w, h);
  LA(g, 26, 700); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = CSS.ink; g.fillText('9:41', 48, 40);
  g.fillStyle = '#0c1424'; g.fillRect(0, 70, w, 130);
  g.fillStyle = '#1d4f96'; g.beginPath(); g.arc(w - 90, 135, 38, 0, 7); g.fill();
  AR(g, 38); g.fillStyle = CSS.ink; g.textAlign = 'center'; g.fillText('ص', w - 90, 138);
  AR(g, 34); g.textAlign = 'right'; g.fillText('صاحبي', w - 150, 118);
  AR(g, 24, 500); g.fillStyle = st.typing > .5 ? CSS.cyan : CSS.gray; g.fillText(st.typing > .5 ? 'يكتب…' : 'متصل', w - 150, 158);
  LA(g, 40, 700); g.textAlign = 'left'; g.fillStyle = CSS.gray; g.fillText('‹', 30, 135);
  // earlier messages
  const bub = (x, y, bw, txt, mine, a = 1) => { g.save(); g.globalAlpha = a; rr(g, x, y, bw, 76, 30); g.fillStyle = mine ? CSS.blue : '#1C2738'; g.fill(); AR(g, 30, 500); g.textAlign = 'center'; g.fillStyle = CSS.ink; g.fillText(txt, x + bw / 2, y + 40); g.restore(); };
  bub(40, 260, 300, 'شفت المقطع؟', false); bub(w - 330, 360, 290, 'لا لسه', true); bub(40, 460, 330, 'ارسلته لك أمس', false);
  // our message
  if (st.sent) {
    const k = 1 - clamp(st.gone ?? 0);
    if (k > 0) { g.save(); g.globalAlpha = k; rr(g, w - 360, 580, 320, 84, 34); g.fillStyle = CSS.blue; g.shadowColor = CSS.cyan; g.shadowBlur = 20 * (st.glow ?? 0); g.fill(); g.shadowBlur = 0; AR(g, 34); g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText(MSG_TXT, w - 200, 624); g.restore(); }
    const tk = st.ticks ?? 0;
    if (tk > 0) { LA(g, 30, 700); g.textAlign = 'right'; g.fillStyle = tk >= 3 ? CSS.cyan : CSS.gray; g.fillText(tk >= 2 ? '✓✓' : '✓', w - 48, 690); if (tk >= 3) { AR(g, 22, 500); g.fillStyle = CSS.cyan; g.fillText('تمت القراءة', w - 110, 690); } }
    if ((st.typing ?? 0) > 0) { g.save(); g.globalAlpha = clamp(st.typing); rr(g, 40, 730, 130, 64, 30); g.fillStyle = '#1C2738'; g.fill(); g.fillStyle = CSS.gray; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(75 + i * 30, 762 + 5 * Math.sin(st.tt * 8 + i), 8, 0, 7); g.fill(); } g.restore(); }
  }
  // input bar
  g.fillStyle = '#0c1424'; g.fillRect(0, h - 170, w, 170);
  rr(g, 150, h - 140, w - 190, 80, 40); g.fillStyle = '#141D2C'; g.fill();
  const typed = st.sent ? '' : MSG_TXT.slice(0, Math.round(MSG_TXT.length * clamp(st.typed ?? 0)));
  AR(g, 32, typed ? 700 : 400); g.textAlign = 'right'; g.fillStyle = typed ? CSS.ink : 'rgba(167,177,194,.6)'; g.fillText(typed || 'رسالة', w - 70, h - 98);
  g.save(); g.translate(...SEND_PX); const s = 1 - .14 * Math.sin(Math.PI * clamp(st.press ?? 0)); g.scale(s, s);
  g.fillStyle = typed || st.press > 0 ? CSS.blue : '#2A3446'; g.shadowColor = CSS.cyan; g.shadowBlur = 30 * Math.sin(Math.PI * clamp(st.press ?? 0)); g.beginPath(); g.arc(0, 0, 46, 0, 7); g.fill(); g.shadowBlur = 0;
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-18, -20); g.lineTo(24, 0); g.lineTo(-18, 20); g.lineTo(-9, 0); g.closePath(); g.fill(); g.restore();
}
function paintPhone(st) {
  const key = JSON.stringify(st); if (PH.key === key) return; PH.key = key;
  chatScreen(PH.canvas.getContext('2d'), PH.canvas.width, PH.canvas.height, st); PH.tex.needsUpdate = true;
}
function phoneAt(pos, rx = 0, ry = 0, rz = 0, s = 1) { phone.visible = true; phone.position.copy(pos); phone.rotation.set(rx, ry, rz); phone.scale.setScalar(s); phone.updateMatrixWorld(true); }
// world position of a pixel of the phone screen canvas
function phonePt(px, py, z = .06) { const w = PH.w - .0042, h = PH.h - .0042; return PH.group.localToWorld(V((px / 590 - .5) * w, (.5 - py / 1278) * h, PH.d / 2 + z / 12)); }

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
function digit(p, d, size, a = 1) { if (DIG.n >= DIGN || a <= .002) return; const i = DIG.n++; DIG.aP.array.set([p.x, p.y, p.z], i * 3); DIG.aD.array.set([d, Math.min(1, a), size], i * 3); }

// ═════════ numbered packets (glass cubes) ═════════
const PK = [];
{
  const m = new THREE.MeshPhysicalMaterial({ color: 0x0d3a74, metalness: .2, roughness: .15, clearcoat: 1, emissive: 0x168bff, emissiveIntensity: .45, transparent: true });
  for (let i = 0; i < 8; i++) {
    const g = new THREE.Group(); const b = new THREE.Mesh(new RoundedBoxGeometry(1, 1, 1, 3, .1), m.clone()); g.add(b);
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0x59c7ff, transparent: true })));
    const [c, gg] = cnv(256, 256); LA(gg, 150, 700); gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.fillStyle = '#F4F7FB'; gg.shadowColor = '#59C7FF'; gg.shadowBlur = 20; gg.fillText(String(i + 1), 128, 138);
    for (const z of [.505, -.505]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(.8, .8), new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, toneMapped: false })); l.position.z = z; if (z < 0) l.rotation.y = Math.PI; g.add(l); }
    g.visible = false; scene.add(g); PK.push(g);
  }
}
function packet(i, pos, s, a = 1, rot = 0) {
  const g = PK[i]; g.visible = a > .002 && s > .001; g.position.copy(pos); g.scale.setScalar(Math.max(.001, s)); g.rotation.set(.3 + rot * .5, rot, .1);
  g.traverse(o => { if (o.material) { o.material.opacity = a; } });
}

// ═════════ the cell tower (lattice mast + antenna panels) on the holo floor ═════════
const tower = new THREE.Group(); scene.add(tower);
const TW = {};
{
  const steel = new THREE.MeshPhysicalMaterial({ color: 0xb8c3d2, metalness: .9, roughness: .35 });
  const legs = [[1, 1], [-1, 1], [-1, -1], [1, -1]], Hh = 7, rb = .75, rt = .22;
  const at = (k, y) => { const r = rb + (rt - rb) * (y / Hh); return V(legs[k][0] * r, y, legs[k][1] * r); };
  const bar = (a, b, r = .035) => { const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 6), steel); m.position.copy(a).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); tower.add(m); };
  for (let k = 0; k < 4; k++) bar(at(k, 0), at(k, Hh), .06);
  for (let s = 0; s < 7; s++) { const y0 = s, y1 = s + 1; for (let k = 0; k < 4; k++) { bar(at(k, y0), at((k + 1) % 4, y1), .025); bar(at(k, y1), at((k + 1) % 4, y1), .025); } }
  const pan = new THREE.MeshPhysicalMaterial({ color: 0xe2e8f0, roughness: .4, clearcoat: .6 });
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2, p = new THREE.Mesh(new RoundedBoxGeometry(.32, 1.3, .12, 3, .04), pan); p.position.set(Math.cos(a) * .42, Hh - .3, Math.sin(a) * .42); p.rotation.y = -a + Math.PI / 2; tower.add(p); }
  const dish = new THREE.Mesh(new THREE.SphereGeometry(.28, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), pan); dish.rotation.x = -Math.PI / 2; dish.position.set(0, Hh - 1.6, .32); tower.add(dish);
  const top = new THREE.Mesh(new THREE.SphereGeometry(.08, 16, 8), new THREE.MeshBasicMaterial({ color: 0x59c7ff, toneMapped: false })); top.position.y = Hh + .35; tower.add(top);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .7, 6), steel); mast.position.y = Hh + .05; tower.add(mast);
  TW.top = V(0, Hh - .3, 0); TW.Hh = Hh; tower.visible = false;
}
// operator network on the floor: exchange nodes + links (pulses run along them)
const netw = new THREE.Group(); scene.add(netw);
const NW = { nodes: [], edges: [] };
{
  for (let i = 0; i < 26; i++) { const a = rnd() * Math.PI * 2, r = 1.5 + rnd() * 9; NW.nodes.push(V(Math.cos(a) * r, 0, Math.sin(a) * r - 3)); }
  NW.nodes[0] = V(0, 0, 0);
  for (let i = 0; i < NW.nodes.length; i++) { const d = NW.nodes.map((q, j) => [q.distanceTo(NW.nodes[i]), j]).sort((a, b) => a[0] - b[0]); for (const [, j] of d.slice(1, 3)) if (i < j || !NW.edges.some(e => e[0] === j && e[1] === i)) NW.edges.push([i, j]); }
  const lp = []; for (const [a, b] of NW.edges) lp.push(NW.nodes[a], NW.nodes[b]);
  NW.lines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lp), new THREE.LineBasicMaterial({ color: 0x168bff, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false })); netw.add(NW.lines);
  const bm = new THREE.MeshPhysicalMaterial({ color: 0x0b1019, metalness: .6, roughness: .3, emissive: 0x168bff, emissiveIntensity: .25 });
  for (const n of NW.nodes) { const b = new THREE.Mesh(new RoundedBoxGeometry(.5, .35 + rnd() * .5, .5, 2, .05), bm); b.position.copy(n); b.position.y = .2; netw.add(b); }
  netw.visible = false;
}

// ═════════ glass fibre (core + cladding), side view ═════════
const fib = new THREE.Group(); scene.add(fib);
const FB = {};
{
  const L = 40;
  const clad = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, L, 64, 1, true), fresnel('.05,.2,.45', '.35,.78,1.', .35)); clad.rotation.z = Math.PI / 2; fib.add(clad);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, L, 48, 1, true), fresnel('.1,.35,.8', '.6,.9,1.', .3)); core.rotation.z = Math.PI / 2; fib.add(core);
  const coat = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, L, 64, 1, true, 0, Math.PI * 1.1), new THREE.MeshPhysicalMaterial({ color: 0x0d3a74, roughness: .45, clearcoat: .6, side: THREE.DoubleSide, transparent: true, opacity: .9 }));
  coat.visible = false;
  Object.assign(FB, { clad, core, coat }); fib.visible = false;
}

// ═════════ the globe (Earth radius = 1): dotted land, graticule, atmosphere, satellites, cable map ═════════
const globe = new THREE.Group(); scene.add(globe);
const earth = new THREE.Group(); globe.add(earth);
function ll(lat, lon, r = 1) { const p = lat * Math.PI / 180, l = lon * Math.PI / 180; return V(r * Math.cos(p) * Math.sin(l), r * Math.sin(p), r * Math.cos(p) * Math.cos(l)); }
const GL = {};
{
  const ocean = new THREE.Mesh(new THREE.SphereGeometry(.995, 96, 64), new THREE.MeshBasicMaterial({ color: 0x07101f })); earth.add(ocean);
  const atm = new THREE.Mesh(new THREE.SphereGeometry(1.0, 96, 64), new THREE.ShaderMaterial({
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    vertexShader: 'varying vec3 vN, vV; void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'varying vec3 vN, vV; void main(){ float f = pow(1.-max(dot(vN,vV),0.), 3.); gl_FragColor = vec4(vec3(.09,.55,1.)*f*1.4, 1.); }',
  })); earth.add(atm);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1.12, 64, 48), new THREE.ShaderMaterial({
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide, toneMapped: false,
    vertexShader: 'varying vec3 vN, vV; void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'varying vec3 vN, vV; void main(){ float f = pow(max(0., dot(vN,vV)), 4.); gl_FragColor = vec4(vec3(.09,.55,1.)*f*.6, 1.); }',
  })); globe.add(halo);
  const gm = new THREE.LineBasicMaterial({ color: 0x168bff, transparent: true, opacity: .12 });
  for (let la = -60; la <= 60; la += 30) { const pts = []; for (let lo = -180; lo <= 180; lo += 4) pts.push(ll(la, lo, 1.001)); earth.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gm)); }
  for (let lo = -180; lo < 180; lo += 30) { const pts = []; for (let la = -90; la <= 90; la += 4) pts.push(ll(la, lo, 1.001)); earth.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gm)); }
  const topo = await (await fetch('assets/land-50m.json')).json();
  const land = topojson.feature(topo, topo.objects.land);
  const [mc, mg] = cnv(2048, 1024); mg.fillStyle = '#000'; mg.fillRect(0, 0, 2048, 1024); mg.fillStyle = '#fff';
  const X = lo => (lo + 180) / 360 * 2048, Y = la => (90 - la) / 180 * 1024;
  for (const f of land.features) { const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const poly of polys) { mg.beginPath(); for (const ringC of poly) { ringC.forEach(([lo, la], i) => i ? mg.lineTo(X(lo), Y(la)) : mg.moveTo(X(lo), Y(la))); mg.closePath(); } mg.fill('evenodd'); } }
  const md = mg.getImageData(0, 0, 2048, 1024).data;
  const pos = [];
  for (let la = -84; la <= 84; la += .7) { const n = Math.max(1, Math.round(520 * Math.cos(la * Math.PI / 180))); for (let i = 0; i < n; i++) { const lo = -180 + 360 * i / n; if (md[(Math.floor(Y(la)) * 2048 + Math.floor(X(lo))) * 4] > 128) { const p = ll(la, lo, 1.002); pos.push(p.x, p.y, p.z); } } }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  GL.landM = new THREE.PointsMaterial({ map: DOT, size: .014, color: 0x8fd0ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, sizeAttenuation: true });
  earth.add(new THREE.Points(dg, GL.landM));
  GL.ocean = ocean;
}
// arcs: one shader (progress p, per-mesh uniforms)
function arcMat() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, uniforms: { p: { value: 1 }, t: { value: 0 }, a: { value: 1 }, c: { value: new THREE.Color(0x59c7ff) } },
    vertexShader: 'varying float vU; void main(){ vU = uv.x; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying float vU; uniform float p, t, a; uniform vec3 c; void main(){ if (vU > p) discard; float d = .45 + .55*pow(.5+.5*sin((vU*16. - t*2.)*6.2832), 4.); float head = exp(-(p-vU)*60.); gl_FragColor = vec4(mix(c*.8, vec3(.85,.96,1.), head)*(d+head*2.5)*a, 1.); }',
  });
}
function gcPts(a, b, lift = 0, n = 128, r0 = 1.004) { const pa = ll(a[0], a[1]), pb = ll(b[0], b[1]), pts = []; for (let i = 0; i <= n; i++) { const u = i / n; const p = pa.clone().lerp(pb, u).normalize(); p.multiplyScalar(r0 + lift * Math.sin(Math.PI * u)); pts.push(p); } return pts; }
const CITY = { RUH: [24.71, 46.68], NYC: [40.71, -74.0] };
const MSGARC = { curve: new THREE.CatmullRomCurve3(gcPts(CITY.RUH, CITY.NYC, .32)), m: arcMat() };
earth.add(new THREE.Mesh(new THREE.TubeGeometry(MSGARC.curve, 240, .006, 8), MSGARC.m));
// approximate subsea-cable routes between landing points (illustrative, not the real map)
const CAB = [
  [[40.5, -73.9], [50.1, -5.5]], [[36.8, -75.9], [43.4, -2.9]], [[26.7, -80.0], [-3.7, -38.5]], [[-3.7, -38.5], [37.9, -8.9]], [[-3.7, -38.5], [-8.8, 13.2]],
  [[43.3, 5.4], [31.2, 29.9]], [[29.1, 32.6], [21.5, 39.2]], [[21.5, 39.2], [11.6, 43.1]], [[11.6, 43.1], [19.0, 72.8]], [[19.0, 72.8], [1.3, 103.8]],
  [[1.3, 103.8], [22.3, 114.2]], [[22.3, 114.2], [34.9, 139.9]], [[34.9, 139.9], [45.6, -123.9]], [[34.0, -118.5], [21.3, -158.0]], [[21.3, -158.0], [-33.9, 151.2]],
  [[1.3, 103.8], [-31.9, 115.8]], [[-33.9, 18.4], [6.4, 3.4]], [[6.4, 3.4], [37.9, -8.9]], [[11.6, 43.1], [-4.0, 39.7]], [[-4.0, 39.7], [-29.9, 31.0]],
  [[25.3, 55.3], [19.0, 72.8]], [[26.2, 50.6], [25.3, 55.3]], [[50.1, -5.5], [59.9, 10.7]], [[-33.9, 151.2], [-36.8, 174.8]], [[-23.0, -43.2], [-34.9, -56.2]],
];
const CABLES = CAB.map(([a, b]) => { const m = arcMat(); m.uniforms.c.value.set(0x168bff); const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(gcPts(a, b, 0, 96, 1.003)), 120, .0035, 6), m); earth.add(mesh); return { mesh, m, a, b }; });
const cityDot = {};
for (const k in CITY) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: DOT, color: 0x59c7ff, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); s.position.copy(ll(...CITY[k], 1.006)); s.scale.setScalar(.05); earth.add(s); cityDot[k] = s; }
// satellites
const SATS = [];
{
  const body = new THREE.MeshPhysicalMaterial({ color: 0xc9d2de, metalness: .9, roughness: .3 }), pan = new THREE.MeshPhysicalMaterial({ color: 0x0d2a55, metalness: .5, roughness: .3, emissive: 0x168bff, emissiveIntensity: .3 });
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group(); g.add(new THREE.Mesh(new RoundedBoxGeometry(1, 1.2, 1, 2, .1), body));
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(3, .05, 1.1), pan); p.position.x = s * 2.1; g.add(p); }
    const dish = new THREE.Mesh(new THREE.ConeGeometry(.35, .3, 24, 1, true), body); dish.position.y = -.75; dish.rotation.x = Math.PI; g.add(dish);
    g.scale.setScalar(.035); g.visible = false; scene.add(g); SATS.push(g);
  }
}
const stars = (() => { const sp = []; for (let i = 0; i < 1500; i++) { const v = V(rnd() - .5, rnd() - .5, rnd() - .5).normalize().multiplyScalar(60 + rnd() * 40); sp.push(v.x, v.y, v.z); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ map: DOT, size: .5, color: 0xcfe6ff, transparent: true, depthWrite: false, toneMapped: false })); p.visible = false; scene.add(p); return p; })();

// ═════════ the sea: floor, caustics, god rays, marine snow, a subsea cable with light pulses ═════════
const sea = new THREE.Group(); scene.add(sea);
const SEA = {};
{
  const hgt = (x, z) => .35 * Math.sin(x * .35) * Math.cos(z * .28) + .18 * Math.sin(x * 1.1 + z * .7) + .08 * Math.sin(x * 2.9 - z * 2.3);
  const fg = new THREE.PlaneGeometry(90, 90, 180, 180); fg.rotateX(-Math.PI / 2); const P = fg.attributes.position;
  for (let i = 0; i < P.count; i++) P.setY(i, hgt(P.getX(i), P.getZ(i))); fg.computeVertexNormals();
  SEA.floorU = { t: { value: 0 } };
  const floorM = new THREE.MeshStandardMaterial({ color: 0x0b1d33, roughness: .95, metalness: 0 });
  floorM.onBeforeCompile = sh => {
    sh.uniforms.ct = SEA.floorU.t;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; uniform float ct;').replace('#include <dithering_fragment>',
      `#include <dithering_fragment>
       vec2 q = vWp.xz*.9; float c = 0.; for (int i = 0; i < 3; i++) { float fi = float(i); c += abs(sin(q.x*(1.3+fi*.4) + ct*(.7+fi*.3) + sin(q.y*(1.1+fi*.3) - ct*.5)*1.6)); }
       c = pow(clamp(1. - c/3., 0., 1.), 4.); gl_FragColor.rgb += vec3(.12,.45,.8)*c*.55*exp(-length(vWp.xz)*.03);`);
  };
  const floor = new THREE.Mesh(fg, floorM); sea.add(floor);
  // the cable lying on the sea floor
  const pts = []; for (let i = 0; i <= 60; i++) { const x = -40 + i * 80 / 60, z = 2.5 * Math.sin(x * .08) - 1; pts.push(V(x, hgt(x, z) + .16, z)); }
  SEA.curve = new THREE.CatmullRomCurve3(pts);
  const cab = new THREE.Mesh(new THREE.TubeGeometry(SEA.curve, 400, .16, 16), new THREE.MeshPhysicalMaterial({ color: 0x101a2a, metalness: .3, roughness: .4, clearcoat: .8 })); sea.add(cab);
  SEA.pulseM = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, uniforms: { t: { value: 0 }, a: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying vec2 vUv; uniform float t, a; void main(){ float x = vUv.x*60. - t*3.; float p = pow(.5+.5*sin(x*6.2832), 14.)*step(.5, fract(floor(x)*.618+.3)); gl_FragColor = vec4(vec3(.35,.78,1.)*(p*1.6 + .12)*a, 1.); }',
  });
  sea.add(new THREE.Mesh(new THREE.TubeGeometry(SEA.curve, 400, .19, 16), SEA.pulseM));
  // god rays
  SEA.rayM = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false, uniforms: { t: { value: 0 }, a: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying vec2 vUv; uniform float t, a; void main(){ float s = smoothstep(0., .5, vUv.x)*smoothstep(1., .5, vUv.x); float f = s*pow(vUv.y, 1.6)*(.6+.4*sin(t*.7 + vUv.x*9.)); gl_FragColor = vec4(vec3(.2,.55,.95)*f*.22*a, 1.); }',
  });
  for (let i = 0; i < 9; i++) { const r = new THREE.Mesh(new THREE.PlaneGeometry(1.6 + rnd() * 2.5, 26), SEA.rayM); r.position.set(-14 + i * 3.6 + rnd() * 2, 11, -6 - rnd() * 8); r.rotation.set(0, (rnd() - .5) * .6, .35 + (rnd() - .5) * .15); sea.add(r); }
  // surface seen from below
  SEA.surfM = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, uniforms: { t: { value: 0 } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
    fragmentShader: 'varying vec3 vW; uniform float t; void main(){ vec2 q = vW.xz*.5; float c = abs(sin(q.x*1.3 + t*.8 + sin(q.y*1.7 - t*.6)))*abs(sin(q.y*1.1 - t*.5 + sin(q.x*.9))); float f = exp(-length(vW.xz)*.05); gl_FragColor = vec4(vec3(.25,.6,1.)*(.25 + .75*pow(1.-c, 6.))*f*.8, f*.9); }',
  });
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), SEA.surfM); surf.rotation.x = -Math.PI / 2; surf.position.y = 14; sea.add(surf);
  const sp = []; for (let i = 0; i < 1800; i++) sp.push((rnd() - .5) * 50, rnd() * 14, (rnd() - .7) * 40);
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  SEA.snow = new THREE.Points(sg, new THREE.PointsMaterial({ map: DOT, size: .07, color: 0x9fd0ff, transparent: true, opacity: .55, depthWrite: false, toneMapped: false })); sea.add(SEA.snow);
  const sl = new THREE.DirectionalLight(0x6fb8ff, 1.4); sl.position.set(2, 10, 3); sea.add(sl); SEA.hgt = hgt;
  sea.visible = false;
}

// ═════════ subsea cable cutaway (telescoped layers) ═════════
const xsec = new THREE.Group(); scene.add(xsec);
const XS = {};
{
  const lay = (r, len, x0, mat, seg = 64) => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat); m.rotation.z = Math.PI / 2; m.position.x = x0 + len / 2; g.add(m); xsec.add(g); return m; };
  lay(1.0, 6, -6, new THREE.MeshPhysicalMaterial({ color: 0x0c1424, roughness: .5, clearcoat: .7 }));                                           // polyethylene jacket
  const steel = new THREE.MeshPhysicalMaterial({ color: 0xaab6c6, metalness: 1, roughness: .3 });
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, w = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, 1.6, 12), steel); w.rotation.z = Math.PI / 2; w.position.set(.8, Math.cos(a) * .76, Math.sin(a) * .76); xsec.add(w); }   // steel wires
  lay(.66, 2.6, 0, new THREE.MeshPhysicalMaterial({ color: 0x8fa0b8, metalness: 1, roughness: .35 }));                                            // power conductor (copper in reality; drawn in brand metal)
  lay(.5, 3.6, 0, new THREE.MeshPhysicalMaterial({ color: 0x1d4f96, roughness: .3, clearcoat: 1 }));                                               // insulation
  lay(.24, 4.6, 0, new THREE.MeshPhysicalMaterial({ color: 0xd8e0ea, metalness: .9, roughness: .25 }));                                            // steel tube
  XS.fm = new THREE.MeshBasicMaterial({ color: 0x59c7ff, toneMapped: false });
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, r = i ? .12 : 0; const f = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, 5.4, 10), XS.fm); f.rotation.z = Math.PI / 2; f.position.set(2.7, Math.cos(a) * r, Math.sin(a) * r); xsec.add(f); }
  XS.tip = V(5.4, 0, 0); xsec.visible = false;
}

// ═════════ light tunnel (inside the fibre core) ═════════
const tunnel = new THREE.Group(); scene.add(tunnel);
const TU = { u: { t: { value: 0 }, sp: { value: 1 }, a: { value: 1 } } };
{
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending, toneMapped: false, uniforms: TU.u,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec2 vUv; uniform float t, sp, a;
      float h(float x){ return fract(sin(x*91.7)*437.5); }
      void main(){ float y = vUv.y*120. + t*sp; float lane = floor(vUv.x*48.); float s = fract(y*.08 + h(lane)*7.);
        float streak = smoothstep(.0, .02, s)*smoothstep(.35*min(1., sp/30.) + .05, .02, s)*step(.55, h(lane + floor(y*.08)));
        float ring = pow(.5+.5*sin(y*.9), 30.)*.25;
        gl_FragColor = vec4((vec3(.35,.78,1.)*streak*.9 + vec3(.09,.55,1.)*(.05 + ring*.6))*a, 1.); }`,
  });
  const c = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 120, 48, 1, true), m); c.rotation.x = Math.PI / 2; c.position.z = -50; tunnel.add(c);
  tunnel.visible = false;
}

// ═════════ stage: void with a holographic grid floor + dust ═════════
const world = new THREE.Group(); scene.add(world);
const gridM = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, toneMapped: false, uniforms: { t: { value: 0 }, a: { value: 1 } },
  vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
  fragmentShader: `varying vec3 vW; uniform float t, a;
    void main(){ vec2 g = abs(fract(vW.xz*.5)-.5); float l = smoothstep(.485,.5,max(g.x,g.y));
      float d = length(vW.xz); float fade = exp(-d*.07);
      float sweep = exp(-pow(mod(d - t*2.5, 18.) - 9., 2.)*.25)*.6;
      gl_FragColor = vec4(vec3(.09,.55,1.)*(l*(.13+sweep*.45))*fade*a + vec3(.02,.05,.1)*fade*.2*a, (l*.5+.06)*fade*a); }`,
});
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), gridM); floor.rotation.x = -Math.PI / 2; floor.position.y = 0; world.add(floor);
{
  const pts = []; for (let i = 0; i < 1400; i++) pts.push((rnd() - .5) * 40, (rnd() - .1) * 20, (rnd() - .8) * 40);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  world.add(new THREE.Points(g, new THREE.PointsMaterial({ map: DOT, size: .09, color: 0x6fb8ff, transparent: true, opacity: .55, depthWrite: false, toneMapped: false })));
}
const lights = new THREE.Group(); scene.add(lights);
{ const key = new THREE.DirectionalLight(0xdfeaff, 2.2); key.position.set(3, 5, 6); const fill = new THREE.DirectionalLight(0x168bff, 1.6); fill.position.set(-5, 1, 2); const back = new THREE.DirectionalLight(0x59c7ff, 2.4); back.position.set(0, 3, -6); lights.add(key, fill, back, new THREE.HemisphereLight(0x2b4f8f, 0x05070c, .6)); }

// ═════════ FX pools: rings, beams, glow sprites ═════════
const ringGeo = new THREE.PlaneGeometry(1, 1), ringPool = [];
for (let i = 0; i < 60; i++) {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    uniforms: { col: { value: new THREE.Color() }, a: { value: 1 }, w: { value: .08 }, arc: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec2 vUv; uniform vec3 col; uniform float a, w, arc;
      void main(){ vec2 d = vUv-.5; float r = length(d)*2.; float an = abs(atan(d.y, d.x)); if (an > arc*3.14159) discard; float dd = abs(r-(1.-w)); float m = smoothstep(w, 0., dd) + exp(-dd*18.)*.35; m *= smoothstep(1.,.97,r); gl_FragColor = vec4(col*m*a, 1.); }`,
  });
  const r = new THREE.Mesh(ringGeo, m); r.visible = false; r.frustumCulled = false; r.renderOrder = 6; scene.add(r); ringPool.push(r);
}
let ringN = 0;
function ring(pos, rad, col, a, o = {}) {
  if (ringN >= ringPool.length || a <= .002 || rad <= 0) return;
  const r = ringPool[ringN++]; r.visible = true; r.position.copy(pos); r.scale.set(rad * 2, rad * 2, 1); r.userData.flat = o.flat; r.userData.q = o.q;
  const u = r.material.uniforms; u.col.value.set(col); u.a.value = a; u.w.value = o.w ?? .06; u.arc.value = o.arc ?? 1;
}
function click(pos, t, at, size = .35) { for (const d of [0, .12]) { const k = pg(t, at + d, at + d + .55); if (k > 0 && k < 1) ring(pos, size * (.15 + eo(k)), COL.cyan, (1 - k) * 1.2); } }
const beamGeo = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true), beamPool = [];
for (let i = 0; i < 40; i++) {
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
  const m = beamPool[beamN++]; m.visible = true; const d = b.clone().sub(a), len = d.length(); if (len < 1e-5) { m.visible = false; return; }
  m.position.copy(a).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); m.scale.set(rad, len, rad);
  const u = m.material.uniforms; u.col.value.set(col); u.a.value = al; u.t.value = o.t ?? 0; u.grow.value = o.grow ?? 1;
}
const sprPool = [];
for (let i = 0; i < 90; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: DOT, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); s.visible = false; s.renderOrder = 7; scene.add(s); sprPool.push(s); }
let sprN = 0;
function glow(pos, size, col, a = 1) { if (sprN >= sprPool.length || a <= .002) return; const s = sprPool[sprN++]; s.visible = true; s.position.copy(pos); s.scale.setScalar(size); s.material.color.set(col); s.material.opacity = a; }

// ═════════ post (bloom + grade: zoom blur, CA, vignette, grain, flash) ═════════
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, cam));
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), .35, .55, .85); composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, t: { value: 0 }, zb: { value: 0 }, ca: { value: .0015 }, vig: { value: .45 }, grain: { value: .035 }, flash: { value: 0 }, tint: { value: new THREE.Vector3(1, 1, 1) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float t, zb, ca, vig, grain, flash; uniform vec3 tint; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    void main(){ vec2 c = vec2(.5), d = vUv - c; vec3 col = vec3(0.); float n = zb > .001 ? 10. : 1.;
      for (float i = 0.; i < 10.; i++) { if (i >= n) break; float s = 1. - zb*i/10.*.12; vec2 uv = c + d*s; float k = ca*(1.+zb*6.)*length(d)*2.;
        col += vec3(texture2D(tDiffuse, uv + d*k).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - d*k).b); }
      col /= n; col *= tint; col *= 1. - vig*smoothstep(.35, 1.0, length(d*vec2(1.,.62))*1.6);
      col += (h(floor(vUv*vec2(1080.,1920.)) + fract(t*7.)*100.) - .5)*grain; col = mix(col, vec3(1.), flash);
      gl_FragColor = vec4(col, 1.); }`,
});
composer.addPass(grade);

// ═════════ per-frame API ═════════
function reset(t) {
  for (const P of PANELS) P.g.visible = false;
  for (const o of [phone, tower, netw, fib, globe, sea, xsec, tunnel, stars, ...SATS, ...PK]) o.visible = false;
  for (const r of ringPool) r.visible = false; for (const b of beamPool) b.visible = false; for (const s of sprPool) s.visible = false;
  ringN = beamN = sprN = 0; DIG.n = 0;
  scene.background = new THREE.Color(0x04060b); scene.fog = new THREE.FogExp2(0x04060b, .035); scene.environment = ENV; scene.environmentIntensity = .8;
  renderer.toneMappingExposure = 1; bloom.strength = .45; bloom.threshold = .72; bloom.radius = .6;
  gridM.uniforms.t.value = t; gridM.uniforms.a.value = 1; world.visible = true; lights.visible = true;
  cam.fov = 30; cam.up.set(0, 1, 0);
  const G = grade.uniforms; G.zb.value = 0; G.flash.value = 0; G.vig.value = .45; G.ca.value = .0015; G.tint.value.set(1, 1, 1);
  globe.rotation.set(0, 0, 0); globe.scale.setScalar(1); globe.position.set(0, 0, 0); GL.landM.opacity = 1;
  MSGARC.m.uniforms.p.value = 0; MSGARC.m.uniforms.a.value = 1; MSGARC.m.uniforms.t.value = t;
  for (const c of CABLES) { c.m.uniforms.p.value = 0; c.m.uniforms.t.value = t; c.m.uniforms.a.value = 1; }
  for (const k in cityDot) cityDot[k].material.opacity = 0;
  SEA.floorU.t.value = t; SEA.pulseM.uniforms.t.value = t; SEA.pulseM.uniforms.a.value = 1; SEA.rayM.uniforms.t.value = t; SEA.surfM.uniforms.t.value = t;
  SEA.snow.position.y = -(t * .08) % 1;
  TU.u.t.value = t; TU.u.sp.value = 1; TU.u.a.value = 1;
  NW.lines.material.opacity = .7;
  phone.scale.setScalar(1);
}
function lookCam(pos, look, fov = 30, roll = 0) {
  cam.position.copy(pos); cam.fov = fov; cam.up.set(Math.sin(roll), Math.cos(roll), 0); cam.lookAt(look);
  const d = pos.distanceTo(look); cam.near = Math.max(.001, d / 300); cam.far = Math.max(150, d * 40);
  cam.updateProjectionMatrix(); cam.updateMatrixWorld();
}
function project(v) { cam.updateMatrixWorld(); const p = v.clone().project(cam); return [(p.x * .5 + .5) * 1080, (-p.y * .5 + .5) * 1920]; }
function underwater(on) {
  if (!on) return;
  scene.background = new THREE.Color(0x021226); scene.fog = new THREE.FogExp2(0x03203d, .055); world.visible = false; lights.visible = false;
  scene.environmentIntensity = .9; bloom.threshold = .6; bloom.strength = .55; grade.uniforms.tint.value.set(.85, .97, 1.1);
}

window.R3 = {
  THREE, V, scene, cam, COL, phone, PH, paintPhone, phoneAt, phonePt, SEND_PX, BUBBLE, paintBubble, MAIN, paintComments, digit, PK, packet,
  tower, TW, netw, NW, fib, FB, globe, earth, ll, CITY, MSGARC, CABLES, cityDot, SATS, stars, GL, sea, SEA, underwater, xsec, XS, tunnel, TU,
  ring, click, beam, glow, bloom, grade: grade.uniforms, gridM, world, lights, reset, lookCam, project, renderer,
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
    for (let i = 0; i < ringN; i++) { const r = ringPool[i]; if (r.userData.q) r.quaternion.copy(r.userData.q); else if (r.userData.flat) r.rotation.set(-Math.PI / 2, 0, 0); else r.quaternion.copy(cam.quaternion); }
    DIG.geo.instanceCount = DIG.n; DIG.aP.needsUpdate = true; DIG.aD.needsUpdate = true;
    window.POST3D?.(sh, lt, t);
    composer.render();
  },
};
window.G3ready = true;
