import { z } from 'zod';
import { ProposalSchema, PlanSchema } from '@/lib/schemas';
import { PresentationNotesSchema } from '@/lib/presentation/notes';

// Explicit allowlist: never export Project/Learner IDs, Interview or chat history.
export const ExportSnapshotSchema = z.object({
  version: z.literal(1),
  title: z.string(),
  proposal: ProposalSchema,
  plan: PlanSchema,
  includeTemplates: z.boolean().optional(),
  presentationNotes: PresentationNotesSchema.optional(),
});
export type ExportSnapshot = z.infer<typeof ExportSnapshotSchema>;
export type ExportInput = Omit<ExportSnapshot, 'version'>;

export function createExportSnapshot(input: ExportInput): ExportSnapshot {
  return ExportSnapshotSchema.parse({ ...input, version: 1 });
}
