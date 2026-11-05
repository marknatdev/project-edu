import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { callAiGateway } from '@/lib/ai/gateway';
import {
  quotaStore,
  getQuotaExceededMessage,
  DAILY_LIMITS,
} from '@/lib/ai/quota';
import {
  createInitialCoachState,
  nextCoachTurn,
} from '@/lib/ai/socratic-coach';
import { POST as coachRoute } from '@/app/api/ai/coach/route';
import { POST as cardsGenerateRoute } from '@/app/api/ai/cards/generate/route';
import { POST as evaluateRoute } from '@/app/api/ai/evaluate/route';
import { POST as pivotRoute } from '@/app/api/ai/pivot/route';
import type { Idea, Constraints } from '@/types/domain';

describe('AI Gateway (ADR 0001)', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  const dummySchema = z.object({
    message: z.string(),
    count: z.number(),
  });

  const fallbackData = {
    message: 'fallback response',
    count: 42,
  };

  it('detects unconfigured env and returns fallback without calling fetch', async () => {
    vi.stubEnv('AI_BASE_URL', '');
    vi.stubEnv('AI_API_KEY', '');
    vi.stubEnv('AI_MODEL', '');

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await callAiGateway({
      schema: dummySchema,
      prompt: 'Hello AI',
      fallback: () => fallbackData,
    });

    expect(result.source).toBe('fallback');
    expect(result.data).toEqual(fallbackData);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('calls OpenAI-compatible API when configured and parses valid response', async () => {
    vi.stubEnv('AI_BASE_URL', 'http://localhost:20128/v1');
    vi.stubEnv('AI_API_KEY', 'test-key');
    vi.stubEnv('AI_MODEL', 'test-model');

    const mockAiResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({ message: 'from AI', count: 99 }),
          },
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockAiResponse,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await callAiGateway({
      schema: dummySchema,
      prompt: 'Test prompt',
      fallback: () => fallbackData,
    });

    expect(result.source).toBe('ai');
    expect(result.data).toEqual({ message: 'from AI', count: 99 });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:20128/v1/chat/completions');
    expect(options.method).toBe('POST');
    expect(options.headers['Authorization']).toBe('Bearer test-key');
  });

  it('falls back gracefully when fetch rejects (network error)', async () => {
    vi.stubEnv('AI_BASE_URL', 'http://localhost:20128/v1');
    vi.stubEnv('AI_API_KEY', 'test-key');
    vi.stubEnv('AI_MODEL', 'test-model');

    const fetchMock = vi.fn().mockRejectedValue(new Error('Connection refused'));
    vi.stubGlobal('fetch', fetchMock);

    const result = await callAiGateway({
      schema: dummySchema,
      prompt: 'Test prompt',
      fallback: () => fallbackData,
    });

    expect(result.source).toBe('fallback');
    expect(result.data).toEqual(fallbackData);
  });

  it('falls back gracefully on non-2xx status code', async () => {
    vi.stubEnv('AI_BASE_URL', 'http://localhost:20128/v1');
    vi.stubEnv('AI_API_KEY', 'test-key');
    vi.stubEnv('AI_MODEL', 'test-model');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Internal Server Error',
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await callAiGateway({
      schema: dummySchema,
      prompt: 'Test prompt',
      fallback: () => fallbackData,
    });

    expect(result.source).toBe('fallback');
    expect(result.data).toEqual(fallbackData);
  });

  it('falls back gracefully on malformed JSON or Zod validation failure', async () => {
    vi.stubEnv('AI_BASE_URL', 'http://localhost:20128/v1');
    vi.stubEnv('AI_API_KEY', 'test-key');
    vi.stubEnv('AI_MODEL', 'test-model');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: 'not valid json at all!',
            },
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await callAiGateway({
      schema: dummySchema,
      prompt: 'Test prompt',
      fallback: () => fallbackData,
    });

    expect(result.source).toBe('fallback');
    expect(result.data).toEqual(fallbackData);
  });
});

