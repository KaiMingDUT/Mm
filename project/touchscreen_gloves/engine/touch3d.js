// KROZO 3D layer: how a capacitive touchscreen sees a finger (illustrative, not a specific phone model).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#080B12');
scene.fog = new THREE.FogExp2('#080B12', 0.03);
const camera = new THREE.PerspectiveCamera(36, W / H, 0.05, 200);
camera.setViewOffset(W, H, 0, 160, W, H);

scene.add(new THREE.HemisphereLight(0xb8cff0, 0x080b12, 0.8));
const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(4, 9, 6); scene.add(key);
const rim = new THREE.DirectionalLight(0x59c7ff, 1.2); rim.position.set(-6, 4, -8); scene.add(rim);

const CY = new THREE.Color('#59C7FF'), BL = new THREE.Color('#168BFF');
const glowMat = (c, k = 1.4, extra = {}) => new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(k), toneMapped: false, transparent: true, ...extra });

// ───────── phone (flat on the table; screen faces +Y) ─────────
const PW = 3.2, PL = 6.6;
const phone = new THREE.Group(); scene.add(phone);
function roundedRect(w, l, r) {
  const s = new THREE.Shape(); const x = -w / 2, y = -l / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + l - r);
  s.quadraticCurveTo(x + w, y + l, x + w - r, y + l); s.lineTo(x + r, y + l); s.quadraticCurveTo(x, y + l, x, y + l - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
{
  const g = new THREE.ExtrudeGeometry(roundedRect(PW, PL, .45), { depth: .26, bevelEnabled: true, bevelSize: .05, bevelThickness: .05, bevelSegments: 3 });
  g.rotateX(-Math.PI / 2);
  phone.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: '#1A2130', metalness: .7, roughness: .35 })));
}
// display: UI icon grid drawn on a canvas texture
const uiCanvas = document.createElement('canvas'); uiCanvas.width = 512; uiCanvas.height = 1056;
const uiTex = new THREE.CanvasTexture(uiCanvas); uiTex.colorSpace = THREE.SRGBColorSpace;
const ICONS = [];
for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) ICONS.push({ c, r });
function drawUI(hi, k) {
  const x = uiCanvas.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 1056); g.addColorStop(0, '#0F1A2E'); g.addColorStop(1, '#0A0F1A');
  x.fillStyle = g; x.fillRect(0, 0, 512, 1056);
  ICONS.forEach((ic, i) => {
    const px = 40 + ic.c * 116, py = 120 + ic.r * 140;
    const on = i === hi ? k : 0;
    x.fillStyle = on > 0 ? `rgba(89,199,255,${.35 + .65 * on})` : (i % 3 === 0 ? '#1E3A66' : i % 3 === 1 ? '#22304A' : '#2A3446');
    x.beginPath(); x.roundRect(px, py, 84, 84, 22); x.fill();
    x.fillStyle = 'rgba(244,247,251,.35)'; x.fillRect(px + 14, py + 98, 56, 8);
  });
  uiTex.needsUpdate = true;
}
drawUI(-1, 0);
const display = new THREE.Mesh(new THREE.PlaneGeometry(PW - .2, PL - .2), new THREE.MeshBasicMaterial({ map: uiTex, transparent: true }));
display.rotation.x = -Math.PI / 2; display.position.y = .315; phone.add(display);
const iconPos = i => { const ic = ICONS[i]; return new THREE.Vector3(-(PW - .2) / 2 + (40 + ic.c * 116 + 42) / 512 * (PW - .2), .32, -(PL - .2) / 2 + (120 + ic.r * 140 + 42) / 1056 * (PL - .2)); };

