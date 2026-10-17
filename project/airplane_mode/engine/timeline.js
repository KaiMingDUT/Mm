// KROZO — "ليش يطلبون منك وضع الطيران؟"
// SHOTS drive the 3D world (plane3d.js); TL.scenes are the DOM text layers on top. All times are story time (original recording).
const VOICE_END = 123.15;
const w = i => WT[i];
const sm = (a, b, t) => ease.inOut(prog(t, a, b));
const R = () => window.R3;
const v3 = (x, y, z) => R().V(x, y, z);
const noise = (t, f) => Math.sin(t * f) * .6 + Math.sin(t * f * 2.13 + 1.7) * .3 + Math.sin(t * f * 4.7 + .3) * .1;
const shake = (t, a, f = 9) => v3(noise(t, f) * a, noise(t + 11.3, f * 1.1) * a, noise(t + 4.1, f * .9) * a * .5);
const lerpV = (a, b, k) => a.clone().lerp(b, k);
const K = { red: '#FF453A', green: '#30D158', orange: '#FF9F0A' };
const SH = 'text-shadow:0 4px 30px rgba(0,0,0,.9),0 0 2px rgba(0,0,0,.9)';

// ───────── 3D-anchored labels (positioned after the shot poses the camera) ─────────
const labRoot = el('<div class="layer" style="pointer-events:none"></div>');
document.getElementById('stage').insertBefore(labRoot, document.getElementById('flash'));
const labPool = []; let labN = 0;
window.LAB = {
  begin() { labN = 0; },
  end() { for (let i = labN; i < labPool.length; i++) labPool[i].style.display = 'none'; },
};
// label(text, worldPos, alpha, {dx, dy, c (colour), dot})
function label(txt, p, a, o = {}) {
  if (a <= .01) return;
  if (!labPool[labN]) { const d = el('<div style="position:absolute;left:0;top:0;white-space:nowrap"></div>'); labRoot.appendChild(d); labPool.push(d); }
  const d = labPool[labN++]; const [x, y, front] = R().project(p);
  if (!front) { d.style.display = 'none'; return; }
  const dx = o.dx ?? 0, dy = o.dy ?? -90, col = o.c ?? C.cyan;
  const html = `<div style="position:absolute;left:${dx}px;top:${dy}px;transform:translate(-50%,-50%);font-weight:700;font-size:${o.fs ?? 40}px;color:${C.ink};background:rgba(8,11,18,.82);border:2px solid ${col};border-radius:16px;padding:8px 24px;box-shadow:0 0 30px ${col}55">${txt}</div>
    <svg style="position:absolute;left:0;top:0;overflow:visible" width="1" height="1"><line x1="0" y1="0" x2="${dx}" y2="${dy + (dy < 0 ? 30 : -30)}" stroke="${col}" stroke-width="3"/><circle r="9" fill="${col}"/><circle r="18" fill="none" stroke="${col}" stroke-opacity=".5" stroke-width="2"/></svg>`;
  if (d.dataset.h !== html) { d.innerHTML = html; d.dataset.h = html; }
  d.style.display = ''; d.style.opacity = clamp(a); d.style.transform = `translate(${x}px,${y}px)`;
}

// ───────── shots ─────────
const S = [];
const shot = (s, e, update, o = {}) => { const x = Object.assign({ s, e, update }, o); S.push(x); return x; };
function exterior(t, speed = 70) { const r = R(); r.stage('sky', t); r.jet.visible = true; r.navLights(t); r.updClouds(t, speed); }
// jet "dive" pose for the hook (k: 0 level → 1 diving)
function jetDive(k, t) { const j = R().jet; j.rotation.z = -.42 * k; j.rotation.x = .5 * k; j.position.y = -14 * k * k; j.position.x = 6 * k; }
// phone lying on a seat-back tray in the cabin (row x, seat z)
// row index → tray table folded down from the seat back in front of that passenger
function trayPhone(row, z, ry = 0) { const x = R().CAB.xs[row] + .4, T = R().CAB.tray; T.visible = true; T.position.set(x, -.2, z); R().phoneAt(v3(x, -.183, z), -Math.PI / 2, 0, ry); }
const PAXN = () => R().CAB.phones.length;
function cabinPhones(t, n, o = {}) { const r = R(), P = r.CAB.phones; for (let i = 0; i < Math.min(n, P.length); i++) r.emit(P[i], t, Object.assign({ R: .55, a: .5, per: .7, life: 1.4, ph: i * .137 }, o)); }

