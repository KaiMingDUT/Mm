// Cover art: phone keyboard after typing "سلا". The hidden touch-zone map floats
// above the glass with the م zone swollen; a holographic thumb lands between ن and م
// and the touch ring sits inside م's zone. Top third stays dark for the title.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const W = 1080, H = 1920;
const R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
R.setSize(W, H); R.setPixelRatio(1);
R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
document.body.appendChild(R.domElement);
const S = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(34, W / H, 0.1, 200);
cam.position.set(0, 5.5, 17.5); cam.lookAt(0, -3.3, 0);
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const tex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const glow = (c, i = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), toneMapped: false });
await document.fonts.load('700 40px A').catch(() => {});

// ---------- background ----------
{
  const [c, x] = cnv(540, 960);
  const g = x.createLinearGradient(0, 0, 0, 960);
  g.addColorStop(0, '#01040b'); g.addColorStop(.45, '#04122a'); g.addColorStop(.8, '#061a3a'); g.addColorStop(1, '#020812');
  x.fillStyle = g; x.fillRect(0, 0, 540, 960);
  const rg = x.createRadialGradient(270, 600, 10, 270, 600, 440);
  rg.addColorStop(0, 'rgba(30,120,255,.33)'); rg.addColorStop(1, 'rgba(30,120,255,0)'); x.fillStyle = rg; x.fillRect(0, 0, 540, 960);
  for (let i = 0; i < 70; i++) {
    const px = rnd() * 540, py = 250 + rnd() * 700, r = 3 + rnd() * 16, a = .08 + rnd() * .22;
    const b = x.createRadialGradient(px, py, 0, px, py, r); b.addColorStop(0, `rgba(80,170,255,${a})`); b.addColorStop(1, 'rgba(80,170,255,0)');
    x.fillStyle = b; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
  }
  for (let i = 0; i < 9; i++) { x.fillStyle = `rgba(60,150,255,${.04 + rnd() * .07})`; x.fillRect(rnd() * 540, 0, 2 + rnd() * 10, 960); }
  S.background = tex(c);
}
{
  const es = new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial({ color: 0x050b18, side: THREE.BackSide })));
  const strip = (col, p, w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide })); m.position.copy(p); m.lookAt(0, 0, 0); es.add(m); };
  strip(0x9fd0ff, new THREE.Vector3(0, 12, 2), 18, 3); strip(0x2a7fff, new THREE.Vector3(-12, 3, 0), 3, 10); strip(0x59c7ff, new THREE.Vector3(12, 4, -3), 3, 10);
  S.environment = new THREE.PMREMGenerator(R).fromScene(es, .02).texture;
}
S.add(new THREE.AmbientLight(0x3355aa, .5));
const key = new THREE.DirectionalLight(0xbcd8ff, 2); key.position.set(-5, 9, 7); S.add(key);

// ---------- keyboard layout (screen canvas px, 1000×2110) ----------
const SW = 1000, SH = 2110;
const rows = [['ض','ص','ث','ق','ف','غ','ع','ه','خ','ح','ج'], ['ش','س','ي','ب','ل','ا','ت','ن','م','ك','ط'], ['ئ','ء','ؤ','ر','لا','ى','ة','و','ز','ظ','د']];
const KB = { top: 1330, rowH: 150, gap: 10 }, kw = (SW - 24) / 11;
const keys = [];
rows.forEach((r, ri) => r.forEach((ch, ci) => {
  const cx = SW - 12 - kw * (ci + .5), cy = KB.top + 70 + ri * KB.rowH + 60;
  keys.push({ ch, cx, cy, w: kw - KB.gap, h: KB.rowH - 22 });
}));
const M = keys.find(k => k.ch === 'م'), N = keys.find(k => k.ch === 'ن');
const touch = { x: (M.cx + N.cx) / 2 + 6, y: M.cy + 12 };

