// KROZO — "ليه صورتك ما تفتح الآيفون… بس وجهك يفتحه؟"  (story time = original recording)
const w = i => WT[i];
const e = i => WE[i];
const VOICE_END = WE[91] + .05;
const sm = (a, b, t) => ease.inOut(prog(t, a, b));
const R = () => window.R3;
const v3 = (x, y, z) => R().V(x, y, z);
const lerpV = (a, b, k) => a.clone().lerp(b, k);
const noise = (t, f) => Math.sin(t * f) * .6 + Math.sin(t * f * 2.13 + 1.7) * .3 + Math.sin(t * f * 4.7 + .3) * .1;
const K = { red: '#FF453A', green: '#30D158', orange: '#FF9F0A' };
const SH = 'text-shadow:0 4px 30px rgba(0,0,0,.9),0 0 2px rgba(0,0,0,.9)';

// ───────── 3D-anchored labels ─────────
const labRoot = el('<div class="layer" style="pointer-events:none"></div>');
document.getElementById('stage').insertBefore(labRoot, document.getElementById('flash'));
const labPool = []; let labN = 0;
window.LAB = { begin() { labN = 0; }, end() { for (let i = labN; i < labPool.length; i++) labPool[i].style.display = 'none'; } };
function label(txt, p, a, o = {}) {
  if (a <= .01) return;
  if (!labPool[labN]) { const d = el('<div style="position:absolute;left:0;top:0;white-space:nowrap"></div>'); labRoot.appendChild(d); labPool.push(d); }
  const d = labPool[labN++]; const [x, y, front] = R().project(p);
  if (!front) { d.style.display = 'none'; return; }
  const dx = o.dx ?? 0, dy = o.dy ?? -90, col = o.c ?? C.cyan;
  const html = `<div style="position:absolute;left:${dx}px;top:${dy}px;transform:translate(-50%,-50%);font-weight:700;font-size:${o.fs ?? 40}px;color:${C.ink};background:rgba(8,11,18,.82);border:2px solid ${col};border-radius:16px;padding:8px 24px;box-shadow:0 0 30px ${col}55">${txt}</div>
    <svg style="position:absolute;left:0;top:0;overflow:visible" width="1" height="1"><line x1="0" y1="0" x2="${dx}" y2="${dy + (dy < 0 ? 30 : -30)}" stroke="${col}" stroke-width="3"/><circle r="8" fill="${col}"/><circle r="17" fill="none" stroke="${col}" stroke-opacity=".5" stroke-width="2"/></svg>`;
  if (d.dataset.h !== html) { d.innerHTML = html; d.dataset.h = html; }
  d.style.display = ''; d.style.opacity = clamp(a); d.style.transform = `translate(${x}px,${y}px)`;
}

// ───────── staging helpers ─────────
// the face (or the photo) sits at the origin facing +z; the phone is held 30 cm in front, screen towards the face
const PHONE = () => v3(0, .035, .3);
const holdPhone = (t, tilt = 0) => R().phoneAt(PHONE().add(v3(noise(t, .7) * .002, noise(t + 3, .6) * .002, 0)), -.05 + tilt, Math.PI, 0);
const hw = p => R().head.localToWorld(p.clone());
function faceOn(t, o = {}) { const r = R(); r.head.visible = true; r.head.rotation.y = o.ry ?? 0; r.head.position.set(o.x ?? 0, 0, 0); r.head.updateMatrixWorld(true); }
function photoOn(t, o = {}) { const r = R(); r.photo.visible = true; r.photo.position.set(o.x ?? 0, (o.y ?? 0) + noise(t, .9) * .002, o.z ?? 0); r.photo.rotation.set(noise(t + 1, .8) * .02, (o.ry ?? 0) + noise(t + 2, .7) * .03, noise(t, .5) * .01); r.photo.updateMatrixWorld(true); }
// camera that looks at the phone screen from behind the face/photo (over the shoulder)
function screenCam(t, k = 0, fov = 34) { const r = R(), p = r.phonePt(.5, .56); r.lookCam(lerpV(v3(.12, .09, .02), v3(.05, .06, .09), k), p, fov); }

