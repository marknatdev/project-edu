// Real React/Chrome regression tests, with synthetic transport/storage only.
// Run: node tests/browser/proposal-discovery.browser.mjs (CHROME_BIN optional).
import { build } from 'esbuild';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../../', import.meta.url));
const scratch = process.env.TMPDIR || process.env.TEMP || process.env.TMP;
assert(scratch, 'Set TMPDIR for the isolated browser profile');
const dir = await mkdtemp(path.join(scratch, 'edtech-react-regression-'));
const chromeBin = process.env.CHROME_BIN || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].find(existsSync);
assert(chromeBin, 'Chrome/Chromium required; set CHROME_BIN');
let chrome, server, ws;
try {
  const result = await build({
    absWorkingDir: root, entryPoints: ['tests/browser/proposal-discovery.fixture.tsx'],
    bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [{ name: 'synthetic-boundaries', setup(b) {
      const modules = new Set(['next/link', 'next/navigation', '@/lib/storage/store',
        '@/lib/advisor/coaching-local', '@/lib/discovery/fresh-client',
        '@/components/auth/AccountAccess', '@/lib/auth/workspace-client']);
      b.onResolve({ filter: /.*/ }, a => modules.has(a.path) ? { path: a.path, namespace: 'synthetic' } : undefined);
      b.onLoad({ filter: /.*/, namespace: 'synthetic' }, () => ({
        contents: `export { Link as default, useRouter, usePathname, STORAGE_PREFIX, getInterview, getLearner,
          saveIdea, getDefaultStorage, wipeAllLearnerData, saveTopicCardSnapshot, fetchCardQuota,
          requestFreshCards, OptionalLoginOffer, getWorkspaceScope, setWorkspaceScope, getWipeGeneration, reloadWorkspace, appFetch } from ${JSON.stringify(path.join(root, 'tests/browser/proposal-discovery.mocks.tsx'))};`,
        resolveDir: root, loader: 'tsx',
      }));
    } }],
  });
  await writeFile(path.join(dir, 'fixture.js'), result.outputFiles[0].contents);
  server = createServer(async (req, res) => {
    res.setHeader('Content-Type', req.url === '/fixture.js' ? 'text/javascript' : 'text/html; charset=utf-8');
    res.end(req.url === '/fixture.js' ? await readFile(path.join(dir, 'fixture.js')) : '<!doctype html><div id="root"></div><script src="/fixture.js"></script>');
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
    const r = await call('Runtime.evaluate', { expression: 'window.__regressionResults', returnByValue: true });
    if (r.result.value) { output = r.result.value; break; }
    await new Promise(r => setTimeout(r, 100));
  }
  assert(output, 'Browser tests did not finish');
  console.log(JSON.stringify(output, null, 2));
  assert.equal(output.failures.length, 0, 'Browser regression failures');
  assert.equal(output.errors.length, 0, 'Unexpected React/browser errors');
} finally {
  ws?.close(); chrome?.kill();
  if (server) await new Promise(resolve => server.close(resolve));
  for (let n = 0; n < 20; n++) {
    try { await rm(dir, { recursive: true, force: true }); break; }
    catch { await new Promise(r => setTimeout(r, 100)); }
  }
}
