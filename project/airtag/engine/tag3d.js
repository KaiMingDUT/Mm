// KROZO — "AirTag" 3D world.
// Stages: studio (product shots: tag, suitcase, phones), parts (exploded tag), globe (dotted Earth, flight arc, network),
// plan (holographic airport: lost bag, walkers, devices, Bluetooth range), sky (GPS satellites above a phone).
// timeline.js owns the shot list; every frame we reset, the active shot poses the world, then we render.
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import * as A from './assets3d.js';

await Promise.all(['700 92px PlexLatin', '500 30px PlexLatin', '700 40px Plex', '500 30px Plex'].map(f => document.fonts.load(f)));
const RS = +(new URLSearchParams(location.search).get('rs') || 1);
const W = Math.round(1080 * RS), H = Math.round(1920 * RS);
const canvas = document.getElementById('gl');
canvas.style.width = '1080px'; canvas.style.height = '1920px';
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(30, W / H, .001, 400);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const COL = { bg: 0x080B12, blue: 0x168BFF, cyan: 0x59C7FF, ink: 0xF4F7FB, gray: 0xA7B1C2 };
const rnd = A.rnd(5);
const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const tex = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// ───────── environments + shared textures ─────────
const pm = new THREE.PMREMGenerator(renderer);
const ENV = { studio: pm.fromScene(new RoomEnvironment(), .04).texture };
// product env: dark room + a few soft boxes (white top, blue left, cyan right) → classy reflections on the tag
{
  const es = new THREE.Scene(); es.background = new THREE.Color(0x020306);
  const box = (w, h, col, k, pos, look) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide })); m.position.copy(pos); m.lookAt(look); es.add(m); };
  box(4, 1.2, 0xffffff, 2.2, new THREE.Vector3(0, 4, 1), new THREE.Vector3(0, 0, 0));
  box(1, 5, 0x168bff, 2.5, new THREE.Vector3(-4, 1, -1), new THREE.Vector3(0, 0, 0));
  box(1, 5, 0x59c7ff, 1.6, new THREE.Vector3(4, 1, -1.5), new THREE.Vector3(0, 0, 0));
  box(3, .5, 0xffffff, .8, new THREE.Vector3(0, .6, 4), new THREE.Vector3(0, 0, 0));
  ENV.product = pm.fromScene(es, .02).texture;
}
{ const t = await new RGBELoader().loadAsync('assets/moonless_golf_1k.hdr'); ENV.night = pm.fromEquirectangular(t).texture; t.dispose(); }
const DOT = A.softDot();

// hologram material (fresnel rim + scan lines) — used for the airport, walkers and devices
function holo(col = COL.blue, rim = COL.cyan, k = 1) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    uniforms: { t: { value: 0 }, k: { value: k }, col: { value: new THREE.Color(col) }, rim: { value: new THREE.Color(rim) } },
    vertexShader: 'varying vec3 vN, vV, vW; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); vV = normalize(-mv.xyz); vW = (modelMatrix*vec4(position,1.)).xyz; gl_Position = projectionMatrix*mv; }',
    fragmentShader: `varying vec3 vN, vV, vW; uniform float t, k; uniform vec3 col, rim;
      void main(){ float f = pow(1.-abs(dot(normalize(vN), normalize(vV))), 2.);
        float lines = smoothstep(.9,1.,abs(sin(vW.y*14.+t*2.)))*.18;
        vec3 c = col*(.07+f*.7+lines) + rim*f*f*.8;
        gl_FragColor = vec4(c*k, 1.); }`,
  });
}
const HOLO = [];   // all holo materials (time uniform)
const mkHolo = (...a) => { const m = holo(...a); HOLO.push(m); return m; };

