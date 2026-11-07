import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { callAiStrict } from '@/lib/ai/gateway';
import { screenIdea } from '@/lib/safety/screener';
import { SUBFIELDS } from '@/data/subfields';
import { PersistenceError, type FoundationStore, type CardQuota, type CardBatch } from '@/lib/persistence/contracts';
import type { TopicCard, SafetyCategory } from '@/types/domain';
import { FRESH_NOTICE_TH, type FreshCardsRequest, type FreshCardsResponse, type FreshRejections, type FreshUnavailableCode } from './fresh-contract';
import { isSemanticRepeat, type IdeaText } from './fresh-dedupe';
import { FRESH_SYSTEM_PROMPT, FreshCandidateSchema, FreshModelOutputSchema, buildFreshPrompt, hasUnsupportedClaims, type FreshCandidate } from './fresh-prompt';

export interface FreshDeps {
  ai?: typeof callAiStrict;
  now?: () => Date;
  timeoutMs?: number;
}

const KEPT = 'คำตอบและการ์ดเดิมของคุณยังอยู่ และไม่ได้ใช้โควตา';
export const UNAVAILABLE_TH: Record<FreshUnavailableCode, string> = {
  AI_UNCONFIGURED: `ตอนนี้ยังสร้างการ์ดใหม่ไม่ได้ เพราะระบบยังไม่ได้เชื่อมต่อบริการ AI ${KEPT} ลองใหม่ภายหลัง`,
  AI_UNAVAILABLE: `ตอนนี้สร้างการ์ดใหม่ไม่ได้ เพราะติดต่อบริการ AI ไม่ได้ ${KEPT} กดลองใหม่อีกครั้ง`,
  AI_TIMEOUT: `สร้างการ์ดใหม่ไม่ได้ เพราะบริการ AI ตอบช้าเกินไป ${KEPT} กดลองใหม่อีกครั้ง`,
  AI_OUTPUT_UNUSABLE: `สร้างการ์ดใหม่ไม่ได้ เพราะผลจาก AI ใช้งานไม่ได้ ${KEPT} กดลองใหม่อีกครั้ง`,
};
const FAILURE_CODE: Record<string, FreshUnavailableCode> = {
  unconfigured: 'AI_UNCONFIGURED', upstream_http: 'AI_UNAVAILABLE', network: 'AI_UNAVAILABLE', timeout: 'AI_TIMEOUT',
};

const LEDGER_PAGES = 10; // <= 1000 accepted cards inspected for repeats
const AVOID_TITLES = 60;
const ideaText = (card: TopicCard): IdeaText => ({ title: card.title, problem: card.starter?.problem ?? card.phenomenon });

/** Owner-scoped accepted snapshots only: ids from another owner never resolve. */
async function loadLedger(store: FoundationStore): Promise<TopicCard[]> {
  const cards: TopicCard[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < LEDGER_PAGES; page++) {
    const result = await store.listCards({ limit: 100, cursor });
    cards.push(...result.cards);
    if (!result.nextCursor) break;
    cursor = result.nextCursor;
  }
  return cards;
}

function promptContext(request: FreshCardsRequest, ledger: TopicCard[]) {
  const byId = new Map(ledger.map(card => [card.id, card]));
  const resolve = (ids: string[], max: number) => ids.flatMap(id => byId.get(id) ?? []).slice(0, max);
  const liked = resolve(request.refinement?.likedCardIds ?? [], 10);
  const skipped = resolve(request.refinement?.skippedCardIds ?? [], 20);
  const seen = resolve(request.seenCardIds, 100);
  const avoid = [...new Set([...seen, ...liked, ...skipped, ...ledger].map(card => card.title))].slice(0, AVOID_TITLES);
  return { liked: liked.map(ideaText), skipped: skipped.map(ideaText), avoid };
}