// sensor grid (transparent electrodes: rows + columns)
const gridG = new THREE.Group(); phone.add(gridG);
const ROWS = 15, COLS = 7;
const rowZ = i => -PL / 2 + .45 + i * (PL - .9) / (ROWS - 1), colX = j => -PW / 2 + .35 + j * (PW - .7) / (COLS - 1);
const rowMat = glowMat(BL, .9, { opacity: 0 }), colMat = glowMat(CY, .75, { opacity: 0 });
for (let i = 0; i < ROWS; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(PW - .4, .012, .05), rowMat); m.position.set(0, 0, rowZ(i)); gridG.add(m); }
for (let j = 0; j < COLS; j++) { const m = new THREE.Mesh(new THREE.BoxGeometry(.05, .02, PL - .6), colMat); m.position.set(colX(j), .01, 0); gridG.add(m); }
const scanBar = new THREE.Mesh(new THREE.BoxGeometry(PW - .3, .02, .08), glowMat(CY, .9, { opacity: 0 }));
gridG.add(scanBar);
const cell = new THREE.Mesh(new THREE.PlaneGeometry(.55, .55), glowMat(CY, 1.6, { opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
cell.rotation.x = -Math.PI / 2; gridG.add(cell);

// cover glass
const glass = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedRect(PW - .06, PL - .06, .42), { depth: .06, bevelEnabled: false }),
  new THREE.MeshPhysicalMaterial({ color: '#9fc6ff', metalness: 0, roughness: .4, transmission: 0, transparent: true, opacity: .10, clearcoat: .1, depthWrite: false }));
glass.geometry.rotateX(-Math.PI / 2); phone.add(glass);
const glassEdge = new THREE.LineSegments(new THREE.EdgesGeometry(glass.geometry, 30), new THREE.LineBasicMaterial({ color: CY.clone().multiplyScalar(1.2), transparent: true, opacity: 0, toneMapped: false }));
phone.add(glassEdge);

// field "charge" dots along small arcs between neighbouring electrode crossings
const ARCS = [];
for (let i = 1; i < ROWS - 1; i++) for (let j = 0; j < COLS - 1; j++) ARCS.push({ a: [colX(j), rowZ(i)], b: [colX(j + 1), rowZ(i)] });
const DPA = 10, FN = ARCS.length * DPA;
const fGeo = new THREE.BufferGeometry(); const fPos = new Float32Array(FN * 3), fCol = new Float32Array(FN * 3);
fGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3)); fGeo.setAttribute('color', new THREE.BufferAttribute(fCol, 3));
const fMat = new THREE.PointsMaterial({ size: .05, vertexColors: true, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
const field = new THREE.Points(fGeo, fMat); field.frustumCulled = false; gridG.add(field);

// ripple on touch
const ripple = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 48), glowMat(CY, 1.6, { opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
ripple.rotation.x = -Math.PI / 2; scene.add(ripple);

// ───────── finger + gloves ─────────
const fingerG = new THREE.Group(); scene.add(fingerG);
const tilt = new THREE.Group(); tilt.rotation.x = -.42; fingerG.add(tilt);     // finger comes down towards the screen, tilted
const fGeoF = new THREE.CapsuleGeometry(.3, 2.6, 10, 24); fGeoF.translate(0, 1.6, 0);
const skin = new THREE.MeshPhysicalMaterial({ color: '#D9DFE8', roughness: .55, metalness: 0, sheen: .6, sheenColor: new THREE.Color('#9fd8ff'), transparent: true });
const finger = new THREE.Mesh(fGeoF, skin); tilt.add(finger);
const aura = new THREE.Mesh(new THREE.CapsuleGeometry(.4, 2.6, 8, 24).translate(0, 1.6, 0), glowMat(CY, 1.0, { opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide }));
tilt.add(aura);
// ions inside the finger (water + salts)
const ION = 70, iGeo = new THREE.BufferGeometry(), iPos = new Float32Array(ION * 3);
iGeo.setAttribute('position', new THREE.BufferAttribute(iPos, 3));
const iMat = new THREE.PointsMaterial({ color: new THREE.Color(.45, .85, 1.5), size: .07, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
const ions = new THREE.Points(iGeo, iMat); ions.frustumCulled = false; tilt.add(ions);
// knitted glove texture
function knitTex(conductive) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#4A5468'; x.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 32; r++) for (let k = 0; k < 16; k++) {
    x.fillStyle = (r + k) % 2 ? '#5A657B' : '#3E4759';
    x.beginPath(); x.ellipse(k * 16 + (r % 2) * 8 + 8, r * 8 + 4, 7, 4, .5, 0, 7); x.fill();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 6); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const gloveMat = new THREE.MeshStandardMaterial({ map: knitTex(), roughness: .95, metalness: 0, transparent: true });
const glove = new THREE.Mesh(new THREE.CapsuleGeometry(.4, 2.6, 10, 24).translate(0, 1.62, 0), gloveMat); tilt.add(glove);
const cuff = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .35, 32).translate(0, 3.1, 0), new THREE.MeshStandardMaterial({ color: '#2A3446', roughness: .9, transparent: true })); tilt.add(cuff);
// conductive fingertip (special gloves)
const tip = new THREE.Mesh(new THREE.SphereGeometry(.415, 32, 16, 0, Math.PI * 2, Math.PI * .5, Math.PI * .5), glowMat(CY, 1.25, { opacity: 0 }));
tip.position.y = .32; tilt.add(tip);

// insulating barrier (shown as a translucent slab between finger and glass)
const barrier = new THREE.Mesh(new THREE.CylinderGeometry(.65, .65, .14, 40), new THREE.MeshBasicMaterial({ color: '#A7B1C2', transparent: true, opacity: 0, depthWrite: false }));
scene.add(barrier);

const composer = new EffectComposer(renderer);
composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), .45, .4, .8); composer.addPass(bloom);
composer.addPass(new OutputPass());