// ═════ HOOK ═════
shot(0, w(5), (lt, t) => {   // night flight, slow push along the jet
  exterior(t); const r = R(); const k = lt / w(5);
  r.lookCam(v3(34 - 8 * k, -5 + 2 * k, 44 - 10 * k), v3(1 + 3 * k, -1, 0), 30);
}, { noPunch: true });
shot(w(5), w(9), (lt, t) => {   // the phone on a tray, transmitting
  const r = R(); r.stage('cabin', t); trayPhone(20, -.52, .35); r.setUI({ lock: true, bars: 2, note: 'وضع الطيران: غير مفعّل', note2: 'الجوال يدوّر على شبكة…' });
  const p = r.phonePt(.5, .5, .002); r.phoneLight.intensity = .25;
  r.emit(p, t, { R: .32, per: .32, life: 1.1, a: 1, col: r.COL.cyan });
  r.cam.near = .01; const k = sm(w(5), w(9), t);
  r.lookCam(p.clone().add(v3(-.08 + .02 * k, .32 - .08 * k, .3 - .06 * k)), p.clone().add(v3(.01, 0, 0)), 34);
  cabinPhones(t, 30, { a: .25 });
});
shot(w(9), 5.15, (lt, t) => {   // "إسقاط طائرة!" — the dive (imagined)
  exterior(t, 80); const r = R(); const k = ease.inOut(prog(lt, 0, .9));
  jetDive(k, t); r.lookCam(v3(40, 4, 30).add(shake(t, .8 * k, 14)), v3(4, -6 * k, 0), 32);
  r.grade.glitch.value = .25 * k; r.grade.ca.value = .002 + .006 * k; r.grade.tint.value.set(1, 1 - .08 * k, 1 - .12 * k);
});
shot(5.15, w(17) - .05, (lt, t) => {   // "لا، لا…" — rewind back to level flight
  exterior(t, 80); const r = R(); const k = 1 - ease.inOut(prog(lt, .05, 1.0));
  jetDive(k, t); r.lookCam(v3(40, 4, 30), v3(4, -6 * k, 0), 32);
  r.grade.rew.value = 1 - prog(lt, 1.0, 1.3); r.grade.sat.value = .7 + .35 * prog(lt, 1, 1.3);
});
shot(w(17) - .05, w(24), (lt, t) => {   // "لكن… إشارات جوالك" — down the aisle, the cabin starts to glow
  const r = R(); r.stage('cabin', t);
  const k = lt / (w(24) - w(17));
  r.lookCam(v3(-14.6 + 2.2 * k, .42, 0), v3(2, -.05, 0), 52);
  cabinPhones(t, Math.floor(prog(t, w(22) - .3, w(23) + .5) * 160), { a: .45 });
});
shot(w(24), 13.3, (lt, t) => {   // "مستحيل تسبب مشاكل على متن الطائرة" — exterior, interference ripples leak from the windows
  exterior(t); const r = R();
  r.lookCam(v3(-30 + lt * 3, 9, 34), v3(2, 0, 0), 30);
  const n = Math.floor(sm(w(25), w(27), t) * 18);
  for (let i = 0; i < n; i++) { const x = -9 + i * 1.3; r.emit(v3(x, .55, 2.05), t, { R: 2.6, per: .9, life: 1.6, a: .18, ph: i * .21 }); }
  r.antennas.forEach(a => a.material.emissive.set(0x000000));
});

// ═════ QUESTION ═════
shot(13.3, w(37), (lt, t) => {   // "كيف جهاز صغير مثل جوالك" — phone hero, tiny on the hangar floor
  const r = R(); r.stage('studio', t); r.phoneAt(v3(0, .0735, 0), 0, .5 + lt * .25, 0); r.setUI({ lock: true, bars: 3 });
  r.phoneLight.intensity = .2; r.cam.near = .01;
  r.lookCam(v3(.05, .1, .42 - lt * .02), v3(0, .075, 0), 30);
  r.jet.visible = true; r.gear.visible = true; r.jet.position.set(-14, 4.9, -36); r.jet.rotation.y = .5;
});
shot(w(37), 18.7, (lt, t) => {   // "…أنظمة طائرة ضخمة؟" — pull back to reveal the giant jet
  const r = R(); r.stage('studio', t); r.phoneAt(v3(0, .0735, 0), 0, .5 + (lt + 2.8) * .25, 0); r.setUI({ lock: true, bars: 3 });
  r.phoneLight.intensity = .2; r.cam.near = .01;
  r.jet.visible = true; r.gear.visible = true; r.jet.position.set(-14, 4.9, -36); r.jet.rotation.y = .5;
  const k = ease.inOut(prog(lt, .1, 2.1));
  const pos = lerpV(v3(.05, .1, .42), v3(5.5, 2.4, 9), k), look = lerpV(v3(0, .075, 0), v3(-9, 4.2, -26), Math.pow(k, .8));
  r.lookCam(pos, look, 30 + 8 * k);
}, {
  after(lt, t) {
    const r = R(), k = prog(lt, 1.6, 2.0);
    label('جوالك', v3(0, .16, 0), k, { dy: -120, dx: 60 });
    label('طائرة', v3(-14, 9, -36), prog(lt, 1.8, 2.2), { dy: -110 });
  },
});
shot(18.7, w(47), (lt, t) => {   // "وليش أصلًا يطلبون منك تفعيل" — the overhead sign lights up
  const r = R(); r.stage('cabin', t);
  const on = t > w(44) ? 1 : 0;
  r.CAB.sign.material.color.setRGB(.44 + .56 * on, .49 + .51 * on, .56 + .44 * on);
  r.lookCam(v3(-.6 - lt * .15, .25, .05), v3(4, 1.5, 0), 38);
  cabinPhones(t, 160, { a: .3 });
});
shot(w(47), 24.0, (lt, t) => {   // "وضع الطيران؟" — phone, control centre, airplane tile pulsing (question beat)
  const r = R(); r.stage('studio', t); r.phoneAt(v3(0, .0735, 0), 0, -.25, 0);
  r.setUI({ lock: false, cc: 1, plane: 0, bars: 4 }); r.phoneLight.intensity = .3; r.cam.near = .01;
  const tile = r.phonePt(.2, .2, .002), k = ease.out(prog(lt, 0, 1.4));
  r.lookCam(lerpV(v3(.06, .1, .4), v3(.02, .12, .2), k), lerpV(v3(0, .075, 0), tile, k * .6), 30);
  for (let i = 0; i < 2; i++) { const ph = (lt * 1.2 + i * .5) % 1; r.ring(tile, .012 + ph * .03, 0xFF9F0A, (1 - ph) * .9, { face: 'cam', w: .1 }); }
});
shot(24.0, w(52), (lt, t) => {   // "خلّني أشرح لك…" — dive into the screen
  const r = R(); r.stage('studio', t); r.phoneAt(v3(0, .0735, 0), 0, -.25, 0);
  r.setUI({ lock: false, cc: 1, plane: 0, bars: 4 }); r.cam.near = .002;
  const tile = r.phonePt(.2, .2, .0), k = ease.inOut(prog(lt, 0, w(52) - 24.0));
  r.lookCam(lerpV(v3(.02, .12, .2), tile.clone().add(v3(0, 0, .01)), k), tile, 30 - 10 * k);
  r.grade.zb.value = .8 * k; r.grade.flash.value = Math.pow(prog(lt, .6, w(52) - 24.0), 2) * .9;
}, { noPunch: true });