const S = [];
const shot = (s, end, update, o = {}) => { const x = Object.assign({ s, e: end, update }, o); S.push(x); return x; };

// ═════ HOOK: the photo fails ═════
shot(0, .78, (lt, t) => {                     // cold open: a flash of the answer (depth map) before the question
  const r = R(); faceOn(t, { ry: .9 - lt * 1.6 }); holdPhone(t); r.phoneRig.visible = false;
  r.autoHeat(); r.headMesh.material = r.heatM; r.headWire.visible = true; r.wireM.opacity = .2;
  r.lookCam(v3(0, .03, .5 - lt * .1), v3(0, .01, 0), 30);
  r.grade.zb.value = .5 * prog(lt, .55, .78);
}, { noPunch: true });
shot(.78, w(5), (lt, t) => {                   // "ليه لو حطيت صورتك قدام الآيفون"
  const r = R(); const k = ease.out(prog(t, .8, w(4) + .3));
  photoOn(t, { x: .25 * (1 - k), ry: -.4 * (1 - k) }); holdPhone(t); r.setUI({ mode: 'lock', fid: 'idle' });
  r.lookCam(v3(.1 - .01 * lt, .07, .56 - .02 * lt), v3(-.01, .01, .1), 32);
}, { noPunch: true });
shot(w(5), w(8), (lt, t) => {                 // "…ما يفتح؟" — scan, then rejection shake
  const r = R(); photoOn(t); holdPhone(t);
  const fail = t > w(7) - .05, sk = fail ? Math.sin((t - w(7)) * 50) * Math.max(0, 1 - (t - w(7)) / .45) : 0;
  r.setUI({ mode: 'lock', fid: fail ? 'fail' : 'scan', k: +(lt * 1.6 % 1).toFixed(2), shake: +sk.toFixed(2) });
  r.photoDots.visible = !fail; r.dotsU[1].a.value = .45; r.setBeams(r.photoDots, fail ? 0 : .5);
  screenCam(t, ease.inOut(prog(lt, 0, 1.2)));
  r.grade.flashCol.value.set(1, .3, .25); r.grade.flash.value = fail ? .22 * Math.max(0, 1 - (t - w(7)) / .3) : 0;
});
// ═════ the real face unlocks ═════
shot(w(8), w(13), (lt, t) => {               // "بس لو حطيت وجهك… يفتح؟!"
  const r = R(); faceOn(t); holdPhone(t);
  const ok = t > w(12) - .05;
  r.setUI(ok ? (t > w(12) + .55 ? { mode: 'home', k: +Math.min(1, (t - w(12) - .55) * 2.5).toFixed(2) } : { mode: 'lock', fid: 'ok' }) : { mode: 'lock', fid: 'scan', k: +(lt * 1.6 % 1).toFixed(2) });
  r.faceDots.visible = !ok; r.dotsU[0].a.value = .5; r.setBeams(r.faceDots, ok ? 0 : .5);
  if (t < w(11) + .2) r.lookCam(v3(.36, .05, .45), v3(.0, .01, .1), 32);
  else screenCam(t, ease.inOut(prog(t, w(11) + .2, w(12))));
  r.grade.flashCol.value.set(.6, 1, .7); r.grade.flash.value = ok ? .25 * Math.max(0, 1 - (t - w(12)) / .3) : 0;
});
shot(w(13), w(18), (lt, t) => {              // "مع إن الاثنين نفس الوجه…" — split: photo | face
  const r = R(); const k = lt / (w(18) - w(13));
  r.lookCam(v3(0, .015, .62 - .05 * k), v3(0, 0, 0), 30);
  r.split([() => { r.head.visible = false; photoOn(t); }, () => { r.photo.visible = false; faceOn(t, { ry: -.15 * k }); }]);
});
shot(w(18), e(20) + .55, (lt, t) => {        // "طيب وش الفرق؟" — slow push + heartbeat
  const r = R(); const k = lt / (e(20) + .55 - w(18));
  r.lookCam(v3(0, .02, .55 - .1 * k), v3(0, .01, 0), 30);
  r.split([() => { r.head.visible = false; photoOn(t); }, () => { r.photo.visible = false; faceOn(t, { ry: -.15 }); }]);
  const hb = [e(20) + .05, e(20) + .38]; let p = 0; for (const h of hb) if (t > h) p = Math.max(p, 1 - prog(t, h, h + .25));
  r.grade.vig.value = .5 + .35 * p; r.grade.zb.value = .25 * p;
});
// ═════ not just the picture ═════
shot(e(20) + .55, w(31), (lt, t) => {        // "الفرق إن Face ID ما يكتفي إنه يشوف ملامح وجهك."
  const r = R(); faceOn(t, { ry: .25 - lt * .04 }); holdPhone(t); r.phoneRig.visible = false;
  r.lookCam(v3(-.05, .03, .6 - lt * .02), v3(0, .01, 0), 30);
  if (t > w(28)) { r.faceDots.visible = true; r.dotsU[0].a.value = .9; r.dotsU[0].size.value = 2.4; r.dotsU[0].hi.value.copy(hw(R().LM.nose)); }
}, {
  after(lt, t) { const r = R(), L = r.LM, a = prog(t, w(29), w(29) + .3);
    label('ملامح', hw(L.eyeR), a, { dx: 170, dy: -120 }); }, });
