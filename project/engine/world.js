// Shared top-down "map world": highway geometry, deterministic traffic, drawing helpers.
const WORLD = (() => {
  // Highway centreline: cubic Bezier in world px
  const P = [[790, 1400], [840, 930], [220, 760], [320, 90]];
  const N = 600, pts = [], cum = [0];
  for (let i = 0; i <= N; i++) {
    const k = i / N, a = 1 - k;
    pts.push([
      a * a * a * P[0][0] + 3 * a * a * k * P[1][0] + 3 * a * k * k * P[2][0] + k * k * k * P[3][0],
      a * a * a * P[0][1] + 3 * a * a * k * P[1][1] + 3 * a * k * k * P[2][1] + k * k * k * P[3][1],
    ]);
    if (i) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const L = cum[N];
  function at(u, off = 0) {
    u = clamp(u, 0, L);
    let lo = 0, hi = N;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < u) lo = m; else hi = m; }
    const k = (u - cum[lo]) / ((cum[hi] - cum[lo]) || 1);
    const x = lerp(pts[lo][0], pts[hi][0], k), y = lerp(pts[lo][1], pts[hi][1], k);
    const dx = pts[hi][0] - pts[lo][0], dy = pts[hi][1] - pts[lo][1], d = Math.hypot(dx, dy) || 1;
    return [x - dy / d * off, y + dx / d * off, Math.atan2(dy, dx)];
  }
  const LANES = [-20, 0, 20];
  const ZONE = [0.44 * L, 0.66 * L];          // where the slowdown happens (u-space)

  // Deterministic pseudo random
  const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  // Side streets (static map context) + their own light traffic
  const streets = [];
  for (let i = 0; i < 9; i++) {
    const y = 120 + i * 150 + rnd(i) * 60, tilt = (rnd(i + 20) - .5) * 160;
    streets.push([[-100, y - tilt], [1180, y + tilt]]);
  }
  for (let i = 0; i < 6; i++) {
    const x = 60 + i * 200 + rnd(i + 40) * 60, tilt = (rnd(i + 60) - .5) * 120;
    streets.push([[x - tilt, -100], [x + tilt, 1500]]);
  }

  // Sim time: slow motion during the GPS / speed explanation
  const RATE_DT = 1 / 120, rateTable = [0];
  const rate = t => 1 - 0.45 * (prog(t, 21.0, 21.6) - prog(t, 28.4, 29.0));
  for (let t = 0; t < 70; t += RATE_DT) rateTable.push(rateTable[rateTable.length - 1] + rate(t) * RATE_DT);
  const simT = t => { const i = Math.max(0, t) / RATE_DT, j = Math.floor(i); return lerp(rateTable[j], rateTable[j + 1] ?? rateTable[j], i - j); };

  const VFREE = 90;
  // jam strength over global time
  const jam = t => 0.8 * ease.inOut(prog(t, 37.6, 39.3));
  // density profile in u-space -> warp s(u); cars equally spaced in s.
  const bump = u => { const a = prog(u, ZONE[0] - 60, ZONE[0] + 40), b = 1 - prog(u, ZONE[1] - 40, ZONE[1] + 60); return Math.min(a, b); };
  const WN = 400;
  let warpC = -1, sTab = null;
  function buildWarp(c) {
    if (c === warpC) return;
    warpC = c; sTab = [0];
    for (let i = 1; i <= WN; i++) { const u = (i - .5) / WN * L; sTab.push(sTab[i - 1] + (1 + c * 4 * bump(u)) * L / WN); }
    const tot = sTab[WN]; for (let i = 0; i <= WN; i++) sTab[i] *= L / tot;
  }
  function uOfS(s) {
    let lo = 0, hi = WN;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (sTab[m] < s) lo = m; else hi = m; }
    return (lo + (s - sTab[lo]) / ((sTab[hi] - sTab[lo]) || 1)) / WN * L;
  }
  const cars = [];
  const PER_LANE = 58;
  LANES.forEach((off, li) => {
    for (let k = 0; k < PER_LANE; k++) cars.push({ lane: li, off, s0: (k + rnd(k * 3 + li) * .5) / PER_LANE * L, f: [1.0, 1.08, 0.93][li] });
  });
  // "you": a lane-1 car placed at u≈0.08L at t=17
  const you = cars[PER_LANE + 3];
  you.s0 = 0; // adjusted below so that it sits at 0.08L at t=17
  const youBase = 0.08 * L - you.f * VFREE * simT(12.77);
  you.s0 = ((youBase % L) + L) % L;

  function carPos(c, t) {
    const c_ = jam(t); buildWarp(Math.round(c_ * 200) / 200);
    let s = (c.s0 + c.f * VFREE * simT(t)) % L; if (s < 0) s += L;
    const u = uOfS(s);
    return { u, p: at(u, c.off) };
  }
  // instantaneous speed (u per second of real time) for streaks
  function carVel(c, t) {
    const a = carPos(c, t - 1 / 30).u, b = carPos(c, t).u;
    let d = b - a; if (d < -L / 2) d += L; return d * 30;
  }
  const sideCars = [];
  for (let i = 0; i < 64; i++) sideCars.push({ st: i % streets.length, k0: rnd(i + 90), v: 0.012 + rnd(i + 120) * 0.02, dir: rnd(i + 150) > .5 ? 1 : -1 });
  const sidePos = (c, t) => { const [a, b] = streets[c.st]; let k = (c.k0 + c.dir * c.v * simT(t)) % 1; if (k < 0) k += 1; return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]; };

  return { P, L, at, LANES, ZONE, streets, cars, you, sideCars, carPos, carVel, sidePos, jam, simT, VFREE, rnd };
})();

