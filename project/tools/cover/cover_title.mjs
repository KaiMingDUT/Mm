// KROZO cover title — the fixed layout approved by the client (Apple Watch cover).
//
//   node cover_title.mjs BG.png OUT.png "line 1" "line 2" "box text"
//
// line 1 : white, top 8.8 % → 17.4 % of height
// line 2 : cyan gradient, 18.3 % → 25.9 %
// box    : framed pill, 26.4 % → 32.6 %, inset 8 % left/right; wrap words in
//          [brackets] to colour them cyan, e.g. "بدون ما [تشوف] داخل جسمك؟"
// Every line is shrunk to fit 84 % of the width, never moved.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const { chromium } = createRequire(import.meta.url)('playwright');
const [bg, out, l1, l2, box] = process.argv.slice(2);
const here = path.dirname(new URL(import.meta.url).pathname);
const font = fs.readFileSync(path.join(here, 'Alexandria.ttf')).toString('base64');
const img = fs.readFileSync(bg).toString('base64');

const html = `<html><body style="margin:0;background:#000"><canvas id=c width=1080 height=1920></canvas>
<style>@font-face{font-family:A;src:url(data:font/ttf;base64,${font})}</style></body></html>`;

const draw = async ({ img, l1, l2, box }) => {
  await document.fonts.load('900 100px A');
  const W = 1080, H = 1920, c = document.getElementById('c'), x = c.getContext('2d');
  const im = new Image(); im.src = 'data:image/png;base64,' + img; await im.decode();
  x.drawImage(im, 0, 0, W, H);
  // darken the title zone so the text always reads, like the reference
  const g = x.createLinearGradient(0, 0, 0, H * .42);
  g.addColorStop(0, 'rgba(2,6,16,.78)'); g.addColorStop(.7, 'rgba(2,6,16,.45)'); g.addColorStop(1, 'rgba(2,6,16,0)');
  x.fillStyle = g; x.fillRect(0, 0, W, H * .42);
  x.direction = 'rtl'; x.textAlign = 'center'; x.textBaseline = 'alphabetic';

  // size font so the ink fits w×h; return metrics
  const fit = (t, w, h, wt) => {
    let s = 300, m;
    for (; s > 10; s -= 2) {
      x.font = `${wt} ${s}px A`; m = x.measureText(t);
      if (m.width <= w && m.actualBoundingBoxAscent + m.actualBoundingBoxDescent <= h) break;
    }
    return { s, m };
  };
  const line = (t, top, h, fill, glow) => {
    const { s, m } = fit(t, W * .84, h, 900);
    x.font = `900 ${s}px A`;
    const y = top + m.actualBoundingBoxAscent;
    x.save(); x.shadowColor = glow; x.shadowBlur = 34; x.fillStyle = fill; x.fillText(t, W / 2, y); x.restore();
    x.save(); x.shadowColor = 'rgba(0,0,0,.65)'; x.shadowBlur = 10; x.shadowOffsetY = 5; x.fillStyle = fill; x.fillText(t, W / 2, y); x.restore();
  };

  line(l1, H * .088, H * .086, '#FFFFFF', 'rgba(140,200,255,.35)');
  const cg = x.createLinearGradient(0, H * .183, 0, H * .259);
  cg.addColorStop(0, '#8FF3FF'); cg.addColorStop(.55, '#2FD2FF'); cg.addColorStop(1, '#1A9BFF');
  line(l2, H * .183, H * .076, cg, 'rgba(40,190,255,.75)');

  // framed box
  const bx = W * .08, by = H * .264, bw = W * .84, bh = H * .062, r = 18;
  const rr = () => { x.beginPath(); x.roundRect(bx, by, bw, bh, r); };
  x.save(); rr(); x.fillStyle = 'rgba(4,14,32,.82)'; x.fill(); x.restore();
  x.save(); rr(); x.shadowColor = '#22C8FF'; x.shadowBlur = 26; x.lineWidth = 3; x.strokeStyle = '#3FD0FF'; x.stroke(); x.restore();
  x.save(); x.beginPath(); x.roundRect(bx + 9, by + 9, bw - 18, bh - 18, r - 6); x.lineWidth = 1.2; x.strokeStyle = 'rgba(120,220,255,.35)'; x.stroke(); x.restore();
  const parts = box.split(/(\[[^\]]+\])/).filter(Boolean).map(p => p[0] === '[' ? [p.slice(1, -1), '#3FD6FF'] : [p, '#FFFFFF']);
  const plain = parts.map(p => p[0]).join('');
  const { s, m } = fit(plain, bw * .9, bh * .68, 800);
  x.font = `800 ${s}px A`;
  const y = by + bh / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  // RTL: lay segments right→left; joining across segment edges is fine because breaks fall on spaces
  let cx = W / 2 + m.width / 2;
  x.textAlign = 'right';
  for (const [t, col] of parts) {
    x.save(); x.fillStyle = col; if (col !== '#FFFFFF') { x.shadowColor = 'rgba(40,190,255,.8)'; x.shadowBlur = 16; }
    x.fillText(t, cx, y); x.restore();
    cx -= x.measureText(t).width;
  }
  return c.toDataURL('image/png').split(',')[1];
};

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(html);
const png = await p.evaluate(draw, { img, l1, l2, box });
fs.writeFileSync(out, Buffer.from(png, 'base64'));
await b.close();