const screen = (() => {
  const [c, x] = cnv(SW, SH);
  const g = x.createLinearGradient(0, 0, 0, SH); g.addColorStop(0, '#0a1630'); g.addColorStop(1, '#050a16');
  x.fillStyle = g; x.fillRect(0, 0, SW, SH);
  x.direction = 'rtl'; x.textAlign = 'center'; x.textBaseline = 'middle';
  // chat bubbles
  const bub = (t, y, mine) => { x.font = '700 46px A'; const w = x.measureText(t).width + 70; const bx = mine ? SW - 60 - w : 60;
    x.fillStyle = mine ? '#168BFF' : '#1b2740'; x.beginPath(); x.roundRect(bx, y, w, 96, 40); x.fill(); x.fillStyle = '#F4F7FB'; x.fillText(t, bx + w / 2, y + 50); };
  bub('هلا! وش أخبارك؟', 420, false); bub('تمام الحمدلله', 560, true); bub('متى نطلع؟', 700, false);
  // input field with "سلا|"
  x.fillStyle = '#111c33'; x.beginPath(); x.roundRect(40, 1100, SW - 80, 110, 55); x.fill();
  x.strokeStyle = '#2d6fd6'; x.lineWidth = 3; x.stroke();
  x.textAlign = 'right'; x.font = '700 56px A'; x.fillStyle = '#F4F7FB'; x.fillText('سلا', SW - 100, 1157);
  const tw = x.measureText('سلا').width; x.fillStyle = '#59C7FF'; x.fillRect(SW - 108 - tw - 10, 1125, 5, 64);
  // suggestion bar
  x.textAlign = 'center'; x.font = '700 46px A';
  [['سلامات', 200], ['سلام', 500], ['سلامتك', 800]].forEach(([t, px], i) => { x.fillStyle = i === 1 ? '#59C7FF' : '#8fa3c4'; x.fillText(t, px, 1290); });
  x.fillStyle = '#0c1424'; x.fillRect(0, KB.top + 40, SW, SH - KB.top);
  for (const k of keys) {
    x.fillStyle = '#1f2a40'; x.beginPath(); x.roundRect(k.cx - k.w / 2, k.cy - k.h / 2, k.w, k.h, 16); x.fill();
    x.fillStyle = '#E8EEF8'; x.font = `700 ${k.ch.length > 1 ? 46 : 58}px A`; x.fillText(k.ch, k.cx, k.cy + 4);
  }
  // bottom row
  x.fillStyle = '#1f2a40'; x.beginPath(); x.roundRect(250, KB.top + 70 + 3 * KB.rowH + 0, 500, 128, 16); x.fill();
  x.fillStyle = '#2a3956'; x.beginPath(); x.roundRect(40, KB.top + 70 + 3 * KB.rowH, 190, 128, 16); x.fill(); x.beginPath(); x.roundRect(770, KB.top + 70 + 3 * KB.rowH, 190, 128, 16); x.fill();
  return tex(c);
})();

// touch-zone map: weighted nearest-key, م weighted up hard, drawn as glowing cell borders
const zones = (() => {
  const [c, x] = cnv(SW, 720); const y0 = KB.top + 40;
  const im = x.createImageData(SW, 720), owner = new Int16Array(SW * 720);
  const wt = k => k.ch === 'م' ? 95 : (k.ch === 'ن' || k.ch === 'ك') ? -18 : 0;
  for (let py = 0; py < 720; py++) for (let px = 0; px < SW; px++) {
    let best = 1e9, bi = -1; const Y = py + y0;
    for (let i = 0; i < keys.length; i++) { const k = keys[i]; const d = Math.hypot((px - k.cx) * 1, (Y - k.cy) * 1.25) - wt(k); if (d < best) { best = d; bi = i; } }
    owner[py * SW + px] = bi;
  }
  const mi = keys.indexOf(M);
  for (let py = 1; py < 719; py++) for (let px = 1; px < SW - 1; px++) {
    const o = owner[py * SW + px], j = (py * SW + px) * 4;
    const edge = o !== owner[py * SW + px + 1] || o !== owner[(py + 1) * SW + px] || o !== owner[py * SW + px - 1] || o !== owner[(py - 1) * SW + px];
    const inM = o === mi;
    if (edge) { im.data.set(inM ? [140, 240, 255, 255] : [60, 140, 255, 200], j); }
    else if (inM) im.data.set([40, 200, 255, 150], j);
    else im.data.set([20, 60, 160, 40], j);
  }
  x.putImageData(im, 0, 0);
  x.direction = 'rtl'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '700 96px A'; x.fillStyle = '#ffffff'; x.shadowColor = '#59C7FF'; x.shadowBlur = 24; x.fillText('م', M.cx, M.cy - y0 + 4);
  return tex(c);
})();