const PENDING_TH = 'กำลังสร้างการ์ดชุดนี้อยู่ กรุณารอสักครู่ ระบบจะไม่สร้างซ้ำและไม่หักโควตาซ้ำ';
const FAILED_INTENT_TH = 'คำขอนี้สร้างการ์ดไม่สำเร็จและไม่ได้ใช้โควตา กดลองใหม่เพื่อส่งคำขอใหม่ คำตอบของคุณยังอยู่';
const CONFLICT_TH = 'รหัสคำขอนี้ถูกใช้กับข้อมูลชุดอื่นแล้ว กรุณาส่งคำขอใหม่';
export function quotaExhaustedTh(quota: CardQuota): string {
  return quota.reserved > 0 && quota.used < 35
    ? 'มีคำขอสร้างการ์ดอีกชุดกำลังทำงานและจองโควตาที่เหลือไว้ กรุณารอสักครู่แล้วลองใหม่ การ์ดเดิมของคุณยังอยู่'
    : 'วันนี้สร้างการ์ดครบโควตาแล้ว (ฟรี 5 ใบ และขอเพิ่มได้อีก 30 ใบต่อวัน) การ์ดที่สร้างไว้ยังอยู่ สร้างใหม่ได้หลังเที่ยงคืนตามเวลาประเทศไทย';
}

/**
 * Reserve min(count, remaining) for ONE intent. The capacity chosen at first
 * reservation is part of the stored intent, so a retry of the same request id
 * probes downward until it finds the recorded capacity (409 = different
 * capacity or a different intent; 429 = not enough allowance).
 */
async function reserve(store: FoundationStore, requestId: string, fingerprint: string, count: number): Promise<CardBatch | 'quota' | 'conflict'> {
  let sawQuota = false;
  for (let n = count; n >= 1; n--) {
    try { return await store.beginBatch({ requestId, fingerprint, count: n }); }
    catch (e) {
      if (!(e instanceof PersistenceError) || (e.status !== 409 && e.status !== 429)) throw e;
      if (e.status === 429) sawQuota = true;
    }
  }
  return sawQuota ? 'quota' : 'conflict';
}

/** Server fingerprint of the canonical intent (everything except requestId). */
export function intentFingerprint(request: FreshCardsRequest): string {
  const { requestId: _ignored, ...intent } = request;
  void _ignored;
  return 'fresh-v1:' + createHash('sha256').update(JSON.stringify(intent)).digest('hex');
}

function toCard(c: FreshCandidate, request: FreshCardsRequest, generatedAt: string): TopicCard {
  const subfield = SUBFIELDS.find(s => s.id === c.subfieldId)!;
  const screened = screenIdea(`${c.title} ${c.problem} ${c.roughDirection}`).filter(f => f.flagged).map(f => f.category);
  const safety = [...new Set<SafetyCategory>([...screened, ...c.safetyConcerns])];
  return {
    id: `fresh_${randomUUID()}`,
    subjectId: subfield.subjectId,
    subfieldId: subfield.id,
    title: c.title,
    phenomenon: c.problem,
    curiosityHook: c.interestLink,
    targetGradeLevels: [request.learner.gradeLevel],
    difficulty: c.difficulty,
    estimatedWeeks: c.estimatedWeeks,
    estimatedBudgetBaht: c.estimatedBudgetBaht,
    requiredEquipment: c.requiredEquipment,
    minTeamSize: c.minTeamSize,
    maxTeamSize: c.maxTeamSize,
    requiredSkills: c.requiredSkills,
    ...(safety.length ? { safetyCategories: safety } : {}),
    starter: {
      origin: 'ai_fresh', problem: c.problem, roughDirection: c.roughDirection, interestLink: c.interestLink,
      fitNotes: c.fitNotes, safetyScreen: 'preliminary', noveltyChecked: false, requestId: request.requestId, generatedAt,
    },
  };
}

/**
 * One generation intent. Reserve quota BEFORE the model call (owner-serialized
 * in the store), never hold a DB transaction across the network call, charge
 * only accepted unique cards, and never substitute templates for failures.
 */
