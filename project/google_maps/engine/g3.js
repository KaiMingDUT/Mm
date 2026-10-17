// KROZO 3D layer: a technical "blueprint city" built from the same WORLD as the 2D story.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const BG = new THREE.Color('#080B12');
scene.background = BG;
scene.fog = new THREE.FogExp2('#080B12', 0.00026);

const camera = new THREE.PerspectiveCamera(50, W / H, 2, 9000);
camera.setViewOffset(W, H, 0, 200, W, H);   // world target sits at screen y≈760 (subtitles live below)

scene.add(new THREE.HemisphereLight(0x3c6fb0, 0x080b12, 0.9));
const key = new THREE.DirectionalLight(0x9fd8ff, 1.1); key.position.set(-600, 900, 500); scene.add(key);
const rim = new THREE.DirectionalLight(0x168bff, 0.8); rim.position.set(700, 400, -900); scene.add(rim);

const X = x => x - 540, Z = y => y - 760;
const rnd = WORLD.rnd;

// ground
const ground = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshStandardMaterial({ color: '#0A0E16', roughness: 1 }));
ground.rotation.x = -Math.PI / 2; scene.add(ground);

// ribbon helper along the highway
function ribbon(u0, u1, off0, off1, y, step = 8) {
  const pos = [], idx = [];
  let n = 0;
  for (let u = u0; u <= u1 + .01; u += step) {
    const a = WORLD.at(Math.min(u, u1), off0), b = WORLD.at(Math.min(u, u1), off1);
    pos.push(X(a[0]), y, Z(a[1]), X(b[0]), y, Z(b[1]));
    if (n) idx.push(2 * n - 2, 2 * n - 1, 2 * n, 2 * n - 1, 2 * n + 1, 2 * n);
    n++;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const L = WORLD.L;
scene.add(new THREE.Mesh(ribbon(0, L, -37, 37, 2.0), new THREE.MeshStandardMaterial({ color: '#141B29', roughness: .85, metalness: .1, side: THREE.DoubleSide })));
const edgeMat = new THREE.MeshBasicMaterial({ color: '#56637A', side: THREE.DoubleSide });
scene.add(new THREE.Mesh(ribbon(0, L, -38.5, -35.5, 2.3), edgeMat));
scene.add(new THREE.Mesh(ribbon(0, L, 35.5, 38.5, 2.3), edgeMat));
// lane dashes
{
  const dash = new THREE.InstancedMesh(new THREE.BoxGeometry(1, .2, 1), new THREE.MeshBasicMaterial({ color: '#3D475A' }), 400);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  let i = 0;
  for (const off of [-12, 12]) for (let u = 10; u < L && i < 400; u += 34) {
    const a = WORLD.at(u, off);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a[2]);
    m.compose(p.set(X(a[0]), 2.4, Z(a[1])), q, s.set(14, 1, 1.6)); dash.setMatrixAt(i++, m);
  }
  dash.count = i; scene.add(dash);
}
// side streets
for (const [p, q] of WORLD.streets) {
  const dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy);
  const st = new THREE.Mesh(new THREE.PlaneGeometry(len, 13), new THREE.MeshStandardMaterial({ color: '#111725', roughness: 1 }));
  st.rotation.x = -Math.PI / 2; st.rotation.z = -Math.atan2(dy, dx);
  st.position.set(X((p[0] + q[0]) / 2), 1.0, Z((p[1] + q[1]) / 2)); scene.add(st);
}

// distance helpers for placing buildings
function distSeg(px, py, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], k = clamp(((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy));
  return Math.hypot(px - a[0] - k * dx, py - a[1] - k * dy);
}
const roadPts = []; for (let u = 0; u <= L; u += 10) roadPts.push(WORLD.at(u));
const distRoad = (x, y) => { let d = 1e9; for (const p of roadPts) d = Math.min(d, Math.hypot(x - p[0], y - p[1])); return d; };