// ---------- phone ----------
const phone = new THREE.Group(); S.add(phone);
phone.position.set(0, -3.6, 0); phone.rotation.set(-.88, 0, .06);
const PW = 4.3, PH = 9.1, sc = PW * .94 / SW;
{
  const s = new THREE.Shape(), w = PW, h = PH, r = .55, x0 = -w / 2, y0 = -h / 2;
  s.moveTo(x0 + r, y0); s.lineTo(x0 + w - r, y0); s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r); s.lineTo(x0 + w, y0 + h - r); s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
  s.lineTo(x0 + r, y0 + h); s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
  const g = new THREE.ExtrudeGeometry(s, { depth: .28, bevelEnabled: true, bevelSize: .06, bevelThickness: .06, bevelSegments: 6, curveSegments: 20 });
  g.translate(0, 0, -.34);
  phone.add(new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: 0x1a2232, metalness: .8, roughness: .22, clearcoat: 1 })));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(SW * sc, SH * sc), new THREE.MeshBasicMaterial({ map: screen, toneMapped: false }));
  scr.position.z = .005; phone.add(scr);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(SW * sc, SH * sc), new THREE.MeshPhysicalMaterial({ color: 0x000000, transparent: true, opacity: .12, roughness: .05, metalness: 0, clearcoat: 1 }));
  glass.position.z = .01; phone.add(glass);
}
const toPhone = (px, py, z) => new THREE.Vector3((px - SW / 2) * sc, (SH / 2 - py) * sc, z);
// floating zone layer, lifted off the glass
const ZL = .9;
{
  const y0 = KB.top + 40;
  const zm = new THREE.Mesh(new THREE.PlaneGeometry(SW * sc, 720 * sc), new THREE.MeshBasicMaterial({ map: zones, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
  zm.position.copy(toPhone(SW / 2, y0 + 360, ZL)); zm.material.color.setScalar(2.2); phone.add(zm);
  // corner posts linking layer to glass
  for (const [px, py] of [[0, y0], [SW, y0], [0, y0 + 720], [SW, y0 + 720]]) {
    const a = toPhone(px, py, 0), b = toPhone(px, py, ZL);
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), new THREE.LineDashedMaterial({ color: 0x59c7ff, dashSize: .08, gapSize: .06, toneMapped: false }));
    l.computeLineDistances(); phone.add(l);
  }
  // touch ring + pulse on the layer and on the glass
  for (const [z, r, k] of [[ZL + .01, .2, 3], [ZL + .01, .34, 1.4], [.02, .16, 2]]) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(r - .025, r, 64), glow(0xffffff, k)); ring.material.transparent = true; ring.material.opacity = .9;
    ring.position.copy(toPhone(touch.x, touch.y, z)); phone.add(ring);
  }
  const dot = new THREE.Mesh(new THREE.CircleGeometry(.09, 32), glow(0xffffff, 4)); dot.position.copy(toPhone(touch.x, touch.y, ZL + .02)); phone.add(dot);
  // beam from fingertip through layer to glass
  const a = toPhone(touch.x, touch.y, 0), b = toPhone(touch.x, touch.y, ZL + .9);
  const bm = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, b.z - a.z, 12, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8fe8ff).multiplyScalar(3), transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  bm.rotation.x = Math.PI / 2; bm.position.copy(a).add(b).multiplyScalar(.5); phone.add(bm);
}

