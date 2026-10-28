// Screenshot a cover-art page at 1080x1920 once it sets window.__done.
//   node shoot.mjs DIR/page.html OUT.png      (DIR is served from the repo's project/ root)
import { createRequire } from 'module';
import { spawn } from 'child_process';
import path from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const [page, out] = process.argv.slice(2);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const port = 8700 + Math.floor(Math.random() * 200);
const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('pageerror', e => console.error('page error:', e.message));
await p.goto(`http://127.0.0.1:${port}/${path.relative(root, path.resolve(page))}`);
await p.waitForFunction(() => window.__done, null, { timeout: 120000 });
await p.screenshot({ path: out });
await b.close(); srv.kill();
