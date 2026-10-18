// KROZO — "ليه صورتك ما تفتح الآيفون؟" (Face ID) 3D world.
// Actors: scanned head (Lee Perry-Smith, Infinite-Realities, CC BY 3.0), a printed photo of the same head (rendered at load),
// a phone with a live Face ID screen, 30,000+ projected IR dots (on the face and on the photo), depth heat shader, wire mesh.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

await Promise.all(['700 150px PlexLatin', '600 40px PlexLatin', '500 36px PlexLatin', '700 32px Plex'].map(f => document.fonts.load(f)));
const RS = +(new URLSearchParams(location.search).get('rs') || 1);
const W = Math.round(1080 * RS), H = Math.round(1920 * RS);
const canvas = document.getElementById('gl');
canvas.style.width = '1080px'; canvas.style.height = '1920px';
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(30, W / H, .005, 50);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const COL = { bg: 0x080B12, blue: 0x168BFF, cyan: 0x59C7FF, ink: 0xF4F7FB, red: 0xFF453A, green: 0x30D158 };
const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const tex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function rshape(w, h, r) { const s = new THREE.Shape(), x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; }
function rndGen(s) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

const pm = new THREE.PMREMGenerator(renderer);
scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .45;

// ───────── backdrop: navy radial glow + faint dot grid (brand) ─────────
const backM = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  uniforms: { glow: { value: 1 }, tint: { value: new THREE.Color(COL.blue) } },
  vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; }',
  fragmentShader: `varying vec3 vD; uniform float glow; uniform vec3 tint;
    void main(){ vec3 d = normalize(vD); float c = max(dot(d, normalize(vec3(0.,.15,1.))), 0.);
      vec3 col = vec3(.03,.043,.07) + tint*pow(c, 3.)*.10*glow;
      vec2 g = abs(fract(vec2(atan(d.z,d.x), asin(d.y))*40.)-.5); col += vec3(.65,.7,.78)*.035*step(.45, max(g.x,g.y))*0.;
      gl_FragColor = vec4(col,1.); }`,
});
const back = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), backM); back.frustumCulled = false; back.renderOrder = -10; scene.add(back);
const key = new THREE.DirectionalLight(0xfff1e6, 1.1); key.position.set(.6, .8, 1.2); scene.add(key);
const rim = new THREE.DirectionalLight(0x59c7ff, 3.0); rim.position.set(-1.2, .5, -.6); scene.add(rim);
const rim2 = new THREE.DirectionalLight(0x168bff, 2.0); rim2.position.set(1.2, .2, -.8); scene.add(rim2);

// ───────── head ─────────
const tl = new THREE.TextureLoader();
const [gltf, colMap, nrmMap] = await Promise.all([
  new GLTFLoader().loadAsync('assets/LeePerrySmith.glb'), tl.loadAsync('assets/Map-COL.jpg'), tl.loadAsync('assets/Infinite-Level_02_Tangent_SmoothUV.jpg')]);
