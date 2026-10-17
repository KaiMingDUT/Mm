// KROZO — "وضع الطيران" 3D world.
// Stages: sky (night flight above clouds), cabin, cockpit, ground (towers + city), studio (phone hero / hangar), holo (sound analogy).
// Actors: airliner (KROZO livery), phone (live canvas UI), hologram busts, signal rings, beams.
// timeline.js owns the shot list; each frame we reset, the active shot poses the world, then we render.
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

await Promise.all(['700 150px PlexLatin','600 40px PlexLatin','500 36px PlexLatin','700 32px Plex','400 28px Plex'].map(f => document.fonts.load(f)));
const RS = +(new URLSearchParams(location.search).get('rs') || 1);
const W = Math.round(1080 * RS), H = Math.round(1920 * RS);
const canvas = document.getElementById('gl');
canvas.style.width = '1080px'; canvas.style.height = '1920px';
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(30, W / H, .01, 6000);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const COL = { bg: 0x080B12, blue: 0x168BFF, cyan: 0x59C7FF, ink: 0xF4F7FB, gray: 0xA7B1C2 };
function rndGen(s) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const rnd = rndGen(11);
const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const tex = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function rshape(w, h, r) { const s = new THREE.Shape(), x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; }
// airplane glyph (pointing up), centred at (x,y), size s
function planeGlyph(g, x, y, s, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s / 100, s / 100); g.beginPath();
  g.moveTo(0, -50); g.bezierCurveTo(5, -50, 7, -44, 7, -36); g.lineTo(7, -12); g.lineTo(46, 10); g.lineTo(46, 20); g.lineTo(7, 8);
  g.lineTo(7, 32); g.lineTo(19, 42); g.lineTo(19, 50); g.lineTo(0, 44); g.lineTo(-19, 50); g.lineTo(-19, 42); g.lineTo(-7, 32);
  g.lineTo(-7, 8); g.lineTo(-46, 20); g.lineTo(-46, 10); g.lineTo(-7, -12); g.lineTo(-7, -36); g.bezierCurveTo(-7, -44, -5, -50, 0, -50);
  g.closePath(); g.fill(); g.restore();
}

// ───────── environments ─────────
const pm = new THREE.PMREMGenerator(renderer);
const hdr = async f => { const t = await new RGBELoader().loadAsync('assets/' + f); const e = pm.fromEquirectangular(t).texture; t.dispose(); return e; };
const ENV = { night: await hdr('moonless_golf_1k.hdr'), studio: pm.fromScene(new RoomEnvironment(), .04).texture };

// soft dot / cloud textures
const DOT = (() => { const [c, g] = cnv(64, 64); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.35, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return tex(c); })();
const CLOUD = (() => {
  const [c, g] = cnv(256, 256); const r = rndGen(5);
  for (let i = 0; i < 60; i++) {
    const a = r() * Math.PI * 2, d = Math.pow(r(), .7) * 70, x = 128 + Math.cos(a) * d * 1.25, y = 140 + Math.sin(a) * d * .55 - (d < 30 ? 15 : 0), rr = 26 + r() * 40;
    const q = g.createRadialGradient(x, y - rr * .2, 0, x, y, rr); q.addColorStop(0, 'rgba(255,255,255,.22)'); q.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = q; g.fillRect(0, 0, 256, 256);
  }
  return tex(c);
})();

// ───────── sky dome (navy → electric-blue horizon, stars) ─────────
const skyM = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { t: { value: 0 }, glow: { value: 1 }, sunDir: { value: V(-.5, .12, -.85).normalize() } },
  vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; }',
  fragmentShader: `varying vec3 vD; uniform float t, glow; uniform vec3 sunDir;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
    void main(){
      vec3 d = normalize(vD); float y = d.y;
      vec3 top = vec3(.012,.018,.036), mid = vec3(.02,.045,.11), hor = vec3(.03,.13,.32);
      vec3 c = mix(mid, top, smoothstep(.05,.6,y));
      c = mix(c, hor, exp(-abs(y-.0)*14.)*glow);
      float m = max(dot(d, sunDir), 0.); c += vec3(.35,.7,1.)*pow(m, 500.)*.5 + vec3(.1,.35,.8)*pow(m,12.)*.18*glow;   // moon glow
      c += vec3(.95,.97,1.)*smoothstep(.99985,.99992,m);                                                                   // moon disc
      vec2 uv = vec2(atan(d.z,d.x)*180., asin(clamp(d.y,-1.,1.))*180.); vec2 cell = floor(uv); vec2 f = fract(uv)-.5;
      float s = step(.985, h(cell)) * smoothstep(.12,.0,length(f)) * smoothstep(.02,.25,y);
      c += vec3(.8,.9,1.)*s*(.5+.5*sin(t*3.+h(cell+3.)*20.));
      gl_FragColor = vec4(c,1.);
    }`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 48, 24), skyM); sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);

