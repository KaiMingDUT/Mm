// Cover art: console reads a spinning disc with a laser; data voxels rise off the
// disc and assemble into a holographic game world. Text is added later by
// tools/cover/cover_title.mjs, so the top third is kept calm and dark.
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
cam.position.set(0, 4, 30); cam.lookAt(0, -1.6, 0);

// rng so the art is reproducible
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ---------- background: dark navy gradient, bokeh, light streaks ----------
{
  const c = document.createElement('canvas'); c.width = 540; c.height = 960; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 960);
  g.addColorStop(0, '#01040b'); g.addColorStop(.45, '#04122a'); g.addColorStop(.8, '#061a3a'); g.addColorStop(1, '#020812');
  x.fillStyle = g; x.fillRect(0, 0, 540, 960);
  const rg = x.createRadialGradient(270, 560, 10, 270, 560, 420);
  rg.addColorStop(0, 'rgba(30,120,255,.35)'); rg.addColorStop(1, 'rgba(30,120,255,0)');
  x.fillStyle = rg; x.fillRect(0, 0, 540, 960);
  for (let i = 0; i < 70; i++) {
    const px = rnd() * 540, py = 250 + rnd() * 700, r = 3 + rnd() * 16;
    const b = x.createRadialGradient(px, py, 0, px, py, r);
    const a = .08 + rnd() * .25;
    b.addColorStop(0, `rgba(80,170,255,${a})`); b.addColorStop(1, 'rgba(80,170,255,0)');
    x.fillStyle = b; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
  }
  // vertical light bars, like a server room behind
  for (let i = 0; i < 9; i++) {
    const px = rnd() * 540; x.fillStyle = `rgba(60,150,255,${.04 + rnd() * .07})`; x.fillRect(px, 0, 2 + rnd() * 10, 960);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; S.background = t;
}

// ---------- environment for reflections ----------
{
  const es = new THREE.Scene();
  const box = new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial({ color: 0x050b18, side: THREE.BackSide }));
  es.add(box);
  const strip = (col, x, y, z, w, h, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.y = ry; es.add(m); };
  strip(0x6fb8ff, 0, 12, 0, 20, 3, 0); es.children.at(-1).rotation.x = Math.PI / 2;
  strip(0x2a7fff, -12, 3, 0, 10, 8, Math.PI / 2);
  strip(0xffffff, 12, 5, -4, 6, 10, -Math.PI / 2);
  strip(0x33ddff, 0, 2, -14, 24, 2, 0);
  const pm = new THREE.PMREMGenerator(R); S.environment = pm.fromScene(es, 0.02).texture;
}

S.add(new THREE.AmbientLight(0x3355aa, 0.5));
const key = new THREE.DirectionalLight(0xbcd8ff, 2.2); key.position.set(-5, 9, 7); S.add(key);
const rim = new THREE.PointLight(0x2299ff, 60, 30); rim.position.set(4, 2, -3); S.add(rim);

// ---------- rounded slab helper ----------
const slab = (w, h, d, r) => {
  const s = new THREE.Shape(); const x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelSize: .08, bevelThickness: .08, bevelSegments: 6, curveSegments: 16 });
  g.rotateX(-Math.PI / 2); g.translate(0, -h / 2, 0); return g;
};

