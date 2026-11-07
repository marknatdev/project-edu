import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { callAiGateway } from '@/lib/ai/gateway';
import { AXIS_PIVOT_GUIDES } from './guides';
import type { FoundationStore, RecordSnapshot } from '@/lib/persistence/contracts';
import type { EvaluationAxis } from '@/types/domain';
import { PivotViewSchema, type PivotRequest, type PivotView } from './pivot-dto';
export { PivotRequestSchema } from './pivot-dto';

/**
 * DEF-02 server authority for Socratic Pivot progression (ADR 0002).
 * One durable record per verified owner + idea content + red axis, in the
 * FoundationStore 'pivot' collection (same CAS/receipt/wipe semantics as
 * DEF-01 coaching). The browser never submits tiers or unlock state:
 *   Tier 1 question on open -> learner answer -> Tier 2 lenses -> explicit
 *   Tier 3 request. Already-served tiers replay without another model call.
 * DEF-03: nothing here touches evaluate/proposal allowances; model calls are
 * bounded by the independent 'pivot' admission (migration 0005).
 */
const RecordSchema = PivotViewSchema.omit({ id: true, revision: true }).extend({
  key: z.string().min(1).max(200),
  idea: z.object({ title: z.string(), description: z.string(), gradeLevel: z.string(), goal: z.string() }),
  receipts: z.record(z.string(), z.string()),
});
type PivotRecord = z.infer<typeof RecordSchema> & { id: string; revision: number };

export class PivotError extends Error {
  constructor(public status: number, public code: string, message: string, public pivot?: PivotView) { super(message); }
}
const view = (r: PivotRecord): PivotView => PivotViewSchema.parse({ id: r.id, revision: r.revision, axis: r.axis, unlockedTiers: r.unlockedTiers,
  tier1Prompt: r.tier1Prompt, tier1Response: r.tier1Response, tier2Lenses: r.tier2Lenses, tier3Examples: r.tier3Examples, source: r.source });
const decode = (row: RecordSnapshot): PivotRecord => ({ ...RecordSchema.parse(row.data), id: row.id, revision: row.revision });
const snapshot = ({ id, revision, ...data }: PivotRecord): RecordSnapshot => ({ id, revision, data });
const sha = (value: string) => createHash('sha256').update(value).digest('hex');

const LensesSchema = z.object({ tier2Lenses: z.array(z.string().min(1).max(1000)).min(1).max(4) });
const ExamplesSchema = z.object({ tier3Examples: z.array(z.string().min(1).max(1000)).min(2).max(3) });
const SYSTEM = `คุณคือครูที่ปรึกษาโครงงาน (Socratic Pivot Coach) ปฏิบัติตาม ADR 0002:
- Tier 2: ให้กรอบความคิด/คำใบ้ (Lenses) ที่ผู้เรียนต้องคิดต่อเอง ไม่ใช่คำตอบสำเร็จรูป
- Tier 3: เสนอตัวอย่างมุมมองใหม่สั้น ๆ 2-3 ทาง (Examples) เฉพาะเมื่อผู้เรียนติดตันจริง
ตอบเป็น JSON เท่านั้น ห้ามขอหรือใส่ข้อมูลส่วนตัว`;

async function generate(record: PivotRecord, tier: 2 | 3) {
  const guide = AXIS_PIVOT_GUIDES[record.axis as EvaluationAxis] ?? AXIS_PIVOT_GUIDES.feasibility;
  // Learner-authored content only; no owner/identity reference goes to the model.
  const prompt = `หัวข้อ: ${record.idea.title}\nคำอธิบาย: ${record.idea.description}\nระดับชั้น: ${record.idea.gradeLevel}\nด้านที่ต้องปรับปรุง: ${record.axis}
คำถามระดับ 1: ${record.tier1Prompt}\nคำตอบของผู้เรียน: ${record.tier1Response ?? ''}\n${tier === 2 ? 'สร้าง tier2Lenses 2 ข้อ' : `กรอบคิดที่ได้แล้ว: ${(record.tier2Lenses ?? []).join(' | ')}\nสร้าง tier3Examples 2-3 ข้อ`}`;
  return tier === 2
    ? callAiGateway({ schema: LensesSchema, prompt, systemPrompt: SYSTEM, fallback: () => ({ tier2Lenses: guide.tier2Lenses }) })
    : callAiGateway({ schema: ExamplesSchema, prompt, systemPrompt: SYSTEM, fallback: () => ({ tier3Examples: guide.tier3Examples.slice(0, 3) }) });
}

