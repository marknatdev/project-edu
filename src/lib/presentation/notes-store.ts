import { projectRecordKey } from '@/lib/storage/project-records';
import { getDefaultStorage, getWipeGeneration, type StorageAdapter } from '@/lib/storage/store';
import { PresentationNotesSchema, type PresentationNotes } from './notes';

const key = (projectId: string) => projectRecordKey('presentation', projectId);

export function readPresentationNotes(projectId: string, storage: StorageAdapter = getDefaultStorage()): PresentationNotes | null {
  const raw = storage.getItem(key(projectId));
  return raw ? PresentationNotesSchema.parse(JSON.parse(raw)) : null;
}

/** Mounted editors must pass the storage and generation captured when notes were read. */
export function savePresentationNotes(projectId: string, notes: PresentationNotes, storage: StorageAdapter = getDefaultStorage(), generation = getWipeGeneration(storage)): boolean {
  if (generation !== getWipeGeneration(storage)) return false;
  readPresentationNotes(projectId, storage); // Refuse to replace malformed saved notes.
  storage.setItem(key(projectId), JSON.stringify(PresentationNotesSchema.parse(notes)));
  return true;
}