// moonlight (cool key) + sky/ground fill — used by the exterior stages
const moon = new THREE.DirectionalLight(0xbcd6ff, 0); moon.position.set(-300, 220, -500); scene.add(moon);
const hemi = new THREE.HemisphereLight(0x3b6fd0, 0x0a1220, 0); scene.add(hemi);
// ───────── airliner ─────────
const jet = new THREE.Group(); scene.add(jet);
const L = 38, R0 = 2;
function fuseR(s) {   // s: 0 tail → 1 nose. returns [radius, centreY]
  if (s > .86) { const u = (s - .86) / .14; return [R0 * Math.pow(Math.max(0, 1 - Math.pow(u, 2.2)), .5), -u * u * .35]; }
  if (s < .27) { const u = (.27 - s) / .27; return [R0 * (1 - .86 * Math.pow(u, 1.2)), u * u * 1.35]; }
  return [R0, 0];
}
function tubeGeo(N, M, fn) {   // fn(s,θ) -> Vector3 ; uv = (s, θ/2π)
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= N; i++) for (let j = 0; j <= M; j++) { const p = fn(i / N, j / M * Math.PI * 2); pos.push(p.x, p.y, p.z); uv.push(i / N, j / M); }
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const a = i * (M + 1) + j, b = a + M + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const fuseGeo = tubeGeo(140, 64, (s, th) => { const [r, yc] = fuseR(s); return V(-L / 2 + L * s, yc + r * Math.cos(th) * 1.04, r * Math.sin(th)); });
// livery: u = along body (tail→nose), v = around (0 top, .25 right side (+z), .5 belly, .75 left side)
const [livC, lg] = cnv(4096, 1024), [emC, eg] = cnv(4096, 1024);
{
  const Wd = 4096, Hd = 1024;
  lg.fillStyle = '#eef2f8'; lg.fillRect(0, 0, Wd, Hd);
  eg.fillStyle = '#000'; eg.fillRect(0, 0, Wd, Hd);
  const belly = lg.createLinearGradient(0, Hd * .36, 0, Hd * .64); belly.addColorStop(0, '#168BFF'); belly.addColorStop(.5, '#0b3f86'); belly.addColorStop(1, '#168BFF');
  lg.fillStyle = belly; lg.fillRect(0, Hd * .36, Wd, Hd * .28);
  lg.fillStyle = '#59C7FF'; lg.fillRect(Wd * .1, Hd * .335, Wd * .86, Hd * .012); lg.fillRect(Wd * .1, Hd * .653, Wd * .86, Hd * .012);
  for (const side of [.205, .795]) {
    for (let x = .25; x < .84; x += .0105) {
      if (Math.abs(x - .52) < .018 || Math.abs(x - .8) < .02) continue;   // doors / exits
      rrect(lg, x * Wd, side * Hd - 14, 22, 30, 9); lg.fillStyle = '#1b2533'; lg.fill();
      rrect(eg, x * Wd + 3, side * Hd - 11, 16, 24, 7); eg.fillStyle = '#ffe6c4'; eg.fill();
    }
    for (const dx of [.235, .52, .8]) { lg.strokeStyle = '#b9c3d1'; lg.lineWidth = 3; rrect(lg, dx * Wd, side * Hd - 40, 46, 92, 10); lg.stroke(); }
    // cockpit windows
    lg.fillStyle = '#0d1420';
    const cw = side < .5 ? [[.895, .17], [.912, .165], [.926, .158]] : [[.895, .83], [.912, .835], [.926, .842]];
    for (const [x, y] of cw) { rrect(lg, x * Wd, y * Hd - 22, 58, 40, 8); lg.fill(); }
  }
  // wordmark on both sides (left side mirrored so it reads correctly)
  lg.font = '700 150px "PlexLatin", sans-serif'; lg.fillStyle = '#0b1a33'; lg.textBaseline = 'middle';
  lg.save(); lg.translate(Wd * .43 + 560, Hd * .115); lg.rotate(Math.PI); lg.fillText('KROZO', 0, 0); lg.restore();
  lg.save(); lg.translate(Wd * .43, Hd * .885); lg.fillText('KROZO', 0, 0); lg.restore();
}
const livTex = tex(livC), emTex = tex(emC); livTex.flipY = emTex.flipY = false;
const paint = new THREE.MeshPhysicalMaterial({ map: livTex, emissiveMap: emTex, emissive: 0xffffff, emissiveIntensity: 2.2, roughness: .28, metalness: .15, clearcoat: 1, clearcoatRoughness: .12 });
const bluePaint = new THREE.MeshPhysicalMaterial({ color: COL.blue, roughness: .3, metalness: .3, clearcoat: 1, clearcoatRoughness: .1 });
const wingM = new THREE.MeshPhysicalMaterial({ color: 0xc9d2de, roughness: .35, metalness: .45, clearcoat: .6, side: THREE.DoubleSide });
const darkM = new THREE.MeshStandardMaterial({ color: 0x0a0e15, roughness: .5, metalness: .6 });
const fuse = new THREE.Mesh(fuseGeo, paint); jet.add(fuse);
function wingGeo(rootLE, rootTE, tipLE, tipTE, span, thick) {
  const s = new THREE.Shape(); s.moveTo(rootLE, 0); s.lineTo(tipLE, span); s.lineTo(tipTE, span); s.lineTo(rootTE, 0); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: true, bevelThickness: thick * .45, bevelSize: thick * .5, bevelSegments: 4, curveSegments: 4 });
  g.translate(0, 0, -thick / 2); g.rotateX(Math.PI / 2); return g;   // span → +z, thickness → y
}
const wg = wingGeo(5, -1.4, -6.6, -8.2, 17, .28);
for (const sgn of [1, -1]) {
  const w = new THREE.Mesh(wg, wingM); w.scale.set(1, 1, sgn); w.position.set(0, -1.15, 0); w.rotation.x = sgn * -.085; jet.add(w);
  const wl = new THREE.Mesh(wingGeo(-6.6, -8.2, -8.7, -9.4, 2.1, .12), bluePaint); wl.rotation.x = -Math.PI / 2 * sgn * .92; wl.position.set(0, -1.15 + 17 * Math.tan(.085), 16.9 * sgn); wl.scale.set(1, 1, sgn); jet.add(wl);
  const hs = new THREE.Mesh(wingGeo(-14.4, -17.6, -18.9, -20.2, 6.4, .16), wingM); hs.scale.set(1, 1, sgn); hs.position.set(0, .95, 0); hs.rotation.x = sgn * -.1; jet.add(hs);
  // engine nacelle + pylon
  const nac = new THREE.Group(); nac.position.set(3.3, -2.45, 5.9 * sgn); jet.add(nac);
  const prof = [[.82, 0], [1.02, .25], [1.08, .9], [1.02, 2.6], [.78, 3.9], [.55, 4.3]].map(([r, y]) => new THREE.Vector2(r, y));
  const ng = new THREE.LatheGeometry(prof, 48); ng.rotateZ(Math.PI / 2);
  const shell = new THREE.Mesh(ng, new THREE.MeshPhysicalMaterial({ color: 0xe9eef5, roughness: .25, metalness: .35, clearcoat: 1, side: THREE.DoubleSide })); nac.add(shell);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(.87, .07, 12, 48), new THREE.MeshPhysicalMaterial({ color: 0xdfe6ee, metalness: 1, roughness: .2 })); lip.rotation.y = Math.PI / 2; nac.add(lip);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(1.085, 1.085, .35, 48, 1, true), bluePaint); band.rotation.z = Math.PI / 2; band.position.x = -1.2; nac.add(band);
  const fan = new THREE.Mesh(new THREE.CircleGeometry(.84, 48), darkM); fan.rotation.y = Math.PI / 2; fan.position.x = -.25; nac.add(fan);
  const spin = new THREE.Mesh(new THREE.ConeGeometry(.28, .6, 32), new THREE.MeshStandardMaterial({ color: 0x2a3140, metalness: .9, roughness: .3 })); spin.rotation.z = -Math.PI / 2; spin.position.x = -.05; nac.add(spin);
  const exh = new THREE.Mesh(new THREE.CircleGeometry(.55, 32), new THREE.MeshBasicMaterial({ color: 0x0a1630 })); exh.rotation.y = -Math.PI / 2; exh.position.x = -4.31; nac.add(exh);
  const py = new THREE.Mesh(new RoundedBoxGeometry(3.4, 1.0, .3, 3, .1), wingM); py.position.set(-1.6, .95, 0); nac.add(py);
}
{ // vertical fin
  const s = new THREE.Shape(); s.moveTo(-11.8, 0); s.lineTo(-17.3, 7.6); s.lineTo(-19.7, 7.6); s.lineTo(-19.2, 0); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: .3, bevelEnabled: true, bevelThickness: .1, bevelSize: .12, bevelSegments: 3 }); g.translate(0, 1.6, -.15);
  const [fc, fg] = cnv(512, 512); const gr = fg.createLinearGradient(0, 512, 0, 0); gr.addColorStop(0, '#0b3f86'); gr.addColorStop(.6, '#168BFF'); gr.addColorStop(1, '#59C7FF'); fg.fillStyle = gr; fg.fillRect(0, 0, 512, 512);
  const finM = new THREE.MeshPhysicalMaterial({ map: tex(fc), roughness: .3, metalness: .3, clearcoat: 1 });
  // planar uv from xy
  const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + 20) / 9, (p.getY(i) - 1.6) / 7.6);
  jet.add(new THREE.Mesh(g, finM));
}
// landing gear (only shown in the hangar)
const gear = new THREE.Group(); jet.add(gear);
{
  const strutM = new THREE.MeshStandardMaterial({ color: 0xd5dbe4, metalness: .8, roughness: .3 }), tyreM = new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: .8 });
  for (const [x, z, n] of [[14.2, 0, 1], [-1.2, 2.9, 2], [-1.2, -2.9, 2]]) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, 2.6, 12), strutM); st.position.set(x, -3.1, z); gear.add(st);
    for (let i = 0; i < n; i++) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, .42, 28), tyreM); wh.rotation.x = Math.PI / 2; wh.position.set(x + (n > 1 ? (i - .5) * 1.3 : 0), -4.3, z + (n > 1 ? 0 : 0)); gear.add(wh); }
  }
}
// antennas (highlighted in the "systems" shot)
const antennas = [];
for (const [x, y, sz, top] of [[7, 2.05, .5, 1], [1, 2.05, .4, 1], [-6, 2.0, .4, 1], [5, -2.08, .45, 0], [-3, -2.08, .35, 0]]) {
  const a = new THREE.Mesh(new RoundedBoxGeometry(sz * .7, .32, .06, 2, .025), new THREE.MeshStandardMaterial({ color: 0xc4ccd8, metalness: .5, roughness: .35 })); a.position.set(x, y + (top ? .1 : -.1), 0); a.rotation.z = top ? .35 : -.35; jet.add(a); antennas.push(a);
}
// nav lights
const NAV = {};
const lightSpr = c => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: DOT, color: c, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); s.scale.setScalar(1.6); jet.add(s); return s; };
NAV.r = lightSpr(0xff3b30); NAV.r.position.set(-7.2, .3, -17.2);
NAV.g = lightSpr(0x30d158); NAV.g.position.set(-7.2, .3, 17.2);
NAV.s1 = lightSpr(0xffffff); NAV.s1.position.set(-7.6, .3, -17.3);
NAV.s2 = lightSpr(0xffffff); NAV.s2.position.set(-7.6, .3, 17.3);
NAV.tail = lightSpr(0xffffff); NAV.tail.position.set(-19.4, 1.4, 0);
NAV.bcn = lightSpr(0xff453a); NAV.bcn.position.set(-2, 2.25, 0);
// logo light on the fin
const finLight = new THREE.SpotLight(0x9fd4ff, 0, 30, .5, .6); finLight.position.set(-12, 9, 6); finLight.target.position.set(-17, 5, 0); jet.add(finLight, finLight.target);
// hologram / x-ray material for the systems & hangar shots
const holoM = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  uniforms: { t: { value: 0 }, k: { value: 1 }, col: { value: new THREE.Color(COL.blue) }, rim: { value: new THREE.Color(COL.cyan) }, scan: { value: -99 } },
  vertexShader: 'varying vec3 vN, vV, vW; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); vV = normalize(-mv.xyz); vW = (modelMatrix*vec4(position,1.)).xyz; gl_Position = projectionMatrix*mv; }',
  fragmentShader: `varying vec3 vN, vV, vW; uniform float t, k, scan; uniform vec3 col, rim;
    void main(){ float f = pow(1.-abs(dot(normalize(vN), normalize(vV))), 2.2);
      float lines = smoothstep(.92,1.,abs(sin(vW.y*9.+t*2.)))*.25;
      float sc = exp(-abs(vW.x-scan)*1.4)*1.5;
      vec3 c = col*(.05+f*.75+lines) + rim*(f*f*.9 + sc);
      gl_FragColor = vec4(c*k, 1.); }`,
});
const jetMeshes = []; jet.traverse(o => { if (o.isMesh) { o.userData.mat = o.material; jetMeshes.push(o); } });
function jetHolo(on) { for (const m of jetMeshes) m.material = on ? holoM : m.userData.mat; for (const s of Object.values(NAV)) s.visible = !on; }
// avionics bay (inside the nose, visible in holo mode)
const avionics = new THREE.Group(); jet.add(avionics);
{
  const boxM = new THREE.MeshBasicMaterial({ color: COL.cyan, transparent: true, opacity: .9, toneMapped: false });
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.5, .35, .3), boxM); b.position.set(13.5 - (i % 3) * .6, -1.0 + Math.floor(i / 3) * .42, -.3 + (i % 2) * .6); avionics.add(b); }
  const wire = new THREE.MeshBasicMaterial({ color: COL.blue, toneMapped: false });
  for (const a of antennas) { const p = a.position, q = V(13, -.8, 0), len = p.distanceTo(q); const c = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, len, 6), wire); c.position.copy(p).add(q).multiplyScalar(.5); c.quaternion.setFromUnitVectors(V(0, 1, 0), q.clone().sub(p).normalize()); avionics.add(c); }
}

