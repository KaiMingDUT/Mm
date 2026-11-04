// Cover art: a message leaves a phone, rides an undersea fibre cable as light and
// lands on the other side of a dotted globe. Top third stays dark for the title.
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
cam.position.set(0, 1.5, 24); cam.lookAt(0, -2.2, 0);
let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const tex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const glow = (c, i = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), toneMapped: false });
const add = { blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false };
await document.fonts.load('700 40px A').catch(() => {});

// ---------- background ----------
{
  const [c, x] = cnv(540, 960);
  const g = x.createLinearGradient(0, 0, 0, 960);
  g.addColorStop(0, '#01040b'); g.addColorStop(.45, '#04122a'); g.addColorStop(.8, '#061a3a'); g.addColorStop(1, '#020812');
  x.fillStyle = g; x.fillRect(0, 0, 540, 960);
  const rg = x.createRadialGradient(270, 520, 10, 270, 520, 420);
  rg.addColorStop(0, 'rgba(30,120,255,.30)'); rg.addColorStop(1, 'rgba(30,120,255,0)'); x.fillStyle = rg; x.fillRect(0, 0, 540, 960);
  for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(170,210,255,${.15 + rnd() * .5})`; x.fillRect(rnd() * 540, rnd() * 960, 1, 1); }
  for (let i = 0; i < 9; i++) { x.fillStyle = `rgba(60,150,255,${.03 + rnd() * .05})`; x.fillRect(rnd() * 540, 0, 2 + rnd() * 10, 960); }
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
const DOT = (() => { const [c, x] = cnv(64, 64); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, '#fff'); g.addColorStop(.45, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();

// ---------- globe ----------
const GR = 3.7;
const earth = new THREE.Group(); S.add(earth);
earth.position.set(.3, -1.9, -2); earth.rotation.set(.62, 0, 0);
const ll = (la, lo, r = 1) => { const p = la * Math.PI / 180, l = lo * Math.PI / 180; return new THREE.Vector3(Math.cos(p) * Math.sin(l), Math.sin(p), Math.cos(p) * Math.cos(l)).multiplyScalar(r * GR); };
// face the camera between Riyadh and New York
const spin = new THREE.Group(); earth.add(spin); spin.rotation.y = THREE.MathUtils.degToRad(16);
spin.add(new THREE.Mesh(new THREE.SphereGeometry(GR, 96, 64), new THREE.MeshPhysicalMaterial({ color: 0x061a3c, roughness: .55, metalness: .2, clearcoat: .6, emissive: 0x03102a })));
{
  const halo = new THREE.Mesh(new THREE.SphereGeometry(GR * 1.08, 64, 48), new THREE.ShaderMaterial({ ...add, side: THREE.BackSide,
    vertexShader: 'varying vec3 vN, vV; void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'varying vec3 vN, vV; void main(){ float f = pow(max(0., dot(vN,vV)), 3.); gl_FragColor = vec4(vec3(.09,.55,1.)*f*.9, 1.); }' }));
  earth.add(halo);
  const gm = new THREE.LineBasicMaterial({ color: 0x168bff, transparent: true, opacity: .14 });
  for (let la = -60; la <= 60; la += 30) { const pts = []; for (let lo = -180; lo <= 180; lo += 3) pts.push(ll(la, lo, 1.001)); spin.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gm)); }
  for (let lo = -180; lo < 180; lo += 30) { const pts = []; for (let la = -90; la <= 90; la += 3) pts.push(ll(la, lo, 1.001)); spin.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gm)); }
  // dotted land from Natural Earth (world-atlas, ISC); tiny TopoJSON decoder
  const topo = await (await fetch('../../airtag/engine/assets/land-50m.json')).json();
  const { scale: [sx, sy], translate: [tx, ty] } = topo.transform;
  const arcs = topo.arcs.map(a => { let x = 0, y = 0; return a.map(([dx, dy]) => [(x += dx) * sx + tx, (y += dy) * sy + ty]); });
  const ring = idx => idx.flatMap((i, k) => { const a = i < 0 ? arcs[~i].slice().reverse() : arcs[i]; return k ? a.slice(1) : a; });
  const [mc, mg] = cnv(2048, 1024); mg.fillStyle = '#000'; mg.fillRect(0, 0, 2048, 1024); mg.fillStyle = '#fff';
  const X = lo => (lo + 180) / 360 * 2048, Y = la => (90 - la) / 180 * 1024;
  for (const g of topo.objects.land.geometries) {
    const polys = g.type === 'Polygon' ? [g.arcs] : g.arcs;
    for (const poly of polys) { mg.beginPath(); for (const r of poly) ring(r).forEach(([lo, la], i) => i ? mg.lineTo(X(lo), Y(la)) : mg.moveTo(X(lo), Y(la))); mg.fill('evenodd'); }
  }
  const md = mg.getImageData(0, 0, 2048, 1024).data, pos = [];
  for (let la = -84; la <= 84; la += .75) { const n = Math.max(1, Math.round(480 * Math.cos(la * Math.PI / 180))); for (let i = 0; i < n; i++) { const lo = -180 + 360 * i / n; if (md[(Math.floor(Y(la)) * 2048 + Math.floor(X(lo))) * 4] > 128) { const p = ll(la, lo, 1.003); pos.push(p.x, p.y, p.z); } } }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  spin.add(new THREE.Points(dg, new THREE.PointsMaterial({ map: DOT, size: .085, color: new THREE.Color(0x8fd0ff).multiplyScalar(1.1), ...add })));
}
// undersea cable routes (approximate, drawn on the sea surface) + the hero route
const PLACES = { ruh: [24.7, 46.7], jed: [21.5, 39.2], suez: [30, 32.5], mrs: [43.3, 5.4], lis: [38.7, -9.1], ny: [40.7, -74], bom: [19, 72.8], sin: [1.3, 103.8], lag: [6.5, 3.4], cpt: [-33.9, 18.4], lon: [51.5, -0.1] };
const path = (pts, lift = 1.004) => { const out = []; for (let i = 0; i < pts.length - 1; i++) { const a = ll(...pts[i]), b = ll(...pts[i + 1]); for (let u = 0; u < 1; u += 1 / 40) out.push(a.clone().lerp(b, u).normalize().multiplyScalar(GR * lift)); } out.push(ll(...pts.at(-1), lift)); return out; };
const cable = (pts, col, r, k) => { const c = new THREE.CatmullRomCurve3(path(pts)); const m = new THREE.Mesh(new THREE.TubeGeometry(c, 300, r, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), ...add })); spin.add(m); return c; };
const P = PLACES;
for (const route of [[P.jed, [12.5, 43.5], [12, 52], P.bom], [P.bom, [6, 80], P.sin], [P.mrs, [37, 12], P.suez], [P.lis, [5, -15], P.lag, [-10, 5], P.cpt], [P.lon, [48, -8], P.lis], [[12, 52], [-5, 55], [-25, 40], P.cpt]])
  cable(route, 0x2a7dff, .018, 1.2);
// hero: Riyadh → Jeddah → Red Sea → Suez → Med → Atlantic → New York, lifted as a light arc
const heroPts = path([P.ruh, P.jed, [27, 34.5], P.suez, [33.5, 25], [37, 12], [37.5, -1], [36, -6], [38, -30], [40, -55], P.ny], 1.006);
const hero = new THREE.CatmullRomCurve3(heroPts);
spin.add(new THREE.Mesh(new THREE.TubeGeometry(hero, 600, .03, 8), new THREE.ShaderMaterial({ ...add,
  vertexShader: 'varying float u; void main(){ u = uv.x; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: 'varying float u; void main(){ float pulse = pow(.5+.5*sin(u*70.), 6.); float head = exp(-(.78-u)*(.78-u)*900.); float on = step(u, .8); gl_FragColor = vec4((vec3(.2,.75,1.)*(.9+pulse*1.5) + vec3(1.)*head*6.)*on + vec3(.05,.2,.5)*(1.-on), 1.); }' })));
spin.add(new THREE.Mesh(new THREE.TubeGeometry(hero, 600, .09, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x59c7ff).multiplyScalar(.5), ...add, opacity: .35 })));
const head = new THREE.Mesh(new THREE.SphereGeometry(.13, 20, 14), glow(0xffffff, 6)); head.position.copy(hero.getPoint(.8)); spin.add(head);
// city beacons
const beacon = (p, col) => {
  const b = ll(...p, 1.003), n = b.clone().normalize();
  const sp = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .9, 8, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(3), ...add }));
  sp.position.copy(b.clone().addScaledVector(n, .45)); sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n); spin.add(sp);
  for (const [r, k] of [[.16, 3], [.32, 1.2]]) { const rg = new THREE.Mesh(new THREE.RingGeometry(r - .025, r, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), ...add, side: THREE.DoubleSide })); rg.position.copy(b); rg.lookAt(b.clone().add(n)); spin.add(rg); }
  return b;
};
const ruh = beacon(P.ruh, 0x59c7ff), ny = beacon(P.ny, 0xffffff);

// ---------- phone sending the message (front-left) ----------
const phone = new THREE.Group(); S.add(phone);
phone.position.set(-1.75, -4.75, 6); phone.rotation.set(-.2, .45, .12);
{
  const PW = 2.3, PH = 4.7;
  const s = new THREE.Shape(), r = .32, x0 = -PW / 2, y0 = -PH / 2;
  s.moveTo(x0 + r, y0); s.lineTo(x0 + PW - r, y0); s.quadraticCurveTo(x0 + PW, y0, x0 + PW, y0 + r); s.lineTo(x0 + PW, y0 + PH - r); s.quadraticCurveTo(x0 + PW, y0 + PH, x0 + PW - r, y0 + PH);
  s.lineTo(x0 + r, y0 + PH); s.quadraticCurveTo(x0, y0 + PH, x0, y0 + PH - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
  const g = new THREE.ExtrudeGeometry(s, { depth: .16, bevelEnabled: true, bevelSize: .04, bevelThickness: .04, bevelSegments: 5, curveSegments: 16 }); g.translate(0, 0, -.2);
  phone.add(new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: 0x1a2232, metalness: .8, roughness: .22, clearcoat: 1 })));
  const [c, x] = cnv(560, 1150);
  const bg = x.createLinearGradient(0, 0, 0, 1150); bg.addColorStop(0, '#0b1730'); bg.addColorStop(1, '#050a16'); x.fillStyle = bg; x.fillRect(0, 0, 560, 1150);
  x.direction = 'rtl'; x.textBaseline = 'middle';
  x.fillStyle = '#111c33'; x.fillRect(0, 0, 560, 150); x.textAlign = 'center'; x.font = '700 38px A'; x.fillStyle = '#F4F7FB'; x.fillText('أخوي - نيويورك', 280, 95);
  const bub = (t, y, mine, tick) => { x.font = '700 36px A'; const w = x.measureText(t).width + 60 + (tick ? 60 : 0); const bx = mine ? 560 - 30 - w : 30;
    x.fillStyle = mine ? '#168BFF' : '#1b2740'; x.beginPath(); x.roundRect(bx, y, w, 80, 34); x.fill(); x.fillStyle = '#F4F7FB'; x.textAlign = 'right'; x.fillText(t, bx + w - 30, y + 42);
    if (tick) { x.strokeStyle = '#9fe9ff'; x.lineWidth = 5; x.lineCap = 'round'; for (const o of [0, 16]) { x.beginPath(); x.moveTo(bx + 26 + o, y + 44); x.lineTo(bx + 36 + o, y + 54); x.lineTo(bx + 54 + o, y + 30); x.stroke(); } } };
  bub('صباح الخير!', 260, false); bub('عندنا الحين الظهر 😄', 380, true); bub('وصلتك؟', 820, true, true);
  // the sent message glows
  x.shadowColor = '#59C7FF'; x.shadowBlur = 40; x.strokeStyle = '#59C7FF'; x.lineWidth = 4; x.beginPath(); x.roundRect(560 - 30 - 260, 815, 260, 90, 38); x.stroke(); x.shadowBlur = 0;
  x.fillStyle = '#111c33'; x.beginPath(); x.roundRect(24, 1040, 512, 80, 40); x.fill();
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(PW * .92, PW * .92 * 1150 / 560), new THREE.MeshBasicMaterial({ map: tex(c), toneMapped: false }));
  scr.position.z = .01; phone.add(scr);
}
// light trail from the phone's message up to Riyadh on the globe
S.updateMatrixWorld(true);
{
  const a = new THREE.Vector3(.45, -1.09, .1).applyMatrix4(phone.matrixWorld), b = ruh.clone().applyMatrix4(spin.matrixWorld);
  const mid = a.clone().lerp(b, .5).add(new THREE.Vector3(-1.8, .4, 1.5));
  const c = new THREE.QuadraticBezierCurve3(a, mid, b);
  S.add(new THREE.Mesh(new THREE.TubeGeometry(c, 120, .03, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8fe8ff).multiplyScalar(1.4), ...add })));
  S.add(new THREE.Mesh(new THREE.TubeGeometry(c, 120, .1, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x2a9dff).multiplyScalar(.8), ...add, opacity: .35 })));
  for (let i = 0; i < 40; i++) { const p = c.getPoint(rnd()); const d = new THREE.Mesh(new THREE.SphereGeometry(.025 + rnd() * .04, 8, 6), glow(0xbff2ff, 2 + rnd() * 2)); d.position.copy(p).add(new THREE.Vector3((rnd() - .5) * .4, (rnd() - .5) * .4, (rnd() - .5) * .4)); S.add(d); }
}

// ---------- fibre-optic cable in the foreground (cut end shows glowing fibres) ----------
{
  const c = new THREE.CatmullRomCurve3([new THREE.Vector3(7, -8.6, 2), new THREE.Vector3(4.4, -7.4, 4), new THREE.Vector3(2.3, -6.6, 6.4)]);
  S.add(new THREE.Mesh(new THREE.TubeGeometry(c, 80, .55, 40), new THREE.MeshPhysicalMaterial({ color: 0x24344f, metalness: .6, roughness: .35, clearcoat: 1 })));
  // armour stripes
  for (let u = .05; u < .95; u += .06) { const p = c.getPoint(u), t = c.getTangent(u); const rg = new THREE.Mesh(new THREE.TorusGeometry(.56, .025, 8, 40), new THREE.MeshPhysicalMaterial({ color: 0x2a3956, metalness: .9, roughness: .3 })); rg.position.copy(p); rg.lookAt(p.clone().add(t)); S.add(rg); }
  const end = c.getPoint(1), t = c.getTangent(1);
  const cap = new THREE.Group(); cap.position.copy(end); cap.lookAt(end.clone().add(t)); S.add(cap);
  cap.add(new THREE.Mesh(new THREE.CircleGeometry(.55, 48), new THREE.MeshPhysicalMaterial({ color: 0x0a0f1a, metalness: .5, roughness: .5 })));
  // fibres poking out, each tip a light dot
  for (let i = 0; i < 60; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * .42, L = .15 + rnd() * .5;
    const f = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, L, 6), glow(0x6fd8ff, 1.6)); f.rotation.x = Math.PI / 2; f.position.set(Math.cos(a) * r, Math.sin(a) * r, L / 2); cap.add(f);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(.03, 8, 6), glow(rnd() < .3 ? 0xffffff : 0x59c7ff, 4)); tip.position.set(Math.cos(a) * r, Math.sin(a) * r, L); cap.add(tip);
  }
}

// ---------- HUD chips ----------
const chip = (l1, l2, w, h, pos, rotY) => {
  const [c, x] = cnv(w * 2, h * 2); x.scale(2, 2);
  x.fillStyle = 'rgba(4,16,40,.82)'; x.strokeStyle = '#46d6ff'; x.lineWidth = 3; x.beginPath(); x.roundRect(3, 3, w - 6, h - 6, 16); x.fill(); x.stroke();
  x.direction = 'rtl'; x.textAlign = 'right'; x.font = '700 32px A'; x.fillStyle = '#bfefff'; x.fillText(l1, w - 22, 48);
  x.font = '700 24px A'; x.fillStyle = '#6fb8ff'; x.fillText(l2, w - 22, 88);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w / 120, h / 120), new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, toneMapped: false, depthWrite: false }));
  m.position.copy(pos); m.rotation.y = rotY; S.add(m);
};
chip('الرياض ← نيويورك', 'أقل من 0.1 ثانية', 300, 112, new THREE.Vector3(1.75, -3.3, 5), -.25);
chip('كيبل تحت البحر', 'ضوء داخل ألياف زجاجية', 320, 112, new THREE.Vector3(-1.5, -1.95, 4), .25);

const comp = new EffectComposer(R);
comp.addPass(new RenderPass(S, cam));
comp.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), .6, .45, .8));
comp.addPass(new OutputPass());
comp.render();
window.__done = true;
