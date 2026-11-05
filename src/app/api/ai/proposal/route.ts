import { NextResponse } from 'next/server';
import { z } from 'zod';
import { quotaStore, getQuotaExceededMessage, DAILY_LIMITS } from '@/lib/ai/quota';
import { assembleProposal } from '@/lib/proposal/assemble';
import { IdeaSchema } from '@/lib/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ProposalApiRequestSchema = z.object({
  anonymousId: z.string().min(1),
  action: z.enum(['check', 'consume']),
  sources: z
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
    .optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = ProposalApiRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { anonymousId, action, sources } = parsed.data;

  if (action === 'check') {
    const record = await quotaStore.check(anonymousId, 'proposal');
    const allowed = record.remaining > 0;
    return NextResponse.json({
      success: true,
      allowed,
      remaining: record.remaining,
      limit: DAILY_LIMITS.proposal,
      resetAt: record.resetAt,
      messageTh: allowed ? undefined : getQuotaExceededMessage('proposal'),
    });
  }

  // action === 'consume'
  const quotaResult = await quotaStore.consume(anonymousId, 'proposal', 1);
  if (!quotaResult.allowed) {
    return NextResponse.json(
      {
        success: false,
        allowed: false,
        error: 'Quota exceeded',
        messageTh: getQuotaExceededMessage('proposal'),
        remaining: quotaResult.record.remaining,
        limit: DAILY_LIMITS.proposal,
        resetAt: quotaResult.record.resetAt,
      },
      { status: 429 }
    );
  }

  // Assemble proposal strictly from student sources if supplied
  let proposal = null;
  if (sources) {
    proposal = assembleProposal({
      idea: sources.idea,
      studentAnswers: sources.studentAnswers,
      preserveEdits: sources.preserveEdits,
    });
  }

  return NextResponse.json({
    success: true,
    allowed: true,
    remaining: quotaResult.record.remaining,
    limit: DAILY_LIMITS.proposal,
    resetAt: quotaResult.record.resetAt,
    proposal,
  });
}