// ═════ the TrueDepth camera ═════
shot(w(31), w(35), (lt, t) => {               // "أول ما تشوف للشاشة،" — macro on the TrueDepth module
  const r = R(); faceOn(t); holdPhone(t); r.setUI({ mode: 'lock', fid: 'idle' });
  const p = r.phonePt(.5, .05), k = ease.inOut(prog(lt, 0, w(35) - w(31)));
  r.lookCam(lerpV(v3(.05, .1, .12), p.clone().add(v3(.012, .006, -.045)), k), lerpV(v3(0, .03, .3), p, k), 30 - 8 * k);
}, {
  after(lt, t) { const r = R(), td = r.phoneG.userData.td, a = prog(t, w(33), w(33) + .3);
    label('<span class="latin">Dot Projector</span>', td.proj.getWorldPosition(v3(0, 0, 0)), a, { dy: -190, dx: -120, fs: 34 });
    label('<span class="latin">IR Camera</span>', td.ir.getWorldPosition(v3(0, 0, 0)), prog(t, w(34), w(34) + .3), { dy: 200, dx: 120, fs: 34 }); },
});
shot(w(35), w(44), (lt, t) => {               // "الآيفون يرسل على وجهك آلاف النقاط بالأشعة تحت الحمراء."
  const r = R(); faceOn(t, { ry: .1 }); holdPhone(t); r.setUI({ mode: 'lock', fid: 'scan', k: +(lt * 1.6 % 1).toFixed(2) });
  r.faceDots.visible = true; const rv = .18 + .3 * ease.inOut(prog(t, w(36), w(40) + .3)); r.dotsU[0].reveal.value = rv; r.dotsU[0].size.value = 1.6;
  r.setBeams(r.faceDots, .9 * prog(t, w(36), w(36) + .3));
  const k = lt / (w(44) - w(35));
  r.lookCam(v3(.55 - .1 * k, .12, .16 + .05 * k), v3(0, .01, .13), 34);
  r.key.intensity = .7;
});
shot(w(44), w(48), (lt, t) => {               // "الإنسان ما يقدر يشوفها…" — your eye | IR camera
  const r = R(); r.lookCam(v3(.06, .02, .5), v3(0, .01, 0), 30);
  r.split([() => { faceOn(t, { ry: .1 }); r.faceDots.visible = false; r.grade.mono.value = 0; },
           () => { faceOn(t, { ry: .1 }); r.headMesh.material = r.irM; r.faceDots.visible = true; r.dotsU[0].col.value.set(0xffffff); r.dotsU[0].size.value = 1.4; }]);
  r.grade.mono.value = 1; r.grade.monoX.value = .5;
});
// ═════ reading the shape ═════
shot(w(48), w(56), (lt, t) => {               // "ومن هالنقاط، الآيفون يقدر يعرف شكل وجهك بالتفصيل…" — orbit the point cloud
  const r = R(); faceOn(t); holdPhone(t); r.phoneRig.visible = false;
  r.faceDots.visible = true; r.dotsU[0].size.value = 1.5; r.headMesh.visible = t < w(50);
  const a = -.6 + 1.3 * ease.inOut(prog(lt, 0, w(56) - w(48)));
  r.lookCam(v3(Math.sin(a) * .5, .05, Math.cos(a) * .5), v3(0, .01, 0), 30);
});
shot(w(56), w(63), (lt, t) => {               // "ويجمع كل هالمعلومات مع بعض… ويبني عنده" — dots knit into a mesh
  const r = R(); faceOn(t, { ry: -.3 + lt * .12 }); r.faceDots.visible = true; r.headMesh.visible = false;
  r.autoHeat(); r.dotsU[0].heat.value = 1; r.dotsU[0].a.value = 1 - .6 * sm(w(59), w(62), t);
  r.headWire.visible = true; r.wireM.opacity = .45 * sm(w(57), w(61), t);
  r.lookCam(v3(.12, .04, .46 - lt * .015), v3(0, .01, 0), 30);
});
shot(w(63), e(66) + .4, (lt, t) => {          // "خريطة ثلاثية الأبعاد لوجهك." — the depth map
  const r = R(); faceOn(t, { ry: -.6 + 1.2 * ease.inOut(prog(lt, 0, e(66) + .4 - w(63))) }); holdPhone(t); r.phoneRig.visible = false;
  r.autoHeat(); r.headMesh.material = r.heatM; r.heatU.k.value = sm(w(63), w(64), t); r.headWire.visible = true; r.wireM.opacity = .15;
  r.lookCam(v3(0, .03, .55), v3(0, .01, 0), 30);
  r.grade.flash.value = .35 * Math.max(0, 1 - Math.abs(t - w(65)) / .2) * (t > w(65) - .05 ? 1 : 0);
});
// ═════ photo vs face ═════
shot(e(66) + .4, w(74), (lt, t) => {          // "وهنا يبين الفرق بين الصورة ووجهك الحقيقي…"
  const r = R(); r.lookCam(v3(0, .015, .6), v3(0, 0, 0), 30);
  r.split([() => { r.head.visible = false; photoOn(t); holdPhone(t); r.phoneRig.visible = false; r.photoDots.visible = true; r.dotsU[1].size.value = 1.4; },
           () => { r.photo.visible = false; faceOn(t, { ry: -.15 }); holdPhone(t); r.phoneRig.visible = false; r.faceDots.visible = true; r.dotsU[0].size.value = 1.4; }]);
});
shot(w(74), w(81), (lt, t) => {               // "لأن الصورة مسطّحة، تورّيه شكل وجهك بس،" — orbit the photo to its edge
  const r = R(); photoOn(t); holdPhone(t); r.photoDots.visible = true; r.dotsU[1].size.value = 1.5;
  const a = 1.45 * ease.inOut(prog(t, w(75), w(77) + .3));
  r.lookCam(v3(Math.sin(a) * .5, .04, Math.cos(a) * .5), v3(0, 0, .02), 30);
  r.autoHeat(); r.dotsU[1].heat.value = sm(w(77), w(78), t); r.dotsU[1].flatC.value = .45;
}, { after(lt, t) { label('مسطّحة', v3(0, .13, 0), prog(t, w(76), w(76) + .3), { dy: -120 }); } });
shot(w(81), VOICE_END + .9, (lt, t) => {      // "لكن ما توريه أي جزء أقرب، وأي جزء أبعد." — depth colour: face gradient | photo flat, then ✕ | ✓
  const r = R(); const k = ease.inOut(prog(lt, 0, 2));
  r.lookCam(v3(.12 - .04 * k, .02, .66), v3(0, 0, 0), 30);
  r.split([() => { r.head.visible = false; photoOn(t); holdPhone(t); r.autoHeat(); r.print.visible = false; r.printHeat.visible = true; r.heatU.flatC.value = .45; r.photoDots.visible = true; r.dotsU[1].heat.value = 1; r.dotsU[1].flatC.value = .45; r.dotsU[1].size.value = 1.3; r.phoneRig.visible = false; r.heatU.bands.value = 0; },
           () => { r.photo.visible = false; faceOn(t); holdPhone(t); r.autoHeat(); r.heatU.flatC.value = -1; r.headMesh.material = r.heatM; r.faceDots.visible = true; r.dotsU[0].heat.value = 1; r.dotsU[0].size.value = 1.3; r.phoneRig.visible = false; r.heatU.bands.value = .6; }]);
});
// ═════ ending ═════
window.SHOTS = S;

