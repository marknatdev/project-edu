import { z } from 'zod';
import { getQuotaExceededMessage, DAILY_LIMITS } from '@/lib/ai/quota';
import { assembleProposal } from '@/lib/proposal/assemble';
import { IdeaSchema } from '@/lib/schemas';
import { resolvePrincipal } from '@/lib/auth/principal.server';
import { foundationForOwner } from '@/lib/persistence/factory.server';
import { fingerprint, invalidInput, json, ownerFailure, readBody } from '@/lib/persistence/owner-route.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UNAVAILABLE_TH = 'ระบบบันทึกโควตาหรือสิทธิ์ข้อเสนอโครงงานยังไม่พร้อม กรุณาตรวจโควตาแล้วลองใหม่ งานที่บันทึกในเครื่องยังอยู่และแก้ไขเองได้';
const sources = z
  .object({
    idea: IdeaSchema.partial().optional().nullable(),
    studentAnswers: z
      .object({
        problemStatement: z.string().optional(),
        objectives: z.union([z.array(z.string()), z.string()]).optional(),
        hypothesis: z.string().optional(),
        methodology: z.string().optional(),
        independentVar: z.union([z.array(z.string()), z.string()]).optional(),
        dependentVar: z.union([z.array(z.string()), z.string()]).optional(),
        controlledVar: z.union([z.array(z.string()), z.string()]).optional(),
      })
      .optional(),
    preserveEdits: z.boolean().optional(),
  })
  .optional();
// DEF-04: no anonymousId; the owner is server-verified. requestId makes a
// retried consume idempotent (charged once) for that owner only.
const ProposalApiRequestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('check') }).strict(),
  z.object({ action: z.literal('consume'), requestId: z.string().uuid(), sources }).strict(),
]);

export async function POST(req: Request) {
  const read = await readBody(req);
  if ('response' in read) return read.response;
  const parsed = ProposalApiRequestSchema.safeParse(read.body);
  if (!parsed.success) return invalidInput(parsed.error.issues);
  try {
    const who = await resolvePrincipal(req);
    const store = await foundationForOwner(who.owner);
    const limit = DAILY_LIMITS.proposal;
    if (parsed.data.action === 'check') {
      const record = await store.quotaStatus('proposal');
      const allowed = record.remaining > 0;
      return who.apply(json(200, { success: true, allowed, remaining: record.remaining, limit, resetAt: record.resetAt,
        messageTh: allowed ? undefined : getQuotaExceededMessage('proposal') }));
    }
    const input = parsed.data;
    const result = await store.consumeQuota({ kind: 'proposal', requestId: input.requestId, fingerprint: fingerprint({ v: 1, sources: input.sources ?? null }) });
    // A committed quota response may arrive after a concurrent owner wipe.
    await store.quotaStatus('proposal');
    if (!result.allowed) {
      return who.apply(json(429, { success: false, allowed: false, error: 'QUOTA_EXCEEDED', messageTh: getQuotaExceededMessage('proposal'),
        remaining: result.remaining, limit, resetAt: result.resetAt }));
    }
    // Assembled strictly from the student's own sources (no AI).
    const proposal = input.sources ? assembleProposal({ idea: input.sources.idea, studentAnswers: input.sources.studentAnswers,
      preserveEdits: input.sources.preserveEdits }) : null;
    return who.apply(json(200, { success: true, allowed: true, remaining: result.remaining, limit, resetAt: result.resetAt, proposal }));
  } catch (e) { return ownerFailure(req, e, UNAVAILABLE_TH); }
}
