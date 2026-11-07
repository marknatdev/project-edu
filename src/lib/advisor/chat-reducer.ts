import {
  COACH_ASPECTS,
  type CoachAspect,
  type CoachAspectProgress,
  type CoachingTier,
  type ResolvedCoachMode,
} from '@/lib/advisor/coach-contract';
import { IdeaSchema, IdeaVariablesLiteSchema } from '@/lib/schemas';
import { saveIdea } from '@/lib/storage/store';
import type {
  Goal,
  GradeLevel,
  Idea,
  IdeaVariablesLite,
  TopicCard,
  Track,
} from '@/types/domain';

import type { CoachConversation, CoachLocalWork } from './coach-dto';
export type ChatPhase = 'chatting' | 'rewrite' | 'variables' | 'done';
export interface ChatMessage {
  id: string; role: 'coach' | 'student'; content: string;
  tier?: CoachingTier; mode?: ResolvedCoachMode; priorWorkIds?: string[]; aspect?: CoachAspect; lenses?: string[]; examples?: string[];
  timestamp: string; source?: 'ai' | 'fallback'; unverified?: boolean;
}
export interface ChatState {
  track: Track; topicCard: TopicCard | null; gradeLevel: GradeLevel; goal: Goal;
  messages: ChatMessage[]; drafts: ChatMessage[]; questionCount: number;
  aspectProgress: CoachAspectProgress; unlockedTiers: CoachingTier[]; currentTier: CoachingTier;
  phase: ChatPhase; pendingTier3Example: string | null; studentRewrite: string | null;
  /** An AI starting point the learner chose to set aside for now; still required before saving an idea. */
  deferredExample?: string | null;
  variablesDraft: Partial<IdeaVariablesLite>; savedIdea: Idea | null;
  isWaitingForResponse: boolean; isOffline: boolean; error: string | null;
  conversation: CoachConversation | null; serverVerified: boolean;
}
export type ChatAction =
  | { type: 'RESTORE'; state: ChatState }
  | { type: 'SERVER_HYDRATE'; conversation: CoachConversation; acknowledgedDraftId?: string }
  | { type: 'STUDENT_SEND_MESSAGE'; content: string; id?: string }
  | { type: 'REQUEST_STARTED' }
  | { type: 'COACH_RESPONSE_FAILURE'; error?: string }
  | { type: 'REQUEST_TIER'; tier: CoachingTier }
  | { type: 'SUBMIT_REWRITE'; rewrittenText: string }
  | { type: 'DEFER_REWRITE' }
  | { type: 'GO_TO_VARIABLES' }
  | { type: 'SET_VARIABLES'; variables: IdeaVariablesLite }
  | { type: 'FINALIZE_IDEA'; learnerId: string };

export function areAllAspectsCovered(progress: CoachAspectProgress): boolean {
  return (
    progress.problem &&
    progress.objective &&
    progress.methodology &&
    progress.measurement
  );
}

/**
 * Returns the next unfilled aspect sequentially.
 */
export function getNextUnfilledAspect(progress: CoachAspectProgress): CoachAspect {
  for (const aspect of COACH_ASPECTS) {
    if (!progress[aspect]) return aspect;
  }
  return 'measurement';
}

export function canRequestTier(state: Pick<ChatState, 'conversation' | 'serverVerified' | 'isOffline'>, tier: CoachingTier): { allowed: boolean; reasonTh?: string } {
  if (tier === 1) return { allowed: true };
  const history = state.serverVerified && !state.isOffline ? state.conversation?.state.history ?? [] : [];
  const answer = history.findIndex(h => h.tier === 1 && Boolean(h.learnerResponse?.trim()));
  if (answer >= 0 && (tier === 2 || history.some((h, i) => i > answer && h.tier === 2 && Boolean(h.lenses?.length)))) return { allowed: true };
  return { allowed: false, reasonTh: 'ปุ่มคิดไม่ออกจริงๆ จะปลดล็อกหลังเซิร์ฟเวอร์ออกคำถามระดับ 1 รับคำตอบของคุณ และออกคำใบ้ระดับ 2 แล้ว (ตอบว่ายังคิดไม่ออกได้)' };
}

