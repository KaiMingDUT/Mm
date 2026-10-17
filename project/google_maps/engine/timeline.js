// KROZO — "كيف يعرف Google Maps إن فيه زحمة؟"
// Story time (t) follows the narration; TL.remap adds a 0.8 s dramatic pause after "كيف يعرف؟".
const VOICE_END = 56.11;
const fullCanvas = () => el('<canvas width="1080" height="1920" style="position:absolute;inset:0"></canvas>');
const zoneMid = () => WORLD.at((WORLD.ZONE[0] + WORLD.ZONE[1]) / 2, 0);

// ───────────────────────── A. 3D driving POV (0 – 2.95) ─────────────────────────
const sceneHighway = {
  s: 0, e: 2.95, fi: .01, fo: .15,
  build(r) {
    r.appendChild(el(`<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,11,18,.85) 0%,rgba(8,11,18,0) 34%)"></div>`));
    r.appendChild(el(`<div class="hook" style="position:absolute;left:80px;right:80px;top:250px;text-align:center">
      <div class="kicker" style="color:${C.gray};font-size:32px">في دقيقة</div>
      <div class="headline" style="font-size:76px;margin-top:14px">كيف يعرف <span class="latin hl">Google Maps</span><br>إن فيه زحمة؟</div></div>`));
  },
  update(r, lt, t) {
    G3.setPOV(-60 + t * 150, Math.sin(t * .9) * 18, 150 - t * 22);
    G3.set({ opacity: 1, cars: .42, lights: true, bloom: .5 });
    const h = r.querySelector('.hook');
    const k = ease.out(prog(lt, .05, .6));
    h.style.opacity = k * (1 - prog(lt, 2.5, 2.85));
    h.style.transform = `translateY(${(1 - k) * 24}px)`;
  },
};

// ───────────────────────── B. Phone + map (2.80 – 6.45) ─────────────────────────
const PH = { w: 500, h: 1000, x: 290, y: 230 };
const scenePhone = {
  s: 2.80, e: 6.45, fi: .08, fo: .3,
  focus: lt => ({ x: 540, y: 720, r: 800, a: .12 }),
  build(r) {
    r.appendChild(el(`<div style="position:absolute;inset:0;background:radial-gradient(ellipse 60% 45% at 50% 40%,rgba(8,11,18,.55),rgba(8,11,18,.2))"></div>`));
    r.appendChild(el(`<div class="ph" style="position:absolute;left:${PH.x}px;top:${PH.y}px;width:${PH.w}px;height:${PH.h}px;border-radius:64px;
      background:#0B0F18;border:3px solid #2A3446;box-shadow:0 40px 120px rgba(0,0,0,.7),0 0 0 10px #121826,0 0 60px rgba(22,139,255,.22);overflow:hidden">
      <canvas width="${PH.w}" height="${PH.h}" style="position:absolute;inset:0"></canvas>
      <div style="position:absolute;left:28px;right:28px;top:56px;height:62px;border-radius:31px;background:rgba(20,27,40,.95);border:1.5px solid #2A3446;display:flex;align-items:center;gap:14px;padding:0 22px;direction:ltr">
        <svg width="26" height="26" viewBox="0 0 26 26"><circle cx="11" cy="11" r="8" stroke="#A7B1C2" stroke-width="2.6" fill="none"/><path d="M17 17l6 6" stroke="#A7B1C2" stroke-width="2.6" stroke-linecap="round"/></svg>
        <div style="height:10px;width:160px;border-radius:5px;background:#2A3446"></div></div>
      <div class="tag label" style="left:0;top:0;opacity:0;font-size:36px;font-weight:700;border-color:${C.blue};color:${C.ink}">زحمة</div>
      <div style="position:absolute;left:50%;top:14px;width:120px;height:30px;margin-left:-60px;border-radius:16px;background:#000"></div>
    </div>`));
  },
  update(r, lt, t) {
    if (t >= 2.95) {
      G3.setMap({ x: 560, y: 700, z: .95, pitch: 46, yaw: -30 + lt * 6 });
      G3.set({ opacity: .55 * fadeIO(t, 2.95, this.e, .2, .3), cars: 1, bloom: .9 });
    }
    const ph = r.querySelector('.ph');
    const k = ease.back(prog(t, 2.85, 3.55));
    ph.style.transform = `perspective(1800px) translateY(${(1 - k) * 1100}px) rotateX(${(1 - ease.out(prog(t, 2.85, 3.95))) * 28}deg) rotateY(${Math.sin(lt * .9) * 4}deg) scale(${1 + .03 * prog(t, 3.5, 6.4)})`;
    const ctx = ph.querySelector('canvas').getContext('2d');
    ctx.clearRect(0, 0, PH.w, PH.h);
    ctx.fillStyle = '#0B0F18'; ctx.fillRect(0, 0, PH.w, PH.h);
    const cam = { x: 560, y: 760, z: .78, sy: PH.h / 2 + 40 };
    ctx.save(); ctx.translate(PH.w / 2 - 540, 0);
    drawMapBase(ctx, cam);
    ctx.save(); camApply(ctx, cam);
    drawRoadPath(ctx, 120, WORLD.L - 80); ctx.strokeStyle = 'rgba(89,199,255,.85)'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.stroke();
    ctx.restore();
    const j = ease.out(prog(t, 5.62, 6.1));
    drawJamOverlay(ctx, cam, j, t);
    const yp = toScreen(cam, WORLD.at(200, 0));
    ctx.fillStyle = 'rgba(22,139,255,.25)'; ctx.beginPath(); ctx.arc(yp[0], yp[1], 24, 0, 7); ctx.fill();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(yp[0], yp[1], 12, 0, 7); ctx.fill();
    ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(yp[0], yp[1], 7, 0, 7); ctx.fill();
    ctx.restore();
    const zc = toScreen(cam, zoneMid());
    const tag = ph.querySelector('.tag');
    tag.style.opacity = j; tag.style.left = (zc[0] + (PH.w / 2 - 540) + 50) + 'px'; tag.style.top = (zc[1] - 34) + 'px';
    tag.style.transform = `scale(${.85 + .15 * ease.back(prog(t, 5.7, 6.15))})`;
  },
};

