// KROZO — "كيف يعرف Google Maps إن فيه زحمة؟"  Timeline built on the measured narration timing.
const VOICE_END = 56.11;
const fullCanvas = () => el('<canvas width="1080" height="1920" style="position:absolute;inset:0"></canvas>');

// ───────────────────────── A. Highway POV (0 – 2.70) ─────────────────────────
const sceneHighway = {
  s: 0, e: 2.78, fi: .01, fo: .12,
  focus: () => ({ x: 540, y: 700, r: 900, a: .14 }),
  build(r) {
    r.appendChild(fullCanvas());
    r.appendChild(el(`<div class="hook" style="position:absolute;left:80px;right:80px;top:250px;text-align:center">
      <div class="kicker" style="color:${C.gray};font-size:32px">في دقيقة</div>
      <div class="headline" style="font-size:76px;margin-top:14px">كيف يعرف <span class="latin hl">Google Maps</span><br>إن فيه زحمة؟</div></div>`));
  },
  update(r, lt, t) {
    const ctx = r.querySelector('canvas').getContext('2d');
    ctx.clearRect(0, 0, W, H);
    const hz = 860, vx = 540 + Math.sin(t * .9) * 10;           // horizon & vanishing point
    // sky haze
    const g = ctx.createLinearGradient(0, hz - 400, 0, hz + 20);
    g.addColorStop(0, 'rgba(22,139,255,0)'); g.addColorStop(1, 'rgba(22,139,255,.10)');
    ctx.fillStyle = g; ctx.fillRect(0, hz - 400, W, 420);
    // road surface
    ctx.fillStyle = '#0D121C';
    ctx.beginPath(); ctx.moveTo(vx - 6, hz); ctx.lineTo(vx + 6, hz); ctx.lineTo(1500, H); ctx.lineTo(-420, H); ctx.closePath(); ctx.fill();
    // edges
    ctx.strokeStyle = 'rgba(167,177,194,.55)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(vx - 6, hz); ctx.lineTo(-420, H); ctx.moveTo(vx + 6, hz); ctx.lineTo(1500, H); ctx.stroke();
    // lane dashes moving toward camera (perspective z)
    const speed = 2.2;
    for (const lane of [-1 / 3, 1 / 3]) {
      for (let i = 0; i < 14; i++) {
        let z = ((i / 14) - (t * speed % 1) / 14 + 1) % 1;          // 0 near .. 1 far
        const z0 = z, z1 = z + .025;
        const pr = zz => { const k = Math.pow(1 - zz, 2.6); return [vx + lane * 1920 * k * .5, hz + (H - hz) * k]; };
        const [x0, y0] = pr(z0), [x1, y1] = pr(z1);
        ctx.strokeStyle = `rgba(244,247,251,${.75 * (1 - z)})`; ctx.lineWidth = 2 + 16 * Math.pow(1 - z, 2.6);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
    }
    // street lights passing
    for (let i = 0; i < 6; i++) {
      const z = ((i / 6) - (t * .55 % 1) / 6 + 1) % 1, k = Math.pow(1 - z, 2.4);
      for (const side of [-1, 1]) {
        const x = vx + side * (60 + 1500 * k), yb = hz + (H - hz) * k * .9, top = yb - 1100 * k - 20;
        ctx.strokeStyle = `rgba(167,177,194,${.5 * (1 - z)})`; ctx.lineWidth = 1 + 9 * k;
        ctx.beginPath(); ctx.moveTo(x, yb); ctx.lineTo(x, top); ctx.lineTo(x - side * 140 * k, top); ctx.stroke();
        const lg = ctx.createRadialGradient(x - side * 140 * k, top + 6, 0, x - side * 140 * k, top + 6, 160 * k + 8);
        lg.addColorStop(0, `rgba(244,247,251,${.9 * (1 - z)})`); lg.addColorStop(.15, `rgba(89,199,255,${.35 * (1 - z)})`); lg.addColorStop(1, 'rgba(22,139,255,0)');
        ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(x - side * 140 * k, top + 6, 160 * k + 8, 0, 7); ctx.fill();
      }
    }
    // hook title: in, then out right before the phone arrives
    const h = r.querySelector('.hook');
    const k = ease.out(prog(lt, .05, .6));
    h.style.opacity = k * (1 - prog(lt, 2.45, 2.75));
    h.style.transform = `translateY(${(1 - k) * 24}px)`;
  },
};

// ───────────────────────── B. Phone + map (2.70 – 7.72) ─────────────────────────
const PH = { w: 500, h: 1000, x: 290, y: 230 };
const scenePhone = {
  s: 2.70, e: 7.78, fi: .08, fo: .3,
  focus: lt => ({ x: 540, y: 720, r: 800, a: .12 + .06 * prog(lt, 3.6, 4.2) }),
  build(r) {
    r.appendChild(el(`<div class="ph" style="position:absolute;left:${PH.x}px;top:${PH.y}px;width:${PH.w}px;height:${PH.h}px;border-radius:64px;
      background:#0B0F18;border:3px solid #2A3446;box-shadow:0 40px 120px rgba(0,0,0,.6),0 0 0 10px #121826,0 0 60px rgba(22,139,255,.18);overflow:hidden">
      <canvas width="${PH.w}" height="${PH.h}" style="position:absolute;inset:0"></canvas>
      <div style="position:absolute;left:28px;right:28px;top:56px;height:62px;border-radius:31px;background:rgba(20,27,40,.95);border:1.5px solid #2A3446;display:flex;align-items:center;gap:14px;padding:0 22px;direction:ltr">
        <svg width="26" height="26" viewBox="0 0 26 26"><circle cx="11" cy="11" r="8" stroke="#A7B1C2" stroke-width="2.6" fill="none"/><path d="M17 17l6 6" stroke="#A7B1C2" stroke-width="2.6" stroke-linecap="round"/></svg>
        <div style="height:10px;width:160px;border-radius:5px;background:#2A3446"></div></div>
      <div class="tag label" style="left:0;top:0;opacity:0;font-size:36px;font-weight:700;border-color:${C.blue};color:${C.ink}">زحمة</div>
      <div style="position:absolute;left:50%;top:14px;width:120px;height:30px;margin-left:-60px;border-radius:16px;background:#000"></div>
    </div>`));
    r.appendChild(el(`<div class="cap" style="position:absolute;left:0;right:0;top:1270px;text-align:center;opacity:0"></div>`));
  },
  update(r, lt, t) {
    const ph = r.querySelector('.ph');
    const k = ease.back(prog(t, 2.78, 3.5));
    ph.style.transform = `perspective(1800px) translateY(${(1 - k) * 1100}px) rotateX(${(1 - ease.out(prog(t, 2.78, 3.9))) * 28}deg) scale(${1 + .03 * prog(t, 3.5, 7.7)})`;
    const ctx = ph.querySelector('canvas').getContext('2d');
    ctx.clearRect(0, 0, PH.w, PH.h);
    ctx.fillStyle = '#0B0F18'; ctx.fillRect(0, 0, PH.w, PH.h);
    // mini map = same world, scaled into the phone screen
    const cam = { x: 560, y: 760, z: .78, sy: PH.h / 2 + 40 };
    ctx.save(); ctx.translate(PH.w / 2 - 540, 0);
    drawMapBase(ctx, cam);
    // route line along the highway
    ctx.save(); camApply(ctx, cam);
    drawRoadPath(ctx, 120, WORLD.L - 80); ctx.strokeStyle = 'rgba(89,199,255,.85)'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.stroke();
    ctx.restore();
    // congestion appears at "إنه الطريق زحمة"
    const j = ease.out(prog(t, 6.31, 6.9));
    drawJamOverlay(ctx, cam, j, t);
    // you (navigation puck)
    const yp = toScreen(cam, WORLD.at(200, 0));
    ctx.fillStyle = 'rgba(22,139,255,.25)'; ctx.beginPath(); ctx.arc(yp[0], yp[1], 24, 0, 7); ctx.fill();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(yp[0], yp[1], 12, 0, 7); ctx.fill();
    ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(yp[0], yp[1], 7, 0, 7); ctx.fill();
    ctx.restore();
    const zc = toScreen(cam, WORLD.at((WORLD.ZONE[0] + WORLD.ZONE[1]) / 2, 0));
    const tag = ph.querySelector('.tag');
    tag.style.opacity = j; tag.style.left = (zc[0] + (PH.w / 2 - 540) + 50) + 'px'; tag.style.top = (zc[1] - 34) + 'px';
    tag.style.transform = `scale(${.85 + .15 * ease.back(prog(t, 6.4, 6.9))})`;
  },
};

// ─────────────────── C. No cameras / sensors / reports (7.72 – 14.35) ───────────────────
const sceneNoSources = {
  s: 7.72, e: 14.37, fi: .3, fo: .25,
  focus: () => ({ x: 540, y: 760, r: 820, a: .10 }),
  build(r) {
    r.appendChild(fullCanvas());
    const items = [['camera', 'كاميرات', 9.52], ['sensor', 'حساسات', 11.39], ['report', 'بلاغ عن حادث', 12.77]];
    items.forEach(([ic, lbl, ts], i) => {
      const y = 330 + i * 300;
      r.appendChild(el(`<div class="it" data-ts="${ts}" style="position:absolute;left:190px;right:190px;top:${y}px;height:230px;border-radius:32px;
        background:rgba(14,19,30,.88);border:1.5px solid #222C3D;display:flex;align-items:center;gap:40px;padding:0 50px;opacity:0">
        <svg width="140" height="140" viewBox="0 0 140 140">${ICON[ic]}</svg>
        <div style="font-size:52px;font-weight:700">${lbl}</div>
        <svg class="x" width="700" height="230" viewBox="0 0 700 230" style="position:absolute;left:0;top:0;overflow:visible">
          <path d="M40 200L660 30" stroke="#168BFF" stroke-width="9" stroke-linecap="round" fill="none" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg></div>`));
    });
  },
  update(r, lt, t) {
    const ctx = r.querySelector('canvas').getContext('2d');
    ctx.clearRect(0, 0, W, H);
    const cam = { x: 540, y: 740, z: 1.0 };
    ctx.globalAlpha = .45; drawMapBase(ctx, cam); ctx.globalAlpha = 1;
    r.querySelectorAll('.it').forEach(it => {
      const ts = +it.dataset.ts;
      const k = ease.out(prog(t, ts - .05, ts + .4));
      it.style.opacity = k * (1 - .45 * prog(t, ts + .9, ts + 1.3));
      it.style.transform = `translateX(${(1 - k) * -60}px)`;
      it.querySelector('.x path').setAttribute('stroke-dashoffset', 1 - ease.inOut(prog(t, ts + .45, ts + .85)));
    });
  },
};

// ───────────────────────── D. "طيب، كيف يعرف؟" (14.35 – 16.95) ─────────────────────────
const sceneQuestion = {
  s: 14.35, e: 16.97, fi: .15, fo: .25,
  focus: lt => ({ x: 540, y: 860, r: 700, a: .2 }),
  build(r) {
    r.appendChild(el(`<div style="position:absolute;left:60px;right:60px;top:690px;text-align:center">
      <div class="k kicker" style="font-size:44px;color:${C.gray}">طيب،</div>
      <div class="h headline" style="font-size:150px;margin-top:10px">كيف <span class="hl">يعرف</span>؟</div></div>`));
  },
  update(r, lt, t) {
    const k1 = ease.out(prog(t, 14.4, 14.8)), k2 = ease.out(prog(t, 15.0, 15.5));
    r.querySelector('.k').style.opacity = k1;
    const h = r.querySelector('.h');
    h.style.opacity = k2; h.style.transform = `scale(${lerp(1.12, 1, k2) + .02 * prog(t, 15.5, 17)})`; h.style.filter = `blur(${(1 - k2) * 10}px)`;
  },
};

// ───────────────────────── E. The map story (16.95 – 56.15) ─────────────────────────
function camAt(t) {
  const you = WORLD.carPos(WORLD.you, t).p;
  const zc = WORLD.at((WORLD.ZONE[0] + WORLD.ZONE[1]) / 2, 0);
  const lockP = WORLD.carPos(WORLD.you, 27.4).p;
  // keyframes: [time, x, y, z, followWeight]
  const K = [
    [16.95, 0, 0, 2.7, 1], [17.9, 0, 0, 2.5, 1], [19.6, 540, 760, 1.0, 0], [23.45, 540, 760, 1.0, 0],
    [24.4, 0, 0, 1.9, 1], [25.7, 0, 0, 1.9, 1], [26.4, lockP[0], lockP[1], 1.75, 0], [31.2, lockP[0], lockP[1], 1.75, 0],
    [32.0, zc[0], zc[1] + 40, 1.35, 0], [36.2, zc[0], zc[1] + 40, 1.35, 0], [37.2, zc[0], zc[1] + 20, 1.2, 0], [41.8, zc[0], zc[1] + 20, 1.32, 0],
    [42.6, zc[0], zc[1], 1.6, 0], [45.6, zc[0], zc[1], 1.66, 0], [46.4, zc[0], zc[1] + 60, 1.2, 0], [52.4, zc[0], zc[1] + 60, 1.2, 0],
    [53.4, 540, 740, 1.0, 0], [57, 540, 740, .96, 0],
  ];
  let i = 0; while (i < K.length - 2 && t > K[i + 1][0]) i++;
  const a = K[i], b = K[i + 1], k = ease.inOut(prog(t, a[0], b[0]));
  const pa = [lerp(a[1], you[0], a[4]), lerp(a[2], you[1], a[4])];
  const pb = [lerp(b[1], you[0], b[4]), lerp(b[2], you[1], b[4])];
  return { x: lerp(pa[0], pb[0], k), y: lerp(pa[1], pb[1], k), z: lerp(a[3], b[3], k) };
}

const NODE = [540, 330];
function drawNodeLinks(ctx, cam, t, picks, k, fromZoneOnly) {
  if (k <= 0) return;
  ctx.save();
  let n = 0;
  for (let i = 0; i < WORLD.cars.length; i += picks) {
    const c = WORLD.cars[i];
    const { u, p } = WORLD.carPos(c, t);
    if (fromZoneOnly && (u < WORLD.ZONE[0] || u > WORLD.ZONE[1])) continue;
    const [x, y] = toScreen(cam, p);
    if (y < 420 || y > 1260 || x < 0 || x > W) continue;
    const ph = (i * .137) % 1;
    const vis = clamp(k * 1.6 - ph * .6);
    if (vis <= 0) continue;
    ctx.strokeStyle = `rgba(89,199,255,${.16 * vis})`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(NODE[0], NODE[1] + 40); ctx.stroke();
    const q = (t * .9 + ph) % 1;     // packet travelling phone -> server
    ctx.fillStyle = `rgba(244,247,251,${.9 * vis})`;
    ctx.beginPath(); ctx.arc(lerp(x, NODE[0], q), lerp(y, NODE[1] + 40, q), 3.5, 0, 7); ctx.fill();
    n++;
  }
  ctx.restore();
}

const sceneMap = {
  s: 16.95, e: VOICE_END + .05, fi: .2, fo: .25,
  focus: (lt, t) => ({ x: 540, y: 820, r: 900, a: .08 }),
  build(r) {
    r.appendChild(fullCanvas());
    // DOM overlays
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
      <div class="headline" style="font-size:84px">جوال واحد <span class="hl">≠</span> زحمة</div></div>`));
    r.appendChild(el(`<svg class="scan" width="1080" height="1920" style="position:absolute;inset:0;opacity:0"><g fill="none" stroke="#59C7FF" stroke-width="5" stroke-linecap="round"></g><line class="sl" stroke="#59C7FF" stroke-width="3" opacity=".8"/></svg>`));
    r.appendChild(el(`<div class="odd label c" style="opacity:0;font-size:38px;font-weight:700">شيء غريب!</div>`));
    r.appendChild(el(`<div class="bars" style="position:absolute;left:80px;right:80px;top:300px;padding:44px 48px;border-radius:32px;background:rgba(10,14,22,.94);border:1.5px solid #2A3446;opacity:0">
      <div style="font-size:36px;color:${C.gray}">مقارنة سرعة الجوالات على هذا الطريق</div>
      <div style="margin-top:40px;font-size:42px;font-weight:500">السرعة المعتادة</div>
      <div style="margin-top:16px;height:44px;border-radius:22px;background:#151C2A;overflow:hidden"><div class="b1" style="height:100%;width:0;border-radius:22px;margin-right:0;background:linear-gradient(270deg,#A7B1C2,#6E7A8E)"></div></div>
      <div style="margin-top:40px;font-size:42px;font-weight:500">السرعة الآن</div>
      <div style="margin-top:16px;height:44px;border-radius:22px;background:#151C2A;overflow:hidden"><div class="b2" style="height:100%;width:0;border-radius:22px;background:linear-gradient(270deg,#59C7FF,#168BFF)"></div></div>
      <div class="slow" style="margin-top:36px;font-size:56px;font-weight:700;opacity:0">أبطأ <span class="hl">بكثير</span> من الطبيعي</div></div>`));
    r.appendChild(el(`<div class="jamTag" style="position:absolute;opacity:0;padding:16px 34px;border-radius:20px;background:${C.blue};color:${C.ink};font-size:54px;font-weight:700;box-shadow:0 10px 40px rgba(22,139,255,.45)">زحمة</div>`));
  },
  update(r, lt, t) {
    const ctx = r.querySelector('canvas').getContext('2d');
    ctx.clearRect(0, 0, W, H);
    const cam = camAt(t);
    const youP = WORLD.carPos(WORLD.you, t).p;
    const youS = toScreen(cam, youP);
    // map dims behind the speed comparison
    const dim = 1 - .7 * (prog(t, 48.9, 49.4) - prog(t, 52.3, 52.8));
    ctx.globalAlpha = dim; drawMapBase(ctx, cam); ctx.globalAlpha = 1;

    // jam layer: detected at the end ("وهنا يقدر يستنتج إن فيه زحمة")
    drawJamOverlay(ctx, cam, ease.out(prog(t, 52.75, 53.8)) * dim, t);

    // who is visible: reveal radius (E2), dimming for the "one phone" beat (E6)
    const reveal = lerp(0, 1500, ease.inOut(prog(t, 18.15, 19.6)));
    const oneBeat = prog(t, 31.3, 31.7) - prog(t, 35.9, 36.4);
    const alphaFn = p => {
      const d = Math.hypot(p[0] - youP[0], p[1] - youP[1]);
      return clamp((reveal - d) / 120) * (1 - .8 * oneBeat);
    };
    drawCars(ctx, cam, t, { alphaFn, r: 5.5, dim, hideYou: true });

    // single slow phone (31.3 – 36.3): moves slowly while others keep flowing
    const one = r.querySelector('.one');
    if (oneBeat > 0) {
      const u = (WORLD.ZONE[0] + WORLD.ZONE[1]) / 2 - 70 + 14 * (t - 31.3);
      const p = WORLD.at(u, 20), [x, y] = toScreen(cam, p);
      ctx.save(); ctx.globalAlpha = oneBeat;
      ctx.fillStyle = 'rgba(22,139,255,.3)'; ctx.beginPath(); ctx.arc(x, y, 26, 0, 7); ctx.fill();
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(x, y, 10, 0, 7); ctx.fill();
      ctx.restore();
      one.style.opacity = oneBeat; one.style.left = (x + 40) + 'px'; one.style.top = (y - 30) + 'px';
    } else one.style.opacity = 0;
    const neq = r.querySelector('.neq'), kq = ease.out(prog(t, 34.85, 35.3)) * (1 - prog(t, 35.95, 36.3));
    neq.style.opacity = kq; neq.style.transform = `translateY(${(1 - kq) * 20}px)`;

    // you
    const youK = (1 - prog(t, 19.0, 19.6) * .0) * (1 - prog(t, 30.9, 31.4)) + prog(t, 31.4, 31.5) * 0;
    if (t < 31.4) drawYou(ctx, cam, t, youK);
    const yt = r.querySelector('.youTag');
    const yk = ease.out(prog(t, 17.05, 17.4)) * (1 - prog(t, 18.0, 18.3));
    yt.style.opacity = yk; yt.style.left = (youS[0] + 46) + 'px'; yt.style.top = (youS[1] - 34) + 'px';

    // E3 / E9: phones -> Google Maps (data over the network)
    const node = r.querySelector('.node');
    const nk = Math.max(ease.out(prog(t, 20.9, 21.5)) * (1 - prog(t, 23.3, 23.7)), ease.out(prog(t, 45.95, 46.5)) * (1 - prog(t, 48.8, 49.2)));
    node.style.opacity = nk; node.style.transform = `scale(${.92 + .08 * nk})`;
    drawNodeLinks(ctx, cam, t, 3, ease.out(prog(t, 21.0, 22.0)) * (1 - prog(t, 23.2, 23.6)), false);
    drawNodeLinks(ctx, cam, t, 1, ease.out(prog(t, 46.0, 47.0)) * (1 - prog(t, 48.7, 49.1)), true);

    // E4: GPS — satellites broadcast, phone only receives
    const gk = ease.out(prog(t, 23.7, 24.3)) * (1 - prog(t, 25.7, 26.1));
    r.querySelector('.gps').style.opacity = gk;
    if (gk > 0) {
      const sats = [[200, 330], [540, 260], [880, 330], [370, 560]];
      sats.slice(0, 3).forEach(([sx, sy], i) => {
        const yo = (1 - ease.out(prog(t, 23.7 + i * .12, 24.3 + i * .12))) * -120;
        drawSatellite(ctx, sx, sy + yo, .9, Math.sin(t + i) * .08 - .3 + i * .3);
        // signal travelling DOWN to the phone (one direction)
        ctx.save(); ctx.globalAlpha = gk;
        ctx.setLineDash([6, 14]); ctx.lineDashOffset = -t * 60;
        ctx.strokeStyle = 'rgba(89,199,255,.55)'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(sx, sy + yo + 30); ctx.lineTo(youS[0], youS[1]); ctx.stroke(); ctx.setLineDash([]);
        for (let j = 0; j < 3; j++) {
          const q = ((t * .8 + j / 3 + i * .21) % 1);
          ctx.fillStyle = C.cyan; ctx.beginPath(); ctx.arc(lerp(sx, youS[0], q), lerp(sy + yo + 30, youS[1], q), 4.5, 0, 7); ctx.fill();
        }
        ctx.restore();
      });
    }

    // E5: positions over time -> speed
    const marks = [25.95, 27.0, 28.05];
    const ek = 1 - prog(t, 30.9, 31.3);
    let prev = null;
    r.querySelectorAll('.bc').forEach((b, i) => {
      const tm = marks[i], k = ease.out(prog(t, tm, tm + .3)) * ek;
      const p = toScreen(cam, WORLD.carPos(WORLD.you, tm).p);
      b.style.opacity = k; b.style.left = (p[0] + 34) + 'px'; b.style.top = (p[1] - 28) + 'px';
      if (k > 0) {
        ctx.save(); ctx.globalAlpha = k;
        ctx.strokeStyle = C.cyan; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p[0], p[1], 15, 0, 7); ctx.stroke();
        ctx.fillStyle = C.cyan; ctx.beginPath(); ctx.arc(p[0], p[1], 5, 0, 7); ctx.fill();
        if (prev) { ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(...prev); ctx.lineTo(...p); ctx.stroke(); ctx.setLineDash([]); }
        ctx.restore();
      }
      prev = p;
    });
    const fm = r.querySelector('.formula'), fk = ease.out(prog(t, 28.75, 29.25)) * ek;
    fm.style.opacity = fk; fm.style.transform = `translateY(${(1 - fk) * -24}px)`;

    // E8: the system notices something odd — scan brackets around the slow zone
    const sk = ease.out(prog(t, 42.25, 42.8)) * (1 - prog(t, 45.6, 46.0));
    const scan = r.querySelector('.scan'); scan.style.opacity = sk;
    const odd = r.querySelector('.odd');
    if (sk > 0) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (let u = WORLD.ZONE[0]; u <= WORLD.ZONE[1]; u += 10) {
        const [x, y] = toScreen(cam, WORLD.at(u)); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
      const pad = 60 + 20 * (1 - ease.out(prog(t, 42.25, 42.9)));
      x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
      const c = 46;
      scan.querySelector('g').innerHTML =
        `<path d="M${x0} ${y0 + c}V${y0}H${x0 + c}M${x1 - c} ${y0}H${x1}V${y0 + c}M${x1} ${y1 - c}V${y1}H${x1 - c}M${x0 + c} ${y1}H${x0}V${y1 - c}"/>`;
      const sy = lerp(y0, y1, (Math.sin((t - 42.25) * 2.2 - Math.PI / 2) + 1) / 2);
      const sl = scan.querySelector('.sl'); sl.setAttribute('x1', x0); sl.setAttribute('x2', x1); sl.setAttribute('y1', sy); sl.setAttribute('y2', sy);
      const ok = ease.out(prog(t, 43.85, 44.3)) * sk;
      odd.style.opacity = ok; odd.style.left = (x0) + 'px'; odd.style.top = (y0 - 80) + 'px';
    } else odd.style.opacity = 0;

    // E10: compare to normal speed
    const bars = r.querySelector('.bars');
    const bk = ease.out(prog(t, 48.95, 49.4)) * (1 - prog(t, 52.3, 52.7));
    bars.style.opacity = bk; bars.style.transform = `translateY(${(1 - bk) * 30}px)`;
    bars.querySelector('.b1').style.width = (ease.inOut(prog(t, 49.3, 50.0)) * 100) + '%';
    bars.querySelector('.b2').style.width = (lerp(0, 100, ease.inOut(prog(t, 49.6, 50.2))) - 82 * ease.inOut(prog(t, 50.45, 51.3))) + '%';
    bars.querySelector('.slow').style.opacity = ease.out(prog(t, 51.2, 51.6));

    // E11: conclusion — the jam label
    const jt = r.querySelector('.jamTag');
    const jk = ease.back(prog(t, 54.55, 55.0));
    const zc = toScreen(cam, WORLD.at((WORLD.ZONE[0] + WORLD.ZONE[1]) / 2, 0));
    jt.style.opacity = clamp(jk); jt.style.left = (zc[0] + 70) + 'px'; jt.style.top = (zc[1] - 120) + 'px';
    jt.style.transform = `scale(${.6 + .4 * jk})`;
  },
};

window.TL = {
  voiceEnd: VOICE_END,
  bug: t => (t < 2.7 ? 0 : 1) * (1 - prog(t, 55.9, 56.2)),
  subs: SUBS.filter(s => !(s.s >= 14.3 && s.e <= 16.95)),
  scenes: [sceneHighway, scenePhone, sceneNoSources, sceneQuestion, sceneMap, outroScene(56.1, 58.6)],
};
