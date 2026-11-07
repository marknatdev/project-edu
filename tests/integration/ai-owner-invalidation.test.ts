import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { POST as evaluate } from '@/app/api/ai/evaluate/route';
import { POST as pivot } from '@/app/api/ai/pivot/route';
import { POST as proposal } from '@/app/api/ai/proposal/route';
import { resolvePrincipal } from '@/lib/auth/principal.server';
import { foundationForOwner } from '@/lib/persistence/factory.server';
import { connectLocalFoundationStore } from '@/lib/persistence/sqlite-store.server';
import { connectFoundationStore } from '@/lib/persistence/supabase-store.server';
import { PersistenceError, type FoundationStore, type OwnerKey } from '@/lib/persistence/contracts';
import { postgresFixture } from '../support/postgres';
import { ideaFixture } from '../fixtures/repairs';

// Real handlers, gateway validation and durable adapters; only verified principal
// selection and the model HTTP response are synthetic. Never calls live AI/Auth.
vi.mock('@/lib/persistence/factory.server', () => ({ foundationForOwner: vi.fn() }));
vi.mock('@/lib/auth/principal.server', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/auth/principal.server')>(), resolvePrincipal: vi.fn(),
}));

function signal() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}
const axis = { score: 7, rationale: 'synthetic rationale', feedback: 'synthetic feedback' };
const modelOutput = { axes: { novelty: axis, feasibility: axis, impact: axis, rigor: axis, fit: axis },
  tier2Lenses: ['synthetic lens'], tier3Examples: ['synthetic example one', 'synthetic example two'] };
function deferInference() {
  const started = signal(), release = signal();
  vi.mocked(fetch).mockImplementationOnce(async () => {
    started.resolve();
    await release.promise;
    return Response.json({ choices: [{ message: { content: JSON.stringify(modelOutput) } }] });
  });
  return { started: started.promise, release: release.resolve };
}
async function send(handler: (req: Request) => Promise<Response>, body: object) {
  const response = await handler(new Request('http://localhost/api/ai/test', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }));
  return { status: response.status, headers: response.headers, data: await response.json() };
}
let pg: Awaited<ReturnType<typeof postgresFixture>>;
beforeAll(async () => { pg = await postgresFixture(); }, 120_000);
afterAll(async () => { if (pg) await pg.close(); }, 30_000);