// ───────── DOM text layers ─────────
const L = [];
const chipHTML = (txt, col = C.blue) => `<div style="position:absolute;top:178px;left:0;right:0;text-align:center"><span class="latin" style="display:inline-flex;align-items:center;gap:14px;padding:12px 26px;border-radius:999px;background:rgba(8,11,18,.72);border:1.5px solid ${col}88;font-weight:700;font-size:24px;letter-spacing:5px;color:${C.ink}"><i style="width:12px;height:12px;border-radius:50%;background:${col};box-shadow:0 0 14px ${col}"></i>${txt}</span></div>`;
function chip(s, end, txt, col) { L.push({ s, e: end, fi: .2, fo: .2, build(root) { root.appendChild(el(chipHTML(txt, col))); }, update(root, lt) { root.firstChild.style.transform = `translateY(${(1 - ease.out(prog(lt, 0, .3))) * -16}px)`; } }); }
function headline(s, end, html, o = {}) {
  L.push({ s, e: end, fi: .05, fo: .25,
    build(root) { root.appendChild(el(`<div style="position:absolute;left:40px;right:40px;top:${o.top ?? 300}px;text-align:center;font-weight:700;font-size:${o.fs ?? 100}px;line-height:1.2;color:${o.col ?? C.ink};${SH}">${html}</div>`)); },
    update(root, lt, t) { const n = root.firstChild, k = ease.back(prog(lt, 0, .35)); n.style.opacity = clamp(prog(lt, 0, .15)); n.style.transform = `scale(${.8 + .2 * k}) translateY(${(1 - k) * 30}px)`;
      if (o.strike) { const sk = ease.out(prog(t, o.strike, o.strike + .3)); n.querySelectorAll('.st i').forEach(x => x.style.width = `${sk * 108}%`); }
      if (o.upd) o.upd(n, lt, t); } });
}
const strike = txt => `<span class="st" style="position:relative;display:inline-block">${txt}<i style="position:absolute;right:-4%;top:50%;height:12px;width:0;background:${K.red};border-radius:6px;box-shadow:0 0 18px ${K.red}"></i></span>`;
// split-screen captions
function splitCaps(s, end, left, right) {
  L.push({ s, e: end, fi: .2, fo: .2,
    build(root) { root.appendChild(el(`<div style="position:absolute;left:0;right:0;top:1120px;display:flex;justify-content:space-around;font-weight:700;font-size:46px;color:${C.ink};${SH}"><span style="width:50%;text-align:center">${right}</span><span style="width:50%;text-align:center">${left}</span></div>`)); },
    update() {} });
}
chip(.8, w(5), 'PHOTO · FACE ID', C.cyan);
chip(w(5), w(8), 'FACE NOT RECOGNIZED', K.red);
chip(w(8), w(13), 'REAL FACE · FACE ID', K.green);
splitCaps(w(13), e(20) + .55, 'صورة', 'وجه حقيقي');
headline(w(16) - .05, w(18), `نفس الوجه <span style="color:${C.cyan}">=</span>`, { fs: 96, top: 300 });
headline(w(19), e(20) + .55, `<span style="font-size:200px;color:${C.cyan}">؟</span>`, { top: 240 });
chip(e(20) + .55, w(31), 'NOT JUST A PICTURE', C.blue);
headline(w(29), w(31), `${strike('ملامح وجهك')}<br><span style="font-size:58px;color:${C.gray}">مو كفاية</span>`, { fs: 90, top: 300, strike: w(30) + .1 });
chip(w(31), w(44), 'TRUEDEPTH CAMERA', C.cyan);
headline(w(39) - .05, w(44), '', { top: 290, upd(n, lt, t) { const k = ease.out(prog(t, w(39), w(43))); n.innerHTML = `<span class="latin" style="font-size:150px;color:${C.cyan}">+${(Math.round(k * 30000)).toLocaleString('en-US')}</span><br><span style="font-size:52px;color:${C.gray}">نقطة أشعة تحت حمراء</span>`; } });
chip(w(44), w(48), 'INFRARED · INVISIBLE', C.cyan);
splitCaps(w(44), w(48), 'عينك', 'كاميرا IR');
chip(w(48), w(56), 'DEPTH SENSING', C.blue);
chip(w(56), e(66) + .4, '3D DEPTH MAP', C.cyan);
headline(w(64) - .05, e(66) + .4, `خريطة <span style="color:${C.cyan}">ثلاثية الأبعاد</span>`, { fs: 84, top: 300 });
chip(e(66) + .4, VOICE_END + .9, 'PHOTO vs FACE', C.cyan);
splitCaps(e(66) + .4, w(74), 'صورة', 'وجه حقيقي');
headline(w(76), w(81), `<span style="color:${C.gray}">الصورة</span> مسطّحة`, { fs: 88, top: 300 });
splitCaps(w(81), e(91) + .1, 'صورة: كلها نفس البُعد', 'وجه: أقرب وأبعد');
headline(w(88) - .05, e(91) + .1, `<span style="color:#F4F7FB">أقرب</span> <span style="color:${C.gray}">↔</span> <span style="color:${C.blue}">أبعد</span>`, { fs: 84, top: 300 });
// payoff: photo ✕ | face ✓ over the split
L.push({ s: e(91) + .1, e: VOICE_END + .9, fi: .05, fo: .2,
  build(root) { root.appendChild(el(`<div style="position:absolute;left:0;right:0;top:520px;display:flex;justify-content:space-around;${SH}"><span class="ok" style="width:50%;text-align:center;font-size:230px;font-weight:700;color:${K.green}">✓</span><span class="no" style="width:50%;text-align:center;font-size:230px;font-weight:700;color:${K.red}">✕</span></div>`)); },
  update(root, lt) { const a = ease.back(prog(lt, 0, .3)), b = ease.back(prog(lt, .15, .45));
    root.querySelector('.no').style.transform = `scale(${a})`; root.querySelector('.ok').style.transform = `scale(${b})`; } });
