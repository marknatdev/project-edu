import type { TopicCard, Constraints, GradeLevel } from '@/types/domain';

export interface DeckFilterOptions {
  subjectId: string;
  subfieldIds: string[] | 'unknown';
  gradeLevel: GradeLevel;
  constraints?: Constraints;
  reportedCardIds?: string[];
  alreadySwipedCardIds?: string[];
}

/**
 * Builds a filtered and ordered deck of TopicCards based on learner selections.
 *
 * Requirements:
 * - Pure function, does not mutate inputs.
 * - Filters by subjectId.
 * - Filters by gradeLevel (must be included in targetGradeLevels).
 * - Filters by subfieldIds (or 'unknown' for mixed mode).
 * - Mixed mode ("ยังไม่รู้"): draws across all subfields in the subject in an interleaved,
 *   balanced round-robin order so no single subfield dominates. Deterministic (no Math.random).
 * - Excludes reportedCardIds and alreadySwipedCardIds.
 */
export function buildDiscoveryDeck(
  options: DeckFilterOptions,
  catalog: TopicCard[]
): TopicCard[] {
  const reportedSet = new Set(options.reportedCardIds ?? []);
  const swipedSet = new Set(options.alreadySwipedCardIds ?? []);

  // 1. Filter out reported & already swiped
  let candidates = catalog.filter(
    (card) => !reportedSet.has(card.id) && !swipedSet.has(card.id)
  );

  // 2. Filter strictly by subject
  candidates = candidates.filter((card) => card.subjectId === options.subjectId);

  // 3. Filter by grade level
  candidates = candidates.filter((card) =>
    card.targetGradeLevels.includes(options.gradeLevel)
  );

  // 4. Handle Subfield filtering or Mixed mode
  if (options.subfieldIds === 'unknown') {
    // "ยังไม่รู้" Mixed mode: group by subfield and interleave round-robin
    const groupsBySubfield = new Map<string, TopicCard[]>();
    for (const card of candidates) {
      const list = groupsBySubfield.get(card.subfieldId) ?? [];
      list.push(card);
      groupsBySubfield.set(card.subfieldId, list);
    }

    const subfieldBuckets = Array.from(groupsBySubfield.values());
    const interleaved: TopicCard[] = [];
    let hasMore = true;
    let round = 0;

    while (hasMore) {
      hasMore = false;
      for (const bucket of subfieldBuckets) {
        if (round < bucket.length) {
          interleaved.push(bucket[round]);
          hasMore = true;
        }
      }
      round++;
    }

    return interleaved;
  }

  // Multi-subfield selection
  if (Array.isArray(options.subfieldIds) && options.subfieldIds.length > 0) {
    const allowed = new Set(options.subfieldIds);
    candidates = candidates.filter((card) => allowed.has(card.subfieldId));
  }

  return [...candidates];
}