// ─────────────────── C. No cameras / sensors / reports (6.25 – 11.42) ───────────────────
const sceneNoSources = {
  s: 6.25, e: 11.42, fi: .25, fo: .25,
  focus: () => ({ x: 540, y: 760, r: 820, a: .10 }),
  build(r) {
    r.appendChild(el(`<div style="position:absolute;inset:0;background:rgba(8,11,18,.35)"></div>`));
    const items = [['camera', 'كاميرات', 6.66], ['sensor', 'حساسات', 8.61], ['report', 'بلاغ عن حادث', 9.70]];
    items.forEach(([ic, lbl, ts], i) => {
      const y = 330 + i * 300;
      r.appendChild(el(`<div class="it" data-ts="${ts}" style="position:absolute;left:190px;right:190px;top:${y}px;height:230px;border-radius:32px;
        background:rgba(12,17,27,.9);border:1.5px solid #222C3D;display:flex;align-items:center;gap:40px;padding:0 50px;opacity:0;box-shadow:0 20px 60px rgba(0,0,0,.5)">
        <svg width="140" height="140" viewBox="0 0 140 140">${ICON[ic]}</svg>
        <div style="font-size:52px;font-weight:700">${lbl}</div>
        <svg class="x" width="700" height="230" viewBox="0 0 700 230" style="position:absolute;left:0;top:0;overflow:visible">
          <path d="M40 200L660 30" stroke="#168BFF" stroke-width="9" stroke-linecap="round" fill="none" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg></div>`));
    });
  },
  update(r, lt, t) {
    // low cinematic pass over the city: "no cameras, no sensors…"
    G3.setMap({ x: 520, y: 640, z: 1.6, pitch: 24 + lt * 2, yaw: 30 - lt * 7 });
    G3.set({ opacity: .6 * fadeIO(t, this.s, this.e, .25, .25), cars: 1, bloom: .9 });
    r.querySelectorAll('.it').forEach(it => {
      const ts = +it.dataset.ts;
      const k = ease.out(prog(t, ts - .05, ts + .4));
      it.style.opacity = k * (1 - .45 * prog(t, ts + .9, ts + 1.3));
      it.style.transform = `perspective(1400px) rotateY(${(1 - k) * -35}deg) translateX(${(1 - k) * -60}px)`;
      it.querySelector('.x path').setAttribute('stroke-dashoffset', 1 - ease.inOut(prog(t, ts + .45, ts + .85)));
    });
  },
};