let state = null;
const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const G3 = {
  set(s) { state = s; if (s) s.opacity = (s.opacity ?? 1) * (window.CUR_FADE ?? 1); },
  V: (x, y, z) => new THREE.Vector3(x, y, z),
  iconPos,
  project(v) { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; },
  render(t) {
    const s = state; state = null;
    if (!s || !(s.opacity > 0)) { canvas.style.opacity = 0; return; }
    canvas.style.opacity = s.opacity;
    const ex = s.explode ?? 0;                                   // exploded layers
    glass.position.y = .3 + ex * 1.5; glassEdge.position.y = glass.position.y; glass.material.opacity = .12 + .1 * ex; glassEdge.material.opacity = .25 + .6 * ex;
    gridG.position.y = .29 + ex * .75;
    const gk = s.grid ?? 0; rowMat.opacity = gk * .9; colMat.opacity = gk * .8;
    const sc = s.scan ?? 0; scanBar.material.opacity = sc * .9; scanBar.position.z = -PL / 2 + .4 + ((t * .8) % 1) * (PL - .8);
    drawUI(s.iconHi ?? -1, s.iconK ?? 0);
    display.material.opacity = s.ui ?? 1;
    // touch point
    const tp = s.touch || iconPos(9);
    // finger
    const f = s.finger || { k: 0 };
    fingerG.visible = (f.k ?? 0) > .01;
    if (fingerG.visible) {
      fingerG.position.set(tp.x, glass.position.y + .06 + (f.h ?? 0), tp.z);
      skin.opacity = f.k; finger.scale.setScalar(1);
      const gl = f.glove ?? 0, off = f.off ?? 0;           // glove: 0 none, 1 normal, 2 conductive; off = pulled off (0..1)
      glove.visible = cuff.visible = gl > 0 && off < .99;
      glove.position.y = cuff.position.y = off * 3.2; gloveMat.opacity = f.k * (1 - off); cuff.material.opacity = f.k * (1 - off);
      tip.material.opacity = gl === 2 ? f.k * (.75 + .25 * Math.sin(t * 6)) : 0;
      aura.material.opacity = (f.aura ?? 0) * (.25 + .1 * Math.sin(t * 5));
      iMat.opacity = f.ions ?? 0;
      if (iMat.opacity > 0) for (let i = 0; i < ION; i++) {
        const a = rnd(i) * 6.28 + t * (.6 + rnd(i + 3)), r = .22 * Math.sqrt(rnd(i + 7)), y = .1 + rnd(i + 11) * 2.8 + Math.sin(t * 2 + i) * .05;
        iPos[i * 3] = Math.cos(a) * r; iPos[i * 3 + 1] = y; iPos[i * 3 + 2] = Math.sin(a) * r;
      }
      iGeo.attributes.position.needsUpdate = true;
    }
    // field dots (couple = how much of the field the touching object pulls away)
    const fk = s.field ?? 0, cp = s.couple ?? 0;
    field.visible = fk > .01;
    if (field.visible) {
      let n = 0;
      for (const A of ARCS) {
        const mx = (A.a[0] + A.b[0]) / 2, mz = A.a[1], d = Math.hypot(mx - tp.x, mz - tp.z), near = Math.exp(-(d * d) / .35) * cp;
        for (let k = 0; k < DPA; k++) {
          const u = ((k / DPA) + t * .5) % 1, x = lerp(A.a[0], A.b[0], u);
          let y = .02 + Math.sin(u * Math.PI) * .22, z = mz;
          // near the finger the field lines bend upward into the fingertip
          y += near * Math.sin(u * Math.PI) * .9; const pull = near * Math.sin(u * Math.PI) * .6;
          fPos[n * 3] = lerp(x, tp.x, pull); fPos[n * 3 + 1] = y; fPos[n * 3 + 2] = lerp(z, tp.z, pull);
          const c = .35 + .9 * near; fCol[n * 3] = .2 * c * fk; fCol[n * 3 + 1] = .7 * c * fk; fCol[n * 3 + 2] = 1.3 * c * fk; n++;
        }
      }
      fGeo.attributes.position.needsUpdate = true; fGeo.attributes.color.needsUpdate = true;
    }
    // detected cell + ripple
    const ck = s.cell ?? 0; cell.material.opacity = ck * (.6 + .4 * Math.sin(t * 8)); cell.position.set(tp.x, .03, tp.z);
    const rk = s.ripple ?? 0; ripple.visible = rk > 0;
    if (ripple.visible) { const ph = (s.ripplePh ?? 0) % 1; ripple.position.set(tp.x, glass.position.y + .08, tp.z); ripple.scale.setScalar(.2 + ph * 1.4); ripple.material.opacity = rk * (1 - ph); }
    barrier.material.opacity = s.barrier ?? 0; barrier.position.set(tp.x, glass.position.y + .14 + (f.h ?? 0) * .5, tp.z);
    phone.position.y = s.press ? -.04 * s.press : 0;
    camera.fov = s.fov ?? 36; camera.updateProjectionMatrix();
    camera.position.copy(s.cam); camera.lookAt(s.look); camera.updateMatrixWorld();
    bloom.strength = (s.bloom ?? .7) * .45;
    composer.render();
  },
};
window.G3 = G3; window.THREE = THREE; window.G3ready = true;
