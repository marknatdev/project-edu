/**
 * Fresh personalized starter-card API contract (client-safe; no server imports).
 * POST /api/discovery/cards  — generate up to 5 starter ideas for ONE intent.
 * GET  /api/discovery/cards  — current daily allowance (no generation).
 *
 * Identity never travels in this body: the server derives the owner from the
 * verified account session or the signed HttpOnly Guest capability.
 */
import { z } from 'zod';
import { GoalSchema, GradeLevelSchema } from '@/lib/schemas';
import type { TopicCard } from '@/types/domain';
import type { CardQuota } from '@/lib/persistence/contracts';

export const FRESH_LIMITS = {
  bodyBytes: 16_384,
  answers: 4,
  questionChars: 200,
  answerChars: 500,
  summaryChars: 600,
  refinementChars: 300,
  likedIds: 20,
  skippedIds: 40,
  seenIds: 100,
  idChars: 120,
  listItems: 15,
  listItemChars: 60,
} as const;

const text = (max: number) => z.string().trim().min(1).max(max);
const cardId = z.string().min(1).max(FRESH_LIMITS.idChars).regex(/^[A-Za-z0-9_-]+$/);

export const FreshCardsRequestSchema = z.object({
  /** Stable client UUID for ONE generation intent. Retrying the same intent
   * (double tap, network retry, reload) MUST reuse it; a new user retry after a
   * failure uses a new one. */
  requestId: z.string().uuid(),
  count: z.number().int().min(1).max(5).default(5),
  learner: z.object({
    gradeLevel: GradeLevelSchema,
    goal: GoalSchema.optional(),
    constraints: z.object({
      timeWeeks: z.number().int().min(1).max(104),
      budgetBaht: z.number().min(0).max(200_000),
      equipment: z.array(text(FRESH_LIMITS.listItemChars)).max(FRESH_LIMITS.listItems),
      teamSize: z.number().int().min(1).max(10),
      skills: z.array(text(FRESH_LIMITS.listItemChars)).max(FRESH_LIMITS.listItems),
    }).strict(),
  }).strict(),
  interest: z.object({
    answers: z.array(z.object({
      question: text(FRESH_LIMITS.questionChars),
      /** "ยังไม่รู้" is a valid answer; no minimum length/correctness check. */
      answer: text(FRESH_LIMITS.answerChars),
    }).strict()).min(1).max(FRESH_LIMITS.answers),
    summary: text(FRESH_LIMITS.summaryChars).optional(),
  }).strict(),
  refinement: z.object({
    text: text(FRESH_LIMITS.refinementChars).optional(),
    likedCardIds: z.array(cardId).max(FRESH_LIMITS.likedIds).default([]),
    skippedCardIds: z.array(cardId).max(FRESH_LIMITS.skippedIds).default([]),
  }).strict().optional(),
  /** Cards already shown in this browser (the server also checks its own ledger). */
  seenCardIds: z.array(cardId).max(FRESH_LIMITS.seenIds).default([]),
}).strict();
export type FreshCardsRequest = z.infer<typeof FreshCardsRequestSchema>;
export type FreshCardsRequestInput = z.input<typeof FreshCardsRequestSchema>;

export type FreshUnavailableCode = 'AI_UNCONFIGURED' | 'AI_UNAVAILABLE' | 'AI_TIMEOUT' | 'AI_OUTPUT_UNUSABLE';

export const FRESH_NOTICE_TH =
  'การ์ดเหล่านี้เป็นไอเดียตั้งต้นที่ AI สร้างจากคำตอบของคุณ ยังไม่ใช่โครงงานสำเร็จรูป ไม่รับรองว่าไม่มีใครทำมาก่อน และการตรวจความปลอดภัยเป็นเพียงการตรวจเบื้องต้น ต้องคิดต่อ ปรับ และอธิบายด้วยภาษาของคุณเอง';

export interface FreshRejections {
  /** Malformed / out-of-bounds / unknown subfield candidates. */
  invalid: number;
  /** Candidates asserting references, URLs, novelty or proven safety. */
  unsupportedClaims: number;
  /** Semantic or exact repeats of already-seen ideas or of each other. */
  repeats: number;
}

export type FreshCardsResponse =
  | { status: 'ok'; source: 'ai'; requestId: string; replayed: boolean; cards: TopicCard[]; accepted: number;
      requested: number | null; partial: boolean; rejected: FreshRejections | null; quota: CardQuota; noticeTh: string }
  | { status: 'pending'; requestId: string; leaseExpiresAt: string; quota: CardQuota; messageTh: string }
  | { status: 'unavailable'; code: FreshUnavailableCode; requestId: string; retryable: true; quota: CardQuota; messageTh: string }
  | { status: 'quota_exhausted'; requestId: string; quota: CardQuota; messageTh: string }
  | { status: 'failed_intent'; requestId: string; retryWithNewRequestId: true; quota: CardQuota; messageTh: string }
  | { status: 'conflict'; requestId: string; messageTh: string }
  | { status: 'rate_limited'; messageTh: string };