// ═════ ANALOGY: two voices ═════
function holoScene(t) {
  const r = R(); r.stage('holo', t);
  const [L, F, X] = r.busts;
  L.visible = F.visible = true; L.position.set(-.4, 0, 0); L.rotation.set(0, 0, 0);
  F.position.set(1.3, 0, 0); F.rotation.set(0, Math.PI, 0);
  X.position.set(-.38, 0, .74); X.rotation.set(0, Math.PI / 2, 0);
  for (const b of r.busts) b.updateMatrixWorld(true);
  return { L, F, X, mouthF: F.localToWorld(F.userData.mouth.clone()), mouthX: X.localToWorld(X.userData.mouth.clone()), ear: L.localToWorld(L.userData.ear.clone()) };
}
const softRings = (r, H, t, a = .8) => r.emit(H.mouthF, t, { R: 2.3, per: .5, life: 1.7, a, col: r.COL.blue, w: .05 });
const loudRings = (r, H, t, a = 1) => r.emit(H.mouthX, t, { R: .9, per: .14, life: .6, a: a * 1.5, col: 0xd8f0ff, w: .14 });
shot(w(52), w(60), (lt, t) => {   // "تخيّل إنك تحاول تسمع شخصًا يتكلم معك بهدوء"
  const r = R(), H = holoScene(t), k = lt / (w(60) - w(52));
  r.lookCam(v3(3.5 - .3 * k, 1.35, 2.9 - .3 * k), v3(.45, .8, 0), 38);
  if (t > w(55)) softRings(r, H, t, sm(w(55), w(56), t) * .8);
  r.bustM.uniforms.k.value = sm(w(52), w(52) + .5, t);
}, {
  after(lt, t) { const r = R(), H = holoScene(t); label('أنت', v3(-.4, 1.2, 0), prog(t, w(53), w(53) + .3), { dy: -70 }); label('شخص يكلمك بهدوء', v3(1.3, 1.2, 0), prog(t, w(55), w(55) + .3), { dy: -70 }); },
});
shot(w(60), w(69), (lt, t) => {   // "…شخص ثاني يتكلم جنب أذنك"
  const r = R(), H = holoScene(t); H.X.visible = t > w(63) - .1;
  const k = ease.inOut(prog(t, w(63), w(66)));
  r.lookCam(lerpV(v3(3.2, 1.35, 2.6), v3(1.4, 1.3, 2.4), k).add(shake(t, .02 * k, 12)), lerpV(v3(.45, .8, 0), v3(-.2, .85, .35), k), 38);
  softRings(r, H, t, .8 - .4 * k);
  if (H.X.visible) loudRings(r, H, t, sm(w(64), w(66), t));
}, { after(lt, t) { const r = R(); label('شخص ثاني… جنب أذنك', v3(-.38, 1.25, .74), prog(t, w(65), w(65) + .3), { dy: -70, c: '#FFFFFF' }); } });
shot(w(69), 40.1, (lt, t) => {   // "صعوبة في سماع الشخص الأول، صح؟" — at the ear: the loud voice buries the soft one
  const r = R(), H = holoScene(t); H.X.visible = true;
  r.lookCam(v3(.75 - lt * .02, 1.1, 1.05 - lt * .03), H.ear, 36);
  softRings(r, H, t, .35); loudRings(r, H, t, 1);
  r.ring(H.ear, .12 + .02 * Math.sin(t * 20), 0xffffff, .5, { face: 'cam', w: .2 });
});
// "الفكرة هنا مشابهة، لكن بدل الأصوات، احنا نتكلم عن إشارات لاسلكية" — the listener becomes the airplane, voices become radio
shot(40.1, 46.6, (lt, t) => {
  const r = R(), H = holoScene(t), m = sm(w(80), w(82) + .3, t);
  H.L.visible = m < .5; H.F.visible = m < .5; H.X.visible = m < .5;
  r.bustM.uniforms.k.value = m < .5 ? 1 - m * 2 : 0;
  r.lookCam(v3(3.6 + lt * .06, 1.45, 3.0 + lt * .06), v3(.45, .8, 0), 40);
  if (m < .5) { softRings(r, H, t, .6 * (1 - m * 2)); loudRings(r, H, t, .8 * (1 - m * 2)); }
  if (m >= .5) {
    const a = (m - .5) * 2;
    r.jet.visible = true; r.jetHolo(true); r.holoM.uniforms.k.value = a; r.jet.scale.setScalar(.03); r.jet.position.set(-.4, .95, 0); r.jet.rotation.set(0, -.5, 0);
    r.holoTower.visible = true; r.holoTower.position.set(1.3, 0, 0); r.bustM.uniforms.k.value = a;
    r.phoneAt(v3(-.3, .5, .8), 0, .9, 0, 2.4); r.setUI({ lock: true, bars: 4 }); r.phoneLight.intensity = .2;
    r.emit(v3(1.3, 2.3, 0), t, { R: 2.4, per: .55, life: 1.8, a: .7 * a, col: r.COL.blue, w: .04, wave: 1 });
    r.emit(r.phonePt(.5, .5), t, { R: .9, per: .16, life: .7, a: 1.3 * a, col: 0xd8f0ff, w: .12 });
  }
}, {
  after(lt, t) {
    const a = prog(t, w(84), w(84) + .3);
    label('الطائرة', v3(-.4, 1.25, 0), a, { dy: -80 }); label('برج الاتصال', v3(1.3, 2.45, 0), a, { dy: -70 }); label('جوالك', v3(-.3, .75, .8), a, { dy: 120, c: '#FFFFFF' });
  },
});