// ---------- console ----------
const consoleG = new THREE.Group(); S.add(consoleG);
consoleG.position.set(.4, -6.2, 0); consoleG.rotation.set(0.12, -0.32, 0); consoleG.scale.setScalar(1.18);
const gloss = new THREE.MeshPhysicalMaterial({ color: 0x0b0e14, metalness: .3, roughness: .18, clearcoat: 1, clearcoatRoughness: .05 });
const pearl = new THREE.MeshPhysicalMaterial({ color: 0x9aa6b8, metalness: .05, roughness: .3, clearcoat: 1, clearcoatRoughness: .1 });
const body = new THREE.Mesh(slab(6.4, .9, 3.6, .45), gloss); consoleG.add(body);
const lid = new THREE.Mesh(slab(6.0, .12, 3.2, .4), pearl); lid.position.y = .52; consoleG.add(lid);
// light strip along the front
const glow = (c, i = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), toneMapped: false });
const led = new THREE.Mesh(new THREE.BoxGeometry(5.6, .05, .05), glow(0x2ab8ff, 3)); led.position.set(0, -.05, 1.88); consoleG.add(led);
// disc slot / tray opening on the lid with laser lens
const tray = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, .05, 64), new THREE.MeshPhysicalMaterial({ color: 0x05070c, roughness: .4, metalness: .6 }));
tray.position.set(-.6, .6, 0); consoleG.add(tray);
const ringL = new THREE.Mesh(new THREE.TorusGeometry(1.27, .025, 8, 96), glow(0x3cc8ff, 2.5)); ringL.rotation.x = Math.PI / 2; ringL.position.set(-.6, .63, 0); consoleG.add(ringL);
const lens = new THREE.Mesh(new THREE.SphereGeometry(.09, 24, 16), glow(0xff3355, 4)); lens.position.set(-.05, .66, .15); consoleG.add(lens);
// buttons
for (let i = 0; i < 2; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .04, 32), glow(0x9ad8ff, 1.4)); b.position.set(2.3 + i * .45, .62, 1.0); consoleG.add(b); }

// ---------- disc ----------
const discTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 1024; const x = c.getContext('2d');
  const cg = x.createConicGradient(0, 512, 512);
  ['#9fe7ff', '#c9a6ff', '#ff9ad8', '#ffe39a', '#9affc7', '#7ac8ff', '#e0f4ff', '#a6b8ff', '#9fe7ff'].forEach((col, i, a) => cg.addColorStop(i / (a.length - 1), col));
  x.fillStyle = cg; x.fillRect(0, 0, 1024, 1024);
  // tracks
  for (let r = 160; r < 505; r += 2.2) { x.strokeStyle = `rgba(255,255,255,${.04 + Math.random() * .08})`; x.lineWidth = 1; x.beginPath(); x.arc(512, 512, r, 0, 7); x.stroke(); }
  x.fillStyle = 'rgba(220,235,255,.85)'; x.beginPath(); x.arc(512, 512, 150, 0, 7); x.fill();
  x.fillStyle = 'rgba(160,180,210,.9)'; x.beginPath(); x.arc(512, 512, 110, 0, 7); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
})();
const discG = new THREE.Group(); S.add(discG);
discG.position.set(-.1, -3.3, 1.6); discG.scale.setScalar(1.12); discG.rotation.set(.95, 0, -.28);
{
  const ring = new THREE.RingGeometry(.2, 1.9, 128, 1);
  // planar UVs for the ring
  const p = ring.attributes.position, uv = ring.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 3.8 + .5, p.getY(i) / 3.8 + .5);
  const top = new THREE.Mesh(ring, new THREE.MeshPhysicalMaterial({ map: discTex, emissiveMap: discTex, emissive: 0xffffff, emissiveIntensity: .38, metalness: .6, roughness: .14, iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [200, 900], side: THREE.DoubleSide, envMapIntensity: 1.6 }));
  top.rotation.x = -Math.PI / 2; discG.add(top);
  const edge = new THREE.Mesh(new THREE.TorusGeometry(1.9, .018, 8, 128), new THREE.MeshPhysicalMaterial({ color: 0xdfe8ff, metalness: 1, roughness: .2 }));
  edge.rotation.x = Math.PI / 2; discG.add(edge);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(1.98, .012, 8, 160), glow(0x5fd4ff, 2.2)); halo.rotation.x = Math.PI / 2; discG.add(halo);
}

// ---------- laser from the console lens to the disc underside ----------
const worldPos = o => o.getWorldPosition(new THREE.Vector3());
S.updateMatrixWorld(true);
const beam = (a, b, col, r) => {
  const d = b.clone().sub(a), L = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 12, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(3), transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  m.position.copy(a).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); S.add(m); return m;
};
const lp = worldPos(lens);
const hit = new THREE.Vector3(.9, 0, .4).applyMatrix4(discG.matrixWorld);
beam(lp, hit, 0xff2a4a, .028); beam(lp, hit, 0xff5a70, .09).material.opacity = .25;
const spark = new THREE.Mesh(new THREE.SphereGeometry(.11, 16, 12), glow(0xffe0e6, 5)); spark.position.copy(hit); S.add(spark);

