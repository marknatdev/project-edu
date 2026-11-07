import { afterEach, describe, expect, it, vi } from 'vitest';
import { readBody } from '@/lib/persistence/owner-route.server';
import { POST as coach } from '@/app/api/ai/coach/route';
import { POST as cards } from '@/app/api/discovery/cards/route';
import { POST as login } from '@/app/auth/login/route';
import { POST as evaluate } from '@/app/api/ai/evaluate/route';
import { POST as pivot } from '@/app/api/ai/pivot/route';
import { POST as proposal } from '@/app/api/ai/proposal/route';
import { POST as legacyCards } from '@/app/api/ai/cards/generate/route';
import { callAiStrict } from '@/lib/ai/gateway';
import { z } from 'zod';

// Actual Request/Response byte streams; no buffering fetch shim. Synthetic data only.
function fixture(chunkSize = 65_536, chunks = 20) {
  let produced = 0;
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    pull(c) { if (produced < chunks) { produced++; c.enqueue(new Uint8Array(chunkSize).fill(65)); } else c.close(); },
    cancel() { cancelled = true; },
  }, { highWaterMark: 0 });
  return { stream, stats: () => ({ produced, cancelled }) };
}
const request = (stream: ReadableStream<Uint8Array>, headers = {}) => new Request('http://localhost/api', {
  method: 'POST', headers: { origin: 'http://localhost', ...headers }, body: stream, duplex: 'half',
} as RequestInit);
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('bounded HTTP stream admission', () => {
  it.each([
    ['owner AI routes', async (r: Request) => { const result = await readBody(r); return 'response' in result ? result.response.status : 200; }],
    ['coaching', async (r: Request) => (await coach(r)).status],
    ['Discovery', async (r: Request) => (await cards(r)).status],
    ['OAuth login', async (r: Request) => (await login(r)).status],
    ['evaluation', async (r: Request) => (await evaluate(r)).status],
    ['Pivot', async (r: Request) => (await pivot(r)).status],
    ['proposal', async (r: Request) => (await proposal(r)).status],
    ['legacy local cards', async (r: Request) => (await legacyCards(r)).status],
  ] as const)('%s cancels the twenty-chunk allocation probe before consuming it', async (_name, handle) => {
    const f = fixture();
    expect(await handle(request(f.stream))).toBe(413);
    expect(f.stats().produced).toBeLessThanOrEqual(3);
    expect(f.stats().cancelled).toBe(true);
  });

  it('rejects oversized Content-Length without reading; ignores lying small length as authority', async () => {
    const large = fixture();
    expect(await readBody(request(large.stream, { 'content-length': '1310720' }))).toMatchObject({ response: { status: 413 } });
    expect(large.stats()).toEqual({ produced: 0, cancelled: true });
    const lie = fixture();
    expect(await readBody(request(lie.stream, { 'content-length': '1' }))).toMatchObject({ response: { status: 413 } });
    expect(lie.stats().produced).toBeLessThanOrEqual(2);
  });

  it('counts multibyte UTF8 bytes, preserves split codepoints and rejects malformed JSON', async () => {
    const bytes = new TextEncoder().encode('{"text":"น้ำ"}');
    const make = () => new ReadableStream<Uint8Array>({ start(c) { for (const b of bytes) c.enqueue(new Uint8Array([b])); c.close(); } });
    expect(await readBody(request(make()), bytes.length)).toEqual({ body: { text: 'น้ำ' } });
    expect(await readBody(request(make()), bytes.length - 1)).toMatchObject({ response: { status: 413 } });
    expect(await readBody(new Request('http://localhost/api', { method: 'POST', body: '{bad' }))).toMatchObject({ response: { status: 400 } });
  });

  it('rejects cross-site bodies before reading or resolving auth', async () => {
    const f = fixture();
    expect(await readBody(request(f.stream, { origin: 'http://attacker.test' }))).toMatchObject({ response: { status: 403 } });
    expect(f.stats().produced).toBe(0);
  });

  it('cancels oversized upstream response while reading, including absent or lying lengths', async () => {
    vi.stubEnv('AI_BASE_URL', 'https://mock-upstream.invalid/v1'); vi.stubEnv('AI_API_KEY', 'synthetic'); vi.stubEnv('AI_MODEL', 'synthetic');
    for (const headers of [{}, { 'content-length': '1' }, { 'content-length': '1310720' }] as Record<string, string>[]) {
      const f = fixture();
      vi.stubGlobal('fetch', vi.fn(async () => new Response(f.stream, { headers })));
      expect(await callAiStrict({ schema: z.object({}), prompt: 'synthetic', maxContentBytes: 32768 })).toMatchObject({ ok: false, reason: 'too_large' });
      expect(f.stats().produced).toBeLessThanOrEqual(2);
      expect(f.stats().cancelled).toBe(true);
    }
  });
});
