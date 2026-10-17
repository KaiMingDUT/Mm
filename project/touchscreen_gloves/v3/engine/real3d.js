// KROZO v3 — brand-styled multi-shot 3D world for the touchscreen/gloves reel (v2 world + magnified cross-section + ion fingertip).
// Stages (night street, desk, studio, inside-the-screen, inside-the-finger, knit fibers) + actors (hands, gloves, phone).
// The timeline (timeline.js) owns the shot list; every frame we reset, let the active shot pose the world, then render.
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

const RS = +(new URLSearchParams(location.search).get('rs') || 1);   // GL render scale (DOM text stays native 1080p)
const W = Math.round(1080 * RS), H = Math.round(1920 * RS);
const canvas = document.getElementById('gl');
canvas.style.width = '1080px'; canvas.style.height = '1920px';
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = false;
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(30, W / H, .01, 200);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rnd = A.rnd(7);

// ───────── environments ─────────
const pm = new THREE.PMREMGenerator(renderer);
const hdr = async f => { const t = await new RGBELoader().loadAsync('assets/' + f); const e = pm.fromEquirectangular(t).texture; t.dispose(); return e; };
const ENV = {
  night: await hdr('moonless_golf_1k.hdr'),
  warm: await hdr('royal_esplanade_1k.hdr'),
  sunset: await hdr('venice_sunset_1k.hdr'),
  studio: pm.fromScene(new RoomEnvironment(), .04).texture,
};

// ───────── shared textures ─────────
const DOT = A.softDot(), BOKEH = A.bokehDisc();

// ───────── actors: hands ─────────
const HD = await A.loadHand('assets/hand_right.glb');
const POSES = {
  point: A.bakeHand(HD, { m: 1.45, r: 1.5, p: 1.55, ty: -.55, t1: -.45, t2: -.35 }),
  open: A.bakeHand(HD, { i: .12, m: .2, r: .28, p: .36, ty: -.15 }),
  grip: A.bakeHand(HD, { i: .95, m: 1.0, r: 1.05, p: 1.1, ty: .25, t1: .2 }),
};
const skinM = A.skinMat();
const knitGlove = A.knitMat(0x2e3442);
const cuffM = A.knitMat(0x1667d6);
// conductive glove: gray knit, silver-thread fingertips
const condM = A.knitMat(0x34373e);
const condU = { tips: { value: [0, 1, 2, 3, 4].map(() => V(0, 0, 0)) }, glow: { value: 0 } };
{
  const tips = ['thumb-tip', 'index-finger-tip', 'middle-finger-tip', 'ring-finger-tip', 'pinky-finger-tip'];
  const base = condM.onBeforeCompile;
  condM.onBeforeCompile = sh => {
    base(sh);
    sh.uniforms.tips = condU.tips; sh.uniforms.glow = condU.glow;
    sh.fragmentShader = sh.fragmentShader.replace('uniform float dScale;', 'uniform float dScale; uniform vec3 tips[5]; uniform float glow;\n float tipMask(vec3 p){ float m=0.; for(int i=1;i<2;i++) m=max(m, 1.-smoothstep(.016,.02,distance(p,tips[i]))); return m; }')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n float tm = tipMask(vObjP); roughnessFactor = mix(roughnessFactor, .32, tm);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n metalnessFactor = mix(metalnessFactor, 1., tipMask(vObjP));')
      .replace('#include <color_fragment>', '#include <color_fragment>\n { float m = tipMask(vObjP); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.86,.88,.92)*mix(.75,1.1,det(vObjP)), m); }')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n { float m = tipMask(vObjP); float fl = .5+.5*sin(vObjP.y*900.+glow*30.); totalEmissiveRadiance += vec3(.35,.78,1.)*m*glow*(.4+.8*fl); }');
  };
  condM.customProgramCacheKey = () => 'conductive';
}
const GEO = {};
for (const k of Object.keys(POSES)) { GEO[k] = { skin: POSES[k].geo, glove: A.inflate(POSES[k].geo, .0032) }; }

