import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadState,
  createMemoryStorage,
  getProjects,
  getProject,
  getActiveProjectId,
  getActiveProject,
  setActiveProjectId,
  createProject,
  renameProject,
  deleteProject,
  updateProjectProposal,
  updateProjectPlan,
  deleteIdea,
  getIdeas,
  saveIdea,
  CURRENT_STORAGE_VERSION,
  STORAGE_KEY,
  type StorageAdapter,
} from '@/lib/storage/store';
import type { Idea, Proposal, Plan } from '@/types/domain';

describe('Multi-project Store Workspace (CRUD, Switch, Migration)', () => {
  let storage: StorageAdapter;

  const mockProposal: Proposal = {
    title: 'โครงงานทดสอบ A',
    problemStatement: 'ที่มาปัญหาการจัดการขยะ',
    objectives: ['เพื่อศึกษาแนวทาง'],
    hypothesis: 'การคัดแยกขยะช่วยลดมลพิษ',
    variables: {
      independent: ['วิธีการคัดแยก'],
      dependent: ['ปริมาณขยะรีไซเคิล'],
      controlled: ['ระยะเวลา'],
    },
    methodology: '1. สำรวจ 2. แยกขยะ 3. ชั่งน้ำหนัก',
  };

  const mockPlan: Plan = {
    targetDeadline: '2026-12-31T00:00:00.000Z',
    totalWeeks: 4,
    milestones: [
      { week: 1, title: 'สัปดาห์ 1: วางแผน', description: 'ทบทวน', deliverable: 'กรอบงาน', completed: false },
    ],
  };

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  describe('Seam 1: Storage Migration v1 -> v2 (Multi-Project Support)', () => {
    it('migrates v1 state to v2, initializing activeProjectId to first project', () => {
      const v1Data = {
        schemaVersion: 1,
        consent: { accepted: true, acceptedAt: '2026-11-05T00:00:00.000Z' },
        learner: {
          id: 'learner-1',
          gradeLevel: 'm_plai',
          createdAt: '2026-11-05T00:00:00.000Z',
          updatedAt: '2026-11-05T00:00:00.000Z',
        },
        interview: null,
        swipeHistory: [],
        ideas: [],
        projects: [
          {
            id: 'proj-legacy-1',
            learnerId: 'learner-1',
            ideaId: 'idea-legacy-1',
            title: 'โครงงานเก่าจาก v1',
            proposal: mockProposal,
            plan: mockPlan,
            status: 'in_progress',
            createdAt: '2026-11-05T00:00:00.000Z',
            updatedAt: '2026-11-05T00:00:00.000Z',
          },
        ],
        evaluations: [],
        pivots: [],
      };

      storage.setItem(STORAGE_KEY, JSON.stringify(v1Data));

      const { state, recovered } = loadState(storage);
      expect(recovered).toBe(true);
      expect(state.schemaVersion).toBe(CURRENT_STORAGE_VERSION);
      expect(state.activeProjectId).toBe('proj-legacy-1');
      expect(state.projects).toHaveLength(1);
    });

    it('sets activeProjectId to null when migrating v1 state with 0 projects', () => {
      const v1EmptyProjects = {
        schemaVersion: 1,
        consent: { accepted: false, acceptedAt: null },
        learner: null,
        interview: null,
        swipeHistory: [],
        ideas: [],
        projects: [],
        evaluations: [],
        pivots: [],
      };

      storage.setItem(STORAGE_KEY, JSON.stringify(v1EmptyProjects));

      const { state } = loadState(storage);
      expect(state.activeProjectId).toBeNull();
    });
  });

  describe('Seam 2: Project Creation & Active Selection', () => {
    it('creates a new project, auto-assigns an id, sets it as active, and persists', () => {
      const project = createProject(
        {
          title: 'การบำบัดน้ำเสียด้วยผักตบชวา',
          learnerId: 'learner-anon-1',
          proposal: mockProposal,
          plan: mockPlan,
        },
        storage
      );

      expect(project.id).toBeTruthy();
      expect(project.title).toBe('การบำบัดน้ำเสียด้วยผักตบชวา');
      expect(project.status).toBe('in_progress');

      // Verify active project in store
      expect(getActiveProjectId(storage)).toBe(project.id);
      const active = getActiveProject(storage);
      expect(active?.id).toBe(project.id);
      expect(active?.title).toBe('การบำบัดน้ำเสียด้วยผักตบชวา');

      // Listed in all projects
      const all = getProjects(storage);
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe(project.id);
    });

    it('creates project with default title "โครงงานใหม่" if omitted or blank', () => {
      const project = createProject({}, storage);

      expect(project.title).toBe('โครงงานใหม่');
      expect(getActiveProjectId(storage)).toBe(project.id);
    });

    it('switches active project when calling setActiveProjectId with existing id', () => {
      const p1 = createProject({ title: 'โปรเจกต์ 1' }, storage);
      const p2 = createProject({ title: 'โปรเจกต์ 2' }, storage);

      expect(getActiveProjectId(storage)).toBe(p2.id);

      const switched = setActiveProjectId(p1.id, storage);
      expect(switched).toBe(true);
      expect(getActiveProjectId(storage)).toBe(p1.id);
      expect(getActiveProject(storage)?.title).toBe('โปรเจกต์ 1');
    });

    it('rejects switching to non-existent project id and returns false without changing active', () => {
      const p1 = createProject({ title: 'โปรเจกต์ 1' }, storage);

      const switched = setActiveProjectId('non-existent-id', storage);
      expect(switched).toBe(false);
      expect(getActiveProjectId(storage)).toBe(p1.id);
    });
  });

  describe('Seam 3: Rename & Update Project', () => {
    it('renames an existing project and trims whitespace', () => {
      const project = createProject({ title: 'ชื่อเริ่มต้น' }, storage);

      const updated = renameProject(project.id, '  ชื่อใหม่ที่ปรับปรุงแล้ว  ', storage);
      expect(updated).not.toBeNull();
      expect(updated?.title).toBe('ชื่อใหม่ที่ปรับปรุงแล้ว');

      const reloaded = getProject(project.id, storage);
      expect(reloaded?.title).toBe('ชื่อใหม่ที่ปรับปรุงแล้ว');
    });

    it('rejects renaming to empty or whitespace-only string and returns null', () => {
      const project = createProject({ title: 'ชื่อเดิม' }, storage);

      const emptyResult = renameProject(project.id, '', storage);
      expect(emptyResult).toBeNull();

      const whitespaceResult = renameProject(project.id, '   ', storage);
      expect(whitespaceResult).toBeNull();

      // Original remains untouched
      expect(getProject(project.id, storage)?.title).toBe('ชื่อเดิม');
    });

    it('updates proposal and plan sections of a project', () => {
      const project = createProject({ title: 'โปรเจกต์' }, storage);

      const newProposal: Proposal = {
        ...mockProposal,
        title: 'หัวข้อใหม่ใน Proposal',
      };
      const updatedP = updateProjectProposal(project.id, newProposal, storage);
      expect(updatedP?.proposal.title).toBe('หัวข้อใหม่ใน Proposal');

      const newPlan: Plan = {
        ...mockPlan,
        totalWeeks: 8,
      };
      const updatedPlan = updateProjectPlan(project.id, newPlan, storage);
      expect(updatedPlan?.plan.totalWeeks).toBe(8);
    });
  });

  describe('Seam 4: Project Deletion & Safe Fallback', () => {
    it('deletes active project and falls back to first remaining project', () => {
      const p1 = createProject({ title: 'โปรเจกต์ 1' }, storage);
      const p2 = createProject({ title: 'โปรเจกต์ 2' }, storage);

      // p2 is currently active
      expect(getActiveProjectId(storage)).toBe(p2.id);

      const deleted = deleteProject(p2.id, storage);
      expect(deleted).toBe(true);

      // Projects list now only has p1
      const all = getProjects(storage);
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe(p1.id);

      // Active project fell back to p1
      expect(getActiveProjectId(storage)).toBe(p1.id);
      expect(getActiveProject(storage)?.id).toBe(p1.id);
    });

    it('deleting the only existing project sets activeProjectId to null', () => {
      const p1 = createProject({ title: 'โปรเจกต์เดี่ยว' }, storage);

      deleteProject(p1.id, storage);

      expect(getProjects(storage)).toHaveLength(0);
      expect(getActiveProjectId(storage)).toBeNull();
      expect(getActiveProject(storage)).toBeNull();
    });

    it('deleting an unknown id returns false and is a safe no-op', () => {
      const p1 = createProject({ title: 'โปรเจกต์เดิม' }, storage);

      const deleted = deleteProject('ghost-id', storage);
      expect(deleted).toBe(false);
      expect(getProjects(storage)).toHaveLength(1);
      expect(getActiveProjectId(storage)).toBe(p1.id);
    });
  });

  describe('Seam 5: Idea CRUD (deleteIdea)', () => {
    it('saves, retrieves, and deletes an Idea', () => {
      const idea: Idea = {
        id: 'idea-xyz',
        learnerId: 'learner-1',
        title: 'ไอเดียต้นแบบ',
        description: 'รายละเอียด',
        source: 'idea_track',
        gradeLevel: 'm_plai',
        goal: 'ysc',
        createdAt: '2026-11-05T00:00:00.000Z',
        updatedAt: '2026-11-05T00:00:00.000Z',
      };

      saveIdea(idea, storage);
      expect(getIdeas(storage)).toHaveLength(1);

      const deleted = deleteIdea('idea-xyz', storage);
      expect(deleted).toBe(true);
      expect(getIdeas(storage)).toHaveLength(0);

      // Deleting already deleted is safe false
      expect(deleteIdea('idea-xyz', storage)).toBe(false);
    });
  });
});