// ---------- data voxels rising from the disc into a game world ----------
const vox = new THREE.InstancedMesh(new THREE.BoxGeometry(.12, .12, .12), new THREE.MeshBasicMaterial({ toneMapped: false }), 900);
const M = new THREE.Matrix4(), C = new THREE.Color(), Q = new THREE.Quaternion(), E = new THREE.Euler();
const discC = worldPos(discG);
let n = 0;
// stream: spiral from disc centre upwards, narrow → wide
for (let i = 0; i < 520; i++) {
  const t = rnd(), a = rnd() * Math.PI * 2, rad = .3 + t * 2.4 * (0.5 + rnd() * .6);
  const p = new THREE.Vector3(discC.x + Math.cos(a) * rad, discC.y + .3 + t * 2.3, discC.z + Math.sin(a) * rad * .6);
  const s = .35 + rnd() * (1 - t) * .9;
  E.set(rnd() * 3, rnd() * 3, rnd() * 3); Q.setFromEuler(E);
  M.compose(p, Q, new THREE.Vector3(s, s, s)); vox.setMatrixAt(n, M);
  C.set(rnd() < .15 ? 0xffffff : rnd() < .5 ? 0x46d6ff : 0x2a7dff).multiplyScalar(.8 + rnd() * 1.2); vox.setColorAt(n++, C);
}
vox.count = n; S.add(vox);

// holographic game world floating above (low-poly terrain + castle + hero)
const holo = new THREE.Group(); holo.position.set(0, -.75, -.6); holo.rotation.set(.32, -.25, 0); S.add(holo);
const hmat = (c, o = .9) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(.9), transparent: true, opacity: o * .7, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending });
{
  // terrain
  const tg = new THREE.PlaneGeometry(7, 4.2, 28, 16); tg.rotateX(-Math.PI / 2);
  const p = tg.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), edge = Math.max(Math.abs(x) / 3.5, Math.abs(z) / 2.1);
    const hill = Math.max(0, Math.sin(x * 1.3 + 1) * Math.cos(z * 1.7) * .7) + (edge > .75 ? (edge - .75) * 4 * (.6 + rnd() * .8) : 0);
    p.setY(i, hill);
  }
  tg.computeVertexNormals();
  holo.add(new THREE.Mesh(tg, hmat(0x0a3a7a, .55)));
  holo.add(new THREE.LineSegments(new THREE.WireframeGeometry(tg), new THREE.LineBasicMaterial({ color: new THREE.Color(0x3fc8ff).multiplyScalar(1.4), transparent: true, opacity: .55, toneMapped: false })));
  const edges = (g, c, o) => { const grp = new THREE.Group(); grp.add(new THREE.Mesh(g, hmat(c, o))); grp.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: new THREE.Color(0xaef0ff).multiplyScalar(2), toneMapped: false }))); return grp; };
  // castle
  const castle = new THREE.Group(); castle.position.set(1.7, 0, -.9); holo.add(castle);
  const keep = edges(new THREE.BoxGeometry(.9, 1.5, .9), 0x1a6cff, .35); keep.position.y = .75; castle.add(keep);
  for (const [x, z] of [[-.7, -.6], [.7, -.6], [-.7, .6], [.7, .6]]) {
    const t = edges(new THREE.CylinderGeometry(.22, .22, 1.2, 8), 0x1a6cff, .35); t.position.set(x, .6, z); castle.add(t);
    const r = edges(new THREE.ConeGeometry(.3, .5, 8), 0x46d6ff, .5); r.position.set(x, 1.45, z); castle.add(r);
  }
  const roof = edges(new THREE.ConeGeometry(.7, .8, 4), 0x46d6ff, .5); roof.position.y = 1.9; roof.rotation.y = Math.PI / 4; castle.add(roof);
  // trees
  for (let i = 0; i < 9; i++) {
    const t = edges(new THREE.ConeGeometry(.18, .55, 6), 0x2ee6b0, .45);
    t.position.set(-3 + rnd() * 2.6, .3, -1.6 + rnd() * 3.2); holo.add(t);
  }
  // hero: capsule body + head + sword
  const hero = new THREE.Group(); hero.position.set(-.4, .05, .6); holo.add(hero);
  const hb = edges(new THREE.CapsuleGeometry(.18, .45, 4, 10), 0xffffff, .5); hb.position.y = .45; hero.add(hb);
  const hh = edges(new THREE.SphereGeometry(.17, 12, 8), 0xffffff, .5); hh.position.y = .98; hero.add(hh);
  const sw = edges(new THREE.BoxGeometry(.05, .7, .05), 0x9fe9ff, .8); sw.position.set(.33, .7, 0); sw.rotation.z = -.5; hero.add(sw);
  // coins
  for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(new THREE.TorusGeometry(.12, .035, 8, 24), hmat(0xffd75a, 1)); c.position.set(.3 + i * .38, .9 + Math.sin(i) * .15, .9); holo.add(c); }
  // projector frame under the world
  const fr = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(7.2, .02, 4.4)), new THREE.LineBasicMaterial({ color: new THREE.Color(0x5fd4ff).multiplyScalar(2.5), toneMapped: false }));
  holo.add(fr);
}