// buildings: dark volumes + blueprint edges
{
  const boxes = [];
  let k = 0;
  for (let gx = -700; gx < 1800; gx += 44) for (let gy = -900; gy < 2300; gy += 44) {
    k++;
    const x = gx + (rnd(k) - .5) * 14, y = gy + (rnd(k + 7) - .5) * 14;
    const w = 22 + rnd(k + 3) * 18, d = 22 + rnd(k + 5) * 18;
    if (rnd(k + 11) < .18) continue;
    if (distRoad(x, y) < 37 + 26 + Math.max(w, d) / 2) continue;
    let ok = true;
    for (const [a, b] of WORLD.streets) if (distSeg(x, y, a, b) < 6.5 + Math.max(w, d) * .72 + 3) { ok = false; break; }
    if (!ok) continue;
    const far = Math.min(1, distRoad(x, y) / 600);
    const h = 18 + Math.pow(rnd(k + 13), 2.2) * (90 + 260 * far);
    boxes.push([x, y, w, d, h]);
  }
  const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, .5, 0);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: '#101726', roughness: .55, metalness: .45 }), boxes.length);
  const m = new THREE.Matrix4();
  boxes.forEach(([x, y, w, d, h], i) => { m.makeScale(w, h, d); m.setPosition(X(x), 0, Z(y)); mesh.setMatrixAt(i, m); });
  scene.add(mesh);
  // merged edges
  const e = new THREE.EdgesGeometry(geo), ep = e.attributes.position.array, all = new Float32Array(ep.length * boxes.length);
  boxes.forEach(([x, y, w, d, h], i) => {
    for (let j = 0; j < ep.length; j += 3) { all[i * ep.length + j] = X(x) + ep[j] * w; all[i * ep.length + j + 1] = ep[j + 1] * h + .2; all[i * ep.length + j + 2] = Z(y) + ep[j + 2] * d; }
  });
  const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(all, 3));
  scene.add(new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: '#2B4366', transparent: true, opacity: .55 })));
  // a few roof beacons (subtle, brand blue)
  const bc = boxes.filter((b, i) => b[4] > 160 && rnd(i + 900) < .35);
  const bm = new THREE.InstancedMesh(new THREE.SphereGeometry(2.2, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.55, 1.6), toneMapped: false }), bc.length);
  bc.forEach(([x, y, w, d, h], i) => { m.makeTranslation(X(x), h + 3, Z(y)); bm.setMatrixAt(i, m); });
  scene.add(bm);
}

// street lights along the highway (visible in the POV hook)
let streetPole, streetHead;
{
  const n = Math.floor(L / 80) * 2;
  const pole = new THREE.InstancedMesh(new THREE.BoxGeometry(1.4, 34, 1.4), new THREE.MeshStandardMaterial({ color: '#3A4458', roughness: .6 }), n);
  const head = new THREE.InstancedMesh(new THREE.SphereGeometry(2.6, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(.95, 1.05, 1.2), toneMapped: false }), n);
  const m = new THREE.Matrix4(); let i = 0;
  for (let u = 40; u < L; u += 80) for (const off of [-47, 47]) {
    const a = WORLD.at(u, off), b = WORLD.at(u, off * .8);
    m.makeTranslation(X(a[0]), 17, Z(a[1])); pole.setMatrixAt(i, m);
    m.makeTranslation(X(b[0]), 34, Z(b[1])); head.setMatrixAt(i, m); i++;
  }
  scene.add(pole, head); streetPole = pole; streetHead = head;
}

// traffic: glowing phones (additive, colour = brightness = alpha)
const MAXC = WORLD.cars.length + WORLD.sideCars.length;
const carMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(4.6, 12, 8), new THREE.MeshBasicMaterial({ blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), MAXC);
const tailMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 2.4, 3.2), new THREE.MeshBasicMaterial({ blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), MAXC);
carMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAXC * 3), 3);
tailMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAXC * 3), 3);
carMesh.frustumCulled = tailMesh.frustumCulled = false;
scene.add(carMesh, tailMesh);
const CY = new THREE.Color('#59C7FF');

// you
const youG = new THREE.Group();
const youCore = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 2, 2), toneMapped: false }));
const youRing = new THREE.Mesh(new THREE.TorusGeometry(1, .09, 8, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.6, 1.8), transparent: true, toneMapped: false }));
youRing.rotation.x = Math.PI / 2;
const youDisc = new THREE.Mesh(new THREE.CircleGeometry(15, 32), new THREE.MeshBasicMaterial({ color: '#168BFF', transparent: true, opacity: .35, depthWrite: false }));
youDisc.rotation.x = -Math.PI / 2;
youG.add(youCore, youRing, youDisc); scene.add(youG);

// single highlighted phone (the "one slow phone" beat)
const oneG = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 2, 2), toneMapped: false, transparent: true }));
scene.add(oneG);

// jam layer
const jamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.09, 0.55, 1.0), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
const jamCore = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 0.8, 2.0), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
const jamWide = new THREE.Mesh(ribbon(WORLD.ZONE[0], WORLD.ZONE[1], -46, 46, 3.0, 6), jamMat);
const jamLine = new THREE.Mesh(ribbon(WORLD.ZONE[0], WORLD.ZONE[1], -4, 4, 3.4, 6), jamCore);
scene.add(jamWide, jamLine);

// GPS position markers (rings on the ground)
const markG = [0, 1, 2].map(() => {
  const r = new THREE.Mesh(new THREE.RingGeometry(11, 14, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.78, 1.6), transparent: true, toneMapped: false, side: THREE.DoubleSide, depthWrite: false }));
  r.rotation.x = -Math.PI / 2; scene.add(r); return r;
});

// post
const composer = new EffectComposer(renderer);
composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.9, 0.55, 0.62);
composer.addPass(bloom);
composer.addPass(new OutputPass());

