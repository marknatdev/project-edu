import { z } from 'zod';
import { ProposalSchema, PlanSchema } from '@/lib/schemas';

// Explicit allowlist: never export Project/Learner IDs, Interview or chat history.
export const ExportSnapshotSchema = z.object({
  version: z.literal(1),
  title: z.string(),
  proposal: ProposalSchema,
  plan: PlanSchema,
});
export type ExportSnapshot = z.infer<typeof ExportSnapshotSchema>;
export type ExportInput = Omit<ExportSnapshot, 'version'>;

export function createExportSnapshot(input: ExportInput): ExportSnapshot {
  return ExportSnapshotSchema.parse({ ...input, version: 1 });
}