// ---------- controller in the foreground ----------
{
  const s = new THREE.Shape();
  s.moveTo(-1.5, .75); s.bezierCurveTo(-.6, .95, .6, .95, 1.5, .75);
  s.bezierCurveTo(2.2, .6, 2.5, -.4, 2.45, -1.3); s.bezierCurveTo(2.4, -1.85, 1.75, -1.95, 1.55, -1.35);
  s.bezierCurveTo(1.35, -.8, 1.1, -.55, .6, -.55); s.lineTo(-.6, -.55);
  s.bezierCurveTo(-1.1, -.55, -1.35, -.8, -1.55, -1.35); s.bezierCurveTo(-1.75, -1.95, -2.4, -1.85, -2.45, -1.3);
  s.bezierCurveTo(-2.5, -.4, -2.2, .6, -1.5, .75);
  const g = new THREE.ExtrudeGeometry(s, { depth: .35, bevelEnabled: true, bevelSize: .14, bevelThickness: .16, bevelSegments: 8, curveSegments: 32 });
  const pad = new THREE.Group(); S.add(pad);
  pad.position.set(-1.5, -6.1, 9); pad.rotation.set(-.45, .4, .25); pad.scale.setScalar(.85);
  pad.add(new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: 0x10141c, metalness: .3, roughness: .25, clearcoat: 1, clearcoatRoughness: .08 })));
  const top = .52;
  const add = (m, x, y) => { m.position.set(x, y, top); pad.add(m); return m; };
  // light bar + touchpad
  add(new THREE.Mesh(new THREE.BoxGeometry(1.5, .9, .05), new THREE.MeshPhysicalMaterial({ color: 0x1a2130, roughness: .3, clearcoat: 1 })), 0, .2);
  add(new THREE.Mesh(new THREE.BoxGeometry(1.5, .04, .06), glow(0x2ab8ff, 3)), 0, .7);
  // sticks
  for (const x of [-.75, .75]) {
    const st = add(new THREE.Mesh(new THREE.CylinderGeometry(.3, .32, .2, 32), new THREE.MeshPhysicalMaterial({ color: 0x0a0d12, roughness: .6 })), x, -.55);
    st.rotation.x = Math.PI / 2;
    const rg = add(new THREE.Mesh(new THREE.TorusGeometry(.33, .02, 8, 48), glow(0x2a90ff, 1.6)), x, -.55);
  }
  // d-pad
  add(new THREE.Mesh(new THREE.BoxGeometry(.62, .2, .08), new THREE.MeshPhysicalMaterial({ color: 0x2a3140, roughness: .4 })), -1.6, .1);
  add(new THREE.Mesh(new THREE.BoxGeometry(.2, .62, .08), new THREE.MeshPhysicalMaterial({ color: 0x2a3140, roughness: .4 })), -1.6, .1);
  // face buttons with glowing symbols
  const sym = (fn, col, x, y) => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const k = c.getContext('2d');
    k.fillStyle = '#0d1118'; k.beginPath(); k.arc(64, 64, 62, 0, 7); k.fill();
    k.strokeStyle = col; k.lineWidth = 11; k.shadowColor = col; k.shadowBlur = 14; k.lineCap = 'round'; k.lineJoin = 'round'; fn(k); 
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const b = add(new THREE.Mesh(new THREE.CylinderGeometry(.19, .19, .08, 32), [new THREE.MeshPhysicalMaterial({ color: 0x0d1118 }), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }), new THREE.MeshBasicMaterial({ color: 0 })]), x, y);
    b.rotation.x = Math.PI / 2;
    b.material[1].color.setScalar(1.8);
  };
  sym(k => { k.beginPath(); k.moveTo(64, 30); k.lineTo(96, 86); k.lineTo(32, 86); k.closePath(); k.stroke(); }, '#3fffc0', 1.6, .55);
  sym(k => { k.beginPath(); k.arc(64, 64, 30, 0, 7); k.stroke(); }, '#ff4d6d', 2.05, .1);
  sym(k => { k.beginPath(); k.moveTo(38, 38); k.lineTo(90, 90); k.moveTo(90, 38); k.lineTo(38, 90); k.stroke(); }, '#5aa8ff', 1.6, -.35);
  sym(k => { k.strokeRect(36, 36, 56, 56); }, '#ff7ad9', 1.15, .1);
}