describe('Per-Learner Daily Quota Engine', () => {
  const learnerA = 'anon-learner-aaa';
  const learnerB = 'anon-learner-bbb';

  beforeEach(async () => {
    await quotaStore.reset();
  });

  it('enforces daily limits: 30 cards, 5 evaluations, 2 proposals', async () => {
    expect(DAILY_LIMITS.cards).toBe(30);
    expect(DAILY_LIMITS.evaluate).toBe(5);
    expect(DAILY_LIMITS.proposal).toBe(2);

    // Consume 30 cards successfully
    const c1 = await quotaStore.consume(learnerA, 'cards', 30);
    expect(c1.allowed).toBe(true);
    expect(c1.record.remaining).toBe(0);

    // 31st card rejected
    const c2 = await quotaStore.consume(learnerA, 'cards', 1);
    expect(c2.allowed).toBe(false);
    expect(c2.record.remaining).toBe(0);

    // Evaluate: 5 allowed, 6th rejected
    for (let i = 0; i < 5; i++) {
      const e = await quotaStore.consume(learnerA, 'evaluate', 1);
      expect(e.allowed).toBe(true);
    }
    const e6 = await quotaStore.consume(learnerA, 'evaluate', 1);
    expect(e6.allowed).toBe(false);

    // Proposal: 2 allowed, 3rd rejected
    const p1 = await quotaStore.consume(learnerA, 'proposal', 1);
    const p2 = await quotaStore.consume(learnerA, 'proposal', 1);
    const p3 = await quotaStore.consume(learnerA, 'proposal', 1);
    expect(p1.allowed).toBe(true);
    expect(p2.allowed).toBe(true);
    expect(p3.allowed).toBe(false);
  });

  it('isolates quotas by anonymous learner ID', async () => {
    await quotaStore.consume(learnerA, 'evaluate', 5);
    const checkA = await quotaStore.check(learnerA, 'evaluate');
    expect(checkA.remaining).toBe(0);

    const checkB = await quotaStore.check(learnerB, 'evaluate');
    expect(checkB.remaining).toBe(5);

    const bConsume = await quotaStore.consume(learnerB, 'evaluate', 1);
    expect(bConsume.allowed).toBe(true);
  });

  it('resets quota when date changes in Asia/Bangkok time (UTC+7)', async () => {
    const day1 = new Date('2026-11-05T10:00:00Z'); // 17:00 Bangkok
    const day2 = new Date('2026-11-06T10:00:00Z'); // 17:00 Bangkok next day

    const res1 = await quotaStore.consume(learnerA, 'proposal', 2, day1);
    expect(res1.allowed).toBe(true);

    const blockedDay1 = await quotaStore.consume(learnerA, 'proposal', 1, day1);
    expect(blockedDay1.allowed).toBe(false);

    // On day 2, quota resets
    const day2Check = await quotaStore.check(learnerA, 'proposal', day2);
    expect(day2Check.used).toBe(0);
    expect(day2Check.remaining).toBe(2);

    const allowedDay2 = await quotaStore.consume(learnerA, 'proposal', 1, day2);
    expect(allowedDay2.allowed).toBe(true);
  });

  it('returns informative Thai messages for exceeded quotas', () => {
    expect(getQuotaExceededMessage('cards')).toContain('30 ใบ');
    expect(getQuotaExceededMessage('evaluate')).toContain('5 ครั้ง');
    expect(getQuotaExceededMessage('proposal')).toContain('2 ครั้ง');
  });
});