// ───────── clouds + ground (sky stage) ─────────
const skyStage = new THREE.Group(); scene.add(skyStage);
const clouds = [];
for (let i = 0; i < 260; i++) {
  const m = new THREE.SpriteMaterial({ map: CLOUD, color: 0x8ea9d6, transparent: true, depthWrite: false, opacity: .9, fog: true });
  const s = new THREE.Sprite(m);
  const big = 40 + rnd() * 70; s.scale.set(big * 2.1, big, 1);
  s.userData = { x: (rnd() - .5) * 1600, y: -35 - rnd() * 40, z: (rnd() - .5) * 1200, b: .55 + rnd() * .45 };
  skyStage.add(s); clouds.push(s);
}
function updClouds(t, speed = 60, yOff = 0) {
  for (const s of clouds) { const u = s.userData; let x = ((u.x - t * speed) % 1600 + 2400) % 1600 - 800; s.position.set(x, u.y + yOff, u.z); s.material.color.setRGB(.2 * u.b, .3 * u.b, .55 * u.b); }
}

// ───────── signal rings + beams pools ─────────
const ringGeo = new THREE.PlaneGeometry(1, 1);
const ringPool = [];
for (let i = 0; i < 260; i++) {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    uniforms: { col: { value: new THREE.Color() }, a: { value: 1 }, w: { value: .08 }, wave: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec2 vUv; uniform vec3 col; uniform float a, w, wave;
      void main(){ vec2 p = vUv-.5; float r = length(p)*2.; float ang = atan(p.y,p.x);
        float rr = r + wave*.035*sin(ang*24.);
        float d = abs(rr-(1.-w));
        float m = smoothstep(w, 0., d) + exp(-d*18.)*.35;
        m *= smoothstep(1.,.96,r);
        gl_FragColor = vec4(col*m*a, 1.); }`,
  });
  const r = new THREE.Mesh(ringGeo, m); r.visible = false; r.frustumCulled = false; r.renderOrder = 5; scene.add(r); ringPool.push(r);
}
let ringN = 0;
// ring(pos, radius, color, alpha, {face:'cam'|'up'|Vector3 normal, w, wave})
function ring(pos, rad, col, a, o = {}) {
  if (ringN >= ringPool.length || a <= .002 || rad <= 0) return;
  const r = ringPool[ringN++]; r.visible = true; r.position.copy(pos); r.scale.set(rad * 2, rad * 2, 1);
  r.material.uniforms.col.value.set(col); r.material.uniforms.a.value = a; r.material.uniforms.w.value = o.w ?? .06; r.material.uniforms.wave.value = o.wave ?? 0;
  r.userData.face = o.face ?? 'cam';
  if (o.face && o.face !== 'cam') r.quaternion.setFromUnitVectors(V(0, 0, 1), o.face === 'up' ? V(0, 1, 0) : o.face);
}
// emitter: periodic expanding rings
function emit(pos, t, o = {}) {
  const per = o.per ?? .6, life = o.life ?? 1.8, R = o.R ?? 1, n = Math.ceil(life / per) + 1;
  for (let i = 0; i < n; i++) {
    const age = ((t - (o.ph ?? 0)) % per + per) % per + i * per; if (age > life) continue;
    const k = age / life; ring(pos, R * (.08 + k), o.col ?? COL.cyan, (o.a ?? 1) * Math.pow(1 - k, 1.4) * Math.min(1, k * 8), o);
  }
}
const beamGeo = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true);
const beamPool = [];
for (let i = 0; i < 90; i++) {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    uniforms: { col: { value: new THREE.Color() }, a: { value: 1 }, t: { value: 0 }, n: { value: 6 }, cut: { value: 0 }, grow: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec2 vUv; uniform vec3 col; uniform float a, t, n, cut, grow;
      void main(){ float y = 1.-vUv.y; if (y > grow) discard;
        float p = .35 + .65*pow(.5+.5*sin((y*n - t)*6.2832), 6.);
        float gap = cut*(1.-smoothstep(.0,.04,abs(y-.5)-cut*.12));
        gl_FragColor = vec4(col*p*a*(1.-gap), 1.); }`,
  });
  const b = new THREE.Mesh(beamGeo, m); b.visible = false; b.frustumCulled = false; b.renderOrder = 4; scene.add(b); beamPool.push(b);
}
let beamN = 0;
// beam(a, b, radius, color, alpha, {t, n, cut, grow})
function beam(a, b, rad, col, al, o = {}) {
  if (beamN >= beamPool.length || al <= .002) return;
  const m = beamPool[beamN++]; m.visible = true; const d = b.clone().sub(a), len = d.length();
  m.position.copy(a).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); m.scale.set(rad, len, rad);
  const u = m.material.uniforms; u.col.value.set(col); u.a.value = al; u.t.value = o.t ?? 0; u.n.value = o.n ?? 6; u.cut.value = o.cut ?? 0; u.grow.value = o.grow ?? 1;
}

