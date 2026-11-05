import { PRIOR_WORK } from '@/data/prior-work';
import type { TopicCard, Idea, VerifiedPriorWork } from '@/types/domain';

export type PriorWorkMatchInput =
  | TopicCard
  | Idea
  | string
  | {
      title?: string;
      description?: string;
      phenomenon?: string;
      curiosityHook?: string;
      subfieldId?: string;
      keywords?: string[];
      text?: string;
    };

/**
 * Deterministically match relevant prior work entries from the verified dataset
 * based on subfield alignment and keyword/text overlap.
 *
 * Designed to run completely offline without external AI/network dependencies (ADR 0001).
 */
export function findPriorWork(
  input: PriorWorkMatchInput,
  limit = 5
): VerifiedPriorWork[] {
  const maxResults = Math.max(1, limit);

  // Normalize input into subfieldId and normalized query string
  let targetSubfieldId: string | undefined;
  const textParts: string[] = [];

  if (typeof input === 'string') {
    textParts.push(input);
  } else if ('phenomenon' in input && 'curiosityHook' in input && 'subfieldId' in input) {
    // TopicCard
    targetSubfieldId = input.subfieldId;
    if (input.title) textParts.push(input.title);
    if (typeof input.phenomenon === 'string') textParts.push(input.phenomenon);
    if (typeof input.curiosityHook === 'string') textParts.push(input.curiosityHook);
  } else if ('description' in input && 'source' in input) {
    // Idea
    if (input.title) textParts.push(input.title);
    if (typeof input.description === 'string') textParts.push(input.description);
  } else {
    // Partial query object
    if (input.subfieldId) targetSubfieldId = input.subfieldId;
    if (input.title) textParts.push(input.title);
    if (input.description) textParts.push(input.description);
    if (input.phenomenon) textParts.push(input.phenomenon);
    if (input.curiosityHook) textParts.push(input.curiosityHook);
    if (input.text) textParts.push(input.text);
    if (input.keywords) {
      for (const kw of input.keywords) {
        if (kw) textParts.push(kw);
      }
    }
  }

  const queryText = textParts.join(' ').toLowerCase().trim();
  if (!queryText && !targetSubfieldId) {
    return [];
  }

  // Tokenize query words by spaces and punctuation for token matching
  const queryTokens = queryText
    .split(/[\s,.;:!?_()[\]{}'"`/\\-]+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length >= 2);

  const scoredEntries: { entry: VerifiedPriorWork; score: number }[] = [];

  for (const entry of PRIOR_WORK) {
    let score = 0;

    // 1. Subfield alignment (+10 points)
    if (targetSubfieldId && entry.subfieldIds.includes(targetSubfieldId)) {
      score += 10;
    }

    // 2. Keyword substring matches in queryText (+4 points per keyword)
    for (const kw of entry.keywords) {
      const lowerKw = kw.toLowerCase().trim();
      if (lowerKw.length >= 2 && queryText.includes(lowerKw)) {
        score += 4;
      }
    }

    // 3. Token matches against entry title and summary (+2 points per token)
    const entryTitleLower = entry.title.toLowerCase();
    const entrySummaryLower = entry.summary.toLowerCase();

    for (const token of queryTokens) {
      if (entryTitleLower.includes(token)) {
        score += 2;
      } else if (entrySummaryLower.includes(token)) {
        score += 1;
      }
    }

    if (score > 0) {
      scoredEntries.push({ entry, score });
    }
  }

  // Deterministic sort: descending by score, stable tie-break by ID ascending
  scoredEntries.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.entry.id.localeCompare(b.entry.id);
  });

  return scoredEntries.slice(0, maxResults).map((s) => s.entry);
}