// ───────────────────────── D. "طيب، كيف يعرف؟" (11.33 – 12.85) — held by the pause ─────────────────────────
const sceneQuestion = {
  s: 11.33, e: 12.85, fi: .12, fo: .2,
  focus: lt => ({ x: 540, y: 860, r: 700, a: .2 + .08 * Math.sin(lt * 6) }),
  build(r) {
    r.appendChild(el(`<div style="position:absolute;left:60px;right:60px;top:690px;text-align:center">
      <div class="k kicker" style="font-size:44px;color:${C.gray}">طيب،</div>
      <div class="h headline" style="font-size:150px;margin-top:10px">كيف <span class="hl">يعرف</span>؟</div></div>`));
  },
  update(r, lt, t) {
    const k1 = ease.out(prog(t, 11.36, 11.65)), k2 = ease.out(prog(t, 11.72, 12.1));
    r.querySelector('.k').style.opacity = k1;
    const h = r.querySelector('.h');
    h.style.opacity = k2; h.style.transform = `scale(${lerp(1.12, 1, k2) + .05 * prog(t, 12.1, 12.85)})`; h.style.filter = `blur(${(1 - k2) * 10}px)`;
  },
};

// ───────────────────────── E. The 3D city story (12.72 – 56.15) ─────────────────────────
function camAt(t) {
  const you = WORLD.carPos(WORLD.you, t).p;
  const zc = zoneMid();
  const lockP = WORLD.carPos(WORLD.you, 24.85).p;
  // [time, x, y, zoom, followWeight, pitch, yaw]
  const K = [
    [12.77, 0, 0, 2.7, 1, 64, 0], [14.2, 0, 0, 2.4, 1, 60, -8], [15.9, 540, 760, 1.0, 0, 50, -18], [20.85, 540, 760, 1.05, 0, 55, -6],
    [21.6, 0, 0, 1.9, 1, 66, 0], [23.2, 0, 0, 1.9, 1, 68, 4], [23.8, lockP[0], lockP[1], 2.0, 0, 80, 0], [28.55, lockP[0], lockP[1], 2.0, 0, 80, 0],
    [29.3, zc[0], zc[1] + 40, 1.35, 0, 60, -10], [33.4, zc[0], zc[1] + 40, 1.4, 0, 58, -14], [34.3, zc[0], zc[1] + 20, 1.3, 0, 50, -24], [39.3, zc[0], zc[1] + 20, 1.5, 0, 46, -36],
    [40.0, zc[0], zc[1], 1.6, 0, 62, -20], [41.9, zc[0], zc[1], 1.66, 0, 64, -16], [42.6, zc[0], zc[1] + 60, 1.2, 0, 56, -8], [52.4, zc[0], zc[1] + 60, 1.2, 0, 56, 4],
    [53.4, 540, 740, 1.0, 0, 46, 10], [57, 540, 740, .95, 0, 44, 18],
  ];
  let i = 0; while (i < K.length - 2 && t > K[i + 1][0]) i++;
  const a = K[i], b = K[i + 1], k = ease.inOut(prog(t, a[0], b[0]));
  const pa = [lerp(a[1], you[0], a[4]), lerp(a[2], you[1], a[4])];
  const pb = [lerp(b[1], you[0], b[4]), lerp(b[2], you[1], b[4])];
  return { x: lerp(pa[0], pb[0], k), y: lerp(pa[1], pb[1], k), z: lerp(a[3], b[3], k), pitch: lerp(a[5], b[5], k), yaw: lerp(a[6], b[6], k) };
}

