import { describe, it, expect } from 'vitest';
import { FreshCardsRequestSchema } from '@/lib/discovery/fresh-contract';
import { buildFreshCardsRequest, createDiscoverySession, discoveryReducer, type FreshClientResult } from '@/lib/discovery/fresh-session';
import type { Interview, TopicCard } from '@/types/domain';
import type { CardQuota } from '@/lib/persistence/contracts';
import { createMemoryStorage, STORAGE_PREFIX } from '@/lib/storage/store';
import { DISCOVERY_SESSION_KEY, MAX_SAVED_CARDS, loadDiscoverySession, saveDiscoverySession } from '@/lib/discovery/fresh-session';

const interview: Interview = {
  id: 'i1', learnerId: 'l1', gradeLevel: 'm_plai', goal: 'classroom', hasInitialIdea: false, selectedTrack: 'discovery_track',
  completedAt: '2026-11-06T00:00:00.000Z',
  constraints: { timeWeeks: 6, budgetBaht: 1000, equipment: ['smartphone', 'computer'], teamSize: 2, skills: ['coding', 'data_math'] },
};
const RID = '11111111-1111-4111-8111-111111111111';

function interviewed() {
  let s = createDiscoverySession();
  s = discoveryReducer(s, { type: 'ANSWER', question: 'ช่วงนี้สนใจอะไร?', answer: 'ตู้ปลาที่บ้าน' });
  s = discoveryReducer(s, { type: 'ANSWER', question: 'อยากแก้ปัญหาอะไร?', answer: 'น้ำขุ่นเร็ว' });
  return s;
}

describe('discovery session: generation request (D2)', () => {
  it('reuses the interview constraints (as Thai labels), the interest answers and the edited summary', () => {
    let s = interviewed();
    expect(s.stage).toBe('summary');
    s = discoveryReducer(s, { type: 'SET_SUMMARY', summary: 'อยากทำให้น้ำในตู้ปลาใสนานขึ้น' });
    const body = buildFreshCardsRequest(s, interview, RID);
    expect(FreshCardsRequestSchema.safeParse(body).success).toBe(true);
    expect(body).toMatchObject({
      requestId: RID, count: 5,
      learner: { gradeLevel: 'm_plai', goal: 'classroom', constraints: { timeWeeks: 6, budgetBaht: 1000, teamSize: 2,
        equipment: ['สมาร์ตโฟน / แท็บเล็ต', 'คอมพิวเตอร์ / โน้ตบุ๊ก'], skills: ['การเขียนโค้ด / โปรแกรมมิ่ง', 'คณิตศาสตร์และการวิเคราะห์ข้อมูล'] } },
      interest: { answers: [{ question: 'ช่วงนี้สนใจอะไร?', answer: 'ตู้ปลาที่บ้าน' }, { question: 'อยากแก้ปัญหาอะไร?', answer: 'น้ำขุ่นเร็ว' }],
        summary: 'อยากทำให้น้ำในตู้ปลาใสนานขึ้น' },
      seenCardIds: [],
    });
    expect(body.refinement).toBeUndefined();
  });

  it('clamps out-of-range interview values to the API limits instead of failing', () => {
    const big: Interview = { ...interview, constraints: { ...interview.constraints, timeWeeks: 300, budgetBaht: 9_000_000,
      equipment: Array.from({ length: 20 }, (_, i) => `อุปกรณ์พิเศษ${i}`), skills: ['x'.repeat(90)] } };
    const body = buildFreshCardsRequest(interviewed(), big, RID);
    expect(FreshCardsRequestSchema.safeParse(body).success).toBe(true);
    expect(body.learner.constraints).toMatchObject({ timeWeeks: 104, budgetBaht: 200_000 });
    expect(body.learner.constraints.equipment).toHaveLength(15);
  });
});

const quota = (used: number): CardQuota => ({ day: '2026-11-06', used, reserved: 0, remaining: 35 - used,
  freeRemaining: Math.max(0, 5 - used), extraRemaining: Math.min(30, 35 - Math.max(5, used)), resetAt: '2026-11-06T17:00:00.000Z' });
