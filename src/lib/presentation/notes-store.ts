import { projectRecordKey } from '@/lib/storage/project-records';
import type { StorageAdapter } from '@/lib/storage/store';
import { PresentationNotesSchema, type PresentationNotes } from './notes';

const key = (projectId: string) => projectRecordKey('presentation', projectId);

export function readPresentationNotes(projectId: string, storage: StorageAdapter = localStorage): PresentationNotes | null {
  const raw = storage.getItem(key(projectId));
  return raw ? PresentationNotesSchema.parse(JSON.parse(raw)) : null;
}

export function savePresentationNotes(projectId: string, notes: PresentationNotes, storage: StorageAdapter = localStorage): void {
  readPresentationNotes(projectId, storage); // Refuse to replace malformed saved notes.
  storage.setItem(key(projectId), JSON.stringify(PresentationNotesSchema.parse(notes)));
}