const NODE = [540, 330];
function drawNodeLinks(ctx, t, picks, k, fromZoneOnly) {
  if (k <= 0) return;
  ctx.save();
  for (let i = 0; i < WORLD.cars.length; i += picks) {
    const c = WORLD.cars[i];
    const { u, p } = WORLD.carPos(c, t);
    if (fromZoneOnly && (u < WORLD.ZONE[0] || u > WORLD.ZONE[1])) continue;
    const [x, y] = G3.project(p, 5);
    if (y < 420 || y > 1260 || x < 0 || x > W) continue;
    const ph = (i * .137) % 1;
    const vis = clamp(k * 1.6 - ph * .6);
    if (vis <= 0) continue;
    ctx.strokeStyle = `rgba(89,199,255,${.18 * vis})`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(NODE[0], NODE[1] + 40); ctx.stroke();
    const q = (t * .9 + ph) % 1;     // packet travelling phone -> server
    ctx.fillStyle = `rgba(244,247,251,${.95 * vis})`;
    ctx.beginPath(); ctx.arc(lerp(x, NODE[0], q), lerp(y, NODE[1] + 40, q), 3.5, 0, 7); ctx.fill();
  }
  ctx.restore();
}

const sceneMap = {
  s: 12.72, e: VOICE_END + .05, fi: .15, fo: .25,
  focus: () => ({ x: 540, y: 820, r: 900, a: .08 }),
  build(r) {
    r.appendChild(el(`<div class="shade" style="position:absolute;inset:0;background:rgba(8,11,18,1);opacity:0"></div>`));
    r.appendChild(fullCanvas());
    r.appendChild(el(`<div class="youTag label" style="opacity:0">جوالك</div>`));
    r.appendChild(el(`<div class="node" style="position:absolute;left:${NODE[0] - 190}px;top:${NODE[1] - 50}px;width:380px;height:100px;border-radius:24px;
      background:rgba(14,19,30,.92);border:2px solid ${C.blue};display:flex;align-items:center;justify-content:center;gap:18px;opacity:0;direction:ltr;box-shadow:0 0 50px rgba(22,139,255,.25)">
      <svg width="46" height="46" viewBox="0 0 46 46"><rect x="6" y="6" width="34" height="12" rx="3" stroke="#59C7FF" stroke-width="2.6" fill="none"/><rect x="6" y="26" width="34" height="12" rx="3" stroke="#59C7FF" stroke-width="2.6" fill="none"/><circle cx="13" cy="12" r="2" fill="#59C7FF"/><circle cx="13" cy="32" r="2" fill="#59C7FF"/></svg>
      <div class="latin" style="font-family:PlexLatin;font-weight:700;font-size:40px">Google Maps</div></div>`));
    r.appendChild(el(`<div class="gps latin" style="position:absolute;left:390px;width:300px;top:420px;text-align:center;font-family:PlexLatin;font-weight:700;font-size:56px;letter-spacing:12px;color:${C.ink};opacity:0;padding:10px 0 10px 12px;border-radius:20px;background:rgba(8,11,18,.88);border:1.5px solid ${C.blue}">GPS</div>`));
    for (let i = 0; i < 3; i++) r.appendChild(el(`<div class="bc label c" data-i="${i}" style="opacity:0;font-size:30px;padding:6px 16px">${['١', '٢', '٣'][i]}</div>`));
    r.appendChild(el(`<div class="formula" style="position:absolute;left:110px;right:110px;top:300px;padding:30px 36px;border-radius:28px;background:rgba(14,19,30,.92);border:1.5px solid #2A3446;text-align:center;opacity:0">
      <div style="font-size:34px;color:${C.gray}">النظام يحسبها كذا</div>
      <div style="font-size:60px;font-weight:700;margin-top:10px"><span class="hl">السرعة</span> = المسافة ÷ الزمن</div></div>`));
    r.appendChild(el(`<div class="one label" style="opacity:0;font-size:32px">جوال واحد</div>`));
    r.appendChild(el(`<div class="neq" style="position:absolute;left:0;right:0;top:330px;text-align:center;opacity:0">
      <div class="headline" style="font-size:84px;text-shadow:0 4px 30px rgba(0,0,0,.8)">جوال واحد <span class="hl">≠</span> زحمة</div></div>`));
    r.appendChild(el(`<svg class="scan" width="1080" height="1920" style="position:absolute;inset:0;opacity:0"><g fill="none" stroke="#59C7FF" stroke-width="5" stroke-linecap="round"></g><line class="sl" stroke="#59C7FF" stroke-width="3" opacity=".8"/></svg>`));
    r.appendChild(el(`<div class="odd label c" style="opacity:0;font-size:38px;font-weight:700">شيء غريب!</div>`));
    r.appendChild(el(`<div class="bars" style="position:absolute;left:80px;right:80px;top:300px;padding:44px 48px;border-radius:32px;background:rgba(10,14,22,.94);border:1.5px solid #2A3446;opacity:0">
      <div style="font-size:36px;color:${C.gray}">مقارنة سرعة الجوالات على هذا الطريق</div>
      <div style="margin-top:40px;font-size:42px;font-weight:500">السرعة المعتادة</div>
      <div style="margin-top:16px;height:44px;border-radius:22px;background:#151C2A;overflow:hidden"><div class="b1" style="height:100%;width:0;border-radius:22px;background:linear-gradient(270deg,#A7B1C2,#6E7A8E)"></div></div>
      <div style="margin-top:40px;font-size:42px;font-weight:500">السرعة الآن</div>
      <div style="margin-top:16px;height:44px;border-radius:22px;background:#151C2A;overflow:hidden"><div class="b2" style="height:100%;width:0;border-radius:22px;background:linear-gradient(270deg,#59C7FF,#168BFF)"></div></div>
      <div class="slow" style="margin-top:36px;font-size:56px;font-weight:700;opacity:0">أبطأ <span class="hl">بكثير</span> من الطبيعي</div></div>`));
    r.appendChild(el(`<div class="jamTag" style="position:absolute;opacity:0;padding:16px 34px;border-radius:20px;background:${C.blue};color:${C.ink};font-size:54px;font-weight:700;box-shadow:0 10px 40px rgba(22,139,255,.45)">زحمة</div>`));
  },
  update(r, lt, t) {
    const cam = camAt(t);
    G3.setMap(cam);
    const ctx = r.querySelector('canvas').getContext('2d');
    ctx.clearRect(0, 0, W, H);
    const youP = WORLD.carPos(WORLD.you, t).p;
    const youS = G3.project(youP, 6);

    // the city dims behind the speed comparison panel
    const dim = 1 - .62 * (prog(t, 45.95, 46.4) - prog(t, 52.2, 52.7));
    const reveal = lerp(0, 1500, ease.inOut(prog(t, 14.45, 15.9)));
    const oneBeat = prog(t, 28.7, 29.1) - prog(t, 33.3, 33.7);
    const alphaFn = p => clamp((reveal - Math.hypot(p[0] - youP[0], p[1] - youP[1])) / 120) * (1 - .8 * oneBeat);
    const youK = t < 28.75 ? (1 - prog(t, 28.3, 28.75)) : 0;

    // single slow phone (28.7 – 33.7)
    let one = null;
    const oneEl = r.querySelector('.one');
    if (oneBeat > 0) {
      const p = WORLD.at((WORLD.ZONE[0] + WORLD.ZONE[1]) / 2 - 70 + 14 * (t - 28.7), 20);
      one = { p, k: oneBeat };
      const [x, y] = G3.project(p, 6);
      oneEl.style.opacity = oneBeat; oneEl.style.left = (x + 40) + 'px'; oneEl.style.top = (y - 30) + 'px';
    } else oneEl.style.opacity = 0;
    const neq = r.querySelector('.neq'), kq = ease.out(prog(t, 32.7, 33.05)) * (1 - prog(t, 33.5, 33.8));
    neq.style.opacity = kq; neq.style.transform = `translateY(${(1 - kq) * 20}px)`;

    // GPS position marks
    const marks = [23.85, 24.85, 25.85];
    const ek = 1 - prog(t, 28.3, 28.7);
    const mk3 = marks.map(tm => ({ p: WORLD.carPos(WORLD.you, tm).p, k: ease.out(prog(t, tm, tm + .3)) * ek }));

    G3.set({ opacity: 1, cars: 1, alphaFn, youK, hideYou: true, one, marks: mk3, jam: ease.out(prog(t, 52.7, 53.7)), bloom: .95 });
    r.querySelector('.shade').style.opacity = 1 - dim;

    const yt = r.querySelector('.youTag');
    const yk = ease.out(prog(t, 12.85, 13.2)) * (1 - prog(t, 14.2, 14.5));
    yt.style.opacity = yk; yt.style.left = (youS[0] + 46) + 'px'; yt.style.top = (youS[1] - 34) + 'px';

    // phones -> Google Maps (data over the mobile network)
    const node = r.querySelector('.node');
    const nk = Math.max(ease.out(prog(t, 18.1, 18.6)) * (1 - prog(t, 20.6, 21.0)), ease.out(prog(t, 42.2, 42.7)) * (1 - prog(t, 45.5, 45.9)));
    node.style.opacity = nk; node.style.transform = `scale(${.92 + .08 * nk})`;
    drawNodeLinks(ctx, t, 3, ease.out(prog(t, 18.2, 19.2)) * (1 - prog(t, 20.5, 20.9)), false);
    drawNodeLinks(ctx, t, 1, ease.out(prog(t, 42.25, 43.2)) * (1 - prog(t, 45.4, 45.8)), true);

    // GPS — satellites broadcast, the phone only receives
    const gk = ease.out(prog(t, 21.3, 21.9)) * (1 - prog(t, 23.45, 23.8));
    r.querySelector('.gps').style.opacity = ease.out(prog(t, 22.55, 22.9)) * gk;
    if (gk > 0) {
      [[200, 330], [540, 260], [880, 330]].forEach(([sx, sy], i) => {
        const yo = (1 - ease.out(prog(t, 21.3 + i * .12, 21.9 + i * .12))) * -120;
        drawSatellite(ctx, sx, sy + yo, .9, Math.sin(t + i) * .08 - .3 + i * .3);
        ctx.save(); ctx.globalAlpha = gk;
        ctx.setLineDash([6, 14]); ctx.lineDashOffset = -t * 60;
        ctx.strokeStyle = 'rgba(89,199,255,.6)'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(sx, sy + yo + 30); ctx.lineTo(youS[0], youS[1]); ctx.stroke(); ctx.setLineDash([]);
        for (let j = 0; j < 3; j++) {
          const q = ((t * .8 + j / 3 + i * .21) % 1);
          ctx.fillStyle = C.cyan; ctx.beginPath(); ctx.arc(lerp(sx, youS[0], q), lerp(sy + yo + 30, youS[1], q), 4.5, 0, 7); ctx.fill();
        }
        ctx.restore();
      });
    }

    // position labels + dashed path + formula
    let prev = null;
    r.querySelectorAll('.bc').forEach((b, i) => {
      const m = mk3[i], p = G3.project(m.p, 4);
      b.style.opacity = m.k; b.style.left = (p[0] + 30) + 'px'; b.style.top = (p[1] - 28) + 'px';
      if (m.k > 0 && prev) {
        ctx.save(); ctx.globalAlpha = m.k; ctx.strokeStyle = C.cyan; ctx.lineWidth = 3; ctx.setLineDash([8, 8]);
        ctx.beginPath(); ctx.moveTo(...prev); ctx.lineTo(...p); ctx.stroke(); ctx.restore();
      }
      prev = p;
    });
    const fm = r.querySelector('.formula'), fk = ease.out(prog(t, 26.0, 26.45)) * ek;
    fm.style.opacity = fk; fm.style.transform = `translateY(${(1 - fk) * -24}px)`;

    // the system notices something odd
    const sk = ease.out(prog(t, 39.65, 40.2)) * (1 - prog(t, 41.9, 42.3));
    const scan = r.querySelector('.scan'); scan.style.opacity = sk;
    const odd = r.querySelector('.odd');
    if (sk > 0) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (let u = WORLD.ZONE[0]; u <= WORLD.ZONE[1]; u += 10) {
        const [x, y] = G3.project(WORLD.at(u), 4); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
      const pad = 60 + 20 * (1 - ease.out(prog(t, 39.65, 40.3)));
      x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
      const c = 46;
      scan.querySelector('g').innerHTML =
        `<path d="M${x0} ${y0 + c}V${y0}H${x0 + c}M${x1 - c} ${y0}H${x1}V${y0 + c}M${x1} ${y1 - c}V${y1}H${x1 - c}M${x0 + c} ${y1}H${x0}V${y1 - c}"/>`;
      const sy = lerp(y0, y1, (Math.sin((t - 39.65) * 2.2 - Math.PI / 2) + 1) / 2);
      const sl = scan.querySelector('.sl'); sl.setAttribute('x1', x0); sl.setAttribute('x2', x1); sl.setAttribute('y1', sy); sl.setAttribute('y2', sy);
      odd.style.opacity = ease.out(prog(t, 41.05, 41.4)) * sk; odd.style.left = (x0) + 'px'; odd.style.top = (y0 - 80) + 'px';
    } else odd.style.opacity = 0;

    // compare to normal speed
    const bars = r.querySelector('.bars');
    const bk = ease.out(prog(t, 46.0, 46.45)) * (1 - prog(t, 52.2, 52.6));
    bars.style.opacity = bk; bars.style.transform = `perspective(1400px) rotateX(${(1 - bk) * 25}deg) translateY(${(1 - bk) * 30}px)`;
    bars.querySelector('.b1').style.width = (ease.inOut(prog(t, 47.3, 48.0)) * 100) + '%';
    bars.querySelector('.b2').style.width = (lerp(0, 100, ease.inOut(prog(t, 47.6, 48.2))) - 82 * ease.inOut(prog(t, 49.7, 50.5))) + '%';
    bars.querySelector('.slow').style.opacity = ease.out(prog(t, 50.38, 50.75));

    // conclusion — the jam label
    const jt = r.querySelector('.jamTag');
    const jk = ease.back(prog(t, 54.7, 55.1));
    const zc = G3.project(zoneMid(), 4);
    jt.style.opacity = clamp(jk); jt.style.left = (zc[0] + 70) + 'px'; jt.style.top = (zc[1] - 120) + 'px';
    jt.style.transform = `scale(${.6 + .4 * jk})`;
  },
};

const outro = outroScene(56.1, 58.6);
const outroUpdate = outro.update;
outro.update = function (r, lt, t) {
  G3.setMap({ x: 540, y: 740, z: .9, pitch: 40 - lt * 2, yaw: 20 + lt * 8 });
  G3.set({ opacity: .32 * (1 - prog(t, 58.0, 58.6)), cars: 1, bloom: .8 });
  outroUpdate.call(this, r, lt, t);
};

window.TL = {
  voiceEnd: VOICE_END,
  // video time -> story time through the pause-tightening warp (WARP knots: [story, video])
  remap: tv => {
    let i = 0; while (i < WARP.length - 2 && tv > WARP[i + 1][1]) i++;
    const [s0, v0] = WARP[i], [s1, v1] = WARP[i + 1];
    if (tv >= v1) return s1 + (tv - v1);
    return s0 + (tv - v0) * (s1 - s0) / ((v1 - v0) || 1);
  },
  bug: t => (t < 2.7 ? 0 : 1) * (1 - prog(t, 55.9, 56.2)),
  subs: SUBS.filter(s => !(s.s >= 11.3 && s.e <= 12.8)),
  scenes: [sceneHighway, scenePhone, sceneNoSources, sceneQuestion, sceneMap, outro],
};
