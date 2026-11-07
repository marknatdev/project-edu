import { describe, expect, it, vi, afterEach } from 'vitest';
import { fetchCoachTurn } from '@/lib/advisor/coach-client';
import { conversationFixture } from '../fixtures/coaching';
import { chatReducer, createInitialChatState, canRequestTier } from '@/lib/advisor/chat-reducer';

afterEach(() => vi.unstubAllGlobals());
describe('DEF-01 client/server public DTO and hydration', () => {
  it('retains displaced learner text as unverified drafts when another tab starts a new conversation', () => {
    const old = conversationFixture();
    old.state.history[0].learnerResponse = 'คำตอบเดิมของฉัน';
    let state = chatReducer(createInitialChatState({ track: 'idea_track' }), { type: 'SERVER_HYDRATE', conversation: old });
    state = chatReducer(state, { type: 'STUDENT_SEND_MESSAGE', content: 'ฉบับร่างออฟไลน์' });
    const replacement = { ...conversationFixture(), id: '10c61c92-d8b7-4879-ae55-b3355349bc40' };
    state = chatReducer(state, { type: 'SERVER_HYDRATE', conversation: replacement });
    expect(state.drafts.map(d => d.content)).toContain('ฉบับร่างออฟไลน์');
    expect(state.drafts.map(d => d.content)).toContain('คำตอบเดิมของฉัน');
    expect(canRequestTier(state, 3).allowed).toBe(false);
    expect(state.error).toContain('ฉบับร่าง');
  });
  it('hydrates grade, goal and issued history without inventing answered aspects; offline messages never grant gates', () => {
    const initial = createInitialChatState({ track: 'idea_track' });
    const conversation = conversationFixture();
    let state = chatReducer(initial, { type: 'SERVER_HYDRATE', conversation });
    expect(state.gradeLevel).toBe('m_plai');
    expect(state.goal).toBe('ysc');
    expect(state.messages).toHaveLength(1);
    expect(state.aspectProgress.problem).toBe(false);
    expect(canRequestTier(state, 2).allowed).toBe(false);
    state = chatReducer(state, { type: 'STUDENT_SEND_MESSAGE', content: 'ยังคิดไม่ออก' });
    state = chatReducer(state, { type: 'COACH_RESPONSE_FAILURE' });
    expect(state.drafts[0].content).toBe('ยังคิดไม่ออก');
    expect(canRequestTier(state, 2).allowed).toBe(false);
    expect(canRequestTier(state, 3).allowed).toBe(false);
    expect(state.questionCount).toBe(1);
    state = chatReducer(state, { type: 'SERVER_HYDRATE', conversation });
    expect(state.drafts[0].content).toBe('ยังคิดไม่ออก');
    expect(state.isOffline).toBe(false);
    expect(canRequestTier(state, 3).allowed).toBe(false);
  });
  it('falls back to local in-tab serialization when navigator.locks is undefined (e.g. plain HTTP on LAN)', async () => {
    const conversation = conversationFixture();
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ turn: conversation.turn, conversation }))));
    const result = await fetchCoachTurn({ action: 'open', topicKey: 'card:lan-test', context: conversation.context });
    expect(result.success).toBe(true);
    expect(result.conversation?.id).toBe(conversation.id);
  });

  it('unwraps the actual {turn, conversation} response and rejects malformed successful responses', async () => {
    const conversation = conversationFixture();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ turn: conversation.turn, conversation }))));
    const result = await fetchCoachTurn({ action: 'open', topicKey: 'card:generated', context: conversation.context });
    expect(result.success).toBe(true);
    expect(result.data?.content).toBe('คุณอยากแก้ปัญหาอะไร?');
    expect(result.conversation?.id).toBe(conversation.id);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ content: 'not the DTO' }))));
    expect((await fetchCoachTurn({ action: 'open', topicKey: 'x', context: conversation.context })).success).toBe(false);
  });
});
