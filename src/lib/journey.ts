/** Home hub progress (Figma "H หน้าหลัก"): derived only from local learner data, never from the server. */
export type JourneyStatus = 'done' | 'current' | 'todo';
export interface JourneyStep { key: 'topic' | 'coach' | 'evaluate' | 'proposal' | 'export'; label: string; href: string; status: JourneyStatus }
export interface JourneyInput {
  hasInterview: boolean;
  latestIdeaId: string | null;
  hasEvaluation: boolean;
  activeProjectId: string | null;
}

export function journeySteps(input: JourneyInput): JourneyStep[] {
  const idea = input.latestIdeaId ? `?ideaId=${encodeURIComponent(input.latestIdeaId)}` : '';
  const project = input.activeProjectId ? `?projectId=${encodeURIComponent(input.activeProjectId)}` : '';
  const done = [Boolean(input.latestIdeaId) || input.hasInterview, Boolean(input.latestIdeaId), input.hasEvaluation, Boolean(input.activeProjectId), false];
  const steps: Omit<JourneyStep, 'status'>[] = [
    { key: 'topic', label: 'หาหัวข้อ', href: input.hasInterview ? '/discovery' : '/interview' },
    { key: 'coach', label: 'คุยกับที่ปรึกษา', href: '/idea' + idea },
    { key: 'evaluate', label: 'ประเมินไอเดีย', href: '/evaluation' + idea },
    { key: 'proposal', label: 'ข้อเสนอและแผนงาน', href: '/proposal' + project },
    { key: 'export', label: 'ส่งออกให้ครู', href: '/proposal' + (project ? project + '&' : '?') + 'tab=export' },
  ];
  const current = done.findIndex(d => !d);
  return steps.map((s, i) => ({ ...s, status: done[i] ? 'done' : i === current ? 'current' : 'todo' }));
}