// ───────── signal rings + beams pools (camera-facing or oriented) ─────────
const ringGeo = new THREE.PlaneGeometry(1, 1), ringPool = [];
for (let i = 0; i < 160; i++) {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    uniforms: { col: { value: new THREE.Color() }, a: { value: 1 }, w: { value: .08 }, fill: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec2 vUv; uniform vec3 col; uniform float a, w, fill;
      void main(){ float r = length(vUv-.5)*2.; float d = abs(r-(1.-w));
        float m = smoothstep(w, 0., d) + exp(-d*18.)*.35 + fill*smoothstep(1.,.0,r)*.35;
        m *= smoothstep(1.,.97,r); gl_FragColor = vec4(col*m*a, 1.); }`,
  });
  const r = new THREE.Mesh(ringGeo, m); r.visible = false; r.frustumCulled = false; r.renderOrder = 6; scene.add(r); ringPool.push(r);
}
let ringN = 0;
function ring(pos, rad, col, a, o = {}) {
  if (ringN >= ringPool.length || a <= .002 || rad <= 0) return;
  const r = ringPool[ringN++]; r.visible = true; r.position.copy(pos); r.scale.set(rad * 2, rad * 2, 1);
  const u = r.material.uniforms; u.col.value.set(col); u.a.value = a; u.w.value = o.w ?? .05; u.fill.value = o.fill ?? 0;
  r.userData.face = o.face ?? 'cam';
  if (r.userData.face !== 'cam') r.quaternion.setFromUnitVectors(V(0, 0, 1), o.face === 'up' ? V(0, 1, 0) : o.face);
}
// periodic expanding rings; returns the radius of the newest ring (for hit tests)
function emit(pos, t, o = {}) {
  const per = o.per ?? .9, life = o.life ?? 1.8, R = o.R ?? 1, n = Math.ceil(life / per) + 1;
  for (let i = 0; i < n; i++) {
    const age = ((t - (o.ph ?? 0)) % per + per) % per + i * per; if (age > life || t - (o.ph ?? 0) - age < (o.from ?? -1e9)) continue;
    const k = age / life; ring(pos, R * (.05 + k), o.col ?? COL.cyan, (o.a ?? 1) * Math.pow(1 - k, 1.3) * Math.min(1, k * 10), o);
  }
}
const beamGeo = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true), beamPool = [];
for (let i = 0; i < 60; i++) {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    uniforms: { col: { value: new THREE.Color() }, a: { value: 1 }, t: { value: 0 }, n: { value: 6 }, grow: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec2 vUv; uniform vec3 col; uniform float a, t, n, grow;
      void main(){ float y = 1.-vUv.y; if (y > grow) discard; float p = .35 + .65*pow(.5+.5*sin((y*n - t)*6.2832), 6.);
        gl_FragColor = vec4(col*p*a, 1.); }`,
  });
  const b = new THREE.Mesh(beamGeo, m); b.visible = false; b.frustumCulled = false; b.renderOrder = 5; scene.add(b); beamPool.push(b);
}
let beamN = 0;
function beam(a, b, rad, col, al, o = {}) {
  if (beamN >= beamPool.length || al <= .002) return;
  const m = beamPool[beamN++]; m.visible = true; const d = b.clone().sub(a), len = d.length();
  m.position.copy(a).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); m.scale.set(rad, len, rad);
  const u = m.material.uniforms; u.col.value.set(col); u.a.value = al; u.t.value = o.t ?? 0; u.n.value = o.n ?? 6; u.grow.value = o.grow ?? 1;
}
// glowing sprites pool (packets, pins, node lights)
const sprPool = [];
for (let i = 0; i < 120; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: DOT, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); s.visible = false; s.renderOrder = 7; scene.add(s); sprPool.push(s); }
let sprN = 0;
function glow(pos, size, col, a = 1) { if (sprN >= sprPool.length || a <= .002) return; const s = sprPool[sprN++]; s.visible = true; s.position.copy(pos); s.scale.setScalar(size); s.material.color.set(col); s.material.opacity = a; }

// ═════════ actors ═════════
// ───────── AirTag (Ø31.9 mm × 8 mm; generic — no logo) ─────────
const TR = .01595;
const capProf = [[0, .0036], [.008, .00355], [.0125, .0033], [.0146, .0026], [.0157, .0014], [TR, .0004], [TR - .0002, 0]].map(([x, y]) => new THREE.Vector2(x, y));
const backProf = [[TR - .0002, 0], [TR - .0006, -.0011], [.0146, -.0021], [.0122, -.0033], [.008, -.0041], [0, -.0044]].map(([x, y]) => new THREE.Vector2(x, y));
const capM = new THREE.MeshPhysicalMaterial({ color: 0xe8ecf2, roughness: .28, clearcoat: .8, clearcoatRoughness: .1 });
const steelM = new THREE.MeshPhysicalMaterial({ color: 0xdde2e8, metalness: 1, roughness: .1, clearcoat: .4 });
function makeTag() {
  const g = new THREE.Group();
  const cap = new THREE.Mesh(new THREE.LatheGeometry(capProf, 96), capM); g.add(cap);
  const back = new THREE.Mesh(new THREE.LatheGeometry(backProf, 96), steelM); g.add(back);
  const seam = new THREE.Mesh(new THREE.TorusGeometry(TR - .0002, .00018, 8, 96), new THREE.MeshStandardMaterial({ color: 0x9aa4b2, metalness: .9, roughness: .3 })); seam.rotation.x = Math.PI / 2; g.add(seam);
  g.userData = { cap, back };
  return g;
}
const tag = makeTag(); scene.add(tag);
// tag glow (signal source marker)
const tagLight = new THREE.PointLight(0x59c7ff, 0, .25, 2); tag.add(tagLight);