// ───────── ground (city lights + cell towers) ─────────
const ground = new THREE.Group(); scene.add(ground);
{
  const [c, g] = cnv(2048, 2048); const r = rndGen(23); g.imageSmoothingEnabled = false;
  g.fillStyle = '#04070d'; g.fillRect(0, 0, 2048, 2048);
  g.strokeStyle = 'rgba(22,139,255,.22)'; g.lineWidth = 2;
  for (let i = 0; i < 26; i++) { g.beginPath(); let x = r() * 2048, y = r() * 2048; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (r() - .5) * 600; y += (r() - .5) * 600; g.lineTo(x, y); } g.stroke(); }
  for (let cl = 0; cl < 70; cl++) {
    const cx = r() * 2048, cy = r() * 2048, rad = 30 + r() * 140, n = 120 + r() * 500;
    for (let i = 0; i < n; i++) { const a = r() * 6.283, d = Math.pow(r(), 1.8) * rad; g.fillStyle = r() < .7 ? `rgba(255,214,160,${.5 + r() * .5})` : `rgba(140,205,255,${.5 + r() * .5})`; g.fillRect(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 4, 4); }
  }
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshBasicMaterial({ map: t, color: 0xffffff }));
  plane.rotation.x = -Math.PI / 2; ground.add(plane); ground.userData.plane = plane;
}
const towerM = new THREE.MeshStandardMaterial({ color: 0x8ea0ba, metalness: .8, roughness: .35 });
function makeTower() {
  const g = new THREE.Group();
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(.35, 1.4, 40, 3, 8, true), new THREE.MeshStandardMaterial({ color: 0x9fb2cc, metalness: .8, roughness: .4, wireframe: true }));
  mast.position.y = 20; g.add(mast);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.18, .3, 40, 8), towerM); pole.position.y = 20; g.add(pole);
  for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new RoundedBoxGeometry(.7, 3, .25, 2, .08), new THREE.MeshStandardMaterial({ color: 0xe7edf5, roughness: .4 })); const a = i * 2.094; p.position.set(Math.cos(a) * .9, 37.5, Math.sin(a) * .9); p.rotation.y = -a + Math.PI / 2; g.add(p); }
  const tip = new THREE.Sprite(new THREE.SpriteMaterial({ map: DOT, color: COL.cyan, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); tip.scale.setScalar(5); tip.position.y = 41; g.add(tip);
  g.userData.top = V(0, 38, 0); return g;
}
const towers = [];
{
  const r = rndGen(41);
  for (let i = 0; i < 46; i++) { const tw = makeTower(); const a = r() * 6.283, d = 60 + Math.pow(r(), .8) * 900; tw.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); tw.rotation.y = r() * 6; ground.add(tw); towers.push(tw); }
}

// ───────── cabin ─────────
const cabin = new THREE.Group(); scene.add(cabin);
const CAB = { rows: [], seats: [], phones: [], pax: [] };
{
  const RIN = 1.95, LEN = 34;
  const [c, g] = cnv(2048, 512);
  g.fillStyle = '#6c7788'; g.fillRect(0, 0, 2048, 512);
  for (let x = 0; x < 2048; x += 2048 / 40) { g.fillStyle = 'rgba(80,95,120,.25)'; g.fillRect(x, 0, 2, 512); }
  const [ec, eg2] = cnv(2048, 512); eg2.fillStyle = '#000'; eg2.fillRect(0, 0, 2048, 512);
  for (const vy of [.23, .77]) for (let x = 20; x < 2048; x += 2048 / 40) {
    rrect(g, x, vy * 512 - 22, 26, 40, 11); g.fillStyle = '#9aa6b6'; g.fill(); rrect(g, x + 4, vy * 512 - 17, 18, 30, 8); g.fillStyle = '#071226'; g.fill();
    rrect(eg2, x + 4, vy * 512 - 17, 18, 30, 8); eg2.fillStyle = '#0c2a5a'; eg2.fill();
  }
  const shellGeo = tubeGeo(40, 64, (s, th) => V(-LEN / 2 + LEN * s, RIN * Math.cos(th), RIN * Math.sin(th)));
  const shell = new THREE.Mesh(shellGeo, new THREE.MeshStandardMaterial({ map: tex(c), emissiveMap: tex(ec), emissive: 0xffffff, emissiveIntensity: 1.5, roughness: .7, side: THREE.BackSide }));
  cabin.add(shell);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(LEN, 3.4), new THREE.MeshStandardMaterial({ color: 0x1a2232, roughness: .9 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -.95; cabin.add(floor);
  const aisle = new THREE.Mesh(new THREE.PlaneGeometry(LEN, .5), new THREE.MeshStandardMaterial({ color: 0x0f2a52, roughness: .9 })); aisle.rotation.x = -Math.PI / 2; aisle.position.y = -.94; cabin.add(aisle);
  for (const sz of [-1, 1]) {   // aisle floor path lights
    const strip = new THREE.Mesh(new THREE.BoxGeometry(LEN, .02, .03), new THREE.MeshBasicMaterial({ color: COL.blue, toneMapped: false })); strip.position.set(0, -.93, .27 * sz); cabin.add(strip);
    const bin = new THREE.Mesh(new RoundedBoxGeometry(LEN, .45, .65, 3, .12), new THREE.MeshStandardMaterial({ color: 0x8792a3, roughness: .5 })); bin.position.set(0, 1.12, 1.18 * sz); bin.rotation.x = .28 * sz; cabin.add(bin);
    const led = new THREE.Mesh(new THREE.BoxGeometry(LEN, .03, .05), new THREE.MeshBasicMaterial({ color: COL.cyan, toneMapped: false })); led.position.set(0, .86, .82 * sz); cabin.add(led);
    const cove = new THREE.Mesh(new THREE.BoxGeometry(LEN, .025, .04), new THREE.MeshBasicMaterial({ color: COL.blue, toneMapped: false })); cove.position.set(0, 1.62, .5 * sz); cabin.add(cove);
  }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(LEN, 1.1), new THREE.MeshStandardMaterial({ color: 0x55606e, roughness: .6, emissive: 0x0b2a55, emissiveIntensity: .8 })); ceil.rotation.x = Math.PI / 2; ceil.position.y = 1.72; cabin.add(ceil);
  // seats (instanced)
  const xs = []; for (let x = -14; x <= 13; x += .82) xs.push(x);
  const zs = [-1.42, -.97, -.52, .52, .97, 1.42];
  const n = xs.length * zs.length;
  const seatFab = new THREE.MeshStandardMaterial({ color: 0x1c2d4c, roughness: .85 });
  const cush = new THREE.InstancedMesh(new RoundedBoxGeometry(.46, .14, .44, 3, .05), seatFab, n);
  const back = new THREE.InstancedMesh(new RoundedBoxGeometry(.12, .74, .44, 3, .05), seatFab, n);
  const head = new THREE.InstancedMesh(new RoundedBoxGeometry(.13, .2, .4, 3, .05), new THREE.MeshStandardMaterial({ color: 0x7f93b0, roughness: .8 }), n);
  const scr = new THREE.InstancedMesh(new THREE.PlaneGeometry(.2, .13), new THREE.MeshBasicMaterial({ color: 0x0d2e5c, toneMapped: false }), n);
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S1 = V(1, 1, 1);
  let i = 0;
  const bustGeoP = new THREE.LatheGeometry([[0, 0], [.2, 0], [.22, .15], [.2, .32], [.12, .42], [.06, .46], [.055, .52], [0, .52]].map(([a, b]) => new THREE.Vector2(a, b)), 24);
  const paxBody = new THREE.InstancedMesh(bustGeoP, new THREE.MeshStandardMaterial({ roughness: .8 }), n);
  const paxHead = new THREE.InstancedMesh(new THREE.SphereGeometry(.105, 20, 14), new THREE.MeshStandardMaterial({ roughness: .55 }), n);
  const phoneI = new THREE.InstancedMesh(new THREE.BoxGeometry(.012, .15, .075), new THREE.MeshBasicMaterial({ color: 0xbfe2ff, toneMapped: false }), n);
  const r = rndGen(9); let pi = 0;
  const cloth = [0x2a2f3a, 0x3b4252, 0x1f3550, 0x4a3a32, 0x5a5f6a, 0x23262d, 0x6b4a3a];
  const skins = [0xc99b7a, 0x8a5a3c, 0xe0b899, 0xa8714d, 0x6b4430, 0xd9a888];
  for (const x of xs) for (const z of zs) {
    Q.identity(); M4.compose(V(x, -.52, z), Q, S1); cush.setMatrixAt(i, M4);
    Q.setFromAxisAngle(V(0, 0, 1), -.12); M4.compose(V(x - .24, -.1, z), Q, S1); back.setMatrixAt(i, M4);
    M4.compose(V(x - .29, .3, z), Q, S1); head.setMatrixAt(i, M4);
    Q.setFromAxisAngle(V(0, 1, 0), Math.PI / 2); const q2 = Q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), -.12)); M4.compose(V(x - .17, .05, z), q2, S1); scr.setMatrixAt(i, M4);
    const occ = r() < .82;
    if (occ) {
      Q.identity(); M4.compose(V(x - .02, -.45, z), Q, V(.95, 1.05 + r() * .15, .95)); paxBody.setMatrixAt(pi, M4); paxBody.setColorAt(pi, new THREE.Color(cloth[Math.floor(r() * cloth.length)]));
      M4.compose(V(x - .02, .2 + r() * .05, z), Q, S1); paxHead.setMatrixAt(pi, M4); paxHead.setColorAt(pi, new THREE.Color(skins[Math.floor(r() * skins.length)]));
      Q.setFromAxisAngle(V(0, 0, 1), .9); M4.compose(V(x + .2, -.12, z + (r() - .5) * .1), Q, S1); phoneI.setMatrixAt(pi, M4);
      CAB.phones.push(V(x + .21, -.08, z)); CAB.pax.push(V(x, .2, z)); pi++;
    }
    i++;
  }
  paxBody.count = paxHead.count = phoneI.count = pi;
  for (const m of [cush, back, head, scr, paxBody, paxHead, phoneI]) cabin.add(m);
  CAB.phoneI = phoneI; CAB.xs = xs; CAB.zs = zs;
  const tray = new THREE.Mesh(new RoundedBoxGeometry(.3, .025, .4, 2, .01), new THREE.MeshStandardMaterial({ color: 0x2a3446, roughness: .6 })); tray.visible = false; cabin.add(tray); CAB.tray = tray;
  // overhead sign panel above the aisle: seatbelt + phone-in-airplane-mode icons
  const [sc, sg] = cnv(512, 160);
  sg.fillStyle = '#0a1220'; rrect(sg, 0, 0, 512, 160, 30); sg.fill();
  sg.fillStyle = '#F4F7FB'; sg.strokeStyle = '#F4F7FB'; sg.lineWidth = 9;
  // seatbelt glyph
  sg.beginPath(); sg.arc(130, 80, 42, 0, 6.283); sg.stroke(); sg.fillRect(78, 72, 104, 16); sg.fillStyle = '#0a1220'; sg.fillRect(118, 66, 24, 28); sg.fillStyle = '#F4F7FB';
  // phone + plane glyph
  rrect(sg, 330, 26, 66, 110, 12); sg.lineWidth = 8; sg.stroke(); planeGlyph(sg, 363, 81, 56, .0);
  const signTex = tex(sc);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(.64, .2), new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false, color: 0x6f7c8f }));
  sign.rotation.y = -Math.PI / 2; sign.position.set(4, 1.5, 0); cabin.add(sign); CAB.sign = sign;
  const signs = []; for (let x = -12; x <= 12; x += 4) { const s2 = sign.clone(); s2.material = sign.material; s2.position.x = x; cabin.add(s2); signs.push(s2); } CAB.signs = signs;
}

