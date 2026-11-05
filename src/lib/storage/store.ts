import { z } from 'zod';
import {
  LearnerSchema,
  InterviewSchema,
  SwipeActionSchema,
  IdeaSchema,
  ProjectSchema,
  EvaluationSchema,
  PivotSchema,
} from '@/lib/schemas';
import type {
  Learner,
  Interview,
  SwipeAction,
  Idea,
  Project,
  Evaluation,
  Pivot,
  Proposal,
  Plan,
  ProjectStatus,
} from '@/types/domain';

export const CURRENT_STORAGE_VERSION = 2;
export const STORAGE_PREFIX = 'edtech:';
export const STORAGE_KEY = `${STORAGE_PREFIX}state`;

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  length?: number;
  key?(index: number): string | null;
  getAllKeys?(): string[];
}

/**
 * In-memory storage adapter for testing and SSR.
 */
export function createMemoryStorage(): StorageAdapter {
  const store = new Map<string, string>();
  return {
    getItem(key: string): string | null {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      store.set(key, String(value));
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    clear(): void {
      store.clear();
    },
    get length(): number {
      return store.size;
    },
    key(index: number): string | null {
      return Array.from(store.keys())[index] ?? null;
    },
    getAllKeys(): string[] {
      return Array.from(store.keys());
    },
  };
}

let ssrMemoryStorage: StorageAdapter | null = null;

/**
 * Returns localStorage when running in a browser, or an in-memory fallback during SSR.
 */
function getDefaultStorage(): StorageAdapter {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (!ssrMemoryStorage) {
    ssrMemoryStorage = createMemoryStorage();
  }
  return ssrMemoryStorage;
}

// PDPA Consent Schema
export const PdpaConsentSchema = z.object({
  accepted: z.boolean(),
  acceptedAt: z.string().datetime().nullable(),
});
export type PdpaConsent = z.infer<typeof PdpaConsentSchema>;

// Top-level Storage State Schema
export const StorageStateSchema = z.object({
  schemaVersion: z.number().int().min(1),
  consent: PdpaConsentSchema,
  learner: LearnerSchema.nullable(),
  interview: InterviewSchema.nullable(),
  swipeHistory: z.array(SwipeActionSchema),
  ideas: z.array(IdeaSchema),
  projects: z.array(ProjectSchema),
  evaluations: z.array(EvaluationSchema),
  pivots: z.array(PivotSchema).optional().default([]),
  activeProjectId: z.string().nullable().optional().default(null),
});
export type StorageState = z.infer<typeof StorageStateSchema>;

export function getDefaultState(): StorageState {
  return {
    schemaVersion: CURRENT_STORAGE_VERSION,
    consent: {
      accepted: false,
      acceptedAt: null,
    },
    learner: null,
    interview: null,
    swipeHistory: [],
    ideas: [],
    projects: [],
    evaluations: [],
    pivots: [],
    activeProjectId: null,
  };
}

/**
 * Migrates or repairs raw storage data into a valid StorageState.
 */
export function migrateStorageState(raw: unknown): { state: StorageState; migrated: boolean } {
  if (!raw || typeof raw !== 'object') {
    return { state: getDefaultState(), migrated: true };
  }

  const record = raw as Record<string, unknown>;
  const version = typeof record.schemaVersion === 'number' ? record.schemaVersion : 0;

  if (version > CURRENT_STORAGE_VERSION) {
    // Unsupported future schema version: fail-safe fallback
    return { state: getDefaultState(), migrated: true };
  }

  if (version === 0) {
    // Migration from v0 to v2
    const candidate = {
      schemaVersion: CURRENT_STORAGE_VERSION,
      consent: record.consent ?? { accepted: false, acceptedAt: null },
      learner: record.learner ?? null,
      interview: record.interview ?? null,
      swipeHistory: Array.isArray(record.swipeHistory) ? record.swipeHistory : [],
      ideas: Array.isArray(record.ideas) ? record.ideas : [],
      projects: Array.isArray(record.projects) ? record.projects : [],
      evaluations: Array.isArray(record.evaluations) ? record.evaluations : [],
      pivots: Array.isArray(record.pivots) ? record.pivots : [],
      activeProjectId: null,
    };

    const parsed = StorageStateSchema.safeParse(candidate);
    if (parsed.success) {
      return { state: parsed.data, migrated: true };
    }
    return { state: getDefaultState(), migrated: true };
  }

  if (version === 1) {
    // Migration from v1 to v2: initialize activeProjectId to first project if present
    const projectsList = Array.isArray(record.projects) ? record.projects : [];
    const firstProjId =
      projectsList.length > 0 && typeof projectsList[0] === 'object' && (projectsList[0] as Record<string, unknown>)?.id
        ? String((projectsList[0] as Record<string, unknown>).id)
        : null;

    const candidate = {
      schemaVersion: CURRENT_STORAGE_VERSION,
      consent: record.consent ?? { accepted: false, acceptedAt: null },
      learner: record.learner ?? null,
      interview: record.interview ?? null,
      swipeHistory: Array.isArray(record.swipeHistory) ? record.swipeHistory : [],
      ideas: Array.isArray(record.ideas) ? record.ideas : [],
      projects: projectsList,
      evaluations: Array.isArray(record.evaluations) ? record.evaluations : [],
      pivots: Array.isArray(record.pivots) ? record.pivots : [],
      activeProjectId: typeof record.activeProjectId === 'string' ? record.activeProjectId : firstProjId,
    };

    const parsed = StorageStateSchema.safeParse(candidate);
    if (parsed.success) {
      return { state: parsed.data, migrated: true };
    }
    return { state: getDefaultState(), migrated: true };
  }

  if (version === CURRENT_STORAGE_VERSION) {
    const parsed = StorageStateSchema.safeParse(raw);
    if (parsed.success) {
      return { state: parsed.data, migrated: false };
    }
    return { state: getDefaultState(), migrated: true };
  }

  return { state: getDefaultState(), migrated: true };
}

/**
 * Loads and validates local state from storage.
 * Gracefully recovers from missing, corrupted, or schema-violating data.
 */
export function loadState(storage: StorageAdapter = getDefaultStorage()): {
  state: StorageState;
  recovered: boolean;
} {
  try {
    const rawStr = storage.getItem(STORAGE_KEY);
    if (!rawStr) {
      return { state: getDefaultState(), recovered: false };
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawStr);
    } catch {
      // Corrupt JSON string
      const defaultState = getDefaultState();
      saveState(defaultState, storage);
      return { state: defaultState, recovered: true };
    }

    const { state, migrated } = migrateStorageState(parsedJson);
    if (migrated) {
      saveState(state, storage);
      return { state, recovered: true };
    }

    return { state, recovered: false };
  } catch {
    const fallback = getDefaultState();
    return { state: fallback, recovered: true };
  }
}