// electric "veins" overlay (bare hand, the body-electricity beat)
const veinM = new THREE.ShaderMaterial({
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  uniforms: { t: { value: 0 }, k: { value: 0 } },
  vertexShader: `varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ vP=position; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `varying vec3 vP; varying vec3 vN; varying vec3 vV; uniform float t; uniform float k;
    float h3(vec3 p){ p=fract(p*.3183099+.1); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
    float n3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
      return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
                 mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
    void main(){
      vec3 p = vP*95. + vec3(0., t*2.2, 0.);
      float a = 1.-abs(n3(p)*2.-1.); float b = 1.-abs(n3(p*2.1+7.)*2.-1.);
      float v = pow(a, 18.)*1.2 + pow(b, 26.)*.8;
      float pulse = .55+.45*sin(vP.y*160. + t*14.);
      float rim = pow(1.-max(dot(vN,vV),0.), 2.5);
      vec3 c = vec3(.35,.8,1.)*v*pulse*2.2 + vec3(.09,.55,1.)*rim*.9;
      gl_FragColor = vec4(c*k, 1.);
    }`,
});

function makeHandRig() {
  const rig = new THREE.Group();
  const inner = new THREE.Group(); rig.add(inner);
  const skin = new THREE.Mesh(GEO.point.skin, skinM), glove = new THREE.Mesh(GEO.point.glove, knitGlove), vein = new THREE.Mesh(A.inflate(GEO.point.skin, .0006), veinM);
  vein.renderOrder = 5;
  // sleeve (wool coat) covering the wrist opening
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(.06, .05, .5, 48, 1, true), A.knitMat(0x1c2230));
  sleeve.material.side = THREE.DoubleSide;
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(.047, .045, .05, 48, 1, true), cuffM); cuff.material.side = THREE.DoubleSide;
  inner.add(skin, glove, vein, sleeve, cuff);
  rig.userData = { inner, skin, glove, vein, sleeve, cuff, pose: 'point' };
  return rig;
}
const handA = makeHandRig(), handB = makeHandRig();
scene.add(handA, handB);
// pose: which baked pose; mode: 'skin' | 'glove' | 'cond'; slide: glove pulled off along the arm (0..1)
function setHand(rig, o) {
  const u = rig.userData, pose = o.pose || 'point', P = POSES[pose];
  rig.visible = true;
  if (u.pose !== pose) { u.skin.geometry = GEO[pose].skin; u.glove.geometry = GEO[pose].glove; u.vein.geometry = A.inflate(GEO[pose].skin, .0006); u.pose = pose; }
  u.inner.position.copy(P.tip).multiplyScalar(-1);
  const wrist = P.wrist.clone().sub(P.tip);
  u.sleeve.position.set(wrist.x - .004, wrist.y + .25 - .015, wrist.z + .004); u.sleeve.scale.set(.72, 1, 1.0);
  u.sleeve.position.add(P.tip); u.sleeve.material.color.set(o.sleeve ?? 0x1c2230); u.sleeve.visible = o.sleeve !== null;
  const mode = o.mode || 'skin', slide = o.slide || 0;
  u.skin.visible = mode === 'skin' || slide > 0 || o.xray;
  u.glove.visible = mode !== 'skin';
  u.glove.material = mode === 'cond' ? condM : knitGlove;
  u.glove.position.set(0, slide * .26, 0);
  u.cuff.visible = mode !== 'skin' && !o.noCuff;
  u.cuff.position.set(P.wrist.x - .002, P.wrist.y - .03 + slide * .26, P.wrist.z + .004); u.cuff.scale.set(.78, 1, 1.02);
  u.cuff.material = cuffM;
  u.vein.visible = (o.vein || 0) > 0; veinM.uniforms.k.value = o.vein || 0;
  if (mode === 'cond') { condU.tips.value = P.tipsAll; condU.glow.value = o.glow || 0; }
  skinM.transparent = !!o.xray; skinM.opacity = o.xray ? 1 - .75 * o.xray : 1; skinM.depthWrite = !o.xray;
  rig.scale.setScalar(o.scale || 1);
  rig.userData.mode = mode;
  aim(rig, o.at || V(0, 0, 0), o.dir || V(0, -1, 0), o.pad || V(0, 0, -1));
}
// place the fingertip at `at`, finger pointing along `dir`, finger pad facing roughly `pad`
function aim(rig, at, dir, pad) {
  const y = dir.clone().normalize().negate();
  const x = pad.clone().normalize().negate(); x.sub(y.clone().multiplyScalar(x.dot(y))).normalize();
  const z = new THREE.Vector3().crossVectors(x, y);
  rig.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  rig.position.copy(at);
}

// ───────── actor: phone ─────────
const phone = A.makePhone();
const phoneRig = new THREE.Group(); phoneRig.add(phone.group); scene.add(phoneRig);
const screenLight = new THREE.PointLight(0xbfd8ff, 0, .5, 2); phone.group.add(screenLight); screenLight.position.set(0, -.11, .05);
let uiKey = '';
function setUI(st) {
  const k = JSON.stringify(st);
  if (k === uiKey) return; uiKey = k;
  A.drawUI(phone.canvas, st); phone.tex.needsUpdate = true;
}

// ───────── stage: winter night street ─────────
const night = new THREE.Group(); scene.add(night);
{
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshPhysicalMaterial({ color: 0x0a0c11, roughness: .32, metalness: .1, clearcoat: .6, clearcoatRoughness: .2 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -1.1; night.add(ground);
  const cols = [0x168bff, 0x59c7ff, 0xf4f7fb, 0x2a7bff, 0x9fdcff, 0x168bff, 0xcfe6ff, 0x59c7ff];
  for (let i = 0; i < 90; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: BOKEH, color: cols[i % cols.length], transparent: true, opacity: .12 + rnd() * .25, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    const d = 3 + rnd() * 9; m.position.set((rnd() - .5) * d * 1.8, -.6 + rnd() * 2.6, -d); m.scale.setScalar(.12 + rnd() * .35 * d / 4);
    m.userData.ph = rnd() * 6; night.add(m);
  }
  // street lamp glow
  const lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: DOT, color: 0xbfe3ff, transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  lamp.position.set(1.6, 2.2, -4); lamp.scale.setScalar(3.5); night.add(lamp);
  night.add(new THREE.HemisphereLight(0x8fb4ff, 0x0b0d12, .55));
  const rim = new THREE.SpotLight(0xa8d8ff, 30, 12, .6, .7, 2); rim.position.set(1.2, 2.4, -2.2); rim.target.position.set(0, 0, 0); night.add(rim, rim.target);
  const fill = new THREE.DirectionalLight(0x9cc4ff, .8); fill.position.set(-1, .6, 1.2); night.add(fill);
}
// snow (deterministic): far points + near big flakes
const SN = 2600, snowGeo = new THREE.BufferGeometry(), snowBase = new Float32Array(SN * 4);
for (let i = 0; i < SN; i++) snowBase.set([(rnd() - .5) * 4, rnd() * 3, -rnd() * 4 + 1, rnd()], i * 4);
snowGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(SN * 3), 3));
const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ map: DOT, size: .012, color: 0xeef4ff, transparent: true, opacity: .85, depthWrite: false, sizeAttenuation: true }));
night.add(snow);
const flakes = [];
for (let i = 0; i < 26; i++) {
  const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: DOT, color: 0xf4f7fb, transparent: true, opacity: .22, depthWrite: false, fog: false }));
  f.userData = { x: (rnd() - .5) * .5, y: rnd(), z: rnd() * .25, s: .015 + rnd() * .04, v: .05 + rnd() * .08 }; night.add(f); flakes.push(f);
}
function updSnow(t, c) {
  const P = snowGeo.attributes.position.array;
  for (let i = 0; i < SN; i++) {
    const [x, y, z, r] = snowBase.subarray(i * 4, i * 4 + 4);
    const yy = ((y - t * (.18 + r * .22)) % 3 + 3) % 3 - 1.2;
    P[i * 3] = x + Math.sin(t * .8 + r * 20) * .05 + c.x * .0; P[i * 3 + 1] = yy; P[i * 3 + 2] = z;
  }
  snowGeo.attributes.position.needsUpdate = true;
  // near flakes ride with the camera (out-of-focus foreground)
  const fw = new THREE.Vector3(); cam.getWorldDirection(fw);
  const right = new THREE.Vector3().crossVectors(fw, cam.up).normalize(), up = new THREE.Vector3().crossVectors(right, fw);
  for (const f of flakes) {
    const u = f.userData, yy = ((u.y - t * u.v) % 1 + 1) % 1 - .5;
    f.position.copy(cam.position).addScaledVector(fw, .09 + u.z).addScaledVector(right, u.x * (.6 + u.z)).addScaledVector(up, yy * (.9 + u.z * 2));
    f.scale.setScalar(u.s * (1 + u.z * 3));
  }
}

// ───────── stage: warm desk ─────────
const desk = new THREE.Group(); scene.add(desk);
{
  const wood = A.canvasTex(1024, 1024, (x, w, h) => {
    x.fillStyle = '#1a1f29'; x.fillRect(0, 0, w, h);
    const r = A.rnd(11);
    for (let i = 0; i < 260; i++) { const y = r() * h, a = .04 + r() * .12; x.strokeStyle = r() < .5 ? `rgba(5,8,14,${a})` : `rgba(90,110,140,${a * .6})`; x.lineWidth = 1 + r() * 4;
      x.beginPath(); x.moveTo(0, y); for (let X = 0; X <= w; X += 32) x.lineTo(X, y + Math.sin(X * .006 + i) * 9 + Math.sin(X * .03 + i * 3) * 2); x.stroke(); }
  });
  wood.repeat.set(3, 3);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshPhysicalMaterial({ map: wood, roughness: .42, clearcoat: .5, clearcoatRoughness: .25 }));
  top.rotation.x = -Math.PI / 2; top.position.y = -.0045; desk.add(top);
  const cols = [0x168bff, 0x59c7ff, 0xdbeeff, 0x2a7bff];
  for (let i = 0; i < 40; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: BOKEH, color: cols[i % 4], transparent: true, opacity: .25 + rnd() * .35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    const d = 1.5 + rnd() * 3; m.position.set((rnd() - .5) * d * 1.6, .3 + rnd() * 1.4, -d); m.scale.setScalar(.06 + rnd() * .16 * d); desk.add(m);
  }
  const key = new THREE.SpotLight(0xe8f2ff, 14, 4, .7, .8, 2); key.position.set(.5, .9, .2); key.target.position.set(0, 0, 0); desk.add(key, key.target);
  desk.add(new THREE.HemisphereLight(0xcfe0ff, 0x0a0e16, .5));
  const back = new THREE.DirectionalLight(0x9fc6ff, .6); back.position.set(-.5, .4, -.8); desk.add(back);
}

// ───────── stage: studio (product shots) ─────────
const studio = new THREE.Group(); scene.add(studio);
const studioBg = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, uniforms: { c1: { value: new THREE.Color(0x0e2546) }, c2: { value: new THREE.Color(0x020306) }, t: { value: 0 } },
  vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: 'varying vec3 vP; uniform vec3 c1; uniform vec3 c2; uniform float t; void main(){ float g = smoothstep(-.6,.9, vP.y*.3+.55 - length(vP.xz)*.0); float s = pow(max(0., 1.-length(vP.xy-vec2(.0,.15))*1.1), 2.); gl_FragColor = vec4(mix(c2, c1, s*.9+g*.1), 1.); }',
});
{
  const dome = new THREE.Mesh(new THREE.SphereGeometry(8, 48, 24), studioBg); studio.add(dome);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.MeshPhysicalMaterial({ color: 0x05070b, roughness: .25, metalness: .3, clearcoat: .6, clearcoatRoughness: .1, envMapIntensity: .12 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.12; studio.add(floor); studio.userData.floor = floor;
  const r1 = new THREE.SpotLight(0x168bff, 26, 6, .5, .6, 2); r1.position.set(-.8, .6, -.6); r1.target.position.set(0, 0, 0);
  const r2 = new THREE.SpotLight(0x59c7ff, 14, 6, .5, .6, 2); r2.position.set(.8, .4, -.5); r2.target.position.set(0, 0, 0);
  const k = new THREE.DirectionalLight(0xffffff, 1.6); k.position.set(.4, .8, 1);
  studio.add(r1, r1.target, r2, r2.target, k, new THREE.AmbientLight(0x404a60, .4));
  studio.userData.r1 = r1; studio.userData.r2 = r2;
}
// props for "doesn't react to anything": pencil (rubber eraser) + plastic die
const pencil = new THREE.Group();
{
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.0042, .0042, .15, 6), new THREE.MeshPhysicalMaterial({ color: 0x1b2232, metalness: .6, roughness: .3, clearcoat: .8 }));
  const fer = new THREE.Mesh(new THREE.CylinderGeometry(.0044, .0044, .012, 24), new THREE.MeshPhysicalMaterial({ color: 0xc9ccd2, metalness: 1, roughness: .3 }));
  const er = new THREE.Mesh(new THREE.CylinderGeometry(.0041, .0041, .009, 24), new THREE.MeshPhysicalMaterial({ color: 0x4a5668, roughness: .55, clearcoat: .2 }));
  body.position.y = .075 + .021; fer.position.y = .015; er.position.y = .0045; pencil.add(body, fer, er); scene.add(pencil);
}
const die = new THREE.Mesh(new RoundedBoxGeometry(.016, .016, .016, 4, .0025), new THREE.MeshPhysicalMaterial({ color: 0x168bff, roughness: .12, clearcoat: 1 }));
scene.add(die);
// cloth swatch (deformed each frame)
const clothGeo = new THREE.PlaneGeometry(.11, .11, 36, 36), clothBase = clothGeo.attributes.position.array.slice();
const cloth = new THREE.Mesh(clothGeo, A.knitMat(0x2e3442)); cloth.material.side = THREE.DoubleSide; scene.add(cloth);
function updCloth(k, t) {
  const P = clothGeo.attributes.position.array;
  for (let i = 0; i < P.length; i += 3) {
    const x = clothBase[i], y = clothBase[i + 1];
    P[i] = x; P[i + 1] = y; P[i + 2] = (Math.sin(x * 60 + t * 5) * .006 + Math.cos(y * 50 + t * 4) * .005) * (1 - k) - (x * x + y * y) * 1.6 * (1 - k);
  }
  clothGeo.attributes.position.needsUpdate = true; clothGeo.computeVertexNormals();
}

// ───────── stage: inside the screen (units = mm) ─────────
const tech = new THREE.Group(); scene.add(tech);
const GRID = 40;
const sensorM = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  uniforms: { t: { value: 0 }, scan: { value: -1 }, scanK: { value: 0 }, heat: { value: new THREE.Vector2(0, 0) }, heatK: { value: 0 }, lock: { value: 0 }, hue: { value: 0 }, bright: { value: 1 } },
  vertexShader: 'varying vec2 vU; void main(){ vU=position.xz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `varying vec2 vU; uniform float t, scan, scanK, heatK, lock, hue, bright; uniform vec2 heat;
    void main(){
      float pitch = 4.;
      vec2 g = vU/pitch; vec2 f = fract(g)-.5; vec2 id = floor(g);
      // diamond pattern: Tx rows (blue) + Rx columns (cyan), interleaved
      float dTx = abs(f.x)+abs(f.y);                         // diamond centred on cell
      vec2 f2 = fract(g+.5)-.5; float dRx = abs(f2.x)+abs(f2.y);
      float tx = smoothstep(.47,.44,dTx) - smoothstep(.41,.38,dTx)*.82; float txb = smoothstep(.06,.02,abs(f.y))*step(abs(f.x),.5);
      float rx = smoothstep(.47,.44,dRx) - smoothstep(.41,.38,dRx)*.82; float rxb = smoothstep(.06,.02,abs(f2.x))*step(abs(f2.y),.5);
      float row = floor(vU.y/pitch + .5);
      float sc = scanK * exp(-pow((vU.y/pitch - scan)*1.6, 2.));
      float d = length(vU-heat); float hb = heatK*exp(-d*d/18.);
      vec3 cTx = vec3(.09,.55,1.), cRx = vec3(.35,.78,1.);
      vec3 c = cTx*(tx*.75+txb*.35)*(.55+1.6*sc) + cRx*(rx*.65+rxb*.3)*(.5+.5*sc);
      c += vec3(.75,.93,1.)*hb*(tx+rx+.1)*.6 + vec3(.09,.55,1.)*hb*.18;
      float cross = lock*(smoothstep(.35,.0,abs(vU.x-heat.x)) + smoothstep(.35,.0,abs(vU.y-heat.y)));
      c += vec3(.35,.78,1.)*cross*.55;
      float edge = 1.-smoothstep(GRIDH-6., GRIDH, max(abs(vU.x),abs(vU.y)));
      gl_FragColor = vec4(c*edge*bright, 1.);
    }`.replace(/GRIDH/g, (GRID / 2).toFixed(1)),
});
{
  const glass = new THREE.Mesh(new RoundedBoxGeometry(GRID + 6, .7, GRID + 6, 2, .2), new THREE.MeshPhysicalMaterial({ color: 0x9fb6cc, roughness: .02, metalness: 0, transparent: true, opacity: .18, clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: 2.2, depthWrite: false }));
  glass.position.y = .35; glass.renderOrder = 3; tech.add(glass); tech.userData.glass = glass;
  const sensor = new THREE.Mesh(new THREE.PlaneGeometry(GRID, GRID).rotateX(-Math.PI / 2), sensorM); sensor.position.y = -.25; tech.add(sensor); tech.userData.sensor = sensor;
  // OLED pixel layer (RGB sub-pixels) — samples the phone UI canvas
  const pix = new THREE.Mesh(new THREE.PlaneGeometry(GRID + 6, GRID + 6).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: { ui: { value: phone.tex }, k: { value: .7 } },
    vertexShader: 'varying vec2 vU; void main(){ vU=position.xz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec2 vU; uniform sampler2D ui; uniform float k;
      void main(){ vec2 p = vU/.9; vec2 f = fract(p); vec2 id = floor(p);
        vec3 src = texture2D(ui, vec2(.5,.62) + id*vec2(.009,.0042)).rgb;
        float sx = f.x*3.; int ch = int(floor(sx)); float fx = fract(sx);
        float m = smoothstep(.0,.15,fx)*smoothstep(1.,.85,fx)*smoothstep(.08,.2,f.y)*smoothstep(.92,.8,f.y);
        vec3 c = ch==0 ? vec3(src.r*1.2,0.,0.) : ch==1 ? vec3(0.,src.g*1.2,0.) : vec3(0.,0.,src.b*1.3);
        gl_FragColor = vec4(c*m*k, 1.); }`,
  }));
  pix.position.y = -2.2; tech.add(pix); tech.userData.pix = pix;
  // controller chip + traces
  const chip = new THREE.Mesh(new RoundedBoxGeometry(8, 1, 8, 2, .2), new THREE.MeshPhysicalMaterial({ color: 0x0c0d10, roughness: .4, clearcoat: .6 }));
  chip.position.set(GRID / 2 + 9, -1.4, 0); tech.add(chip);
  const lbl = A.canvasTex(256, 256, (x) => { x.fillStyle = '#0c0d10'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#A7B1C2'; x.font = '700 40px PlexLatin'; x.textAlign = 'center'; x.fillText('TOUCH', 128, 120); x.font = '500 28px PlexLatin'; x.fillText('CTRL', 128, 165); });
  const top = new THREE.Mesh(new THREE.PlaneGeometry(7, 7).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: lbl, roughness: .5 })); top.position.set(chip.position.x, -.89, 0); tech.add(top);
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xb8c6d8, metalness: 1, roughness: .25 });
  for (let i = 0; i < 10; i++) { const tr = new THREE.Mesh(new THREE.BoxGeometry(10, .08, .25), gold); tr.position.set(GRID / 2 + 2, -1.2, -4.5 + i); tech.add(tr); }
  tech.add(new THREE.AmbientLight(0x223048, .6));
  const kl = new THREE.DirectionalLight(0xffffff, 1.4); kl.position.set(10, 30, 20); tech.add(kl);
  const bl = new THREE.PointLight(0x168bff, 400, 120, 2); bl.position.set(-20, 10, -20); tech.add(bl);
}
// electric field lines (camera-facing ribbons, bent toward the finger in the vertex shader)
const FL_N = 26, FL_SEG = 40;
const flGeo = new THREE.BufferGeometry();
{
  const pos = [], ids = [], idx = [];
  for (let l = 0; l < FL_N; l++) for (let s = 0; s <= FL_SEG; s++) for (const side of [-1, 1]) { pos.push(s / FL_SEG, side, l); }
  for (let l = 0; l < FL_N; l++) for (let s = 0; s < FL_SEG; s++) { const b = (l * (FL_SEG + 1) + s) * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
  flGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); flGeo.setIndex(idx);
}
const flM = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  uniforms: { t: { value: 0 }, finger: { value: V(0, 6, 0) }, pull: { value: 0 }, k: { value: 0 }, block: { value: 0 }, span: { value: 34 } },
  vertexShader: `uniform float t, pull, block, span; uniform vec3 finger; varying float vA; varying float vS;
    vec3 arc(float u, float l){
      float x0 = -span*.5 + span*(l+.5)/${FL_N}.;
      float w = 3.2 + mod(l,3.)*1.3; float h = w*.9;
      vec3 p = vec3(x0 + (u-.5)*w, sin(u*3.14159)*h - .25, sin(l*1.7)*1.5);
      // lines near the finger get pulled up into it (stronger when bare skin, blocked by glove)
      float d = length(vec2(x0-finger.x, p.z-finger.z));
      float a = pull*exp(-d*d/40.)*sin(u*3.14159);
      vec3 target = finger + vec3((u-.5)*1.4, -.4, 0.);
      vec3 q = mix(p, target, a);
      q.y = min(q.y, mix(1e3, finger.y - 1.6 + sin(u*3.14159)*.0, block*exp(-d*d/60.)*sin(u*3.14159)));
      return q;
    }
    void main(){
      float u = position.x, side = position.y, l = position.z;
      vec3 p = arc(u, l), p2 = arc(min(u+.02,1.), l), p0 = arc(max(u-.02,0.), l);
      vec4 mv = modelViewMatrix*vec4(p,1.); vec3 tg = (modelViewMatrix*vec4(p2-p0,0.)).xyz;
      vec3 sd = normalize(cross(tg, vec3(0,0,1)));
      mv.xyz += sd*side*.07;
      float flow = fract(u*3. - t*1.2 + l*.37);
      vA = smoothstep(0.,.08,u)*smoothstep(1.,.92,u)*(.35+.65*smoothstep(.75,1.,flow)); vS = side;
      gl_Position = projectionMatrix*mv; }`,
  fragmentShader: 'uniform float k; varying float vA; varying float vS; void main(){ float e = 1.-abs(vS); gl_FragColor = vec4(vec3(.35,.78,1.)*vA*k*(.4+e*1.2), 1.); }',
});
const fieldLines = new THREE.Mesh(flGeo, flM); fieldLines.frustumCulled = false; fieldLines.position.y = -.25; tech.add(fieldLines);

