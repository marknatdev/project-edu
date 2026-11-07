import { z } from 'zod';
import type { TopicCard } from '@/types/domain';
import { TopicCardSchema } from '@/lib/schemas';

// Only server-authenticated request context may choose an OwnerKey. Never accept
// one in a JSON body/query/header. g = signed guest capability digest; u = verified auth UUID.
export type OwnerKey = `g:${string}` | `u:${string}`;
export class PersistenceError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
export const RecordSnapshotSchema = z.object({ id: z.string().uuid(), revision: z.number().int().positive(), data: z.record(z.string(), z.unknown()) });
export type RecordSnapshot = z.infer<typeof RecordSnapshotSchema>;
export interface RecordWrite {
  collection: 'coaching' | 'discovery' | 'pivot'; key: string;
  expected: { id: string; revision: number | null } | null;
  next: RecordSnapshot;
  receipt?: { id: string; fingerprint: string };
}
export interface CardQuota {
  day: string; used: number; reserved: number; remaining: number;
  freeRemaining: number; extraRemaining: number; resetAt: string;
}
export interface CardBatch {
  requestId: string; leaseId: string; leaseExpiresAt:string; claimed: boolean;
  state: 'pending' | 'complete' | 'failed'; reserved: number;
  cards: TopicCard[]; quota: CardQuota;
}
export const CardQuotaSchema = z.object({ day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), used: z.number().int().min(0).max(35),
  reserved: z.number().int().min(0).max(35), remaining: z.number().int().min(0).max(35),
  freeRemaining: z.number().int().min(0).max(5), extraRemaining: z.number().int().min(0).max(30), resetAt: z.string().datetime() })
  .refine(q => q.used+q.reserved+q.remaining===35, 'Invalid quota total');
export const CardBatchSchema = z.object({ requestId:z.string().uuid(),leaseId:z.string().uuid(),leaseExpiresAt:z.string().datetime(),claimed:z.boolean(),
  state:z.enum(['pending','complete','failed']),reserved:z.number().int().min(0).max(5),cards:z.array(TopicCardSchema).max(5),quota:CardQuotaSchema });
export const QuotaConsumptionSchema = z.object({ allowed:z.boolean(),used:z.number().int().min(0).max(5),remaining:z.number().int().min(0).max(5),resetAt:z.string().datetime() });

/** Shared admission kinds. evaluate/pivot (migration 0005) are independent of
 * the daily evaluate/proposal allowances: Pivot never touches proposal quota. */
export type RateKind = 'auth' | 'coach' | 'cards' | 'evaluate' | 'pivot';
/** Owner/generation bound, async, no transaction spans an upstream AI call. */
export interface FoundationStore {
  read(collection: RecordWrite['collection'], key: string): Promise<RecordSnapshot | null>;
  readById(collection: RecordWrite['collection'], id: string): Promise<RecordSnapshot | null>;
  write(input: RecordWrite): Promise<RecordSnapshot>;
  wipe(): Promise<void>;
  allowRequest(kind: RateKind): Promise<boolean>;
  cardQuota(): Promise<CardQuota>;
  quotaStatus(kind: 'evaluate' | 'proposal'): Promise<{ used:number; remaining:number; limit:number; resetAt:string }>;
  listCards(input: { limit:number; cursor?:string }): Promise<{ cards:TopicCard[]; nextCursor:string|null }>;
  beginBatch(input: { requestId: string; fingerprint: string; count: number }): Promise<CardBatch>;
  completeBatch(leaseId: string, cards: TopicCard[]): Promise<CardBatch>;
  failBatch(leaseId: string): Promise<CardBatch>;
  consumeQuota(input: { kind: 'evaluate' | 'proposal'; requestId: string; fingerprint: string; count?: number }): Promise<{ allowed: boolean; used: number; remaining: number; resetAt: string }>;
}
export interface RpcTransport {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }>;
}
