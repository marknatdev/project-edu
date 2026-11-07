import { describe, expect, it } from 'vitest';
import { TOPIC_CARDS } from '@/data/topic-cards';
import { createMemoryStorage, wipeAllLearnerData } from '@/lib/storage/store';
import { saveTopicCardSnapshot, resolveCoachingCard, saveCoachingLocal, loadCoachingLocal } from '@/lib/advisor/coaching-local';

describe('DEF-01 local snapshot/draft seam (never authorization)', () => {
  it('resolves a persisted noncatalog card and isolates topic drafts; wipe removes both but preserves unrelated data', () => {
    const storage = createMemoryStorage();
    const generated = { ...TOPIC_CARDS[0], id: 'generated-example', title: 'การ์ดจำลองสำหรับทดสอบการส่งต่อ' };
    saveTopicCardSnapshot(generated, storage);
    expect(resolveCoachingCard('generated-example', storage)).toEqual(generated);
    expect(resolveCoachingCard(TOPIC_CARDS[1].id, storage)).toEqual(TOPIC_CARDS[1]);
    saveCoachingLocal('card:generated-example', { input: 'ยังคิดไม่ออก', rewriteInput: '', drafts: [], studentRewrite: null, variablesDraft: {}, savedIdea: null, phase: 'chatting' }, null, storage);
    expect(loadCoachingLocal('card:generated-example', storage)?.work.input).toBe('ยังคิดไม่ออก');
    expect(loadCoachingLocal('card:other', storage)).toBeNull();
    storage.setItem('unrelated', 'keep');
    wipeAllLearnerData(storage);
    expect(loadCoachingLocal('card:generated-example', storage)).toBeNull();
    expect(resolveCoachingCard('generated-example', storage)).toBeNull();
    expect(storage.getItem('unrelated')).toBe('keep');
  });
});
