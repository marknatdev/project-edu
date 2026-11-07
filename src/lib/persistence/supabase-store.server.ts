import 'server-only';
import { acceptedCardCandidates, semanticRepeat } from './cards.server';
import type { TopicCard } from '@/types/domain';
import { batchLeaseSeconds } from './lease.server';
import { z } from 'zod';
import { PersistenceError, RecordSnapshotSchema, CardQuotaSchema, CardBatchSchema, QuotaConsumptionSchema, type OwnerKey, type RpcTransport, type FoundationStore, type RecordWrite } from './contracts';

async function invoke(rpc: RpcTransport, name: string, args: Record<string, unknown>): Promise<unknown> {
  let result;
  try { result = await rpc.rpc(name, args); }
  catch { throw new PersistenceError(503, 'PERSISTENCE_UNAVAILABLE'); }
  const { data, error } = result;
  if (error) {
    const status = ({ P0400: 400, P0404: 404, P0409: 409, P0410: 410, P0429: 429 } as Record<string, number>)[error.code ?? ''] ?? 503;
    // No provider message/SQL/connection string is allowed through this seam.
    throw new PersistenceError(status, status === 503 ? 'PERSISTENCE_UNAVAILABLE' : `PERSISTENCE_${status}`);
  }
  return data;
}
function decode<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new PersistenceError(503,'PERSISTENCE_UNAVAILABLE');
  return parsed.data;
}
export async function connectFoundationStore(rpc: RpcTransport, owner: OwnerKey): Promise<FoundationStore> {
  const epoch = await invoke(rpc, 'edu_bind_owner', { p_owner: owner });
  if (!Number.isInteger(epoch) || Number(epoch) <= 0) throw new PersistenceError(503, 'PERSISTENCE_UNAVAILABLE');
  const call = (op: string, input: object = {}) => invoke(rpc, 'edu_foundation', { p_owner: owner, p_epoch: epoch, p_op: op, p_input: input });
  const listCards: FoundationStore['listCards'] = async input => decode(z.object({cards:z.array(CardBatchSchema.shape.cards.element).max(100),nextCursor:z.string().nullable()}),await call('listCards',input));
  return {
    async read(collection, key) { const data = await call('read', { collection, key }); return data === null ? null : decode(RecordSnapshotSchema,data); },
    async readById(collection, id) { const data = await call('readById', { collection, id }); return data === null ? null : decode(RecordSnapshotSchema,data); },
    async write(input: RecordWrite) { return decode(RecordSnapshotSchema,await call('write', input)); },
    async wipe() { await call('wipe'); },
    async allowRequest(kind) { return decode(z.boolean(),await call('allowRequest',{kind})); },
    async cardQuota() { return decode(CardQuotaSchema,await call('cardQuota')); },
    async quotaStatus(kind) { return decode(z.object({used:z.number().int().min(0).max(5),remaining:z.number().int().min(0).max(5),limit:z.number().int().min(1).max(5),resetAt:z.string().datetime()}),await call('quotaStatus',{kind})); },
    listCards,
    async beginBatch(input) { return decode(CardBatchSchema,await call('beginBatch', {...input,leaseSeconds:batchLeaseSeconds()})); },
    async completeBatch(leaseId, candidates) {
      // Reject malformed candidates individually; never replace them with fixtures.
      const valid = acceptedCardCandidates(candidates);
      // Monotonic owner ledger + generation fencing. Read all pages, screen,
      // then CAS its cardinality under the SQL owner lock. Any overlapping
      // acceptance forces a fresh screen; no transaction spans AI/network work.
      for (let attempt = 0; attempt < 8; attempt++) {
        const ledger = new Map<string, TopicCard>();
        let cursor: string | undefined;
        do {
          const page = await listCards({ limit: 100, cursor });
          for (const card of page.cards) ledger.set(card.id, card);
          cursor = page.nextCursor ?? undefined;
        } while (cursor);
        const accepted: typeof valid = [];
        for (const candidate of valid) {
          if (!semanticRepeat(candidate.card, [...ledger.values(), ...accepted.map(x => x.card)])) accepted.push(candidate);
        }
        try { return decode(CardBatchSchema, await call('completeBatch', { leaseId, cards: accepted, ledgerCount: ledger.size })); }
        catch (e) { if (!(e instanceof PersistenceError && e.status === 409) || attempt === 7) throw e; }
      }
      throw new PersistenceError(409, 'PERSISTENCE_409');
    },
    async failBatch(leaseId) { return decode(CardBatchSchema,await call('failBatch', { leaseId })); },
    async consumeQuota(input) { return decode(QuotaConsumptionSchema,await call('consumeQuota', input)); },
  };
}
