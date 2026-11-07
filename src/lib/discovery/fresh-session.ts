/**
 * Personalized Discovery session (client-safe): interest chat → editable
 * summary → fresh generated card deck → shortlist/compare → coaching handoff.
 *
 * Pure reducer + request builder + local persistence. Server stays the
 * authority for quota, idempotency and accepted card snapshots; this state
 * only remembers what the learner saw and did so a refresh resumes exactly.
 * Nothing here fabricates cards: only accepted `/api/discovery/cards`
 * results enter `cards`.
 */
import { z } from 'zod';
import { EQUIPMENT_OPTIONS, SKILL_OPTIONS } from '@/lib/interview/routing';
import { TopicCardSchema } from '@/lib/schemas';
import { STORAGE_PREFIX, type StorageAdapter } from '@/lib/storage/store';
import { FRESH_LIMITS, FreshCardsRequestSchema, type FreshCardsRequest, type FreshCardsResponse } from './fresh-contract';
import { interestSummaryDraft, isInterviewComplete, type InterestAnswer } from './interest-interview';
import type { Interview, TopicCard } from '@/types/domain';
import type { CardQuota } from '@/lib/persistence/contracts';

export type DiscoveryStage = 'chat' | 'summary' | 'deck' | 'shortlist' | 'compare' | 'saved';

export interface GenerationNotice {
  kind: 'success' | 'partial' | 'pending' | 'error' | 'quota';
  messageTh: string;
  accepted?: number;
  requested?: number | null;
  /** 'same' = resend the stored pending intent unchanged; 'new' = a fresh intent (new requestId). */
  retry: 'same' | 'new' | null;
}

/** Browser view of one `/api/discovery/cards` call, including transport failures. */
export type FreshClientResult =
  | FreshCardsResponse
  | { status: 'network_error'; messageTh: string }
  | { status: 'http_error'; httpStatus: number; messageTh: string };

export interface DiscoverySession {
  version: 1;
  stage: DiscoveryStage;
  answers: InterestAnswer[];
  answerDraft: string;
  summary: string;
  refinement: string;
  cards: TopicCard[];
  batch: string[];
  cursor: number;
  reactions: Array<{ id: string; action: 'like' | 'skip'; addedToShortlist: boolean; batch: string[]; cursor: number }>;
  shortlist: string[];
  compare: string[];
  selectedId: string | null;
  pending: { requestId: string; body: FreshCardsRequest } | null;
  quota: CardQuota | null;
  notice: GenerationNotice | null;
}

export type DiscoveryAction =
  | { type: 'ANSWER'; question: string; answer: string }
  | { type: 'SET_SUMMARY'; summary: string }
  | { type: 'GENERATION_STARTED'; requestId: string; body: FreshCardsRequest }
  | { type: 'GENERATION_RESULT'; requestId: string; result: FreshClientResult }
  | { type: 'SET_DRAFT'; draft: string }
  | { type: 'SET_REFINEMENT'; refinement: string }
  | { type: 'GO'; stage: DiscoveryStage }
  | { type: 'QUOTA'; quota: CardQuota }
  | { type: 'DISMISS_NOTICE' }
  | { type: 'SWIPE'; action: 'like' | 'skip' }
  | { type: 'UNDO' }
  | { type: 'ADD_SHORTLIST'; id: string }
  | { type: 'REMOVE_SHORTLIST'; id: string }
  | { type: 'TOGGLE_COMPARE'; id: string }
  | { type: 'SELECT'; id: string }
  | { type: 'RESTART_INTERVIEW' }
  | { type: 'RESTORE'; session: DiscoverySession };

export function createDiscoverySession(): DiscoverySession {
  return { version: 1, stage: 'chat', answers: [], answerDraft: '', summary: '', refinement: '', cards: [], batch: [], cursor: 0,
    reactions: [], shortlist: [], compare: [], selectedId: null, pending: null, quota: null, notice: null };
}

const clip = (value: string, max: number) => value.trim().slice(0, max);

