// usage: node render.mjs <engine dir> <out.mp4|stills dir> <fps> <start> <end> [--stills t1,t2,...]
import { createRequire } from 'module';
import { spawn } from 'child_process';
import path from 'path';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [dir, out, fps, t0, t1, flag, list] = process.argv.slice(2);
const port = 8700 + Math.floor(Math.random() * 200);
const srv = spawn('python3', ['-I', '-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', path.resolve(dir)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-accelerated-2d-canvas'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', e => { console.error('PAGE ERROR', e); process.exit(1); });
page.on('console', m => { if (m.type() === 'error') console.error('CONSOLE', m.text()); });
await page.goto(`http://127.0.0.1:${port}/index.html`);
await page.evaluate(() => window.ready());
await page.waitForTimeout(300);
try {
  if (flag === '--stills') {
    for (const t of list.split(',').map(Number)) {
      await page.evaluate(t => seek(t), t);
      await page.screenshot({ path: `${out}/still_${t.toFixed(2)}.png` });
    }
  } else {
    const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', fps, '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', fps, out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const n = Math.round((t1 - t0) * fps);
    const st = Date.now();
    for (let i = 0; i < n; i++) {
      const t = +t0 + i / fps;
      await page.evaluate(t => seek(t), t);
      const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 150 === 0) console.log(`frame ${i}/${n} ${((Date.now() - st) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
  }
} finally { await browser.close(); srv.kill(); }
