// KROZO v2 — "realistic" multi-shot 3D world for the touchscreen/gloves reel.
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
const knitRed = A.knitMat(0x8f2420);
const knitGray = A.knitMat(0x3a3d44);
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
  const skin = new THREE.Mesh(GEO.point.skin, skinM), glove = new THREE.Mesh(GEO.point.glove, knitRed), vein = new THREE.Mesh(A.inflate(GEO.point.skin, .0006), veinM);
  vein.renderOrder = 5;
  // sleeve (wool coat) covering the wrist opening
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(.06, .05, .5, 48, 1, true), A.knitMat(0x1c2230));
  sleeve.material.side = THREE.DoubleSide;
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(.047, .045, .05, 48, 1, true), A.knitMat(0x8f2420)); cuff.material.side = THREE.DoubleSide;
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
  u.glove.material = mode === 'cond' ? condM : (o.knit === 'gray' ? knitGray : knitRed);
  u.glove.position.set(0, slide * .26, 0);
  u.cuff.visible = mode !== 'skin' && !o.noCuff;
  u.cuff.position.set(P.wrist.x - .002, P.wrist.y - .03 + slide * .26, P.wrist.z + .004); u.cuff.scale.set(.78, 1, 1.02);
  u.cuff.material = u.glove.material;
  u.vein.visible = (o.vein || 0) > 0; veinM.uniforms.k.value = o.vein || 0;
  if (mode === 'cond') { condU.tips.value = P.tipsAll; condU.glow.value = o.glow || 0; }
  skinM.transparent = !!o.xray; skinM.opacity = o.xray ? 1 - .75 * o.xray : 1; skinM.depthWrite = !o.xray;
  rig.scale.setScalar(o.scale || 1);
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
  const cols = [0xffb347, 0xff8c42, 0xffd27f, 0xffc070, 0x59c7ff, 0xff4a3d, 0xfff1d0, 0x168bff];
  for (let i = 0; i < 90; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: BOKEH, color: cols[i % cols.length], transparent: true, opacity: .12 + rnd() * .25, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    const d = 3 + rnd() * 9; m.position.set((rnd() - .5) * d * 1.8, -.6 + rnd() * 2.6, -d); m.scale.setScalar(.12 + rnd() * .35 * d / 4);
    m.userData.ph = rnd() * 6; night.add(m);
  }
  // street lamp glow
  const lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: DOT, color: 0xffb060, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  lamp.position.set(1.6, 2.2, -4); lamp.scale.setScalar(3.5); night.add(lamp);
  night.add(new THREE.HemisphereLight(0x8fb4ff, 0x0b0d12, .55));
  const rim = new THREE.SpotLight(0xffb36b, 30, 12, .6, .7, 2); rim.position.set(1.2, 2.4, -2.2); rim.target.position.set(0, 0, 0); night.add(rim, rim.target);
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
    x.fillStyle = '#5a3a24'; x.fillRect(0, 0, w, h);
    const r = A.rnd(11);
    for (let i = 0; i < 260; i++) { const y = r() * h, a = .04 + r() * .12; x.strokeStyle = r() < .5 ? `rgba(30,16,8,${a})` : `rgba(140,96,60,${a})`; x.lineWidth = 1 + r() * 4;
      x.beginPath(); x.moveTo(0, y); for (let X = 0; X <= w; X += 32) x.lineTo(X, y + Math.sin(X * .006 + i) * 9 + Math.sin(X * .03 + i * 3) * 2); x.stroke(); }
  });
  wood.repeat.set(3, 3);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshPhysicalMaterial({ map: wood, roughness: .42, clearcoat: .5, clearcoatRoughness: .25 }));
  top.rotation.x = -Math.PI / 2; top.position.y = -.0045; desk.add(top);
  const cols = [0xffc27a, 0xffa94d, 0xfff0c9, 0xff9e6d];
  for (let i = 0; i < 40; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: BOKEH, color: cols[i % 4], transparent: true, opacity: .25 + rnd() * .35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    const d = 1.5 + rnd() * 3; m.position.set((rnd() - .5) * d * 1.6, .3 + rnd() * 1.4, -d); m.scale.setScalar(.06 + rnd() * .16 * d); desk.add(m);
  }
  const key = new THREE.SpotLight(0xffd6a3, 14, 4, .7, .8, 2); key.position.set(.5, .9, .2); key.target.position.set(0, 0, 0); desk.add(key, key.target);
  desk.add(new THREE.HemisphereLight(0xffe6c8, 0x2a1a10, .5));
  const back = new THREE.DirectionalLight(0x9fc6ff, .6); back.position.set(-.5, .4, -.8); desk.add(back);
}

