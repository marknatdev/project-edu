import { describe, it, expect } from 'vitest';
import { createInitialChatState, chatReducer, canRequestTier, isRewriteAcceptable, validateVariablesLite, buildIdeaFromChat } from '@/lib/advisor/chat-reducer';
import { getIdea } from '@/lib/storage/store';
import type { TopicCard } from '@/types/domain';
import { conversationFixture } from '../fixtures/coaching';

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

describe('Socratic Advisor Chat Reducer (DEF-01 supersedes M3.3 hydration)', () => {
  it('initializes real card context without inventing a server-issued opening question', () => {
    const state = createInitialChatState({ track: 'discovery_track', topicCard: mockTopicCard, gradeLevel: 'm_plai', goal: 'ysc' });
    expect(state.topicCard).toEqual(mockTopicCard);
    expect(state.gradeLevel).toBe('m_plai');
    expect(state.goal).toBe('ysc');
    expect(state.questionCount).toBe(0);
    expect(state.messages).toEqual([]);
    expect(canRequestTier(state, 2).allowed).toBe(false);
    expect(canRequestTier(state, 3).allowed).toBe(false);
  });
  it('marks only server-confirmed answered aspects, not newly issued questions', () => {
    const conversation = conversationFixture();
    conversation.state.aspectProgress.problem = true;
    conversation.state.history[0].learnerResponse = 'ยังคิดไม่ออก';
    conversation.state.history.push({ turnIndex: 2, tier: 1, aspect: 'objective', content: 'เป้าหมายคืออะไร?', timestamp: '2026-11-05T10:01:00Z' });
    conversation.state.turnCount = 2;
    const state = chatReducer(createInitialChatState({ track: 'idea_track' }), { type: 'SERVER_HYDRATE', conversation });
    expect(state.messages.map(m => m.role)).toEqual(['coach', 'student', 'coach']);
    expect(state.aspectProgress.problem).toBe(true);
    expect(state.aspectProgress.objective).toBe(false);
    expect(state.questionCount).toBe(2);
    expect(canRequestTier(state, 2).allowed).toBe(true);
    expect(canRequestTier(state, 3).allowed).toBe(false);
  });
  it('requires an ordered answered Tier 1 and issued Tier 2 in verified server history', () => {
    const conversation = conversationFixture();
    conversation.state.history[0].learnerResponse = 'ก';
    conversation.state.history.push({ turnIndex: 2, tier: 2, content: 'คำใบ้', lenses: ['ลองลดขนาด'], timestamp: '2026-11-05T10:01:00Z' });
    let state = chatReducer(createInitialChatState({ track: 'idea_track' }), { type: 'SERVER_HYDRATE', conversation });
    expect(canRequestTier(state, 3).allowed).toBe(true);
    state = chatReducer(state, { type: 'RESTORE', state });
    expect(canRequestTier(state, 3).allowed).toBe(false);
  });
  it('uses server completion/cap rather than incrementing or auto-answering during hydration', () => {
    const conversation = conversationFixture();
    conversation.state.turnCount = 8;
    conversation.state.isComplete = true;
    const state = chatReducer(createInitialChatState({ track: 'idea_track' }), { type: 'SERVER_HYDRATE', conversation });
    expect(state.phase).toBe('variables');
    expect(state.questionCount).toBe(8);
    expect(state.aspectProgress.methodology).toBe(false);
  });
  describe('Tier-3 own-words rewrite gate (existing behavior retained)', () => {
    const example = 'สกัดเพกทินจากเปลือกกล้วยน้ำว้าตากแห้งด้วยสารละลายกรดซิตริก แล้วผสมกลีเซอรอลเพื่อขึ้นรูปเป็นแผ่นฟิล์มชีวภาพ';
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

    it('keeps the rewrite gate across rehydration and refuses variable/finalize shortcuts', () => {
      const conversation = conversationFixture();
      conversation.state.history.push({ turnIndex: 2, tier: 3, aspect: 'methodology', content: 'ตัวอย่าง', examples: [example, 'เขียนแอปติดตามการเดินทางและทดสอบกับข้อมูลจำลองหลายขนาด'], timestamp: '2026-11-05T10:01:00Z' });
      conversation.turn = { ...conversation.turn, tier: 3, examples: [example] };
      let state = chatReducer(createInitialChatState({ track: 'idea_track' }), { type: 'SERVER_HYDRATE', conversation });
      expect(state.phase).toBe('rewrite');
      state = chatReducer(state, { type: 'GO_TO_VARIABLES' });
      expect(state.phase).toBe('rewrite');
      state = chatReducer(state, { type: 'FINALIZE_IDEA', learnerId: 'guest' });
      expect(state.phase).toBe('rewrite');
      state = chatReducer(state, { type: 'SUBMIT_REWRITE', rewrittenText: example });
      expect(state.phase).toBe('rewrite');
      state = chatReducer(state, { type: 'SUBMIT_REWRITE', rewrittenText: 'เขียนแอปติดตามการเดินทางและทดสอบกับข้อมูลจำลองหลายขนาด' });
      expect(state.phase).toBe('rewrite');
      const genuine = 'กลุ่มเราจะเอาเปลือกกล้วยเหลือจากร้านกล้วยทอดมาต้มสกัดเพกทิน เพื่อทดสอบทำฟิล์มสำหรับห่อแอปเปิลผ่าซีกไม่ให้ดำ';
      state = chatReducer(state, { type: 'SUBMIT_REWRITE', rewrittenText: genuine });
      state = chatReducer(state, { type: 'SERVER_HYDRATE', conversation });
      expect(state.phase).toBe('chatting');
      expect(state.studentRewrite).toBe(genuine);
      expect(buildIdeaFromChat(state, { learnerId: 'guest', gradeLevel: 'm_plai', goal: 'ysc' }).description).toContain(genuine);
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

  it('finalizes a valid Idea with hydrated card/grade/goal, learner words and variables', () => {
    const conversation = conversationFixture();
    conversation.context.topicCard = mockTopicCard;
    conversation.state.history[0].learnerResponse = 'ต้องการลดขยะเปลือกกล้วยในชุมชนและช่วยยืดอายุผลไม้สด';
    let state = chatReducer(createInitialChatState({ track: 'idea_track' }), { type: 'SERVER_HYDRATE', conversation });
    const variables = { independent: 'สูตรสารเคลือบเพกทินเปลือกกล้วย', dependent: 'การสูญเสียน้ำหนักและสีผิวผลไม้', controlled: ['อุณหภูมิห้อง'], controlGroup: 'ผลไม้ไม่เคลือบสาร', replicates: 3 };
    state = chatReducer(state, { type: 'SET_VARIABLES', variables });
    state = chatReducer(state, { type: 'FINALIZE_IDEA', learnerId: 'guest_learner_456' });
    expect(state.phase).toBe('done');
    const saved = getIdea(state.savedIdea!.id);
    expect(saved?.sourceTopicCardId).toBe(mockTopicCard.id);
    expect(saved?.gradeLevel).toBe('m_plai');
    expect(saved?.goal).toBe('ysc');
    expect(saved?.variables).toEqual(variables);
    expect(saved?.description).toContain('ต้องการลดขยะเปลือกกล้วย');
  });
});