// knit fibers (the glove fabric between finger and glass), units mm
const fiber = new THREE.Group(); tech.add(fiber);
{
  const red = new THREE.MeshPhysicalMaterial({ color: 0x3a4255, roughness: .8, sheen: 1, sheenColor: new THREE.Color(0x9fb8d8), sheenRoughness: .6 });
  const silver = new THREE.MeshPhysicalMaterial({ color: 0xd8dce4, metalness: 1, roughness: .28, emissive: 0x59c7ff, emissiveIntensity: 0 });
  fiber.userData = { red, silver, plies: [] };
  for (let row = 0; row < 7; row++) for (let ply = 0; ply < 3; ply++) {
    const pts = [];
    for (let i = 0; i <= 240; i++) {
      const u = i / 240, x = -24 + u * 48, ph = x * 1.3;
      const tw = u * 48 * 2.2 + ply * 2.094;
      const y = Math.sin(ph) * .55 + Math.cos(tw) * .22, z = (row - 3) * 2.6 + Math.cos(ph) * 1.0 + Math.sin(tw) * .22;
      pts.push(V(x, y, z));
    }
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 480, .26, 8), red);
    m.userData.row = row; fiber.add(m); fiber.userData.plies.push(m);
  }
}

// ───────── stage: inside the body (water + salts) ─────────
const body = new THREE.Group(); scene.add(body);
const bodyBg = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, uniforms: { t: { value: 0 } },
  vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: 'varying vec3 vP; uniform float t; void main(){ float g = .5+.5*vP.y; vec3 a = vec3(.32,.03,.05), b = vec3(.85,.25,.18); float s = pow(max(0.,1.-length(vP.xy-vec2(.1,.1))),2.); gl_FragColor = vec4(mix(a, b, s*.8)*(.6+.4*g), 1.); }',
});
const MOL = { water: [], ions: [] };
{
  body.add(new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), bodyBg));
  const Om = new THREE.MeshPhysicalMaterial({ color: 0xff3b30, roughness: .15, clearcoat: 1 }), Hm = new THREE.MeshPhysicalMaterial({ color: 0xf4f7fb, roughness: .2, clearcoat: 1 });
  const Na = new THREE.MeshPhysicalMaterial({ color: 0xa06bff, roughness: .2, clearcoat: 1, emissive: 0x5a2fd0, emissiveIntensity: .25 });
  const Cl = new THREE.MeshPhysicalMaterial({ color: 0x3ddc84, roughness: .2, clearcoat: 1, emissive: 0x0f8a45, emissiveIntensity: .25 });
  const sO = new THREE.SphereGeometry(.5, 28, 18), sH = new THREE.SphereGeometry(.3, 20, 14), sI = new THREE.SphereGeometry(.62, 28, 18);
  for (let i = 0; i < 70; i++) {
    const g = new THREE.Group(); const o = new THREE.Mesh(sO, Om), h1 = new THREE.Mesh(sH, Hm), h2 = new THREE.Mesh(sH, Hm);
    h1.position.set(.48, .32, 0); h2.position.set(-.48, .32, 0); g.add(o, h1, h2);
    g.userData = { p: V((rnd() - .5) * 26, (rnd() - .5) * 18, -rnd() * 30 + 6), r: V(rnd() * 6, rnd() * 6, rnd() * 6), s: .5 + rnd() }; body.add(g); MOL.water.push(g);
  }
  for (let i = 0; i < 26; i++) {
    const isNa = i % 2 === 0, m = new THREE.Mesh(sI, isNa ? Na : Cl); m.scale.setScalar(isNa ? .8 : 1.15);
    m.userData = { p: V((rnd() - .5) * 22, (rnd() - .5) * 16, -rnd() * 26 + 5), s: .5 + rnd(), na: isNa }; body.add(m); MOL.ions.push(m);
  }
  body.add(new THREE.HemisphereLight(0xffd0c0, 0x400808, .9));
  const k = new THREE.DirectionalLight(0xffffff, 2.2); k.position.set(4, 8, 6); body.add(k);
  const b = new THREE.PointLight(0x59c7ff, 300, 60, 2); b.position.set(-6, 2, 4); body.add(b);
}
function updBody(t, flow) {
  for (const g of MOL.water) { const u = g.userData; g.position.copy(u.p).add(V(Math.sin(t * .5 * u.s + u.r.x) * .8, Math.cos(t * .4 * u.s + u.r.y) * .8, 0)); g.rotation.set(u.r.x + t * .6 * u.s, u.r.y + t * .4, u.r.z); }
  for (const m of MOL.ions) { const u = m.userData, dir = u.na ? 1 : -1; const x = u.p.x + Math.sin(t * .6 * u.s + u.p.y) * .6 + dir * flow * ((t * 6) % 30); m.position.set(((x + 15) % 30 + 30) % 30 - 15, u.p.y + Math.cos(t * .5 * u.s) * .6, u.p.z); }
}

