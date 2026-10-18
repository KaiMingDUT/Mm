// KROZO — "Apple Watch green light" 3D world.
// Stages: studio (product shots: watch front/back, watch on a holo wrist), track (night running track: holo runner),
// body (holo figure: heart ↔ wrist). The wrist cross-section is a 2D canvas scene (xsec.js), not 3D.
// timeline.js owns the shot list; every frame we reset, the active shot poses the world, then we render.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

await Promise.all(['700 150px PlexLatin', '500 40px PlexLatin', '700 40px Plex', '500 30px Plex'].map(f => document.fonts.load(f)));
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
const COL = { bg: 0x080B12, blue: 0x168BFF, cyan: 0x59C7FF, ink: 0xF4F7FB, gray: 0xA7B1C2, led: 0x3BFF8A };
const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const tex = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function rnd(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function softDot() { const [c, g] = cnv(128, 128); const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,255,255,.6)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return tex(c); }
const DOT = softDot();

// ───────── environments ─────────
const pm = new THREE.PMREMGenerator(renderer);
const ENV = { room: pm.fromScene(new RoomEnvironment(), .04).texture };
{ // product env: dark room + soft boxes (white top, blue left, cyan right) → classy reflections on glass and aluminium
  const es = new THREE.Scene(); es.background = new THREE.Color(0x020306);
  const box = (w, h, col, k, pos) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide })); m.position.copy(pos); m.lookAt(0, 0, 0); es.add(m); };
  box(4, 1.2, 0xffffff, 2.4, V(0, 4, 1)); box(1, 5, 0x168bff, 2.6, V(-4, 1, -1)); box(1, 5, 0x59c7ff, 1.6, V(4, 1, -1.5)); box(3, .5, 0xffffff, 1.0, V(0, .6, 4)); box(2, .4, 0xffffff, .6, V(0, -3, 2));
  ENV.product = pm.fromScene(es, .02).texture;
}

// hologram material (fresnel rim + scan lines) with an optional green "LED glow" spot (the light leaking onto the skin)
function holo(col = COL.blue, rim = COL.cyan, k = 1) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    uniforms: { t: { value: 0 }, k: { value: k }, col: { value: new THREE.Color(col) }, rim: { value: new THREE.Color(rim) },
      gp: { value: V(0, 0, 0) }, gr: { value: .03 }, ga: { value: 0 }, sc: { value: 14 } },
    vertexShader: 'varying vec3 vN, vV, vW; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); vV = normalize(-mv.xyz); vW = (modelMatrix*vec4(position,1.)).xyz; gl_Position = projectionMatrix*mv; }',
    fragmentShader: `varying vec3 vN, vV, vW; uniform float t, k, gr, ga, sc; uniform vec3 col, rim, gp;
      void main(){ float f = pow(1.-abs(dot(normalize(vN), normalize(vV))), 2.);
        float lines = smoothstep(.9,1.,abs(sin(vW.y*sc+t*2.)))*.18;
        vec3 c = col*(.07+f*.7+lines) + rim*f*f*.8;
        float g = exp(-pow(length(vW-gp)/gr, 2.))*ga;
        c += vec3(.23,1.,.54)*g*.7;
        gl_FragColor = vec4(c*k, 1.); }`,
  });
}
const HOLO = [];
const mkHolo = (...a) => { const m = holo(...a); HOLO.push(m); return m; };