/**
 * Validates and saves local state to storage.
 */
export function saveState(state: StorageState, storage: StorageAdapter = getDefaultStorage()): void {
  const validated = StorageStateSchema.parse(state);
  storage.setItem(STORAGE_KEY, JSON.stringify(validated));
}

// Entity helpers

export function getLearner(storage: StorageAdapter = getDefaultStorage()): Learner | null {
  const { state } = loadState(storage);
  return state.learner;
}

export function saveLearner(learner: Learner, storage: StorageAdapter = getDefaultStorage()): void {
  const { state } = loadState(storage);
  state.learner = learner;
  saveState(state, storage);
}

export function getInterview(storage: StorageAdapter = getDefaultStorage()): Interview | null {
  const { state } = loadState(storage);
  return state.interview;
}

export function saveInterview(interview: Interview, storage: StorageAdapter = getDefaultStorage()): void {
  const { state } = loadState(storage);
  state.interview = interview;
  saveState(state, storage);
}

export function getSwipeHistory(storage: StorageAdapter = getDefaultStorage()): SwipeAction[] {
  const { state } = loadState(storage);
  return state.swipeHistory;
}

export function addSwipeAction(action: SwipeAction, storage: StorageAdapter = getDefaultStorage()): void {
  const { state } = loadState(storage);
  state.swipeHistory.push(action);
  saveState(state, storage);
}

export function undoLastSwipeAction(storage: StorageAdapter = getDefaultStorage()): SwipeAction | null {
  const { state } = loadState(storage);
  const popped = state.swipeHistory.pop() ?? null;
  if (popped) {
    saveState(state, storage);
  }
  return popped;
}

