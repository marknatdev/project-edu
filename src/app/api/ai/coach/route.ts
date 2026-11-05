import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  coachSessionStore,
  nextCoachTurn,
  type CoachSessionState,
} from '@/lib/ai/socratic-coach';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CoachRequestSchema = z
  .object({
    anonymousId: z.string().min(1),
    ideaId: z.string().optional(),
    requestedTier: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    targetAspect: z
      .enum(['problem', 'objective', 'methodology', 'measurement'])
      .optional(),
    learnerResponse: z.string().optional(),
    ideaContext: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        subfieldId: z.string().optional(),
        gradeLevel: z.enum(['m_ton', 'm_plai']).optional(),
      })
      .optional(),
    state: z.custom<CoachSessionState>().optional(),
  })
  .strict();

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = CoachRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid input or disallowed fields detected (Zero-PII violated)',
        details: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Use client-provided session state if valid, otherwise resolve from server store
  const sessionState: CoachSessionState =
    data.state && typeof data.state.turnCount === 'number'
      ? data.state
      : coachSessionStore.getOrCreate(data.anonymousId, data.ideaId);

  const turnResult = await nextCoachTurn(sessionState, {
    requestedTier: data.requestedTier,
    targetAspect: data.targetAspect,
    learnerResponse: data.learnerResponse,
    ideaContext: data.ideaContext,
  });

  coachSessionStore.save(sessionState);

  return NextResponse.json({
    turn: turnResult,
  });
}
