// Synthetic transport; real React lifecycle, browser storage and production privacy code.
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import EvaluationPage from '@/app/evaluation/page';
import ProposalPage from '@/app/proposal/page';
import IdeaPage from '@/app/idea/page';
import { JudgePractice } from '@/components/judge/JudgePractice';
import { InterviewWizard } from '@/components/interview/InterviewWizard';
import { readJudgeAnswers } from '@/lib/judge/answers';
import { ProjectDeliverables } from '@/components/presentation/ProjectDeliverables';
import { FreshDiscovery } from '@/components/discovery/FreshDiscovery';
import { generateWeeklyPlan } from '@/lib/plan/weekly-plan';
import {
  createProject, getEvaluations, getWipeGeneration, saveIdea,
  WIPE_GENERATION_KEY, wipeAllLearnerData, getInterview, getLearner, getProjects,
  saveConsent, saveInterview, saveLearner, getProject, updateProjectProposal, updateProjectPlan, getIdeas,
} from '@/lib/storage/store';
import { readPresentationNotes, savePresentationNotes } from '@/lib/presentation/notes-store';
import { EMPTY_PRESENTATION_NOTES } from '@/lib/presentation/notes';
import { notifyCoachingInvalidation, COACH_INVALIDATION_KEY } from '@/lib/advisor/coaching-invalidation';
import { setWorkspaceScope } from '@/lib/auth/workspace-client';
import { generateOfflineEvaluation } from '@/lib/evaluation/eval-client';
import type { Idea } from '@/types/domain';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const errors: string[] = [];
console.error = (...args) => errors.push(args.map(String).join(' '));
window.addEventListener('error', e => errors.push(e.message));
const container = document.getElementById('root')!;
let root: Root | null = null;
const flush = async (fn: () => void = () => {}) => { await act(async () => { fn(); await Promise.resolve(); }); };
const mount = async (element: React.ReactNode) => { root = createRoot(container); await flush(() => root!.render(element)); };
const unmount = async () => { if (root) { await flush(() => root!.unmount()); root = null; } };
const equal = (a: unknown, b: unknown, label: string) => { if (a !== b) throw Error(`${label}: expected ${b}, got ${a}`); };
async function typeRole(value: string) {
  const input = container.querySelector('textarea')!;
  await flush(() => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const save = () => flush(() => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
const project = () => createProject({ id: 'same-project', title: 'SYNTHETIC private project' });
const idea: Idea = {
  id: 'same-idea', learnerId: 'synthetic', title: 'SYNTHETIC idea', description: 'Synthetic solar experiment',
  source: 'idea_track', gradeLevel: 'm_plai', goal: 'curiosity',
  createdAt: '2026-11-06T03:00:00Z', updatedAt: '2026-11-06T03:00:00Z',
};
const quota = { used: 1, limit: 5, remaining: 4, resetAt: '2026-11-08T00:00:00Z' };
const requests: Array<{ method: string; action?: string; resolve: (r: Response) => void }> = [];
window.fetch = (_input, init) => new Promise(resolve => requests.push({ method: init?.method ?? 'GET',
  action: typeof init?.body === 'string' ? JSON.parse(init.body).action : undefined, resolve }));
const resolve = (index: number, body: unknown, status = 200) => flush(() => requests[index].resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })));
const settle = async () => { for (let n = 0; n < 5; n++) await act(async () => { await new Promise(r => setTimeout(r, 0)); }); };
const click = (text: string) => flush(() => [...container.querySelectorAll('button')].find(b => b.textContent?.includes(text))!.click());
const hasButton = (text: string) => [...container.querySelectorAll('button')].some(b => b.textContent?.includes(text));
const storedText = () => JSON.stringify(Object.entries(localStorage));
const proposalIdea: Idea = { ...idea, id: 'proposal-idea', title: 'PRIVATE erased idea title', description: 'PRIVATE erased description' };
const proposalQuota = { success: true, allowed: true, remaining: 2, limit: 2, resetAt: '2026-11-07T17:00:00.000Z' };
const result = { passed: [] as string[], failures: [] as string[], errors };
async function test(name: string, run: () => Promise<void>) {
  localStorage.clear(); requests.length = 0; Object.assign(window, { __search: '' });
  try { await run(); result.passed.push(name); }
  catch (e) { result.failures.push(`${name}: ${String(e)}`); }
  finally { await unmount(); }
}
async function run() {
  for (const scope of ['guest', `account:${'a'.repeat(64)}`]) {
    setWorkspaceScope(scope);
    for (const signal of ['same-window', 'cross-tab'] as const) {
      await test(`${scope.slice(0, 7)} ${signal}: wipe removes saved/unsaved TCAS draft and export; fresh mount saves`, async () => {
        const p = project();
        savePresentationNotes(p.id, { ...EMPTY_PRESENTATION_NOTES, role: 'erased saved reflection' });
        await mount(<ProjectDeliverables project={p} view="tcas" />);
        await typeRole('erased unsaved reflection');
        const before = getWipeGeneration();
        await flush(() => {
          if (signal === 'same-window') notifyCoachingInvalidation('wipe');
          wipeAllLearnerData();
          if (signal === 'cross-tab') window.dispatchEvent(new StorageEvent('storage', {
            key: WIPE_GENERATION_KEY, oldValue: before, newValue: getWipeGeneration(), storageArea: localStorage,
          }));
        });
        equal(container.querySelector('textarea'), null, 'editor unmounted');
        equal(container.querySelector('[data-export]'), null, 'export unmounted');
        equal(container.textContent!.includes('erased'), false, 'erased reflections not displayed');
        equal(readPresentationNotes(p.id), null, 'notes remain erased');
        await unmount();
        await mount(<ProjectDeliverables project={project()} view="pitch" />);
        await typeRole('fresh reflection');
        await save();
        equal(readPresentationNotes(p.id)?.role, 'fresh reflection', 'fresh work saved');
      });
    }
    await test(`${scope.slice(0, 7)} missed event: old notes cannot overwrite a recreated project`, async () => {
      const p = project();
      await mount(<ProjectDeliverables project={p} view="tcas" />);
      await typeRole('stale reflection');
      wipeAllLearnerData(); project();
      await save();
      equal(readPresentationNotes(p.id), null, 'stale notes refused by source');
      equal(container.querySelector('textarea'), null, 'stale draft removed');
    });
    await test(`${scope.slice(0, 7)} late evaluation cannot persist after wipe and same-id recreation`, async () => {
      saveIdea(idea);
      await mount(<EvaluationPage />);
      equal(requests[0]?.method, 'POST', 'evaluation started');
      await flush(() => { notifyCoachingInvalidation('wipe'); wipeAllLearnerData(); saveIdea(idea); });
      await resolve(0, { evaluation: generateOfflineEvaluation(idea), quota });
      equal(getEvaluations().length, 0, 'late evaluation not saved');
      equal(container.textContent!.includes('SYNTHETIC idea'), false, 'late evaluation not rendered');
      await unmount();
      requests.length = 0;
      await mount(<EvaluationPage />);
      await resolve(0, { evaluation: generateOfflineEvaluation(idea), quota });
      equal(getEvaluations().length, 1, 'fresh evaluation saved');
      await resolve(1, { quota });
    });
    await test(`${scope.slice(0, 7)} delayed quota GET cannot restore erased evaluation UI`, async () => {
      saveIdea(idea);
      await mount(<EvaluationPage />);
      await resolve(0, { evaluation: generateOfflineEvaluation(idea), quota });
      equal(requests[1]?.method, 'GET', 'quota refresh started');
      await flush(() => { notifyCoachingInvalidation('wipe'); wipeAllLearnerData(); });
      await resolve(1, { quota: { ...quota, remaining: 0 } });
      equal(getEvaluations().length, 0, 'erased evaluation stays erased');
      equal(container.textContent!.includes('SYNTHETIC idea'), false, 'quota response cannot restore view');
    });

    for (const variant of ['200 + missed wipe event', '200 + same-window wipe', '410 owner gone'] as const) {
      await test(`${scope.slice(0, 7)} H1 first-time proposal (${variant}) never recreates erased project`, async () => {
        saveIdea(proposalIdea);
        Object.assign(window, { __search: 'ideaId=proposal-idea' });
        await mount(<ProposalPage />);
        equal(requests[0]?.action, 'check', 'quota check started');
        await resolve(0, proposalQuota); await settle();
        const consume = requests.findIndex(r => r.action === 'consume');
        equal(consume > 0, true, 'consume pending');
        if (variant !== '410 owner gone') await flush(() => {
          if (variant === '200 + same-window wipe') notifyCoachingInvalidation('wipe');
          wipeAllLearnerData();
        });
        if (variant === '410 owner gone') await resolve(consume, { error: 'OWNER_REVOKED' }, 410);
        else await resolve(consume, { ...proposalQuota, remaining: 1, proposal: null });
        await settle();
        equal(getProjects().length, 0, 'no project created');
        if (variant === '410 owner gone') { equal(container.textContent!.includes('โหลดหน้าใหม่'), true, 'owner-changed notice shown'); return; }
        equal(storedText().includes('PRIVATE'), false, 'erased idea not written back');
        equal(storedText().includes('proposal-idea'), false, 'erased idea id not written back');
        await unmount(); requests.length = 0;
        saveIdea(proposalIdea);
        await mount(<ProposalPage />);
        await resolve(0, proposalQuota); await settle();
        await resolve(requests.findIndex(r => r.action === 'consume'), { ...proposalQuota, remaining: 1, proposal: null }); await settle();
        equal(getProjects().length, 1, 'fresh project created after wipe');
      });
    }
    await test(`${scope.slice(0, 7)} H1 handleCreateProject after wipe never recreates erased project`, async () => {
      createProject({ id: 'existing', title: 'existing' });
      saveIdea(proposalIdea);
      await mount(<ProposalPage />);
      await resolve(0, proposalQuota); await settle();
      const before = requests.length;
      // Drive the switcher's create flow with the linked idea.
      await flush(() => container.querySelector<HTMLButtonElement>('button[aria-label="สร้างโครงงานใหม่"]')!.click());
      const form = [...container.querySelectorAll('form')].find(f => f.querySelector('select'));
      equal((form?.querySelector('select') as HTMLSelectElement | null)?.value, 'proposal-idea', 'linked idea preselected');
      await flush(() => form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
      await settle();
      equal(requests.length > before && requests[requests.length - 1].action === 'consume', true, 'create consumes quota');
      wipeAllLearnerData();
      await resolve(requests.length - 1, { ...proposalQuota, remaining: 1, proposal: null }); await settle();
      equal(getProjects().length, 0, 'no project recreated');
      equal(storedText().includes('PRIVATE'), false, 'erased idea not written back');
    });
    await test(`${scope.slice(0, 7)} M1 judge answer: stale Save after wipe cannot recreate answers; event closes editor`, async () => {
      const p = createProject({ id: 'judge-project', title: 'judge' });
      await mount(<JudgePractice project={p} lockSelection={() => {}} />);
      await typeRole('PRIVATE stale judge answer');
      wipeAllLearnerData();
      await click('บันทึก & ทบทวนคำตอบ');
      equal(JSON.stringify(readJudgeAnswers(p.id)), '{}', 'stale answer refused');
      equal(storedText().includes('PRIVATE'), false, 'no judge record recreated');
      await unmount();
      const q = createProject({ id: 'judge-project', title: 'judge' });
      await mount(<JudgePractice project={q} lockSelection={() => {}} />);
      await typeRole('PRIVATE unsaved');
      await flush(() => { notifyCoachingInvalidation('wipe'); wipeAllLearnerData(); });
      equal(container.querySelector('textarea'), null, 'judge editor closed on wipe');
      equal(container.textContent!.includes('PRIVATE'), false, 'erased draft not displayed');
      await unmount();
      const r = createProject({ id: 'judge-project', title: 'judge' });
      await mount(<JudgePractice project={r} lockSelection={() => {}} />);
      await typeRole('fresh answer');
      await click('บันทึก & ทบทวนคำตอบ');
      equal(Object.values(readJudgeAnswers(r.id))[0], 'fresh answer', 'fresh answer saved');
    });
    await test(`${scope.slice(0, 7)} L2 interview wizard: stale submit after wipe cannot re-save learner/interview`, async () => {
      const seed = () => {
        saveConsent({ accepted: true, acceptedAt: '2026-11-06T03:00:00.000Z' });
        saveLearner({ id: 'PRIVATE-learner', gradeLevel: 'm_ton', createdAt: '2026-11-06T03:00:00.000Z', updatedAt: '2026-11-06T03:00:00.000Z' });
        saveInterview({ id: 'PRIVATE-interview', learnerId: 'PRIVATE-learner', gradeLevel: 'm_ton', goal: 'ysc', hasInitialIdea: false,
          selectedTrack: 'discovery_track', constraints: { timeWeeks: 8, budgetBaht: 1000, equipment: ['computer'], teamSize: 1, skills: ['science_lab'] },
          completedAt: '2026-11-06T03:00:00.000Z' });
      };
      seed();
      await mount(<InterviewWizard />);
      for (let n = 0; n < 3; n++) await click('ถัดไป');
      equal(hasButton('บันทึกและเริ่มต้นโครงงาน'), true, 'reached submit');
      wipeAllLearnerData();
      await click('บันทึกและเริ่มต้นโครงงาน');
      equal(getLearner(), null, 'learner not re-saved');
      equal(getInterview(), null, 'interview not re-saved');
      await unmount();
      seed();
      await mount(<InterviewWizard />);
      await flush(() => { notifyCoachingInvalidation('wipe'); wipeAllLearnerData(); });
      equal(hasButton('ถัดไป'), false, 'wizard closed on wipe');
      await unmount();
      seed();
      await mount(<InterviewWizard />);
      for (let n = 0; n < 3; n++) await click('ถัดไป');
      await click('บันทึกและเริ่มต้นโครงงาน');
      equal(getInterview() !== null, true, 'fresh submit saves');
    });
    // Review #1: the workspace-change flush must never write a stale snapshot over newer saved work.
    const staleProposal = { title: 'Proj', problemStatement: 'OLD', objectives: [], hypothesis: '', variables: { independent: [], dependent: [], controlled: [] }, methodology: '' };
    const navigate = async () => { let allowed = true; await flush(() => { allowed = window.dispatchEvent(new Event('edtech:before-account-navigation', { cancelable: true })); }); return allowed; };
    const otherTabSaves = (id: string) => updateProjectProposal(id, { ...getProject(id)!.proposal!, problemStatement: 'NEWER SAVED IN OTHER TAB' });
    await test(`${scope.slice(0, 7)} R1 unedited proposal editor does not flush a stale snapshot over another tab's save`, async () => {
      const p = createProject({ title: 'Proj', proposal: staleProposal });
      await mount(<ProposalPage />);
      equal((container.querySelector('textarea') as HTMLTextAreaElement)?.value, 'OLD', 'editor loaded');
      otherTabSaves(p.id);
      equal(await navigate(), true, 'nothing unsaved: navigation allowed');
      equal(getProject(p.id)!.proposal!.problemStatement, 'NEWER SAVED IN OTHER TAB', 'newer save kept');
    });
    await test(`${scope.slice(0, 7)} R1 edited proposal changed elsewhere vetoes the flush and keeps both versions`, async () => {
      const p = createProject({ title: 'Proj', proposal: staleProposal });
      await mount(<ProposalPage />);
      await typeRole('MY UNSAVED EDIT');
      otherTabSaves(p.id);
      equal(await navigate(), false, 'reload vetoed for the learner to decide');
      equal(getProject(p.id)!.proposal!.problemStatement, 'NEWER SAVED IN OTHER TAB', 'newer save not overwritten');
      equal((container.querySelector('textarea') as HTMLTextAreaElement).value, 'MY UNSAVED EDIT', 'draft kept on screen');
    });
    await test(`${scope.slice(0, 7)} R1 edited proposal with no outside change still flushes`, async () => {
      const p = createProject({ title: 'Proj', proposal: staleProposal });
      await mount(<ProposalPage />);
      await typeRole('MY UNSAVED EDIT');
      equal(await navigate(), true, 'navigation allowed');
      equal(getProject(p.id)!.proposal!.problemStatement, 'MY UNSAVED EDIT', 'draft flushed');
    });
    await test(`${scope.slice(0, 7)} R1 unedited plan editor does not revert another tab's plan save`, async () => {
      const p = createProject({ title: 'Proj', proposal: staleProposal, plan: generateWeeklyPlan({ totalWeeks: 4 }) });
      Object.assign(window, { __search: 'tab=plan' });
      await mount(<ProposalPage />);
      updateProjectPlan(p.id, generateWeeklyPlan({ totalWeeks: 6 }));
      equal(await navigate(), true, 'navigation allowed');
      equal(getProject(p.id)!.plan!.totalWeeks, 6, 'newer plan kept');
    });
    // Review #3: a late wipe event must not erase work created after that wipe.
    const wipeMarker = () => new StorageEvent('storage', { key: COACH_INVALIDATION_KEY, newValue: JSON.stringify({ action: 'wipe', nonce: 'late' }), storageArea: localStorage });
    for (const [view, element, writtenKey] of [['discovery', <FreshDiscovery key="d" />, 'discovery-fresh'], ['idea chat', <IdeaPage key="i" />, 'coaching:idea%3Aown']] as const) {
      await test(`${scope.slice(0, 7)} R3 late wipe event in a frozen ${view} tab keeps work created after the wipe`, async () => {
        await mount(element); await settle();
        equal(storedText().includes(writtenKey), true, 'view wrote local work before the wipe');
        wipeAllLearnerData(); // other tab; this tab is frozen and receives the event later
        saveIdea(idea); // new work after the wipe
        await flush(() => window.dispatchEvent(wipeMarker()));
        equal(getIdeas().length, 1, 'post-wipe work kept');
      });
      await test(`${scope.slice(0, 7)} R3 ${view} write racing the wipe is still re-wiped`, async () => {
        wipeAllLearnerData();
        await mount(element); await settle(); // wrote in the current generation before seeing the event
        equal(storedText().includes(writtenKey), true, 'racing write present');
        await flush(() => window.dispatchEvent(wipeMarker()));
        equal(storedText().includes(writtenKey), false, 'racing write removed');
      });
    }
  }
  Object.assign(window, { __privacyResults: result });
}
void run().catch(e => Object.assign(window, { __privacyResults: { ...result, failures: [...result.failures, String(e)] } }));