// ---------- holographic thumb ----------
{
  const holo = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { c: { value: new THREE.Color(0x59c7ff) } },
    vertexShader: 'varying vec3 n; varying vec3 v; varying float y; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); n = normalize(normalMatrix*normal); v = normalize(-mv.xyz); y = position.y; gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 c; varying vec3 n; varying vec3 v; varying float y; void main(){ float f = pow(1.-abs(dot(n,v)),2.2); float scan = .55+.45*step(.5,fract(y*14.)); gl_FragColor = vec4(c*(f*1.5+.04)*scan, 1.); }'
  });
  const thumb = new THREE.Group();
  const seg1 = new THREE.Mesh(new THREE.CapsuleGeometry(.62, 1.5, 12, 32), holo); seg1.position.y = 1.05; thumb.add(seg1);
  const seg2 = new THREE.Mesh(new THREE.CapsuleGeometry(.7, 1.7, 12, 32), holo); seg2.position.set(0, 3.1, -.35); seg2.rotation.x = -.35; thumb.add(seg2);
  const nail = new THREE.Mesh(new THREE.CapsuleGeometry(.4, .55, 8, 24), holo); nail.scale.set(1, 1, .25); nail.position.set(0, 1.25, -.58); thumb.add(nail);
  // the thumb pad is the lowest point: place it just above the zone layer at the touch spot
  // thumb axis comes in from bottom-right, nail facing away from the screen
  const d = new THREE.Vector3(-.75, -1.3, .75).normalize(), up = new THREE.Vector3(0, 0, 1);
  const zA = up.clone().addScaledVector(d, -up.dot(d)).normalize().negate(), xA = new THREE.Vector3().crossVectors(d, zA);
  thumb.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xA, d, zA));
  thumb.scale.setScalar(.5); thumb.position.copy(toPhone(touch.x, touch.y, ZL + .3)).addScaledVector(d, .05);
  phone.add(thumb);
  // contact patch: shows the thumb covers several keys
  const patch = new THREE.Mesh(new THREE.CircleGeometry(.6, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x59c7ff).multiplyScalar(1.2), transparent: true, opacity: .16, depthWrite: false, toneMapped: false }));
  patch.scale.set(1, .8, 1); patch.position.copy(toPhone(touch.x, touch.y, ZL + .015)); phone.add(patch);
}

// ---------- HUD chips ----------
const chip = (l1, l2, w, h, pos, rotY) => {
  const [c, x] = cnv(w * 2, h * 2); x.scale(2, 2);
  x.fillStyle = 'rgba(4,16,40,.8)'; x.strokeStyle = '#46d6ff'; x.lineWidth = 3; x.beginPath(); x.roundRect(3, 3, w - 6, h - 6, 16); x.fill(); x.stroke();
  x.direction = 'rtl'; x.textAlign = 'right'; x.font = '700 32px A'; x.fillStyle = '#bfefff'; x.fillText(l1, w - 22, 48);
  x.font = '700 24px A'; x.fillStyle = '#6fb8ff'; x.fillText(l2, w - 22, 88);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w / 120, h / 120), new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, toneMapped: false, depthWrite: false }));
  m.position.copy(pos); m.rotation.y = rotY; S.add(m);
};
chip('الحرف الجاي: م', 'احتمال 92٪', 300, 112, new THREE.Vector3(1.6, -1.75, 3), -.25);
chip('منطقة اللمس', 'كبّرها الجوال لك', 300, 112, new THREE.Vector3(1.45, -5.95, 4.5), -.25);

// ---------- floor ----------
{
  const g = new THREE.GridHelper(40, 60, 0x1b5fbf, 0x0d2f66); g.position.y = -9; g.material.transparent = true; g.material.opacity = .3; S.add(g);
}

const comp = new EffectComposer(R);
comp.addPass(new RenderPass(S, cam));
comp.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), .55, .45, .8));
comp.addPass(new OutputPass());
comp.render();
window.__done = true;
