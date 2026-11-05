import { describe, it, expect } from 'vitest';
import {
  createInitialChatState,
  chatReducer,
  canRequestTier,
  isRewriteAcceptable,
  validateVariablesLite,
} from '@/lib/advisor/chat-reducer';
import { getIdea } from '@/lib/storage/store';
import type { TopicCard } from '@/types/domain';

const mockTopicCard: TopicCard = {
  id: 'card_sci_banana_01',
  subjectId: 'science',
  subfieldId: 'sci_bio_agri',
  title: 'แผ่นฟิล์มชีวภาพยืดอายุผลไม้จากเปลือกกล้วย',
  phenomenon: 'กล้วยสุกเร็วและเน่าเสียง่าย ขณะที่เปลือกกล้วยเหลือทิ้งมีเพกทินสูง',
  curiosityHook: 'เราสามารถสกัดเพกทินจากเปลือกกล้วยมาทำฟิล์มเคลือบเพื่อชะลอการสูญเสียน้ำได้หรือไม่?',
  difficulty: 'intermediate',
  targetGradeLevels: ['m_plai'],
  estimatedWeeks: 4,
  estimatedBudgetBaht: 500,
  requiredEquipment: ['บีกเกอร์', 'เครื่องปั่น', 'ถาดอบฟิล์ม'],
  minTeamSize: 1,
  maxTeamSize: 3,
  requiredSkills: ['เคมีพื้นฐาน'],
};