describe('Socratic Coach State Machine (ADR 0002)', () => {
  const anonId = 'anon-learner-socratic';

  it('initializes with Tier 1 unlocked, 0 turns, and all aspects incomplete', () => {
    const state = createInitialCoachState(anonId, 'idea-123');
    expect(state.turnCount).toBe(0);
    expect(state.unlockedTiers).toEqual([1]);
    expect(state.isComplete).toBe(false);
    expect(state.aspectProgress).toEqual({
      problem: false,
      objective: false,
      methodology: false,
      measurement: false,
    });
  });

  it('defaults to Tier 1 SOCRATIC_QUESTION and never provides answers', async () => {
    const state = createInitialCoachState(anonId);
    const turn = await nextCoachTurn(state, {});

    expect(turn.tier).toBe(1);
    expect(turn.aspect).toBe('problem');
    expect(turn.content.length).toBeGreaterThan(10);
    expect(turn.examples).toBeUndefined();
    expect(state.turnCount).toBe(1);
  });

  it('enforces Tier 3 lock: downgrades to Tier 2 if Tier 3 requested before Tier 1 & 2 shown', async () => {
    const state = createInitialCoachState(anonId);

    // Direct request for Tier 3 without any prior turns
    const turn1 = await nextCoachTurn(state, { requestedTier: 3 });
    // Tier 1 was not even shown, or Tier 2 not shown: must not give Tier 3!
    expect(turn1.tier).not.toBe(3);
    expect(turn1.examples).toBeUndefined();
    expect(turn1.tierDowngraded).toBe(true);
  });

  it('unlocks Tier 3 LAST_RESORT_EXAMPLES only after Tier 1 and Tier 2 have been shown', async () => {
    const state = createInitialCoachState(anonId);

    // Turn 1: Tier 1
    const turn1 = await nextCoachTurn(state, { requestedTier: 1 });
    expect(turn1.tier).toBe(1);

    // Turn 2: Tier 2 (thinking lens)
    const turn2 = await nextCoachTurn(state, {
      requestedTier: 2,
      learnerResponse: 'ฉันตอบปัญหาได้แล้วว่าเกี่ยวกับขยะพลาสติก',
    });
    expect(turn2.tier).toBe(2);
    expect(turn2.lenses).toBeDefined();

    // Now that both Tier 1 and Tier 2 have been shown in history, Tier 3 can be unlocked!
    const turn3 = await nextCoachTurn(state, {
      requestedTier: 3,
      learnerResponse: 'ยังคิดวิธีทำไม่ออกเลย ขอตัวอย่างหน่อย',
    });
    expect(turn3.tier).toBe(3);
    expect(turn3.examples).toBeDefined();
    expect(turn3.examples?.length).toBeGreaterThan(0);
    expect(turn3.tierDowngraded).toBeFalsy();
  });

  it('tracks all 4 aspects (problem, objective, methodology, measurement) and targets next unfilled', async () => {
    const state = createInitialCoachState(anonId);

    // Turn 1 asks problem
    const t1 = await nextCoachTurn(state, {});
    expect(t1.aspect).toBe('problem');

    // Turn 2: learner answers problem, coach targets objective
    const t2 = await nextCoachTurn(state, {
      learnerResponse: 'ปัญหาคือผักตบชวาในคลองเยอะเกินไป',
    });
    expect(state.aspectProgress.problem).toBe(true);
    expect(t2.aspect).toBe('objective');

    // Turn 3: learner answers objective, coach targets methodology
    const t3 = await nextCoachTurn(state, {
      learnerResponse: 'อยากทำเป็นกระถางเพาะชำย่อยสลายได้',
    });
    expect(state.aspectProgress.objective).toBe(true);
    expect(t3.aspect).toBe('methodology');

    // Turn 4: learner answers methodology, coach targets measurement
    const t4 = await nextCoachTurn(state, {
      learnerResponse: 'ตากแห้ง บดละเอียด และผสมแป้งมันสำปะหลังขึ้นรูป',
    });
    expect(state.aspectProgress.methodology).toBe(true);
    expect(t4.aspect).toBe('measurement');

    // Turn 5: learner answers measurement, all 4 complete!
    const t5 = await nextCoachTurn(state, {
      learnerResponse: 'วัดระยะเวลาการย่อยสลายในดินและอัตราการเจริญเติบโตของต้นกล้า',
    });
    expect(state.aspectProgress.measurement).toBe(true);
    expect(state.isComplete).toBe(true);
    expect(t5.aspect).toBe('completed');
  });

  it('enforces 8-question cap on Idea Track', async () => {
    const state = createInitialCoachState(anonId);

    // Learner continues exploring multiple turns without all aspects completed
    for (let i = 0; i < 8; i++) {
      await nextCoachTurn(state, {
        targetAspect: 'problem',
      });
    }

    expect(state.turnCount).toBe(8);
    expect(state.isComplete).toBe(true);

    // 9th call should not generate further questions
    const overTurn = await nextCoachTurn(state, {
      learnerResponse: 'คำตอบที่ 9',
    });
    expect(overTurn.aspect).toBe('completed');
    expect(state.turnCount).toBe(8);
  });
});