export function getIdeas(storage: StorageAdapter = getDefaultStorage()): Idea[] {
  const { state } = loadState(storage);
  return state.ideas;
}

export function getIdea(id: string, storage: StorageAdapter = getDefaultStorage()): Idea | null {
  const ideas = getIdeas(storage);
  return ideas.find((i) => i.id === id) ?? null;
}

export function saveIdea(idea: Idea, storage: StorageAdapter = getDefaultStorage()): void {
  const { state } = loadState(storage);
  const existingIdx = state.ideas.findIndex((i) => i.id === idea.id);
  if (existingIdx >= 0) {
    state.ideas[existingIdx] = idea;
  } else {
    state.ideas.push(idea);
  }
  saveState(state, storage);
}

export function deleteIdea(id: string, storage: StorageAdapter = getDefaultStorage()): boolean {
  const { state } = loadState(storage);
  const exists = state.ideas.some((i) => i.id === id);
  if (!exists) return false;

  state.ideas = state.ideas.filter((i) => i.id !== id);
  saveState(state, storage);
  return true;
}

export function getProjects(storage: StorageAdapter = getDefaultStorage()): Project[] {
  const { state } = loadState(storage);
  return state.projects;
}

export function getProject(id: string, storage: StorageAdapter = getDefaultStorage()): Project | null {
  const projects = getProjects(storage);
  return projects.find((p) => p.id === id) ?? null;
}

export function getActiveProjectId(storage: StorageAdapter = getDefaultStorage()): string | null {
  const { state } = loadState(storage);
  return state.activeProjectId ?? null;
}

export function getActiveProject(storage: StorageAdapter = getDefaultStorage()): Project | null {
  const { state } = loadState(storage);
  if (!state.activeProjectId) return null;
  return state.projects.find((p) => p.id === state.activeProjectId) ?? null;
}

export function setActiveProjectId(id: string | null, storage: StorageAdapter = getDefaultStorage()): boolean {
  const { state } = loadState(storage);
  if (id === null) {
    state.activeProjectId = null;
    saveState(state, storage);
    return true;
  }
  const exists = state.projects.some((p) => p.id === id);
  if (!exists) return false;

  state.activeProjectId = id;
  saveState(state, storage);
  return true;
}

export interface CreateProjectParams {
  id?: string;
  title?: string;
  learnerId?: string;
  ideaId?: string;
  proposal?: Proposal;
  plan?: Plan;
  status?: ProjectStatus;
}