// ═════ AIRCRAFT SYSTEMS ═════
shot(46.6, w(91) + .1, (lt, t) => {   // "الطائرة فيها أنظمة إلكترونية" — real jet → x-ray
  exterior(t, 50); const r = R(); const k = sm(w(90), w(91), t);
  r.lookCam(v3(26 - lt * 2, 7, 30), v3(3, 0, 0), 32);
  if (k > .5) { r.jetHolo(true); r.avionics.visible = true; r.holoM.uniforms.k.value = (k - .5) * 2; r.holoM.uniforms.scan.value = 20 - lt * 12; r.sky.glow.value = .4; }
});
shot(w(91) + .1, w(97), (lt, t) => {   // "دقيقة، بعضها يستقبل إشارات لاسلكية" — the antennas
  const r = R(); r.stage('holo', t); r.jet.visible = true; r.jetHolo(true); r.avionics.visible = true;
  r.holoM.uniforms.scan.value = 18 - lt * 8;
  const k = lt / (w(97) - w(91));
  r.lookCam(v3(22 - 6 * k, 9 - 2 * k, 18 + 4 * k), v3(6, 0, 0), 32);
  if (t > w(94)) for (const a of R().antennas) r.emit(a.position.clone(), t, { R: 2.4, per: .45, life: 1.2, a: .8, col: r.COL.cyan, ph: a.position.x });
  if (t > w(95)) for (let i = 0; i < 3; i++) { const y0 = 28; r.beam(v3(-8 + i * 8, y0, 6), R().antennas[i].position, .06, r.COL.cyan, .8, { t: t * 2 }); }
}, {
  after(lt, t) { const A = R().antennas; label('هوائيات', A[0].position, prog(t, w(94), w(94) + .3), { dy: -120, dx: -200 }); label('أنظمة إلكترونية', v3(13, -1, 0), prog(t, w(92), w(92) + .3), { dy: 140, dx: 40 }); },
});
let _GJ; const gj = () => _GJ || (_GJ = v3(0, 380, 0));
function groundScene(t, o = {}) {
  const r = R(); r.stage('ground', t); r.jet.visible = true; r.navLights(t); r.jet.position.copy(gj()); r.jet.scale.setScalar(2.6); r.jet.rotation.set(0, .6, 0);
}
shot(w(97), w(98), (lt, t) => {   // "للتواصل" — ATC voice link
  const r = R(); groundScene(t); const tw = r.towers[0], top = tw.position.clone().add(v3(0, 40, 0));
  r.lookCam(v3(tw.position.x + 120, 60, tw.position.z + 160), lerpV(top, gj(), .55), 50);
  r.beam(top, gj(), 1.2, r.COL.cyan, 1, { t: t * 3, n: 10, grow: sm(w(97), w(97) + .5, t) });
  r.emit(top, t, { R: 60, per: .5, life: 1.4, a: .7 });
}, { after(lt, t) { const r = R(); label('التواصل', r.towers[0].position.clone().add(v3(0, 42, 0)), prog(lt, .1, .4), { dy: 110 }); } });
shot(w(98), 56.6, (lt, t) => {   // "والملاحة" — navigation beacons
  const r = R(); groundScene(t);
  r.lookCam(v3(420 - lt * 40, 140, 420), v3(0, 160, 0), 52);
  for (const tw of r.towers.slice(1, 6)) { const p = tw.position.clone().add(v3(0, 1, 0)); r.emit(p, t, { R: 160, per: .6, life: 2, a: .6, face: 'up', w: .02, col: r.COL.blue, ph: tw.position.x }); r.beam(p.clone().add(v3(0, 38, 0)), gj(), .9, r.COL.blue, .7, { t: t * 2 }); }
}, { after(lt, t) { label('الملاحة', gj(), prog(lt, .1, .4), { dy: -130 }); } });

// ═════ INTERFERENCE ═════
shot(56.6, w(102), (lt, t) => {   // "وفي ظروف معينة" — calm cabin
  const r = R(); r.stage('cabin', t);
  r.lookCam(v3(6 - lt * .3, .9, 1.3), v3(-6, -.2, -.6), 44);
});
shot(w(102), w(107), (lt, t) => {   // "ممكن الإشارات الصادرة من الأجهزة" — every phone lights up
  const r = R(); r.stage('cabin', t);
  const n = Math.floor(sm(w(103), w(106) + .4, t) * PAXN());
  r.lookCam(v3(-14.6 + lt * .4, 1.35, 0), v3(3, -.6, 0), 56);
  cabinPhones(t, n, { a: .6 });
});
shot(w(107), w(113) - .1, (lt, t) => {   // "…تتداخل مع بعض هذه الأنظمة" — exterior: the noise reaches the antennas
  exterior(t, 60); const r = R();
  r.lookCam(v3(18 + lt * 1.5, 12, 26), v3(4, 0, 0), 34);
  for (let i = 0; i < 12; i++) { const x = -10 + i * 2; r.emit(v3(x, .55, 2.05), t, { R: 2.4, per: .7, life: 1.2, a: .08, ph: i * .17 }); }
  const k = sm(w(110), w(111), t);
  for (const a of r.antennas) { a.material.emissive.setRGB(.2 * k, .5 * k, 1 * k); r.ring(a.position.clone(), .9 + .3 * Math.sin(t * 30), 0xffffff, k * .6, { wave: 1, w: .2 }); }
  r.grade.glitch.value = .12 * k;
});
shot(w(113) - .1, 70.0, (lt, t) => {   // "وتؤثر في عملها" — cockpit: displays + headset buzz
  const r = R(); r.stage('cockpit', t); r.updClouds(t, 60);
  const g = sm(w(113), w(114), t) * (1 - sm(69.3, 69.9, t) * .7); r.navGlitch = g; r.drawAvionics(t);
  const k = ease.inOut(prog(lt, 0, 2.5));
  r.lookCam(lerpV(v3(-.95, .5, .0), v3(.42, .52, .36), k).add(shake(t, .006 * g, 20)), lerpV(v3(1.2, -.1, 0), v3(-.02, .4, .62), k), 56 - 14 * k);
  r.grade.glitch.value = .35 * g;
}, { after(lt, t) { const r = R(); label('سماعة الطيّار', v3(-.02, .52, .62), prog(lt, 1.6, 1.9), { dy: -140, dx: -60 }); } });

