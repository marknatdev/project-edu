// node tests/browser/privacy-generation.browser.mjs; Chrome/Edge required.
// Synthetic HTTP boundary; real React, components and storage. No app server or credentials.
import { build } from 'esbuild';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../../', import.meta.url));
const scratch = process.env.TMPDIR || 'C:/Users/Administrator/AppData/Local/hermes/cache/scratch';
const dir = await mkdtemp(path.join(scratch, 'edtech-privacy-'));
const chromeBin = process.env.CHROME_BIN || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].find(existsSync);
assert(chromeBin, 'Chrome/Chromium required; set CHROME_BIN');
let chrome, server, ws;
try {
  const bundle = await build({
    absWorkingDir: root, entryPoints: ['tests/browser/privacy-generation.fixture.tsx'],
    bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"development"' }, loader: { '.css': 'empty' },
    plugins: [{ name: 'non-privacy-ui-shells', setup(b) {
      const modules = new Set(['next/link', 'next/navigation', '@/components/shell/AppShell',
        '@/components/export/ExportPanel', '@/components/advisor-review/AdvisorReviewPanel',
        '@/components/evaluation/PivotWorkshop']);
      b.onResolve({ filter: /.*/ }, a => modules.has(a.path) ? { path: a.path, namespace: 'shell' } : undefined);
      b.onLoad({ filter: /.*/, namespace: 'shell' }, () => ({ contents: `
        import React from 'react';
        export default function Link({children, scroll, ...props}) { return <a {...props}>{children}</a>; }
        export const useSearchParams = () => new URLSearchParams(window.__search ?? '');
        export const useRouter = () => ({ push() {}, replace() {} });
        export const usePathname = () => '/';
        export const AppShell = ({children}) => <main>{children}</main>;
        export const ExportPanel = () => <button data-export>synthetic export</button>;
        export const AdvisorReviewPanel = () => null;
        export const PivotWorkshop = () => null;
      `, resolveDir: root, loader: 'tsx' }));
    } }],
  });
  server = createServer((req, res) => {
    res.setHeader('Content-Type', req.url === '/fixture.js' ? 'text/javascript' : 'text/html; charset=utf-8');
    res.end(req.url === '/fixture.js' ? bundle.outputFiles[0].contents : '<!doctype html><div id="root"></div><script src="/fixture.js"></script>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  chrome = spawn(chromeBin, ['--headless=new', '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--remote-debugging-port=0', `--user-data-dir=${dir}`, 'about:blank'], { stdio: 'ignore' });
  let port;
  for (let n = 0; n < 100; n++) {
    try { port = (await readFile(path.join(dir, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; }
    catch { await new Promise(r => setTimeout(r, 100)); }
  }
  assert(port, 'Chrome did not expose a debugging port');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id) { pending.get(m.id)?.(m); pending.delete(m.id); } };
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const next = ++id;
    pending.set(next, m => m.error ? reject(Error(JSON.stringify(m.error))) : resolve(m.result));
    ws.send(JSON.stringify({ id: next, method, params }));
  });
  await call('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` });
  let output;
  for (let n = 0; n < 150; n++) {
    const r = await call('Runtime.evaluate', { expression: 'window.__privacyResults', returnByValue: true });
    if (r.result.value) { output = r.result.value; break; }
    await new Promise(r => setTimeout(r, 100));
  }
  assert(output, 'Browser tests did not finish');
  console.log(JSON.stringify(output, null, 2));
  assert.equal(output.failures.length, 0, 'Browser privacy regression failures');
  assert.equal(output.errors.length, 0, 'Unexpected React/browser errors');
} finally {
  ws?.close(); chrome?.kill();
  if (server) await new Promise(resolve => server.close(resolve));
  for (let n = 0; n < 20; n++) {
    try { await rm(dir, { recursive: true, force: true }); break; }
    catch { await new Promise(r => setTimeout(r, 100)); }
  }
}
