import { describe, expect, it } from 'vitest';
import { journeySteps } from '@/lib/journey';

describe('home hub journey', () => {
  it('starts at the interview for a new learner', () => {
    const steps = journeySteps({ hasInterview: false, latestIdeaId: null, hasEvaluation: false, activeProjectId: null });
    expect(steps.map(s => s.status)).toEqual(['current', 'todo', 'todo', 'todo', 'todo']);
    expect(steps[0].href).toBe('/interview');
  });
  it('moves to the coach after the interview, carrying the idea into later links', () => {
    expect(journeySteps({ hasInterview: true, latestIdeaId: null, hasEvaluation: false, activeProjectId: null })[1]).toMatchObject({ status: 'current', href: '/idea' });
    const steps = journeySteps({ hasInterview: true, latestIdeaId: 'i 1', hasEvaluation: false, activeProjectId: null });
    expect(steps.find(s => s.status === 'current')).toMatchObject({ key: 'evaluate', href: '/evaluation?ideaId=i%201' });
  });
  it('ends on export, which stays the next step because exports are not tracked', () => {
    const steps = journeySteps({ hasInterview: true, latestIdeaId: 'i', hasEvaluation: true, activeProjectId: 'p' });
    expect(steps.find(s => s.status === 'current')).toMatchObject({ key: 'export', href: '/proposal?projectId=p&tab=export' });
  });
});
