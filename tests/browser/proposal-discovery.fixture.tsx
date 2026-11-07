import React, { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ProposalEditor } from '@/components/proposal/ProposalEditor';
import { WorkspaceBoundary } from '@/components/auth/WorkspaceBoundary';
import { FreshDiscovery } from '@/components/discovery/FreshDiscovery';
import { COACH_INVALIDATION_EVENT } from '@/lib/advisor/coaching-invalidation';
import { createDiscoverySession, saveDiscoverySession } from '@/lib/discovery/fresh-session';
import { exportFixture } from '../fixtures/export';
import { authFetch, getDefaultStorage, getWorkspaceScope, resetMocks, state } from './proposal-discovery.mocks';

// Deterministic timer/transport boundaries; components and React lifecycle are real.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, fetch: authFetch });
Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
const errors: string[] = [];
console.error = (...args) => errors.push(args.map(String).join(' '));
window.addEventListener('error', e => errors.push(e.message));
let now = Date.parse('2026-11-07T16:59:55Z');
Date.now = () => now;
let nextTimer = 0;
const timers = new Map<number, { due: number; fn: () => void }>();
window.setTimeout = ((fn: () => void, ms = 0) => { const id = ++nextTimer; timers.set(id, { due: now + ms, fn }); return id; }) as typeof setTimeout;
window.clearTimeout = ((id?: number) => { if (id !== undefined) timers.delete(id); }) as typeof window.clearTimeout;
const flush = async (fn: () => void = () => {}) => { await act(async () => { fn(); await Promise.resolve(); }); };
async function tick(ms: number) {
  const end = now + ms;
  for (let n = 0; n < 100; n++) {
    const next = [...timers].filter(([, t]) => t.due <= end).sort((a, b) => a[1].due - b[1].due)[0];
    if (!next) { now = end; await flush(); return; }
    now = next[1].due; timers.delete(next[0]); await flush(next[1].fn);
  }
  throw Error('Timer retry loop exceeded bound');
}
const equal = (actual: unknown, expected: unknown, message: string) => { if (actual !== expected) throw Error(`${message}: expected ${expected}, got ${actual}`); };
let root: Root | null = null;
const container = document.getElementById('root')!;
const mount = async (element: React.ReactNode) => { root = createRoot(container); await flush(() => root!.render(element)); };
const render = async (element: React.ReactNode) => { await flush(() => root!.render(element)); };
const unmount = async () => { if (root) { await flush(() => root!.unmount()); root = null; } };
async function change(selector: string, value: string) {
  const input = container.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
  const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await flush(() => { Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
}
const clickSave = () => flush(() => [...container.querySelectorAll('button')].find(b => b.textContent === 'บันทึกการแก้ไข')!.click());
const quota = (reset: number, remaining = 0) => ({ day: remaining ? '2026-11-08' : '2026-11-07', used: 35 - remaining,
  reserved: 0, remaining, freeRemaining: remaining ? 5 : 0, extraRemaining: remaining ? 30 : 0, resetAt: new Date(reset).toISOString() });
const free = () => container.querySelector('[data-testid="quota-free"]')?.textContent;
async function resolveQuota(index: number, value: unknown) {
  equal(Boolean(state.quotaRequests[index]), true, `quota request ${index} exists`);
  await flush(() => state.quotaRequests[index].resolve(value));
}
async function setupQuota() {
  const reset = now + 5000;
  await mount(<FreshDiscovery />);
  equal(state.quotaRequests.length, 1, 'one initial quota read');
  await resolveQuota(0, quota(reset));
  equal(free(), '0', 'exhausted quota shown');
  return reset;
}
const results = { passed: [] as string[], failures: [] as string[], errors };
async function test(name: string, run: () => Promise<void>) {
  resetMocks(); timers.clear(); now = Date.parse('2026-11-07T16:59:55Z');
  try { await run(); results.passed.push(name); }
  catch (e) { results.failures.push(`${name}: ${String(e)}`); }
  finally { await unmount(); timers.clear(); }
}

async function run() {
  await test('StrictMode and unstable onSave rerenders/unmount never save a proposal', async () => {
    const saves: unknown[] = [];
    const editor = () => <StrictMode><ProposalEditor proposal={exportFixture.proposal} onSave={p => saves.push(p)} onReassemble={() => {}} /></StrictMode>;
    await mount(editor());
    await render(editor());
    await unmount();
    equal(saves.length, 0, 'passive lifecycle saves');
  });
  await test('typing title stays local; explicit Save runs once with the complete draft', async () => {
    const saves: typeof exportFixture.proposal[] = [];
    await mount(<StrictMode><ProposalEditor proposal={exportFixture.proposal} onSave={p => saves.push(p)} onReassemble={() => {}} /></StrictMode>);
    saves.length = 0;
    await change('input', 'unsaved title');
    await change('textarea', 'unsaved problem');
    equal(saves.length, 0, 'saves during editing');
    await clickSave();
    equal(saves.length, 1, 'explicit saves');
    equal(saves[0].title, 'unsaved title', 'saved title');
    equal(saves[0].problemStatement, 'unsaved problem', 'saved problem');
  });
  await test('account navigation uses latest callback/draft and can veto a failed save', async () => {
    let previous = 0, latest = 0;
    await mount(<ProposalEditor proposal={exportFixture.proposal} onSave={() => { previous++; }} onReassemble={() => {}} />);
    await change('textarea', 'latest draft');
    await render(<ProposalEditor proposal={exportFixture.proposal} onSave={p => { latest++; equal(p.problemStatement, 'latest draft', 'navigation draft'); }} onReassemble={() => {}} />);
    equal(previous, 0, 'old callback not saved on replacement');
    await flush(() => equal(window.dispatchEvent(new Event('edtech:before-account-navigation', { cancelable: true })), true, 'successful navigation'));
    equal(latest, 1, 'latest save callback');
    await render(<ProposalEditor proposal={exportFixture.proposal} onSave={() => { throw Error('synthetic storage failure'); }} onReassemble={() => {}} />);
    await flush(() => equal(window.dispatchEvent(new Event('edtech:before-account-navigation', { cancelable: true })), false, 'failed save vetoes navigation'));
  });
  await test('transient auth failure/recovery keeps the mounted unsaved proposal draft', async () => {
    const saves: typeof exportFixture.proposal[] = [];
    await mount(<WorkspaceBoundary><ProposalEditor proposal={exportFixture.proposal} onSave={p => saves.push(p)} onReassemble={() => {}} /></WorkspaceBoundary>);
    await change('textarea', 'draft survives auth outage');
    const original = container.querySelector('textarea');
    state.authFails = true;
    await flush(() => window.dispatchEvent(new Event('focus')));
    equal(container.querySelector('textarea'), original, 'same mounted editor on auth failure');
    equal((original as HTMLTextAreaElement).value, 'draft survives auth outage', 'draft on failure');
    equal(container.querySelector('[role="alert"]')?.textContent?.includes('บันทึกในอุปกรณ์นี้'), true, 'truthful banner: work still saved locally');
    state.authFails = false;
    await flush(() => window.dispatchEvent(new Event('focus')));
    equal(container.querySelector('textarea'), original, 'same editor after recovery');
    equal(saves.length, 0, 'no auth-triggered save');
    await clickSave();
    equal(saves.length, 1, 'manual save after recovery');
    equal(saves[0].problemStatement, 'draft survives auth outage', 'saved recovered draft');
  });
  await test('focus read straddling reset queues exactly one authoritative boundary read', async () => {
    const reset = await setupQuota();
    await tick(4000);
    await flush(() => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); });
    equal(state.quotaRequests.length, 2, 'coalesced foreground read');
    await tick(1100);
    equal(state.quotaRequests.length, 2, 'no overlapping boundary read');
    await resolveQuota(1, quota(reset));
    equal(state.quotaRequests.length, 3, 'queued reset read starts after focus read');
    await resolveQuota(2, quota(reset + 86_400_000, 35));
    equal(free(), '5', 'new allowance shown without another focus');
    await tick(5000);
    equal(state.quotaRequests.length, 3, 'no immediate extra retry');
    equal(state.generations, 0, 'quota refresh never generates');
  });
  await test('initial read straddling a restored reset is serialized in StrictMode too', async () => {
    const reset = now + 5000;
    saveDiscoverySession({ ...createDiscoverySession(), quota: quota(reset) }, getDefaultStorage());
    await mount(<StrictMode><FreshDiscovery /></StrictMode>);
    equal(state.quotaRequests.length, 1, 'one StrictMode initial read');
    await tick(5100);
    equal(state.quotaRequests.length, 1, 'boundary waits for initial read');
    await resolveQuota(0, quota(reset));
    equal(state.quotaRequests.length, 2, 'one queued boundary read');
    await resolveQuota(1, quota(reset + 86_400_000, 35));
    equal(free(), '5', 'initial/boundary allowance recovered');
  });
  await test('late foreground quota cannot overwrite a newer generation result', async () => {
    const reset = now + 5000;
    saveDiscoverySession({ ...createDiscoverySession(), stage: 'summary',
      answers: [{ question: 'synthetic question', answer: 'synthetic interest' }], summary: 'synthetic summary' }, getDefaultStorage());
    await mount(<FreshDiscovery />);
    await resolveQuota(0, quota(reset, 35));
    await tick(1100);
    await flush(() => window.dispatchEvent(new Event('focus')));
    await flush(() => container.querySelector<HTMLButtonElement>('button[type="submit"]')!.click());
    equal(state.generations, 1, 'one explicit generation intent');
    const request = state.generationRequests[0];
    await flush(() => request.resolve({ status: 'quota_exhausted', requestId: request.requestId, quota: quota(reset), messageTh: 'synthetic quota exhaustion' }));
    equal(free(), '0', 'generation authoritative quota');
    await resolveQuota(1, quota(reset, 35));
    equal(free(), '0', 'older foreground snapshot ignored');
    equal(state.generations, 1, 'no automatic generation retry');
  });
  await test('client clock ahead: unchanged boundary quota re-arms with backoff and recovers without focus', async () => {
    const reset = await setupQuota();
    await tick(5100);
    equal(state.quotaRequests.length, 2, 'boundary read');
    await resolveQuota(1, quota(reset));
    equal(free(), '0', 'server has not rolled over yet');
    await tick(2000);
    equal(state.quotaRequests.length, 3, 'one backoff re-read');
    await resolveQuota(2, quota(reset + 86_400_000, 35));
    equal(free(), '5', 'new allowance shown without focus');
    await tick(600_000);
    equal(state.quotaRequests.length, 3, 'new reset cancels remaining retries');
  });
  await test('failed or unchanged boundary quota is bounded, not a tight retry loop', async () => {
    const reset = await setupQuota();
    await tick(5100);
    equal(state.quotaRequests.length, 2, 'boundary read');
    await resolveQuota(1, quota(reset));
    for (const [wait, count] of [[1949, 2], [1, 3], [4000, 4], [8000, 5]] as const) {
      await tick(wait);
      equal(state.quotaRequests.length, count, `backoff read after ${wait}ms`);
      if (count > 2 && state.quotaRequests[count - 1]) await resolveQuota(count - 1, count === 5 ? null : quota(reset));
    }
    await tick(600_000);
    equal(state.quotaRequests.length, 5, 'same expired reset stops after bounded retries');
    await flush(() => window.dispatchEvent(new Event('focus')));
    await resolveQuota(5, null);
    await tick(60_000);
    equal(state.quotaRequests.length, 6, 'failed foreground read never retries automatically');
  });
  await test('unmount cancels queued boundary work and late response cannot affect a remount', async () => {
    const reset = await setupQuota();
    await tick(4000);
    await flush(() => window.dispatchEvent(new Event('focus')));
    await tick(1100);
    await unmount();
    equal(state.quotaRequests[1].signal?.aborted, true, 'in-flight quota signal aborted');
    await mount(<FreshDiscovery />);
    equal(state.quotaRequests.length, 3, 'new mount initial quota request');
    await resolveQuota(2, quota(reset + 86_400_000, 35));
    await resolveQuota(1, quota(reset));
    equal(free(), '5', 'late old response cannot overwrite new mount');
    await tick(10_000);
    equal(state.quotaRequests.length, 3, 'queued old boundary read canceled');
  });
  await test('wipe fences in-flight quota and cancels the queued boundary read', async () => {
    const reset = await setupQuota();
    await tick(4000);
    await flush(() => window.dispatchEvent(new Event('focus')));
    await tick(1100);
    await flush(() => window.dispatchEvent(new CustomEvent(COACH_INVALIDATION_EVENT, { detail: { action: 'wipe' } })));
    await resolveQuota(1, quota(reset + 86_400_000, 35));
    await tick(10_000);
    equal(state.quotaRequests.length, 2, 'no queued work after wipe');
    equal(free(), undefined, 'erased view has no stale quota');
  });
  const draftEditor = (saves: Array<{ problem: string; scope: string }>, fail = false) => <WorkspaceBoundary>
    <ProposalEditor proposal={exportFixture.proposal} onReassemble={() => {}} onSave={p => {
      if (fail) throw Error('synthetic storage failure');
      saves.push({ problem: p.problemStatement, scope: getWorkspaceScope() });
    }} />
  </WorkspaceBoundary>;
  for (const trigger of ['verified scope change', 'other-tab workspace switch'] as const) {
    await test(`M2 ${trigger} flushes the unsaved draft into the OLD scope before reload`, async () => {
      const saves: Array<{ problem: string; scope: string }> = [];
      await mount(draftEditor(saves));
      await change('textarea', 'unsaved before switch');
      state.serverScope = `account:${'b'.repeat(64)}`;
      if (trigger === 'verified scope change') await flush(() => window.dispatchEvent(new Event('focus')));
      else await flush(() => window.dispatchEvent(new StorageEvent('storage', { key: 'edtech:workspace-change', newValue: 'x' })));
      equal(saves.length, 1, 'draft flushed once');
      equal(saves[0].problem, 'unsaved before switch', 'flushed draft');
      equal(saves[0].scope, 'guest:synthetic', 'flushed into old scope');
      equal(state.reloads, 1, 'reloaded after flush');
    });
  }
  await test('M2 after a wipe, a scope change reloads without writing the stale draft', async () => {
    const saves: Array<{ problem: string; scope: string }> = [];
    await mount(draftEditor(saves));
    await change('textarea', 'erased draft');
    state.generation = 'g1';
    await flush(() => window.dispatchEvent(new StorageEvent('storage', { key: 'edtech:workspace-change', newValue: 'x' })));
    equal(saves.length, 0, 'no stale flush after wipe');
    equal(state.reloads, 1, 'still reloads');
  });
  await test('M2 a failed flush vetoes the reload and keeps the draft mounted', async () => {
    await mount(draftEditor([], true));
    await change('textarea', 'keep me');
    await flush(() => window.dispatchEvent(new StorageEvent('storage', { key: 'edtech:workspace-change', newValue: 'x' })));
    equal(state.reloads, 0, 'no reload while draft unsaved');
    equal((container.querySelector('textarea') as HTMLTextAreaElement).value, 'keep me', 'draft kept');
    equal(Boolean(container.querySelector('[role="alert"]')), true, 'learner told to save or cancel');
  });
  Object.assign(window, { __regressionResults: results });
}
void run().catch(e => Object.assign(window, { __regressionResults: { ...results, failures: [...results.failures, String(e)] } }));
