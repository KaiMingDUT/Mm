// KROZO v2 — photoreal-ish asset builders (hand, glove, phone, screen UI, textures).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// ───────── Loop subdivision (positions only; normals recomputed) ─────────
export function loopSubdivide(geo, iters = 1) {
  for (let it = 0; it < iters; it++) {
    const P = geo.attributes.position.array, I = geo.index.array, nv = P.length / 3;
    const edges = new Map(), nbr = Array.from({ length: nv }, () => new Set());
    const key = (a, b) => a < b ? a * 1e6 + b : b * 1e6 + a;
    for (let f = 0; f < I.length; f += 3) {
      for (let k = 0; k < 3; k++) {
        const a = I[f + k], b = I[f + (k + 1) % 3], c = I[f + (k + 2) % 3];
        const kk = key(a, b); let e = edges.get(kk);
        if (!e) { e = { a, b, o: [], id: -1 }; edges.set(kk, e); }
        e.o.push(c); nbr[a].add(b); nbr[b].add(a);
      }
    }
    const boundary = new Uint8Array(nv);
    for (const e of edges.values()) if (e.o.length < 2) { boundary[e.a] = 1; boundary[e.b] = 1; }
    const out = [];
    for (let v = 0; v < nv; v++) {
      const n = nbr[v].size, x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
      if (boundary[v]) { out.push(x, y, z); continue; }
      const beta = n === 3 ? 3 / 16 : 3 / (8 * n);
      let sx = 0, sy = 0, sz = 0; for (const u of nbr[v]) { sx += P[u * 3]; sy += P[u * 3 + 1]; sz += P[u * 3 + 2]; }
      out.push((1 - n * beta) * x + beta * sx, (1 - n * beta) * y + beta * sy, (1 - n * beta) * z + beta * sz);
    }
    let id = nv;
    for (const e of edges.values()) {
      const { a, b, o } = e;
      for (let c = 0; c < 3; c++) {
        out.push(o.length === 2 ? .375 * (P[a * 3 + c] + P[b * 3 + c]) + .125 * (P[o[0] * 3 + c] + P[o[1] * 3 + c]) : .5 * (P[a * 3 + c] + P[b * 3 + c]));
      }
      e.id = id++;
    }
    const NI = [];
    for (let f = 0; f < I.length; f += 3) {
      const a = I[f], b = I[f + 1], c = I[f + 2];
      const ab = edges.get(key(a, b)).id, bc = edges.get(key(b, c)).id, ca = edges.get(key(c, a)).id;
      NI.push(a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca);
    }
    geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
    geo.setIndex(NI);
  }
  geo.computeVertexNormals();
  return geo;
}

