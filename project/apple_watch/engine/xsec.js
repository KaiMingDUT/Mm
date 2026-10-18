// KROZO — magnified wrist cross-section (2D canvas, deterministic): watch cutaway on top, skin layers, a blood vessel
// that swells with every beat, and light "photons" travelling from the LEDs into the tissue and back to the sensors.
// Everything is a pure function of time; the timeline passes the pulse, the light mode and a camera (x, y, zoom).
const XS = (() => {
  const W = 1080, H = 1920;
  const SK = 862;                     // skin surface
  const EP = 908;                     // epidermis → dermis
  const VY = 1300, VR = 42;           // vessel centre / resting radius
  const FT = 1372;                    // fat starts
  const LED = [468, 612], PD = [318, 762];
  const G = '59,255,138';             // LED green (the only green in the film: it is the real colour of the light)
  const rng = seed => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
  const dome = x => { const d = (x - 540) / 250; return Math.abs(d) < 1 ? 846 + 18 * Math.sqrt(1 - d * d) : 846; };   // sensor dome underside
  const skinY = x => Math.max(SK, dome(x) + 2);

  // ───────── static tissue (drawn once) ─────────
  const base = document.createElement('canvas'); base.width = W; base.height = H;
  {
    const g = base.getContext('2d'), r = rng(7);
    // dermis
    let gr = g.createLinearGradient(0, EP, 0, FT); gr.addColorStop(0, '#13233f'); gr.addColorStop(1, '#0c1830'); g.fillStyle = gr; g.fillRect(0, EP, W, FT - EP);
    // collagen fibres (wavy cyan threads)
    g.lineWidth = 2;
    for (let i = 0; i < 90; i++) { const y0 = EP + 20 + r() * (FT - EP - 40), x0 = r() * W, L = 120 + r() * 200, a = (r() - .5) * .5; g.strokeStyle = `rgba(89,199,255,${.05 + r() * .07})`; g.beginPath();
      for (let k = 0; k <= 20; k++) { const u = k / 20, x = x0 + Math.cos(a) * L * u, y = y0 + Math.sin(a) * L * u + Math.sin(u * 12 + i) * 5; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
    // fat (subcutaneous): packed cells
    gr = g.createLinearGradient(0, FT, 0, H); gr.addColorStop(0, '#0d1a31'); gr.addColorStop(1, '#070d1a'); g.fillStyle = gr; g.fillRect(0, FT, W, H - FT);
    const cells = [];
    for (let k = 0; k < 2600 && cells.length < 230; k++) { const x = r() * W, y = FT + 18 + r() * (H - FT), rad = 28 + r() * 34; if (cells.every(c => Math.hypot(c[0] - x, c[1] - y) > c[2] + rad - 4)) cells.push([x, y, rad]); }
    for (const [x, y, rad] of cells) { const cg = g.createRadialGradient(x - rad * .3, y - rad * .3, 2, x, y, rad); cg.addColorStop(0, '#1d3357'); cg.addColorStop(1, '#0e1b33'); g.fillStyle = cg; g.beginPath(); g.arc(x, y, rad - 3, 0, 7); g.fill(); g.strokeStyle = 'rgba(89,199,255,.22)'; g.lineWidth = 2.5; g.stroke(); }
    // fat boundary
    g.strokeStyle = 'rgba(89,199,255,.18)'; g.lineWidth = 3; g.beginPath(); for (let x = 0; x <= W; x += 10) { const y = FT + Math.sin(x / 70) * 6; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    // epidermis (pressed in by the sensor dome)
    g.fillStyle = '#2a4266'; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 6) g.lineTo(x, skinY(x)); g.lineTo(W, EP); for (let x = W; x >= 0; x -= 6) g.lineTo(x, EP + Math.sin(x / 38) * 5 + (skinY(x) - SK) * .7); g.closePath(); g.fill();
    // basal wave line + skin surface highlight
    g.strokeStyle = 'rgba(167,177,194,.35)'; g.lineWidth = 2; g.beginPath(); for (let x = 0; x <= W; x += 6) { const y = EP + Math.sin(x / 38) * 5 + (skinY(x) - SK) * .7; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    g.strokeStyle = 'rgba(244,247,251,.55)'; g.lineWidth = 3; g.beginPath(); for (let x = 0; x <= W; x += 6) x ? g.lineTo(x, skinY(x)) : g.moveTo(x, skinY(x)); g.stroke();
    // skin cells texture in the epidermis
    for (let i = 0; i < 260; i++) { const x = r() * W, y = skinY(x) + 6 + r() * (EP - SK - 8); g.fillStyle = `rgba(167,177,194,${.06 + r() * .08})`; g.beginPath(); g.ellipse(x, y, 9 + r() * 6, 4, 0, 0, 7); g.fill(); }
    // above the skin: nothing (the watch is drawn live); keep transparent
    g.clearRect(0, 0, W, 0);
  }
  // capillary loops in the dermis (they swell a little too)
  const CAP = []; { const r = rng(21); for (let i = 0; i < 16; i++) CAP.push({ x: 40 + i * 66 + r() * 30, y: EP + 70 + r() * 220, w: 18 + r() * 16, h: 40 + r() * 50, ph: r() }); }
  // red blood cells in the vessel
  const RBC = []; { const r = rng(5); for (let i = 0; i < 46; i++) RBC.push({ x: r() * (W + 200) - 100, dy: (r() - .5) * 1.5, s: .8 + r() * .5, a: r() * 6.28, sp: .8 + r() * .5 }); }

  // ───────── photon paths (LED → zigzag into the tissue → back up to a photodiode) ─────────
  // depth decides the fate: deep paths reach the vessel and can be absorbed there (more blood → more absorbed).
  function mkPath(r, x0, x1, depth, steps = 7) {
    const pts = [[x0, dome(x0) + 4]], xm = (x0 + x1) / 2;
    for (let k = 1; k < steps; k++) {
      const u = k / steps, x = x0 + (x1 - x0) * u + (r() - .5) * 90, y = dome(x0) + depth * Math.sin(Math.PI * u) * (.75 + r() * .45) + (k % 2 ? -18 : 18);
      pts.push([x, Math.max(SK + 10, y)]);
    }
    pts.push([x1, dome(x1) + 4]);
    let L = 0; const acc = [0]; for (let i = 1; i < pts.length; i++) { L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); acc.push(L); }
    return { pts, acc, L, depth: Math.max(...pts.map(p => p[1])) };
  }
  const PATHS = { g: [], r: [], b: [] };
  {
    const r = rng(11);
    for (let i = 0; i < 28; i++) { const li = i % 2, x0 = LED[li], x1 = PD[li] + (r() - .5) * 30; PATHS.g.push(Object.assign(mkPath(r, x0, x1, 120 + r() * 420), { per: 1.25 + r() * .5, ph: r() * 3 })); }
    for (let i = 0; i < 12; i++) { const x0 = 540, x1 = 540 + (i % 2 ? 1 : -1) * (120 + r() * 120); PATHS.r.push(Object.assign(mkPath(r, x0, x1, 520 + r() * 300, 8), { per: 1.3 + r() * .4, ph: r() * 3 })); }
    for (let i = 0; i < 12; i++) { const x0 = 540, x1 = 540 + (i % 2 ? 1 : -1) * (40 + r() * 60); PATHS.b.push(Object.assign(mkPath(r, x0, x1, 20 + r() * 40, 4), { per: 1.1 + r() * .4, ph: r() * 3 })); }
  }
  const at = (P, d) => { let i = 1; while (i < P.acc.length - 1 && P.acc[i] < d) i++; const k = (d - P.acc[i - 1]) / ((P.acc[i] - P.acc[i - 1]) || 1); return [P.pts[i - 1][0] + (P.pts[i][0] - P.pts[i - 1][0]) * k, P.pts[i - 1][1] + (P.pts[i][1] - P.pts[i - 1][1]) * k]; };
  // first distance along the path where it enters the vessel (y ≥ top of the vessel)
  function hitD(P, top) { for (let i = 1; i < P.pts.length; i++) { const [x0, y0] = P.pts[i - 1], [x1, y1] = P.pts[i]; if (y1 >= top && y0 < top) { const k = (top - y0) / (y1 - y0); return P.acc[i - 1] + (P.acc[i] - P.acc[i - 1]) * k; } } return -1; }

  // ───────── watch cutaway (section view) ─────────
  function drawWatch(g, o) {
    g.save();
    // case section (hatched aluminium)
    const x0 = 120, x1 = 960, y0 = 548, y1 = 826;
    const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
    rr(x0, y0, x1 - x0, y1 - y0, 70); g.fillStyle = '#20252e'; g.fill();
    g.save(); rr(x0, y0, x1 - x0, y1 - y0, 70); g.clip(); g.strokeStyle = 'rgba(167,177,194,.22)'; g.lineWidth = 3; for (let x = x0 - 300; x < x1; x += 16) { g.beginPath(); g.moveTo(x, y1); g.lineTo(x + 300, y0); g.stroke(); } g.restore();
    rr(x0, y0, x1 - x0, y1 - y0, 70); g.strokeStyle = 'rgba(167,177,194,.7)'; g.lineWidth = 3; g.stroke();
    // inner cavity
    rr(x0 + 34, y0 + 40, x1 - x0 - 68, y1 - y0 - 74, 40); g.fillStyle = '#0b0f16'; g.fill();
    // display + glass on top
    rr(x0 + 10, y0 - 22, x1 - x0 - 20, 44, 22); g.fillStyle = '#05070a'; g.fill(); g.strokeStyle = 'rgba(89,199,255,.55)'; g.lineWidth = 2.5; g.stroke();
    g.fillStyle = 'rgba(244,247,251,.12)'; g.fillRect(x0 + 60, y0 - 16, 340, 6);
    // battery, logic board, taptic engine
    rr(x0 + 60, y0 + 60, 360, 86, 18); g.fillStyle = '#3a4252'; g.fill(); g.fillStyle = '#A7B1C2'; g.font = '700 30px PlexLatin'; g.textAlign = 'center'; g.fillText('Li-ion', x0 + 240, y0 + 113);
    rr(x0 + 450, y0 + 64, 300, 70, 10); g.fillStyle = '#0d2747'; g.fill(); for (let i = 0; i < 5; i++) { g.fillStyle = '#0b0e14'; g.fillRect(x0 + 470 + i * 56, y0 + 80, 40, 36); }
    g.fillStyle = '#168BFF'; for (let i = 0; i < 6; i++) g.fillRect(x0 + 470 + i * 46, y0 + 140, 30, 8);
    // flex to the sensor
    g.strokeStyle = 'rgba(89,199,255,.55)'; g.lineWidth = 4; g.beginPath(); g.moveTo(x0 + 700, y0 + 134); g.bezierCurveTo(x0 + 700, y0 + 200, 640, 760, 600, 790); g.stroke();
    // crown on the right
    rr(x1 - 6, y0 + 70, 46, 100, 12); g.fillStyle = '#2a2f38'; g.fill(); g.strokeStyle = 'rgba(167,177,194,.6)'; g.lineWidth = 2; g.stroke();
    for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(167,177,194,.3)'; g.fillRect(x1 + 2 + i * 4.5, y0 + 74, 2, 92); }
    // sensor dome (dark glass, Fresnel ridges) — underside follows dome(x)
    g.beginPath(); g.moveTo(290, 800); for (let x = 290; x <= 790; x += 5) g.lineTo(x, dome(x)); g.lineTo(790, 800); g.closePath();
    const dg = g.createLinearGradient(0, 790, 0, 866); dg.addColorStop(0, '#1a2230'); dg.addColorStop(1, '#0a0e15'); g.fillStyle = dg; g.fill();
    g.strokeStyle = 'rgba(167,177,194,.5)'; g.lineWidth = 2.5; g.stroke();
    g.strokeStyle = 'rgba(167,177,194,.12)'; g.lineWidth = 2; for (let x = 300; x < 790; x += 14) { g.beginPath(); g.moveTo(x, 804); g.lineTo(x, dome(x) - 3); g.stroke(); }
    // photodiodes (cyan-gray windows) and LEDs (green emitters)
    for (const [i, x] of PD.entries()) { const hit = o.pdHit ? o.pdHit[i] : 0; rr(x - 34, dome(x) - 20, 68, 16, 4); g.fillStyle = `rgba(${Math.round(30 + 60 * hit)},${Math.round(50 + 150 * hit)},${Math.round(70 + 185 * hit)},1)`; g.fill(); g.strokeStyle = 'rgba(89,199,255,.8)'; g.lineWidth = 2; g.stroke(); }
    const la = o.ledA ?? 1, lc = o.ledCol || G;
    for (const x of (o.ledX || LED)) { rr(x - 22, dome(x) - 18, 44, 14, 4); g.fillStyle = la > .05 ? `rgba(${lc},${.35 + .65 * la})` : '#1c2a22'; g.fill();
      if (la > .05) { g.globalCompositeOperation = 'lighter'; const rg = g.createRadialGradient(x, dome(x), 0, x, dome(x), 90); rg.addColorStop(0, `rgba(${lc},${.55 * la})`); rg.addColorStop(1, `rgba(${lc},0)`); g.fillStyle = rg; g.fillRect(x - 90, dome(x) - 90, 180, 180); g.globalCompositeOperation = 'source-over'; } }
    g.restore();
  }

  // ───────── one frame ─────────
  // o: { t, pulse (0..1 vessel swell), cam:{x,y,s}, rays:{g,r,b} amounts, ledA, watch(bool), absorbK, flowSpeed, pdHit }
  function draw(g, o) {
    const t = o.t, c = o.cam || { x: 540, y: 1100, s: 1 };
    g.save(); g.clearRect(0, 0, W, H);
    g.fillStyle = '#080B12'; g.fillRect(0, 0, W, H);
    g.translate(540, 1100); g.scale(c.s, c.s); g.translate(-c.x, -c.y);
    g.drawImage(base, 0, 0);
    const sw = o.pulse ?? 0, vr = VR * (1 + .42 * sw), top = VY - vr;
    // capillary loops
    for (const k of CAP) { const s = 1 + .35 * sw; g.strokeStyle = `rgba(140,34,52,${.55 + .3 * sw})`; g.lineWidth = 6 * s; g.beginPath(); g.moveTo(k.x - k.w / 2, k.y + k.h); g.bezierCurveTo(k.x - k.w / 2, k.y - k.h * .2, k.x + k.w / 2, k.y - k.h * .2, k.x + k.w / 2, k.y + k.h); g.stroke(); }
    // vessel: wall glow + blood + RBCs
    const vg = g.createLinearGradient(0, VY - vr, 0, VY + vr); vg.addColorStop(0, '#5a1324'); vg.addColorStop(.5, '#8c2234'); vg.addColorStop(1, '#4a0f1e');
    g.fillStyle = vg; g.fillRect(-200, VY - vr, W + 400, vr * 2);
    g.save(); g.beginPath(); g.rect(-200, VY - vr, W + 400, vr * 2); g.clip();
    const flow = o.flow ?? (t * 150);
    for (const b of RBC) { const x = ((b.x + flow * b.sp) % (W + 200) + W + 200) % (W + 200) - 100, y = VY + b.dy * vr * .55, rs = 17 * b.s;
      g.save(); g.translate(x, y); g.rotate(b.a + t * .5); g.fillStyle = '#b8344a'; g.beginPath(); g.ellipse(0, 0, rs, rs * .62, 0, 0, 7); g.fill(); g.fillStyle = '#7d1c2f'; g.beginPath(); g.ellipse(0, 0, rs * .45, rs * .26, 0, 0, 7); g.fill(); g.restore(); }
    g.restore();
    g.strokeStyle = 'rgba(244,247,251,.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-200, VY - vr); g.lineTo(W + 200, VY - vr); g.moveTo(-200, VY + vr); g.lineTo(W + 200, VY + vr); g.stroke();
    if (o.vesselGlow) { g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(89,199,255,${.12 * o.vesselGlow})`; g.fillRect(-200, VY - vr - 10, W + 400, vr * 2 + 20); g.globalCompositeOperation = 'source-over'; }
    // photons
    const pdHit = [0, 0];
    g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
    for (const kind of ['b', 'r', 'g']) {
      const amt = o.rays?.[kind] ?? 0; if (amt <= 0) continue;
      const col = kind === 'g' ? G : kind === 'r' ? '255,84,96' : '80,140,255';
      const list = PATHS[kind]; const nShow = Math.round(list.length * Math.min(1, amt));
      for (let i = 0; i < nShow; i++) {
        const P = list[i], D = P.per * .85, age = ((t - P.ph) % P.per + P.per) % P.per; if (age > D + .35) continue;
        const cyc = Math.floor((t - P.ph) / P.per); if ((t - age) < (o.from ?? -1e9)) continue;
        // fate: green absorbed at the vessel (prob grows with swelling), blue dies in the top layer, red passes
        let endD = P.L, absorbed = false;
        if (kind === 'g') { const hd = hitD(P, top); const pr = (o.absorbK ?? .45) + .45 * sw; const hash = Math.abs(Math.sin(i * 12.9898 + cyc * 78.233) * 43758.5453) % 1; if (hd > 0 && hash < pr) { endD = hd; absorbed = true; } }
        if (kind === 'b') { endD = P.L * .45; absorbed = true; }
        const v = P.L / D, head = Math.min(endD, age * v), tail = Math.max(0, head - 260);
        const fade = absorbed ? 1 - Math.max(0, (age * v - endD) / (v * .25)) : 1 - Math.max(0, (age - D) / .35);
        if (fade <= 0) continue;
        // trail
        g.strokeStyle = `rgba(${col},${.35 * amt * fade})`; g.lineWidth = 9; g.beginPath(); for (let d = tail; d <= head; d += 12) { const [x, y] = at(P, d); d === tail ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke();
        g.strokeStyle = `rgba(${col},${.9 * amt * fade})`; g.lineWidth = 3.5; g.stroke();
        const [hx, hy] = at(P, head); const rg = g.createRadialGradient(hx, hy, 0, hx, hy, 26); rg.addColorStop(0, `rgba(255,255,255,${.9 * amt * fade})`); rg.addColorStop(.3, `rgba(${col},${.7 * amt * fade})`); rg.addColorStop(1, `rgba(${col},0)`); g.fillStyle = rg; g.fillRect(hx - 26, hy - 26, 52, 52);
        if (absorbed && age * v >= endD) { const k = Math.min(1, (age * v - endD) / (v * .25)); g.strokeStyle = `rgba(${kind === 'b' ? '80,140,255' : '255,120,140'},${(1 - k) * .9 * amt})`; g.lineWidth = 3; g.beginPath(); g.arc(hx, hy, 8 + 30 * k, 0, 7); g.stroke(); }
        if (!absorbed && kind === 'g' && age * v >= P.L - 5) { const pi = Math.abs(P.pts[P.pts.length - 1][0] - PD[0]) < Math.abs(P.pts[P.pts.length - 1][0] - PD[1]) ? 0 : 1; pdHit[pi] = Math.max(pdHit[pi], fade); }
      }
    }
    g.globalCompositeOperation = 'source-over';
    if (o.watch !== false) drawWatch(g, { ledA: o.ledA ?? (o.rays?.g ? 1 : 0), pdHit, ledX: o.ledX, ledCol: o.ledCol });
    g.restore();
    return pdHit;
  }
  // map a point in section space to the screen for a camera
  const pt = (x, y, c = { x: 540, y: 1100, s: 1 }) => [540 + (x - c.x) * c.s, 1100 + (y - c.y) * c.s];
  return { draw, pt, SK, EP, VY, VR, FT, LED, PD, dome };
})();