const fresh = (n: number, subfieldId = 'sci_environment'): TopicCard => ({
  id: `fresh_${n}`, subjectId: 'science', subfieldId, title: `ไอเดีย ${n}`, phenomenon: `ปัญหา ${n}`, curiosityHook: 'เชื่อมกับตู้ปลา',
  targetGradeLevels: ['m_plai'], difficulty: 'beginner', estimatedWeeks: 4, estimatedBudgetBaht: 300, requiredEquipment: ['มือถือ'],
  minTeamSize: 1, maxTeamSize: 3, requiredSkills: ['สังเกต'],
  starter: { origin: 'ai_fresh', problem: `ปัญหา ${n}`, roughDirection: `ทดลอง ${n}`, interestLink: 'เชื่อมกับตู้ปลา', fitNotes: [],
    safetyScreen: 'preliminary', noveltyChecked: false, requestId: RID, generatedAt: '2026-11-06T01:00:00.000Z' },
});
const ok = (cards: TopicCard[], extra: Partial<Extract<FreshClientResult, { status: 'ok' }>> = {}): FreshClientResult => ({
  status: 'ok', source: 'ai', requestId: RID, replayed: false, cards, accepted: cards.length, requested: 5, partial: cards.length < 5,
  rejected: { invalid: 0, unsupportedClaims: 0, repeats: 5 - cards.length }, quota: quota(cards.length), noticeTh: 'notice', ...extra });

function started(s = interviewed()) {
  const body = buildFreshCardsRequest(s, interview, RID);
  return { s: discoveryReducer(s, { type: 'GENERATION_STARTED', requestId: RID, body }), body };
}

describe('discovery session: generation results (D2)', () => {
  it('adds accepted cards to the deck, reports a partial batch honestly and never duplicates a replay', () => {
    const { s } = started();
    expect(s.pending?.requestId).toBe(RID);
    const after = discoveryReducer(s, { type: 'GENERATION_RESULT', requestId: RID, result: ok([fresh(1), fresh(2), fresh(3)]) });
    expect(after).toMatchObject({ stage: 'deck', batch: ['fresh_1', 'fresh_2', 'fresh_3'], cursor: 0, pending: null, quota: quota(3) });
    expect(after.cards.map(c => c.id)).toEqual(['fresh_1', 'fresh_2', 'fresh_3']);
    expect(after.notice).toMatchObject({ kind: 'partial', accepted: 3, requested: 5 });
    expect(after.notice?.messageTh).toContain('3');
    const replay = discoveryReducer({ ...after, pending: s.pending }, { type: 'GENERATION_RESULT', requestId: RID,
      result: ok([fresh(1), fresh(2), fresh(3)], { replayed: true, requested: null, partial: false, rejected: null }) });
    expect(replay.cards).toHaveLength(3);
  });

  it('keeps answers and previous cards on every failure; same intent only where the server may already hold it', () => {
    const withCards = discoveryReducer(started().s, { type: 'GENERATION_RESULT', requestId: RID, result: ok([fresh(1)]) });
    const second = started({ ...withCards, refinement: 'เน้นใช้ของในบ้าน' }).s;
    const failures: Array<[FreshClientResult, 'same' | 'new']> = [
      [{ status: 'unavailable', code: 'AI_UNCONFIGURED', requestId: RID, retryable: true, quota: quota(1), messageTh: 'ยังไม่ได้เชื่อมต่อบริการ AI' }, 'new'],
      [{ status: 'failed_intent', requestId: RID, retryWithNewRequestId: true, quota: quota(1), messageTh: 'ล้มเหลว' }, 'new'],
      [{ status: 'quota_exhausted', requestId: RID, quota: quota(35), messageTh: 'ครบโควตา' }, 'new'],
      [{ status: 'network_error', messageTh: 'เชื่อมต่อไม่ได้' }, 'same'],
      [{ status: 'rate_limited', messageTh: 'ถี่เกินไป' }, 'same'],
      [{ status: 'pending', requestId: RID, leaseExpiresAt: '2026-11-06T01:02:00.000Z', quota: quota(1), messageTh: 'กำลังสร้าง' }, 'same'],
    ];
    for (const [result, retry] of failures) {
      const after = discoveryReducer(second, { type: 'GENERATION_RESULT', requestId: RID, result });
      expect(after.cards.map(c => c.id)).toEqual(['fresh_1']);
      expect(after.answers).toEqual(second.answers);
      expect(after.refinement).toBe('เน้นใช้ของในบ้าน');
      expect(after.notice?.retry).toBe(retry);
      expect(after.notice?.messageTh).toBe((result as { messageTh: string }).messageTh);
      // Same intent ⇒ the byte-identical stored body is kept for the retry.
      expect(after.pending).toEqual(retry === 'same' ? second.pending : null);
    }
  });

  it('ignores a late result for an intent that is no longer pending', () => {
    const s = interviewed();
    expect(discoveryReducer(s, { type: 'GENERATION_RESULT', requestId: RID, result: ok([fresh(9)]) }).cards).toHaveLength(0);
  });
});

