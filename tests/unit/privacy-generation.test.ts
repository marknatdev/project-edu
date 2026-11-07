import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bumpWipeGeneration, createMemoryStorage, createProject, getDefaultStorage, getDefaultState,
  getEvaluations, getPivots, getWipeGeneration, saveEvaluation, savePivot, saveState,
  scopedStorage, STORAGE_KEY, WIPE_GENERATION_KEY, wipeAllLearnerData,
  getInterview, getLearner, getProjects, loadState, saveInterview, saveLearner,
  setActiveProjectId, updateProjectProposal,
} from '@/lib/storage/store';
import { readJudgeAnswers, saveJudgeAnswer } from '@/lib/judge/answers';
import { consumeProposalQuota } from '@/lib/proposal/quota-client';
import { setWorkspaceScope } from '@/lib/auth/workspace-client';
import { readPresentationNotes, savePresentationNotes } from '@/lib/presentation/notes-store';
import { EMPTY_PRESENTATION_NOTES } from '@/lib/presentation/notes';
import type { Evaluation, Pivot } from '@/types/domain';

const axis = { score: 7, badge: 'green' as const, rationale: 'ok', feedback: 'ok' };
const evaluation: Evaluation = {
  id: 'late-evaluation', ideaId: 'idea', overallScore: 7, overallBadge: 'green',
  axes: { novelty: axis, feasibility: axis, impact: axis, rigor: axis, fit: axis },
  safetyFlags: [], priorWork: [], evaluatedAt: '2026-11-06T03:00:00Z',
};
const pivot: Pivot = {
  id: 'late-pivot', originalIdeaId: 'idea', redAxes: ['feasibility'],
  coaching: { tier: 1, tier1Prompt: 'prompt' }, createdAt: '2026-11-06T03:00:00Z',
};
const notes = { ...EMPTY_PRESENTATION_NOTES, role: 'private reflection' };

afterEach(() => { setWorkspaceScope('guest'); vi.unstubAllGlobals(); });