// ═════ QUESTION 2 ═════
shot(70.0, w(126), (lt, t) => {   // "هل… جوالك بيشوّش… بمجرد" — power on
  const r = R(); r.stage('studio', t); r.phoneAt(v3(0, .0735, 0), 0, -.35 + lt * .05, 0); r.cam.near = .01;
  const pw = sm(w(122), w(122) + .35, t); r.setUI({ lock: true, bars: pw > .5 ? 4 : 0, power: pw }); r.phoneLight.intensity = .3 * pw;
  r.lookCam(v3(.08, .12, .44 - lt * .02), v3(0, .078, 0), 30);
  if (pw > .3) r.emit(r.phonePt(.5, .5), t, { R: .35, per: .45, life: 1.2, a: .9 * pw });
});
shot(w(126), 76.6, (lt, t) => {   // "ما تشغّله؟" — tight, the question hangs
  const r = R(); r.stage('studio', t); r.phoneAt(v3(0, .0735, 0), 0, -.2, 0); r.cam.near = .005;
  r.setUI({ lock: true, bars: 4 }); r.phoneLight.intensity = .3;
  r.lookCam(v3(.03, .11, .26 - lt * .03), v3(0, .085, 0), 30);
  const hb = [76.0, 76.3]; let pulse = 0; for (const h of hb) if (t > h) pulse = Math.max(pulse, 1 - prog(t, h, h + .25));
  r.emit(r.phonePt(.5, .5), t, { R: .25, per: .8, life: 1.4, a: .5 + pulse });
  r.grade.vig.value = .5 + .3 * pulse;
});
shot(76.6, w(130), (lt, t) => {   // "مو بالضرورة!" — calm exterior
  exterior(t); const r = R();
  r.lookCam(v3(-48, -6 + lt, -26), v3(2, 0, 0), 28);
});
shot(w(130), w(135), (lt, t) => {   // "مو كل جوال يسبب تداخلًا" — most phones are fine
  const r = R(); r.stage('cabin', t);
  r.lookCam(v3(-14.6 + lt * .5, 1.4, 0), v3(3, -.6, 0), 56);
  const P = r.CAB.phones;
  for (let i = 0; i < P.length; i++) { const bad = i % 23 === 7; r.ring(P[i], bad ? .32 + .1 * Math.sin(t * 9) : .16, bad ? 0xffffff : 0x30D158, bad ? 1 : .6, { w: .25 }); }
});

// ═════ SAFETY ═════
function hangar(t) { const r = R(); r.stage('studio', t); r.jet.visible = true; r.gear.visible = true; r.jet.position.set(0, 4.9, 0); r.jet.rotation.y = 0; }
shot(w(135), w(139), (lt, t) => {   // "وسلامة الطائرات تعتمد على احتياطات"
  const r = R(); hangar(t);
  r.lookCam(v3(34 - lt * 2, 5, 30), v3(2, 4.5, 0), 34);
});
shot(w(139), w(143), (lt, t) => {   // "واختبارات وقواعد تحدد" — EMI test sweep
  const r = R(); hangar(t);
  r.lookCam(v3(-30 + lt * 2, 10, 32), v3(-2, 4, 0), 34);
  const k = prog(t, w(140) - .1, w(141) + .4);
  r.sweep.visible = true; r.sweep.position.set(22 - 44 * k, 6, 0); r.sweep.scale.set(1, 16, 44);
  r.jetHolo(prog(t, w(140), w(141)) > 0 && k < 1 ? false : false);
  for (const a of r.antennas) a.material.emissive.setRGB(0, .4 * (Math.abs(a.position.x - (22 - 44 * k)) < 3), .9 * (Math.abs(a.position.x - (22 - 44 * k)) < 3));
});
shot(w(143), 88.9, (lt, t) => {   // "استخدام الأجهزة الإلكترونية أثناء الرحلة"
  const r = R(); r.stage('cabin', t); trayPhone(20, -.52, -.25); r.setUI({ lock: true, bars: 3 }); r.cam.near = .01;
  r.CAB.sign.material.color.setRGB(1, 1, 1);
  r.lookCam(v3(2.5 + lt * .05, .3, -.15), v3(4.6, 1.1, 0), 46);
});