function deckOf(cards: TopicCard[]) {
  return discoveryReducer(started().s, { type: 'GENERATION_RESULT', requestId: RID, result: ok(cards) });
}

describe('discovery session: swipes, shortlist, compare and refinement (D2)', () => {
  it('like adds to the shortlist, skip moves on without removing other cards of the same subject, undo restores', () => {
    let s = deckOf([fresh(1), fresh(2), fresh(3), fresh(4), fresh(5)]);
    s = discoveryReducer(s, { type: 'SWIPE', action: 'skip' });
    expect(s.cursor).toBe(1);
    // One skip is not a subject veto: the rest of the same-subfield batch stays.
    expect(s.batch).toEqual(['fresh_1', 'fresh_2', 'fresh_3', 'fresh_4', 'fresh_5']);
    expect(s.cards).toHaveLength(5);
    s = discoveryReducer(s, { type: 'SWIPE', action: 'like' });
    expect(s.shortlist).toEqual(['fresh_2']);
    s = discoveryReducer(s, { type: 'UNDO' });
    expect(s).toMatchObject({ cursor: 1, shortlist: [] });
    expect(s.reactions.map(r => r.action)).toEqual(['skip']);
  });

  it('caps the shortlist at 5, compares exactly 2 and selects any saved card', () => {
    let s = deckOf([fresh(1), fresh(2), fresh(3), fresh(4), fresh(5)]);
    for (let i = 0; i < 5; i++) s = discoveryReducer(s, { type: 'SWIPE', action: 'like' });
    expect(s.shortlist).toHaveLength(5);
    expect(s.stage).toBe('shortlist');
    s = discoveryReducer({ ...s, cards: [...s.cards, fresh(6)] }, { type: 'ADD_SHORTLIST', id: 'fresh_6' });
    expect(s.shortlist).toHaveLength(5);
    for (const id of ['fresh_1', 'fresh_2', 'fresh_3']) s = discoveryReducer(s, { type: 'TOGGLE_COMPARE', id });
    expect(s.compare).toEqual(['fresh_1', 'fresh_2']);
    s = discoveryReducer(s, { type: 'REMOVE_SHORTLIST', id: 'fresh_1' });
    expect(s.compare).toEqual(['fresh_2']);
    expect(s.cards.some(c => c.id === 'fresh_1')).toBe(true); // removed from shortlist, still saved
    s = discoveryReducer(s, { type: 'SELECT', id: 'fresh_6' });
    expect(s.selectedId).toBe('fresh_6');
    expect(discoveryReducer(s, { type: 'SELECT', id: 'sci-phy-01' }).selectedId).toBe('fresh_6'); // only own generated cards
  });

  it('asks for more using likes, skips, typed refinement and every seen idea', () => {
    let s = deckOf([fresh(1), fresh(2), fresh(3)]);
    s = discoveryReducer(s, { type: 'SWIPE', action: 'like' });
    s = discoveryReducer(s, { type: 'SWIPE', action: 'skip' });
    s = discoveryReducer(s, { type: 'SET_REFINEMENT', refinement: 'อยากใช้ของในบ้าน ไม่ต้องซื้ออุปกรณ์เพิ่ม' });
    const body = buildFreshCardsRequest(s, interview, '22222222-2222-4222-8222-222222222222');
    expect(FreshCardsRequestSchema.safeParse(body).success).toBe(true);
    expect(body.refinement).toEqual({ text: 'อยากใช้ของในบ้าน ไม่ต้องซื้ออุปกรณ์เพิ่ม', likedCardIds: ['fresh_1'], skippedCardIds: ['fresh_2'] });
    expect(body.seenCardIds).toEqual(['fresh_1', 'fresh_2', 'fresh_3']);
  });

  it('restarting the interview keeps generated cards, shortlist and the real quota', () => {
    let s = deckOf([fresh(1), fresh(2)]);
    s = discoveryReducer(s, { type: 'SWIPE', action: 'like' });
    s = discoveryReducer(s, { type: 'RESTART_INTERVIEW' });
    expect(s).toMatchObject({ stage: 'chat', answers: [], summary: '', refinement: '', pending: null, shortlist: ['fresh_1'], quota: quota(2) });
    expect(s.cards).toHaveLength(2);
  });
});