// Camera: world -> screen
function camApply(ctx, cam) { ctx.translate(540, cam.sy ?? 760); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y); }
function toScreen(cam, p) { return [(p[0] - cam.x) * cam.z + 540, (p[1] - cam.y) * cam.z + (cam.sy ?? 760)]; }

function drawRoadPath(ctx, u0, u1, off = 0) {
  ctx.beginPath();
  const step = 6;
  for (let u = u0; u <= u1; u += step) { const [x, y] = WORLD.at(u, off); u === u0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
  const [x, y] = WORLD.at(u1, off); ctx.lineTo(x, y);
}

function drawMapBase(ctx, cam, o = {}) {
  ctx.save(); camApply(ctx, cam);
  const a = o.alpha ?? 1;
  // blocks / streets
  ctx.lineCap = 'round';
  for (const [p, q] of WORLD.streets) {
    ctx.strokeStyle = `rgba(167,177,194,${0.09 * a})`; ctx.lineWidth = 16;
    ctx.beginPath(); ctx.moveTo(...p); ctx.lineTo(...q); ctx.stroke();
    ctx.strokeStyle = `rgba(8,11,18,${0.9 * a})`; ctx.lineWidth = 12; ctx.stroke();
    ctx.strokeStyle = `rgba(167,177,194,${0.05 * a})`; ctx.lineWidth = 1; ctx.stroke();
  }
  // highway
  drawRoadPath(ctx, 0, WORLD.L);
  ctx.strokeStyle = `rgba(167,177,194,${0.35 * a})`; ctx.lineWidth = 78; ctx.stroke();
  ctx.strokeStyle = `rgba(16,22,34,${a})`; ctx.lineWidth = 74; ctx.stroke();
  ctx.setLineDash([14, 22]); ctx.lineWidth = 1.6; ctx.strokeStyle = `rgba(167,177,194,${0.28 * a})`;
  for (const off of [-10, 10]) { drawRoadPath(ctx, 0, WORLD.L, off); ctx.stroke(); }
  ctx.setLineDash([]);
  ctx.restore();
}

function drawJamOverlay(ctx, cam, k, t) {
  if (k <= 0) return;
  ctx.save(); camApply(ctx, cam);
  const [a, b] = WORLD.ZONE;
  const pulse = .75 + .25 * Math.sin(t * 5);
  drawRoadPath(ctx, a, a + (b - a) * clamp(k * 1.2));
  ctx.lineCap = 'round';
  ctx.shadowColor = C.blue; ctx.shadowBlur = 40 * k;
  ctx.strokeStyle = `rgba(22,139,255,${0.55 * k * pulse})`; ctx.lineWidth = 86; ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = `rgba(22,139,255,${0.9 * k})`; ctx.lineWidth = 10; ctx.stroke();
  ctx.restore();
}

function drawCars(ctx, cam, t, o = {}) {
  const r = (o.r ?? 5.5);
  ctx.save(); camApply(ctx, cam);
  // side streets traffic
  for (const c of WORLD.sideCars) {
    const p = WORLD.sidePos(c, t);
    const al = (o.alphaFn ? o.alphaFn(p) : 1) * (o.sideAlpha ?? .55) * (o.dim ?? 1);
    if (al <= .01) continue;
    ctx.fillStyle = `rgba(89,199,255,${al})`;
    ctx.beginPath(); ctx.arc(p[0], p[1], r * .8, 0, 7); ctx.fill();
  }
  for (const c of WORLD.cars) {
    if (c === WORLD.you && o.hideYou) continue;
    const { u, p } = WORLD.carPos(c, t);
    if (u < 2 || u > WORLD.L - 2) continue;
    let al = (o.alphaFn ? o.alphaFn(p) : 1) * (o.dim ?? 1);
    if (al <= .01) continue;
    const v = WORLD.carVel(c, t);
    // streak behind the car, proportional to speed
    const tail = clamp(v * 0.16, 0, 40);
    if (tail > 2) {
      const q = WORLD.at(u - tail, c.off);
      const g = ctx.createLinearGradient(q[0], q[1], p[0], p[1]);
      g.addColorStop(0, 'rgba(89,199,255,0)'); g.addColorStop(1, `rgba(89,199,255,${.55 * al})`);
      ctx.strokeStyle = g; ctx.lineWidth = r * 1.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
    }
    ctx.fillStyle = `rgba(89,199,255,${al})`;
    ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 7); ctx.fill();
  }
  ctx.restore();
}

