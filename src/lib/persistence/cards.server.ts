import 'server-only';
import { createHash } from 'node:crypto';
import { TopicCardSchema } from '@/lib/schemas';
import type { TopicCard } from '@/types/domain';
import { isSemanticRepeat } from '@/lib/discovery/fresh-dedupe';

/** Same screening at both acceptance boundaries, not just before generation. */
export function semanticRepeat(card: TopicCard, ledger: TopicCard[]): boolean {
  const text = (c: TopicCard) => ({ title: c.title, problem: c.starter?.problem ?? c.phenomenon });
  return ledger.some(other => isSemanticRepeat(text(card), text(other)));
}
/** Preliminary exact-content normalization, not semantic novelty detection. */
export function acceptedCardCandidates(candidates: TopicCard[]) {
  return candidates.flatMap(candidate => {
    const parsed = TopicCardSchema.safeParse(candidate);
    if (!parsed.success) return [];
    const card = parsed.data;
    const normalize = (s: string) => s.normalize('NFKC').toLocaleLowerCase('th').replace(/[\s\p{P}\p{S}]+/gu, '');
    const fingerprint = createHash('sha256').update(normalize(card.title) + ':' + normalize(card.phenomenon)).digest('hex');
    return [{ fingerprint, card }];
  });
}
