// KROZO 3D layer for the Roadster explainer: illustrative car, wall ramp, fans, tanks, thrust.
// The car is a stylised illustration, not Tesla's exact design.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#080B12');
scene.fog = new THREE.FogExp2('#080B12', 0.012);
const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 600);
camera.setViewOffset(W, H, 0, 180, W, H);

scene.add(new THREE.HemisphereLight(0x9fbfe8, 0x080b12, 0.9));
const key = new THREE.DirectionalLight(0xffffff, 1.3); key.position.set(16, 16, 10); scene.add(key);
const key2 = new THREE.DirectionalLight(0xdfeaff, 0.9); key2.position.set(-16, 12, 8); scene.add(key2);
const rim = new THREE.DirectionalLight(0x168bff, 1.5); rim.position.set(10, 6, -12); scene.add(rim);
const fill = new THREE.PointLight(0x59c7ff, 40, 30); fill.position.set(0, -2, 6); scene.add(fill);

const CY = new THREE.Color('#59C7FF'), BL = new THREE.Color('#168BFF');
const glow = (c, k = 1.6) => new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(k), toneMapped: false });

// ───────────── ground grid ─────────────
const grid = new THREE.GridHelper(400, 200, 0x1b2a44, 0x111a2a);
grid.position.y = -0.01; scene.add(grid);

// ───────────── car (local: +Z forward, +Y up) ─────────────
function makeCar() {
  const g = new THREE.Group();
  const prof = [[-2.25, 0.32], [2.15, 0.32], [2.32, 0.42], [2.2, 0.55], [1.15, 0.78], [0.55, 0.9], [-0.25, 1.16], [-1.15, 1.1], [-1.75, 0.96], [-2.28, 0.78]];
  const sh = new THREE.Shape(); prof.forEach(([z, y], i) => i ? sh.lineTo(z, y) : sh.moveTo(z, y)); sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 1.86, bevelEnabled: true, bevelSize: 0.07, bevelThickness: 0.08, bevelSegments: 3, curveSegments: 4 });
  geo.translate(0, 0, -0.93); geo.rotateY(Math.PI / 2); // shape x -> world z (forward), depth -> world x
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: '#E9EDF3', metalness: 0.25, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.35, transparent: true });
  const body = new THREE.Mesh(geo, bodyMat); g.add(body);
  // canopy (dark glass)
  const cp = [[0.62, 0.86], [-0.25, 1.14], [-1.1, 1.08], [-1.2, 0.95], [0.4, 0.86]];
  const cs = new THREE.Shape(); cp.forEach(([z, y], i) => i ? cs.lineTo(z, y) : cs.moveTo(z, y)); cs.closePath();
  const cg = new THREE.ExtrudeGeometry(cs, { depth: 1.5, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 });
  cg.translate(0, 0.02, -0.75); cg.rotateY(Math.PI / 2);
  const glassMat = new THREE.MeshPhysicalMaterial({ color: '#0B1322', metalness: 0.6, roughness: 0.08, clearcoat: 1, transparent: true });
  g.add(new THREE.Mesh(cg, glassMat));
  // light bars
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.035, 0.04), glow(new THREE.Color('#F4F7FB'), 1.0)); head.position.set(0, 0.56, 2.24); g.add(head);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.04), glow(CY, 0.9)); tail.position.set(0, 0.8, -2.3); g.add(tail);
  // wheels
  const wheels = [];
  const wGeo = new THREE.CylinderGeometry(0.37, 0.37, 0.3, 32); wGeo.rotateZ(Math.PI / 2);
  const wMat = new THREE.MeshStandardMaterial({ color: '#0D1119', roughness: 0.6, metalness: 0.4, transparent: true });
  const rimGeo = new THREE.TorusGeometry(0.26, 0.02, 8, 40); rimGeo.rotateY(Math.PI / 2);
  for (const [x, z] of [[0.93, 1.4], [-0.93, 1.4], [0.93, -1.45], [-0.93, -1.45]]) {
    const w = new THREE.Group(); w.position.set(x, 0.37, z);
    w.add(new THREE.Mesh(wGeo, wMat));
    const r = new THREE.Mesh(rimGeo, glow(BL, 0.9)); r.position.x = Math.sign(x) * 0.16; w.add(r);
    g.add(w); wheels.push(w);
  }
  // x-ray edges
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), new THREE.LineBasicMaterial({ color: CY.clone().multiplyScalar(1.0), transparent: true, opacity: 0, toneMapped: false }));
  g.add(edges);
  // under-floor fans
  const fans = [];
  for (const z of [0.55, -0.75]) {
    const f = new THREE.Group(); f.position.set(0, 0.24, z);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.03, 8, 40), glow(CY, 1.6)); ring.rotation.x = Math.PI / 2; f.add(ring);
    for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.015, 0.1), new THREE.MeshBasicMaterial({ color: '#9fdcff', toneMapped: false })); b.position.x = 0.17; const p = new THREE.Group(); p.rotation.y = i * Math.PI / 3; p.add(b); f.add(p); }
    f.visible = false; g.add(f); fans.push(f);
  }
  // compressed-air tanks (two carbon-fibre pressure vessels)
  const tanks = [];
  for (const x of [0.42, -0.42]) {
    const tk = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.5, 8, 24), new THREE.MeshBasicMaterial({ color: BL.clone().multiplyScalar(1.3), transparent: true, opacity: 0, toneMapped: false }));
    tk.rotation.x = Math.PI / 2; tk.position.set(x, 0.62, -0.55); g.add(tk); tanks.push(tk);
  }
  // nozzles: 4 at the back + 6 around the body (positions illustrative)
  const nozzles = [];
  const nzPos = [[0.55, 0.45, -2.3], [0.2, 0.45, -2.3], [-0.2, 0.45, -2.3], [-0.55, 0.45, -2.3], [0.98, 0.35, 1.0], [-0.98, 0.35, 1.0], [0.98, 0.35, -1.0], [-0.98, 0.35, -1.0], [0.6, 0.3, 2.0], [-0.6, 0.3, 2.0]];
  for (const p of nzPos) { const n = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), glow(CY, 1.2)); n.position.set(...p); n.visible = false; g.add(n); nozzles.push(n); }
  // rear thrust plumes (4)
  const plumes = [];
  const pg = new THREE.ConeGeometry(0.16, 2.4, 20, 1, true); pg.translate(0, -1.2, 0); pg.rotateX(-Math.PI / 2);
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.32, 0.6, 1.1), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    m.position.copy(nozzles[i].position); m.position.z -= 0.02; m.rotation.y = Math.PI; g.add(m); plumes.push(m);
  }
  return { g, body, bodyMat, glassMat, wMat, edges, wheels, fans, tanks, nozzles, plumes };
}
const car = makeCar(); scene.add(car.g);
const ghosts = [makeCar(), makeCar()];          // "weight of two cars"
ghosts.forEach(gc => { gc.bodyMat.opacity = .0; gc.glassMat.opacity = 0; gc.wMat.opacity = 0; gc.g.visible = false; scene.add(gc.g); });

