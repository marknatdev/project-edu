import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { callAiStrict, callAiGateway } from '@/lib/ai/gateway';

// S1: strict upstream seam for fresh generation. Every upstream here is a MOCKED
// fetch (no network); this is contract evidence, NOT live AI evidence.
const schema = z.object({ cards: z.array(z.object({ title: z.string() })) });
const LEARNER_TEXT = 'หนูชอบเลี้ยงปลากัดที่บ้าน';
function configure() {
  vi.stubEnv('AI_BASE_URL', 'https://mock-upstream.invalid/v1');
  vi.stubEnv('AI_API_KEY', 'synthetic-test-key');
  vi.stubEnv('AI_MODEL', 'mock-model');
}
const completion = (content: string, status = 200) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('callAiStrict (S1) — never returns fallback data', () => {
  it('reports unconfigured without calling the network', async () => {
    vi.stubEnv('AI_BASE_URL', ''); vi.stubEnv('AI_API_KEY', ''); vi.stubEnv('AI_MODEL', '');
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    expect(await callAiStrict({ schema, prompt: LEARNER_TEXT })).toEqual({ ok: false, reason: 'unconfigured' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['upstream_http', () => new Response('upstream echoed ' + LEARNER_TEXT, { status: 500 })],
    ['empty', () => completion('')],
    ['malformed_json', () => completion('not json {')],
    ['schema', () => completion(JSON.stringify({ cards: 'nope' }))],
    ['too_large', () => completion(JSON.stringify({ cards: [{ title: 'x'.repeat(70_000) }] }))],
  ] as const)('maps %s to a typed failure and logs no learner text / upstream body', async (reason, respond) => {
    configure();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => respond()));
    const result = await callAiStrict({ schema, prompt: LEARNER_TEXT, maxContentBytes: 65_536 });
    expect(result).toMatchObject({ ok: false, reason });
    expect('data' in result).toBe(false);
    const logged = JSON.stringify([...warn.mock.calls, ...error.mock.calls]);
    expect(logged).not.toContain(LEARNER_TEXT);
    expect(logged).not.toContain('synthetic-test-key');
  });

  it('maps network errors and timeouts', async () => {
    configure();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed'); }));
    expect(await callAiStrict({ schema, prompt: 'x' })).toMatchObject({ ok: false, reason: 'network' });
    vi.stubGlobal('fetch', vi.fn((_u: unknown, init?: RequestInit) => new Promise((_ok, fail) => {
      init?.signal?.addEventListener('abort', () => fail(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    })));
    expect(await callAiStrict({ schema, prompt: 'x', timeoutMs: 20 })).toMatchObject({ ok: false, reason: 'timeout' });
  });

  it('returns validated data on success and sends bounded max_tokens', async () => {
    configure();
    const fetchMock = vi.fn(async () => completion(JSON.stringify({ cards: [{ title: 'ok' }] })));
    vi.stubGlobal('fetch', fetchMock);
    expect(await callAiStrict({ schema, prompt: 'x', maxTokens: 1200 })).toEqual({ ok: true, data: { cards: [{ title: 'ok' }] } });
    const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.max_tokens).toBe(1200);
    expect(body.response_format).toEqual({ type: 'json_object' });
  });

  it('leaves callAiGateway offline fallback intact for other features', async () => {
    configure();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 503 })));
    const result = await callAiGateway({ schema, prompt: 'x', fallback: () => ({ cards: [] }) });
    expect(result).toEqual({ source: 'fallback', data: { cards: [] }, error: 'HTTP 503' });
  });
});