function drawYou(ctx, cam, t, k = 1, p = null) {
  if (k <= 0) return null;
  p = p || WORLD.carPos(WORLD.you, t).p;
  const [x, y] = toScreen(cam, p);
  const ring = (t * 1.1) % 1;
  ctx.save();
  ctx.globalAlpha = k;
  ctx.strokeStyle = `rgba(22,139,255,${1 - ring})`; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, 14 + ring * 46, 0, 7); ctx.stroke();
  ctx.fillStyle = 'rgba(22,139,255,.25)'; ctx.beginPath(); ctx.arc(x, y, 22, 0, 7); ctx.fill();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(x, y, 11, 0, 7); ctx.fill();
  ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(x, y, 6.5, 0, 7); ctx.fill();
  ctx.restore();
  return [x, y];
}

// small line icons (drawn in DOM as SVG)
const ICON = {
  camera: `<g fill="none" stroke="#F4F7FB" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><rect x="18" y="38" width="76" height="46" rx="8"/><path d="M94 52l26-12v40l-26-12"/><path d="M40 84v26M28 110h24"/><circle cx="40" cy="61" r="7" fill="#168BFF" stroke="none"/></g>`,
  sensor: `<g fill="none" stroke="#F4F7FB" stroke-width="5" stroke-linecap="round"><circle cx="70" cy="70" r="9" fill="#168BFF" stroke="none"/><path d="M50 50a28 28 0 0 0 0 40M90 50a28 28 0 0 1 0 40M36 36a48 48 0 0 0 0 68M104 36a48 48 0 0 1 0 68"/><path d="M70 82v38M54 120h32"/></g>`,
  report: `<g fill="none" stroke="#F4F7FB" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"><path d="M70 20L124 112H16Z"/><path d="M70 54v28"/><circle cx="70" cy="96" r="4" fill="#168BFF" stroke="none"/></g>`,
};

function drawSatellite(ctx, x, y, s, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.fillStyle = '#1A2233'; ctx.strokeStyle = C.gray; ctx.lineWidth = 2;
  for (const dx of [-62, 30]) {
    ctx.fillRect(dx, -12, 32, 24); ctx.strokeRect(dx, -12, 32, 24);
    ctx.beginPath(); for (let i = 1; i < 4; i++) { ctx.moveTo(dx + i * 8, -12); ctx.lineTo(dx + i * 8, 12); } ctx.strokeStyle = 'rgba(89,199,255,.5)'; ctx.stroke();
    ctx.strokeStyle = C.gray;
  }
  ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(30, 0); ctx.stroke();
  ctx.fillStyle = '#C9D2DE'; ctx.fillRect(-16, -18, 32, 36);
  ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(0, 24, 6, 0, 7); ctx.fill();
  ctx.restore();
}