// ───────────── wall ramp (quarter-loop that ends nearly upside down) ─────────────
const R = 10.6;                                       // 2R ≈ 21 m at the top
const ramp = new THREE.Group(); scene.add(ramp);
const rampPt = th => new THREE.Vector3(0, R + R * Math.sin(th), R * Math.cos(th) + 0);
{
  const N = 120, w = 3.4, pos = [], idx = [];
  const ths = [];
  for (let i = 0; i <= N; i++) ths.push(-Math.PI / 2 + (i / N) * (Math.PI / 2 + 1.45));
  ths.forEach((th, i) => { const p = rampPt(th); pos.push(-w, p.y, p.z, w, p.y, p.z); if (i) idx.push(2 * i - 2, 2 * i - 1, 2 * i, 2 * i - 1, 2 * i + 1, 2 * i); });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  ramp.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: '#5E6675', roughness: 0.85, metalness: 0.1, side: THREE.DoubleSide })));
  for (const x of [-w, w]) {
    const pts = ths.map(th => { const p = rampPt(th); return new THREE.Vector3(x, p.y, p.z); });
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.09, 6), glow(new THREE.Color('#E04848'), 0.9));
    ramp.add(tube);
  }
  // centre line
  const cl = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ths.map(th => rampPt(th).add(new THREE.Vector3(0, 0, 0)).multiplyScalar(1))), 160, 0.04, 4), new THREE.MeshBasicMaterial({ color: '#C9D1DC' }));
  ramp.add(cl);
  // truss
  const tm = new THREE.LineBasicMaterial({ color: '#2A3446' }); const tp = [];
  for (let i = 0; i <= 24; i++) { const th = -Math.PI / 2 + (i / 24) * (Math.PI / 2 + 1.45); const p = rampPt(th); tp.push(-w - .3, p.y, p.z, -w - .3, 0, p.z + 6, w + .3, p.y, p.z, w + .3, 0, p.z + 6); }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3)); ramp.add(new THREE.LineSegments(tg, tm));
  // run-in road
  const road = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 60), new THREE.MeshStandardMaterial({ color: '#4C5462', roughness: .9 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0.01, -30); ramp.add(road);
}