export async function generateFreshCards(store: FoundationStore, request: FreshCardsRequest, deps: FreshDeps = {}): Promise<FreshCardsResponse> {
  const ai = deps.ai ?? callAiStrict;
  const now = deps.now ?? (() => new Date());
  const fingerprint = intentFingerprint(request);
  const requestId = request.requestId;
  const batch = await reserve(store, requestId, fingerprint, request.count);
  if (batch === 'conflict') return { status: 'conflict', requestId, messageTh: CONFLICT_TH };
  if (batch === 'quota') { const quota = await store.cardQuota(); return { status: 'quota_exhausted', requestId, quota, messageTh: quotaExhaustedTh(quota) }; }
  if (!batch.claimed) {
    if (batch.state === 'complete') return { status: 'ok', source: 'ai', requestId, replayed: true, cards: batch.cards, accepted: batch.cards.length,
      requested: null, partial: false, rejected: null, quota: batch.quota, noticeTh: FRESH_NOTICE_TH };
    if (batch.state === 'pending') return { status: 'pending', requestId, leaseExpiresAt: batch.leaseExpiresAt, quota: batch.quota, messageTh: PENDING_TH };
    return { status: 'failed_intent', requestId, retryWithNewRequestId: true, quota: batch.quota, messageTh: FAILED_INTENT_TH };
  }
  const capacity = batch.reserved;
  const ledger = await loadLedger(store);
  const result = await ai({ schema: FreshModelOutputSchema, systemPrompt: FRESH_SYSTEM_PROMPT,
    prompt: buildFreshPrompt(request, capacity, promptContext(request, ledger)), timeoutMs: deps.timeoutMs ?? 45_000,
    maxTokens: 2_400, maxContentBytes: 32_768, temperature: 0.8 });
  const unavailable = async (code: FreshUnavailableCode, quota?: CardQuota): Promise<FreshCardsResponse> => {
    if (!quota) {
      try { quota = (await store.failBatch(batch.leaseId)).quota; }
      catch (e) {
        // An expired lease was already released by the store; nothing was charged.
        if (!(e instanceof PersistenceError && (e.status === 409 || e.status === 404))) throw e;
        quota = await store.cardQuota();
      }
    }
    return { status: 'unavailable', code, requestId: request.requestId, retryable: true, quota, messageTh: UNAVAILABLE_TH[code] };
  };
  if (!result.ok) return unavailable(FAILURE_CODE[result.reason] ?? 'AI_OUTPUT_UNUSABLE');
  const rejected: FreshRejections = { invalid: 0, unsupportedClaims: 0, repeats: 0 };
  const generatedAt = now().toISOString();
  const cards: TopicCard[] = [];
  for (const raw of result.data.cards) {
    const parsed = FreshCandidateSchema.safeParse(raw);
    if (!parsed.success) { rejected.invalid++; continue; }
    if (hasUnsupportedClaims(raw)) { rejected.unsupportedClaims++; continue; }
    const card = toCard(parsed.data, request, generatedAt);
    if ([...ledger, ...cards].some(other => isSemanticRepeat(ideaText(card), ideaText(other)))) { rejected.repeats++; continue; }
    cards.push(card);
    if (cards.length === capacity) break; // surplus model output is ignored, never charged
  }
  if (!cards.length) return unavailable('AI_OUTPUT_UNUSABLE');
  let done;
  try { done = await store.completeBatch(batch.leaseId, cards); }
  catch (e) {
    // The model outlived the reservation lease: the store already released it
    // without charge and fenced this worker. Report truthfully; never re-charge.
    if (e instanceof PersistenceError && (e.status === 409 || e.status === 404)) return unavailable('AI_TIMEOUT');
    throw e;
  }
  if (!done.cards.length) return unavailable('AI_OUTPUT_UNUSABLE', done.quota);
  rejected.repeats += cards.length - done.cards.length; // latest-ledger repeats caught at serialized/CAS acceptance
  return { status: 'ok', source: 'ai', requestId: request.requestId, replayed: false, cards: done.cards, accepted: done.cards.length,
    requested: capacity, partial: done.cards.length < capacity, rejected, quota: done.quota, noticeTh: FRESH_NOTICE_TH };
}
