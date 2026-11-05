import { describe, it, expect } from 'vitest';
import {
  determineTrackRoute,
  validateInterviewStep,
  validateCompleteInterview,
  createInterviewFromDraft,
  type InterviewDraft,
} from '@/lib/interview/routing';

describe('Interview & Track Routing Logic (src/lib/interview/routing.ts)', () => {
  describe('Seam 4A: Track routing logic', () => {
    it('routes to /idea when learner has an initial idea or chose idea_track', () => {
      expect(determineTrackRoute({ hasInitialIdea: true, selectedTrack: 'idea_track' })).toBe('/idea');
      expect(determineTrackRoute({ hasInitialIdea: true })).toBe('/idea');
    });

    it('routes to /discovery when learner has no initial idea or chose discovery_track', () => {
      expect(determineTrackRoute({ hasInitialIdea: false, selectedTrack: 'discovery_track' })).toBe('/discovery');
      expect(determineTrackRoute({ hasInitialIdea: false })).toBe('/discovery');
    });

    it('defaults to /discovery if no track is explicitly specified', () => {
      expect(determineTrackRoute({})).toBe('/discovery');
    });
  });

  describe('Seam 4B: Step-by-step interview validation', () => {
    it('validates Step 1 (GradeLevel)', () => {
      expect(validateInterviewStep(1, { gradeLevel: 'm_ton' }).valid).toBe(true);
      expect(validateInterviewStep(1, { gradeLevel: 'm_plai' }).valid).toBe(true);
      expect(validateInterviewStep(1, {}).valid).toBe(false);
      // @ts-expect-error testing invalid input
      expect(validateInterviewStep(1, { gradeLevel: 'primary' }).valid).toBe(false);
    });

    it('validates Step 2 (Goal)', () => {
      expect(validateInterviewStep(2, { goal: 'ysc' }).valid).toBe(true);
      expect(validateInterviewStep(2, { goal: 'portfolio' }).valid).toBe(true);
      expect(validateInterviewStep(2, {}).valid).toBe(false);
      // @ts-expect-error testing invalid input
      expect(validateInterviewStep(2, { goal: 'invalid_goal' }).valid).toBe(false);
    });

    it('validates Step 3 (Constraints)', () => {
      const validConstraints = {
        timeWeeks: 8,
        budgetBaht: 1500,
        equipment: ['computer', 'basic_lab'],
        teamSize: 3,
        skills: ['science_lab'],
      };

      expect(validateInterviewStep(3, { constraints: validConstraints }).valid).toBe(true);

      // Incomplete or out of range
      expect(
        validateInterviewStep(3, {
          constraints: { ...validConstraints, timeWeeks: 0 },
        }).valid
      ).toBe(false);

      expect(
        validateInterviewStep(3, {
          constraints: { ...validConstraints, budgetBaht: -100 },
        }).valid
      ).toBe(false);

      expect(
        validateInterviewStep(3, {
          constraints: { ...validConstraints, teamSize: 15 },
        }).valid
      ).toBe(false);
    });

    it('validates Step 4 (Track choice & initial idea)', () => {
      expect(
        validateInterviewStep(4, {
          hasInitialIdea: true,
          selectedTrack: 'idea_track',
        }).valid
      ).toBe(true);

      expect(
        validateInterviewStep(4, {
          hasInitialIdea: false,
          selectedTrack: 'discovery_track',
        }).valid
      ).toBe(true);

      expect(validateInterviewStep(4, {}).valid).toBe(false);
    });
  });

  describe('Seam 4C: Full interview validation & creation', () => {
    const validDraft: InterviewDraft = {
      gradeLevel: 'm_plai',
      goal: 'ysc',
      constraints: {
        timeWeeks: 12,
        budgetBaht: 2500,
        equipment: ['computer', 'sensors'],
        teamSize: 2,
        skills: ['coding'],
      },
      hasInitialIdea: false,
      selectedTrack: 'discovery_track',
    };

    it('creates a validated Interview object from draft', () => {
      const interview = createInterviewFromDraft(validDraft, 'learner-999');
      expect(interview.id).toBeDefined();
      expect(interview.learnerId).toBe('learner-999');
      expect(interview.gradeLevel).toBe('m_plai');
      expect(interview.goal).toBe('ysc');
      expect(interview.completedAt).toBeDefined();

      const validation = validateCompleteInterview(interview);
      expect(validation.valid).toBe(true);
      expect(validation.data).toEqual(interview);
    });

    it('rejects incomplete interview object with descriptive errors', () => {
      const incomplete = {
        id: 'int-1',
        learnerId: 'l-1',
        gradeLevel: 'm_ton',
        // missing goal, constraints, etc.
      };

      const result = validateCompleteInterview(incomplete);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
