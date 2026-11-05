import { z } from 'zod';
import {
  LearnerSchema,
  InterviewSchema,
  SwipeActionSchema,
  IdeaSchema,
  ProjectSchema,
  EvaluationSchema,
} from '@/lib/schemas';
import type {
  Learner,
  Interview,
  SwipeAction,
  Idea,
  Project,
  Evaluation,
} from '@/types/domain';

export const CURRENT_STORAGE_VERSION = 1;
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

/**
 * Returns localStorage when running in a browser, or an in-memory fallback during SSR.
 */
function getDefaultStorage(): StorageAdapter {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return createMemoryStorage();
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
    // Migration from v0 to v1
    const candidate = {
      schemaVersion: CURRENT_STORAGE_VERSION,
      consent: record.consent ?? { accepted: false, acceptedAt: null },
      learner: record.learner ?? null,
      interview: record.interview ?? null,
      swipeHistory: Array.isArray(record.swipeHistory) ? record.swipeHistory : [],
      ideas: Array.isArray(record.ideas) ? record.ideas : [],
      projects: Array.isArray(record.projects) ? record.projects : [],
      evaluations: Array.isArray(record.evaluations) ? record.evaluations : [],
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

export function getProjects(storage: StorageAdapter = getDefaultStorage()): Project[] {
  const { state } = loadState(storage);
  return state.projects;
}

export function saveProject(project: Project, storage: StorageAdapter = getDefaultStorage()): void {
  const { state } = loadState(storage);
  const existingIdx = state.projects.findIndex((p) => p.id === project.id);
  if (existingIdx >= 0) {
    state.projects[existingIdx] = project;
  } else {
    state.projects.push(project);
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