// ───────── stage: magnified cross-section of the screen (units = mm; illustrative scale) ─────────
// Side cut through glass → sensor electrodes → RGB pixels → backplane. Fringe-field arcs loop between
// neighbouring electrodes through the glass; a finger (or glove / pen) above the glass bends them.
const xs = new THREE.Group(); scene.add(xs);
const XN = 21, XP = 4, XD = 12, XSPAN = XN * XP + 2;
const XE = Array.from({ length: XN }, (_, i) => (i - (XN - 1) / 2) * XP);   // electrode centres (x)
const XEY = -1.25;                                                            // electrode top-ish (y); glass top = 0
const xsElec = [];
{
  const glass = new THREE.Mesh(new THREE.BoxGeometry(XSPAN, 1.0, XD), new THREE.MeshPhysicalMaterial({ color: 0xbfe0ff, roughness: .04, transparent: true, opacity: .16, clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: 3, depthWrite: false }));
  glass.position.y = -.5; glass.renderOrder = 4; xs.add(glass);
  const glint = new THREE.Mesh(new THREE.BoxGeometry(XSPAN, .045, .045), new THREE.MeshBasicMaterial({ color: 0xcfeeff, transparent: true, opacity: .8 }));
  glint.position.set(0, 0, XD / 2); xs.add(glint);
  const glint2 = glint.clone(); glint2.position.y = -1.0; glint2.material = glint.material.clone(); glint2.material.opacity = .35; xs.add(glint2);
  const film = new THREE.Mesh(new THREE.BoxGeometry(XSPAN, .55, XD), new THREE.MeshPhysicalMaterial({ color: 0x0c1424, roughness: .35, transparent: true, opacity: .9 }));
  film.position.y = -1.3; xs.add(film);
  const eg = new RoundedBoxGeometry(2.0, .34, XD * .94, 2, .12);
  for (const x of XE) {
    const m = new THREE.Mesh(eg, new THREE.MeshStandardMaterial({ color: 0x223a58, emissive: 0x59c7ff, emissiveIntensity: .55, roughness: .25, metalness: .5 }));
    m.position.set(x, XEY - .08, 0); xs.add(m); xsElec.push(m);
  }
  // RGB sub-pixel layer
  const pix = new THREE.Mesh(new THREE.BoxGeometry(XSPAN, .6, XD), new THREE.ShaderMaterial({
    uniforms: { k: { value: .75 } },
    vertexShader: 'varying vec3 vW; void main(){ vW=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec3 vW; uniform float k;
      void main(){ float p = vW.x/1.05; float f = fract(p); float s = f*3.; int ch = int(floor(s)); float fx = fract(s);
        float m = smoothstep(.0,.18,fx)*smoothstep(1.,.82,fx);
        float row = smoothstep(.0,.08,fract(vW.z/1.05))*smoothstep(1.,.92,fract(vW.z/1.05));
        float face = abs(vW.y) > .29 ? row : smoothstep(.3,.1,abs(vW.y)-.0)*1.;
        vec3 c = ch==0 ? vec3(1.,.16,.2) : ch==1 ? vec3(.2,1.,.45) : vec3(.15,.4,1.);
        gl_FragColor = vec4(c*m*face*k + vec3(.01,.015,.03), 1.); }`,
  }));
  pix.position.y = -2.15; xs.add(pix); xs.userData.pix = pix;
  const base1 = new THREE.Mesh(new THREE.BoxGeometry(XSPAN, .5, XD), new THREE.MeshPhysicalMaterial({ color: 0x141b28, roughness: .3, metalness: .6 }));
  base1.position.y = -2.75; xs.add(base1);
  const base2 = new THREE.Mesh(new THREE.BoxGeometry(XSPAN, 2.6, XD), new THREE.MeshPhysicalMaterial({ color: 0x090d15, roughness: .5, metalness: .4 }));
  base2.position.y = -4.3; xs.add(base2);
  for (let i = 0; i < 4; i++) {
    const tr = new THREE.Mesh(new THREE.BoxGeometry(XSPAN, .035, .02), new THREE.MeshBasicMaterial({ color: 0x168bff, transparent: true, opacity: .25 + .1 * i }));
    tr.position.set(0, -3.3 - i * .5, XD / 2 + .01); xs.add(tr);
  }
  xs.add(new THREE.AmbientLight(0x2a3a58, .7));
  const kl = new THREE.DirectionalLight(0xe8f2ff, 1.6); kl.position.set(-20, 40, 30); xs.add(kl);
  const bl = new THREE.PointLight(0x168bff, 900, 120, 2); bl.position.set(25, 12, -10); xs.add(bl);
  const cl = new THREE.PointLight(0x59c7ff, 500, 90, 2); cl.position.set(-30, 6, 20); xs.add(cl);
}
// fringe-field arcs: per electrode pair 3 nested loops (front) + 1 dim loop further back
const XA_LOOPS = 4, XA_N = (XN - 1) * XA_LOOPS, XA_SEG = 48;
const xaGeo = new THREE.BufferGeometry();
{
  const pos = [], idx = [];
  for (let l = 0; l < XA_N; l++) for (let s = 0; s <= XA_SEG; s++) for (const sd of [-1, 1]) pos.push(s / XA_SEG, sd, l);
  for (let l = 0; l < XA_N; l++) for (let s = 0; s < XA_SEG; s++) { const b = (l * (XA_SEG + 1) + s) * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
  xaGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); xaGeo.setIndex(idx);
}
const xaM = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  uniforms: { t: { value: 0 }, k: { value: 1 }, F: { value: V(0, 30, 0) }, pull: { value: 0 }, cap: { value: 1e3 }, sig: { value: 7 }, scan: { value: -99 }, scanK: { value: 0 } },
  vertexShader: `uniform float t, pull, cap, sig, scan, scanK; uniform vec3 F; varying float vA; varying float vS; varying float vP;
    vec3 arc(float u, float l){
      float pr = mod(l, ${XN - 1}.), j = floor(l / ${XN - 1}.);
      float x0 = (pr - ${((XN - 1) / 2).toFixed(1)}) * ${XP}.;
      float jj = j > 2.5 ? 1. : j;
      float xa = x0 + .85 - .42*jj, xb = x0 + ${XP}. - .85 + .42*jj, h = 1.7 + 1.15*jj;
      float z = j > 2.5 ? -3.2 : (jj - 1.)*.6;
      float s = sin(u*3.14159);
      vec3 p = vec3(mix(xa, xb, u), ${XEY} + s*h, z);
      float xm = .5*(xa+xb), d = xm - F.x;
      float a = pull*exp(-d*d/(sig*sig));
      vec3 apex = vec3(xm, ${XEY} + h, z);
      vec3 tgt = vec3(F.x + d*.28 + (u-.5)*1.2, F.y + .25 + jj*.35, z*.6);
      p += (tgt - apex) * a * pow(s, .65);
      p.y = min(p.y, cap - .15 - .25*(2.-jj) + (1.-s)*10.);
      vP = a;
      return p;
    }
    void main(){
      float u = position.x, sd = position.y, l = position.z;
      vec3 p = arc(u, l), p2 = arc(min(u+.02,1.), l), p0 = arc(max(u-.02,0.), l);
      vec4 mv = modelViewMatrix*vec4(p,1.); vec3 tg = (modelViewMatrix*vec4(p2-p0,0.)).xyz;
      vec3 sdv = normalize(cross(tg, vec3(0,0,1)));
      float back = l >= ${(XN - 1) * 3}. ? 1. : 0.;
      mv.xyz += sdv*sd*(.075 + .05*vP);
      float pr = mod(l, ${XN - 1}.);
      float flow = fract(u*2. - t*1.1 + pr*.23 + floor(l/${XN - 1}.)*.31);
      float sc = scanK*exp(-pow(pr - scan, 2.)*.5);
      vA = smoothstep(0.,.06,u)*smoothstep(1.,.94,u)*(.4+.6*smoothstep(.7,1.,flow))*(1. - .65*back)*(1. + 1.6*vP + 1.2*sc);
      vS = sd;
      gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `uniform float k; varying float vA; varying float vS; varying float vP;
    void main(){ float e = 1.-abs(vS); vec3 c = mix(vec3(.09,.55,1.), vec3(.55,.88,1.), e*.8 + vP*.4);
      gl_FragColor = vec4(c*vA*k*(.35+e*1.3), 1.); }`,
});
const xsArcs = new THREE.Mesh(xaGeo, xaM); xsArcs.frustumCulled = false; xs.add(xsArcs);
// knit loops for the cross-section (glove fabric seen in section: rows of wool loops under the fingertip)
const xsKnit = new THREE.Group(); xs.add(xsKnit);
{
  const wool = new THREE.MeshPhysicalMaterial({ color: 0x485268, roughness: .85, sheen: 1, sheenColor: new THREE.Color(0xa8c4e8), sheenRoughness: .5 });
  const silver = new THREE.MeshPhysicalMaterial({ color: 0xdfe5ee, metalness: 1, roughness: .25, emissive: 0x59c7ff, emissiveIntensity: 0 });
  const tor = new THREE.TorusGeometry(.95, .32, 12, 32);
  xsKnit.userData = { wool, silver, loops: [] };
  for (let row = 0; row < 2; row++) for (let i = 0; i < 20; i++) {
    const m = new THREE.Mesh(tor, wool); m.userData = { i, row }; xsKnit.add(m); xsKnit.userData.loops.push(m);
  }
}
// pose the knit loops along an arc under the fingertip: centre cx, bottom y, half-width hw
function xsKnitAt(cx, by, hw, cond = 0, glow = 0) {
  xsKnit.visible = true;
  for (const m of xsKnit.userData.loops) {
    const { i, row } = m.userData, u = (i + .5 * row) / 19 - .5, x = cx + u * hw * 2.1;
    const y = by + 1.27 + row * 1.25 + Math.pow(Math.abs(u) * 2, 2.2) * hw * .5;
    m.position.set(x, y, 1.5 - row * 1.2); m.rotation.set(0, .35 * row, Math.atan(u * 2.4) * .8 + (i % 2 ? .25 : -.25));
    const sil = cond && (i + row) % 2 === 0; m.material = sil ? xsKnit.userData.silver : xsKnit.userData.wool;
  }
  xsKnit.userData.silver.emissiveIntensity = glow;
}

// ───────── ions inside the fingertip (Na⁺ / Cl⁻ + water), parented to the hand so they follow it ─────────
const ionG = new THREE.Group();
const IONS = [];
{
  const P = POSES.point, ax = P.dist.clone().sub(P.tip), L = ax.length(); ax.normalize();
  const t1 = new THREE.Vector3(1, 0, 0).cross(ax).normalize(), t2 = ax.clone().cross(t1);
  const lab = (txt, bg, fg) => A.canvasTex(256, 256, x => { x.fillStyle = bg; x.beginPath(); x.arc(128, 128, 120, 0, 7); x.fill(); x.fillStyle = fg; x.font = '700 92px PlexLatin'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 128, 136); });
  const tNa = lab('Na⁺', '#168BFF', '#F4F7FB'), tCl = lab('Cl⁻', '#E8F2FF', '#0B1220');
  const sH = new THREE.SpriteMaterial({ map: DOT, color: 0x9fdcff, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending });
  for (let i = 0; i < 26; i++) {
    const na = i % 2 === 0;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: na ? tNa : tCl, transparent: true, depthWrite: false }));
    const r = .0011 + (na ? 0 : .0004);
    sp.scale.setScalar(r * 2);
    const s0 = .1 + rnd() * 1.5, a0 = rnd() * 6.283, rr = Math.sqrt(rnd()) * .0052;
    sp.userData = { na, s0, a0, rr, ph: rnd() * 6.283, sp: .6 + rnd() * .8 };
    ionG.add(sp); IONS.push(sp);
  }
  for (let i = 0; i < 46; i++) {
    const w = new THREE.Sprite(sH); w.scale.setScalar(.0011);
    w.userData = { w: 1, s0: .05 + rnd() * 1.6, a0: rnd() * 6.283, rr: Math.sqrt(rnd()) * .0056, ph: rnd() * 6.283, sp: .4 + rnd() * .6 };
    ionG.add(w); IONS.push(w);
  }
  ionG.userData = { T: P.tip.clone(), ax, t1, t2, L };
  handA.userData.inner.add(ionG);
}
function updIons(t, flow = 0) {
  const { T, ax, t1, t2, L } = ionG.userData; ionG.visible = true;
  for (const m of IONS) {
    const u = m.userData, dir = u.w ? 0 : (u.na ? -1 : 1);
    let s = u.s0 + Math.sin(t * u.sp + u.ph) * .08 + dir * flow * ((t * .9 * u.sp) % 1.6);
    s = ((s - .05) % 1.6 + 1.6) % 1.6 + .05;
    const a = u.a0 + t * .3 * u.sp, rr = u.rr * Math.min(1, s * 2.2);
    m.position.copy(T).addScaledVector(ax, s * L).addScaledVector(t1, Math.cos(a) * rr).addScaledVector(t2, Math.sin(a) * rr);
  }
}

