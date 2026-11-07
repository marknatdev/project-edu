import type { EvaluationAxis, Idea } from '@/types/domain';
import { appFetch } from '@/lib/auth/workspace-client';
import { PivotViewSchema, type PivotView } from './pivot-dto';

/**
 * Browser seam for the server-authoritative Pivot workshop (DEF-02). Sends only
 * action + idea/axis, or pivot id + revision + learner answer. Never sends
 * tiers, unlock state or an owner ID; never fabricates Tier 3 offline.
 */
export type PivotResult =
  | { ok: true; pivot: PivotView }
  | { ok: false; kind: 'offline' | 'unavailable' | 'rate_limited' | 'locked' | 'conflict' | 'not_found'; messageTh: string; pivot?: PivotView };

const OFFLINE_TH = 'ยังเชื่อมต่อเซิร์ฟเวอร์ไม่ได้ คำถามระดับ 1 และคำตอบของคุณยังอยู่ในหน้านี้ ตัวอย่างระดับ 3 ต้องเชื่อมต่อเพื่อให้เซิร์ฟเวอร์ตรวจขั้นตอนก่อน';

async function send(body: object): Promise<PivotResult> {
  let response: Response;
  try {
    response = await appFetch('/api/ai/pivot', { method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch { return { ok: false, kind: 'offline', messageTh: OFFLINE_TH }; }
  const data = await response.json().catch(() => ({})) as { pivot?: unknown; error?: string; messageTh?: string };
  const parsed = data.pivot === undefined ? null : PivotViewSchema.safeParse(data.pivot);
  const pivot = parsed?.success ? parsed.data : undefined;
  if (response.ok && pivot) return { ok: true, pivot };
  const messageTh = typeof data.messageTh === 'string' ? data.messageTh : OFFLINE_TH;
  if (response.status === 429) return { ok: false, kind: 'rate_limited', messageTh };
  if (response.status === 404) return { ok: false, kind: 'not_found', messageTh };
  if (response.status === 409) return { ok: false, kind: data.error === 'TIER_LOCKED' ? 'locked' : 'conflict', messageTh, pivot };
  return { ok: false, kind: 'unavailable', messageTh };
}

export function openPivot(input: { idea: Idea; axis: EvaluationAxis }): Promise<PivotResult> {
  return send({ action: 'open', idea: input.idea, axis: input.axis });
}

export function advancePivot(input: { pivot: PivotView; requestedTier: 2 | 3; learnerResponse?: string; requestId?: string }): Promise<PivotResult> {
  return send({ action: 'turn', pivotId: input.pivot.id, revision: input.pivot.revision, requestId: input.requestId ?? crypto.randomUUID(),
    requestedTier: input.requestedTier, ...(input.learnerResponse !== undefined ? { learnerResponse: input.learnerResponse } : {}) });
}