// ───────── exploded tag parts ─────────
const parts = new THREE.Group(); scene.add(parts);
const PARTS = {};
{
  const capShell = new THREE.Mesh(new THREE.LatheGeometry(capProf, 96), capM); PARTS.cap = capShell;
  // speaker: magnet + coil ring
  const spk = new THREE.Group();
  spk.add(new THREE.Mesh(new THREE.CylinderGeometry(.0085, .0085, .0018, 64), new THREE.MeshPhysicalMaterial({ color: 0x3a4252, metalness: .9, roughness: .3 })));
  const coil = new THREE.Mesh(new THREE.TorusGeometry(.0105, .0011, 12, 64), new THREE.MeshPhysicalMaterial({ color: 0x9fb4cf, metalness: 1, roughness: .25 })); coil.rotation.x = Math.PI / 2; spk.add(coil);
  PARTS.spk = spk;
  // logic board (navy) + chips; the Bluetooth chip and antenna trace light up
  const pcb = new THREE.Group();
  pcb.add(new THREE.Mesh(new THREE.CylinderGeometry(.0142, .0142, .0008, 64), new THREE.MeshPhysicalMaterial({ color: 0x0d2747, roughness: .5, clearcoat: .6 })));
  const chipM = new THREE.MeshPhysicalMaterial({ color: 0x0b0e14, roughness: .35, clearcoat: .8 });
  const bt = new THREE.Mesh(new THREE.BoxGeometry(.006, .0009, .006), new THREE.MeshPhysicalMaterial({ color: 0x0b0e14, emissive: 0x59c7ff, emissiveIntensity: 0, roughness: .3 })); bt.position.set(-.0035, .0009, -.002); pcb.add(bt);
  const uwb = new THREE.Mesh(new THREE.BoxGeometry(.005, .0009, .004), chipM); uwb.position.set(.004, .0009, -.003); pcb.add(uwb);
  const fl = new THREE.Mesh(new THREE.BoxGeometry(.004, .0007, .0025), chipM); fl.position.set(.003, .0008, .0045); pcb.add(fl);
  for (let i = 0; i < 14; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(.0012, .0005, .0007), new THREE.MeshStandardMaterial({ color: 0xb8c2d0, metalness: .7, roughness: .4 })); const a = i / 14 * 6.28; c.position.set(Math.cos(a) * .0105, .0006, Math.sin(a) * .0105); c.rotation.y = -a; pcb.add(c); }
  const ant = new THREE.Mesh(new THREE.TorusGeometry(.0128, .00028, 6, 96, 5.2), new THREE.MeshStandardMaterial({ color: 0x9fb4cf, emissive: 0x59c7ff, emissiveIntensity: 0, metalness: .8, roughness: .3 })); ant.rotation.x = Math.PI / 2; ant.position.y = .00045; pcb.add(ant);
  PARTS.pcb = pcb; PARTS.bt = bt; PARTS.ant = ant;
  // CR2032 coin cell
  const [bc, bg] = cnv(512, 512); { const gr = bg.createRadialGradient(256, 256, 20, 256, 256, 256); gr.addColorStop(0, '#e9edf2'); gr.addColorStop(1, '#aab3bf'); bg.fillStyle = gr; bg.fillRect(0, 0, 512, 512); bg.fillStyle = '#3a4252'; bg.textAlign = 'center'; bg.font = '700 92px PlexLatin'; bg.fillText('CR2032', 256, 250); bg.font = '500 60px PlexLatin'; bg.fillText('3V  +', 256, 340); }
  const bat = new THREE.Mesh(new THREE.CylinderGeometry(.01, .01, .0032, 64), [new THREE.MeshPhysicalMaterial({ color: 0xc9d0da, metalness: 1, roughness: .2 }), new THREE.MeshPhysicalMaterial({ map: tex(bc), metalness: .8, roughness: .25 }), new THREE.MeshPhysicalMaterial({ color: 0xb8c0cc, metalness: 1, roughness: .25 })]);
  PARTS.bat = bat;
  const backPlate = new THREE.Mesh(new THREE.LatheGeometry(backProf, 96), steelM); PARTS.back = backPlate;
  for (const k of ['cap', 'spk', 'pcb', 'bat', 'back']) parts.add(PARTS[k]);
}
function setParts(e, rotY = 0, tilt = .35) {   // e = explode amount 0..1
  parts.visible = true; parts.rotation.set(tilt, rotY, 0);
  const gap = .0115 * e;
  PARTS.cap.position.y = 2 * gap + .0005; PARTS.spk.position.y = gap + .0002; PARTS.pcb.position.y = 0; PARTS.bat.position.y = -gap - .0012; PARTS.back.position.y = -2 * gap;
}
function partPos(k) { parts.updateMatrixWorld(true); return PARTS[k].getWorldPosition(V(0, 0, 0)); }

// ───────── suitcase (hard shell, navy; front half opens on a hinge) ─────────
const bag = new THREE.Group(); scene.add(bag);
const BAG = {};
{
  const shellM = new THREE.MeshPhysicalMaterial({ color: 0x15233b, roughness: .32, metalness: .2, clearcoat: 1, clearcoatRoughness: .12 });
  const liningM = new THREE.MeshStandardMaterial({ color: 0x0a1020, roughness: .9 });
  const bw = .40, bh = .62, bd = .24;
  const back = new THREE.Mesh(new RoundedBoxGeometry(bw, bh, bd / 2, 6, .035), shellM); back.position.z = -bd / 4; bag.add(back);
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(bw - .03, bh - .03), liningM); inner.position.z = .0005; bag.add(inner);
  const hinge = new THREE.Group(); hinge.position.set(-bw / 2, 0, 0); bag.add(hinge);
  const front = new THREE.Mesh(new RoundedBoxGeometry(bw, bh, bd / 2, 6, .035), shellM); front.position.set(bw / 2, 0, bd / 4); hinge.add(front);
  for (let i = 0; i < 4; i++) { const rib = new THREE.Mesh(new RoundedBoxGeometry(.018, bh * .86, .012, 2, .005), shellM); rib.position.set(bw / 2 - .12 + i * .08, 0, bd / 2 + .002); hinge.add(rib); }
  const zip = new THREE.Mesh(new THREE.BoxGeometry(bw + .004, .008, .006), new THREE.MeshStandardMaterial({ color: COL.blue, emissive: COL.blue, emissiveIntensity: .4 })); zip.position.set(0, bh / 2 + .001, 0); bag.add(zip);
  const zip2 = zip.clone(); zip2.position.y = -bh / 2 - .001; bag.add(zip2);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(.055, .011, 12, 32, Math.PI), new THREE.MeshStandardMaterial({ color: 0x0b0f17, roughness: .6 })); handle.position.set(0, bh / 2 + .01, 0); bag.add(handle);
  for (const [x, z] of [[-.15, -.07], [.15, -.07], [-.15, .07], [.15, .07]]) { const wl = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .02, 20), new THREE.MeshStandardMaterial({ color: 0x0b0f17, roughness: .6 })); wl.rotation.z = Math.PI / 2; wl.position.set(x, -bh / 2 - .03, z); bag.add(wl); }
  // inner pocket (where the tag goes)
  const pocket = new THREE.Mesh(new THREE.PlaneGeometry(.22, .14), new THREE.MeshStandardMaterial({ color: 0x14203a, roughness: .8 })); pocket.position.set(0, .12, .002); bag.add(pocket);
  BAG.hinge = hinge; BAG.w = bw; BAG.h = bh; BAG.d = bd;
  bag.traverse(o => { if (o.isMesh) o.userData.mat = o.material; });
}
const bagHoloM = mkHolo(COL.blue, COL.cyan, 1);
function bagHolo(on) { bag.traverse(o => { if (o.isMesh) o.material = on ? bagHoloM : o.userData.mat; }); }