// flat road for explanations (can be rotated to show "upside down")
const roadG = new THREE.Group(); scene.add(roadG);
{
  const road = new THREE.Mesh(new THREE.BoxGeometry(5, 0.12, 40), new THREE.MeshStandardMaterial({ color: '#3B4250', roughness: .9 }));
  road.position.y = -0.06; roadG.add(road);
  for (const x of [-2.5, 2.5]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.13, 40), glow(BL, 0.6)); e.position.set(x, -0.05, 0); roadG.add(e); }
}

// air-pressure arrows (above = outside pressure, below = reduced pressure)
function arrow(color, len) {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 8), new THREE.MeshBasicMaterial({ color, transparent: true, toneMapped: false }));
  shaft.position.y = len / 2 + 0.18; g.add(shaft);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.24, 12), new THREE.MeshBasicMaterial({ color, transparent: true, toneMapped: false }));
  tip.rotation.x = Math.PI; tip.position.y = 0.12; g.add(tip);
  return g;
}
const topArrows = [], botArrows = [];
for (let i = 0; i < 7; i++) { const a = arrow(CY.clone().multiplyScalar(1.1), 1.4); a.position.set(0, 1.35, -2.1 + i * 0.7); car.g.add(a); topArrows.push(a); }
for (let i = 0; i < 5; i++) { const a = arrow(new THREE.Color('#A7B1C2'), 0.6); a.rotation.z = Math.PI; a.position.set(0, -0.15, -1.4 + i * 0.7); car.g.add(a); botArrows.push(a); }
const setArrows = (list, k, pulse) => list.forEach((a, i) => { a.visible = k > 0.01; a.children.forEach(m => m.material.opacity = k); a.scale.y = 0.6 + 0.4 * k + 0.05 * Math.sin(pulse * 6 + i); });

