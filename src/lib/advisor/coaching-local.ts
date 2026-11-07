import { z } from 'zod';
import { TopicCardSchema } from '@/lib/schemas';
import { TOPIC_CARDS } from '@/data/topic-cards';
import { STORAGE_PREFIX, getDefaultStorage, type StorageAdapter } from '@/lib/storage/store';
import type { TopicCard } from '@/types/domain';
import { CoachConversationSchema, CoachLocalWorkSchema, type CoachConversation, type CoachLocalWork } from './coach-dto';

const localSchema = z.object({ work: CoachLocalWorkSchema, cached: CoachConversationSchema.nullable() });
const key = (topic: string) => `${STORAGE_PREFIX}coaching:${encodeURIComponent(topic)}`;
const cardKey = (id: string) => `${STORAGE_PREFIX}topic-card:${encodeURIComponent(id)}`;
function storage(): StorageAdapter { return getDefaultStorage(); }

/** Extension point for generated cards: persist the complete selected snapshot,
 * not just its id. No lookup in the catalog is required for later AI cards. */
export function saveTopicCardSnapshot(card: TopicCard, target?: StorageAdapter): void {
  const parsed = TopicCardSchema.parse(card);
  (target ?? storage()).setItem(cardKey(parsed.id), JSON.stringify(parsed));
}
export function resolveCoachingCard(id: string, target?: StorageAdapter): TopicCard | null {
  try {
    const raw = (target ?? storage()).getItem(cardKey(id));
    if (raw) {
      const parsed = TopicCardSchema.safeParse(JSON.parse(raw));
      if (parsed.success && parsed.data.id === id) return parsed.data;
    }
  } catch { /* Read-only recovery: don't destroy unknown/corrupt local work. */ }
  return TOPIC_CARDS.find(card => card.id === id) ?? null;
}
export function loadCoachingLocal(topic: string, target?: StorageAdapter): z.infer<typeof localSchema> | null {
  try {
    const raw = (target ?? storage()).getItem(key(topic));
    if (!raw) return null;
    const result = localSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch { return null; }
}
export function saveCoachingLocal(topic: string, work: CoachLocalWork, cached: CoachConversation | null, target?: StorageAdapter): void {
  (target ?? storage()).setItem(key(topic), JSON.stringify(localSchema.parse({ work, cached })));
}
export function clearCoachingLocal(topic: string, target?: StorageAdapter): void {
  (target ?? storage()).removeItem(key(topic));
}

export function ideaTopicKey(cardId?: string | null): string {
  return cardId ? `card:${cardId}` : 'idea:own';
}
