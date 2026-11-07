/**
 * Browser transport for `/api/discovery/cards` (client-safe).
 * Returns the server's response union, or a truthful transport failure.
 * It never fabricates or "repairs" cards: a malformed success is an error.
 */
import { z } from 'zod';
import { appFetch } from '@/lib/auth/workspace-client';
import { TopicCardSchema } from '@/lib/schemas';
import { CardQuotaSchema, type CardQuota } from '@/lib/persistence/contracts';
import type { FreshCardsRequest, FreshCardsResponse } from './fresh-contract';
import type { FreshClientResult } from './fresh-session';

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;
const ENDPOINT = '/api/discovery/cards';
const KEPT = 'คำตอบและการ์ดเดิมของคุณยังอยู่ และไม่ได้ใช้โควตาเพิ่ม';
export const NETWORK_TH = `เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ยังสร้างการ์ดใหม่ไม่ได้ ${KEPT} กดลองใหม่ได้เมื่อออนไลน์`;
const SERVER_TH = `เซิร์ฟเวอร์ตอบกลับผิดปกติ ยังสร้างการ์ดใหม่ไม่ได้ ${KEPT} กดลองใหม่อีกครั้ง`;

const quota = CardQuotaSchema;
const messageTh = z.string().min(1).max(600);
const requestId = z.string().uuid();
const rejected = z.object({ invalid: z.number().int().min(0), unsupportedClaims: z.number().int().min(0), repeats: z.number().int().min(0) });
const ResponseSchema: z.ZodType<FreshCardsResponse> = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ok'), source: z.literal('ai'), requestId, replayed: z.boolean(),
    cards: z.array(TopicCardSchema.refine(c => c.starter?.origin === 'ai_fresh')).min(1).max(5), accepted: z.number().int().min(1).max(5),
    requested: z.number().int().min(1).max(5).nullable(), partial: z.boolean(), rejected: rejected.nullable(), quota, noticeTh: z.string() }),
  z.object({ status: z.literal('pending'), requestId, leaseExpiresAt: z.string(), quota, messageTh }),
  z.object({ status: z.literal('unavailable'), code: z.enum(['AI_UNCONFIGURED', 'AI_UNAVAILABLE', 'AI_TIMEOUT', 'AI_OUTPUT_UNUSABLE']), requestId, retryable: z.literal(true), quota, messageTh }),
  z.object({ status: z.literal('quota_exhausted'), requestId, quota, messageTh }),
  z.object({ status: z.literal('failed_intent'), requestId, retryWithNewRequestId: z.literal(true), quota, messageTh }),
  z.object({ status: z.literal('conflict'), requestId, messageTh }),
  z.object({ status: z.literal('rate_limited'), messageTh }),
]) as z.ZodType<FreshCardsResponse>;

const browserFetch: Fetcher = (input, init) => appFetch(input, init);

/** Serialize with coaching so first use in several tabs mints one Guest owner. */
function withOwnerLock<T>(work: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) return Promise.reject(new Error('STALE_VIEW'));
  if (typeof navigator !== 'undefined' && navigator.locks) return navigator.locks.request('edu-coaching-owner', { signal }, () => { signal?.throwIfAborted(); return work(); }) as Promise<T>;
  return work();
}

export async function requestFreshCards(body: FreshCardsRequest, fetcher: Fetcher = browserFetch, signal?: AbortSignal): Promise<FreshClientResult> {
  return withOwnerLock<FreshClientResult>(async () => {
    let response: Response;
    try {
      response = await fetcher(ENDPOINT, { method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } catch { return { status: 'network_error', messageTh: NETWORK_TH }; }
    let json: unknown;
    try { json = await response.json(); } catch { return { status: 'http_error', httpStatus: response.status, messageTh: SERVER_TH }; }
    const parsed = ResponseSchema.safeParse(json);
    if (parsed.success) return parsed.data;
    const text = typeof json === 'object' && json && 'messageTh' in json && typeof json.messageTh === 'string' ? json.messageTh.slice(0, 600) : SERVER_TH;
    return { status: 'http_error', httpStatus: response.status, messageTh: text };
  }, signal).catch(() => ({ status: 'network_error' as const, messageTh: NETWORK_TH }));
}

/** Current real allowance (never generates/charges). Null when unknown. */
export async function fetchCardQuota(fetcher: Fetcher = browserFetch, signal?: AbortSignal): Promise<CardQuota | null> {
  return withOwnerLock(async () => {
    try {
      const response = await fetcher(ENDPOINT, { method: 'GET', credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) return null;
      const parsed = z.object({ quota }).safeParse(await response.json());
      return parsed.success ? parsed.data.quota : null;
    } catch { return null; }
  }, signal).catch(() => null);
}