colMap.colorSpace = THREE.SRGBColorSpace;
let srcMesh; gltf.scene.traverse(o => { if (o.isMesh) srcMesh = o; });
const headGeo = srcMesh.geometry.clone();
headGeo.computeBoundingBox();
{ const b = headGeo.boundingBox, s = .25 / (b.max.y - b.min.y), c = b.getCenter(V(0, 0, 0)); headGeo.translate(-c.x, -c.y, -c.z); headGeo.scale(s, s, s); }
headGeo.computeBoundingBox(); headGeo.computeVertexNormals();
const skinM = new THREE.MeshPhysicalMaterial({ map: colMap, normalMap: nrmMap, normalScale: new THREE.Vector2(.8, .8), roughness: .55, sheen: .25, sheenRoughness: .6, sheenColor: new THREE.Color(0xffd8c8) });
const head = new THREE.Group(); scene.add(head);
const headMesh = new THREE.Mesh(headGeo, skinM); head.add(headMesh);
// depth heat: colour by distance to the projector (near = icy white/cyan, far = deep blue), with contour bands
const SRC = { value: V(0, 0, 1) };
const heatU = { src: SRC, nearD: { value: .28 }, farD: { value: .42 }, k: { value: 1 }, bands: { value: 1 }, flatC: { value: -1 } };
const heatFrag = `uniform vec3 src; uniform float nearD, farD, k, bands, flatC; varying vec3 vW; varying vec3 vN;
  vec3 pal(float x){ x = clamp(x,0.,1.); vec3 a = vec3(.92,.97,1.), b = vec3(.35,.78,1.), c = vec3(.09,.55,1.), d = vec3(.03,.1,.32);
    return x < .33 ? mix(a,b,x/.33) : x < .66 ? mix(b,c,(x-.33)/.33) : mix(c,d,(x-.66)/.34); }
  void main(){ float dd = distance(vW, src); float x = flatC >= 0. ? flatC : (dd-nearD)/(farD-nearD);
    vec3 col = pal(x); float band = smoothstep(.9,1.,abs(sin(dd*600.)))*.35*bands; col += band;
    float l = .55+.45*max(dot(normalize(vN), normalize(src-vW)),0.); gl_FragColor = vec4(col*l*k, 1.); }`;