// ───────── phones (generic, no logos) with live canvas UI ─────────
function makePhoneRig() { const p = A.makePhone(); const rig = new THREE.Group(); rig.add(p.group); scene.add(rig); return { rig, p, key: '' }; }
const phoneA = makePhoneRig(), phoneB = makePhoneRig();
const LON = { lat: 51.4700, lon: -0.4543 }, RUH = { lat: 24.9576, lon: 46.6988 };   // Heathrow · King Khalid Intl (illustrative cities)
function drawUI(P, st) {
  const k = JSON.stringify(st); if (k === P.key) return; P.key = k;
  const x = P.p.canvas.getContext('2d'), Wd = 590, Hd = 1278;
  if (st.mode === 'map') drawMap(x, Wd, Hd, st);
  else {
    const g = x.createLinearGradient(0, 0, Wd * .3, Hd); g.addColorStop(0, '#0B1630'); g.addColorStop(.5, '#080B12'); g.addColorStop(1, '#0A1A33'); x.fillStyle = g; x.fillRect(0, 0, Wd, Hd);
    for (let i = 0; i < 3; i++) { const px = Wd * [.2, .85, .5][i], py = Hd * [.2, .5, .9][i], r = x.createRadialGradient(px, py, 0, px, py, Wd * .7); r.addColorStop(0, ['rgba(22,139,255,.45)', 'rgba(89,199,255,.3)', 'rgba(22,139,255,.3)'][i]); r.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = r; x.fillRect(0, 0, Wd, Hd); }
    x.fillStyle = '#F4F7FB'; x.textAlign = 'center'; x.font = '700 150px PlexLatin'; x.fillText(st.time || '9:41', Wd / 2, 330);
    x.font = '500 30px PlexLatin'; x.fillStyle = 'rgba(244,247,251,.8)'; x.fillText(st.date || 'Saturday, October 18', Wd / 2, 160);
    if (st.relay) { x.fillStyle = `rgba(89,199,255,${.6 * st.relay})`; x.beginPath(); x.arc(Wd / 2, Hd - 120, 10, 0, 7); x.fill(); }
  }
  x.fillStyle = '#000'; rrect(x, Wd / 2 - 62, 22, 124, 36, 18); x.fill();
  P.p.tex.needsUpdate = true;
}
// Find-style map (generic): dark streets, the bag pin with a pulse, a bottom card
function drawMap(x, Wd, Hd, st) {
  x.fillStyle = '#0a1120'; x.fillRect(0, 0, Wd, Hd);
  const r = A.rnd(31);
  x.strokeStyle = 'rgba(89,199,255,.10)'; x.lineWidth = 2;
  for (let i = 0; i < 26; i++) { x.beginPath(); const y0 = r() * Hd; x.moveTo(0, y0); x.bezierCurveTo(Wd * .3, y0 + (r() - .5) * 300, Wd * .7, y0 + (r() - .5) * 300, Wd, y0 + (r() - .5) * 200); x.stroke(); }
  x.strokeStyle = 'rgba(167,177,194,.22)'; x.lineWidth = 9;
  for (let i = 0; i < 6; i++) { x.beginPath(); const y0 = 150 + i * 200; x.moveTo(-20, y0); x.lineTo(Wd + 20, y0 + 120 - i * 40); x.stroke(); }
  x.lineWidth = 7; for (let i = 0; i < 5; i++) { x.beginPath(); const x0 = 40 + i * 130; x.moveTo(x0, -20); x.lineTo(x0 + 80, Hd + 20); x.stroke(); }
  // runways (airport)
  x.save(); x.translate(Wd * .5, Hd * .42); x.rotate(-.2); x.fillStyle = 'rgba(167,177,194,.16)'; x.fillRect(-260, -90, 520, 34); x.fillRect(-260, 70, 520, 34); x.restore();
  const px = Wd * .5, py = Hd * .42, k = st.pin ?? 1;
  if (k > 0) {
    for (let i = 0; i < 3; i++) { const q = ((st.pulse ?? 0) + i / 3) % 1; x.strokeStyle = `rgba(89,199,255,${(1 - q) * .8 * k})`; x.lineWidth = 4; x.beginPath(); x.arc(px, py, 30 + q * 150, 0, 7); x.stroke(); }
    x.save(); x.translate(px, py - 60 * (1 - Math.min(1, k * 1.2))); x.globalAlpha = Math.min(1, k * 2);
    x.fillStyle = '#168BFF'; x.beginPath(); x.arc(0, -46, 46, 0, 7); x.fill(); x.beginPath(); x.moveTo(-26, -14); x.lineTo(0, 22); x.lineTo(26, -14); x.fill();
    // suitcase glyph
    x.fillStyle = '#F4F7FB'; rrect(x, -20, -66, 40, 34, 6); x.fill(); x.fillRect(-8, -74, 16, 8); x.restore();
  }
  // bottom card
  x.fillStyle = 'rgba(14,20,34,.96)'; rrect(x, 20, Hd - 300, Wd - 40, 270, 34); x.fill();
  x.fillStyle = '#F4F7FB'; x.textAlign = 'right'; x.font = '700 40px Plex'; x.fillText(st.title || 'شنطتي', Wd - 60, Hd - 225);
  x.fillStyle = '#A7B1C2'; x.font = '500 28px Plex'; x.fillText(st.sub || 'مطار هيثرو · لندن', Wd - 60, Hd - 175);
  x.fillStyle = '#59C7FF'; x.fillText(st.when || 'آخر ظهور: الآن', Wd - 60, Hd - 130);
  x.fillStyle = '#168BFF'; rrect(x, 50, Hd - 110, Wd - 100, 62, 18); x.fill(); x.fillStyle = '#F4F7FB'; x.textAlign = 'center'; x.font = '700 30px Plex'; x.fillText('الاتجاهات', Wd / 2, Hd - 68);
}