// glow sprites pool
const sprPool = [];
for (let i = 0; i < 80; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: DOT, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); s.visible = false; s.renderOrder = 7; scene.add(s); sprPool.push(s); }
let sprN = 0;
function glow(pos, size, col, a = 1) { if (sprN >= sprPool.length || a <= .002) return; const s = sprPool[sprN++]; s.visible = true; s.position.copy(pos); s.scale.setScalar(size); s.material.color.set(col); s.material.opacity = a; }
// expanding rings (camera-facing) — heartbeat pulses
const ringGeo = new THREE.PlaneGeometry(1, 1), ringPool = [];
for (let i = 0; i < 40; i++) {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    uniforms: { col: { value: new THREE.Color() }, a: { value: 1 }, w: { value: .08 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec2 vUv; uniform vec3 col; uniform float a, w;
      void main(){ float r = length(vUv-.5)*2.; float d = abs(r-(1.-w)); float m = smoothstep(w, 0., d) + exp(-d*18.)*.35; m *= smoothstep(1.,.97,r); gl_FragColor = vec4(col*m*a, 1.); }`,
  });
  const r = new THREE.Mesh(ringGeo, m); r.visible = false; r.frustumCulled = false; r.renderOrder = 6; scene.add(r); ringPool.push(r);
}
let ringN = 0;
function ring(pos, rad, col, a, w = .06) { if (ringN >= ringPool.length || a <= .002) return; const r = ringPool[ringN++]; r.visible = true; r.position.copy(pos); r.scale.set(rad * 2, rad * 2, 1); const u = r.material.uniforms; u.col.value.set(col); u.a.value = a; u.w.value = w; }

// ═════════ the watch (generic smartwatch — no logo, no brand marks) ═════════
// local frame: screen faces +z, band runs along ±y, wrist axis = x. Units: metres.
const WCW = .038, WCH = .045, WCD = .0105;
const watch = new THREE.Group(); scene.add(watch);
const WATCH = {};
{
  const alu = new THREE.MeshPhysicalMaterial({ color: 0x2a2f38, metalness: 1, roughness: .22, clearcoat: .5, clearcoatRoughness: .2 });
  const caseM = new THREE.Mesh(new RoundedBoxGeometry(WCW, WCH, WCD, 8, .0085), alu); watch.add(caseM);
  // screen: black glass with the live UI on a plane just under the glass surface
  const [sc, sg] = cnv(512, 620); WATCH.sc = sc; WATCH.sg = sg; WATCH.stex = tex(sc);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(WCW - .0045, WCH - .0045), new THREE.MeshBasicMaterial({ map: WATCH.stex, toneMapped: false }));
  scr.position.z = WCD / 2 + .00035; watch.add(scr);
  const glass = new THREE.Mesh(new RoundedBoxGeometry(WCW - .0012, WCH - .0012, .0012, 6, .0006), new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: .02, metalness: 0, clearcoat: 1, clearcoatRoughness: 0, transparent: true, opacity: .35, envMapIntensity: 1.6 }));
  glass.position.z = WCD / 2 + .0002; watch.add(glass);
  // digital crown (ridged) + side button on +x
  const crown = new THREE.Group(); crown.position.set(WCW / 2 + .0006, .007, 0); watch.add(crown);
  const crownG = new THREE.CylinderGeometry(.0034, .0034, .0032, 48, 1);
  { const p = crownG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z); if (r > .003) { const k = 1 + .045 * (Math.sin(a * 24) > 0 ? 1 : 0); p.setX(i, x * k); p.setZ(i, z * k); } } crownG.computeVertexNormals(); }
  const cr = new THREE.Mesh(crownG, alu); cr.rotation.z = Math.PI / 2; cr.position.x = .0012; crown.add(cr);
  const crRing = new THREE.Mesh(new THREE.TorusGeometry(.0028, .00035, 8, 40), new THREE.MeshStandardMaterial({ color: COL.blue, emissive: COL.blue, emissiveIntensity: .6 })); crRing.rotation.y = Math.PI / 2; crRing.position.x = .0029; crown.add(crRing);
  const btn = new THREE.Mesh(new RoundedBoxGeometry(.0018, .009, .0042, 3, .0008), alu); btn.position.set(WCW / 2 + .0002, -.0085, 0); watch.add(btn);
  // back: domed sensor crystal (dark glass) with Fresnel rings, 4 photodiodes and 2 green LEDs in the middle
  const [bc, bg] = cnv(1024, 1024);
  { bg.fillStyle = '#07090d'; bg.fillRect(0, 0, 1024, 1024); const cx = 512;
    const gr = bg.createRadialGradient(cx, cx, 0, cx, cx, 512); gr.addColorStop(0, '#141a24'); gr.addColorStop(.7, '#0b0f16'); gr.addColorStop(1, '#05070a'); bg.fillStyle = gr; bg.beginPath(); bg.arc(cx, cx, 500, 0, 7); bg.fill();
    bg.strokeStyle = 'rgba(167,177,194,.16)'; bg.lineWidth = 2; for (let r = 250; r < 480; r += 9) { bg.beginPath(); bg.arc(cx, cx, r, 0, 7); bg.stroke(); }
    for (let i = 0; i < 96; i++) { const a = i / 96 * 6.283; bg.strokeStyle = 'rgba(167,177,194,.10)'; bg.beginPath(); bg.moveTo(cx + Math.cos(a) * 250, cx + Math.sin(a) * 250); bg.lineTo(cx + Math.cos(a) * 470, cx + Math.sin(a) * 470); bg.stroke(); }
    bg.strokeStyle = 'rgba(89,199,255,.35)'; bg.lineWidth = 4; bg.beginPath(); bg.arc(cx, cx, 240, 0, 7); bg.stroke(); bg.beginPath(); bg.arc(cx, cx, 488, 0, 7); bg.stroke();
    bg.fillStyle = '#0d1118'; bg.beginPath(); bg.arc(cx, cx, 236, 0, 7); bg.fill(); }
  const back = new THREE.Mesh(new THREE.SphereGeometry(.03, 64, 16, 0, Math.PI * 2, 0, .5), new THREE.MeshPhysicalMaterial({ map: tex(bc), roughness: .12, metalness: .2, clearcoat: 1, clearcoatRoughness: .05 }));
  // sphere cap (R .03, polar .5 → rim radius 14.4 mm, dome depth 3.7 mm) pointing out of the back (-z)
  const BR = .03, BZ = -WCD / 2 + BR * Math.cos(.5);
  back.rotation.x = -Math.PI / 2; back.position.z = BZ; watch.add(back);
  { const g = back.geometry, p = g.attributes.position, uv = g.attributes.uv, R = BR * Math.sin(.5); for (let i = 0; i < p.count; i++) uv.setXY(i, .5 + p.getX(i) / R * .5, .5 - p.getZ(i) / R * .5); uv.needsUpdate = true; }
  const domeZ = r => BZ - Math.sqrt(BR * BR - r * r) - .00004;
  WATCH.apexZ = domeZ(0); WATCH.domeZ = domeZ;
  // 2 green LEDs in the middle + 4 photodiodes on a ring (small meshes on the dome surface)
  const ledM = new THREE.MeshBasicMaterial({ color: 0x0f2a1a, toneMapped: false });
  const leds = [];
  for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.CircleGeometry(.00115, 24), ledM.clone()); l.position.set(s * .0019, 0, domeZ(.0019)); l.rotation.y = Math.PI; watch.add(l); leds.push(l); }
  const pdM = new THREE.MeshPhysicalMaterial({ color: 0x1b2433, roughness: .15, metalness: .4, clearcoat: 1, emissive: 0x59c7ff, emissiveIntensity: 0 });
  const pds = [];
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4, r = .0078; const d = new THREE.Mesh(new RoundedBoxGeometry(.0028, .0028, .0003, 2, .0006), pdM.clone()); d.position.set(Math.cos(a) * r, Math.sin(a) * r, domeZ(r)); d.lookAt(V(Math.cos(a) * r * 2, Math.sin(a) * r * 2, domeZ(r) - (BZ - domeZ(r)))); watch.add(d); pds.push(d); }
  WATCH.leds = leds; WATCH.pds = pds; WATCH.back = back;
  // green light under the watch: point light + downward glow sprite (used on the holo arm and in back shots)
  WATCH.light = new THREE.PointLight(COL.led, 0, .08, 2); WATCH.light.position.set(0, 0, WATCH.apexZ - .004); watch.add(WATCH.light);
  // band: soft sport band (navy) wrapped around the wrist ellipse in the local y-z plane
  const AY = .031, AZ = .0225, Z0 = -WCD / 2 - AZ + .002;
  // a thin box bent around the ellipse: x = band width, y = along the band, z = thickness (outward)
  const bandG = new THREE.BoxGeometry(.022, 1, .0017, 1, 240, 1);
  { const p = bandG.attributes.position; for (let i = 0; i < p.count; i++) { const a = (p.getY(i) + .5) * Math.PI * 2, n = p.getZ(i) + .00085; p.setXYZ(i, p.getX(i), Math.sin(a) * (AY + n), Z0 + Math.cos(a) * (AZ + n)); } bandG.computeVertexNormals(); }
  const bandM = new THREE.MeshPhysicalMaterial({ color: 0x141c2b, roughness: .55, sheen: .6, sheenColor: new THREE.Color(0x3b5f99), clearcoat: .2 });
  const band = new THREE.Mesh(bandG, bandM); watch.add(band);
  // band pin holes + keeper (just detail)
  for (let i = 0; i < 7; i++) { const a = Math.PI * .62 + i * .09; const h = new THREE.Mesh(new THREE.CircleGeometry(.0009, 16), new THREE.MeshBasicMaterial({ color: 0x05070b })); const p = V(0, Math.sin(a) * (AY + .0018), Z0 + Math.cos(a) * (AZ + .0018)); h.position.copy(p); h.lookAt(V(0, Math.sin(a) * 2, Z0 + Math.cos(a) * 2)); watch.add(h); }
  WATCH.band = band; WATCH.wristC = V(0, 0, Z0); WATCH.AY = AY; WATCH.AZ = AZ;
}
// watch face UI (canvas): 'hr' heart-rate screen · 'time' · 'off'
function drawFace(st) {
  const k = JSON.stringify(st); if (k === WATCH.key) return; WATCH.key = k;
  const g = WATCH.sg, w = 512, h = 620;
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  if (st.mode === 'off') { WATCH.stex.needsUpdate = true; return; }
  if (st.mode === 'time') {
    g.fillStyle = '#F4F7FB'; g.textAlign = 'center'; g.font = '700 170px PlexLatin'; g.fillText(st.time || '9:41', w / 2, 360);
    g.fillStyle = '#59C7FF'; g.font = '500 40px PlexLatin'; g.fillText('SAT 18', w / 2, 170);
  } else {
    // heart-rate app (generic): heart glyph that beats, big BPM number, mini trace
    const s = 1 + .14 * (st.beat ?? 0);
    g.save(); g.translate(96, 140); g.scale(s, s);
    g.fillStyle = '#168BFF'; g.shadowColor = '#59C7FF'; g.shadowBlur = 30 * (st.beat ?? 0);
    g.beginPath(); g.moveTo(0, 28); g.bezierCurveTo(-60, -10, -40, -62, 0, -34); g.bezierCurveTo(40, -62, 60, -10, 0, 28); g.fill(); g.restore();
    g.textAlign = 'left'; g.fillStyle = '#A7B1C2'; g.font = '500 38px PlexLatin'; g.fillText('HEART RATE', 160, 152);
    g.fillStyle = '#F4F7FB'; g.font = '700 230px PlexLatin'; g.fillText(String(st.bpm ?? '--'), 40, 430);
    g.fillStyle = '#59C7FF'; g.font = '700 54px PlexLatin'; g.fillText('BPM', 48, 510);
    // mini trace
    if (st.trace) { g.strokeStyle = '#59C7FF'; g.lineWidth = 6; g.lineJoin = 'round'; g.beginPath(); for (let i = 0; i <= 120; i++) { const x = 220 + i * 2.3, y = 520 - 46 * st.trace(i / 120); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  }
  WATCH.stex.needsUpdate = true;
}
function ledsOn(a) {
  for (const l of WATCH.leds) l.material.color.setRGB(.06 + .25 * a, .18 + 1.1 * a, .1 + .5 * a);
  WATCH.light.intensity = a * .02;
}

// ═════════ holo forearm + hand (wrist axis = world x; the watch sits on top) ═════════
const arm = new THREE.Group(); scene.add(arm);
const armM = mkHolo(0x1a4f9a, COL.cyan, .95);
{
  // forearm: elliptic tube from elbow (x=-.30) to wrist (x=0), slightly tapered
  const g = new THREE.CylinderGeometry(1, 1, 1, 64, 60, true); g.rotateZ(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const u = p.getX(i) + .5, x = -.30 + .34 * u, rk = 1 + .32 * (1 - u) * (1 - u) * 1.2 - .02 * Math.sin(u * 9); p.setXYZ(i, x, p.getY(i) * .0215 * rk, p.getZ(i) * .0305 * rk); }
  g.computeVertexNormals(); arm.add(new THREE.Mesh(g, armM));
  // hand: flattened palm + fingers (stylised)
  const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), armM); palm.scale.set(.055, .017, .042); palm.position.set(.085, -.002, 0); arm.add(palm);
  const fing = (x, z, l, r, ry = 0) => { const c = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 6, 16), armM); c.rotation.z = Math.PI / 2; c.rotation.y = ry; c.position.set(x + l / 2, -.003, z); arm.add(c); };
  fing(.13, -.025, .055, .0072); fing(.135, -.008, .065, .0075); fing(.135, .009, .062, .0073); fing(.13, .025, .05, .0068);
  fing(.06, .042, .045, .0085, -.7);
  arm.userData.yOff = -(WCD / 2 + .0225 - .002);   // arm centre relative to the watch centre (see band ellipse)
}
function wristPose(pos, ry = 0, glowA = 0, o = {}) {   // pose arm + watch together; watch screen faces +y
  arm.visible = true; watch.visible = true;
  arm.position.copy(pos); arm.rotation.set(o.rx ?? 0, ry, o.rz ?? 0); arm.updateMatrixWorld(true);
  watch.position.copy(V(0, -arm.userData.yOff, 0).applyMatrix4(arm.matrixWorld));
  watch.quaternion.copy(arm.quaternion).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, Math.PI / 2)));
  if (o.lift) watch.position.add(V(0, o.lift, 0).applyQuaternion(arm.quaternion));
  if (o.flip) watch.rotateY(o.flip);
  armM.uniforms.gp.value.copy(V(0, .0215, 0).applyMatrix4(arm.matrixWorld)); armM.uniforms.gr.value = o.gr ?? .022; armM.uniforms.ga.value = glowA;
}

// ═════════ holo runner / figure (with knees, elbows, a heart in the chest) ═════════
function makeFigure(col) {
  const m = mkHolo(col, COL.cyan, 1), g = new THREE.Group(), P = {};
  const cap = (r, l) => new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 6, 16), m);
  P.pelvis = new THREE.Group(); P.pelvis.position.y = .95; g.add(P.pelvis);
  P.torso = new THREE.Group(); P.pelvis.add(P.torso);
  const ch = cap(.17, .40); ch.position.y = .3; ch.scale.set(1, 1, .62); P.torso.add(ch);
  P.head = new THREE.Mesh(new THREE.SphereGeometry(.115, 28, 18), m); P.head.position.y = .76; P.torso.add(P.head);
  const nk = cap(.05, .06); nk.position.y = .62; P.torso.add(nk);
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(.095 * s, -.02, 0); P.pelvis.add(hip);
    const th = cap(.075, .34); th.position.y = -.21; hip.add(th);
    const knee = new THREE.Group(); knee.position.y = -.43; hip.add(knee);
    const sh = cap(.062, .34); sh.position.y = -.21; knee.add(sh);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(.1, .06, .24), m); foot.position.set(0, -.43, .06); knee.add(foot);
    const shd = new THREE.Group(); shd.position.set(.235 * s, .52, 0); P.torso.add(shd);
    const ua = cap(.055, .24); ua.position.y = -.16; shd.add(ua);
    const el = new THREE.Group(); el.position.y = -.32; shd.add(el);
    const fa = cap(.048, .22); fa.position.y = -.14; el.add(fa);
    P['hip' + s] = hip; P['knee' + s] = knee; P['sh' + s] = shd; P['el' + s] = el;
  }
  // watch on the left wrist: a tiny dark slab with a glowing face + green underglow
  const wt = new THREE.Mesh(new THREE.BoxGeometry(.06, .02, .07), new THREE.MeshBasicMaterial({ color: 0x0b0f17 })); wt.position.set(0, -.27, 0); P['el-1'].add(wt);
  const wf = new THREE.Mesh(new THREE.PlaneGeometry(.045, .055), new THREE.MeshBasicMaterial({ color: 0x59c7ff, toneMapped: false, transparent: true })); wf.rotation.x = -Math.PI / 2; wf.position.set(0, .0105, 0); wt.add(wf);
  P.watch = wt; P.face = wf;
  // heart (extruded) in the chest
  const hs = new THREE.Shape(); hs.moveTo(0, -.5); hs.bezierCurveTo(-1.1, .25, -.55, 1.05, 0, .55); hs.bezierCurveTo(.55, 1.05, 1.1, .25, 0, -.5);
  const hg = new THREE.ExtrudeGeometry(hs, { depth: .35, bevelEnabled: true, bevelSize: .18, bevelThickness: .18, bevelSegments: 5, curveSegments: 24 }); hg.center();
  const heartM = mkHolo(0x168bff, 0x9fe1ff, 1.3);
  P.heart = new THREE.Mesh(hg, heartM); P.heart.scale.setScalar(.075); P.heart.position.set(-.04, .38, .06); P.heart.rotation.z = .25; P.torso.add(P.heart);
  g.userData = P; scene.add(g); return g;
}
const fig = makeFigure(COL.blue);
// gait: phase in radians; run=1 → running pose, 0 → standing
function pose(f, pos, heading, phase, o = {}) {
  const P = f.userData, run = o.run ?? 1, s = Math.sin(phase), c = Math.cos(phase);
  f.visible = true; f.position.copy(pos); f.rotation.y = heading; f.scale.setScalar(o.scale ?? 1);
  P.hip1.rotation.x = -s * .75 * run; P['hip-1'].rotation.x = s * .75 * run;
  P.knee1.rotation.x = (.15 + .9 * Math.max(0, -Math.sin(phase + .9))) * run; P['knee-1'].rotation.x = (.15 + .9 * Math.max(0, Math.sin(phase + .9))) * run;
  P.sh1.rotation.x = s * .7 * run; P['sh-1'].rotation.x = -s * .7 * run;
  P.el1.rotation.x = -1.4 * run; P['el-1'].rotation.x = -1.4 * run;
  P.torso.rotation.x = .18 * run; P.pelvis.position.y = .95 - .05 * run + Math.abs(c) * .06 * run;
  if (o.lookWatch) { P['sh-1'].rotation.set(-1.2, 0, -.5); P['el-1'].rotation.set(-1.5, 0, 0); }
  P.face.material.opacity = .4 + .6 * (o.face ?? 1);
  const b = o.beat ?? 0; P.heart.scale.setScalar(.075 * (1 + .25 * b)); P.heart.material.uniforms.k.value = 1.1 + 1.6 * b;
}
function figHeart(f) { f.updateMatrixWorld(true); return f.userData.heart.getWorldPosition(V(0, 0, 0)); }
function figWatch(f) { f.updateMatrixWorld(true); return f.userData.watch.getWorldPosition(V(0, 0, 0)); }

// ═════════ stages ═════════
// studio (product): navy dome, dark floor, blue/cyan rims
const studio = new THREE.Group(); scene.add(studio);
const studioBg = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, uniforms: { c1: { value: new THREE.Color(0x0e2546) }, c2: { value: new THREE.Color(0x020306) }, spot: { value: new THREE.Vector2(0, .15) } },
  vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: 'varying vec3 vP; uniform vec3 c1, c2; uniform vec2 spot; void main(){ float s = pow(max(0., 1.-length(vP.xy-spot)*1.1), 2.); gl_FragColor = vec4(mix(c2, c1, s*.9), 1.); }',
});
{
  studio.add(new THREE.Mesh(new THREE.SphereGeometry(20, 48, 24), studioBg));
  const r1 = new THREE.SpotLight(0x168bff, 30, 8, .5, .6, 2); r1.position.set(-.8, .6, -.6);
  const r2 = new THREE.SpotLight(0x59c7ff, 16, 8, .5, .6, 2); r2.position.set(.8, .4, -.5);
  const k = new THREE.DirectionalLight(0xffffff, 1.2); k.position.set(.4, .8, 1);
  studio.add(r1, r2, k, new THREE.AmbientLight(0x404a60, .5)); studio.userData = { r1, r2, k };
}
// track: night running track (grid floor + lane lines) with stars
const track = new THREE.Group(); scene.add(track);
const trackFloor = new THREE.ShaderMaterial({
  uniforms: { t: { value: 0 }, off: { value: 0 } }, toneMapped: false,
  vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `varying vec2 vP; uniform float off;
    void main(){ vec2 p = vec2(vP.x + off, vP.y); vec2 g1 = abs(fract(p/2.)-.5), g2 = abs(fract(p/10.)-.5);
      float l1 = smoothstep(.47,.5,max(g1.x,g1.y)), l2 = smoothstep(.485,.5,max(g2.x,g2.y));
      float lane = 0.; for (int i = -3; i <= 3; i++) lane += smoothstep(.06, 0., abs(vP.y - float(i)*1.22));
      float fade = exp(-length(vP)/45.);
      vec3 c = vec3(.012,.02,.04) + vec3(.09,.55,1.)*(l1*.05 + l2*.14)*fade + vec3(.35,.78,1.)*lane*.35*fade;
      gl_FragColor = vec4(c, 1.); }`,
});
{
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), trackFloor); fl.rotation.x = -Math.PI / 2; track.add(fl);
  const sp = []; const r = rnd(3); for (let i = 0; i < 900; i++) { const v = V(r() - .5, r() * .7 + .08, r() - .5).normalize().multiplyScalar(150); sp.push(v.x, v.y, v.z); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  track.add(new THREE.Points(g, new THREE.PointsMaterial({ map: DOT, size: 1.0, color: 0xcfe6ff, transparent: true, depthWrite: false, toneMapped: false })));
  // light poles along the track
  const pm2 = mkHolo(0x123a6e, COL.cyan, .7);
  for (let i = -6; i <= 6; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.04, .05, 6, 8), pm2); p.position.set(i * 12, 3, -6); track.add(p); }
}

// ═════════ post (bloom + grade) ═════════
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, cam));
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), .35, .55, .85); composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, t: { value: 0 }, zb: { value: 0 }, ca: { value: .0015 }, vig: { value: .45 }, grain: { value: .035 }, flash: { value: 0 } },
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
const STAGES = { studio, track };
function reset() {
  for (const s of Object.values(STAGES)) s.visible = false;
  for (const o of [watch, arm, fig]) o.visible = false;
  for (const s of sprPool) s.visible = false; for (const r of ringPool) r.visible = false; sprN = ringN = 0;
  scene.fog = null; scene.background = new THREE.Color(0x05070c); scene.environment = ENV.product; scene.environmentIntensity = 1;
  renderer.toneMappingExposure = 1; bloom.strength = .35; bloom.threshold = .85; bloom.radius = .55;
  cam.fov = 30; cam.up.set(0, 1, 0);
  grade.uniforms.zb.value = 0; grade.uniforms.flash.value = 0; grade.uniforms.vig.value = .45; grade.uniforms.ca.value = .0015;
  watch.position.set(0, 0, 0); watch.rotation.set(0, 0, 0); watch.scale.setScalar(1);
  ledsOn(0); for (const d of WATCH.pds) d.material.emissiveIntensity = 0; WATCH.band.visible = true;
  armM.uniforms.ga.value = 0; arm.scale.setScalar(1);
  studio.userData.r1.intensity = 30; studio.userData.r2.intensity = 16; studio.userData.k.intensity = 1.2;
  trackFloor.uniforms.off.value = 0;
}
function stage(name, t) {
  STAGES[name].visible = true;
  for (const m of HOLO) m.uniforms.t.value = t;
  if (name === 'studio') { bloom.threshold = .8; bloom.strength = .4; scene.environment = ENV.product; }
  if (name === 'track') { scene.background = new THREE.Color(0x03050a); scene.fog = new THREE.FogExp2(0x03050a, .02); bloom.strength = .6; bloom.threshold = .45; scene.environment = ENV.room; scene.environmentIntensity = .3; }
}
function lookCam(pos, look, fov = 30, roll = 0) { cam.position.copy(pos); cam.fov = fov; cam.up.set(Math.sin(roll), Math.cos(roll), 0); cam.lookAt(look); cam.updateProjectionMatrix(); }
function project(v) { cam.updateMatrixWorld(); const p = v.clone().project(cam); return [(p.x * .5 + .5) * 1080, (-p.y * .5 + .5) * 1920]; }
function watchPt(x, y, z) { watch.updateMatrixWorld(true); return V(x, y, z).applyMatrix4(watch.matrixWorld); }

window.R3 = {
  THREE, V, scene, cam, COL, watch, WATCH, drawFace, ledsOn, arm, armM, wristPose, fig, pose, figHeart, figWatch, trackFloor,
  studio, track, glow, ring, bloom, grade: grade.uniforms, reset, stage, lookCam, project, watchPt, renderer, WCD,
};
window.G3 = {
  render(t) {
    const sh = (window.SHOTS || []).find(s => t >= s.s && t < s.e);
    canvas.style.opacity = sh ? (window.CUR3D ?? 1) : 0;
    if (!sh) { window.POST3D?.(null); return; }
    reset(); grade.uniforms.t.value = t;
    const lt = t - sh.s;
    sh.update(lt, t, sh);
    if (!sh.noPunch && sh.s > 0) grade.uniforms.zb.value = Math.max(grade.uniforms.zb.value, .9 * Math.max(0, 1 - lt / .16));
    for (let i = 0; i < ringN; i++) ringPool[i].quaternion.copy(cam.quaternion);
    window.POST3D?.(sh, lt, t);
    composer.render();
  },
};
window.G3ready = true;