const heatVert = 'varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; vN = mat3(modelMatrix)*normal; gl_Position = projectionMatrix*viewMatrix*w; }';
const heatM = new THREE.ShaderMaterial({ uniforms: heatU, vertexShader: heatVert, fragmentShader: heatFrag });
const irM = new THREE.MeshStandardMaterial({ map: colMap, normalMap: nrmMap, roughness: .7, color: 0xffffff });   // IR camera look (grade makes it mono)
const wireM = new THREE.MeshBasicMaterial({ color: COL.cyan, wireframe: true, transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
const headWire = new THREE.Mesh(headGeo, wireM); headWire.visible = false; head.add(headWire);
// landmarks (head-local): nose tip, eyes, chin, ears — derived from the geometry
const LM = (() => {
  const p = headGeo.attributes.position, n = p.count; let nose = V(0, 0, -9), chin = V(0, 9, 0), earL = V(0, 0, 0), earR = V(0, 0, 0);
  const bb = headGeo.boundingBox;
  for (let i = 0; i < n; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (Math.abs(x) < .012 && z > nose.z && y < bb.max.y - .08) nose.set(x, y, z);
    if (x < earL.x && Math.abs(y) < .03) earL.set(x, y, z);
    if (x > earR.x && Math.abs(y) < .03) earR.set(x, y, z);
  }
  for (let i = 0; i < n; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (Math.abs(x) < .01 && z > nose.z - .05 && y < chin.y && y > nose.y - .12) chin.set(x, y, z); }
  const eyeY = nose.y + .035; const eye = s => { let best = V(s * .032, eyeY, -9); for (let i = 0; i < n; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (Math.abs(x - s * .032) < .006 && Math.abs(y - eyeY) < .006 && z > best.z) best.set(x, y, z); } return best; };
  return { nose, chin, eyeL: eye(-1), eyeR: eye(1), earL, earR, top: V(0, bb.max.y, 0) };
})();

// ───────── photo of the same face (rendered once at load) ─────────
const photoRT = new THREE.WebGLRenderTarget(512, 640, { samples: 4 }); photoRT.texture.colorSpace = THREE.SRGBColorSpace;
{
  const ps = new THREE.Scene(); ps.background = new THREE.Color(0x5d6f86); ps.environment = scene.environment;
  const h2 = new THREE.Mesh(headGeo, skinM); ps.add(h2);
  const l1 = new THREE.DirectionalLight(0xffffff, 1.2); ps.environmentIntensity = .5; l1.position.set(.5, .6, 1); ps.add(l1);
  const pc = new THREE.PerspectiveCamera(22, 512 / 640, .01, 10); pc.position.set(0, .01, .78); pc.lookAt(0, .0, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.setRenderTarget(photoRT); renderer.render(ps, pc); renderer.setRenderTarget(null);
}
const photo = new THREE.Group(); scene.add(photo);
const PHW = .2, PHH = .25;
const paper = new THREE.Mesh(new THREE.BoxGeometry(PHW + .016, PHH + .016, .0012), new THREE.MeshStandardMaterial({ color: 0xbfc3c8, roughness: .8 })); photo.add(paper);
const print = new THREE.Mesh(new THREE.PlaneGeometry(PHW, PHH), new THREE.MeshBasicMaterial({ map: photoRT.texture, color: 0xdddddd })); print.position.z = .00062; photo.add(print);
const printHeat = new THREE.Mesh(new THREE.PlaneGeometry(PHW, PHH), new THREE.ShaderMaterial({ uniforms: heatU, vertexShader: heatVert, fragmentShader: heatFrag })); printHeat.position.z = .0007; printHeat.visible = false; photo.add(printHeat);

// ───────── IR dots ─────────
const DOT_N = 30000;
function samplePoints(geo, N, seed, filter) {
  const p = geo.attributes.position, idx = geo.index, tri = idx ? idx.count / 3 : p.count / 3, r = rndGen(seed);
  const A = V(0, 0, 0), B = V(0, 0, 0), C = V(0, 0, 0), cum = new Float32Array(tri); let tot = 0;
  const vi = (t, k) => idx ? idx.getX(t * 3 + k) : t * 3 + k;
  for (let t = 0; t < tri; t++) { A.fromBufferAttribute(p, vi(t, 0)); B.fromBufferAttribute(p, vi(t, 1)); C.fromBufferAttribute(p, vi(t, 2)); tot += B.clone().sub(A).cross(C.clone().sub(A)).length() / 2; cum[t] = tot; }
  const out = [], nrm = [];
  let guard = 0;
  while (out.length < N * 3 && guard++ < N * 20) {
    const x = r() * tot; let lo = 0, hi = tri - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < x) lo = m + 1; else hi = m; }
    A.fromBufferAttribute(p, vi(lo, 0)); B.fromBufferAttribute(p, vi(lo, 1)); C.fromBufferAttribute(p, vi(lo, 2));
    let u = r(), v = r(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const P = A.clone().addScaledVector(B.clone().sub(A), u).addScaledVector(C.clone().sub(A), v);
    const Nn = B.clone().sub(A).cross(C.clone().sub(A)).normalize();
    if (filter && !filter(P, Nn)) continue;
    out.push(P.x, P.y, P.z); nrm.push(Nn.x, Nn.y, Nn.z);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  const rr = new Float32Array(out.length / 3); for (let i = 0; i < rr.length; i++) rr[i] = r(); g.setAttribute('rnd', new THREE.BufferAttribute(rr, 1));
  return g;
}
const dotU = () => ({ src: SRC, t: { value: 0 }, reveal: { value: 9 }, size: { value: 1 }, heat: { value: 0 }, nearD: heatU.nearD, farD: heatU.farD, a: { value: 1 }, hi: { value: V(0, 0, -9) }, hiR: { value: 0 }, col: { value: new THREE.Color(COL.cyan) }, flatC: { value: -1 } });
const dotVert = `attribute float rnd; uniform vec3 src; uniform float t, reveal, size, heat, nearD, farD, flatC; uniform vec3 hi; uniform float hiR;
  varying float vA; varying float vX; varying float vH;
  void main(){ vec4 w = modelMatrix*vec4(position,1.); float d = distance(w.xyz, src);
    vA = smoothstep(reveal, reveal-.012, d); vX = flatC >= 0. ? flatC : (d-nearD)/(farD-nearD);
    vH = hiR > 0. ? smoothstep(hiR, hiR*.4, distance(w.xyz, hi)) : 0.;
    vec4 mv = viewMatrix*w; gl_Position = projectionMatrix*mv;
    gl_PointSize = size*(1.+vH*1.6)*(.9+.2*rnd)*${(H / 1920 * 2.2).toFixed(3)}/(-mv.z); }`;
const dotFrag = `uniform float heat, a; uniform vec3 col; varying float vA; varying float vX; varying float vH;
  vec3 pal(float x){ x = clamp(x,0.,1.); vec3 p0 = vec3(.92,.97,1.), p1 = vec3(.35,.78,1.), p2 = vec3(.09,.55,1.), p3 = vec3(.05,.18,.6);
    return x < .33 ? mix(p0,p1,x/.33) : x < .66 ? mix(p1,p2,(x-.33)/.33) : mix(p2,p3,(x-.66)/.34); }
  void main(){ vec2 q = gl_PointCoord-.5; float r = length(q); float m = smoothstep(.5,.15,r);
    vec3 c = mix(col, pal(vX), heat); c = mix(c, vec3(1.), vH*.7);
    gl_FragColor = vec4(c*m*vA*a*(1.+vH), 1.); }`;
const mkDots = (g) => new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: dotU(), vertexShader: dotVert, fragmentShader: dotFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
const faceDots = mkDots(samplePoints(headGeo, DOT_N, 3, (P, N) => N.z > .05 && P.z > -.02)); head.add(faceDots);
const photoDots = mkDots(samplePoints(new THREE.PlaneGeometry(PHW, PHH, 1, 1), 9000, 5)); photoDots.position.z = .001; photo.add(photoDots);
// beams from the projector to a subset of dots
const BEAM_N = 260;
const beamGeo = new THREE.BufferGeometry(); beamGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(BEAM_N * 6), 3));
const beamM = new THREE.LineBasicMaterial({ color: COL.cyan, transparent: true, opacity: .25, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
const beams = new THREE.LineSegments(beamGeo, beamM); beams.frustumCulled = false; scene.add(beams);
function setBeams(target, a) {
  beams.visible = a > .01; if (!beams.visible) return; beamM.opacity = .22 * a;
  const P = target.geometry.attributes.position, arr = beamGeo.attributes.position.array, step = Math.floor(P.count / BEAM_N), w = V(0, 0, 0);
  target.updateMatrixWorld(true);
  for (let i = 0; i < BEAM_N; i++) { w.fromBufferAttribute(P, i * step).applyMatrix4(target.matrixWorld); arr.set([SRC.value.x, SRC.value.y, SRC.value.z, w.x, w.y, w.z], i * 6); }
  beamGeo.attributes.position.needsUpdate = true;
}

// ───────── phone with a live Face ID screen ─────────
const PW = .0715, PH = .147, PD = .0078;
const phoneRig = new THREE.Group(); scene.add(phoneRig);
const phoneG = new THREE.Group(); phoneRig.add(phoneG);
const [uiC, ug] = cnv(720, 1480); const uiTex = tex(uiC);
{
  const bodyGeo = new THREE.ExtrudeGeometry(rshape(PW - .002, PH - .002, .0105), { depth: PD - .002, bevelEnabled: true, bevelThickness: .001, bevelSize: .001, bevelSegments: 4, curveSegments: 16 });
  bodyGeo.translate(0, 0, -(PD - .002) / 2);
  phoneG.add(new THREE.Mesh(bodyGeo, new THREE.MeshPhysicalMaterial({ color: 0x8b96a8, metalness: 1, roughness: .28 })));
  const back = new THREE.Mesh(new THREE.ShapeGeometry(rshape(PW - .003, PH - .003, .0098), 16), new THREE.MeshPhysicalMaterial({ color: 0x0d1a33, roughness: .35, clearcoat: 1 })); back.position.z = -PD / 2 - .0002; back.rotation.y = Math.PI; phoneG.add(back);
  const bump = new THREE.Mesh(new RoundedBoxGeometry(.031, .031, .0024, 4, .0011), new THREE.MeshPhysicalMaterial({ color: 0x122244, roughness: .2, clearcoat: 1 })); bump.position.set(-PW / 2 + .021, PH / 2 - .021, -PD / 2 - .001); phoneG.add(bump);
  const scrGeo = new THREE.ShapeGeometry(rshape(PW - .0042, PH - .0042, .0092), 16);
  { const p = scrGeo.attributes.position, uv = scrGeo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (PW - .0042) + .5, p.getY(i) / (PH - .0042) + .5); }
  const screen = new THREE.Mesh(scrGeo, new THREE.MeshBasicMaterial({ map: uiTex, toneMapped: false })); screen.position.z = PD / 2 + .0001; phoneG.add(screen);
  // TrueDepth module inside the island: dot projector, flood illuminator, IR camera
  const isl = new THREE.Mesh(new THREE.ShapeGeometry(rshape(.0175, .0052, .0026), 12), new THREE.MeshBasicMaterial({ color: 0x000000 })); isl.position.set(0, PH / 2 - .0072, PD / 2 + .0003); phoneG.add(isl);
  const lensM = c => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
  phoneG.userData.td = {};
  for (const [k, x, c, r] of [['ir', -.0055, 0x1a2a44, .0011], ['flood', -.0018, 0x2a1a22, .0008], ['proj', .0018, 0x3a1020, .0010], ['cam', .0058, 0x101826, .0013]]) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 20), lensM(c)); m.position.set(x, PH / 2 - .0072, PD / 2 + .0004); phoneG.add(m); phoneG.userData.td[k] = m;
  }
}
let uiKey = '';
function faceGlyph(g, cx, cy, s, col, lw = 10) {
  g.save(); g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round';
  const h = s / 2, c = s * .28;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { g.beginPath(); g.moveTo(cx + sx * h, cy + sy * (h - c)); g.lineTo(cx + sx * h, cy + sy * h - sy * 0 + 0); g.quadraticCurveTo(cx + sx * h, cy + sy * h, cx + sx * (h - c * .2), cy + sy * h); g.lineTo(cx + sx * (h - c), cy + sy * h); g.stroke(); }
  g.beginPath(); g.moveTo(cx - s * .16, cy - s * .12); g.lineTo(cx - s * .16, cy - s * .04); g.moveTo(cx + s * .16, cy - s * .12); g.lineTo(cx + s * .16, cy - s * .04);
  g.moveTo(cx, cy - s * .1); g.lineTo(cx, cy + s * .05); g.lineTo(cx - s * .05, cy + s * .05); g.stroke();
  g.beginPath(); g.arc(cx, cy + s * .08, s * .16, Math.PI * .2, Math.PI * .8); g.stroke(); g.restore();
}
function padlock(g, cx, cy, s, open, col) {
  g.save(); g.fillStyle = col; g.strokeStyle = col; g.lineWidth = s * .14;
  rrect(g, cx - s * .45, cy - s * .05, s * .9, s * .7, s * .12); g.fill();
  g.beginPath(); g.arc(cx + (open ? s * .32 : 0), cy - s * .05 - s * .02, s * .3, Math.PI, open ? Math.PI * 1.95 : 0); if (!open) g.lineTo(cx + s * .3, cy - s * .05); g.stroke(); g.restore();
}
// state: { mode:'lock'|'home', fid:'idle'|'scan'|'fail'|'ok', k (0..1 anim), shake, power }
function setUI(st) {
  const key = JSON.stringify(st); if (key === uiKey) return; uiKey = key;
  const g = ug, Wd = 720, Hd = 1480;
  const bgG = g.createLinearGradient(0, 0, Wd, Hd); bgG.addColorStop(0, '#0a1a3a'); bgG.addColorStop(.55, '#0c3a7a'); bgG.addColorStop(1, '#080B12');
  g.fillStyle = bgG; g.fillRect(0, 0, Wd, Hd);
  for (let i = 0; i < 7; i++) { g.strokeStyle = `rgba(89,199,255,${.08 + i * .02})`; g.lineWidth = 3; g.beginPath(); g.arc(360, 1500, 300 + i * 120, Math.PI, 2 * Math.PI); g.stroke(); }
  g.fillStyle = '#F4F7FB'; g.font = '600 40px PlexLatin'; g.textBaseline = 'middle'; g.fillText('9:41', 70, 70);
  for (let i = 0; i < 4; i++) { g.fillStyle = '#F4F7FB'; rrect(g, 498 + i * 13, 82 - (i + 1) * 9, 9, (i + 1) * 9, 2); g.fill(); }
  rrect(g, 575, 55, 62, 30, 9); g.strokeStyle = 'rgba(244,247,251,.7)'; g.lineWidth = 3; g.stroke(); rrect(g, 579, 59, 44, 22, 5); g.fillStyle = '#F4F7FB'; g.fill();
  const sx = (st.shake || 0) * 30;
  if (st.mode === 'home') {
    const cols = ['#168BFF', '#59C7FF', '#30D158', '#FF9F0A', '#FF453A', '#5E5CE6', '#64D2FF', '#FFD60A', '#BF5AF2', '#0A84FF', '#32D74B', '#FF375F'];
    for (let i = 0; i < 16; i++) { const x = 70 + (i % 4) * 150, y = 220 + Math.floor(i / 4) * 190; const k = Math.min(1, Math.max(0, (st.k || 1) * 1.6 - i * .03)); g.globalAlpha = k; rrect(g, x, y + (1 - k) * 40, 120, 120, 30); g.fillStyle = cols[i % cols.length]; g.fill(); g.globalAlpha = 1; }
    rrect(g, 40, 1260, 640, 150, 50); g.fillStyle = 'rgba(244,247,251,.16)'; g.fill();
  } else {
    const lockOpen = st.fid === 'ok';
    padlock(g, 360 + sx, 210, 70, lockOpen, st.fid === 'fail' ? '#FF453A' : '#F4F7FB');
    g.textAlign = 'center'; g.font = '500 36px PlexLatin'; g.fillStyle = 'rgba(244,247,251,.85)'; g.fillText('Tuesday, 17 October', 360, 330);
    g.font = '700 200px PlexLatin'; g.fillStyle = '#F4F7FB'; g.fillText('9:41', 360, 470);
    const fcol = st.fid === 'fail' ? '#FF453A' : st.fid === 'ok' ? '#30D158' : '#F4F7FB';
    if (st.fid && st.fid !== 'idle') {
      rrect(g, 230 + sx, 820, 260, 260, 60); g.fillStyle = 'rgba(8,11,18,.55)'; g.fill();
      if (st.fid === 'scan') { g.save(); g.translate(360, 950); g.rotate((st.k || 0) * 6.283); g.strokeStyle = '#59C7FF'; g.lineWidth = 10; g.beginPath(); g.arc(0, 0, 80, 0, 4.4); g.stroke(); g.restore(); }
      else if (st.fid === 'ok') { g.strokeStyle = fcol; g.lineWidth = 16; g.lineCap = 'round'; g.beginPath(); g.moveTo(305, 955); g.lineTo(345, 995); g.lineTo(420, 905); g.stroke(); }
      else faceGlyph(g, 360 + sx, 950, 150, fcol, 12);
      g.font = '600 34px PlexLatin'; g.fillStyle = fcol; g.fillText(st.fid === 'fail' ? 'Face Not Recognized' : st.fid === 'ok' ? 'Unlocked' : 'Face ID', 360 + sx, 1130);
    }
    g.textAlign = 'left';
  }
  if ((st.power ?? 1) < 1) { g.fillStyle = `rgba(0,0,0,${1 - st.power})`; g.fillRect(0, 0, Wd, Hd); }
  uiTex.needsUpdate = true;
}
function phoneAt(pos, rx = 0, ry = 0, rz = 0, s = 1) { phoneRig.visible = true; phoneRig.position.copy(pos); phoneRig.rotation.set(rx, ry, rz); phoneRig.scale.setScalar(s); phoneRig.updateMatrixWorld(true); SRC.value.copy(phoneG.userData.td.proj.getWorldPosition(V(0, 0, 0))); }
const phonePt = (u, v, lift = 0) => phoneG.localToWorld(V((u - .5) * PW, (.5 - v) * PH, PD / 2 + lift));

