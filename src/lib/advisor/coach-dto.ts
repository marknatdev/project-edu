import { z } from 'zod';
import { GoalSchema, TopicCardSchema, ConstraintsSchema, IdeaVariablesLiteSchema, IdeaSchema } from '@/lib/schemas';
import { COACH_MODES, type CoachSessionState, type CoachTurnResult } from './coach-contract';

const tier = z.union([z.literal(1), z.literal(2), z.literal(3)]);
const aspect = z.enum(['problem', 'objective', 'methodology', 'measurement']);
export const CoachModeSchema = z.enum(COACH_MODES);
const resolvedMode = z.enum(['ask', 'research', 'ideate']);
const priorWorkIds = z.array(z.string().min(1).max(200)).max(5);
const text = z.string().max(8000);
export const CoachContextSchema = z.object({
  track: z.enum(['idea_track', 'discovery_track']),
  gradeLevel: z.enum(['m_ton', 'm_plai']),
  goal: GoalSchema,
  topicCard: TopicCardSchema.nullable().optional(),
  ownIdea: z.object({ id: z.string().min(1).max(200), title: z.string().min(1).max(500), description: z.string().min(1).max(8000) }).strict().optional(),
  constraints: ConstraintsSchema.optional(),
}).strict();
export type CoachContext = z.infer<typeof CoachContextSchema>;

export const CoachRequestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('resume'), topicKey: z.string().min(1).max(200) }).strict(),
  z.object({ action: z.literal('open'), topicKey: z.string().min(1).max(200), context: CoachContextSchema }).strict(),
  z.object({ action: z.literal('reset'), topicKey: z.string().min(1).max(200), conversationId: z.string().uuid(), context: CoachContextSchema }).strict(),
  z.object({ action: z.literal('turn'), conversationId: z.string().uuid(), revision: z.number().int().min(1),
    requestId: z.string().uuid(), mode: CoachModeSchema.optional(), requestedTier: tier.optional(), targetAspect: aspect.optional(), learnerResponse: text.optional() }).strict(),
]);
export type CoachApiRequest = z.infer<typeof CoachRequestSchema>;

const progress = z.object({ problem: z.boolean(), objective: z.boolean(), methodology: z.boolean(), measurement: z.boolean() });
const history = z.object({ turnIndex: z.number(), tier, mode: resolvedMode.optional(), priorWorkIds: priorWorkIds.optional(), aspect: aspect.optional(), content: text,
  lenses: z.array(text).optional(), examples: z.array(text).optional(), learnerResponse: text.optional(), timestamp: z.string(), source: z.enum(['ai', 'fallback']).optional() });
export const CoachStateSchema: z.ZodType<CoachSessionState> = z.object({
  anonymousId: z.string(), ideaId: z.string().optional(), turnCount: z.number(), unlockedTiers: z.array(tier),
  aspectProgress: progress, history: z.array(history), isComplete: z.boolean(),
});
export const CoachTurnSchema: z.ZodType<CoachTurnResult> = z.object({
  source: z.enum(['ai', 'fallback']), tier, tierDowngraded: z.boolean().optional(), mode: resolvedMode.optional(), priorWorkIds: priorWorkIds.optional(), aspect: z.union([aspect, z.literal('completed')]),
  content: text, lenses: z.array(text).optional(), examples: z.array(text).optional(), state: CoachStateSchema,
});
export const CoachConversationSchema = z.object({
  id: z.string().uuid(), topicKey: z.string(), revision: z.number().int(), context: CoachContextSchema,
  state: CoachStateSchema, turn: CoachTurnSchema,
});
export type CoachConversation = z.infer<typeof CoachConversationSchema>;
export const CoachEnvelopeSchema = z.object({ turn: CoachTurnSchema, conversation: CoachConversationSchema });

// Local work is resumable but is never submitted as server progression.
export const CoachLocalWorkSchema = z.object({
  input: z.string(), rewriteInput: z.string().default(''), studentRewrite: z.string().nullable().default(null),
  variablesDraft: IdeaVariablesLiteSchema.partial().default({}), savedIdea: IdeaSchema.nullable().default(null),
  phase: z.enum(['chatting', 'rewrite', 'variables', 'done']).default('chatting'),
  drafts: z.array(z.object({ id: z.string(), content: z.string(), timestamp: z.string() })).default([]),
});
export type CoachLocalWork = z.infer<typeof CoachLocalWorkSchema>;