describe.each(['sqlite', 'postgres'] as const)('post-await owner fencing (%s)', backend => {
  let dir: string, owner: OwnerKey, store: FoundationStore;
  const connect = (key: OwnerKey) => backend === 'sqlite' ? connectLocalFoundationStore(key) : connectFoundationStore(pg.rpc, key);
  async function bind(kind: 'guest' | 'account' = 'account') {
    owner = kind === 'account' ? `u:${randomUUID()}` : `g:${randomUUID().replaceAll('-', '').repeat(2)}`;
    store = await connect(owner);
    vi.mocked(foundationForOwner).mockResolvedValue(store);
    vi.mocked(resolvePrincipal).mockResolvedValue({ owner, kind, authenticated: kind === 'account', decisionRequired: false, apply: response => response });
  }
  beforeEach(async () => {
    dir = mkdtempSync(resolve(process.env.TMPDIR ?? '.local', 'ai-owner-'));
    vi.stubEnv('COACH_DB_PATH', resolve(dir, 'foundation.sqlite'));
    vi.stubEnv('AI_BASE_URL', 'https://synthetic-ai.example.invalid/v1');
    vi.stubEnv('AI_API_KEY', 'synthetic-test-only'); vi.stubEnv('AI_MODEL', 'synthetic-test-model');
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ choices: [{ message: { content: JSON.stringify(modelOutput) } }] })));
    await bind();
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); rmSync(dir, { recursive: true, force: true }); });

  // Same-day counters already charged before the wipe; a project-data wipe
  // must not renew them for the same account (review M3).
  let retained = { evaluate: 0, proposal: 0 };
  async function expectRetained() {
    const replacement = await connect(owner);
    expect(await replacement.quotaStatus('evaluate')).toMatchObject({ used: retained.evaluate, remaining: 5 - retained.evaluate });
    expect(await replacement.quotaStatus('proposal')).toMatchObject({ used: retained.proposal, remaining: 2 - retained.proposal });
  }
  async function wipeAndReplace(charged: { evaluate: number; proposal: number }) {
    retained = charged;
    await (await connect(owner)).wipe();
    if (owner.startsWith('g:')) {
      await expect(connect(owner)).rejects.toMatchObject({ status: 410 });
    } else {
      await expectRetained();
    }
  }
  async function expectGone(result: Awaited<ReturnType<typeof send>>) {
    expect(result.status).toBe(410);
    expect(result.headers.get('cache-control')).toBe('no-store');
    expect(result.data.error).toBe('PERSISTENCE_410');
    expect(result.data.evaluation).toBeUndefined();
    expect(result.data.pivot).toBeUndefined();
    expect(result.data.proposal).toBeUndefined();
    expect(result.data.quota).toBeUndefined();
    if (owner.startsWith('u:')) await expectRetained();
  }

  for (const kind of ['guest', 'account'] as const) {
    it(`discards deferred evaluation after ${kind} wipe/replacement`, async () => {
      await bind(kind);
      const gate = deferInference();
      const pending = send(evaluate, { idea: ideaFixture() });
      await gate.started;
      expect(await store.quotaStatus('evaluate')).toMatchObject({ used: 1, remaining: 4 });
      await wipeAndReplace({ evaluate: 1, proposal: 0 });
      gate.release();
      await expectGone(await pending);
    });

    for (const requestedTier of [2, 3] as const) {
      it(`does not restore deferred Pivot tier ${requestedTier} after ${kind} wipe/replacement`, async () => {
        await bind(kind);
        let current = (await send(pivot, { action: 'open', idea: ideaFixture(), axis: 'feasibility' })).data.pivot;
        if (requestedTier === 3) current = (await send(pivot, { action: 'turn', pivotId: current.id, revision: current.revision,
          requestId: randomUUID(), requestedTier: 2, learnerResponse: 'synthetic learner answer' })).data.pivot;
        const gate = deferInference();
        const pending = send(pivot, { action: 'turn', pivotId: current.id, revision: current.revision,
          requestId: randomUUID(), requestedTier, learnerResponse: 'synthetic learner answer' });
        await gate.started;
        expect(await store.quotaStatus('evaluate')).toMatchObject({ used: 0 });
        expect(await store.quotaStatus('proposal')).toMatchObject({ used: 0 });
        await wipeAndReplace({ evaluate: 0, proposal: 0 });
        gate.release();
        await expectGone(await pending);
        if (owner.startsWith('u:')) expect(await (await connect(owner)).readById('pivot', current.id)).toBeNull();
      });
    }

    it(`discards proposal sources if ${kind} is wiped while its quota response is pending`, async () => {
      await bind(kind);
      // Proposal has no model call. Delay the already-committed quota result at
      // its async boundary, as a cloud round trip can arrive after a wipe.
      const started = signal(), release = signal(), consume = store.consumeQuota.bind(store);
      vi.spyOn(store, 'consumeQuota').mockImplementationOnce(async input => {
        const result = await consume(input);
        started.resolve(); await release.promise; return result;
      });
      const pending = send(proposal, { action: 'consume', requestId: randomUUID(), sources: { idea: ideaFixture() } });
      await started.promise;
      expect(await store.quotaStatus('proposal')).toMatchObject({ used: 1, remaining: 1 });
      await wipeAndReplace({ evaluate: 0, proposal: 1 });
      release.resolve();
      await expectGone(await pending);
    });
  }

  it('keeps evaluation precharge, proposal idempotency, and Pivot independent allowances', async () => {
    const evaluated = await send(evaluate, { idea: ideaFixture() });
    expect(evaluated.status).toBe(200);
    expect(evaluated.data.quota).toMatchObject({ used: 1, remaining: 4, limit: 5 });
    const input = { action: 'consume', requestId: randomUUID(), sources: { idea: ideaFixture() } };
    const first = await send(proposal, input), replay = await send(proposal, input);
    expect(first.status).toBe(200); expect(replay.data).toEqual(first.data);
    expect(first.data.proposal.title).toBe(ideaFixture().title);
    const opened = await send(pivot, { action: 'open', idea: ideaFixture(), axis: 'rigor' });
    expect(opened.status).toBe(200);
    const hint = await send(pivot, { action: 'turn', pivotId: opened.data.pivot.id, revision: 1,
      requestId: randomUUID(), requestedTier: 2, learnerResponse: 'synthetic learner answer' });
    expect(hint.status).toBe(200);
    expect(hint.data.pivot.unlockedTiers).toEqual([1, 2]);
    expect(await store.quotaStatus('evaluate')).toMatchObject({ used: 1 });
    expect(await store.quotaStatus('proposal')).toMatchObject({ used: 1 });
  });

  it('fails closed if the post-inference owner check is unavailable, without refunding a used evaluation', async () => {
    const gate = deferInference();
    const pending = send(evaluate, { idea: ideaFixture() });
    await gate.started;
    vi.spyOn(store, 'quotaStatus').mockRejectedValueOnce(new PersistenceError(503, 'PERSISTENCE_UNAVAILABLE'));
    gate.release();
    const result = await pending;
    expect(result.status).toBe(503);
    expect(result.data.evaluation).toBeUndefined();
    expect(await store.quotaStatus('evaluate')).toMatchObject({ used: 1, remaining: 4 });
  });
});