// ───────── post ─────────
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
composer.setPixelRatio(1); composer.setSize(W, H);
const rp = new RenderPass(scene, cam); composer.addPass(rp);
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), .5, .5, .8); composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, t: { value: 0 }, zb: { value: 0 }, ca: { value: .0015 }, vig: { value: .5 }, grain: { value: .04 }, flash: { value: 0 }, sat: { value: 1.05 }, mono: { value: 0 }, monoX: { value: -1 }, split: { value: 0 }, flashCol: { value: V(.85, .95, 1) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float t, zb, ca, vig, grain, flash, sat, mono, monoX, split; uniform vec3 flashCol; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec2 c = vec2(.5), d = vUv-c; vec3 col = vec3(0.); float n = zb > .001 ? 10. : 1.;
      for (float i = 0.; i < 10.; i++) { if (i >= n) break; float s = 1. - zb*i/10.*.12; vec2 q = c + d*s; float k = ca*(1.+zb*6.)*length(d)*2.;
        col += vec3(texture2D(tDiffuse, q + d*k).r, texture2D(tDiffuse, q).g, texture2D(tDiffuse, q - d*k).b); }
      col /= n;
      float l = dot(col, vec3(.299,.587,.114)); col = mix(vec3(l), col, sat);
      float m = monoX >= 0. ? step(monoX, vUv.x) * mono : mono;           // IR-camera look (mono, cool)
      col = mix(col, vec3(l*.85, l*.95, l*1.05), m);
      col *= 1. - vig*smoothstep(.35, 1.0, length(d*vec2(1.,.62))*1.6);
      col += (h(floor(vUv*vec2(1080.,1920.)) + fract(t*7.)*100.) - .5)*grain;
      if (split > 0.) { float e = smoothstep(.003,.0,abs(vUv.x-.5)); col = mix(col, vec3(.35,.78,1.), e*split); }
      col = mix(col, flashCol, flash);
      gl_FragColor = vec4(col, 1.); }`,
});
composer.addPass(grade);
// split-screen: render the scene twice into the left/right halves (each half is the centre of its own full view)
const origRender = rp.render.bind(rp);
let SPLIT = null;
rp.render = function (r, wb, rb, dt, mask) {
  if (!SPLIT) return origRender(r, wb, rb, dt, mask);
  const tgt = rb, half = W / 2;
  r.setRenderTarget(tgt); r.setClearColor(0x000000, 1); r.clear();
  for (const [i, fn] of SPLIT.entries()) {
    fn(); cam.setViewOffset(W, H, (W - half) / 2, 0, half, H); cam.updateProjectionMatrix();
    tgt.viewport.set(i * half, 0, half, H); tgt.scissor.set(i * half, 0, half, H); tgt.scissorTest = true;
    r.setRenderTarget(tgt); r.render(scene, cam);
  }
  tgt.viewport.set(0, 0, W, H); tgt.scissor.set(0, 0, W, H); tgt.scissorTest = false; cam.clearViewOffset();
};

// ───────── API ─────────
const dotsU = [faceDots.material.uniforms, photoDots.material.uniforms];
function reset() {
  head.visible = false; head.position.set(0, 0, 0); head.rotation.set(0, 0, 0); headMesh.material = skinM; headMesh.visible = true; headWire.visible = false; wireM.opacity = .35;
  photo.visible = false; photo.position.set(0, 0, 0); photo.rotation.set(0, 0, 0); print.visible = true; printHeat.visible = false;
  faceDots.visible = photoDots.visible = false; beams.visible = false;
  for (const u of dotsU) { u.reveal.value = 9; u.size.value = 1; u.heat.value = 0; u.a.value = 1; u.hiR.value = 0; u.flatC.value = -1; u.col.value.set(COL.cyan); }
  heatU.k.value = 1; heatU.flatC.value = -1; heatU.bands.value = 1;
  phoneRig.visible = false; SPLIT = null; backM.uniforms.glow.value = 1;
  cam.fov = 30; cam.near = .005; cam.up.set(0, 1, 0); cam.clearViewOffset();
  renderer.toneMappingExposure = 1; bloom.strength = .35; bloom.threshold = .92;
  const G = grade.uniforms; G.zb.value = 0; G.flash.value = 0; G.mono.value = 0; G.monoX.value = -1; G.split.value = 0; G.vig.value = .5; G.ca.value = .0015; G.sat.value = 1.05; G.flashCol.value.set(.85, .95, 1);
  key.intensity = 1.1; rim.intensity = 2.2; rim2.intensity = 1.4;
}
function autoHeat() {
  head.updateMatrixWorld(true); const w = v => head.localToWorld(v.clone());
  heatU.nearD.value = SRC.value.distanceTo(w(LM.nose)) - .005; heatU.farD.value = Math.max(SRC.value.distanceTo(w(LM.earL)), SRC.value.distanceTo(w(LM.earR)));
}
function lookCam(pos, look, fov = 30, roll = 0) { cam.position.copy(pos); cam.fov = fov; if (roll && roll.isVector3) cam.up.copy(roll); else cam.up.set(Math.sin(roll), Math.cos(roll), 0); cam.lookAt(look); cam.updateProjectionMatrix(); }
function project(v) { const p = v.clone().project(cam); return [(p.x * .5 + .5) * 1080, (-p.y * .5 + .5) * 1920, p.z < 1]; }
window.R3 = {
  THREE, V, scene, cam, head, headMesh, headWire, wireM, skinM, heatM, irM, photo, print, printHeat, faceDots, photoDots, dotsU, heatU, LM, SRC, phoneRig, phoneG, grade: grade.uniforms, bloom, back: backM.uniforms, key, rim, rim2, COL, PHW, PHH,
  reset, autoHeat, lookCam, project, setUI, phoneAt, phonePt, setBeams, split(fns) { SPLIT = fns; grade.uniforms.split.value = 1; },
};
window.G3 = {
  render(t) {
    const sh = (window.SHOTS || []).find(s => t >= s.s && t < s.e);
    canvas.style.opacity = sh ? 1 : 0;
    if (!sh) return;
    reset();
    grade.uniforms.t.value = t;
    for (const u of dotsU) u.t.value = t;
    sh.update(t - sh.s, t, sh);
    const lt = t - sh.s;
    if (sh.after) sh.after(lt, t, sh);
    for (const k of (window.KICKS || [])) if (t >= k && t < k + .22) { const q = 1 - (t - k) / .22; grade.uniforms.zb.value = Math.max(grade.uniforms.zb.value, .6 * q); cam.position.y += Math.sin((t - k) * 60) * .002 * q; cam.updateMatrixWorld(); }
    if (!sh.noPunch && sh.s > 0) grade.uniforms.zb.value = Math.max(grade.uniforms.zb.value, .9 * Math.max(0, 1 - lt / .16));
    composer.render();
  },
};
window.G3ready = true;