describe('discovery session: refresh resume (D2)', () => {
  it('round-trips the whole session (answers, cards, swipes, shortlist, pending intent) under the app storage prefix', () => {
    const storage = createMemoryStorage();
    let s = deckOf([fresh(1), fresh(2), fresh(3)]);
    s = discoveryReducer(s, { type: 'SWIPE', action: 'like' });
    s = discoveryReducer(s, { type: 'SET_REFINEMENT', refinement: 'อยากลองเรื่องน้ำ' });
    s = started(s).s;
    saveDiscoverySession(s, storage);
    expect(storage.getItem(DISCOVERY_SESSION_KEY)).not.toBeNull();
    expect(DISCOVERY_SESSION_KEY.startsWith(STORAGE_PREFIX)).toBe(true); // erased by wipeAllLearnerData
    const loaded = loadDiscoverySession(storage);
    expect(loaded.corrupt).toBe(false);
    expect(loaded.session).toEqual(s);
  });

  it('rejects corrupt or tampered data without inventing cards, and drops dangling references', () => {
    const storage = createMemoryStorage();
    storage.setItem(DISCOVERY_SESSION_KEY, '{not json');
    expect(loadDiscoverySession(storage)).toEqual({ session: createDiscoverySession(), corrupt: true });
    const s = { ...deckOf([fresh(1)]), shortlist: ['fresh_1', 'ghost'], compare: ['ghost'], selectedId: 'ghost' };
    storage.setItem(DISCOVERY_SESSION_KEY, JSON.stringify(s));
    const loaded = loadDiscoverySession(storage).session;
    expect(loaded).toMatchObject({ shortlist: ['fresh_1'], compare: [], selectedId: null });
    storage.setItem(DISCOVERY_SESSION_KEY, JSON.stringify({ ...s, cards: [{ id: 'fresh_x', title: 'ไม่ครบ' }] }));
    expect(loadDiscoverySession(storage)).toEqual({ session: createDiscoverySession(), corrupt: true });
  });

  it('returns a fresh session when nothing is stored', () => {
    expect(loadDiscoverySession(createMemoryStorage())).toEqual({ session: createDiscoverySession(), corrupt: false });
  });
});

describe('discovery session: bounded local history (D2)', () => {
  it('keeps at most MAX_SAVED_CARDS, dropping the oldest unshortlisted cards first', () => {
    let s = deckOf([fresh(1), fresh(2)]);
    s = discoveryReducer(s, { type: 'SWIPE', action: 'like' }); // fresh_1 shortlisted
    s = { ...s, cards: [...s.cards, ...Array.from({ length: MAX_SAVED_CARDS }, (_, i) => fresh(100 + i))] };
    s = started(s).s;
    s = discoveryReducer(s, { type: 'GENERATION_RESULT', requestId: RID, result: ok([fresh(900)]) });
    expect(s.cards).toHaveLength(MAX_SAVED_CARDS);
    expect(s.cards.some(c => c.id === 'fresh_1')).toBe(true);
    expect(s.cards.some(c => c.id === 'fresh_2')).toBe(false);
    expect(s.cards.at(-1)?.id).toBe('fresh_900');
  });
});
