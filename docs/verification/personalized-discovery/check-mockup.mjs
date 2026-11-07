// Deliverable A only: static smoke checks. No live upstream calls.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const path = 'docs/mockups/personalized-discovery.html';
assert.ok(fs.existsSync(path), 'New standalone mockup exists');
const html = fs.readFileSync(path, 'utf8');
assert.match(html, /<html lang="th">/);
assert.match(html, /ข้อมูลจำลองเพื่อทดลอง UI — ไม่ได้เรียก AI จริง/);
assert.match(html, /id="disclosure"/);
assert.match(html, /timeZone: 'Asia\/Bangkok'/);
assert.doesNotMatch(html, /\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/, 'No real upstream API in demo');
assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href="https?:/);
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length, 1);
new vm.Script(scripts[0][1], { filename: path });
console.log('PASS: standalone Thai document, persistent simulation disclosure, Bangkok clock, no external resources/API calls, inline JavaScript syntax.');