/** `admit` is called exactly before durable creation or a model call. */
export async function pivotOperation(store: FoundationStore, request: PivotRequest, admit: () => Promise<boolean>): Promise<PivotView> {
  const limited = () => new PivotError(429, 'RATE_LIMITED', 'ขอคำแนะนำถี่เกินไป กรุณารอประมาณหนึ่งนาที (ไม่ได้ใช้โควตาข้อเสนอโครงงานหรือการประเมิน)');
  if (request.action === 'open') {
    const { idea, axis } = request;
    // Bound to the idea's identity AND content: an edited idea is a new Pivot topic.
    const key = `${axis}:${sha([idea.id, idea.title, idea.description].join('\n'))}`;
    const existing = await store.read('pivot', key);
    if (existing) return view(decode(existing));
    if (!await admit()) throw limited();
    const record: PivotRecord = { id: randomUUID(), revision: 1, key, axis, unlockedTiers: [1], tier1Prompt: AXIS_PIVOT_GUIDES[axis].tier1, source: 'fallback',
      idea: { title: idea.title, description: idea.description, gradeLevel: idea.gradeLevel, goal: idea.goal }, receipts: {} };
    return view(decode(await store.write({ collection: 'pivot', key, expected: null, next: snapshot(record) })));
  }
  const row = await store.readById('pivot', request.pivotId);
  if (!row) throw new PivotError(404, 'NOT_FOUND', 'ไม่พบห้องปรับมุมมองนี้ กรุณาเปิดใหม่จากหน้าผลประเมิน');
  const record = decode(row);
  const answer = request.learnerResponse?.trim() ?? '';
  const print = sha(JSON.stringify({ tier: request.requestedTier, answer }));
  const prior = record.receipts[request.requestId];
  if (prior) {
    if (prior !== print) throw new PivotError(409, 'IDEMPOTENCY_CONFLICT', 'รหัสคำขอเดิมมีข้อมูลไม่ตรงกัน', view(record));
    return view(record);
  }
  if (record.revision !== request.revision) throw new PivotError(409, 'REVISION_CONFLICT', 'มีการเปลี่ยนแปลงจากอีกหน้าต่าง กรุณาใช้ข้อมูลล่าสุด', view(record));
  if (record.unlockedTiers.some(t => t === request.requestedTier)) return view(record); // served once; replay, no model call
  if (request.requestedTier === 2 && !answer) {
    throw new PivotError(409, 'TIER_LOCKED', 'ลองตอบคำถามระดับ 1 ด้วยความคิดของตัวเองก่อน (ตอบสั้น ๆ หรือบอกว่ายังคิดไม่ออกก็ได้) แล้วจึงขอกรอบความคิด', view(record));
  }
  if (request.requestedTier === 3 && !record.unlockedTiers.some(t => t === 2)) {
    throw new PivotError(409, 'TIER_LOCKED', 'ตัวอย่างมุมมองใหม่จะเปิดหลังจากตอบคำถามระดับ 1 และได้รับกรอบความคิดระดับ 2 แล้ว', view(record));
  }
  if (!await admit()) throw limited();
  if (request.requestedTier === 2) {
    record.tier1Response = answer;
    const result = await generate(record, 2);
    record.tier2Lenses = (result.data as z.infer<typeof LensesSchema>).tier2Lenses; record.source = result.source; record.unlockedTiers = [1, 2];
  } else {
    const result = await generate(record, 3);
    record.tier3Examples = (result.data as z.infer<typeof ExamplesSchema>).tier3Examples; record.source = result.source; record.unlockedTiers = [1, 2, 3];
  }
  record.revision++;
  record.receipts[request.requestId] = print;
  const saved = await store.write({ collection: 'pivot', key: record.key, expected: { id: record.id, revision: request.revision }, next: snapshot(record),
    receipt: { id: request.requestId, fingerprint: print } });
  return view(decode(saved));
}