describe('AI API Routes', () => {
  const anonId = 'anon-route-tester';

  const sampleIdea: Idea = {
    id: 'idea-unit-test-1',
    learnerId: anonId,
    title: 'การพัฒนาแผ่นกรองอากาศจากเส้นใยกาบกล้วย',
    description:
      'ศึกษาประสิทธิภาพการดักจับฝุ่น PM2.5 ของแผ่นกรองที่ผลิตจากเส้นใยกาบกล้วยเปรียบเทียบกับแผ่นกรองใยสังเคราะห์',
    source: 'discovery_track',
    sourceTopicCardId: 'sci_phy_01',
    gradeLevel: 'm_plai',
    goal: 'ysc',
    createdAt: '2026-11-05T10:00:00Z',
    updatedAt: '2026-11-05T10:00:00Z',
  };

  const sampleConstraints: Constraints = {
    timeWeeks: 8,
    budgetBaht: 1500,
    equipment: ['เครื่องวัดฝุ่น', 'กล้องจุลทรรศน์'],
    teamSize: 3,
    skills: ['ฟิสิกส์เบื้องต้น', 'งานประดิษฐ์'],
  };

  beforeEach(async () => {
    await quotaStore.reset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  describe('POST /api/ai/coach', () => {
    it('returns 400 when input contains forbidden PII fields (Zero-PII strictness)', async () => {
      const req = new Request('http://localhost:3000/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anonymousId: anonId,
          realName: 'นายสมชาย', // forbidden PII
          school: 'โรงเรียนตัวอย่าง', // forbidden PII
        }),
      });

      const res = await coachRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBeDefined();
    });

    it('advances coach turn and preserves 3-tier lock', async () => {
      const req = new Request('http://localhost:3000/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anonymousId: anonId,
          requestedTier: 1,
          ideaContext: {
            title: sampleIdea.title,
            description: sampleIdea.description,
          },
        }),
      });

      const res = await coachRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.turn).toBeDefined();
      expect(json.turn.tier).toBe(1);
      expect(json.turn.state.turnCount).toBe(1);
    });
  });

  describe('POST /api/ai/cards/generate', () => {
    it('enforces cards daily quota and returns 429 when exhausted', async () => {
      // Consume 30 cards first
      await quotaStore.consume(anonId, 'cards', 30);

      const req = new Request('http://localhost:3000/api/ai/cards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anonymousId: anonId,
          subfieldId: 'sci_physics',
          gradeLevel: 'm_plai',
          count: 3,
        }),
      });

      const res = await cardsGenerateRoute(req);
      expect(res.status).toBe(429);
      const json = await res.json();
      expect(json.messageTh).toContain('30 ใบ');
    });

    it('generates valid topic cards adhering to TopicCardSchema with fallback', async () => {
      const req = new Request('http://localhost:3000/api/ai/cards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anonymousId: anonId,
          subfieldId: 'sci_physics',
          gradeLevel: 'm_plai',
          count: 2,
        }),
      });

      const res = await cardsGenerateRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.cards).toHaveLength(2);
      expect(json.cards[0].subfieldId).toBe('sci_physics');
      expect(json.cards[0].phenomenon).toBeDefined();
    });
  });

  describe('POST /api/ai/evaluate', () => {
    it('enforces evaluate daily quota (5) and returns 429 when exhausted', async () => {
      await quotaStore.consume(anonId, 'evaluate', 5);

      const req = new Request('http://localhost:3000/api/ai/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anonymousId: anonId,
          idea: sampleIdea,
          constraints: sampleConstraints,
        }),
      });

      const res = await evaluateRoute(req);
      expect(res.status).toBe(429);
      const json = await res.json();
      expect(json.messageTh).toContain('5 ครั้ง');
    });

    it('evaluates with 5 axes (1-10 integer scores + badges) and only DB citations', async () => {
      const req = new Request('http://localhost:3000/api/ai/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anonymousId: anonId,
          idea: sampleIdea,
          constraints: sampleConstraints,
        }),
      });

      const res = await evaluateRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      const evaluation = json.evaluation;

      expect(evaluation.id).toBeDefined();
      expect(evaluation.overallScore).toBeGreaterThanOrEqual(1);
      expect(evaluation.overallScore).toBeLessThanOrEqual(10);
      expect(['green', 'yellow', 'red']).toContain(evaluation.overallBadge);

      // Verify all 5 axes
      const axes = ['novelty', 'feasibility', 'impact', 'rigor', 'fit'] as const;
      for (const axis of axes) {
        const item = evaluation.axes[axis];
        expect(item.score).toBeGreaterThanOrEqual(1);
        expect(item.score).toBeLessThanOrEqual(10);
        expect(Number.isInteger(item.score)).toBe(true);
        expect(['green', 'yellow', 'red']).toContain(item.badge);
        expect(typeof item.rationale).toBe('string');
        expect(typeof item.feedback).toBe('string');
      }

      // Prior work citations must strictly be from verified DB records
      expect(Array.isArray(evaluation.priorWork)).toBe(true);
      for (const pw of evaluation.priorWork) {
        expect(pw.url).toMatch(/^https:\/\//);
        expect(pw.title).toBeDefined();
        expect(pw.authors).toBeDefined();
      }
    });

    it('strips and rejects fabricated AI citations when AI gateway returns fake URLs or IDs', async () => {
      vi.stubEnv('AI_BASE_URL', 'http://localhost:20128/v1');
      vi.stubEnv('AI_API_KEY', 'test-key');
      vi.stubEnv('AI_MODEL', 'test-model');

      // AI tries to hallucinate a fake paper citation
      const fakeAiEvaluation = {
        axes: {
          novelty: { score: 8, badge: 'green', rationale: 'ดีมาก', feedback: 'ต่อยอดได้' },
          feasibility: { score: 7, badge: 'green', rationale: 'ทำได้จริง', feedback: 'ดี' },
          impact: { score: 8, badge: 'green', rationale: 'ช่วยสิ่งแวดล้อม', feedback: 'ดี' },
          rigor: { score: 6, badge: 'yellow', rationale: 'ต้องเพิ่มตัวแปร', feedback: 'ดี' },
          fit: { score: 9, badge: 'green', rationale: 'เหมาะกับงบ', feedback: 'ดี' },
        },
        priorWorkIds: ['fake-hallucinated-id-999'], // Hallucinated ID
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(fakeAiEvaluation) } }],
        }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const req = new Request('http://localhost:3000/api/ai/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anonymousId: anonId,
          idea: sampleIdea,
          constraints: sampleConstraints,
        }),
      });

      const res = await evaluateRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      // Fake citation must NOT be present
      const fakeCitationFound = json.evaluation.priorWork.some(
        (pw: { id?: string; url?: string }) => pw.id === 'fake-hallucinated-id-999'
      );
      expect(fakeCitationFound).toBe(false);
    });
  });

  describe('POST /api/ai/pivot', () => {
    it('enforces proposal daily quota (2) and returns 429 when exhausted', async () => {
      await quotaStore.consume(anonId, 'proposal', 2);

      const req = new Request('http://localhost:3000/api/ai/pivot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anonymousId: anonId,
          idea: sampleIdea,
          redAxes: ['feasibility', 'rigor'],
          tier: 1,
        }),
      });

      const res = await pivotRoute(req);
      expect(res.status).toBe(429);
      const json = await res.json();
      expect(json.messageTh).toContain('2 ครั้ง');
    });

    it('returns socratic pivot coaching shoring up red axes', async () => {
      const req = new Request('http://localhost:3000/api/ai/pivot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anonymousId: anonId,
          idea: sampleIdea,
          redAxes: ['feasibility'],
          tier: 1,
        }),
      });

      const res = await pivotRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.coaching).toBeDefined();
      expect(json.coaching.tier).toBe(1);
      expect(json.coaching.tier1Prompt.length).toBeGreaterThan(10);
    });
  });
});