// ═════ AIRPLANE MODE ═════
shot(88.9, w(153), (lt, t) => {   // "وهنا يجي دور وضع الطيران!" — hero
  const r = R(); r.stage('studio', t); r.phoneAt(v3(0, .0735, 0), 0, -.8 + ease.out(prog(lt, 0, 1.5)) * .6, 0); r.cam.near = .01;
  const cc = sm(w(150), w(151), t); r.setUI({ lock: cc < .05, cc, plane: 0, bars: 4 }); r.phoneLight.intensity = .3;
  r.lookCam(v3(.1, .14, .5 - lt * .04), v3(0, .075, 0), 30);
  r.emit(r.phonePt(.5, .5), t, { R: .4, per: .4, life: 1.2, a: .7 });
});
shot(w(153), w(159), (lt, t) => {   // "لما تفعّله، جوالك يوقف الاتصال الخلوي" — the toggle
  const r = R(); r.stage('studio', t); r.phoneAt(v3(0, .0735, 0), 0, -.2, 0); r.cam.near = .005;
  const on = t > w(154) + .1 ? 1 : 0; r.setUI({ lock: false, cc: 1, plane: on, bars: on ? 0 : 4 }); r.phoneLight.intensity = .3;
  const tile = r.phonePt(.2, .2, .001), k = ease.inOut(prog(lt, 0, 1.2));
  r.lookCam(lerpV(v3(.06, .12, .32), v3(.025, .13, .16), k), lerpV(v3(0, .08, 0), tile, k * .5), 30);
  if (!on) r.emit(r.phonePt(.5, .5), t, { R: .3, per: .35, life: 1, a: .8 });
  else { const q = prog(t, w(154) + .1, w(154) + .6); r.ring(tile, .01 + q * .05, 0xFF9F0A, 1 - q, { w: .15 }); r.ring(r.phonePt(.5, .5), .35 * (1 - ease.out(prog(t, w(154) + .1, w(154) + .7))), r.COL.cyan, 1 - q, { w: .05 }); }
  r.grade.flash.value = .5 * (1 - prog(t, w(154) + .1, w(154) + .35)) * on;
});
shot(w(159), 101.7, (lt, t) => {   // "…يتوقف عن إرسال واستقبال إشارات شبكة الجوال" — the links to the towers go dark
  const r = R(); groundScene(t);
  r.lookCam(v3(330 - lt * 15, 110 + lt * 4, 300), v3(0, 210, 0), 50);
  const cut = sm(w(166), w(167) + .3, t);
  r.towers.slice(0, 9).forEach((tw, i) => {
    const top = tw.position.clone().add(v3(0, 38, 0));
    const up = t > w(162), dn = t > w(163);
    r.beam(top, gj(), 1.1, i % 2 ? r.COL.cyan : r.COL.blue, (1 - cut) * .9, { t: (i % 2 ? -1 : 1) * t * 3 * (up || dn ? 1 : .3), n: 9, cut: cut > .05 ? 1 : 0 });
    if (cut < .8) r.emit(top, t, { R: 70, per: .7, life: 1.6, a: .5 * (1 - cut), ph: i * .3 });
  });
});

// ═════ SUMMARY ═════
shot(101.7, w(178), (lt, t) => {   // "فالخلاصة: وضع الطيران مو لأن جوالك راح يطيح الطائرة"
  exterior(t); const r = R();
  r.lookCam(v3(40 - lt * 1.5, -3, 32), v3(2, 0, 0), 30);
});
shot(w(178), w(188), (lt, t) => {   // "…بل لأنه يساعد على الالتزام بقواعد استخدام الأجهزة" — calm, clean cockpit
  const r = R(); r.stage('cockpit', t); r.updClouds(t, 60); r.drawAvionics(t);
  r.lookCam(v3(-1.0 + lt * .06, .55, 0), v3(1.3, .1, 0), 54);
});
shot(w(188), 115.3, (lt, t) => {   // "وتقليل احتمال التداخل مع أنظمة الطائرة" — a protective bubble around the jet
  exterior(t, 60); const r = R();
  r.lookCam(v3(-36 + lt * 2, 14, 38), v3(0, 0, 0), 34);
  const k = sm(w(189), w(190) + .5, t);
  r.ring(v3(0, 0, 0), 22 + 2 * k, r.COL.cyan, .55 * k, { face: 'cam', w: .03 });
  r.ring(v3(0, 0, 0), 23.5, r.COL.blue, .3 * k, { face: 'up', w: .015 });
});

// ═════ ENDING ═════
shot(115.3, w(200), (lt, t) => {   // "وعشان كذا، التزم دائمًا بتعليمات"
  const r = R(); r.stage('cabin', t);
  const blink = (t > w(197) && (t - w(197)) % .8 < .5) ? 1 : .55;
  for (const s of [r.CAB.sign, ...r.CAB.signs]) s.material.color.setRGB(blink, blink, blink);
  r.lookCam(v3(-8 + lt * .4, .2, 0), v3(6, 1.2, 0), 46);
});
shot(w(200), w(202), (lt, t) => {   // "طاقم الطائرة،"
  const r = R(); r.stage('cabin', t); r.CAB.sign.material.color.setRGB(1, 1, 1);
  r.lookCam(v3(1.2 + lt * .15, .9, -.35), v3(4, 1.5, 0), 34);
});
shot(w(202), w(212) - .1, (lt, t) => {   // "حتى لو كنت تعتقد إن جوالك ما راح يسبب أي…" — your phone, airplane mode on
  const r = R(); r.stage('cabin', t); trayPhone(20, -.52, .35); r.cam.near = .01;
  r.setUI({ lock: true, plane: 1, note: 'وضع الطيران: مفعّل ✓', note2: 'رحلة سعيدة' });
  const p = r.phonePt(.5, .45, .002), k = ease.inOut(prog(lt, 0, w(212) - w(202)));
  r.lookCam(p.clone().add(v3(-.06 - .1 * k, .24 + .2 * k, .26 + .1 * k)), p, 34);
});
shot(w(212) - .1, VOICE_END + 3.2, (lt, t) => {   // "مشكلة." — the jet flies off into the night
  exterior(t, 70); const r = R();
  r.jet.position.x = lt * 9;
  r.lookCam(v3(-60, 4, 30), v3(lt * 8, 0, 0), 30 - lt * 2);
  r.grade.vig.value = .5 + .4 * prog(lt, 1, 3);
});
window.SHOTS = S;