describe('Socratic Advisor Chat Reducer (M3.3 / AC-6)', () => {
  describe('Seam 1: Session initialization and starting from Topic Card vs Idea Track', () => {
    it('initializes Discovery Track session with topic card context, 0 turns, and all aspects incomplete', () => {
      const state = createInitialChatState({
        track: 'discovery_track',
        topicCard: mockTopicCard,
        gradeLevel: 'm_plai',
        goal: 'ysc',
      });

      expect(state.track).toBe('discovery_track');
      expect(state.topicCard?.id).toBe('card_sci_banana_01');
      expect(state.questionCount).toBe(0);
      expect(state.phase).toBe('chatting');
      expect(state.unlockedTiers).toEqual([1]);
      expect(state.currentTier).toBe(1);
      expect(state.aspectProgress).toEqual({
        problem: false,
        objective: false,
        methodology: false,
        measurement: false,
      });
      // Opening message from coach references the topic card title
      expect(state.messages.length).toBe(1);
      expect(state.messages[0].role).toBe('coach');
      expect(state.messages[0].content).toContain(mockTopicCard.title);
      expect(state.messages[0].aspect).toBe('problem');
    });

    it('initializes Idea Track session without topic card, inviting learner to share their own idea', () => {
      const state = createInitialChatState({
        track: 'idea_track',
        gradeLevel: 'm_ton',
        goal: 'classroom',
      });

      expect(state.track).toBe('idea_track');
      expect(state.topicCard).toBeNull();
      expect(state.questionCount).toBe(0);
      expect(state.phase).toBe('chatting');
      expect(state.messages.length).toBe(1);
      expect(state.messages[0].role).toBe('coach');
      expect(state.messages[0].content).toContain('สวัสดีครับ');
      expect(state.messages[0].aspect).toBe('problem');
    });
  });

  describe('Seam 2: Turn progression and aspect coverage', () => {
    it('updates aspect progress and increments questionCount when coach responds', () => {
      let state = createInitialChatState({
        track: 'discovery_track',
        topicCard: mockTopicCard,
      });

      // Student sends answer to problem question
      state = chatReducer(state, {
        type: 'STUDENT_SEND_MESSAGE',
        content: 'กล้วยน้ำว้าที่พ่อค้าขายในตลาดเน่าเสียเร็วมากภายใน 2 วัน ทำให้ต้องทิ้งเยอะมาก',
      });

      expect(state.isWaitingForResponse).toBe(true);
      expect(state.messages.length).toBe(2);
      expect(state.messages[1].role).toBe('student');

      // Coach acknowledges and moves to objective
      state = chatReducer(state, {
        type: 'COACH_RESPONSE_SUCCESS',
        response: {
          content: 'แล้วคุณตั้งเป้าหมายจะชะลอการเน่าเสียให้นานขึ้นกี่วัน และวัดอย่างไรครับ?',
          tier: 1,
          aspect: 'objective',
        },
      });

      expect(state.isWaitingForResponse).toBe(false);
      expect(state.questionCount).toBe(1);
      // Problem was covered by previous exchange, and objective is now targeted
      expect(state.aspectProgress.problem).toBe(true);
      expect(state.aspectProgress.objective).toBe(true);
      expect(state.messages.length).toBe(3);
    });
  });

  describe('Seam 3: Question cap (<= 8 questions) on Idea Track transitions to variables', () => {
    it('transitions to variables phase at the 8th question even if not all aspects are complete', () => {
      let state = createInitialChatState({
        track: 'idea_track',
      });

      // Simulate 7 turns
      for (let i = 1; i <= 7; i++) {
        state = chatReducer(state, {
          type: 'STUDENT_SEND_MESSAGE',
          content: `คำตอบข้อที่ ${i}`,
        });
        state = chatReducer(state, {
          type: 'COACH_RESPONSE_SUCCESS',
          response: {
            content: `คำถามข้อที่ ${i + 1}`,
            tier: 1,
            aspect: i % 2 === 0 ? 'problem' : 'objective', // deliberately leaving methodology/measurement incomplete
          },
        });
        expect(state.phase).toBe('chatting');
        expect(state.questionCount).toBe(i);
      }

      // 8th student response and coach reply
      state = chatReducer(state, {
        type: 'STUDENT_SEND_MESSAGE',
        content: 'คำตอบข้อที่ 8',
      });
      state = chatReducer(state, {
        type: 'COACH_RESPONSE_SUCCESS',
        response: {
          content: 'ยอดเยี่ยมมากครับ! ครบ 8 คำถามแล้ว เรามาสรุปตัวแปรกันต่อครับ',
          tier: 1,
          aspect: 'completed',
        },
      });

      expect(state.questionCount).toBe(8);
      expect(state.phase).toBe('variables');

      // Attempting to send another turn does not generate a 9th question
      const stateAfter = chatReducer(state, {
        type: 'STUDENT_SEND_MESSAGE',
        content: 'จะตอบเพิ่มอีก',
      });
      // The phase remains variables
      expect(stateAfter.phase).toBe('variables');
    });
  });

  describe('Seam 4: 3-tier progressive unlocking (ADR 0002)', () => {
    it('enforces tier lock rules: Tier 1 always open, Tier 2 requires Tier 1, Tier 3 requires Tier 1 & Tier 2', () => {
      const state = createInitialChatState({
        track: 'idea_track',
      });

      // Initially at turn 0 with Tier 1
      expect(canRequestTier(state, 1).allowed).toBe(true);

      // Tier 2 is allowed because opening message is Tier 1
      expect(canRequestTier(state, 2).allowed).toBe(true);

      // Tier 3 is strictly LOCKED because Tier 2 has not been used yet
      const tier3Check = canRequestTier(state, 3);
      expect(tier3Check.allowed).toBe(false);
      expect(tier3Check.reasonTh).toContain('คิดไม่ออกจริงๆ จะปลดล็อก');

      // Requesting Tier 3 via reducer rejects and sets error
      const attemptedState = chatReducer(state, {
        type: 'REQUEST_TIER',
        tier: 3,
      });
      expect(attemptedState.currentTier).toBe(1);
      expect(attemptedState.error).toContain('คิดไม่ออกจริงๆ จะปลดล็อก');

      // Now student requests Tier 2 and coach provides Tier 2 hint
      const stateWithTier2 = chatReducer(attemptedState, {
        type: 'REQUEST_TIER',
        tier: 2,
      });
      expect(stateWithTier2.currentTier).toBe(2);

      const stateAfterTier2Resp = chatReducer(stateWithTier2, {
        type: 'COACH_RESPONSE_SUCCESS',
        response: {
          content: 'กรอบชวนคิด: ลองวิเคราะห์จากมุมมองของผู้ใช้งาน',
          tier: 2,
          aspect: 'problem',
          lenses: ['มุมมองผู้ใช้งาน', 'มุมมองผลกระทบ'],
        },
      });

      // Now that both Tier 1 and Tier 2 have been received, Tier 3 is unlocked!
      expect(canRequestTier(stateAfterTier2Resp, 3).allowed).toBe(true);

      const stateWithTier3 = chatReducer(stateAfterTier2Resp, {
        type: 'REQUEST_TIER',
        tier: 3,
      });
      expect(stateWithTier3.currentTier).toBe(3);
      expect(stateWithTier3.error).toBeNull();
    });
  });

  describe('Seam 5 & 6: Tier 3 example Rewrite Gate & rejection of verbatim / near-verbatim copy', () => {
    const example =
      'สกัดเพกทินจากเปลือกกล้วยน้ำว้าตากแห้งด้วยสารละลายกรดซิตริก แล้วผสมกลีเซอรอลเพื่อขึ้นรูปเป็นแผ่นฟิล์มชีวภาพ';

    it('rejects input shorter than 15 characters', () => {
      const res = isRewriteAcceptable(example, 'สั้นเกินไป');
      expect(res.acceptable).toBe(false);
      expect(res.reasonTh).toContain('อย่างน้อย 15 ตัวอักษร');
    });

    it('rejects exact verbatim copy of the Tier 3 example', () => {
      const res = isRewriteAcceptable(example, example);
      expect(res.acceptable).toBe(false);
      expect(res.reasonTh).toContain('ห้ามคัดลอก');
    });

    it('rejects near-verbatim copy with only superficial punctuation or spacing changes', () => {
      const nearCopy =
        'สกัด เพกทิน จาก เปลือกกล้วยน้ำว้า ตากแห้ง ด้วยสารละลาย กรดซิตริก แล้วผสมกลีเซอรอล เพื่อขึ้นรูป เป็น แผ่นฟิล์มชีวภาพ!';
      const res = isRewriteAcceptable(example, nearCopy);
      expect(res.acceptable).toBe(false);
      expect(res.reasonTh).toContain('ห้ามคัดลอกหรือดัดแปลง');
    });

    it('accepts genuine rewrite in student own words with distinct angle', () => {
      const studentRewrite =
        'กลุ่มเราจะเอาเปลือกกล้วยเหลือจากร้านกล้วยทอดมาต้มสกัดเพกทิน เพื่อทดสอบทำฟิล์มสำหรับห่อแอปเปิลผ่าซีกไม่ให้ดำ';
      const res = isRewriteAcceptable(example, studentRewrite);
      expect(res.acceptable).toBe(true);
      expect(res.overlapRatio).toBeLessThan(0.65);
    });

    it('blocks continuing when Tier 3 example is received until student submits valid rewrite', () => {
      let state = createInitialChatState({
        track: 'discovery_track',
        topicCard: mockTopicCard,
      });

      // Coach delivers Tier 3 response with example
      state = chatReducer(state, {
        type: 'COACH_RESPONSE_SUCCESS',
        response: {
          content: 'ตัวอย่างแนวทางการทดลองแบบเจาะจง:',
          tier: 3,
          aspect: 'methodology',
          examples: [example],
        },
      });

      // Phase must be 'rewrite'
      expect(state.phase).toBe('rewrite');
      expect(state.pendingTier3Example).toBe(example);

      // Student tries to submit copied example
      state = chatReducer(state, {
        type: 'SUBMIT_REWRITE',
        rewrittenText: example,
      });
      // Stays in rewrite phase with error
      expect(state.phase).toBe('rewrite');
      expect(state.error).toBeDefined();

      // Student submits genuine rewrite
      const genuineRewrite =
        'กลุ่มเราจะเอาเปลือกกล้วยเหลือจากร้านกล้วยทอดมาต้มสกัดเพกทิน เพื่อทดสอบทำฟิล์มสำหรับห่อแอปเปิลผ่าซีกไม่ให้ดำ';
      state = chatReducer(state, {
        type: 'SUBMIT_REWRITE',
        rewrittenText: genuineRewrite,
      });

      // Unblocks rewrite phase!
      expect(state.phase).toBe('chatting');
      expect(state.studentRewrite).toBe(genuineRewrite);
      expect(state.error).toBeNull();
    });
  });

  describe('Seam 7: Offline fallback produces deterministic prompt and preserves flow', () => {
    it('serves deterministic fallback question when coach response fails, advancing aspect progress', () => {
      let state = createInitialChatState({
        track: 'idea_track',
      });

      // Student sends first response
      state = chatReducer(state, {
        type: 'STUDENT_SEND_MESSAGE',
        content: 'ผมสังเกตว่าเศษขยะอาหารในโรงอาหารมีปริมาณเยอะมากและส่งกลิ่นเหม็น',
      });

      // API request fails (e.g. 500, 429, or network disconnect)
      state = chatReducer(state, {
        type: 'COACH_RESPONSE_FAILURE',
        error: 'Network connection failed',
      });

      expect(state.isOffline).toBe(true);
      expect(state.isWaitingForResponse).toBe(false);
      expect(state.questionCount).toBe(1);
      // The last message is a coach message with content from FALLBACK_PROMPTS
      const lastMsg = state.messages[state.messages.length - 1];
      expect(lastMsg.role).toBe('coach');
      expect(lastMsg.aspect).toBe('objective');
      expect(lastMsg.content).toBe(
        'ถ้าทำโครงงานนี้สำเร็จ เป้าหมายที่ชัดเจนที่สุดคือต้องการให้เกิดการเปลี่ยนแปลงอะไร หรือพิสูจน์สิ่งใดครับ?'
      );
    });
  });

  describe('Seam 8: Variables step lite validation (IV, DV, controlled, control group, replicates)', () => {
    it('rejects incomplete or invalid variables input', () => {
      // Missing independent variable
      const res1 = validateVariablesLite({
        independent: '',
        dependent: 'ระยะเวลาที่กล้วยคงความสด (วัน)',
        controlled: ['อุณหภูมิห้อง 25°C', 'ความชื้นสัมพัทธ์ 60%'],
        controlGroup: 'กล้วยที่ไม่เคลือบฟิล์ม',
        replicates: 3,
      });
      expect(res1.valid).toBe(false);
      expect(res1.errors.independent).toBeDefined();

      // Empty controlled variables
      const res2 = validateVariablesLite({
        independent: 'ความเข้มข้นของเพกทินจากเปลือกกล้วย (1%, 3%, 5%)',
        dependent: 'ระยะเวลาที่กล้วยคงความสด (วัน)',
        controlled: [],
        controlGroup: 'กล้วยที่ไม่เคลือบฟิล์ม',
        replicates: 3,
      });
      expect(res2.valid).toBe(false);
      expect(res2.errors.controlled).toBeDefined();

      // Replicates < 1 or non-integer
      const res3 = validateVariablesLite({
        independent: 'ความเข้มข้นของเพกทิน',
        dependent: 'ความสด',
        controlled: ['อุณหภูมิ'],
        controlGroup: 'ชุดไม่เคลือบ',
        replicates: 0,
      });
      expect(res3.valid).toBe(false);
      expect(res3.errors.replicates).toBeDefined();
    });

    it('accepts complete, valid variables input', () => {
      const validVars = {
        independent: 'ความเข้มข้นของสารสกัดเพกทินจากเปลือกกล้วย (1%, 3%, 5%)',
        dependent: 'ระยะเวลาการเกิดจุดสีน้ำตาลและการสูญเสียน้ำหนักของผลไม้ (%)',
        controlled: ['อุณหภูมิห้องจัดเก็บ (25°C)', 'สายพันธุ์และความสุกเริ่มต้นของผลไม้', 'ความหนาของแผ่นฟิล์ม'],
        controlGroup: 'ผลไม้ชุดที่ไม่เคลือบฟิล์มเพกทิน (วางไว้ในสภาวะเดียวกัน)',
        replicates: 5,
      };

      const res = validateVariablesLite(validVars);
      expect(res.valid).toBe(true);
      expect(res.data).toEqual(validVars);
    });
  });

  describe('Seam 9: Finalize produces valid Idea that round-trips through store public API', () => {
    it('builds Idea and saves to store, preserving student words and variables', () => {
      let state = createInitialChatState({
        track: 'discovery_track',
        topicCard: mockTopicCard,
        gradeLevel: 'm_plai',
        goal: 'ysc',
      });

      // Student answers problem
      state = chatReducer(state, {
        type: 'STUDENT_SEND_MESSAGE',
        content: 'ต้องการลดขยะเปลือกกล้วยในชุมชนและช่วยยืดอายุผลไม้สด',
      });

      // Coach hints
      state = chatReducer(state, {
        type: 'COACH_RESPONSE_SUCCESS',
        response: {
          content: 'ตั้งเป้าหมายอย่างไรครับ?',
          tier: 1,
          aspect: 'objective',
        },
      });

      // Student sets variables
      const validVars = {
        independent: 'สูตรสารเคลือบเพกทินเปลือกกล้วย',
        dependent: 'การสูญเสียน้ำหนักและสีผิวผลไม้',
        controlled: ['อุณหภูมิห้อง', 'ขนาดผลไม้'],
        controlGroup: 'ผลไม้ไม่เคลือบสาร',
        replicates: 3,
      };

      state = chatReducer(state, {
        type: 'SET_VARIABLES',
        variables: validVars,
      });

      expect(state.variablesDraft).toEqual(validVars);

      // Finalize idea into store
      state = chatReducer(state, {
        type: 'FINALIZE_IDEA',
        learnerId: 'guest_learner_456',
      });

      expect(state.phase).toBe('done');
      expect(state.savedIdea).not.toBeNull();
      const saved = state.savedIdea!;

      expect(saved.learnerId).toBe('guest_learner_456');
      expect(saved.source).toBe('discovery_track');
      expect(saved.sourceTopicCardId).toBe('card_sci_banana_01');
      expect(saved.variables).toEqual(validVars);
      expect(saved.gradeLevel).toBe('m_plai');
      expect(saved.goal).toBe('ysc');

      // Round-trip verification from store
      const retrieved = getIdea(saved.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(saved.id);
      expect(retrieved?.title).toBe(saved.title);
      expect(retrieved?.variables?.replicates).toBe(3);
    });
  });
});