// ───────── cockpit ─────────
const cockpit = new THREE.Group(); scene.add(cockpit);
const PFD = cnv(512, 512), ND = cnv(512, 512);
const pfdTex = tex(PFD[0]), ndTex = tex(ND[0]);
{
  const shellM = new THREE.MeshStandardMaterial({ color: 0x1b2230, roughness: .75, metalness: .2 });
  const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); cockpit.add(o); return o; };
  // main panel (front face at x = 1.175, facing the camera at -x)
  add(new RoundedBoxGeometry(.35, .55, 2.3, 3, .04), shellM, 1.35, -.28, 0);
  add(new RoundedBoxGeometry(.55, .09, 2.4, 3, .04), shellM, 1.3, .03, 0);            // glareshield
  for (let i = 0; i < 4; i++) {
    const z = [-.84, -.33, .33, .84][i];
    add(new THREE.PlaneGeometry(.4, .4), new THREE.MeshBasicMaterial({ map: i % 2 ? ndTex : pfdTex, toneMapped: false }), 1.168, -.27, z, 0, -Math.PI / 2, 0);
  }
  add(new RoundedBoxGeometry(.9, .3, .45, 3, .05), shellM, .75, -.68, 0);             // pedestal
  for (const z of [-.08, .08]) add(new RoundedBoxGeometry(.06, .2, .04, 2, .015), new THREE.MeshStandardMaterial({ color: 0xc8d0dc, metalness: .8, roughness: .3 }), .7, -.46, z, 0, 0, .4);
  const frameM = new THREE.MeshStandardMaterial({ color: 0x252d3c, roughness: .6 });
  for (const z of [-1.05, 0, 1.05]) add(new THREE.BoxGeometry(.06, .8, .06), frameM, 1.32, .45, z, 0, 0, -.25);
  add(new THREE.BoxGeometry(.5, .06, 2.4), frameM, 1.2, .84, 0);
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(1.8, 2.2, .06), shellM, .4, 0, 1.25 * s);
  add(new THREE.BoxGeometry(1.8, .06, 2.6), shellM, .4, .88, 0);                     // roof
  add(new THREE.BoxGeometry(1.8, .06, 2.6), shellM, .4, -.9, 0);                     // floor
  // seats + headsets
  const seatM = new THREE.MeshStandardMaterial({ color: 0x2b3446, roughness: .8 });
  const cupM = new THREE.MeshPhysicalMaterial({ color: 0x11151c, roughness: .4, metalness: .3, clearcoat: .6 });
  CAB.headsets = [];
  for (const s of [-1, 1]) {
    add(new RoundedBoxGeometry(.18, .95, .6, 4, .08), seatM, -.1, -.25, .62 * s, 0, 0, -.1);
    add(new RoundedBoxGeometry(.16, .28, .4, 4, .08), seatM, -.15, .38, .62 * s, 0, 0, -.1);
    const hs = new THREE.Group(); hs.position.set(-.02, .38, .62 * s); cockpit.add(hs);
    const band = new THREE.Mesh(new THREE.TorusGeometry(.13, .016, 10, 40, Math.PI), cupM); band.rotation.y = Math.PI / 2; hs.add(band);
    for (const k of [-1, 1]) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(.065, .065, .05, 32), cupM); cup.rotation.x = Math.PI / 2; cup.position.z = .13 * k; hs.add(cup);
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(.066, .006, 8, 32), new THREE.MeshBasicMaterial({ color: COL.blue, toneMapped: false })); ring2.position.z = .13 * k + .026 * k; hs.add(ring2); }
    const mic = new THREE.Mesh(new THREE.TorusGeometry(.1, .006, 6, 20, 1.4), cupM); mic.position.set(.04, -.08, .13); mic.rotation.set(0, 0, -1.2); hs.add(mic);
    CAB.headsets.push(hs);
  }
}
const ckL1 = new THREE.PointLight(0x59c7ff, 2.5, 4, 1.5); ckL1.position.set(.9, .25, 0); cockpit.add(ckL1);
const ckL2 = new THREE.PointLight(0x9fc8ff, 1.6, 3, 1.5); ckL2.position.set(-.5, .85, .3); cockpit.add(ckL2);
let navGlitch = 0;
function drawAvionics(t) {
  const [c, g] = PFD;
  g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512);
  g.save(); g.translate(256, 256); g.rotate(Math.sin(t * .4) * .05 + (navGlitch ? (Math.random() - .5) * .3 * navGlitch : 0));
  g.fillStyle = '#1f6fd6'; g.fillRect(-400, -400, 800, 400 + Math.sin(t * .3) * 10); g.fillStyle = '#7a4a24'; g.fillRect(-400, Math.sin(t * .3) * 10, 800, 400);
  g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(-400, Math.sin(t * .3) * 10); g.lineTo(400, Math.sin(t * .3) * 10); g.stroke();
  for (let k = -3; k <= 3; k++) if (k) { g.beginPath(); g.moveTo(-40 + Math.abs(k) * 5, k * 32); g.lineTo(40 - Math.abs(k) * 5, k * 32); g.stroke(); }
  g.restore();
  g.strokeStyle = '#ffd60a'; g.lineWidth = 8; g.beginPath(); g.moveTo(160, 256); g.lineTo(230, 256); g.lineTo(245, 270); g.moveTo(352, 256); g.lineTo(282, 256); g.lineTo(267, 270); g.stroke();
  g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(10, 100, 80, 312); g.fillRect(422, 100, 80, 312);
  g.fillStyle = '#fff'; g.font = '700 30px PlexLatin'; g.fillText('280', 18, 265); g.fillText('350', 428, 265);
  const [c2, g2] = ND;
  g2.fillStyle = '#000'; g2.fillRect(0, 0, 512, 512);
  g2.strokeStyle = '#fff'; g2.lineWidth = 3; g2.beginPath(); g2.arc(256, 440, 360, Math.PI * 1.18, Math.PI * 1.82); g2.stroke();
  for (let a = 0; a < 36; a++) { const ang = Math.PI * 1.18 + a * (Math.PI * .64 / 36); g2.beginPath(); g2.moveTo(256 + Math.cos(ang) * 360, 440 + Math.sin(ang) * 360); g2.lineTo(256 + Math.cos(ang) * 340, 440 + Math.sin(ang) * 340); g2.stroke(); }
  g2.strokeStyle = '#ff5aa8'; g2.lineWidth = 5; g2.beginPath(); g2.moveTo(256, 440); g2.lineTo(256 + Math.sin(t * .2) * 40, 120); g2.lineTo(330, 40); g2.stroke();
  g2.fillStyle = '#59C7FF'; for (let k = 0; k < 5; k++) { g2.beginPath(); g2.arc(150 + k * 60, 200 + (k % 2) * 80, 8, 0, 6.283); g2.fill(); }
  g2.fillStyle = '#fff'; g2.beginPath(); g2.moveTo(256, 420); g2.lineTo(240, 455); g2.lineTo(272, 455); g2.fill();
  if (navGlitch > 0) {   // interference: noise bars over the displays
    for (const gg of [g, g2]) for (let k = 0; k < 18 * navGlitch; k++) { gg.fillStyle = `rgba(${Math.random() < .5 ? '89,199,255' : '255,255,255'},${.3 + Math.random() * .5})`; gg.fillRect(0, Math.random() * 512, 512, 2 + Math.random() * 10); }
  }
  pfdTex.needsUpdate = ndTex.needsUpdate = true;
}