// ───────── DOM text layers ─────────
const L = [];
const chipHTML = (txt, col = C.blue) => `<div style="position:absolute;top:178px;left:0;right:0;text-align:center"><span class="latin" style="display:inline-flex;align-items:center;gap:14px;padding:12px 26px;border-radius:999px;background:rgba(8,11,18,.72);border:1.5px solid ${col}88;font-weight:700;font-size:24px;letter-spacing:5px;color:${C.ink}"><i style="width:12px;height:12px;border-radius:50%;background:${col};box-shadow:0 0 14px ${col}"></i>TXT</span></div>`.replace('TXT', txt);
// a status chip under the wordmark (latin, HUD style)
function chip(s, e, txt, col) {
  L.push({ s, e, fi: .2, fo: .2, build(root) { root.appendChild(el(chipHTML(txt, col))); }, update(root, lt) { const c = root.firstChild; c.style.transform = `translateY(${(1 - ease.out(prog(lt, 0, .3))) * -16}px)`; } });
}
// big kinetic headline
function headline(s, e, html, o = {}) {
  L.push({
    s, e, fi: .05, fo: .25,
    build(root) { root.appendChild(el(`<div style="position:absolute;left:40px;right:40px;top:${o.top ?? 330}px;text-align:center;font-weight:700;font-size:${o.fs ?? 104}px;line-height:1.2;color:${o.col ?? C.ink};${SH}">${html}</div>`)); },
    update(root, lt, t) {
      const n = root.firstChild, k = ease.back(prog(lt, 0, .35));
      n.style.opacity = clamp(prog(lt, 0, .15)); n.style.transform = `scale(${.8 + .2 * k}) translateY(${(1 - k) * 30}px)`;
      if (o.strike) { const sk = ease.out(prog(t, o.strike, o.strike + .3)); n.querySelectorAll('.st i').forEach(x => x.style.width = `${sk * 108}%`); }
      if (o.upd) o.upd(n, lt, t);
    },
  });
}
const strike = txt => `<span class="st" style="position:relative;display:inline-block">${txt}<i style="position:absolute;right:-4%;top:50%;height:12px;width:0;background:${K.red};border-radius:6px;box-shadow:0 0 18px ${K.red}"></i></span>`;
const bigNum = (n, txt) => `<span class="latin" style="font-size:150px;color:${C.cyan}">${n}</span><br><span style="font-size:52px;color:${C.gray}">${txt}</span>`;

// hook
chip(0.2, w(5), 'AIRPLANE MODE · OFF', K.orange);
chip(w(5), w(9), 'PHONE · TRANSMITTING', C.cyan);
headline(w(9) + .05, 5.15, `إسقاط <span style="color:${C.cyan}">طائرة؟!</span>`, { fs: 120 });
headline(5.2, w(17) + .4, `<span style="font-size:150px">✕</span><br>مو هذا اللي تتخيله`, { fs: 84, top: 300 });
chip(w(17), 13.3, 'SIGNALS ON BOARD', C.cyan);
headline(w(25) - .05, 13.3, `${strike('مستحيل')}<br><span style="font-size:60px;color:${C.gray}">ممكن تسبب مشاكل</span>`, { fs: 96, strike: w(25) + .1 });
// question
chip(13.3, 18.7, 'SCALE CHECK', C.blue);
headline(w(33), w(37), `صغير`, { fs: 120, top: 380 });
headline(w(41) - .05, 18.7, `ضخمة؟`, { fs: 130, top: 330, col: C.cyan });
chip(18.7, 24.0, 'CABIN ANNOUNCEMENT', K.orange);
headline(w(47), 24.0, `<span style="font-size:190px;color:${K.orange}">؟</span>`, { top: 280 });
// analogy
chip(w(52), w(80), 'SOUND · ANALOGY', C.cyan);
chip(w(80), 46.6, 'RADIO WAVES', C.cyan);
headline(w(76) - .05, 40.1, `صح؟`, { fs: 130, top: 330 });
headline(w(82) - .1, w(84), `صوت <span style="color:${C.cyan}">←</span> موجات لاسلكية`, { fs: 78, top: 330 });
// systems
chip(46.6, w(97), 'AVIONICS', C.blue);
chip(w(97), 56.6, 'COMMUNICATION · NAVIGATION', C.cyan);
// interference
chip(56.6, w(107), 'PASSENGER DEVICES', C.cyan);
headline(w(103), w(107), '', { top: 320, upd(n, lt, t) { const k = sm(w(103), w(106) + .4, t); n.innerHTML = bigNum(Math.round(k * PAXN()), 'جهاز يرسل إشارات'); } });
chip(w(107), 70.0, 'INTERFERENCE', K.red);
// question 2
chip(70.0, 76.6, 'POWER ON', C.cyan);
headline(w(126) + .1, 76.6, `<span style="font-size:190px;color:${C.cyan}">؟</span>`, { top: 960 });
headline(76.6, w(130), `مو بالضرورة!`, { fs: 110, top: 330 });
chip(w(130), w(135), 'MOST DEVICES · OK', K.green);
// safety: three pillars appear one by one
L.push({
  s: w(135), e: 88.9, fi: .15, fo: .3,
  build(root) {
    const items = [['🛡', 'احتياطات', w(139)], ['⚙', 'اختبارات', w(140)], ['📋', 'قواعد', w(141)]];
    root.appendChild(el(`<div style="position:absolute;left:60px;right:60px;top:300px;display:flex;flex-direction:column;gap:22px;align-items:center">${items.map(([ic, tx, at], i) => `<div class="p" data-at="${at}" style="display:flex;align-items:center;gap:24px;min-width:600px;padding:22px 40px;border-radius:26px;background:rgba(8,11,18,.78);border:2px solid ${C.blue};box-shadow:0 0 40px rgba(22,139,255,.35)"><span style="font-size:56px">${ic}</span><span style="font-weight:700;font-size:64px">${tx}</span><span style="margin-inline-start:auto;font-size:56px;color:${K.green}">✓</span></div>`).join('')}</div>`));
  },
  update(root, lt, t) { root.querySelectorAll('.p').forEach(p => { const k = ease.back(prog(t, +p.dataset.at - .15, +p.dataset.at + .2)); p.style.opacity = clamp(k); p.style.transform = `translateX(${(1 - k) * 120}px)`; }); },
});
chip(w(143), 88.9, 'CABIN RULES', C.blue);
// airplane mode
chip(88.9, 101.7, 'AIRPLANE MODE', K.orange);
headline(w(151), w(153), `<span style="font-size:140px">✈</span><br>وضع الطيران`, { fs: 96, top: 270, col: C.ink });
headline(w(155), w(159), `الاتصال الخلوي <span style="color:${K.red}">✕</span>`, { fs: 78, top: 330 });
headline(w(162), 101.7, `<span class="latin">↑</span> إرسال &nbsp; <span class="latin">↓</span> استقبال<br><span style="font-size:64px;color:${C.gray}" class="off">…متوقف</span>`, { fs: 84, top: 300, upd(n, lt, t) { n.querySelector('.off').style.opacity = prog(t, w(166), w(167)); } });
// summary
chip(101.7, 123.2, 'SUMMARY', C.cyan);
headline(w(171), w(178), `${strike('يطيح الطائرة')}`, { fs: 100, top: 330, strike: w(176) });
headline(w(183), w(188), `<span style="color:${K.green}">✓</span> الالتزام بالقواعد`, { fs: 84, top: 330 });
headline(w(189), 115.3, `<span style="color:${K.green}">✓</span> تقليل احتمال التداخل`, { fs: 80, top: 330 });
headline(w(197), w(202), `التزم بتعليمات<br><span style="color:${C.cyan}">طاقم الطائرة</span>`, { fs: 92, top: 300 });
L.push(outroScene(VOICE_END + .35, VOICE_END + 3.2));
L.sort((a, b) => a.s - b.s);