// ---------- HUD chips (canvas planes) ----------
const chip = (lines, w, h, pos, rotY) => {
  const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2; const x = c.getContext('2d'); x.scale(2, 2);
  x.fillStyle = 'rgba(4,16,40,.78)'; x.strokeStyle = '#46d6ff'; x.lineWidth = 3;
  x.beginPath(); x.roundRect(3, 3, w - 6, h - 6, 16); x.fill(); x.stroke();
  x.font = '700 30px monospace'; x.fillStyle = '#bfefff'; x.fillText(lines[0], 22, 46);
  x.font = '500 22px monospace'; x.fillStyle = '#6fb8ff'; x.fillText(lines[1], 22, 80);
  if (lines[2] != null) { x.fillStyle = 'rgba(70,214,255,.2)'; x.fillRect(22, 98, w - 44, 14); x.fillStyle = '#46d6ff'; x.fillRect(22, 98, (w - 44) * lines[2], 14); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w / 130, h / 130), new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, depthWrite: false }));
  m.position.copy(pos); m.rotation.y = rotY; S.add(m);
};
chip(['READING DISC', '650 MB · 0x7E3A…', .78], 330, 130, new THREE.Vector3(-3.3, -2.0, 2.2), .3);
chip(['LOADING WORLD', 'textures · audio · 3D', .52], 330, 130, new THREE.Vector3(3.3, -4.4, 2.4), -.3);

// ---------- floor glow + grid ----------
{
  const g = new THREE.GridHelper(40, 60, 0x1b5fbf, 0x0d2f66); g.position.y = -7.0; g.material.transparent = true; g.material.opacity = .35; S.add(g);
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  const rg = x.createRadialGradient(128, 128, 0, 128, 128, 128); rg.addColorStop(0, 'rgba(40,150,255,.55)'); rg.addColorStop(1, 'rgba(40,150,255,0)');
  x.fillStyle = rg; x.fillRect(0, 0, 256, 256);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = -6.98; pool.position.z = 1; S.add(pool);
}

// ---------- render ----------
const comp = new EffectComposer(R);
comp.addPass(new RenderPass(S, cam));
comp.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), .55, .45, .8));
comp.addPass(new OutputPass());
comp.render();
window.__done = true;