// ───────── phone ─────────
const PW = .0715, PH = .147, PD = .0078;
const phoneRig = new THREE.Group(); scene.add(phoneRig);
const phoneG = new THREE.Group(); phoneRig.add(phoneG);
const [uiC, ug] = cnv(720, 1480); const uiTex = tex(uiC);
{
  const bodyGeo = new THREE.ExtrudeGeometry(rshape(PW - .002, PH - .002, .0105), { depth: PD - .002, bevelEnabled: true, bevelThickness: .001, bevelSize: .001, bevelSegments: 4, curveSegments: 16 });
  bodyGeo.translate(0, 0, -(PD - .002) / 2);
  const frame = new THREE.Mesh(bodyGeo, new THREE.MeshPhysicalMaterial({ color: 0x8b96a8, metalness: 1, roughness: .28 })); phoneG.add(frame);
  const back = new THREE.Mesh(new THREE.ShapeGeometry(rshape(PW - .003, PH - .003, .0098), 16), new THREE.MeshPhysicalMaterial({ color: 0x0d1a33, roughness: .35, clearcoat: 1, clearcoatRoughness: .05 })); back.position.z = -PD / 2 - .0002; back.rotation.y = Math.PI; phoneG.add(back);
  const bump = new THREE.Mesh(new RoundedBoxGeometry(.031, .031, .0024, 4, .0011), new THREE.MeshPhysicalMaterial({ color: 0x122244, roughness: .2, clearcoat: 1 })); bump.position.set(-PW / 2 + .021, PH / 2 - .021, -PD / 2 - .001); phoneG.add(bump);
  for (const [x, y] of [[-.0065, .0065], [-.0065, -.0065], [.0065, 0]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.0048, .0048, .0016, 32), new THREE.MeshPhysicalMaterial({ color: 0x05070a, metalness: .6, roughness: .1, clearcoat: 1 })); l.rotation.x = Math.PI / 2; l.position.set(bump.position.x + x, bump.position.y + y, -PD / 2 - .0026); phoneG.add(l); }
  const scrGeo = new THREE.ShapeGeometry(rshape(PW - .0042, PH - .0042, .0092), 16);
  { const p = scrGeo.attributes.position, uv = scrGeo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (PW - .0042) + .5, p.getY(i) / (PH - .0042) + .5); }
  const screen = new THREE.Mesh(scrGeo, new THREE.MeshBasicMaterial({ map: uiTex, toneMapped: false })); screen.position.z = PD / 2 + .0001; phoneG.add(screen);
  phoneG.userData.screen = screen;
}
const phoneLight = new THREE.PointLight(0x7fc0ff, 0, .6, 2); phoneLight.position.set(0, 0, .05); phoneG.add(phoneLight);
let uiKey = '';
// UI state: { lock, bars (0..4), plane (0..1 toggle), cc (0..1 control-centre slide), search, power (0..1), glow }
function setUI(st) {
  const key = JSON.stringify(st); if (key === uiKey) return; uiKey = key;
  const g = ug, Wd = 720, Hd = 1480, pw = st.power ?? 1;
  const bgG = g.createLinearGradient(0, 0, Wd, Hd); bgG.addColorStop(0, '#0a1a3a'); bgG.addColorStop(.55, '#0c3a7a'); bgG.addColorStop(1, '#080B12');
  g.fillStyle = bgG; g.fillRect(0, 0, Wd, Hd);
  for (let i = 0; i < 7; i++) { g.strokeStyle = `rgba(89,199,255,${.08 + i * .02})`; g.lineWidth = 3; g.beginPath(); g.arc(360, 1500, 300 + i * 120, Math.PI, 2 * Math.PI); g.stroke(); }
  // status bar
  g.fillStyle = '#F4F7FB'; g.font = '600 40px PlexLatin'; g.textBaseline = 'middle'; g.fillText('9:41', 70, 70);
  rrect(g, 270, 40, 180, 56, 28); g.fillStyle = '#000'; g.fill();   // island
  const pl = st.plane ?? 0;
  if (pl > .5) { g.fillStyle = '#FF9F0A'; planeGlyph(g, 520, 70, 42, Math.PI / 2); }
  else {
    const bars = st.bars ?? 4;
    for (let i = 0; i < 4; i++) { g.fillStyle = i < bars ? '#F4F7FB' : 'rgba(244,247,251,.3)'; rrect(g, 498 + i * 13, 82 - (i + 1) * 9, 9, (i + 1) * 9, 2); g.fill(); }
    if (st.search) { g.font = '500 22px PlexLatin'; g.fillStyle = '#F4F7FB'; g.fillText('SOS', 440, 72); }
  }
  rrect(g, 575, 55, 62, 30, 9); g.strokeStyle = 'rgba(244,247,251,.7)'; g.lineWidth = 3; g.stroke(); rrect(g, 579, 59, 44, 22, 5); g.fillStyle = '#F4F7FB'; g.fill();
  if (st.lock) {
    g.textAlign = 'center'; g.font = '500 36px PlexLatin'; g.fillStyle = 'rgba(244,247,251,.85)'; g.fillText('Tuesday, 17 October', 360, 250);
    g.font = '700 200px PlexLatin'; g.fillStyle = '#F4F7FB'; g.fillText('9:41', 360, 390); g.textAlign = 'left';
    if (st.note) { rrect(g, 40, 560, 640, 150, 40); g.fillStyle = 'rgba(244,247,251,.16)'; g.fill(); g.fillStyle = '#F4F7FB'; g.font = '700 32px Plex'; g.textAlign = 'right'; g.direction = 'rtl'; g.fillText(st.note, 640, 610); g.font = '400 28px Plex'; g.fillStyle = 'rgba(244,247,251,.8)'; g.fillText(st.note2 || '', 640, 660); g.textAlign = 'left'; g.direction = 'ltr'; }
  }
  const cc = st.cc ?? 0;
  if (cc > 0) {
    g.fillStyle = `rgba(4,8,16,${.75 * cc})`; g.fillRect(0, 0, Wd, Hd);
    g.save(); g.translate(0, (1 - cc) * -200); g.globalAlpha = cc;
    const tile = (x, y, on, col, glyph) => { rrect(g, x, y, 130, 130, 36); g.fillStyle = on ? col : 'rgba(244,247,251,.16)'; g.fill(); g.fillStyle = on ? '#fff' : '#F4F7FB'; glyph(x + 65, y + 65); };
    rrect(g, 60, 200, 300, 300, 56); g.fillStyle = 'rgba(244,247,251,.12)'; g.fill();
    tile(78, 218, pl > .5, '#FF9F0A', (x, y) => planeGlyph(g, x, y, 70, Math.PI / 4));
    tile(212, 218, pl <= .5, '#30D158', (x, y) => { for (let i = 0; i < 4; i++) { g.fillRect(x - 30 + i * 17, y + 26 - (i + 1) * 13, 11, (i + 1) * 13); } });
    tile(78, 352, true, '#168BFF', (x, y) => { g.lineWidth = 9; g.strokeStyle = '#fff'; for (let i = 1; i <= 3; i++) { g.beginPath(); g.arc(x, y + 22, i * 15, Math.PI * 1.25, Math.PI * 1.75); g.stroke(); } });
    tile(212, 352, true, '#168BFF', (x, y) => { g.font = '700 60px PlexLatin'; g.textAlign = 'center'; g.fillText('ᛒ', x, y + 4); g.textAlign = 'left'; });
    rrect(g, 380, 200, 280, 300, 56); g.fillStyle = 'rgba(244,247,251,.12)'; g.fill();
    g.fillStyle = '#F4F7FB'; g.font = '600 34px PlexLatin'; g.fillText(pl > .5 ? 'Airplane Mode' : 'Cellular', 400, 560);
    g.font = '500 28px PlexLatin'; g.fillStyle = pl > .5 ? '#FF9F0A' : '#30D158'; g.fillText(pl > .5 ? 'On' : 'Connected', 400, 600);
    g.restore();
  }
  if (st.glow) { g.fillStyle = `rgba(89,199,255,${st.glow * .35})`; g.fillRect(0, 0, Wd, Hd); }
  if (pw < 1) { g.fillStyle = `rgba(0,0,0,${1 - pw})`; g.fillRect(0, 0, Wd, Hd); }
  uiTex.needsUpdate = true;
}
function phoneAt(pos, rx = 0, ry = 0, rz = 0, s = 1) { phoneRig.visible = true; phoneRig.position.copy(pos); phoneRig.rotation.set(rx, ry, rz); phoneRig.scale.setScalar(s); phoneRig.updateMatrixWorld(true); }
const phonePt = (u, v, lift = 0) => phoneG.localToWorld(V((u - .5) * PW, (.5 - v) * PH, PD / 2 + lift));

