import { describe, it, expect } from 'vitest';
import { SubjectSchema, SubfieldSchema, TopicCardSchema } from '@/lib/schemas';
import { SUBJECTS, SUBFIELDS } from '@/data/subfields';
import {
  SCIENCE_TOPIC_CARDS,
  COMPUTER_TOPIC_CARDS,
  MATHEMATICS_TOPIC_CARDS,
  TOPIC_CARDS,
} from '@/data/topic-cards';
import { screenIdea } from '@/lib/safety/screener';
import * as lucideIcons from 'lucide-react';

describe('Milestone 2.1: Subfields and Catalog Structure', () => {
  describe('Subjects & Subfields Schema and Consistency', () => {
    it('defines exactly 3 canonical subjects with valid schemas and lucide icons', () => {
      expect(SUBJECTS).toHaveLength(3);
      const subjectIds = SUBJECTS.map((s) => s.id);
      expect(subjectIds).toEqual(['science', 'computer', 'mathematics']);

      for (const subject of SUBJECTS) {
        const parseResult = SubjectSchema.safeParse(subject);
        expect(parseResult.success).toBe(true);
        expect(subject.icon in lucideIcons).toBe(true);
      }
    });

    it('defines subfields for every subject with valid schemas, unique IDs, and valid lucide icons', () => {
      expect(SUBFIELDS.length).toBeGreaterThanOrEqual(12);
      const subfieldIds = new Set<string>();

      for (const subfield of SUBFIELDS) {
        expect(subfieldIds.has(subfield.id)).toBe(false);
        subfieldIds.add(subfield.id);

        const parseResult = SubfieldSchema.safeParse(subfield);
        expect(parseResult.success).toBe(true);
        expect(subfield.icon in lucideIcons).toBe(true);

        const parentSubject = SUBJECTS.find((s) => s.id === subfield.subjectId);
        expect(parentSubject).toBeDefined();
      }

      // Check every subject has at least 3 subfields
      for (const subject of SUBJECTS) {
        const matching = SUBFIELDS.filter((sf) => sf.subjectId === subject.id);
        expect(matching.length).toBeGreaterThanOrEqual(3);
      }
    });
  });

  describe('Science Topic Cards (30 cards)', () => {
    it('has exactly 30 science cards with unique IDs and valid schema', () => {
      expect(SCIENCE_TOPIC_CARDS).toHaveLength(30);

      const scienceSubfieldIds = new Set(
        SUBFIELDS.filter((sf) => sf.subjectId === 'science').map((sf) => sf.id)
      );
      const cardIds = new Set<string>();

      for (const card of SCIENCE_TOPIC_CARDS) {
        expect(cardIds.has(card.id)).toBe(false);
        cardIds.add(card.id);

        expect(card.id).toMatch(/^sci-[a-z]+-\d{2}$/);
        expect(card.subjectId).toBe('science');
        expect(scienceSubfieldIds.has(card.subfieldId)).toBe(true);

        const parseResult = TopicCardSchema.safeParse(card);
        expect(parseResult.success).toBe(true);

        // Sanity checks on values
        expect(card.estimatedWeeks).toBeGreaterThanOrEqual(1);
        expect(card.estimatedWeeks).toBeLessThanOrEqual(16);
        expect(card.estimatedBudgetBaht).toBeGreaterThanOrEqual(0);
        expect(card.estimatedBudgetBaht).toBeLessThanOrEqual(5000);
        expect(Number.isInteger(card.estimatedBudgetBaht)).toBe(true);

        expect(card.minTeamSize).toBeGreaterThanOrEqual(1);
        expect(card.maxTeamSize).toBeGreaterThanOrEqual(card.minTeamSize);
        expect(card.maxTeamSize).toBeLessThanOrEqual(5);

        expect(card.curiosityHook.length).toBeGreaterThan(10);
        expect(card.phenomenon.length).toBeGreaterThan(10);
        expect(card.requiredEquipment.length).toBeGreaterThanOrEqual(1);
        expect(card.requiredSkills.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('covers both grade levels and multiple difficulty levels in science', () => {
      const gradeLevels = new Set(SCIENCE_TOPIC_CARDS.flatMap((c) => c.targetGradeLevels));
      expect(gradeLevels.has('m_ton')).toBe(true);
      expect(gradeLevels.has('m_plai')).toBe(true);

      const difficulties = new Set(SCIENCE_TOPIC_CARDS.map((c) => c.difficulty));
      expect(difficulties.has('beginner')).toBe(true);
      expect(difficulties.has('intermediate')).toBe(true);
      expect(difficulties.has('advanced')).toBe(true);
    });

    it('matches pre-screened safety categories deterministically with M1 screener', () => {
      for (const card of SCIENCE_TOPIC_CARDS) {
        const textToScreen = `${card.title} ${card.phenomenon} ${card.curiosityHook}`;
        const screenedFlags = screenIdea(textToScreen);
        const expectedCategories = screenedFlags.map((f) => f.category).sort();
        const cardCategories = [...(card.safetyCategories ?? [])].sort();

        expect(cardCategories).toEqual(expectedCategories);
      }
    });
  });

  describe('Computer / AI / IoT Topic Cards (30 cards)', () => {
    it('has exactly 30 computer cards with unique IDs and valid schema', () => {
      expect(COMPUTER_TOPIC_CARDS).toHaveLength(30);

      const computerSubfieldIds = new Set(
        SUBFIELDS.filter((sf) => sf.subjectId === 'computer').map((sf) => sf.id)
      );
      const cardIds = new Set<string>();

      for (const card of COMPUTER_TOPIC_CARDS) {
        expect(cardIds.has(card.id)).toBe(false);
        cardIds.add(card.id);

        expect(card.id).toMatch(/^cmp-[a-z]+-\d{2}$/);
        expect(card.subjectId).toBe('computer');
        expect(computerSubfieldIds.has(card.subfieldId)).toBe(true);

        const parseResult = TopicCardSchema.safeParse(card);
        expect(parseResult.success).toBe(true);

        // Sanity checks on values
        expect(card.estimatedWeeks).toBeGreaterThanOrEqual(1);
        expect(card.estimatedWeeks).toBeLessThanOrEqual(16);
        expect(card.estimatedBudgetBaht).toBeGreaterThanOrEqual(0);
        expect(card.estimatedBudgetBaht).toBeLessThanOrEqual(5000);
        expect(Number.isInteger(card.estimatedBudgetBaht)).toBe(true);

        expect(card.minTeamSize).toBeGreaterThanOrEqual(1);
        expect(card.maxTeamSize).toBeGreaterThanOrEqual(card.minTeamSize);
        expect(card.maxTeamSize).toBeLessThanOrEqual(5);

        expect(card.curiosityHook.length).toBeGreaterThan(10);
        expect(card.phenomenon.length).toBeGreaterThan(10);
        expect(card.requiredEquipment.length).toBeGreaterThanOrEqual(1);
        expect(card.requiredSkills.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('covers both grade levels and multiple difficulty levels in computer', () => {
      const gradeLevels = new Set(COMPUTER_TOPIC_CARDS.flatMap((c) => c.targetGradeLevels));
      expect(gradeLevels.has('m_ton')).toBe(true);
      expect(gradeLevels.has('m_plai')).toBe(true);

      const difficulties = new Set(COMPUTER_TOPIC_CARDS.map((c) => c.difficulty));
      expect(difficulties.has('beginner')).toBe(true);
      expect(difficulties.has('intermediate')).toBe(true);
      expect(difficulties.has('advanced')).toBe(true);
    });

    it('matches pre-screened safety categories deterministically with M1 screener in computer', () => {
      for (const card of COMPUTER_TOPIC_CARDS) {
        const textToScreen = `${card.title} ${card.phenomenon} ${card.curiosityHook}`;
        const screenedFlags = screenIdea(textToScreen);
        const expectedCategories = screenedFlags.map((f) => f.category).sort();
        const cardCategories = [...(card.safetyCategories ?? [])].sort();

        expect(cardCategories).toEqual(expectedCategories);
      }
    });
  });

  describe('Mathematics Topic Cards (30 cards)', () => {
    it('has exactly 30 mathematics cards with unique IDs and valid schema', () => {
      expect(MATHEMATICS_TOPIC_CARDS).toHaveLength(30);

      const mathSubfieldIds = new Set(
        SUBFIELDS.filter((sf) => sf.subjectId === 'mathematics').map((sf) => sf.id)
      );
      const cardIds = new Set<string>();

      for (const card of MATHEMATICS_TOPIC_CARDS) {
        expect(cardIds.has(card.id)).toBe(false);
        cardIds.add(card.id);

        expect(card.id).toMatch(/^mat-[a-z]+-\d{2}$/);
        expect(card.subjectId).toBe('mathematics');
        expect(mathSubfieldIds.has(card.subfieldId)).toBe(true);

        const parseResult = TopicCardSchema.safeParse(card);
        expect(parseResult.success).toBe(true);

        // Sanity checks on values
        expect(card.estimatedWeeks).toBeGreaterThanOrEqual(1);
        expect(card.estimatedWeeks).toBeLessThanOrEqual(16);
        expect(card.estimatedBudgetBaht).toBeGreaterThanOrEqual(0);
        expect(card.estimatedBudgetBaht).toBeLessThanOrEqual(5000);
        expect(Number.isInteger(card.estimatedBudgetBaht)).toBe(true);

        expect(card.minTeamSize).toBeGreaterThanOrEqual(1);
        expect(card.maxTeamSize).toBeGreaterThanOrEqual(card.minTeamSize);
        expect(card.maxTeamSize).toBeLessThanOrEqual(5);

        expect(card.curiosityHook.length).toBeGreaterThan(10);
        expect(card.phenomenon.length).toBeGreaterThan(10);
        expect(card.requiredEquipment.length).toBeGreaterThanOrEqual(1);
        expect(card.requiredSkills.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('covers both grade levels and multiple difficulty levels in mathematics', () => {
      const gradeLevels = new Set(MATHEMATICS_TOPIC_CARDS.flatMap((c) => c.targetGradeLevels));
      expect(gradeLevels.has('m_ton')).toBe(true);
      expect(gradeLevels.has('m_plai')).toBe(true);

      const difficulties = new Set(MATHEMATICS_TOPIC_CARDS.map((c) => c.difficulty));
      expect(difficulties.has('beginner')).toBe(true);
      expect(difficulties.has('intermediate')).toBe(true);
      expect(difficulties.has('advanced')).toBe(true);
    });

    it('matches pre-screened safety categories deterministically with M1 screener in mathematics', () => {
      for (const card of MATHEMATICS_TOPIC_CARDS) {
        const textToScreen = `${card.title} ${card.phenomenon} ${card.curiosityHook}`;
        const screenedFlags = screenIdea(textToScreen);
        const expectedCategories = screenedFlags.map((f) => f.category).sort();
        const cardCategories = [...(card.safetyCategories ?? [])].sort();

        expect(cardCategories).toEqual(expectedCategories);
      }
    });
  });

  describe('Cross-Cutting Catalog Assertions (TOPIC_CARDS)', () => {
    it('contains exactly 90 topic cards in total, exactly 30 per subject', () => {
      expect(TOPIC_CARDS).toHaveLength(90);

      const scienceCards = TOPIC_CARDS.filter((c) => c.subjectId === 'science');
      const computerCards = TOPIC_CARDS.filter((c) => c.subjectId === 'computer');
      const mathCards = TOPIC_CARDS.filter((c) => c.subjectId === 'mathematics');

      expect(scienceCards).toHaveLength(30);
      expect(computerCards).toHaveLength(30);
      expect(mathCards).toHaveLength(30);
    });

    it('has 90 globally unique IDs across the entire catalog', () => {
      const ids = TOPIC_CARDS.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(90);
    });

    it('ensures every card references an existing subfield matching its subjectId', () => {
      const subfieldMap = new Map(SUBFIELDS.map((sf) => [sf.id, sf.subjectId]));

      for (const card of TOPIC_CARDS) {
        expect(subfieldMap.has(card.subfieldId)).toBe(true);
        expect(subfieldMap.get(card.subfieldId)).toBe(card.subjectId);
      }
    });

    it('validates every card with TopicCardSchema', () => {
      for (const card of TOPIC_CARDS) {
        const result = TopicCardSchema.safeParse(card);
        expect(result.success).toBe(true);
      }
    });

    it('ensures all budgets are integers between 0 and 5,000 baht', () => {
      for (const card of TOPIC_CARDS) {
        expect(card.estimatedBudgetBaht).toBeGreaterThanOrEqual(0);
        expect(card.estimatedBudgetBaht).toBeLessThanOrEqual(5000);
        expect(Number.isInteger(card.estimatedBudgetBaht)).toBe(true);
      }
    });

    it('ensures all time estimates are between 1 and 16 weeks', () => {
      for (const card of TOPIC_CARDS) {
        expect(card.estimatedWeeks).toBeGreaterThanOrEqual(1);
        expect(card.estimatedWeeks).toBeLessThanOrEqual(16);
      }
    });

    it('adheres to ADR 0002: problem sparks and phenomena, not finished project ideas', () => {
      // Forbidden finished-idea imperative prefixes
      const forbiddenPrefixes = ['สร้างเครื่อง', 'พัฒนาแอป', 'ประดิษฐ์', 'ออกแบบและสร้าง'];

      for (const card of TOPIC_CARDS) {
        for (const prefix of forbiddenPrefixes) {
          expect(card.title.startsWith(prefix)).toBe(false);
        }
        // Phenomena and curiosity hooks must be descriptive and exploratory
        expect(card.phenomenon.length).toBeGreaterThanOrEqual(15);
        expect(card.curiosityHook.length).toBeGreaterThanOrEqual(15);
      }
    });

    it('validates deterministic safety category consistency across all 90 cards', () => {
      let flaggedCardCount = 0;

      for (const card of TOPIC_CARDS) {
        const textToScreen = `${card.title} ${card.phenomenon} ${card.curiosityHook}`;
        const screenedFlags = screenIdea(textToScreen);
        const expectedCategories = screenedFlags.map((f) => f.category).sort();
        const cardCategories = [...(card.safetyCategories ?? [])].sort();

        expect(cardCategories).toEqual(expectedCategories);

        if (cardCategories.length > 0) {
          flaggedCardCount++;
        }
      }

      // Sane range: we expect a few authentic flags across the catalog, but mostly low-risk
      expect(flaggedCardCount).toBeGreaterThanOrEqual(2);
      expect(flaggedCardCount).toBeLessThanOrEqual(10);
    });
  });
});
