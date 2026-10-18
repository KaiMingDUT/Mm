// usage: node probe.mjs <engine dir> "<js expression evaluated after seek(t)>" [t]
import { createRequire } from 'module';
import { spawn } from 'child_process';
import path from 'path';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [dir, expr, t = '0'] = process.argv.slice(2);
const port = 8900 + Math.floor(Math.random() * 90);
const srv = spawn('python3', ['-I', '-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', path.resolve(dir)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-accelerated-2d-canvas'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('console', m => console.log('CONSOLE', m.type(), m.text()));
page.on('pageerror', e => console.log('PAGE ERROR', e.message));
try {
  await page.goto(`http://127.0.0.1:${port}/${process.env.PAGE || 'index.html'}`);
  await page.evaluate(() => window.ready());
  await page.evaluate(t => seek(t), +t);
  console.log(JSON.stringify(await page.evaluate(expr)));
} finally { await browser.close(); srv.kill(); }