export function createProject(
  params: CreateProjectParams = {},
  storage: StorageAdapter = getDefaultStorage()
): Project {
  const { state } = loadState(storage);
  const now = new Date().toISOString();
  const id = params.id ?? `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const cleanTitle = params.title?.trim() || 'โครงงานใหม่';
  const learnerId = params.learnerId ?? state.learner?.id ?? 'guest-learner';
  const ideaId = params.ideaId ?? (state.ideas[0]?.id ?? `idea-${Date.now()}`);

  const defaultProposal: Proposal = params.proposal ?? {
    title: cleanTitle,
    problemStatement: '',
    objectives: [],
    hypothesis: '',
    variables: {
      independent: [],
      dependent: [],
      controlled: [],
    },
    methodology: '',
  };

  const defaultPlan: Plan = params.plan ?? {
    targetDeadline: new Date(Date.now() + 8 * 7 * 24 * 60 * 60 * 1000).toISOString(),
    totalWeeks: 8,
    milestones: [],
  };

  const project: Project = {
    id,
    learnerId,
    ideaId,
    title: cleanTitle,
    proposal: defaultProposal,
    plan: defaultPlan,
    status: params.status ?? 'in_progress',
    createdAt: now,
    updatedAt: now,
  };

  state.projects.push(project);
  state.activeProjectId = id;
  saveState(state, storage);
  return project;
}

export function renameProject(
  id: string,
  newTitle: string,
  storage: StorageAdapter = getDefaultStorage()
): Project | null {
  const cleanTitle = newTitle.trim();
  if (!cleanTitle) return null;

  const { state } = loadState(storage);
  const project = state.projects.find((p) => p.id === id);
  if (!project) return null;

  project.title = cleanTitle;
  if (project.proposal) {
    project.proposal.title = cleanTitle;
  }
  project.updatedAt = new Date().toISOString();
  saveState(state, storage);
  return project;
}

export function deleteProject(id: string, storage: StorageAdapter = getDefaultStorage()): boolean {
  const { state } = loadState(storage);
  const exists = state.projects.some((p) => p.id === id);
  if (!exists) return false;

  state.projects = state.projects.filter((p) => p.id !== id);
  if (state.activeProjectId === id) {
    state.activeProjectId = state.projects[0]?.id ?? null;
  }
  saveState(state, storage);
  return true;
}

export function updateProjectProposal(
  projectId: string,
  proposal: Proposal,
  storage: StorageAdapter = getDefaultStorage()
): Project | null {
  const { state } = loadState(storage);
  const project = state.projects.find((p) => p.id === projectId);
  if (!project) return null;

  project.proposal = proposal;
  project.updatedAt = new Date().toISOString();
  saveState(state, storage);
  return project;
}

export function updateProjectPlan(
  projectId: string,
  plan: Plan,
  storage: StorageAdapter = getDefaultStorage()
): Project | null {
  const { state } = loadState(storage);
  const project = state.projects.find((p) => p.id === projectId);
  if (!project) return null;

  project.plan = plan;
  project.updatedAt = new Date().toISOString();
  saveState(state, storage);
  return project;
}

export function saveProject(project: Project, storage: StorageAdapter = getDefaultStorage()): void {
  const { state } = loadState(storage);
  const existingIdx = state.projects.findIndex((p) => p.id === project.id);
  if (existingIdx >= 0) {
    state.projects[existingIdx] = project;
  } else {
    state.projects.push(project);
    if (!state.activeProjectId) {
      state.activeProjectId = project.id;
    }
  }
  saveState(state, storage);
}

export function getEvaluations(storage: StorageAdapter = getDefaultStorage()): Evaluation[] {
  const { state } = loadState(storage);
  return state.evaluations;
}

export function saveEvaluation(evaluation: Evaluation, storage: StorageAdapter = getDefaultStorage()): void {
  const { state } = loadState(storage);
  const existingIdx = state.evaluations.findIndex((e) => e.id === evaluation.id);
  if (existingIdx >= 0) {
    state.evaluations[existingIdx] = evaluation;
  } else {
    state.evaluations.push(evaluation);
  }
  saveState(state, storage);
}

export function getPivots(storage: StorageAdapter = getDefaultStorage()): Pivot[] {
  const { state } = loadState(storage);
  return state.pivots ?? [];
}

export function savePivot(pivot: Pivot, storage: StorageAdapter = getDefaultStorage()): void {
  const { state } = loadState(storage);
  if (!state.pivots) {
    state.pivots = [];
  }
  const existingIdx = state.pivots.findIndex((p) => p.id === pivot.id);
  if (existingIdx >= 0) {
    state.pivots[existingIdx] = pivot;
  } else {
    state.pivots.push(pivot);
  }
  saveState(state, storage);
}

export function getConsent(storage: StorageAdapter = getDefaultStorage()): PdpaConsent {
  const { state } = loadState(storage);
  return state.consent;
}

export function saveConsent(consent: PdpaConsent, storage: StorageAdapter = getDefaultStorage()): void {
  const { state } = loadState(storage);
  state.consent = consent;
  saveState(state, storage);
}

/**
 * Completely wipes all app-namespaced data (keys starting with STORAGE_PREFIX).
 * Preserves non-app external keys.
 */
export function wipeAllLearnerData(storage: StorageAdapter = getDefaultStorage()): void {
  const keysToRemove: string[] = [];

  if (typeof storage.getAllKeys === 'function') {
    const keys = storage.getAllKeys();
    for (const k of keys) {
      if (k.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(k);
      }
    }
  } else if (typeof storage.length === 'number' && typeof storage.key === 'function') {
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(k);
      }
    }
  }

  // Also include the primary key deterministically
  if (!keysToRemove.includes(STORAGE_KEY)) {
    keysToRemove.push(STORAGE_KEY);
  }

  for (const k of keysToRemove) {
    storage.removeItem(k);
  }
}
