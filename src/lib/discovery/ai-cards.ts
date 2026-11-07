import { TopicCardSchema } from '@/lib/schemas';
import type { TopicCard, GradeLevel } from '@/types/domain';

export interface GeneratedTopicCard extends TopicCard {
  isAiGenerated?: boolean;
}

export interface FetchAiCardsOptions {
  anonymousId: string;
  subfieldId: string;
  gradeLevel: GradeLevel;
  count?: number;
  existingCardIds?: string[];
  fetcher?: typeof fetch;
}

export interface AiCardsResult {
  success: boolean;
  cards: GeneratedTopicCard[];
  remaining?: number;
  quotaExceeded?: boolean;
  messageTh?: string;
  error?: string;
}

/**
 * Client helper to generate additional TopicCards via the server-side AI gateway.
 *
 * Rules:
 * - AI calls only via /api/ai/cards/generate (ADR 0001).
 * - Cards are shape-validated only. No "verified" claim: keyword safety screening is preliminary
 *   and generation is not a novelty check (spec §8). Superseded by /api/discovery/cards.
 * - Respects per-learner daily quota (30 cards/day); returns plain-Thai notification on 429.
 * - Handles offline/unconfigured environments gracefully with plain-Thai fallback message.
 */
export async function fetchAiGeneratedCards(
  options: FetchAiCardsOptions
): Promise<AiCardsResult> {
  const fetchFn = options.fetcher ?? (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch);

  try {
    const res = await fetchFn('/api/ai/cards/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        anonymousId: options.anonymousId,
        subfieldId: options.subfieldId,
        gradeLevel: options.gradeLevel,
        count: options.count ?? 3,
        existingCardIds: options.existingCardIds ?? [],
      }),
    });

    if (res.status === 429) {
      const data = await res.json().catch(() => ({}));
      return {
        success: false,
        cards: [],
        quotaExceeded: true,
        remaining: data.remaining ?? 0,
        messageTh:
          data.messageTh ??
          'คุณใช้โควตาสร้างการ์ดหัวข้อด้วย AI ครบจำนวน 30 ใบสำหรับวันนี้แล้ว (รีเซ็ตเวลาเที่ยงคืน)',
        error: 'Quota exceeded',
      };
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        success: false,
        cards: [],
        quotaExceeded: false,
        messageTh:
          data.messageTh ??
          'ไม่สามารถสร้างการ์ดด้วย AI ได้ในขณะนี้ กรุณาลองใหม่อีกครั้งหรือใช้การ์ดแนะนำที่มีอยู่',
        error: `HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    const rawCards = Array.isArray(data.cards) ? data.cards : [];

    // Shape-validate each card; never label it verified/safe.
    const validCards: GeneratedTopicCard[] = [];
    for (const raw of rawCards) {
      const parsed = TopicCardSchema.safeParse(raw);
      if (parsed.success) {
        validCards.push({ ...parsed.data, isAiGenerated: true });
      }
    }

    return {
      success: true,
      cards: validCards,
      remaining: typeof data.remaining === 'number' ? data.remaining : undefined,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      cards: [],
      quotaExceeded: false,
      messageTh:
        'ไม่สามารถเชื่อมต่อกับบริการ AI ได้ในขณะนี้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตหรือใช้งานด้วยการ์ดมาตรฐาน',
      error: errorMessage,
    };
  }
}