// hook title (first seconds): the question in big type
headline(.8, w(5), `صورتك <span style="color:${K.red}">✕</span>&nbsp;&nbsp;وجهك <span style="color:${K.green}">✓</span><br><span style="font-size:60px;color:${C.gray}">ليه؟!</span>`, { fs: 92, top: 300 });
L.push(outroScene(VOICE_END + .9, VOICE_END + 2.9));
L.sort((a, b) => a.s - b.s);

window.KICKS = [w(7), w(12), w(16), w(39), w(65), w(76), e(91) + .1];
window.TL = {
  voiceEnd: VOICE_END,
  lead: 0.15,
  flashes: [w(65), e(91) + .1],
  remap: tv => {
    let i = 0; while (i < WARP.length - 2 && tv > WARP[i + 1][1]) i++;
    const [s0, v0] = WARP[i], [s1, v1] = WARP[i + 1];
    if (tv >= v1) return s1 + (tv - v1);
    return s0 + (tv - v0) * (s1 - s0) / ((v1 - v0) || 1);
  },
  bug: t => (t < .6 ? 0 : 1) * (1 - prog(t, VOICE_END + .3, VOICE_END + .6)),
  subs: SUBS,
  scenes: L,
  kicks: [w(7), w(12), w(16), w(39), w(65), w(76), e(91) + .1],
};
