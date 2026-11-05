import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadState,
  saveLearner,
  getLearner,
  saveInterview,
  getInterview,
  addSwipeAction,
  getSwipeHistory,
  saveIdea,
  getIdeas,
  saveProject,
  getProjects,
  saveEvaluation,
  getEvaluations,
  saveConsent,
  getConsent,
  wipeAllLearnerData,
  createMemoryStorage,
  CURRENT_STORAGE_VERSION,
  STORAGE_KEY,
  STORAGE_PREFIX,
  type StorageAdapter,
} from '@/lib/storage/store';
import type {
  Learner,
  Interview,
  SwipeAction,
  Idea,
  Project,
  Evaluation,
} from '@/types/domain';

describe('Local Store (src/lib/storage/store.ts)', () => {
  let storage: StorageAdapter;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  describe('Seam 1: Store public API & round-trip persistence', () => {
    it('initializes with clean default state when storage is empty', () => {
      const { state, recovered } = loadState(storage);
      expect(recovered).toBe(false);
      expect(state.schemaVersion).toBe(CURRENT_STORAGE_VERSION);
      expect(state.consent.accepted).toBe(false);
      expect(state.learner).toBeNull();
      expect(state.interview).toBeNull();
      expect(state.swipeHistory).toEqual([]);
      expect(state.ideas).toEqual([]);
      expect(state.projects).toEqual([]);
      expect(state.evaluations).toEqual([]);
    });

    it('round-trips Learner profile (Zero-PII compliant)', () => {
      const learner: Learner = {
        id: 'learner-test-123',
        gradeLevel: 'm_plai',
        createdAt: '2026-11-05T10:00:00.000Z',
        updatedAt: '2026-11-05T10:00:00.000Z',
      };

      saveLearner(learner, storage);
      const retrieved = getLearner(storage);
      expect(retrieved).toEqual(learner);
    });

    it('round-trips Interview data', () => {
      const interview: Interview = {
        id: 'interview-1',
        learnerId: 'learner-test-123',
        gradeLevel: 'm_ton',
        goal: 'ysc',
        constraints: {
          timeWeeks: 12,
          budgetBaht: 1500,
          equipment: ['basic_lab', 'sensors'],
          teamSize: 3,
          skills: ['science_lab'],
        },
        hasInitialIdea: false,
        selectedTrack: 'discovery_track',
        completedAt: '2026-11-05T11:00:00.000Z',
      };

      saveInterview(interview, storage);
      const retrieved = getInterview(storage);
      expect(retrieved).toEqual(interview);
    });

    it('round-trips Swipe Actions (appends in order)', () => {
      const action1: SwipeAction = {
        cardId: 'card-sci-001',
        direction: 'interested',
        timestamp: '2026-11-05T11:01:00.000Z',
      };
      const action2: SwipeAction = {
        cardId: 'card-sci-002',
        direction: 'do_it_now',
        timestamp: '2026-11-05T11:02:00.000Z',
      };

      addSwipeAction(action1, storage);
      addSwipeAction(action2, storage);

      const history = getSwipeHistory(storage);
      expect(history).toHaveLength(2);
      expect(history[0]).toEqual(action1);
      expect(history[1]).toEqual(action2);
    });

    it('round-trips Ideas, Projects, and Evaluations', () => {
      const idea: Idea = {
        id: 'idea-1',
        learnerId: 'learner-test-123',
        title: 'เครื่องตรวจวัดค่าฝุ่น PM2.5 แบบพกพาต้นทุนต่ำ',
        description: 'โครงงานพัฒนาเครื่องวัดฝุ่นละอองขนาดเล็กด้วย ESP32',
        source: 'discovery_track',
        sourceTopicCardId: 'card-sci-001',
        gradeLevel: 'm_plai',
        goal: 'nsc',
        createdAt: '2026-11-05T11:05:00.000Z',
        updatedAt: '2026-11-05T11:05:00.000Z',
      };

      const evaluation: Evaluation = {
        id: 'eval-1',
        ideaId: 'idea-1',
        overallScore: 8,
        overallBadge: 'green',
        axes: {
          novelty: { score: 7, badge: 'green', rationale: 'ประยุกต์ใช้กับบริบทห้องเรียน', feedback: 'ลองทดสอบเพิ่ม' },
          feasibility: { score: 9, badge: 'green', rationale: 'งบประมาณและเวลาพอเหมาะ', feedback: 'เป็นไปได้สูง' },
          impact: { score: 8, badge: 'green', rationale: 'ช่วยนักเรียนทั้งโรงเรียน', feedback: 'ขยายผลได้' },
          rigor: { score: 8, badge: 'green', rationale: 'มีการเทียบค่ามาตรฐาน', feedback: 'เก็บข้อมูลต่อเนื่อง' },
          fit: { score: 9, badge: 'green', rationale: 'ตรงกับข้อจำกัดของผู้เรียน', feedback: 'เหมาะกับ ม.ปลาย' },
        },
        safetyFlags: [],
        priorWork: [],
        evaluatedAt: '2026-11-05T11:10:00.000Z',
      };

      const project: Project = {
        id: 'proj-1',
        learnerId: 'learner-test-123',
        ideaId: idea.id,
        title: idea.title,
        status: 'in_progress',
        proposal: {
          title: idea.title,
          problemStatement: 'ปัญหาฝุ่นละออง PM2.5 ในพื้นที่การศึกษา',
          objectives: ['สร้างเครื่องต้นแบบ', 'ทดสอบความแม่นยำ'],
          hypothesis: 'เครื่องต้นแบบมีความแม่นยำสอดคล้องกับมาตรฐานไม่น้อยกว่า 85%',
          variables: {
            independent: ['ระดับความเข้มข้นของฝุ่น'],
            dependent: ['ค่าที่อ่านได้จากเซนเซอร์'],
            controlled: ['อุณหภูมิ', 'ความชื้นสัมพัทธ์'],
          },
          methodology: 'ออกแบบวงจร เขียนโค้ด และเทียบค่ามาตรฐาน',
        },
        plan: {
          targetDeadline: '2026-12-31T23:59:59.000Z',
          totalWeeks: 8,
          milestones: [
            {
              week: 1,
              title: 'ศึกษาและจัดหาอุปกรณ์',
              description: 'จัดซื้อเซนเซอร์และบอร์ด ESP32',
              deliverable: 'รายการอุปกรณ์ครบถ้วน',
              completed: true,
            },
          ],
        },
        createdAt: '2026-11-05T11:15:00.000Z',
        updatedAt: '2026-11-05T11:15:00.000Z',
      };

      saveIdea(idea, storage);
      saveEvaluation(evaluation, storage);
      saveProject(project, storage);

      expect(getIdeas(storage)).toEqual([idea]);
      expect(getEvaluations(storage)).toEqual([evaluation]);
      expect(getProjects(storage)).toEqual([project]);
    });

    it('round-trips PDPA Consent status', () => {
      saveConsent({ accepted: true, acceptedAt: '2026-11-05T09:00:00.000Z' }, storage);
      const consent = getConsent(storage);
      expect(consent.accepted).toBe(true);
      expect(consent.acceptedAt).toBe('2026-11-05T09:00:00.000Z');
    });
  });

  describe('Seam 2: Load-time recovery & schema migration', () => {
    it('migrates older schema version (v0 to v1) safely', () => {
      // Hypothetical legacy v0 state missing consent structure and schemaVersion
      const legacyV0Data = {
        schemaVersion: 0,
        learner: {
          id: 'legacy-learner-99',
          gradeLevel: 'm_ton',
          createdAt: '2026-11-01T00:00:00.000Z',
          updatedAt: '2026-11-01T00:00:00.000Z',
        },
        interview: null,
        swipeHistory: [],
      };

      storage.setItem(STORAGE_KEY, JSON.stringify(legacyV0Data));

      const { state, recovered } = loadState(storage);
      expect(recovered).toBe(true);
      expect(state.schemaVersion).toBe(CURRENT_STORAGE_VERSION);
      expect(state.learner?.id).toBe('legacy-learner-99');
      expect(state.consent).toEqual({ accepted: false, acceptedAt: null });
      expect(state.ideas).toEqual([]);
      expect(state.projects).toEqual([]);
      expect(state.evaluations).toEqual([]);
    });

    it('recovers gracefully from corrupted JSON without throwing', () => {
      storage.setItem(STORAGE_KEY, '{invalid-json:broken');
      const { state, recovered } = loadState(storage);
      expect(recovered).toBe(true);
      expect(state.schemaVersion).toBe(CURRENT_STORAGE_VERSION);
      expect(state.learner).toBeNull();
    });

    it('recovers gracefully from schema violation (e.g. injected PII or invalid types)', () => {
      // Injected PII violates strict Learner schema
      const piiViolatingData = {
        schemaVersion: 1,
        consent: { accepted: true, acceptedAt: '2026-11-05T00:00:00.000Z' },
        learner: {
          id: 'test-learner',
          gradeLevel: 'm_ton',
          createdAt: '2026-11-05T00:00:00.000Z',
          updatedAt: '2026-11-05T00:00:00.000Z',
          realName: 'นายสมชาย', // FORBIDDEN PII
          school: 'โรงเรียนตัวอย่าง', // FORBIDDEN PII
        },
        interview: null,
        swipeHistory: [],
        ideas: [],
        projects: [],
        evaluations: [],
      };

      storage.setItem(STORAGE_KEY, JSON.stringify(piiViolatingData));
      const { state, recovered } = loadState(storage);
      expect(recovered).toBe(true);
      // Fell back to fresh default state
      expect(state.learner).toBeNull();
    });

    it('recovers safely when future unsupported version is encountered', () => {
      storage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          schemaVersion: 999,
          someFutureField: 'unsupported',
        })
      );
      const { state, recovered } = loadState(storage);
      expect(recovered).toBe(true);
      expect(state.schemaVersion).toBe(CURRENT_STORAGE_VERSION);
    });
  });

  describe('Seam 3: wipeAllLearnerData()', () => {
    it('removes all app-namespaced keys and leaves non-app keys intact', () => {
      // Setup app keys
      storage.setItem(`${STORAGE_PREFIX}state`, JSON.stringify({ hello: 'world' }));
      storage.setItem(`${STORAGE_PREFIX}anonymous_id`, 'anon-12345');
      storage.setItem(`${STORAGE_PREFIX}custom_pref`, 'dark');

      // Setup non-app external key
      storage.setItem('external_library_key', 'keep_me_alive');
      storage.setItem('user_auth_token_other_site', 'secret');

      wipeAllLearnerData(storage);

      // App keys should be gone
      expect(storage.getItem(`${STORAGE_PREFIX}state`)).toBeNull();
      expect(storage.getItem(`${STORAGE_PREFIX}anonymous_id`)).toBeNull();
      expect(storage.getItem(`${STORAGE_PREFIX}custom_pref`)).toBeNull();

      // Non-app keys must remain untouched
      expect(storage.getItem('external_library_key')).toBe('keep_me_alive');
      expect(storage.getItem('user_auth_token_other_site')).toBe('secret');

      // Public load returns clean default state
      const { state } = loadState(storage);
      expect(state.learner).toBeNull();
      expect(state.consent.accepted).toBe(false);
    });
  });
});