function applyResult(state: DiscoverySession, result: FreshClientResult): DiscoverySession {
  const quota = 'quota' in result ? result.quota : state.quota;
  switch (result.status) {
    case 'ok': {
      const known = new Set(state.cards.map(c => c.id));
      const added = result.cards.filter(c => !known.has(c.id));
      const partial = result.requested !== null && result.accepted < result.requested;
      const messageTh = result.replayed
        ? `ได้การ์ดชุดเดิม ${result.accepted} ใบกลับมา (ไม่สร้างซ้ำและไม่หักโควตาซ้ำ)`
        : partial
          ? `AI สร้างการ์ดที่ผ่านเกณฑ์ ${result.accepted} จาก ${result.requested} ใบ หักโควตาเฉพาะ ${result.accepted} ใบที่ผ่าน และไม่เติมด้วยการ์ดสำเร็จรูป`
          : `AI สร้างการ์ดใหม่ ${result.accepted} ใบจากคำตอบของคุณ`;
      const keep = new Set([...state.shortlist, ...(state.selectedId ? [state.selectedId] : []), ...result.cards.map(c => c.id)]);
      let cards = [...state.cards, ...added];
      while (cards.length > MAX_SAVED_CARDS) {
        const drop = cards.findIndex(c => !keep.has(c.id));
        if (drop < 0) break;
        cards = [...cards.slice(0, drop), ...cards.slice(drop + 1)];
      }
      const ids = new Set(cards.map(c => c.id));
      return { ...state, quota, pending: null, cards, reactions: state.reactions.filter(r => ids.has(r.id)), batch: result.cards.map(c => c.id), cursor: 0, stage: 'deck',
        notice: { kind: partial ? 'partial' : 'success', messageTh, accepted: result.accepted, requested: result.requested, retry: null } };
    }
    case 'pending':
    case 'rate_limited':
    case 'network_error':
    case 'http_error':
      // The server may already hold (or be generating) this intent: only the
      // identical body + requestId may be resent, so it can never double-charge.
      return { ...state, quota, notice: { kind: result.status === 'pending' ? 'pending' : 'error', messageTh: result.messageTh, retry: 'same' } };
    case 'quota_exhausted':
      return { ...state, quota, pending: null, notice: { kind: 'quota', messageTh: result.messageTh, retry: 'new' } };
    case 'unavailable':
    case 'failed_intent':
    case 'conflict':
      return { ...state, quota, pending: null, notice: { kind: 'error', messageTh: result.messageTh, retry: 'new' } };
  }
}

