import { projectRecordKey } from '@/lib/storage/project-records';
import { z } from 'zod';
import { getDefaultStorage, getWipeGeneration, type StorageAdapter } from '@/lib/storage/store';

const QuestionId = z.string().regex(/^(ysc|nsc|tcas):(novelty|feasibility|impact|rigor|fit)$/);
const Answers = z.record(QuestionId, z.string().max(6000));
const key = (projectId: string) => projectRecordKey('judge', projectId);

/** Malformed data is reported, never silently replaced by empty answers. */
export function readJudgeAnswers(projectId: string, storage: StorageAdapter = getDefaultStorage()): Record<string, string> {
  const raw = storage.getItem(key(projectId));
  return raw ? Answers.parse(JSON.parse(raw)) : {};
}

/** Returns false (writes nothing) when a wipe happened after `generation` was captured. */
export function saveJudgeAnswer(projectId: string, questionId: string, answer: string, storage: StorageAdapter = getDefaultStorage(), generation = getWipeGeneration(storage)): boolean {
  QuestionId.parse(questionId);
  if (generation !== getWipeGeneration(storage)) return false;
  const answers = Answers.parse({ ...readJudgeAnswers(projectId, storage), [questionId]: answer });
  storage.setItem(key(projectId), JSON.stringify(answers));
  return true;
}
