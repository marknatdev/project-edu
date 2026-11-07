import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const scratch = process.env.TMPDIR || process.env.TEMP || process.env.TMP || 'C:/Users/Administrator/AppData/Local/hermes/cache/scratch';
const dir = await mkdtemp(path.join(scratch, 'stageshow-audit-'));
const chromeBin = process.env.CHROME_BIN || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].find(existsSync);
assert(chromeBin, 'Chrome/Chromium required');

let chrome, ws;
let id = 0;
const pending = new Map();

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const next = ++id;
    pending.set(next, m => m.error ? reject(Error(JSON.stringify(m.error))) : resolve(m.result));
    ws.send(JSON.stringify({ id: next, method, params }));
  });
}

try {
  chrome = spawn(chromeBin, [
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--remote-debugging-port=0',
    `--user-data-dir=${dir}`,
    'about:blank'
  ], { stdio: 'ignore' });

  let port;
  for (let n = 0; n < 100; n++) {
    try {
      port = (await readFile(path.join(dir, 'DevToolsActivePort'), 'utf8')).split('\n')[0];
      break;
    } catch {
      await new Promise(r => setTimeout(r, 100));
    }
  }
  assert(port, 'Chrome did not expose a debugging port');

  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id) {
      pending.get(m.id)?.(m);
      pending.delete(m.id);
    }
  };

  const routes = [
    '/',
    '/auth',
    '/consent',
    '/interview',
    '/discovery',
    '/idea',
    '/evaluation',
    '/proposal',
    '/bom',
    '/calendar',
    '/judge',
    '/variables',
    '/advisor-review',
    '/share'
  ];

  const widths = [375, 1280];
  const auditResults = [];

  for (const width of widths) {
    console.log(`\n=== Auditing at ${width}px ===`);
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: width < 600,
    });

    for (const route of routes) {
      const url = `http://127.0.0.1:3333${route}`;
      await send('Page.navigate', { url });
      // wait for load & idle
      await new Promise(r => setTimeout(r, 400));

      const evalRes = await send('Runtime.evaluate', {
        expression: `(() => {
          const px = v => parseFloat(v) || 0;
          const body = document.body;
          const findings = [];
          
          // 1. Horizontal overflow
          const docW = document.documentElement.scrollWidth;
          const winW = window.innerWidth;
          if (docW > winW + 1) {
            findings.push({ rule: 'horizontal-overflow', message: \`Page overflows viewport: scrollWidth=\${docW}px > innerWidth=\${winW}px\` });
          }

          // 2. Touch targets on mobile (< 600)
          if (${width} < 600) {
            const clickables = document.querySelectorAll('button, a, input, select, textarea, [role="button"]');
            for (const el of clickables) {
              const r = el.getBoundingClientRect();
              const cs = getComputedStyle(el);
              if (r.width < 1 || r.height < 1 || cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
              if (el.closest('.sr-only') || el.classList.contains('sr-only')) continue;
              // Target size rule >= 44x44
              if ((r.width < 43 || r.height < 43) && !el.closest('header, nav[aria-label="breadcrumbs"]')) {
                // Check if inline text link
                const isInline = cs.display === 'inline' || (el.tagName === 'A' && el.parentElement && getComputedStyle(el.parentElement).display.includes('block') && el.textContent.length > 20);
                if (!isInline) {
                  findings.push({
                    rule: 'touch-target',
                    message: \`Touch target < 44px: \${el.tagName.toLowerCase()}.\${el.className.split(' ').slice(0, 2).join('.')} is \${Math.round(r.width)}x\${Math.round(r.height)}px ("\${el.textContent.slice(0, 20).trim()}")\`
                  });
                }
              }
            }
          }

          // 3. Thai line height and clipping check
          const textNodes = document.querySelectorAll('p, h1, h2, h3, h4, span, label, button, a');
          for (const el of textNodes) {
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden') continue;
            const r = el.getBoundingClientRect();
            if (r.width < 1 || r.height < 1) continue;
            // Check if Thai text present
            if (/[\\u0E00-\\u0E7F]/.test(el.textContent || '')) {
              const lh = px(cs.lineHeight);
              const fs = px(cs.fontSize);
              if (fs > 0 && lh > 0 && (lh / fs) < 1.25 && cs.display !== 'inline') {
                findings.push({
                  rule: 'thai-line-height-cramped',
                  message: \`Thai text line-height too tight: \${el.tagName.toLowerCase()}.\${el.className.split(' ').slice(0, 2).join('.')} ratio=\${(lh/fs).toFixed(2)} ("\${el.textContent.slice(0, 25).trim()}")\`
                });
              }
            }
          }

          // 4. Input clearance & button padding
          const buttons = document.querySelectorAll('button, [role="button"]');
          for (const btn of buttons) {
            const cs = getComputedStyle(btn);
            if (cs.display === 'none' || cs.visibility === 'hidden') continue;
            const r = btn.getBoundingClientRect();
            if (r.width < 1 || r.height < 1) continue;
            // Check button inner text overflow
            if (btn.scrollWidth > btn.clientWidth + 1) {
              findings.push({
                rule: 'control-text-overflow',
                message: \`Button content overflows width: \${btn.tagName.toLowerCase()}.\${btn.className.split(' ').slice(0, 2).join('.')}\`
              });
            }
          }

          return {
            title: document.title,
            findings
          };
        })()`,
        returnByValue: true
      });

      const res = evalRes?.result?.value;
      const count = res?.findings?.length || 0;
      if (count > 0) {
        console.log(`[!] ${route} (${width}px): ${count} findings`);
        for (const f of res.findings) {
          console.log(`    - [${f.rule}] ${f.message}`);
        }
      } else {
        console.log(`[PASS] ${route} (${width}px)`);
      }
      auditResults.push({ route, width, findings: res?.findings || [] });
    }
  }

  const allFindings = auditResults.flatMap(r => r.findings);
  console.log(`\nAudit complete: ${allFindings.length} total findings across all routes.`);
} finally {
  ws?.close();
  chrome?.kill();
  for (let n = 0; n < 20; n++) {
    try { await rm(dir, { recursive: true, force: true }); break; }
    catch { await new Promise(r => setTimeout(r, 100)); }
  }
}