// ───────── holographic walker (stylised person) ─────────
function makeWalker(col) {
  const m = mkHolo(col, COL.cyan, 1), g = new THREE.Group(), P = {};
  const cap = (r, l) => new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 6, 16), m);
  P.head = new THREE.Mesh(new THREE.SphereGeometry(.11, 24, 16), m); P.head.position.y = 1.62;
  P.torso = cap(.17, .42); P.torso.position.y = 1.2; P.torso.scale.set(1, 1, .65);
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(.09 * s, .9, 0); const leg = cap(.07, .7); leg.position.y = -.42; hip.add(leg); g.add(hip); P['hip' + s] = hip;
    const sh = new THREE.Group(); sh.position.set(.23 * s, 1.42, 0); const arm = cap(.055, .5); arm.position.y = -.3; sh.add(arm); g.add(sh); P['sh' + s] = sh;
  }
  g.add(P.head, P.torso);
  // phone in the right hand (lights up when it hears the tag)
  const ph = new THREE.Mesh(new THREE.BoxGeometry(.075, .15, .01), new THREE.MeshBasicMaterial({ color: 0x59c7ff, toneMapped: false, transparent: true }));
  ph.position.set(0, -.62, .08); P.sh1.add(ph); P.phone = ph;
  g.userData = P; scene.add(g); return g;
}
function walk(wk, pos, heading, phase, o = {}) {
  const P = wk.userData; wk.visible = true; wk.position.copy(pos); wk.rotation.y = heading; wk.scale.setScalar(o.scale ?? 1);
  const s = Math.sin(phase), amp = o.amp ?? .45;
  P['hip-1'].rotation.x = s * amp; P.hip1.rotation.x = -s * amp; P['sh-1'].rotation.x = -s * amp * .8;
  P.sh1.rotation.x = o.phoneUp ? -1.1 : s * amp * .8; P.phone.visible = o.phone !== false;
  P.phone.material.opacity = .35 + .65 * (o.lit ?? 0); P.phone.material.color.set(o.lit ? 0x9fe1ff : 0x2a6fd6);
  wk.position.y += Math.abs(Math.cos(phase)) * .03;
}
const walkers = [makeWalker(COL.blue), makeWalker(0x6f7f99), makeWalker(0x6f7f99), makeWalker(0x6f7f99)];

// ───────── holo devices (iPhone / tablet / laptop — generic) ─────────
const devices = new THREE.Group(); scene.add(devices);
const DEV = [];
{
  const mkDev = (kind) => {
    const g = new THREE.Group(), m = mkHolo(0x2a4a78, COL.cyan, .9), scr = new THREE.MeshBasicMaterial({ color: 0x59c7ff, transparent: true, opacity: .15, toneMapped: false, side: THREE.DoubleSide });
    if (kind === 'phone') { g.add(new THREE.Mesh(new RoundedBoxGeometry(.075, .15, .009, 3, .008), m)); const s = new THREE.Mesh(new THREE.PlaneGeometry(.066, .14), scr); s.position.z = .006; g.add(s); }
    if (kind === 'tab') { g.add(new THREE.Mesh(new RoundedBoxGeometry(.18, .25, .007, 3, .01), m)); const s = new THREE.Mesh(new THREE.PlaneGeometry(.165, .235), scr); s.position.z = .005; g.add(s); }
    if (kind === 'lap') { const b = new THREE.Mesh(new RoundedBoxGeometry(.3, .012, .21, 3, .005), m); g.add(b); const lid = new THREE.Group(); lid.position.set(0, .006, -.105); const l = new THREE.Mesh(new RoundedBoxGeometry(.3, .2, .006, 3, .005), m); l.position.y = .1; lid.add(l); const s = new THREE.Mesh(new PlaneGeometryFix(.28, .18), scr); s.position.set(0, .1, .004); lid.add(s); lid.rotation.x = -.25; g.add(lid); }
    g.userData = { scr, m }; devices.add(g); DEV.push(g); return g;
  };
  function PlaneGeometryFix(w, h) { return new THREE.PlaneGeometry(w, h); }
  for (const k of ['phone', 'tab', 'lap', 'phone', 'phone', 'lap']) mkDev(k);
}