export function discoveryReducer(state: DiscoverySession, action: DiscoveryAction): DiscoverySession {
  switch (action.type) {
    case 'ANSWER': {
      const answer = clip(action.answer, FRESH_LIMITS.answerChars);
      if (!answer || state.answers.length >= FRESH_LIMITS.answers) return state;
      const answers = [...state.answers, { question: clip(action.question, FRESH_LIMITS.questionChars), answer }];
      const done = isInterviewComplete(answers);
      return { ...state, answers, answerDraft: '', ...(done ? { stage: 'summary' as const, summary: clip(interestSummaryDraft(answers), FRESH_LIMITS.summaryChars) } : {}) };
    }
    case 'SET_SUMMARY':
      return { ...state, summary: action.summary.slice(0, FRESH_LIMITS.summaryChars) };
    case 'GENERATION_STARTED':
      return { ...state, pending: { requestId: action.requestId, body: action.body }, notice: null };
    case 'GENERATION_RESULT':
      if (state.pending?.requestId !== action.requestId) return state; // stale/late answer for another intent
      return applyResult(state, action.result);
    case 'SET_DRAFT':
      return { ...state, answerDraft: action.draft.slice(0, FRESH_LIMITS.answerChars) };
    case 'SET_REFINEMENT':
      return { ...state, refinement: action.refinement.slice(0, FRESH_LIMITS.refinementChars) };
    case 'GO':
      return { ...state, stage: action.stage };
    case 'QUOTA':
      return { ...state, quota: action.quota };
    case 'DISMISS_NOTICE':
      return { ...state, notice: null };
    case 'SWIPE': {
      const id = state.batch[state.cursor];
      if (!id) return state;
      const addedToShortlist = action.action === 'like' && !state.shortlist.includes(id);
      if (addedToShortlist && state.shortlist.length >= MAX_SHORTLIST) return state; // UI explains; never drop a saved pick
      const shortlist = addedToShortlist ? [...state.shortlist, id] : state.shortlist;
      return { ...state, shortlist, cursor: state.cursor + 1,
        reactions: [...state.reactions, { id, action: action.action, addedToShortlist, batch: state.batch, cursor: state.cursor }],
        stage: addedToShortlist && shortlist.length === MAX_SHORTLIST ? 'shortlist' : state.stage };
    }
    case 'UNDO': {
      const last = state.reactions.at(-1);
      if (!last || last.batch.join(',') !== state.batch.join(',')) return state; // only within the current batch
      return { ...state, reactions: state.reactions.slice(0, -1), cursor: last.cursor, stage: 'deck',
        shortlist: last.addedToShortlist ? state.shortlist.filter(x => x !== last.id) : state.shortlist,
        compare: last.addedToShortlist ? state.compare.filter(x => x !== last.id) : state.compare };
    }
    case 'ADD_SHORTLIST':
      if (state.shortlist.includes(action.id) || state.shortlist.length >= MAX_SHORTLIST || !state.cards.some(c => c.id === action.id)) return state;
      return { ...state, shortlist: [...state.shortlist, action.id] };
    case 'REMOVE_SHORTLIST':
      return { ...state, shortlist: state.shortlist.filter(x => x !== action.id), compare: state.compare.filter(x => x !== action.id) };
    case 'TOGGLE_COMPARE':
      if (state.compare.includes(action.id)) return { ...state, compare: state.compare.filter(x => x !== action.id) };
      if (state.compare.length >= 2 || !state.shortlist.includes(action.id)) return state;
      return { ...state, compare: [...state.compare, action.id] };
    case 'SELECT':
      return state.cards.some(c => c.id === action.id) ? { ...state, selectedId: action.id } : state;
    case 'RESTORE':
      return action.session;
    case 'RESTART_INTERVIEW':
      // Generated cards, swipes, shortlist and the server quota stay: a new
      // interview never renews the daily allowance.
      return { ...state, stage: 'chat', answers: [], answerDraft: '', summary: '', refinement: '', pending: null, notice: null };
  }
}

export const MAX_SHORTLIST = 5;
/** 35 accepted per day; keep several days of history on this device. */
export const MAX_SAVED_CARDS = 200;

const label = (options: ReadonlyArray<{ id: string; labelTh: string }>, value: string) => options.find(o => o.id === value)?.labelTh ?? value;
const list = (values: string[], options: ReadonlyArray<{ id: string; labelTh: string }>) =>
  [...new Set(values.map(v => clip(label(options, v), FRESH_LIMITS.listItemChars)).filter(Boolean))].slice(0, FRESH_LIMITS.listItems);
const bound = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(n)));

/** Exact body for ONE generation intent. Store it with its requestId; a retry
 * of the same intent must resend this identical body. */
export function buildFreshCardsRequest(state: DiscoverySession, interview: Interview, requestId: string): FreshCardsRequest {
  const c = interview.constraints;
  const summary = clip(state.summary, FRESH_LIMITS.summaryChars);
  const text = clip(state.refinement, FRESH_LIMITS.refinementChars);
  const liked = [...new Set([...state.reactions.filter(r => r.action === 'like').map(r => r.id), ...state.shortlist])];
  const skipped = [...new Set(state.reactions.filter(r => r.action === 'skip' && !liked.includes(r.id)).map(r => r.id))];
  const refine = state.cards.length > 0 || text;
  return {
    requestId, count: 5,
    learner: { gradeLevel: interview.gradeLevel, goal: interview.goal, constraints: {
      timeWeeks: bound(c.timeWeeks, 1, 104), budgetBaht: Math.min(200_000, Math.max(0, c.budgetBaht)), teamSize: bound(c.teamSize, 1, 10),
      equipment: list(c.equipment, EQUIPMENT_OPTIONS), skills: list(c.skills, SKILL_OPTIONS) } },
    interest: { answers: state.answers.slice(0, FRESH_LIMITS.answers), ...(summary ? { summary } : {}) },
    ...(refine ? { refinement: { ...(text ? { text } : {}), likedCardIds: liked.slice(-FRESH_LIMITS.likedIds),
      skippedCardIds: skipped.slice(-FRESH_LIMITS.skippedIds) } } : {}),
    seenCardIds: state.cards.map(card => card.id).slice(-FRESH_LIMITS.seenIds),
  };
}