export function isRewriteAcceptable(
  example: string,
  rewrite: string
): { acceptable: boolean; reasonTh?: string; overlapRatio: number } {
  const trimmed = rewrite.trim();

  if (trimmed.length < 15) {
    return {
      acceptable: false,
      reasonTh: 'กรุณาเขียนอธิบายแนวทางในมุมมองของคุณอย่างน้อย 15 ตัวอักษร',
      overlapRatio: 0,
    };
  }

  // Normalize: lower case and strip whitespace/punctuation
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]/gu, '')
      .trim();

  const normExample = normalize(example);
  const normRewrite = normalize(trimmed);

  if (normExample === normRewrite) {
    return {
      acceptable: false,
      reasonTh:
        'กรุณาเขียนใหม่ด้วยสำนวนภาษาและความเข้าใจของตนเอง (ห้ามคัดลอกหรือดัดแปลงข้อความตัวอย่างตรงๆ)',
      overlapRatio: 1.0,
    };
  }

  // Character 3-grams for Thai similarity
  const getTrigrams = (text: string): Set<string> => {
    const ngrams = new Set<string>();
    if (text.length < 3) {
      ngrams.add(text);
      return ngrams;
    }
    for (let i = 0; i <= text.length - 3; i++) {
      ngrams.add(text.slice(i, i + 3));
    }
    return ngrams;
  };

  const setA = getTrigrams(normExample);
  const setB = getTrigrams(normRewrite);

  let intersectionCount = 0;
  for (const gram of setB) {
    if (setA.has(gram)) {
      intersectionCount++;
    }
  }

  const overlapRatio =
    setA.size + setB.size === 0
      ? 0
      : (2 * intersectionCount) / (setA.size + setB.size);

  if (overlapRatio > 0.65) {
    return {
      acceptable: false,
      reasonTh:
        'กรุณาเขียนใหม่ด้วยสำนวนภาษาและความเข้าใจของตนเอง (หลีกเลี่ยงการคัดลอกข้อความตัวอย่างตรงๆ)',
      overlapRatio,
    };
  }

  return {
    acceptable: true,
    overlapRatio,
  };
}

/**
 * Validates Variables Lite step inputs.
 */
export function validateVariablesLite(input: unknown): {
  valid: boolean;
  errors: Record<string, string>;
  data?: IdeaVariablesLite;
} {
  const result = IdeaVariablesLiteSchema.safeParse(input);
  if (result.success) {
    return { valid: true, errors: {}, data: result.data };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path[0]?.toString() ?? 'general';
    errors[path] = issue.message;
  }
  return { valid: false, errors };
}

export function createInitialChatState(init: {
  track: Track; topicCard?: TopicCard | null; gradeLevel?: GradeLevel; goal?: Goal;
}): ChatState {
  return { track: init.track, topicCard: init.topicCard ?? null, gradeLevel: init.gradeLevel ?? 'm_ton', goal: init.goal ?? 'curiosity',
    messages: [], drafts: [], questionCount: 0,
    aspectProgress: { problem: false, objective: false, methodology: false, measurement: false },
    unlockedTiers: [1], currentTier: 1, phase: 'chatting', pendingTier3Example: null,
    studentRewrite: null, variablesDraft: {}, savedIdea: null,
    isWaitingForResponse: false, isOffline: false, error: null, conversation: null, serverVerified: false };
}

