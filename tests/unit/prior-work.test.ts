import { describe, it, expect } from 'vitest';
import { PRIOR_WORK } from '@/data/prior-work';
import { findPriorWork } from '@/lib/prior-work/match';
import { SUBFIELDS } from '@/data/subfields';
import { VerifiedPriorWorkSchema, PriorWorkSchema } from '@/lib/schemas';
import type { TopicCard, Idea } from '@/types/domain';

describe('M2.2 Verified Prior Work Database & Matcher', () => {
  describe('Dataset Integrity & Quality (src/data/prior-work.ts)', () => {
    it('contains between 20 and 40 verified entries', () => {
      expect(PRIOR_WORK.length).toBeGreaterThanOrEqual(20);
      expect(PRIOR_WORK.length).toBeLessThanOrEqual(40);
    });

    it('every entry satisfies PriorWorkSchema and VerifiedPriorWorkSchema', () => {
      for (const entry of PRIOR_WORK) {
        const baseResult = PriorWorkSchema.safeParse(entry);
        expect(baseResult.success, `Entry ${entry.id} failed PriorWorkSchema: ${JSON.stringify(baseResult.error)}`).toBe(true);

        const verifiedResult = VerifiedPriorWorkSchema.safeParse(entry);
        expect(verifiedResult.success, `Entry ${entry.id} failed VerifiedPriorWorkSchema: ${JSON.stringify(verifiedResult.error)}`).toBe(true);
      }
    });

    it('every entry has an https URL and URLs are unique', () => {
      const normalizedUrls = new Set<string>();
      for (const entry of PRIOR_WORK) {
        expect(entry.url).toMatch(/^https:\/\//);
        const normalized = entry.url.replace(/\/+$/, '');
        expect(normalizedUrls.has(normalized), `Duplicate URL detected: ${entry.url}`).toBe(false);
        normalizedUrls.add(normalized);
      }
      expect(normalizedUrls.size).toBe(PRIOR_WORK.length);
    });

    it('every entry has verifiedAt not in the future and non-empty observedTitle', () => {
      const today = '2026-11-05';
      for (const entry of PRIOR_WORK) {
        expect(entry.verifiedAt).toBeDefined();
        expect(entry.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(entry.verifiedAt <= today, `Entry ${entry.id} verifiedAt is in the future: ${entry.verifiedAt}`).toBe(true);
        expect(entry.observedTitle).toBeDefined();
        expect(entry.observedTitle.trim().length).toBeGreaterThan(0);
      }
    });

    it('every subfield ID exists in canonical SUBFIELDS and all 12 subfields are covered', () => {
      const validSubfieldIds = new Set(SUBFIELDS.map((s) => s.id));
      const coveredSubfields = new Set<string>();

      for (const entry of PRIOR_WORK) {
        expect(entry.subfieldIds.length).toBeGreaterThan(0);
        for (const subfieldId of entry.subfieldIds) {
          expect(validSubfieldIds.has(subfieldId), `Unknown subfieldId: ${subfieldId} in entry ${entry.id}`).toBe(true);
          coveredSubfields.add(subfieldId);
        }
      }

      // Check all 12 canonical subfields have at least one prior work entry
      expect(validSubfieldIds.size).toBe(12);
      expect(coveredSubfields.size).toBe(12);
    });

    it('has non-empty neutral summary in Thai and valid authors/year/venue', () => {
      for (const entry of PRIOR_WORK) {
        expect(entry.summary.trim().length).toBeGreaterThan(15);
        expect(entry.authors.trim().length).toBeGreaterThan(0);
        expect(entry.year).toBeGreaterThanOrEqual(2000);
        expect(entry.year).toBeLessThanOrEqual(2026);
        expect(entry.competitionOrVenue.trim().length).toBeGreaterThan(0);
        expect(entry.keywords.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('findPriorWork matcher (src/lib/prior-work/match.ts)', () => {
    it('matches a TopicCard input using subfield and text keywords', () => {
      const mockCard: TopicCard = {
        id: 'card_test_water',
        subjectId: 'science',
        subfieldId: 'sci_environment',
        targetGradeLevels: ['m_plai'],
        difficulty: 'intermediate',
        title: 'การตรวจสอบคุณภาพน้ำและสารปนเปื้อนในแหล่งน้ำชุมชน',
        phenomenon: 'น้ำในคลองมีสีขุ่นและมีสารปนเปื้อนโลหะหนัก',
        curiosityHook: 'เราจะตรวจวัดและบำบัดน้ำเสียด้วยวัสดุธรรมชาติได้อย่างไร',
        requiredEquipment: ['หลอดทดลอง', 'เซนเซอร์ pH'],
        minTeamSize: 1,
        maxTeamSize: 3,
        requiredSkills: ['เคมีเบื้องต้น'],
        estimatedWeeks: 4,
        estimatedBudgetBaht: 500,
        safetyCategories: [],
      };

      const matches = findPriorWork(mockCard, 3);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.length).toBeLessThanOrEqual(3);

      // Top match should be in sci_environment
      const topMatch = matches[0];
      expect(topMatch.subfieldIds).toContain('sci_environment');
    });

    it('matches an Idea input using title and description', () => {
      const mockIdea: Idea = {
        id: 'idea_test_braille',
        learnerId: 'learner_123',
        title: 'ระบบช่วยสอนอักษรเบรลล์ด้วย AI สำหรับผู้พิการทางสายตา',
        description: 'พัฒนาอุปกรณ์และแอปพลิเคชันจำแนกอักษรเบรลล์ด้วยระบบสัมผัสและปัญญาประดิษฐ์',
        source: 'discovery_track',
        gradeLevel: 'm_plai',
        goal: 'ysc',
        createdAt: '2026-11-05T00:00:00.000Z',
        updatedAt: '2026-11-05T00:00:00.000Z',
      };

      const matches = findPriorWork(mockIdea, 2);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some((m) => m.id === 'ibraille-isef2025')).toBe(true);
    });

    it('matches a raw search string or partial query object', () => {
      const matchesString = findPriorWork('สปริงเกอร์ การกระจายตัวของน้ำ หัวสปริงเกอร์', 2);
      expect(matchesString.length).toBeGreaterThan(0);
      expect(matchesString.some((m) => m.id === 'sprinkler-polar-isef2018')).toBe(true);

      const matchesObj = findPriorWork({ subfieldId: 'math_discrete', text: 'ปัญหาการเดินทางของพนักงานขาย เส้นทางที่สั้นที่สุด' }, 2);
      expect(matchesObj.length).toBeGreaterThan(0);
      expect(matchesObj.some((m) => m.id === 'shortest-path-ayutthaya-tsp')).toBe(true);
    });

    it('returns empty array [] for gibberish or unrelated text', () => {
      const matches = findPriorWork('xyz123abc 987654321 qwertzuiopasdfghjk', 5);
      expect(matches).toEqual([]);
    });

    it('respects limit parameter and defaults to 5', () => {
      const card: TopicCard = {
        id: 'card_generic_bio',
        subjectId: 'science',
        subfieldId: 'sci_biology',
        targetGradeLevels: ['m_ton'],
        difficulty: 'beginner',
        title: 'การเจริญเติบโตของพืชและแมลง',
        phenomenon: 'แมลงและชีวภาพในสวน',
        curiosityHook: 'ศึกษาพฤติกรรมสิ่งมีชีวิต',
        requiredEquipment: [],
        minTeamSize: 1,
        maxTeamSize: 3,
        requiredSkills: [],
        estimatedWeeks: 2,
        estimatedBudgetBaht: 200,
        safetyCategories: [],
      };

      const limited1 = findPriorWork(card, 1);
      expect(limited1.length).toBe(1);

      const defaultLimit = findPriorWork(card);
      expect(defaultLimit.length).toBeLessThanOrEqual(5);
    });

    it('is strictly deterministic with consistent ranking across repeated calls', () => {
      const query = 'ชันโรง การขยายรัง น้ำผึ้งเทียม';
      const run1 = findPriorWork(query, 5);
      const run2 = findPriorWork(query, 5);

      expect(run1.map((r) => r.id)).toEqual(run2.map((r) => r.id));
    });
  });
});