// waveform panel (sound analogy + headset buzz). mode(t) → {soft, loud, buzz}
function wavePanel(s, e, title, mode) {
  L.push({
    s, e, fi: .2, fo: .2,
    build(root) {
      root.appendChild(el(`<div style="position:absolute;left:90px;right:90px;top:1060px;height:200px;border-radius:24px;background:rgba(8,11,18,.8);border:1.5px solid rgba(22,139,255,.5);overflow:hidden">
        <div class="latin" style="position:absolute;left:24px;top:14px;font-weight:700;font-size:20px;letter-spacing:4px;color:${C.gray}">${title}</div>
        <canvas width="900" height="200" style="position:absolute;inset:0;width:100%;height:100%"></canvas></div>`));
    },
    update(root, lt, t) {
      const cv = root.querySelector('canvas'), g = cv.getContext('2d'), m = mode(t);
      g.clearRect(0, 0, 900, 200);
      const line = (fn, col, lw) => { g.beginPath(); for (let x = 0; x <= 900; x += 3) { const y = 110 + fn(x); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.strokeStyle = col; g.lineWidth = lw; g.shadowColor = col; g.shadowBlur = 12; g.stroke(); g.shadowBlur = 0; };
      line(x => m.soft * 26 * Math.sin(x * .03 - t * 8) * Math.sin(x * .004 + t), C.blue, 4);
      if (m.loud > 0) line(x => m.loud * 60 * (Math.sin(x * .09 - t * 20) * .6 + Math.sin(x * .23 + t * 31) * .4) * (.6 + .4 * Math.sin(x * .02 + t * 5)), '#dff1ff', 3);
      if (m.buzz > 0) line(x => { const ph = (x * .02 - t * 9) % 2.2; return m.buzz * (ph > 0 && ph < .6 ? 70 * Math.sin(x * 1.3 + t * 60) : 3 * Math.sin(x)); }, C.cyan, 3);
    },
  });
}
wavePanel(w(55), w(80), 'WHAT YOU HEAR', t => ({ soft: sm(w(55), w(56), t), loud: t > w(63) ? sm(w(64), w(66), t) : 0, buzz: 0 }));
wavePanel(w(113) + .4, 70.0, 'PILOT HEADSET · AUDIO', t => ({ soft: .7, loud: 0, buzz: sm(w(113), w(114), t) * (1 - sm(69.3, 69.9, t) * .7) }));
L.sort((a, b) => a.s - b.s);

window.TL = {
  voiceEnd: VOICE_END,
  lead: 0.15,
  flashes: [w(9), 24.0 + .6, w(154) + .1],
  remap: tv => {
    let i = 0; while (i < WARP.length - 2 && tv > WARP[i + 1][1]) i++;
    const [s0, v0] = WARP[i], [s1, v1] = WARP[i + 1];
    if (tv >= v1) return s1 + (tv - v1);
    return s0 + (tv - v0) * (s1 - s0) / ((v1 - v0) || 1);
  },
  bug: t => (t < .6 ? 0 : 1) * (1 - prog(t, VOICE_END + .1, VOICE_END + .4)),
  subs: SUBS,
  scenes: L,
};