export function buildIdeaFromChat(
  state: ChatState,
  params: {
    learnerId: string;
    goal: Goal;
    gradeLevel: GradeLevel;
    customTitle?: string;
  }
): Idea {
  // Synthesize clean title & description from student input and topic card
  const title =
    params.customTitle?.trim() ||
    state.savedIdea?.title ||
    state.topicCard?.title ||
    state.messages.find((m) => m.role === 'student')?.content.slice(0, 80) ||
    'โครงงานที่พัฒนาผ่าน Socratic Advisor';

  const studentResponses = state.messages
    .filter((m) => m.role === 'student')
    .map((m) => m.content);
  if (state.studentRewrite) studentResponses.push(state.studentRewrite);

  const description =
    studentResponses.length > 0
      ? studentResponses.join('\n\n')
      : state.savedIdea?.description || state.topicCard?.curiosityHook || 'โครงงานที่พัฒนาผ่านการสนทนากับครูที่ปรึกษา AI';

  const idea: Idea = {
    ...state.savedIdea,
    id: state.savedIdea?.id ?? `idea_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    learnerId: params.learnerId,
    title,
    description,
    source: state.track,
    sourceTopicCardId: state.topicCard?.id,
    coachingTopicKey: state.conversation?.topicKey ?? state.savedIdea?.coachingTopicKey,
    gradeLevel: params.gradeLevel,
    goal: params.goal,
    variables: validateVariablesLite(state.variablesDraft).data,
    usedTier3Example: Boolean(state.pendingTier3Example || state.studentRewrite),
    tier3Rewrite: state.studentRewrite ?? undefined,
    createdAt: state.savedIdea?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const parsed = IdeaSchema.parse(idea);
  return parsed;
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'RESTORE': return { ...action.state, serverVerified: false, isWaitingForResponse: false };
    case 'SERVER_HYDRATE': {
      const conversation = action.conversation;
      const changed = state.conversation && state.conversation.id !== conversation.id;
      const recovered: ChatMessage[] = changed ? [
        ...state.drafts,
        ...state.messages.filter(m => m.role === 'student').map(m => ({ ...m, id: `recovered-${m.id}`, unverified: true })),
        ...(state.studentRewrite ? [{ id: crypto.randomUUID(), role: 'student' as const, content: state.studentRewrite, timestamp: new Date().toISOString(), unverified: true }] : []),
      ] : state.drafts;
      const base = changed ? { ...createInitialChatState(conversation.context), drafts: recovered, variablesDraft: state.variablesDraft } : state;
      const messages: ChatMessage[] = [];
      for (const h of conversation.state.history) {
        messages.push({ id: `coach-${conversation.id}-${h.turnIndex}`, role: 'coach', content: h.content,
          tier: h.tier, mode: h.mode, priorWorkIds: h.priorWorkIds, aspect: h.aspect, lenses: h.lenses, examples: h.examples, timestamp: h.timestamp, source: h.source });
        if (h.learnerResponse) messages.push({ id: `answer-${conversation.id}-${h.turnIndex}`, role: 'student', content: h.learnerResponse, timestamp: h.timestamp });
      }
      if (conversation.turn.aspect === 'completed') messages.push({ id: `complete-${conversation.revision}`, role: 'coach', content: conversation.turn.content, timestamp: new Date().toISOString() });
      const example = [...conversation.state.history].reverse().find(h => h.tier === 3 && h.examples?.length)?.examples?.[0] ?? null;
      const rewrite = example === base.pendingTier3Example ? base.studentRewrite : null;
      const phase = example && !rewrite && example !== base.deferredExample ? 'rewrite' : base.phase === 'done' || base.phase === 'variables'
        ? base.phase : conversation.state.isComplete ? 'variables' : 'chatting';
      return { ...base, ...conversation.context, topicCard: conversation.context.topicCard ?? null,
        conversation, serverVerified: true, messages,
        drafts: base.drafts.filter(d => d.id !== action.acknowledgedDraftId),
        questionCount: conversation.state.turnCount, aspectProgress: { ...conversation.state.aspectProgress },
        unlockedTiers: [...conversation.state.unlockedTiers], currentTier: conversation.turn.tier,
        pendingTier3Example: example, studentRewrite: rewrite, phase, isWaitingForResponse: false, isOffline: false, error: changed ? 'บทสนทนาเปลี่ยนแล้ว ข้อความเดิมเก็บเป็นฉบับร่างที่ยังไม่ได้ส่ง' : null };
    }
    case 'STUDENT_SEND_MESSAGE': {
      if (!action.content.trim()) return state;
      const draft: ChatMessage = { id: action.id ?? crypto.randomUUID(), role: 'student', content: action.content.trim(), timestamp: new Date().toISOString(), unverified: true };
      return { ...state, drafts: [...state.drafts, draft], isWaitingForResponse: true, error: null };
    }
    case 'REQUEST_STARTED': return { ...state, isWaitingForResponse: true, error: null };
    case 'COACH_RESPONSE_FAILURE': return { ...state, isWaitingForResponse: false, isOffline: true, serverVerified: false,
      error: action.error ?? 'ยังเชื่อมต่อเซิร์ฟเวอร์ไม่ได้ เก็บข้อความเป็นฉบับร่างแล้ว กดเชื่อมต่อใหม่แล้วส่งอีกครั้ง' };
    case 'REQUEST_TIER': {
      const check = canRequestTier(state, action.tier);
      return check.allowed ? { ...state, currentTier: action.tier, error: null } : { ...state, error: check.reasonTh ?? null };
    }
    case 'SUBMIT_REWRITE': {
      if (state.phase !== 'rewrite') return state;
      const issuedExamples = state.conversation?.state.history.flatMap(h => h.examples ?? []) ?? [state.pendingTier3Example ?? ''];
      const check = issuedExamples.map(example => isRewriteAcceptable(example, action.rewrittenText)).find(check => !check.acceptable) ?? { acceptable: true };
      if (!check.acceptable) return { ...state, error: check.reasonTh ?? null };
      return { ...state, studentRewrite: action.rewrittenText.trim(), phase: state.conversation?.state.isComplete ? 'variables' : 'chatting', error: null };
    }
    case 'DEFER_REWRITE': return state.phase === 'rewrite' ? { ...state, deferredExample: state.pendingTier3Example, phase: 'chatting', error: null } : state;
    case 'GO_TO_VARIABLES': return state.pendingTier3Example && !state.studentRewrite ? state : { ...state, phase: 'variables' };
    case 'SET_VARIABLES': return validateVariablesLite(action.variables).valid
      ? { ...state, variablesDraft: action.variables, error: null } : { ...state, error: 'กรุณากรอกข้อมูลตัวแปรให้ครบถ้วนและถูกต้อง' };
    case 'FINALIZE_IDEA': {
      if (state.pendingTier3Example && !state.studentRewrite) return { ...state, phase: 'rewrite' };
      if (!validateVariablesLite(state.variablesDraft).valid) return { ...state, error: 'กรุณากรอกข้อมูลตัวแปรให้ครบถ้วนและถูกต้อง' };
      const idea = buildIdeaFromChat(state, { learnerId: action.learnerId, goal: state.goal, gradeLevel: state.gradeLevel });
      saveIdea(idea);
      return { ...state, savedIdea: idea, phase: 'done', error: null };
    }
    default: return state;
  }
}

export function localWorkFromChat(state: ChatState, input: string): CoachLocalWork {
  return { input, rewriteInput: '', studentRewrite: state.studentRewrite, variablesDraft: state.variablesDraft,
    savedIdea: state.savedIdea, phase: state.phase, drafts: state.drafts.map(d => ({ id: d.id, content: d.content, timestamp: d.timestamp })) };
}
