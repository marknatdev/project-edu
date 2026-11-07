import { z } from 'zod';
import { EvaluationAxisSchemaEnum, IdeaSchema } from '@/lib/schemas';

/** Pivot wire contract shared by the route and the browser client. The request
 * never carries tiers/unlock state or an owner; the view is server authority. */
const text = (max: number) => z.string().max(max);
export const PivotRequestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('open'), idea: IdeaSchema, axis: EvaluationAxisSchemaEnum }).strict(),
  z.object({ action: z.literal('turn'), pivotId: z.string().uuid(), revision: z.number().int().min(1), requestId: z.string().uuid(),
    requestedTier: z.union([z.literal(2), z.literal(3)]), learnerResponse: text(2000).optional() }).strict(),
]);
export type PivotRequest = z.infer<typeof PivotRequestSchema>;

const tiers = z.union([z.tuple([z.literal(1)]), z.tuple([z.literal(1), z.literal(2)]), z.tuple([z.literal(1), z.literal(2), z.literal(3)])]);
export const PivotViewSchema = z.object({
  id: z.string().uuid(), revision: z.number().int().min(1), axis: EvaluationAxisSchemaEnum, unlockedTiers: tiers,
  tier1Prompt: text(4000).min(1), tier1Response: text(2000).optional(), tier2Lenses: z.array(text(1000)).max(4).optional(),
  tier3Examples: z.array(text(1000)).max(3).optional(), source: z.enum(['ai', 'fallback']),
});
export type PivotView = z.infer<typeof PivotViewSchema>;
