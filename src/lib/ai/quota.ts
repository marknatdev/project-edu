/**
 * Per-learner daily quota tracker for Project Edu
 * Implements ADR 0001 / ADR 0002 server side quotas:
 * - 30 extra cards per day ('cards')
 * - 5 evaluations per day ('evaluate')
 * - 2 proposals / pivots per day ('proposal')
 * Keyed by anonymous id + date in Asia/Bangkok time (UTC+7).
 */

export type QuotaKind = 'cards' | 'evaluate' | 'proposal';

export const DAILY_LIMITS: Readonly<Record<QuotaKind, number>> = {
  cards: 30,
  evaluate: 5,
  proposal: 2,
};

/**
 * Returns date string in Asia/Bangkok timezone (UTC+7) formatted as YYYY-MM-DD.
 */
export function getBangkokDateString(now: Date = new Date()): string {
  const bangkokMs = now.getTime() + 7 * 60 * 60 * 1000;
  const d = new Date(bangkokMs);
  return d.toISOString().slice(0, 10);
}

/**
 * Returns the ISO string of the next midnight in Asia/Bangkok timezone (UTC+7).
 */
export function getBangkokNextMidnightIso(now: Date = new Date()): string {
  const bangkokMs = now.getTime() + 7 * 60 * 60 * 1000;
  const b = new Date(bangkokMs);
  // Next day 00:00:00 in Bangkok
  const nextDayMidnightUtc = Date.UTC(
    b.getUTCFullYear(),
    b.getUTCMonth(),
    b.getUTCDate() + 1,
    0,
    0,
    0
  );
  // Convert back to real UTC timestamp by subtracting 7 hours
  const resetUtc = new Date(nextDayMidnightUtc - 7 * 60 * 60 * 1000);
  return resetUtc.toISOString();
}

/**
 * Returns polite, instructive Thai message when quota is exceeded.
 */
export function getQuotaExceededMessage(kind: QuotaKind): string {
  switch (kind) {
    case 'cards':
      return 'วันนี้คุณขอสร้างการ์ดหัวข้อครบตามโควตา 30 ใบแล้ว ลองเลือกดูการ์ดที่มีอยู่ก่อน หรือกลับมาใหม่ในวันพรุ่งนี้นะครับ';
    case 'evaluate':
      return 'วันนี้คุณประเมินโครงงานครบตามโควตา 5 ครั้งแล้ว ลองนำข้อเสนอแนะไปปรับแก้ หรือกลับมาประเมินใหม่ในวันพรุ่งนี้นะครับ';
    case 'proposal':
      return 'วันนี้คุณใช้โควตาสร้างข้อเสนอโครงงานครบ 2 ครั้งแล้ว ลองพัฒนาโครงงานนี้ต่อ หรือกลับมาใหม่ในวันพรุ่งนี้นะครับ';
  }
}

export interface QuotaRecord {
  used: number;
  limit: number;
  remaining: number;
  resetAt: string;
}

export interface QuotaStore {
  check(anonymousId: string, kind: QuotaKind, now?: Date): Promise<QuotaRecord>;
  consume(
    anonymousId: string,
    kind: QuotaKind,
    count?: number,
    now?: Date
  ): Promise<{ allowed: boolean; record: QuotaRecord }>;
  reset(anonymousId?: string): Promise<void>;
}

/**
 * In-memory QuotaStore implementation.
 * Stores usage in a map keyed by `${anonymousId}:${dateString}:${kind}`.
 */
export class InMemoryQuotaStore implements QuotaStore {
  private store = new Map<string, number>();

  private buildKey(anonymousId: string, kind: QuotaKind, dateStr: string): string {
    return `${anonymousId}:${dateStr}:${kind}`;
  }

  async check(anonymousId: string, kind: QuotaKind, now?: Date): Promise<QuotaRecord> {
    const dateStr = getBangkokDateString(now);
    const key = this.buildKey(anonymousId, kind, dateStr);
    const used = this.store.get(key) ?? 0;
    const limit = DAILY_LIMITS[kind];
    const remaining = Math.max(0, limit - used);
    const resetAt = getBangkokNextMidnightIso(now);

    return {
      used,
      limit,
      remaining,
      resetAt,
    };
  }

  async consume(
    anonymousId: string,
    kind: QuotaKind,
    count = 1,
    now?: Date
  ): Promise<{ allowed: boolean; record: QuotaRecord }> {
    const dateStr = getBangkokDateString(now);
    const key = this.buildKey(anonymousId, kind, dateStr);
    const currentUsed = this.store.get(key) ?? 0;
    const limit = DAILY_LIMITS[kind];

    if (currentUsed + count > limit) {
      return {
        allowed: false,
        record: {
          used: currentUsed,
          limit,
          remaining: Math.max(0, limit - currentUsed),
          resetAt: getBangkokNextMidnightIso(now),
        },
      };
    }

    const newUsed = currentUsed + count;
    this.store.set(key, newUsed);

    return {
      allowed: true,
      record: {
        used: newUsed,
        limit,
        remaining: Math.max(0, limit - newUsed),
        resetAt: getBangkokNextMidnightIso(now),
      },
    };
  }

  async reset(anonymousId?: string): Promise<void> {
    if (!anonymousId) {
      this.store.clear();
      return;
    }
    const prefix = `${anonymousId}:`;
    for (const key of Array.from(this.store.keys())) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }
}

// Preserve quota across hot reloads in development
declare global {
  var __projectEduQuotaStore: InMemoryQuotaStore | undefined;
}

export const quotaStore: QuotaStore =
  globalThis.__projectEduQuotaStore ??
  (globalThis.__projectEduQuotaStore = new InMemoryQuotaStore());
