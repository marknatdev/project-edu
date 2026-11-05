import { z } from 'zod';

/** Optional reflections written by the learner, never inferred from their Plan. */
export const PresentationNotesSchema = z.object({
  role: z.string().max(1500), skills: z.string().max(1500), learning: z.string().max(1500),
  targetField: z.string().max(1500), results: z.string().max(1500),
});
export type PresentationNotes = z.infer<typeof PresentationNotesSchema>;
export const EMPTY_PRESENTATION_NOTES: PresentationNotes = { role: '', skills: '', learning: '', targetField: '', results: '' };
