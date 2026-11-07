import { createInitialCoachState } from '@/lib/advisor/coach-contract';
import type { CoachConversation } from '@/lib/advisor/coach-dto';

/** Explicit server-DTO fixture, not an upstream AI response. */
export function conversationFixture(): CoachConversation {
  const state = createInitialCoachState('guest', 'card:generated');
  state.turnCount = 1;
  state.history = [{ turnIndex: 1, tier: 1, aspect: 'problem', content: 'คุณอยากแก้ปัญหาอะไร?', timestamp: '2026-11-05T10:00:00Z', source: 'fallback' }];
  const turn = { source: 'fallback' as const, tier: 1 as const, aspect: 'problem' as const, content: 'คุณอยากแก้ปัญหาอะไร?', state };
  return { id: '0eae0e92-6279-499d-87b8-9290436048b3', topicKey: 'card:generated', revision: 1,
    context: { track: 'discovery_track', gradeLevel: 'm_plai', goal: 'ysc' }, state, turn };
}