// ═════════ stages ═════════
// studio (product): navy dome, glossy dark floor, blue/cyan rims
const studio = new THREE.Group(); scene.add(studio);
const studioBg = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, uniforms: { c1: { value: new THREE.Color(0x0e2546) }, c2: { value: new THREE.Color(0x020306) }, spot: { value: new THREE.Vector2(0, .15) } },
  vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: 'varying vec3 vP; uniform vec3 c1, c2; uniform vec2 spot; void main(){ float s = pow(max(0., 1.-length(vP.xy-spot)*1.1), 2.); gl_FragColor = vec4(mix(c2, c1, s*.9), 1.); }',
});
{
  studio.add(new THREE.Mesh(new THREE.SphereGeometry(20, 48, 24), studioBg));
  const floor = new THREE.Mesh(new THREE.CircleGeometry(10, 64), new THREE.MeshBasicMaterial({ color: 0x03050a }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.09; studio.add(floor); studio.userData.floor = floor;
  const r1 = new THREE.SpotLight(0x168bff, 30, 8, .5, .6, 2); r1.position.set(-.8, .6, -.6);
  const r2 = new THREE.SpotLight(0x59c7ff, 16, 8, .5, .6, 2); r2.position.set(.8, .4, -.5);
  const k = new THREE.DirectionalLight(0xffffff, 1.0); k.position.set(.4, .8, 1);
  studio.add(r1, r2, k, new THREE.AmbientLight(0x404a60, .4)); studio.userData = Object.assign(studio.userData, { r1, r2, k });
}
// sweep light (hero reveal)
const sweep = new THREE.SpotLight(0xffffff, 0, 3, .25, .8, 2); scene.add(sweep, sweep.target);

// globe (units: Earth radius = 1)
const globe = new THREE.Group(); scene.add(globe);
const earth = new THREE.Group(); globe.add(earth);
function ll(lat, lon, r = 1) { const p = lat * Math.PI / 180, l = lon * Math.PI / 180; return V(r * Math.cos(p) * Math.sin(l), r * Math.sin(p), r * Math.cos(p) * Math.cos(l)); }
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
  // graticule
  const gm = new THREE.LineBasicMaterial({ color: 0x168bff, transparent: true, opacity: .12 });
  for (let la = -60; la <= 60; la += 30) { const pts = []; for (let lo = -180; lo <= 180; lo += 4) pts.push(ll(la, lo, 1.001)); earth.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gm)); }
  for (let lo = -180; lo < 180; lo += 30) { const pts = []; for (let la = -90; la <= 90; la += 4) pts.push(ll(la, lo, 1.001)); earth.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gm)); }
  // dotted land from Natural Earth (world-atlas, ISC) rasterised to an equirect mask
  const topo = await (await fetch('assets/land-50m.json')).json();
  const land = topojson.feature(topo, topo.objects.land);
  const [mc, mg] = cnv(2048, 1024); mg.fillStyle = '#000'; mg.fillRect(0, 0, 2048, 1024); mg.fillStyle = '#fff';
  const X = lo => (lo + 180) / 360 * 2048, Y = la => (90 - la) / 180 * 1024;
  for (const f of land.features) { const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const poly of polys) { mg.beginPath(); for (const ringC of poly) { ringC.forEach(([lo, la], i) => i ? mg.lineTo(X(lo), Y(la)) : mg.moveTo(X(lo), Y(la))); mg.closePath(); } mg.fill('evenodd'); } }
  const md = mg.getImageData(0, 0, 2048, 1024).data;
  const pos = [];
  for (let la = -84; la <= 84; la += .9) { const n = Math.max(1, Math.round(400 * Math.cos(la * Math.PI / 180))); for (let i = 0; i < n; i++) { const lo = -180 + 360 * i / n; if (md[(Math.floor(Y(la)) * 2048 + Math.floor(X(lo))) * 4] > 128) { const p = ll(la, lo, 1.002); pos.push(p.x, p.y, p.z); } } }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  earth.add(new THREE.Points(dg, new THREE.PointsMaterial({ map: DOT, size: .018, color: 0x8fd0ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, sizeAttenuation: true })));
}
// great-circle arc (lifted), drawn progressively
function arcPts(a, b, lift = .25, n = 128) { const pa = ll(a.lat, a.lon), pb = ll(b.lat, b.lon), pts = []; for (let i = 0; i <= n; i++) { const u = i / n; const p = pa.clone().lerp(pb, u).normalize(); p.multiplyScalar(1.004 + lift * Math.sin(Math.PI * u)); pts.push(p); } return pts; }
const arcM = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, uniforms: { p: { value: 1 }, t: { value: 0 } },
  vertexShader: 'varying float vU; void main(){ vU = uv.x; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: 'varying float vU; uniform float p, t; void main(){ if (vU > p) discard; float d = .4 + .6*pow(.5+.5*sin((vU*14. - t*2.)*6.2832), 4.); float head = exp(-(p-vU)*40.); gl_FragColor = vec4(mix(vec3(.09,.55,1.), vec3(.75,.93,1.), head)*(d+head*2.), 1.); }',
});
const arcMesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arcPts(LON, RUH, .22)), 200, .0045, 8), arcM); earth.add(arcMesh);
const ARC = new THREE.CatmullRomCurve3(arcPts(LON, RUH, .22));
// network shell (relay nodes + links) for "شبكة Apple"
const net = new THREE.Group(); earth.add(net);
const NET = [];
{
  const r = A.rnd(9);
  for (let i = 0; i < 70; i++) { const la = (r() - .3) * 120, lo = (r() - .5) * 220 + 20; NET.push(ll(la, lo, 1.18 + r() * .05)); }
  const lp = []; for (let i = 0; i < NET.length; i++) { const d = NET.map((q, j) => [q.distanceTo(NET[i]), j]).sort((a, b) => a[0] - b[0]); for (const [, j] of d.slice(1, 3)) lp.push(NET[i], NET[j]); }
  net.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lp), new THREE.LineBasicMaterial({ color: 0x59c7ff, transparent: true, opacity: .28, blending: THREE.AdditiveBlending, depthWrite: false })));
  const np = []; for (const q of NET) np.push(q.x, q.y, q.z); const ng = new THREE.BufferGeometry(); ng.setAttribute('position', new THREE.Float32BufferAttribute(np, 3));
  net.add(new THREE.Points(ng, new THREE.PointsMaterial({ map: DOT, size: .05, color: 0x9fdcff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
}
const NET_HUB = ll(38, 18, 1.2);
// small KROZO jet for the flight (low-poly; the airplane-mode jet is too heavy for a dot on a globe)
const jet = new THREE.Group(); earth.add(jet);
{
  const m = new THREE.MeshPhysicalMaterial({ color: 0xeef2f8, roughness: .3, metalness: .2, clearcoat: 1 }), b = new THREE.MeshPhysicalMaterial({ color: COL.blue, roughness: .3, clearcoat: 1 });
  const f = new THREE.Mesh(new THREE.CapsuleGeometry(.1, .9, 6, 16), m); f.rotation.z = Math.PI / 2; jet.add(f);
  const wsh = new THREE.Shape(); wsh.moveTo(.15, 0); wsh.lineTo(-.25, .75); wsh.lineTo(-.4, .75); wsh.lineTo(-.2, 0); wsh.lineTo(-.4, -.75); wsh.lineTo(-.25, -.75); wsh.closePath();
  const wing = new THREE.Mesh(new THREE.ExtrudeGeometry(wsh, { depth: .02, bevelEnabled: false }), m); wing.rotation.x = Math.PI / 2; jet.add(wing);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(.2, .25, .02), b); fin.position.set(-.5, .15, 0); jet.add(fin);
  jet.scale.setScalar(.06);
}

// plan: holographic airport (metres), lost bag by the carousel
const plan = new THREE.Group(); scene.add(plan);
const planFloor = new THREE.ShaderMaterial({
  uniforms: { t: { value: 0 } }, toneMapped: false,
  vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `varying vec2 vP; uniform float t;
    float gl(float x, float w){ return smoothstep(w, 0., abs(fract(x)-.5)*2. - (1.-w)) ; }
    void main(){ vec2 g1 = abs(fract(vP/2.)-.5), g2 = abs(fract(vP/10.)-.5);
      float l1 = smoothstep(.47,.5,max(g1.x,g1.y)), l2 = smoothstep(.485,.5,max(g2.x,g2.y));
      float fade = exp(-length(vP)/70.);
      vec3 c = vec3(.012,.02,.04) + vec3(.09,.55,1.)*(l1*.08 + l2*.22)*fade;
      gl_FragColor = vec4(c, 1.); }`,
});
{
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), planFloor); fl.rotation.x = -Math.PI / 2; plan.add(fl);
  const wallM = mkHolo(0x123a6e, COL.cyan, .8);
  const box = (w, h, d, x, z, m = wallM, y = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y + h / 2, z); plan.add(b); return b; };
  // terminal shell outline
  box(90, 9, .3, 0, -30); box(.3, 9, 60, -45, 0); box(.3, 9, 60, 45, 0);
  for (let x = -40; x <= 40; x += 10) box(.4, 9, .4, x, 30);   // glass façade mullions
  // baggage carousel (oval loop) with bags
  const cm = mkHolo(0x123a6e, COL.cyan, .55);
  const loop = new THREE.Shape(); loop.absarc(-6, 0, 3, Math.PI / 2, Math.PI * 1.5, false); loop.absarc(6, 0, 3, -Math.PI / 2, Math.PI / 2, false);
  const hole = new THREE.Path(); hole.absarc(-6, 0, 1.8, Math.PI / 2, Math.PI * 1.5, false); hole.absarc(6, 0, 1.8, -Math.PI / 2, Math.PI / 2, false); loop.holes.push(hole);
  const car = new THREE.Mesh(new THREE.ExtrudeGeometry(loop, { depth: .8, bevelEnabled: false }), cm); car.rotation.x = -Math.PI / 2; car.position.set(-10, 0, -8); plan.add(car);
  // seating rows + check-in counters
  for (let r = 0; r < 3; r++) for (let i = 0; i < 8; i++) box(1.2, .9, 1.2, 14 + i * 1.6, 8 + r * 4);
  for (let i = 0; i < 6; i++) box(3, 1.2, 1.2, -36 + i * 6, -24);
  // gates signs
  plan.userData.car = car;
}
// sky (GPS satellites above the finder's phone)
const sats = new THREE.Group(); scene.add(sats);
{ const sp = []; const r = A.rnd(3); for (let i = 0; i < 900; i++) { const v = V(r() - .5, r() * .9 + .1, r() - .5).normalize().multiplyScalar(150); sp.push(v.x, v.y, v.z); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); sats.add(new THREE.Points(g, new THREE.PointsMaterial({ map: DOT, size: 1.2, color: 0xcfe6ff, transparent: true, depthWrite: false, toneMapped: false }))); const dl = new THREE.DirectionalLight(0xdfeaff, 1.6); dl.position.set(5, 10, 8); sats.add(dl, new THREE.HemisphereLight(0x3b6fd0, 0x05070c, .8)); }
const SATS = [];
{
  const body = new THREE.MeshPhysicalMaterial({ color: 0xc9d2de, metalness: .9, roughness: .3 }), pan = new THREE.MeshPhysicalMaterial({ color: 0x0d2a55, metalness: .5, roughness: .3, emissive: 0x168bff, emissiveIntensity: .25 });
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group(); g.add(new THREE.Mesh(new RoundedBoxGeometry(1, 1.2, 1, 2, .1), body));
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(3, .05, 1.1), pan); p.position.x = s * 2.1; g.add(p); }
    const dish = new THREE.Mesh(new THREE.ConeGeometry(.35, .3, 24, 1, true), body); dish.position.y = -.75; dish.rotation.x = Math.PI; g.add(dish);
    sats.add(g); SATS.push(g);
  }
}

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
const STAGES = { studio, globe, plan, sats };
function reset() {
  for (const s of Object.values(STAGES)) s.visible = false;
  for (const o of [tag, parts, bag, phoneA.rig, phoneB.rig, devices, ...walkers]) o.visible = false;
  for (const r of ringPool) r.visible = false; for (const b of beamPool) b.visible = false; for (const s of sprPool) s.visible = false; ringN = beamN = sprN = 0;
  scene.fog = null; scene.background = new THREE.Color(0x05070c); scene.environment = ENV.studio; scene.environmentIntensity = 1;
  renderer.toneMappingExposure = 1; bloom.strength = .35; bloom.threshold = .85; bloom.radius = .55;
  cam.fov = 30; cam.near = .001; cam.far = 400; cam.up.set(0, 1, 0);
  Object.assign(grade.uniforms, {}); grade.uniforms.zb.value = 0; grade.uniforms.flash.value = 0; grade.uniforms.vig.value = .45; grade.uniforms.ca.value = .0015;
  tagLight.intensity = 0; sweep.intensity = 0; tag.scale.setScalar(1); tag.rotation.set(0, 0, 0); tag.position.set(0, 0, 0);
  PARTS.bt.material.emissiveIntensity = 0; PARTS.ant.material.emissiveIntensity = 0;
  bag.scale.setScalar(1); bag.rotation.set(0, 0, 0); bag.position.set(0, 0, 0); BAG.hinge.rotation.y = 0; bagHolo(false); bagHoloM.uniforms.k.value = 1;
  arcM.uniforms.p.value = 0; arcMesh.visible = false; net.visible = false; jet.visible = false; earth.rotation.set(0, 0, 0);
  studio.userData.floor.visible = true; studio.userData.floor.position.y = -.09; studio.userData.r1.intensity = 30; studio.userData.r2.intensity = 16;
  phoneA.rig.scale.setScalar(1); phoneB.rig.scale.setScalar(1); devices.visible = false;
  for (const d of DEV) { d.userData.scr.opacity = .15; d.visible = true; }
}
function stage(name, t) {
  STAGES[name].visible = true;
  for (const m of HOLO) m.uniforms.t.value = t; arcM.uniforms.t.value = t;
  if (name === 'globe') { scene.background = new THREE.Color(0x03050a); bloom.strength = .6; bloom.threshold = .5; }
  if (name === 'plan') { scene.background = new THREE.Color(0x03050a); scene.fog = new THREE.FogExp2(0x03050a, .012); bloom.strength = .55; bloom.threshold = .45; }
  if (name === 'sats') { scene.background = new THREE.Color(0x03050a); scene.environment = ENV.studio; scene.environmentIntensity = .6; bloom.strength = .5; bloom.threshold = .6; }
  if (name === 'studio') { bloom.threshold = .9; bloom.strength = .3; scene.environment = ENV.product; }
}
function lookCam(pos, look, fov = 30, roll = 0) { cam.position.copy(pos); cam.fov = fov; if (roll && roll.isVector3) cam.up.copy(roll); else cam.up.set(Math.sin(roll), Math.cos(roll), 0); cam.lookAt(look); cam.updateProjectionMatrix(); }
function project(v) { cam.updateMatrixWorld(); const p = v.clone().project(cam); return [(p.x * .5 + .5) * 1080, (-p.y * .5 + .5) * 1920]; }
function phoneAt(P, pos, rx = 0, ry = 0, rz = 0) { P.rig.visible = true; P.rig.position.copy(pos); P.rig.rotation.set(rx, ry, rz); P.rig.updateMatrixWorld(true); }