// ───────── procedural canvas textures ─────────
export function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}
function rnd(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// triplanar procedural detail injected into a standard/physical material (no UVs needed)
// kind: 'skin' (pores + fine wrinkles), 'knit' (V-stitch rows), 'conductive' (metal threads)
export function addDetail(mat, kind, scale) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.dScale = { value: scale };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObjP; varying vec3 vObjN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjP = position; vObjN = normal;');
    const noise = `
      varying vec3 vObjP; varying vec3 vObjN; uniform float dScale;
      vec3 pNA( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float fd ) {
        vec3 vSigmaX = normalize( dFdx( surf_pos ) ); vec3 vSigmaY = normalize( dFdy( surf_pos ) ); vec3 vN = surf_norm;
        vec3 R1 = cross( vSigmaY, vN ); vec3 R2 = cross( vN, vSigmaX ); float fDet = dot( vSigmaX, R1 ) * fd;
        vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 ); return normalize( abs( fDet ) * surf_norm - vGrad ); }
      float h3(vec3 p){ p=fract(p*.3183099+.1); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      float n3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
        return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
      float knit(vec3 p){ // V-shaped stitches along the finger axis (local -z/y)
        float row = p.y*dScale*1.0 + p.z*dScale*.4; float col = p.x*dScale*1.6;
        float v = abs(fract(col)-.5); float s = sin((row + v*1.2)*6.2831);
        return .5+.5*s; }
      float det(vec3 p){
        ${kind === 'skin' ? 'return n3(p*dScale)*.6 + n3(p*dScale*2.7)*.4;' : ''}
        ${kind === 'knit' ? 'return knit(p)*.8 + n3(p*dScale*3.)*.2;' : ''}
        ${kind === 'conductive' ? 'return knit(p)*.7 + n3(p*dScale*4.)*.3;' : ''}
      }`;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + noise)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { float aa = clamp(1.4 - length(fwidth(vObjP))*dScale*4.5, 0., 1.);
          float hh = aa * det(vObjP) * ${kind === 'skin' ? '.35' : kind === 'knit' ? '2.2' : '1.6'};
          normal = pNA( - vViewPosition, normal, vec2(dFdx(hh), dFdy(hh)), faceDirection ); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        { float aa2 = clamp(1.4 - length(fwidth(vObjP))*dScale*4.5, 0., 1.); float d = mix(.5, det(vObjP), aa2); diffuseColor.rgb *= ${kind === 'skin' ? 'mix(.93,1.04,d)' : kind === 'knit' ? 'mix(.55,1.1,d)' : 'mix(.7,1.15,d)'}; }`);
  };
  mat.customProgramCacheKey = () => kind;
  return mat;
}

// ───────── hand (MIT, WebXR generic hand) posed to "pointing", baked & subdivided ─────────
export async function loadHand(url) {
  const gltf = await new GLTFLoader().loadAsync(url);
  let sk; gltf.scene.traverse(o => { if (o.isSkinnedMesh) sk = o; });
  const B = n => gltf.scene.getObjectByName(n);
  return { gltf, sk, B };
}
// Joints in this model are flat (no parent chain), so we do the forward kinematics ourselves:
// rotating joint k swings it and every joint after it in the chain about joint k's position (world axes;
// bind pose: fingers point -y, palm faces -x, thumb side -z → curl = negative rotation about +z).
const CH = f => f === 'thumb' ? ['thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip']
  : [`${f}-finger-phalanx-proximal`, `${f}-finger-phalanx-intermediate`, `${f}-finger-phalanx-distal`, `${f}-finger-tip`];
function rotChain(H, f, k, axis, ang) {
  const ch = CH(f).map(H.B), piv = ch[k].position.clone(), q = new THREE.Quaternion().setFromAxisAngle(axis.clone().normalize(), ang);
  for (let j = k; j < ch.length; j++) { ch[j].position.sub(piv).applyQuaternion(q).add(piv); ch[j].quaternion.premultiply(q); }
}
const Z = new THREE.Vector3(0, 0, 1), X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);
export function bakeHand(H, pose) {
  const { gltf, sk, B } = H;
  sk.skeleton.pose(); gltf.scene.updateMatrixWorld(true);
  for (const f of ['index', 'middle', 'ring', 'pinky']) {
    const a = pose[f[0]] ?? 0; if (!a) continue;
    [1, 1.25, .8].forEach((m, k) => rotChain(H, f, k, Z, -a * m));
  }
  if (pose.ty) rotChain(H, 'thumb', 0, Y, pose.ty);
  if (pose.tx) rotChain(H, 'thumb', 0, X, pose.tx);
  if (pose.tz) rotChain(H, 'thumb', 0, Z, pose.tz);
  if (pose.t1) rotChain(H, 'thumb', 1, new THREE.Vector3(1, 0, .6), pose.t1);
  if (pose.t2) rotChain(H, 'thumb', 2, new THREE.Vector3(1, 0, .6), pose.t2);
  gltf.scene.updateMatrixWorld(true);
  sk.skeleton.update();
  const src = sk.geometry, n = src.attributes.position.count, v = new THREE.Vector3();
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { v.fromBufferAttribute(src.attributes.position, i); sk.applyBoneTransform(i, v); v.applyMatrix4(sk.matrixWorld); pos.set([v.x, v.y, v.z], i * 3); }
  let g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(src.index.clone());
  g = mergeVertices(g, 1e-5);
  g = loopSubdivide(g, 2);
  const tip = new THREE.Vector3(); B('index-finger-tip').getWorldPosition(tip);
  const dist = new THREE.Vector3(); B('index-finger-phalanx-distal').getWorldPosition(dist);
  const wrist = new THREE.Vector3(); B('wrist').getWorldPosition(wrist);
  const tipsAll = ['thumb-tip', 'index-finger-tip', 'middle-finger-tip', 'ring-finger-tip', 'pinky-finger-tip'].map(n => { const v = new THREE.Vector3(); B(n).getWorldPosition(v); return v; });
  return { geo: g, tip, dist, wrist, tipsAll };
}
export function inflate(geo, d) {
  const g = geo.clone(), P = g.attributes.position, N = g.attributes.normal;
  for (let i = 0; i < P.count; i++) P.setXYZ(i, P.getX(i) + N.getX(i) * d, P.getY(i) + N.getY(i) * d, P.getZ(i) + N.getZ(i) * d);
  g.computeVertexNormals(); return g;
}
export const skinMat = () => addDetail(new THREE.MeshPhysicalMaterial({ color: 0xc98d6e, roughness: .5, sheen: .6, sheenColor: new THREE.Color(0xff9a7a), sheenRoughness: .5, clearcoat: .08, clearcoatRoughness: .6 }), 'skin', 900);
export const knitMat = (col) => addDetail(new THREE.MeshPhysicalMaterial({ color: col, roughness: .95, sheen: .45, sheenColor: new THREE.Color(col).lerp(new THREE.Color(0xffffff), .12), sheenRoughness: .8 }), 'knit', 420);

// ───────── phone ─────────
export function makePhone() {
  const g = new THREE.Group();
  const w = .0716, h = .1476, d = .0080;
  const frame = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 6, .0095),
    new THREE.MeshPhysicalMaterial({ color: 0x2b2f36, metalness: 1, roughness: .28, clearcoat: .3 }));
  g.add(frame);
  // glass front (slightly larger than screen), black border
  const glassShape = roundedRect(w - .0012, h - .0012, .0088);
  const glass = new THREE.Mesh(new THREE.ShapeGeometry(glassShape, 24), new THREE.MeshPhysicalMaterial({ color: 0x020203, roughness: .1, metalness: 0, clearcoat: .5, clearcoatRoughness: .05, envMapIntensity: .3 }));
  glass.position.z = d / 2 + .00005; g.add(glass);
  // screen (emissive UI canvas)
  const sc = document.createElement('canvas'); sc.width = 590; sc.height = 1278;
  const tex = new THREE.CanvasTexture(sc); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const sgeo = new THREE.ShapeGeometry(roundedRect(w - .0042, h - .0042, .0072), 24);
  uvFromBounds(sgeo);
  const smat = new THREE.MeshPhysicalMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .72, roughness: .32, clearcoat: .2, clearcoatRoughness: .15, envMapIntensity: .18, specularIntensity: .2 });
  const screen = new THREE.Mesh(sgeo, smat); screen.position.z = d / 2 + .0001; g.add(screen);
  // camera bump on the back
  const bump = new THREE.Mesh(new RoundedBoxGeometry(.036, .037, .0022, 4, .008), new THREE.MeshPhysicalMaterial({ color: 0x30343b, metalness: .2, roughness: .15, clearcoat: 1 }));
  bump.position.set(-w / 2 + .021, h / 2 - .021, -d / 2 - .0008); g.add(bump);
  for (const [x, y] of [[-.009, .009], [-.009, -.009], [.009, 0]]) {
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(.0065, .0065, .0022, 32), new THREE.MeshPhysicalMaterial({ color: 0x050608, metalness: .5, roughness: .1, clearcoat: 1 }));
    lens.rotation.x = Math.PI / 2; lens.position.set(bump.position.x + x, bump.position.y + y, -d / 2 - .002); g.add(lens);
  }
  // side buttons
  for (const [y, l] of [[.03, .022], [-.002, .012], [.012, .012]]) {
    const b = new THREE.Mesh(new RoundedBoxGeometry(.0016, l, .0026, 2, .0007), frame.material);
    b.position.set(y === .03 ? w / 2 + .0004 : -w / 2 - .0004, y, 0); g.add(b);
  }
  return { group: g, screen, canvas: sc, tex, w, h, d };
}
function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
function uvFromBounds(g) {
  g.computeBoundingBox(); const b = g.boundingBox, P = g.attributes.position, uv = [];
  for (let i = 0; i < P.count; i++) uv.push((P.getX(i) - b.min.x) / (b.max.x - b.min.x), (P.getY(i) - b.min.y) / (b.max.y - b.min.y));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
}

// ───────── phone UI (generic icons — no real brand logos) ─────────
const APPS = [['#34C759', '#1E9E45', 'phone'], ['#0A84FF', '#0060DF', 'msg'], ['#FF9F0A', '#FF6A00', 'cam'], ['#FF375F', '#C8143E', 'music'],
  ['#5E5CE6', '#3634A3', 'cloud'], ['#64D2FF', '#0A84FF', 'map'], ['#FFD60A', '#FF9F0A', 'note'], ['#BF5AF2', '#8E2DE2', 'photo'],
  ['#30D158', '#0B8F3A', 'chat'], ['#FF453A', '#B3261E', 'cal'], ['#8E8E93', '#48484A', 'gear'], ['#0A84FF', '#59C7FF', 'mail'],
  ['#FF9F0A', '#FF375F', 'game'], ['#32ADE6', '#1270C1', 'web'], ['#AC8E68', '#6E5233', 'book'], ['#66D4CF', '#1E9E95', 'fit']];
export function drawUI(cv, st) {
  const x = cv.getContext('2d'), W = cv.width, H = cv.height;
  // wallpaper
  const g = x.createLinearGradient(0, 0, W * .4, H);
  g.addColorStop(0, '#1b2a6b'); g.addColorStop(.45, '#6a2fa0'); g.addColorStop(.8, '#e0569a'); g.addColorStop(1, '#ff9e6d');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 5; i++) { const r = x.createRadialGradient(W * [.2, .8, .5, .1, .9][i], H * [.2, .35, .6, .8, .9][i], 0, W * [.2, .8, .5, .1, .9][i], H * [.2, .35, .6, .8, .9][i], W * .6);
    r.addColorStop(0, ['rgba(89,199,255,.5)', 'rgba(255,120,200,.35)', 'rgba(120,80,255,.4)', 'rgba(255,180,90,.3)', 'rgba(22,139,255,.35)'][i]); r.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = r; x.fillRect(0, 0, W, H); }
  // status bar + island
  x.fillStyle = '#000'; roundRect(x, W / 2 - 62, 22, 124, 36, 18); x.fill();
  x.fillStyle = '#fff'; x.font = '600 26px PlexLatin, sans-serif'; x.textAlign = 'left'; x.fillText('9:41', 46, 52);
  x.fillRect(W - 98, 34, 40, 18); x.fillRect(W - 56, 39, 4, 8);
  if (st.lock) {
    x.textAlign = 'center'; x.font = '700 150px PlexLatin, sans-serif'; x.fillText('9:41', W / 2, 330);
    x.font = '500 30px PlexLatin, sans-serif'; x.fillStyle = 'rgba(255,255,255,.85)'; x.fillText('Friday, January 17', W / 2, 160);
  } else {
    const cols = 4, s = 104, gap = (W - cols * s) / (cols + 1);
    for (let i = 0; i < 16; i++) {
      const cx = gap + (i % cols) * (s + gap), cy = 110 + Math.floor(i / cols) * (s + 62);
      const sel = st.hi === i ? st.hiK : 0;
      x.save(); x.translate(cx + s / 2, cy + s / 2); x.scale(1 - .12 * sel, 1 - .12 * sel); x.translate(-s / 2, -s / 2);
      const a = APPS[i], gg = x.createLinearGradient(0, 0, 0, s); gg.addColorStop(0, a[0]); gg.addColorStop(1, a[1]);
      x.fillStyle = gg; roundRect(x, 0, 0, s, s, 26); x.fill();
      glyph(x, a[2], s); x.restore();
      if (sel) { x.fillStyle = `rgba(0,0,0,${.25 * sel})`; roundRect(x, cx, cy, s, s, 26); x.fill(); }
    }
    // dock
    x.fillStyle = 'rgba(255,255,255,.22)'; roundRect(x, 24, H - 190, W - 48, 160, 54); x.fill();
    for (let i = 0; i < 4; i++) { const a = APPS[[0, 1, 13, 3][i]], cx = 24 + 30 + i * ((W - 48 - 60 - 104) / 3); const gg = x.createLinearGradient(0, H - 162, 0, H - 58);
      gg.addColorStop(0, a[0]); gg.addColorStop(1, a[1]); x.fillStyle = gg; roundRect(x, cx, H - 162, 104, 104, 26); x.fill(); x.save(); x.translate(cx, H - 162); glyph(x, a[2], 104); x.restore(); }
  }
  if (st.app && st.app.k > 0) {
    const k = st.app.k, i = st.app.i ?? 2, a = APPS[i], s = 104, cols = 4, gap = (W - cols * s) / (cols + 1);
    const cx = gap + (i % cols) * (s + gap), cy = 110 + Math.floor(i / cols) * (s + 62), e = 1 - Math.pow(1 - k, 3);
    const x0 = cx * (1 - e), y0 = cy * (1 - e), w = s + (W - s) * e, h = s + (H - s) * e;
    const gg = x.createLinearGradient(0, y0, 0, y0 + h); gg.addColorStop(0, a[0]); gg.addColorStop(1, a[1]);
    x.fillStyle = gg; roundRect(x, x0, y0, w, h, 26 + 30 * e); x.fill();
    x.save(); x.translate(x0 + w / 2 - s * (1 + e) / 2, y0 + h / 2 - s * (1 + e) / 2); x.scale(1 + e, 1 + e); glyph(x, a[2], s); x.restore();
  }
  if (st.follow) {
    const f = st.follow; x.fillStyle = '#0b0e15'; x.fillRect(0, 0, W, H);
    const ag = x.createLinearGradient(W / 2 - 90, 160, W / 2 + 90, 340); ag.addColorStop(0, '#168BFF'); ag.addColorStop(1, '#59C7FF');
    x.fillStyle = ag; x.beginPath(); x.arc(W / 2, 250, 92, 0, 7); x.fill();
    x.fillStyle = '#F4F7FB'; x.textAlign = 'center'; x.font = '700 92px PlexLatin'; x.fillText('K', W / 2, 282);
    x.font = '700 50px PlexLatin'; x.fillText('KROZO', W / 2, 420); x.font = '500 26px PlexLatin'; x.fillStyle = '#A7B1C2'; x.fillText('BEYOND TECH', W / 2, 462);
    const by = 520, on = f.done; x.fillStyle = on ? '#2A3446' : '#168BFF'; roundRect(x, 70, by, W - 140, 92, 22); x.fill();
    if (f.k > 0 && !on) { x.fillStyle = `rgba(255,255,255,${.25 * f.k})`; roundRect(x, 70, by, W - 140, 92, 22); x.fill(); }
    x.fillStyle = '#fff'; x.font = '700 40px PlexLatin'; x.fillText(on ? 'Following ✓' : 'Follow', W / 2, by + 60);
    for (let i = 0; i < 9; i++) { const c = i % 3, r = Math.floor(i / 3), tw = (W - 8) / 3; const g2 = x.createLinearGradient(0, 660 + r * (tw + 4), 0, 660 + r * (tw + 4) + tw);
      g2.addColorStop(0, ['#0d2a4f', '#1a1030', '#08263a'][(i + r) % 3]); g2.addColorStop(1, ['#168BFF', '#59C7FF', '#5E5CE6'][(i * 2 + r) % 3]); x.fillStyle = g2; x.fillRect(c * (tw + 4), 660 + r * (tw + 4), tw, tw); }
  }
  if (st.dim) { x.fillStyle = `rgba(0,0,0,${st.dim})`; x.fillRect(0, 0, W, H); }
  // touch ripple(s)
  for (const r of st.ripples || []) {
    if (r.k <= 0 || r.k >= 1) continue;
    x.strokeStyle = `rgba(255,255,255,${.9 * (1 - r.k)})`; x.lineWidth = 8 * (1 - r.k) + 2;
    x.beginPath(); x.arc(r.x * W, r.y * H, 20 + r.k * 220, 0, 7); x.stroke();
    x.fillStyle = `rgba(255,255,255,${.35 * (1 - r.k)})`; x.beginPath(); x.arc(r.x * W, r.y * H, 46 * (1 - r.k * .5), 0, 7); x.fill();
  }
  if (st.banner) {
    const k = st.banner; x.save(); x.globalAlpha = Math.min(1, k * 2); x.translate(0, (1 - k) * -40);
    x.fillStyle = 'rgba(30,30,34,.92)'; roundRect(x, 26, 76, W - 52, 120, 34); x.fill();
    x.fillStyle = '#fff'; x.font = '700 30px Plex, sans-serif'; x.textAlign = 'right'; x.fillText(st.bannerText || '', W - 60, 148); x.restore();
  }
}
function roundRect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
function glyph(x, k, s) {
  x.fillStyle = '#fff'; x.strokeStyle = '#fff'; x.lineWidth = s * .06; x.lineCap = 'round'; x.lineJoin = 'round'; const c = s / 2;
  x.beginPath();
  if (k === 'cam') { roundRect(x, s * .2, s * .32, s * .6, s * .42, s * .08); x.fill(); x.fillStyle = '#FF7A00'; x.beginPath(); x.arc(c, s * .53, s * .12, 0, 7); x.fill(); }
  else if (k === 'msg' || k === 'chat') { x.ellipse(c, s * .46, s * .28, s * .22, 0, 0, 7); x.fill(); x.beginPath(); x.moveTo(s * .3, s * .6); x.lineTo(s * .24, s * .76); x.lineTo(s * .44, s * .64); x.fill(); }
  else if (k === 'phone') { x.lineWidth = s * .12; x.arc(c, c, s * .2, Math.PI * .6, Math.PI * 1.1); x.stroke(); }
  else if (k === 'music') { x.arc(s * .4, s * .66, s * .09, 0, 7); x.fill(); x.fillRect(s * .46, s * .26, s * .06, s * .4); x.fillRect(s * .46, s * .26, s * .2, s * .07); }
  else if (k === 'gear') { x.lineWidth = s * .1; x.arc(c, c, s * .2, 0, 7); x.stroke(); }
  else if (k === 'map') { x.moveTo(c, s * .78); x.arc(c, s * .42, s * .18, Math.PI * .85, Math.PI * .15); x.closePath(); x.fill(); x.fillStyle = '#0A84FF'; x.beginPath(); x.arc(c, s * .42, s * .07, 0, 7); x.fill(); }
  else if (k === 'cal') { x.font = `700 ${s * .42}px PlexLatin`; x.textAlign = 'center'; x.fillText('17', c, s * .7); }
  else if (k === 'mail') { roundRect(x, s * .2, s * .3, s * .6, s * .4, s * .05); x.stroke(); x.beginPath(); x.moveTo(s * .22, s * .33); x.lineTo(c, s * .54); x.lineTo(s * .78, s * .33); x.stroke(); }
  else if (k === 'web') { x.arc(c, c, s * .26, 0, 7); x.stroke(); x.beginPath(); x.ellipse(c, c, s * .11, s * .26, 0, 0, 7); x.stroke(); }
  else if (k === 'photo') { for (let i = 0; i < 6; i++) { x.save(); x.globalAlpha = .7; x.translate(c, c); x.rotate(i * Math.PI / 3); x.beginPath(); x.ellipse(0, -s * .14, s * .08, s * .15, 0, 0, 7); x.fill(); x.restore(); } }
  else if (k === 'note') { x.fillRect(s * .26, s * .26, s * .48, s * .5); x.fillStyle = '#FF9F0A'; x.fillRect(s * .3, s * .38, s * .4, s * .04); x.fillRect(s * .3, s * .5, s * .4, s * .04); x.fillRect(s * .3, s * .62, s * .3, s * .04); }
  else if (k === 'cloud') { x.arc(s * .42, s * .55, s * .14, 0, 7); x.arc(s * .58, s * .5, s * .17, 0, 7); x.fill(); x.fillRect(s * .3, s * .55, s * .45, s * .14); }
  else if (k === 'game') { roundRect(x, s * .2, s * .38, s * .6, s * .3, s * .15); x.fill(); }
  else if (k === 'book') { x.fillRect(s * .28, s * .25, s * .2, s * .5); x.fillRect(s * .52, s * .25, s * .2, s * .5); }
  else if (k === 'fit') { x.lineWidth = s * .08; for (const r of [.26, .18, .1]) { x.beginPath(); x.arc(c, c, s * r, -1.5, 3.2); x.stroke(); } }
}

// ───────── soft sprite + bokeh textures ─────────
export const softDot = () => canvasTex(128, 128, (x, w) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.4, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); });
export const bokehDisc = () => canvasTex(128, 128, (x) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 62); g.addColorStop(0, 'rgba(255,255,255,.75)'); g.addColorStop(.82, 'rgba(255,255,255,.9)'); g.addColorStop(.92, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); });
export { rnd };