// ───────── stage: studio (product shots) ─────────
const studio = new THREE.Group(); scene.add(studio);
const studioBg = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, uniforms: { c1: { value: new THREE.Color(0x10203a) }, c2: { value: new THREE.Color(0x020306) }, t: { value: 0 } },
  vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: 'varying vec3 vP; uniform vec3 c1; uniform vec3 c2; uniform float t; void main(){ float g = smoothstep(-.6,.9, vP.y*.3+.55 - length(vP.xz)*.0); float s = pow(max(0., 1.-length(vP.xy-vec2(.0,.15))*1.1), 2.); gl_FragColor = vec4(mix(c2, c1, s*.9+g*.1), 1.); }',
});
{
  const dome = new THREE.Mesh(new THREE.SphereGeometry(8, 48, 24), studioBg); studio.add(dome);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.MeshPhysicalMaterial({ color: 0x05070b, roughness: .18, metalness: .3, clearcoat: 1, clearcoatRoughness: .05 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.12; studio.add(floor);
  const r1 = new THREE.SpotLight(0x168bff, 26, 6, .5, .6, 2); r1.position.set(-.8, .6, -.6); r1.target.position.set(0, 0, 0);
  const r2 = new THREE.SpotLight(0xff5aa8, 14, 6, .5, .6, 2); r2.position.set(.8, .4, -.5); r2.target.position.set(0, 0, 0);
  const k = new THREE.DirectionalLight(0xffffff, 1.6); k.position.set(.4, .8, 1);
  studio.add(r1, r1.target, r2, r2.target, k, new THREE.AmbientLight(0x404a60, .4));
  studio.userData.r1 = r1; studio.userData.r2 = r2;
}
// props for "doesn't react to anything": pencil (rubber eraser) + plastic die
const pencil = new THREE.Group();
{
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.0042, .0042, .15, 6), new THREE.MeshPhysicalMaterial({ color: 0xf2b705, roughness: .35, clearcoat: .6 }));
  const fer = new THREE.Mesh(new THREE.CylinderGeometry(.0044, .0044, .012, 24), new THREE.MeshPhysicalMaterial({ color: 0xc9ccd2, metalness: 1, roughness: .3 }));
  const er = new THREE.Mesh(new THREE.CylinderGeometry(.0041, .0041, .009, 24), new THREE.MeshPhysicalMaterial({ color: 0xef8a9a, roughness: .7 }));
  body.position.y = .075 + .021; fer.position.y = .015; er.position.y = .0045; pencil.add(body, fer, er); scene.add(pencil);
}
const die = new THREE.Mesh(new RoundedBoxGeometry(.016, .016, .016, 4, .0025), new THREE.MeshPhysicalMaterial({ color: 0xff3b30, roughness: .15, clearcoat: 1, transmission: 0, }));
scene.add(die);
// cloth swatch (deformed each frame)
const clothGeo = new THREE.PlaneGeometry(.11, .11, 36, 36), clothBase = clothGeo.attributes.position.array.slice();
const cloth = new THREE.Mesh(clothGeo, A.knitMat(0x8f2420)); cloth.material.side = THREE.DoubleSide; scene.add(cloth);
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
      vec3 cTx = mix(vec3(.09,.55,1.), vec3(1.,.55,.2), hue), cRx = vec3(.35,.78,1.);
      vec3 c = cTx*(tx*.75+txb*.35)*(.55+1.6*sc) + cRx*(rx*.65+rxb*.3)*(.5+.5*sc);
      c += vec3(1.,.8,.35)*hb*(tx+rx+.15)*1.1 + vec3(1.,.45,.15)*hb*.15;
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
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xd4a84a, metalness: 1, roughness: .25 });
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
  const red = new THREE.MeshPhysicalMaterial({ color: 0x9a2a24, roughness: .8, sheen: 1, sheenColor: new THREE.Color(0xff8a70), sheenRoughness: .6 });
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
const STAGES = { night, desk, studio, tech, body };
function reset() {
  for (const s of Object.values(STAGES)) s.visible = false;
  handA.visible = handB.visible = false; phoneRig.visible = false; pencil.visible = die.visible = cloth.visible = false;
  fiber.visible = false; fieldLines.visible = false;
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
  if (name === 'desk') { scene.environment = ENV.warm; scene.environmentIntensity = .7; scene.background = new THREE.Color(0x120c08); scene.fog = new THREE.FogExp2(0x140d08, .25); }
  if (name === 'studio') { scene.environment = ENV.studio; scene.environmentIntensity = .9; scene.background = null; }
  if (name === 'tech') { scene.environment = ENV.studio; scene.environmentIntensity = .8; scene.background = new THREE.Color(0x03050a); scene.fog = new THREE.FogExp2(0x03050a, .006); sensorM.uniforms.t.value = t; flM.uniforms.t.value = t; }
  if (name === 'body') { scene.environment = ENV.sunset; scene.environmentIntensity = .9; scene.background = null; scene.fog = new THREE.FogExp2(0x4a0a0c, .035); }
}
function lookCam(pos, look, fov = 30, roll = 0) {
  cam.position.copy(pos); cam.fov = fov; if (roll && roll.isVector3) cam.up.copy(roll); else cam.up.set(Math.sin(roll), Math.cos(roll), 0); cam.lookAt(look); cam.updateProjectionMatrix();
}
function project(v) { const p = v.clone().project(cam); return [(p.x * .5 + .5) * 1080, (-p.y * .5 + .5) * 1920]; }

window.R3 = {
  THREE, V, scene, cam, renderer, phone, phoneRig, handA, handB, pencil, die, cloth, fiber, fieldLines, tech, body, studio, night, desk,
  sensor: sensorM.uniforms, field: flM.uniforms, grade: grade.uniforms, bloom, veinM, condM, ENV, POSES,
  setHand, setUI, reset, stage, lookCam, project, updSnow, updBody, updCloth, screenLight,
  split(fns) { SPLIT = fns; grade.uniforms.split.value = 1; },
  render() { composer.render(); },
};
window.G3 = {
  render(t) {
    const sh = (window.SHOTS || []).find(s => t >= s.s && t < s.e);
    canvas.style.opacity = sh ? 1 : 0;
    if (!sh) return;
    reset();
    grade.uniforms.t.value = t;
    sh.update(t - sh.s, t, sh);
    // cut punch: brief zoom-blur + flash on every cut (unless the shot opts out)
    const lt = t - sh.s;
    if (!sh.noPunch && sh.s > 0) grade.uniforms.zb.value = Math.max(grade.uniforms.zb.value, .9 * Math.max(0, 1 - lt / .16));
    composer.render();
  },
};
window.G3ready = true;