let state = null;
const v3 = new THREE.Vector3();
const G3 = {
  // map camera: target (2D world x,y), zoom, pitch(deg from horizon), yaw(deg)
  setMap(c) {
    const D = 2000 / c.z, p = (c.pitch ?? 58) * Math.PI / 180, y = (c.yaw ?? 0) * Math.PI / 180;
    const tx = X(c.x), tz = Z(c.y);
    camera.fov = 50; camera.updateProjectionMatrix();
    camera.position.set(tx + Math.sin(y) * D * Math.cos(p), D * Math.sin(p), tz + Math.cos(y) * D * Math.cos(p));
    camera.lookAt(tx, 0, tz);
    camera.updateMatrixWorld();
  },
  // drone shot that follows the highway from behind and above
  setPOV(u, sway = 0, h = 120) {
    const a = WORLD.at(u, sway), b = WORLD.at(u + 430, 0);
    camera.fov = 58; camera.updateProjectionMatrix();
    camera.position.set(X(a[0]), h, Z(a[1])); camera.lookAt(X(b[0]), 0, Z(b[1])); camera.updateMatrixWorld();
  },
  project(p, h = 0) {
    v3.set(X(p[0]), h, Z(p[1])).project(camera);
    return [(v3.x + 1) / 2 * W, (1 - v3.y) / 2 * H];
  },
  set(s) { state = s; },
  render(t) {
    const s = state; state = null;
    if (!s || s.opacity <= 0) { canvas.style.opacity = 0; return; }
    canvas.style.opacity = s.opacity;
    // cars
    const col = new THREE.Color(), m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
    let i = 0;
    const af = s.alphaFn || (() => 1), carK = s.cars ?? 1;
    for (const c of WORLD.cars) {
      if (c === WORLD.you && s.hideYou) continue;
      const { u, p } = WORLD.carPos(c, t);
      const al = (u < 2 || u > L - 2) ? 0 : af(p) * carK;
      const v = WORLD.carVel(c, t), tl = clamp(v * .22, 0, 46);
      m.compose(ps.set(X(p[0]), 5, Z(p[1])), q.identity(), sc.set(1, 1, 1)); carMesh.setMatrixAt(i, m);
      carMesh.setColorAt(i, col.copy(CY).multiplyScalar(1.5 * al));
      const b = WORLD.at(u - tl / 2, c.off);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -b[2]);
      m.compose(ps.set(X(b[0]), 5, Z(b[1])), q, sc.set(Math.max(tl, .01), 1, 1)); tailMesh.setMatrixAt(i, m);
      tailMesh.setColorAt(i, col.copy(CY).multiplyScalar(.45 * al * (tl > 3 ? 1 : 0)));
      i++;
    }
    for (const c of WORLD.sideCars) {
      const p = WORLD.sidePos(c, t), al = af(p) * carK * .6;
      m.compose(ps.set(X(p[0]), 4, Z(p[1])), q.identity(), sc.set(.75, .75, .75)); carMesh.setMatrixAt(i, m);
      carMesh.setColorAt(i, col.copy(CY).multiplyScalar(1.3 * al));
      tailMesh.setColorAt(i, col.setRGB(0, 0, 0)); tailMesh.setMatrixAt(i, m);
      i++;
    }
    carMesh.count = tailMesh.count = i;
    carMesh.instanceMatrix.needsUpdate = tailMesh.instanceMatrix.needsUpdate = true;
    carMesh.instanceColor.needsUpdate = tailMesh.instanceColor.needsUpdate = true;
    // you
    const yk = s.youK ?? 0;
    youG.visible = yk > 0.01;
    if (youG.visible) {
      const p = WORLD.carPos(WORLD.you, t).p, r = (t * 1.1) % 1;
      youG.position.set(X(p[0]), 6, Z(p[1]));
      youRing.scale.setScalar(16 + r * 40); youRing.material.opacity = (1 - r) * yk;
      youDisc.material.opacity = .35 * yk; youCore.scale.setScalar(Math.max(yk, .01));
    }
    // one phone
    oneG.visible = !!s.one;
    if (s.one) { oneG.position.set(X(s.one.p[0]), 6, Z(s.one.p[1])); oneG.material.opacity = s.one.k; }
    // jam
    const jk = s.jam ?? 0, pulse = .8 + .2 * Math.sin(t * 5);
    jamWide.visible = jamLine.visible = jk > 0.01;
    jamMat.opacity = .5 * jk * pulse; jamCore.opacity = jk;
    // markers
    markG.forEach((r, j) => {
      const mk = s.marks?.[j];
      r.visible = !!mk && mk.k > .01;
      if (r.visible) { r.position.set(X(mk.p[0]), 3.8, Z(mk.p[1])); r.material.opacity = mk.k; }
    });
    streetPole.visible = streetHead.visible = !!s.lights;
    bloom.strength = s.bloom ?? .9;
    composer.render();
  },
};
window.G3 = G3;
window.G3ready = true;