// ───────── studio / hangar ─────────
const studio = new THREE.Group(); scene.add(studio);
{
  const [c, g] = cnv(1024, 1024); g.fillStyle = '#05080e'; g.fillRect(0, 0, 1024, 1024);
  g.strokeStyle = 'rgba(22,139,255,.35)'; g.lineWidth = 2; for (let i = 0; i <= 1024; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 1024); g.moveTo(0, i); g.lineTo(1024, i); g.stroke(); }
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(20, 20);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: t, roughness: .22, metalness: .6, color: 0xffffff })); floor.rotation.x = -Math.PI / 2; studio.add(floor); studio.userData.floor = floor;
  const bars = new THREE.Group(); studio.add(bars); studio.userData.bars = bars;
  for (let i = -5; i <= 5; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(60, .3, .6), new THREE.MeshBasicMaterial({ color: 0xbfe0ff, toneMapped: false })); b.position.set(0, 26, i * 9); bars.add(b); }
}
const sweep = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
  uniforms: { a: { value: 1 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: 'varying vec2 vUv; uniform float a; void main(){ float g = smoothstep(.5,.0,abs(vUv.x-.5)); float l = smoothstep(.04,0.,abs(vUv.x-.5)); float gr = step(.9, fract(vUv.y*40.))*.4; gl_FragColor = vec4(vec3(.35,.78,1.)*(g*.18+l*1.4+gr*g*.3)*a,1.); }',
}));
sweep.rotation.y = Math.PI / 2; scene.add(sweep);

// ───────── hologram busts (sound analogy) ─────────
const holo = new THREE.Group(); scene.add(holo);
const bustM = holoM.clone(); bustM.uniforms = THREE.UniformsUtils.clone(holoM.uniforms);
const bustGeo = (() => {
  const prof = [[0, 0], [.42, 0], [.46, .12], [.44, .3], [.3, .45], [.12, .52], [.1, .6], [.1, .7], [0, .7]].map(([a, b]) => new THREE.Vector2(a, b));
  const g = new THREE.LatheGeometry(prof, 48); g.scale(1, 1, .6); return g;
})();
function makeBust() {
  const b = new THREE.Group();
  const torso = new THREE.Mesh(bustGeo, bustM); b.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.2, 40, 30), bustM); head.scale.set(.86, 1.08, .92); head.position.y = .9; b.add(head);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(.035, .08, 12), bustM); nose.rotation.z = -Math.PI / 2; nose.position.set(.19, .9, 0); b.add(nose);
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.TorusGeometry(.04, .014, 8, 20), bustM); ear.position.set(-.01, .9, .175 * s); b.add(ear); }
  b.userData = { mouth: V(.2, .84, 0), ear: V(0, .9, .19) };
  holo.add(b); return b;
}
const busts = [makeBust(), makeBust(), makeBust()];
const holoTower = makeTower(); holoTower.traverse(o => { if (o.isMesh) o.material = bustM; }); holoTower.scale.setScalar(.06); holo.add(holoTower);