window.R3 = {
  THREE, V, scene, cam, COL, tag, tagLight, parts, PARTS, setParts, partPos, bag, BAG, bagHolo, bagHoloM, phoneA, phoneB, drawUI, phoneAt,
  walkers, walk, devices, DEV, studio, globe, earth, ll, arcM, arcMesh, ARC, net, NET, NET_HUB, jet, plan, sats, SATS, LON, RUH,
  ring, emit, beam, glow, sweep, bloom, grade: grade.uniforms, reset, stage, lookCam, project, renderer,
};
window.G3 = {
  render(t) {
    const sh = (window.SHOTS || []).find(s => t >= s.s && t < s.e);
    canvas.style.opacity = sh ? 1 : 0;
    if (!sh) { window.POST3D?.(null); return; }
    reset(); grade.uniforms.t.value = t;
    const lt = t - sh.s;
    sh.update(lt, t, sh);
    if (!sh.noPunch && sh.s > 0) grade.uniforms.zb.value = Math.max(grade.uniforms.zb.value, .9 * Math.max(0, 1 - lt / .16));
    // camera-facing rings
    for (let i = 0; i < ringN; i++) if (ringPool[i].userData.face === 'cam') ringPool[i].quaternion.copy(cam.quaternion);
    window.POST3D?.(sh, lt, t);
    composer.render();
  },
};
window.G3ready = true;