// ---------------- Local persistence (refresh / reopen resume) ----------------
export const DISCOVERY_SESSION_KEY = `${STORAGE_PREFIX}discovery-fresh:v1`;
const QuotaSchema = z.object({ day: z.string(), used: z.number().int().min(0).max(35), reserved: z.number().int().min(0).max(35),
  remaining: z.number().int().min(0).max(35), freeRemaining: z.number().int().min(0).max(5), extraRemaining: z.number().int().min(0).max(30), resetAt: z.string() });
const SessionSchema = z.object({
  version: z.literal(1),
  stage: z.enum(['chat', 'summary', 'deck', 'shortlist', 'compare', 'saved']),
  answers: z.array(z.object({ question: z.string().max(FRESH_LIMITS.questionChars), answer: z.string().max(FRESH_LIMITS.answerChars) })).max(FRESH_LIMITS.answers),
  answerDraft: z.string().max(FRESH_LIMITS.answerChars),
  summary: z.string().max(FRESH_LIMITS.summaryChars),
  refinement: z.string().max(FRESH_LIMITS.refinementChars),
  // Only fresh generated snapshots with full starter metadata are accepted.
  cards: z.array(TopicCardSchema.refine(c => c.starter?.origin === 'ai_fresh')).max(MAX_SAVED_CARDS),
  batch: z.array(z.string()).max(5),
  cursor: z.number().int().min(0),
  reactions: z.array(z.object({ id: z.string(), action: z.enum(['like', 'skip']), addedToShortlist: z.boolean(),
    batch: z.array(z.string()).max(5), cursor: z.number().int().min(0) })).max(MAX_SAVED_CARDS),
  shortlist: z.array(z.string()),
  compare: z.array(z.string()),
  selectedId: z.string().nullable(),
  pending: z.object({ requestId: z.string().uuid(), body: FreshCardsRequestSchema }).nullable(),
  quota: QuotaSchema.nullable(),
  notice: z.object({ kind: z.enum(['success', 'partial', 'pending', 'error', 'quota']), messageTh: z.string().max(600),
    accepted: z.number().int().optional(), requested: z.number().int().nullable().optional(), retry: z.enum(['same', 'new']).nullable() }).nullable(),
}).strict();

export function loadDiscoverySession(storage: StorageAdapter): { session: DiscoverySession; corrupt: boolean } {
  let raw: string | null;
  try { raw = storage.getItem(DISCOVERY_SESSION_KEY); } catch { return { session: createDiscoverySession(), corrupt: true }; }
  if (!raw) return { session: createDiscoverySession(), corrupt: false };
  try {
    const parsed = SessionSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return { session: createDiscoverySession(), corrupt: true };
    const s = parsed.data as DiscoverySession;
    const ids = new Set(s.cards.map(c => c.id));
    const batch = s.batch.filter(id => ids.has(id));
    const shortlist = [...new Set(s.shortlist)].filter(id => ids.has(id)).slice(0, MAX_SHORTLIST);
    return { corrupt: false, session: { ...s, batch, cursor: Math.min(s.cursor, batch.length), shortlist,
      compare: s.compare.filter(id => shortlist.includes(id)).slice(0, 2), selectedId: s.selectedId && ids.has(s.selectedId) ? s.selectedId : null,
      reactions: s.reactions.filter(r => ids.has(r.id)) } };
  } catch { return { session: createDiscoverySession(), corrupt: true }; }
}

/** Throws when the browser refuses to store (quota/private mode): the UI must warn. */
export function saveDiscoverySession(state: DiscoverySession, storage: StorageAdapter): void {
  storage.setItem(DISCOVERY_SESSION_KEY, JSON.stringify(state));
}