// ───────── post: bloom + grade (zoom-blur, CA, vignette, grain, flash, glitch, rewind) ─────────
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
composer.setPixelRatio(1); composer.setSize(W, H);
const rp = new RenderPass(scene, cam); composer.addPass(rp);
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), .5, .6, .8); composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, t: { value: 0 }, zb: { value: 0 }, ca: { value: .0015 }, vig: { value: .5 }, grain: { value: .045 }, flash: { value: 0 }, tint: { value: V(1, 1, 1) }, sat: { value: 1.05 }, glitch: { value: 0 }, rew: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float t, zb, ca, vig, grain, flash, sat, glitch, rew; uniform vec3 tint; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec2 uv = vUv;
      float band = floor(uv.y*38. + floor(t*24.)*7.);
      float gk = glitch*step(1.-glitch*.5, h(vec2(band, floor(t*24.))));
      uv.x += (h(vec2(band, 3.+floor(t*24.)))-.5)*.08*gk;
      uv.x += rew*.012*sin(uv.y*90.+t*60.);
      vec2 c = vec2(.5), d = uv-c; vec3 col = vec3(0.);
      float n = zb > .001 ? 10. : 1.;
      for (float i = 0.; i < 10.; i++) { if (i >= n) break; float s = 1. - zb*i/10.*.12; vec2 q = c + d*s; float k = (ca + glitch*.006 + rew*.004)*(1.+zb*6.)*length(d)*2. + gk*.01;
        col += vec3(texture2D(tDiffuse, q + d*k + vec2(gk*.01,0.)).r, texture2D(tDiffuse, q).g, texture2D(tDiffuse, q - d*k - vec2(gk*.01,0.)).b); }
      col /= n;
      col *= tint;
      float l = dot(col, vec3(.299,.587,.114)); col = mix(vec3(l), col, sat);
      col *= 1. - vig*smoothstep(.35, 1.0, length(d*vec2(1.,.62))*1.6);
      col += (h(floor(vUv*vec2(1080.,1920.)) + fract(t*7.)*100.) - .5)*grain;
      if (rew > 0.) { float sl = step(.97, fract(vUv.y*6. - t*3.)); col = mix(col, vec3(.6,.85,1.)*l, rew*.35) + sl*rew*.25; col += (h(vUv*vec2(300.,1.)+t)-.5)*rew*.12; }
      col = mix(col, vec3(.85,.95,1.), flash);
      gl_FragColor = vec4(col, 1.);
    }`,
});
composer.addPass(grade);

// ───────── public API used by timeline.js ─────────
const STAGES = { sky: skyStage, ground, cabin, cockpit, studio, holo };
function reset() {
  for (const s of Object.values(STAGES)) s.visible = false;
  jet.visible = false; jetHolo(false); gear.visible = false; holoTower.visible = false; avionics.visible = false; phoneRig.visible = false; sweep.visible = false; sky.visible = false;
  for (const b of busts) b.visible = false;
  for (const r of ringPool) r.visible = false; ringN = 0;
  for (const b of beamPool) b.visible = false; beamN = 0;
  scene.fog = null; scene.background = new THREE.Color(COL.bg); scene.environment = ENV.studio; scene.environmentIntensity = 1;
  renderer.toneMappingExposure = 1; bloom.strength = .5; CAB.tray.visible = false; bloom.threshold = .8; bloom.radius = .6;
  cam.fov = 30; cam.near = .05; cam.far = 6000; cam.up.set(0, 1, 0);
  jet.position.set(0, 0, 0); jet.rotation.set(0, 0, 0); jet.scale.setScalar(1);
  phoneLight.intensity = 0; finLight.intensity = 0; moon.intensity = 0; hemi.intensity = 0;
  skyM.uniforms.glow.value = 1;
  holoM.uniforms.scan.value = -99; holoM.uniforms.k.value = 1;
  Object.assign(grade.uniforms.tint.value, { x: 1, y: 1, z: 1 });
  const G = grade.uniforms; G.zb.value = 0; G.flash.value = 0; G.sat.value = 1.05; G.vig.value = .5; G.ca.value = .0015; G.glitch.value = 0; G.rew.value = 0;
  for (const a of antennas) a.material.emissive?.set(0x000000);
  navGlitch = 0;
}
function stage(name, t) {
  STAGES[name].visible = true;
  if (name === 'sky') { renderer.toneMappingExposure = .85; bloom.threshold = .95; bloom.strength = .38; sky.visible = true; scene.environment = ENV.studio; scene.environmentIntensity = .35; scene.fog = new THREE.FogExp2(0x081830, .0006); moon.intensity = 1.5; hemi.intensity = .5; }
  if (name === 'ground') { sky.visible = true; scene.environment = ENV.studio; scene.environmentIntensity = .35; moon.intensity = 2.2; hemi.intensity = .6; scene.fog = new THREE.FogExp2(0x081428, .00055); }
  if (name === 'cabin') { scene.environment = ENV.studio; scene.environmentIntensity = .4; scene.background = new THREE.Color(0x02040a); scene.fog = new THREE.FogExp2(0x0a1424, .045); }
  if (name === 'cockpit') { sky.visible = true; skyStage.visible = true; scene.environment = ENV.studio; scene.environmentIntensity = .3; scene.fog = new THREE.FogExp2(0x081830, .0006); }
  if (name === 'studio') { scene.environment = ENV.studio; scene.environmentIntensity = .7; scene.fog = new THREE.FogExp2(COL.bg, .012); }
  if (name === 'holo') { scene.fog = null; scene.background = new THREE.Color(0x05080f); }
  skyM.uniforms.t.value = t; holoM.uniforms.t.value = t; bustM.uniforms.t.value = t;
}
function lookCam(pos, look, fov = 30, roll = 0) { cam.position.copy(pos); cam.fov = fov; cam.up.set(Math.sin(roll), Math.cos(roll), 0); cam.lookAt(look); cam.updateProjectionMatrix(); }
function project(v) { const p = v.clone().project(cam); return [(p.x * .5 + .5) * 1080, (-p.y * .5 + .5) * 1920, p.z < 1]; }
// nav-light blink (real double strobe pattern)
function navLights(t, k = 1) {
  const st = (t % 1.1 < .06 || (t % 1.1 > .14 && t % 1.1 < .2)) ? 1 : 0;
  NAV.s1.material.opacity = NAV.s2.material.opacity = st * k; NAV.tail.material.opacity = .7 * k;
  NAV.r.material.opacity = NAV.g.material.opacity = .9 * k; NAV.bcn.material.opacity = (Math.sin(t * 7) > .6 ? 1 : .1) * k;
  for (const s of [NAV.s1, NAV.s2]) s.scale.setScalar(1.6 + st * 3);
}

window.R3 = {
  THREE, V, scene, cam, renderer, jet, gear, holoTower, NAV, antennas, avionics, holoM, bustM, busts, clouds, towers, ground, cabin, CAB, cockpit, studio, sweep, phoneRig, phoneG, phoneLight, finLight,
  grade: grade.uniforms, bloom, sky: skyM.uniforms, COL,
  reset, stage, lookCam, project, ring, emit, beam, updClouds, setUI, phoneAt, phonePt, jetHolo, navLights, drawAvionics,
  set navGlitch(v) { navGlitch = v; },
};
window.G3 = {
  render(t) {
    const sh = (window.SHOTS || []).find(s => t >= s.s && t < s.e);
    canvas.style.opacity = sh ? 1 : 0;
    if (!sh) return;
    reset();
    grade.uniforms.t.value = t;
    sh.update(t - sh.s, t, sh);
    for (let i = 0; i < ringN; i++) if (ringPool[i].userData.face === 'cam') ringPool[i].quaternion.copy(cam.quaternion);
    const lt = t - sh.s;
    if (sh.after) sh.after(lt, t, sh);
    if (!sh.noPunch && sh.s > 0) grade.uniforms.zb.value = Math.max(grade.uniforms.zb.value, .9 * Math.max(0, 1 - lt / .16));
    composer.render();
  },
};
window.G3ready = true;
