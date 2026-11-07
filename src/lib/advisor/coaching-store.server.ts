import 'server-only';
import { randomUUID, createHash } from 'node:crypto';
import { createInitialCoachState, nextCoachTurn } from '@/lib/ai/socratic-coach';
import type { FoundationStore, RecordSnapshot } from '@/lib/persistence/contracts';
import { CoachConversationSchema, type CoachConversation, type CoachApiRequest, type CoachContext } from './coach-dto';

type RecordData = CoachConversation & { receipts: Record<string, string> };
export class CoachingError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
function decode(row: RecordSnapshot): RecordData {
  return { ...CoachConversationSchema.parse(row.data), id: row.id, revision: row.revision, receipts: (row.data.receipts ?? {}) as Record<string,string> };
}
const snapshot = (record: RecordData): RecordSnapshot => ({ id: record.id, revision: record.revision, data: record });
/** A generated starter card is coached from its own problem, rough direction and
 * interest link (it has no catalog entry); catalog cards keep the phenomenon. */
function cardDescription(card: CoachContext['topicCard']): string | undefined {
  if (!card) return undefined;
  if (!card.starter) return card.phenomenon;
  return [card.starter.problem, `แนวทางทดลองคร่าว ๆ: ${card.starter.roughDirection}`, `เชื่อมกับความสนใจ: ${card.starter.interestLink}`].join('\n');
}
const ideaContext = (context: CoachContext) => ({ title: context.ownIdea?.title ?? context.topicCard?.title, description: context.ownIdea?.description ?? cardDescription(context.topicCard),
  gradeLevel: context.gradeLevel, subfieldId: context.topicCard?.subfieldId, constraints: context.constraints, goal: context.goal });

/** Same server progression through both durable adapters. A store is already
 * bound to verified owner + wipe generation; callers never submit server state. */
export async function coachingOperation(store: FoundationStore, request: CoachApiRequest): Promise<CoachConversation> {
  if (request.action === 'resume') {
    const previous = await store.read('coaching', request.topicKey);
    if (!previous) throw new CoachingError(404, 'ไม่มีบทสนทนานี้ในพื้นที่บัญชี งาน Guest ยังอยู่ เลือกกลับไปทำงาน Guest เดิมได้');
    return CoachConversationSchema.parse(decode(previous));
  }
  if (request.action === 'open' || request.action === 'reset') {
    const previous = await store.read('coaching', request.topicKey);
    if (request.action === 'open' && previous) return CoachConversationSchema.parse(decode(previous));
    if (request.action === 'reset' && previous?.id !== request.conversationId) throw new CoachingError(409, 'บทสนทนาเปลี่ยนแล้ว กรุณาโหลดข้อมูลล่าสุดก่อนเริ่มใหม่');
    // Literal non-identifying prompt label: never send Auth UUID/email/name or
    // guest capability/digest to AI or duplicate identity profile into app rows.
    const state = createInitialCoachState('guest', request.topicKey);
    const turn = await nextCoachTurn(state, { ideaContext: ideaContext(request.context) });
    const record: RecordData = { id: randomUUID(), topicKey: request.topicKey, revision: 1, context: request.context, state, turn, receipts: {} };
    const saved = await store.write({ collection: 'coaching', key: request.topicKey,
      expected: request.action === 'reset' ? { id: request.conversationId, revision: null } : null, next: snapshot(record) });
    return CoachConversationSchema.parse(decode(saved));
  }
  const row = await store.readById('coaching', request.conversationId);
  if (!row) throw new CoachingError(404, 'ไม่พบบทสนทนานี้ กรุณาเปิดหัวข้ออีกครั้ง');
  const record = decode(row);
  const fingerprint = createHash('sha256').update(JSON.stringify({ ...(request.mode ? { mode: request.mode } : {}), requestedTier: request.requestedTier ?? 1, learnerResponse: request.learnerResponse?.trim() ?? '', targetAspect: request.targetAspect ?? null })).digest('hex');
  if (record.receipts[request.requestId]) {
    if (record.receipts[request.requestId] !== fingerprint) throw new CoachingError(409, 'รหัสคำขอเดิมมีข้อมูลไม่ตรงกัน');
    return CoachConversationSchema.parse(record);
  }
  if (record.revision !== request.revision) throw new CoachingError(409, 'มีข้อความใหม่จากอีกหน้าต่าง กรุณาโหลดบทสนทนาล่าสุด ข้อความของคุณยังเก็บไว้');
  if (record.state.history.length >= 64) throw new CoachingError(409, 'บทสนทนานี้เต็มแล้ว กรุณาสรุปไอเดียหรือเริ่มบทสนทนาใหม่');
  record.turn = await nextCoachTurn(record.state, { ...request, ideaContext: ideaContext(record.context) });
  record.revision++;
  record.receipts[request.requestId] = fingerprint;
  const saved = await store.write({ collection: 'coaching', key: record.topicKey,
    expected: { id: record.id, revision: request.revision }, next: snapshot(record), receipt: { id: request.requestId, fingerprint } });
  return CoachConversationSchema.parse(decode(saved));
}
/** Erases all foundation-owned records, batches/quota and leases, not Auth identity. */
export async function wipeCoaching(store: FoundationStore): Promise<void> { await store.wipe(); }
