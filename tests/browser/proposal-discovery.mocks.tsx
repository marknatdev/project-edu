import React from 'react';

export const state = {
  quotaRequests: [] as Array<{ signal?: AbortSignal; resolve: (q: unknown) => void }>,
  generations: 0,
  generationRequests: [] as Array<{ requestId: string; resolve: (result: unknown) => void }>,
  authFails: false,
  scope: 'guest:synthetic',
  serverScope: null as string | null,
  generation: 'g0',
  reloads: 0,
};
export const Link = ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { scroll?: boolean }) => {
  const p = { ...props };
  delete p.scroll;
  return <a {...p}>{children}</a>;
};
export const useRouter = () => ({ push() {} });
export const usePathname = () => '/proposal';
export const STORAGE_PREFIX = 'synthetic:';
let items = new Map<string, string>();
export const getDefaultStorage = () => ({ getItem: (k: string) => items.get(k) ?? null,
  setItem: (k: string, v: string) => { items.set(k, v); }, removeItem: (k: string) => { items.delete(k); }, clear: () => { items.clear(); } });
export const resetMocks = () => { state.quotaRequests = []; state.generations = 0; state.generationRequests = []; state.authFails = false; state.scope = 'guest:synthetic'; state.serverScope = null; state.generation = 'g0'; state.reloads = 0; items = new Map(); };
export const getWipeGeneration = () => state.generation;
export const reloadWorkspace = () => { state.reloads++; };
export const getInterview = () => ({ gradeLevel: 'm_ton', goal: 'curiosity', constraints: { budgetBaht: 1000, timeWeeks: 4, teamSize: 2, equipment: [], skills: [] } });
export const getLearner = () => null;
export const saveIdea = () => {};
export const wipeAllLearnerData = () => { items.clear(); };
export const saveTopicCardSnapshot = () => {};
export const fetchCardQuota = (_fetcher?: unknown, signal?: AbortSignal) => new Promise(resolve => state.quotaRequests.push({ signal, resolve }));
export const requestFreshCards = (body: { requestId: string }) => {
  state.generations++;
  return new Promise(resolve => state.generationRequests.push({ requestId: body.requestId, resolve }));
};
export const OptionalLoginOffer = () => null;
export const getWorkspaceScope = () => state.scope;
export const setWorkspaceScope = (scope: string) => { state.scope = scope; };
export const authFetch = async () => {
  if (state.authFails) throw Error('synthetic auth outage');
  return { ok: true, json: async () => ({ authenticated: true, scope: state.serverScope ?? state.scope, workspace: 'guest', decisionRequired: false }) };
};
export const appFetch = authFetch;