// airflow / exhaust particles (additive points)
const PN = 900;
const pGeo = new THREE.BufferGeometry(); const pPos = new Float32Array(PN * 3); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const pMat = new THREE.PointsMaterial({ color: new THREE.Color(0.32, 0.6, 1.0), size: 0.06, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
const parts = new THREE.Points(pGeo, pMat); parts.frustumCulled = false; car.g.add(parts);
const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function particles(mode, t, k) {
  pMat.opacity = k; parts.visible = k > 0.01;
  if (!parts.visible) return;
  for (let i = 0; i < PN; i++) {
    const ph = (t * (mode === 'thrust' ? 1.8 : 0.9) + rnd(i)) % 1;
    let x, y, z;
    if (mode === 'suck') {            // air drawn from under the floor and blown out at the sides/back
      const side = rnd(i + 5) > .5 ? 1 : -1, zz = -1.9 + rnd(i + 9) * 3.8;
      if (ph < .5) { const q = ph / .5; x = side * (1.2 - q * 1.1); y = 0.12 + rnd(i + 3) * 0.12; z = zz; }
      else { const q = (ph - .5) / .5; x = side * (0.1 + q * 0.2); y = 0.2; z = zz - q * (zz + 2.6) - q * 2; }
    } else {                          // thrust: jets leaving the four rear nozzles, backwards
      const n = Math.floor(rnd(i + 1) * 4), np = car.nozzles[n].position;
      x = np.x + (rnd(i + 2) - .5) * 0.25 * ph; y = np.y + (rnd(i + 4) - .5) * 0.25 * ph; z = np.z - ph * 5.5;
    }
    pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z;
  }
  pGeo.attributes.position.needsUpdate = true;
}

const composer = new EffectComposer(renderer);
composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.4, 0.4, 0.85); composer.addPass(bloom);
composer.addPass(new OutputPass());

let state = null;
const tmpQ = new THREE.Quaternion();
const G3 = {
  set(s) { state = s; if (s) s.opacity = (s.opacity ?? 1) * (window.CUR_FADE ?? 1); },
  // car pose on the wall ramp: u = 0..1 along approach + loop
  rampPose(u) {
    const thMax = 1.396, Lap = 14;   // 1.396 rad -> pitch 170°, height ≈ 21 m (livestream telemetry)
    const arc = R * (Math.PI / 2 + thMax), total = Lap + arc, d = u * total;
    if (d < Lap) return { p: new THREE.Vector3(0, 0, -Lap + d), ang: 0, h: 0 };
    const th = -Math.PI / 2 + (d - Lap) / R;
    const p = rampPt(th); const ang = th + Math.PI / 2;   // pitch angle (rad) relative to ground
    // car sits on the inside surface: offset towards the centre
    const n = new THREE.Vector3(0, -Math.sin(th), -Math.cos(th)); p.add(n.multiplyScalar(0.0));
    return { p, ang, h: p.y };
  },
  render(t) {
    const s = state; state = null;
    if (!s || !(s.opacity > 0)) { canvas.style.opacity = 0; return; }
    canvas.style.opacity = s.opacity;
    ramp.visible = !!s.ramp; roadG.visible = !!s.road; grid.visible = s.grid !== false;
    // car pose
    car.g.visible = s.car !== false;
    if (s.pose) { car.g.position.copy(s.pose.p); car.g.quaternion.copy(s.pose.q); }
    car.wheels.forEach(w => w.rotation.x = (s.wheelSpin ?? 0));
    const xr = s.xray ?? 0;
    car.bodyMat.opacity = 1 - 0.85 * xr; car.glassMat.opacity = 1 - 0.85 * xr; car.wMat.opacity = 1 - 0.6 * xr;
    car.edges.material.opacity = xr;
    car.fans.forEach((f, i) => { f.visible = (s.fans ?? 0) > 0.01; f.rotation.y = t * 14 + i; f.scale.setScalar(Math.max(.01, s.fans ?? 0)); });
    car.tanks.forEach(tk => tk.material.opacity = (s.tanks ?? 0) * (0.75 + 0.25 * Math.sin(t * 5)));
    car.nozzles.forEach((n, i) => n.visible = (s.nozzles ?? 0) > i / 10);
    car.plumes.forEach((pl, i) => { pl.material.opacity = (s.thrust ?? 0) * (0.55 + 0.25 * Math.sin(t * 40 + i * 2)); pl.scale.set(1, 1, 0.7 + 0.5 * (s.thrust ?? 0) + 0.1 * Math.sin(t * 33 + i)); });
    setArrows(topArrows, s.topArrows ?? 0, t); setArrows(botArrows, s.botArrows ?? 0, t);
    particles(s.particles || 'suck', t, s.partK ?? 0);
    // ghost cars ("weight of two cars")
    ghosts.forEach((gc, i) => {
      const k = s.ghosts?.[i] ?? 0; gc.g.visible = k > 0.01;
      if (!gc.g.visible) return;
      gc.g.position.copy(car.g.position).add(new THREE.Vector3(0, 1.25 * (i + 1) + (1 - k) * 3, 0)); gc.g.quaternion.copy(car.g.quaternion);
      gc.bodyMat.opacity = 0.18 * k; gc.glassMat.opacity = 0.1 * k; gc.wMat.opacity = 0.1 * k; gc.edges.material.opacity = 0.9 * k;
    });
    roadG.rotation.z = s.roadRot ?? 0;
    // camera
    camera.fov = s.fov ?? 40; camera.updateProjectionMatrix();
    camera.position.copy(s.cam); camera.lookAt(s.look); camera.updateMatrixWorld();
    bloom.strength = (s.bloom ?? .7) * 0.5;
    composer.render();
  },
  V: (x, y, z) => new THREE.Vector3(x, y, z),
  Q: (ax, ay, az) => new THREE.Quaternion().setFromEuler(new THREE.Euler(ax, ay, az, 'YXZ')),
  qMul: (a, b) => a.clone().multiply(b),
  project(v) { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; },
};
window.G3 = G3; window.THREE = THREE;
window.G3ready = true;