// ───────── post: bloom + final grade (zoom-blur, chromatic aberration, vignette, grain, flash) ─────────
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
composer.setPixelRatio(1); composer.setSize(W, H);
const rp = new RenderPass(scene, cam); composer.addPass(rp);
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), .35, .55, .85); composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, t: { value: 0 }, zb: { value: 0 }, ca: { value: .0015 }, vig: { value: .45 }, grain: { value: .05 }, flash: { value: 0 }, tint: { value: new THREE.Vector3(1, 1, 1) }, lift: { value: new THREE.Vector3(0, 0, 0) }, sat: { value: 1.08 }, split: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float t, zb, ca, vig, grain, flash, sat, split; uniform vec3 tint, lift; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec2 c = vec2(.5,.5), d = vUv - c; vec3 col = vec3(0.);
      float n = zb > .001 ? 10. : 1.;
      for (float i = 0.; i < 10.; i++) { if (i >= n) break; float s = 1. - zb*i/10.*.12;
        vec2 uv = c + d*s; float k = ca*(1.+zb*6.)*length(d)*2.;
        col += vec3(texture2D(tDiffuse, uv + d*k).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - d*k).b); }
      col /= n;
      col = col*tint + lift*(1.-col);
      float l = dot(col, vec3(.299,.587,.114)); col = mix(vec3(l), col, sat);
      col *= 1. - vig*smoothstep(.35, 1.0, length(d*vec2(1.,.62))*1.6);
      col += (h(floor(vUv*vec2(1080.,1920.)) + fract(t*7.)*100.) - .5)*grain;
      col = mix(col, vec3(1.,1.,1.), flash);
      if (split > 0.) { float e = smoothstep(.003,.0,abs(vUv.x-.5)); col = mix(col, vec3(.96,.97,.98), e*split); }
      gl_FragColor = vec4(col, 1.);
    }`,
});
composer.addPass(grade);

// split-screen: render the scene twice into the left/right halves of the render target
const origRender = rp.render.bind(rp);
let SPLIT = null;
rp.render = function (r, wb, rb, dt, mask) {
  if (!SPLIT) return origRender(r, wb, rb, dt, mask);
  const tgt = rb; const half = W / 2;
  r.setRenderTarget(tgt); r.setClearColor(0x000000, 1); r.clear();
  for (const [i, fn] of SPLIT.entries()) {
    fn(); cam.setViewOffset(W, H, (W - half) / 2, 0, half, H); cam.updateProjectionMatrix();
    tgt.viewport.set(i * half, 0, half, H); tgt.scissor.set(i * half, 0, half, H); tgt.scissorTest = true;
    r.setRenderTarget(tgt); r.render(scene, cam);
  }
  tgt.viewport.set(0, 0, W, H); tgt.scissor.set(0, 0, W, H); tgt.scissorTest = false; cam.clearViewOffset();
};

// ───────── public API used by timeline.js ─────────
const STAGES = { night, desk, studio, tech, body, xs };
function reset() {
  for (const s of Object.values(STAGES)) s.visible = false;
  handA.visible = handB.visible = false; phoneRig.visible = false; pencil.visible = die.visible = cloth.visible = false;
  fiber.visible = false; fieldLines.visible = false; xsKnit.visible = false; ionG.visible = false; xsArcs.visible = true;
  xaM.uniforms.pull.value = 0; xaM.uniforms.cap.value = 1e3; xaM.uniforms.k.value = 1; xaM.uniforms.scanK.value = 0; xaM.uniforms.sig.value = 7;
  for (const m of xsElec) m.material.emissiveIntensity = .55;
  studio.userData.floor.visible = true; pencil.scale.setScalar(1);
  scene.fog = null; scene.background = new THREE.Color(0x05070b); scene.environment = ENV.studio; scene.environmentIntensity = 1;
  renderer.toneMappingExposure = 1; bloom.strength = .3; bloom.threshold = .92; bloom.radius = .55;
  cam.fov = 30; cam.near = .005; cam.far = 200; cam.up.set(0, 1, 0); cam.clearViewOffset();
  screenLight.intensity = 0; phone.group.position.set(0, 0, 0); phone.group.rotation.set(0, 0, 0);
  Object.assign(grade.uniforms.tint.value, { x: 1, y: 1, z: 1 }); Object.assign(grade.uniforms.lift.value, { x: 0, y: 0, z: 0 });
  grade.uniforms.zb.value = 0; grade.uniforms.flash.value = 0; grade.uniforms.sat.value = 1.08; grade.uniforms.vig.value = .45; grade.uniforms.ca.value = .0015; grade.uniforms.split.value = 0;
  SPLIT = null;
  tech.userData.glass.visible = true; tech.userData.pix.visible = true; tech.userData.sensor.visible = true;
  sensorM.uniforms.scanK.value = 0; sensorM.uniforms.heatK.value = 0; sensorM.uniforms.lock.value = 0; sensorM.uniforms.hue.value = 0; sensorM.uniforms.bright.value = 1;
  flM.uniforms.pull.value = 0; flM.uniforms.block.value = 0; flM.uniforms.k.value = 0;
  for (const p of fiber.userData.plies) p.material = fiber.userData.red;
}
function stage(name, t) {
  const s = STAGES[name]; s.visible = true;
  if (name === 'night') { scene.environment = ENV.night; scene.environmentIntensity = 1.4; scene.background = new THREE.Color(0x070a12); scene.fog = new THREE.FogExp2(0x0a0f1a, .09); }
  if (name === 'desk') { scene.environment = ENV.night; scene.environmentIntensity = 1.1; scene.background = new THREE.Color(0x070a11); scene.fog = new THREE.FogExp2(0x080b12, .25); }
  if (name === 'studio') { scene.environment = ENV.studio; scene.environmentIntensity = .9; scene.background = null; }
  if (name === 'tech') { scene.environment = ENV.studio; scene.environmentIntensity = .8; scene.background = new THREE.Color(0x03050a); scene.fog = new THREE.FogExp2(0x03050a, .006); sensorM.uniforms.t.value = t; flM.uniforms.t.value = t; }
  if (name === 'xs') { scene.environment = ENV.studio; scene.environmentIntensity = .9; scene.background = new THREE.Color(0x05070c); scene.fog = new THREE.FogExp2(0x05070c, .006); xaM.uniforms.t.value = t; }
  if (name === 'body') { scene.environment = ENV.sunset; scene.environmentIntensity = .9; scene.background = null; scene.fog = new THREE.FogExp2(0x4a0a0c, .035); }
}
function lookCam(pos, look, fov = 30, roll = 0) {
  cam.position.copy(pos); cam.fov = fov; if (roll && roll.isVector3) cam.up.copy(roll); else cam.up.set(Math.sin(roll), Math.cos(roll), 0); cam.lookAt(look); cam.updateProjectionMatrix();
}
// lowest point of a hand rig's visible surface (world), used to rest the finger exactly on the glass
function lowest(rig) {
  rig.updateMatrixWorld(true); const u = rig.userData, m = u.mode === 'skin' ? u.skin : u.glove, P = m.geometry.attributes.position, v = new THREE.Vector3();
  let best = { x: 0, y: 1e9 };
  for (let i = 0; i < P.count; i += 3) { v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld); if (v.y < best.y) best = { x: v.x, y: v.y }; }
  return best;
}
function project(v) { cam.updateMatrixWorld(); const p = v.clone().project(cam); return [(p.x * .5 + .5) * 1080, (-p.y * .5 + .5) * 1920]; }

window.R3 = {
  THREE, V, scene, cam, renderer, phone, phoneRig, handA, handB, pencil, die, cloth, fiber, fieldLines, tech, body, studio, night, desk,
  sensor: sensorM.uniforms, field: flM.uniforms, xs, xsArc: xaM.uniforms, xsElec, XE, XEY, xsKnitAt, updIons, ionG, grade: grade.uniforms, bloom, veinM, condM, ENV, POSES,
  setHand, setUI, reset, lowest, stage, lookCam, project, updSnow, updBody, updCloth, screenLight,
  split(fns) { SPLIT = fns; grade.uniforms.split.value = 1; },
  render() { composer.render(); },
};
window.G3 = {
  render(t) {
    const sh = (window.SHOTS || []).find(s => t >= s.s && t < s.e);
    canvas.style.opacity = sh ? 1 : 0;
    if (!sh) { window.POST3D?.(null); return; }
    reset();
    grade.uniforms.t.value = t;
    sh.update(t - sh.s, t, sh);
    // cut punch: brief zoom-blur + flash on every cut (unless the shot opts out)
    const lt = t - sh.s;
    if (!sh.noPunch && sh.s > 0) grade.uniforms.zb.value = Math.max(grade.uniforms.zb.value, .9 * Math.max(0, 1 - lt / .16));
    window.POST3D?.(sh, lt, t);
    composer.render();
  },
};
window.G3ready = true;