describe('privacy generation-bound persistence', () => {
  it('rejects old evaluations and pivots even after state is recreated, but permits fresh work', () => {
    const storage = createMemoryStorage();
    const beforeWipe = getWipeGeneration(storage);
    wipeAllLearnerData(storage);
    saveState(getDefaultState(), storage);
    expect(saveEvaluation(evaluation, storage, beforeWipe)).toBe(false);
    expect(savePivot(pivot, storage, beforeWipe)).toBe(false);
    expect(getEvaluations(storage)).toEqual([]);
    expect(getPivots(storage)).toEqual([]);
    const afterWipe = getWipeGeneration(storage);
    expect(saveEvaluation(evaluation, storage, afterWipe)).toBe(true);
    expect(savePivot(pivot, storage, afterWipe)).toBe(true);
    expect(getEvaluations(storage)).toEqual([evaluation]);
    expect(getPivots(storage)).toEqual([pivot]);
  });

  it('rejects erased notes even if the same project id has been recreated', () => {
    const storage = createMemoryStorage();
    createProject({ id: 'project' }, storage);
    const beforeWipe = getWipeGeneration(storage);
    savePresentationNotes('project', notes, storage, beforeWipe);
    wipeAllLearnerData(storage);
    createProject({ id: 'project' }, storage);
    expect(savePresentationNotes('project', notes, storage, beforeWipe)).toBe(false);
    expect(readPresentationNotes('project', storage)).toBeNull();
    expect(savePresentationNotes('project', notes, storage, getWipeGeneration(storage))).toBe(true);
    expect(readPresentationNotes('project', storage)).toEqual(notes);
  });

  it('shares the raw wipe token across Guest, account and default browser adapters', () => {
    const raw = createMemoryStorage();
    const accountScope = `account:${'a'.repeat(64)}`;
    const account = scopedStorage(raw, accountScope);
    vi.stubGlobal('window', { localStorage: raw });
    setWorkspaceScope(accountScope);
    const beforeWipe = getWipeGeneration();
    wipeAllLearnerData();
    expect(getWipeGeneration()).not.toBe(beforeWipe);
    expect(getWipeGeneration(account)).toBe(getWipeGeneration(raw));
    saveState(getDefaultState(), account);
    expect(saveEvaluation(evaluation, account, beforeWipe)).toBe(false);
    expect(savePresentationNotes('project', notes, account, beforeWipe)).toBe(false);
    expect(saveEvaluation(evaluation, getDefaultStorage(), getWipeGeneration())).toBe(true);
    expect(getEvaluations(raw)).toEqual([]);
    expect(raw.getItem(`edtech:${accountScope}:${WIPE_GENERATION_KEY}`)).toBeNull();
  });

  it('uses fresh opaque tokens even when two wipes observe the same previous value', () => {
    const raw = createMemoryStorage();
    const storage = { ...raw, getItem: (key: string) => key === WIPE_GENERATION_KEY ? '0' : raw.getItem(key) };
    expect(bumpWipeGeneration(storage)).not.toBe(bumpWipeGeneration(storage));
  });

  it('invalidates work that captured old state while deletion was in progress', () => {
    const raw = createMemoryStorage();
    raw.setItem(STORAGE_KEY, 'old state');
    let duringWipe = getWipeGeneration(raw);
    wipeAllLearnerData({ ...raw, removeItem(key) {
      duringWipe = getWipeGeneration(raw);
      raw.removeItem(key);
    } });
    saveState(getDefaultState(), raw);
    expect(saveEvaluation(evaluation, raw, duringWipe)).toBe(false);
    expect(savePresentationNotes('project', notes, raw, duringWipe)).toBe(false);
  });

  it('publishes and retains the new token before deleting any learner data', () => {
    const raw = createMemoryStorage();
    raw.setItem(STORAGE_KEY, 'old private state');
    raw.setItem('external', 'keep');
    const beforeWipe = getWipeGeneration(raw);
    const observed: string[] = [];
    wipeAllLearnerData({ ...raw, removeItem(key) {
      observed.push(getWipeGeneration(raw));
      raw.removeItem(key);
    } });
    expect(observed.length).toBeGreaterThan(0);
    expect(observed.every(token => token !== beforeWipe)).toBe(true);
    expect(getWipeGeneration(raw)).not.toBe(beforeWipe);
    expect(getWipeGeneration(raw)).not.toBe(observed[0]);
    expect(raw.getItem('external')).toBe('keep');
    expect(raw.getItem(STORAGE_KEY)).toBeNull();
  });

  it('refuses async-after-await writers with a stale generation, even after recreation', () => {
    const storage = createMemoryStorage();
    const kept = createProject({ id: 'kept', title: 'kept' }, storage);
    const beforeWipe = getWipeGeneration(storage);
    wipeAllLearnerData(storage);
    createProject({ id: 'kept', title: 'recreated' }, storage);
    expect(createProject({ id: 'erased', title: 'PRIVATE erased title' }, storage, beforeWipe)).toBeNull();
    expect(setActiveProjectId('kept', storage, beforeWipe)).toBe(false);
    expect(updateProjectProposal('kept', { ...kept.proposal, title: 'PRIVATE stale' }, storage, beforeWipe)).toBeNull();
    expect(saveLearner({ id: 'l', gradeLevel: 'm_ton', createdAt: '2026-11-06T03:00:00Z', updatedAt: '2026-11-06T03:00:00Z' }, storage, beforeWipe)).toBe(false);
    expect(saveInterview({ id: 'i', learnerId: 'l', gradeLevel: 'm_ton', goal: 'ysc', hasInitialIdea: false, selectedTrack: 'discovery_track',
      constraints: { timeWeeks: 8, budgetBaht: 1000, equipment: [], teamSize: 1, skills: [] }, completedAt: '2026-11-06T03:00:00Z' }, storage, beforeWipe)).toBe(false);
    expect(saveJudgeAnswer('kept', 'ysc:rigor', 'PRIVATE stale answer', storage, beforeWipe)).toBe(false);
    expect(JSON.stringify(loadState(storage).state)).not.toContain('PRIVATE');
    expect(getProjects(storage).map(p => p.id)).toEqual(['kept']);
    expect(getLearner(storage)).toBeNull();
    expect(getInterview(storage)).toBeNull();
    expect(readJudgeAnswers('kept', storage)).toEqual({});
    const fresh = getWipeGeneration(storage);
    expect(createProject({ id: 'fresh' }, storage, fresh)?.id).toBe('fresh');
    expect(saveJudgeAnswer('kept', 'ysc:rigor', 'fresh answer', storage, fresh)).toBe(true);
  });

  it('reports server owner loss (410) as ownerChanged, distinct from offline', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: 'OWNER_REVOKED' }, { status: 410 })));
    expect(await consumeProposalQuota()).toMatchObject({ allowed: false, ownerChanged: true });
    vi.stubGlobal('fetch', vi.fn(async () => { throw Error('offline'); }));
    const offline = await consumeProposalQuota();
    expect(offline).toMatchObject({ allowed: false, unavailable: true });
    expect(offline.ownerChanged).toBeUndefined();
  });
});
