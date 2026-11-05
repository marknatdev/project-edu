import {
  COACH_ASPECTS,
  FALLBACK_PROMPTS,
  type CoachAspect,
  type CoachAspectProgress,
  type CoachingTier,
} from '@/lib/ai/socratic-coach';
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

export type ChatPhase = 'chatting' | 'rewrite' | 'variables' | 'done';

export interface ChatMessage {
  id: string;
  role: 'coach' | 'student';
  content: string;
  tier?: CoachingTier;
  aspect?: CoachAspect;
  lenses?: string[];
  examples?: string[];
  timestamp: string;
}

export interface ChatState {
  track: Track;
  topicCard: TopicCard | null;
  gradeLevel: GradeLevel;
  goal: Goal;
  messages: ChatMessage[];
  questionCount: number; // 0..8
  aspectProgress: CoachAspectProgress;
  unlockedTiers: CoachingTier[]; // starts with [1]
  currentTier: CoachingTier;
  phase: ChatPhase;
  pendingTier3Example: string | null;
  studentRewrite: string | null;
  variablesDraft: Partial<IdeaVariablesLite>;
  savedIdea: Idea | null;
  isWaitingForResponse: boolean;
  isOffline: boolean;
  error: string | null;
}

export type ChatAction =
  | {
      type: 'STUDENT_SEND_MESSAGE';
      content: string;
    }
  | {
      type: 'COACH_RESPONSE_SUCCESS';
      response: {
        content: string;
        tier: CoachingTier;
        aspect?: CoachAspect | 'completed';
        lenses?: string[];
        examples?: string[];
      };
    }
  | {
      type: 'COACH_RESPONSE_FAILURE';
      error?: string;
    }
  | {
      type: 'REQUEST_TIER';
      tier: CoachingTier;
    }
  | {
      type: 'SUBMIT_REWRITE';
      rewrittenText: string;
    }
  | {
      type: 'SET_VARIABLES';
      variables: IdeaVariablesLite;
    }
  | {
      type: 'FINALIZE_IDEA';
      learnerId: string;
    };

/**
 * Returns whether all 4 aspects (problem, objective, methodology, measurement) have been covered.
 */
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

/**
 * Pure helper enforcing ADR 0002 progressive tier locking:
 * - Tier 1: always unlocked
 * - Tier 2: unlocked if Tier 1 was shown/used
 * - Tier 3: unlocked ONLY if both Tier 1 and Tier 2 have been shown/used!
 */
export function canRequestTier(
  state: Pick<ChatState, 'unlockedTiers' | 'messages'>,
  requestedTier: CoachingTier
): { allowed: boolean; reasonTh?: string } {
  if (requestedTier === 1) {
    return { allowed: true };
  }

  const hasUsedTier1 =
    state.unlockedTiers.includes(1) ||
    state.messages.some((m) => m.role === 'coach' && m.tier === 1);

  if (requestedTier === 2) {
    if (hasUsedTier1) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reasonTh: 'กรุณาลองตอบคำถามชวนคิดระดับ 1 ก่อนขอคำใบ้',
    };
  }

  // requestedTier === 3
  const hasUsedTier2 =
    state.unlockedTiers.includes(2) ||
    state.messages.some((m) => m.role === 'coach' && m.tier === 2);

  if (hasUsedTier1 && hasUsedTier2) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reasonTh:
      'ปุ่มคิดไม่ออกจริงๆ จะปลดล็อกหลังจากได้ลองตอบระดับ 1 และขอคำใบ้ระดับ 2 แล้วเท่านั้น',
  };
}

/**
 * Pure helper for Tier 3 Rewrite Gate.
 * Enforces:
 * 1. Minimum 15 characters
 * 2. Not a verbatim or near-verbatim copy of the example (>65% character 3-gram Dice similarity)
 */
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

/**
 * Initializes the ChatState from either Discovery Track (with TopicCard) or Idea Track.
 */
export function createInitialChatState(init: {
  track: Track;
  topicCard?: TopicCard | null;
  gradeLevel?: GradeLevel;
  goal?: Goal;
}): ChatState {
  const track = init.track;
  const topicCard = init.topicCard ?? null;
  const gradeLevel = init.gradeLevel ?? 'm_ton';
  const goal = init.goal ?? 'curiosity';

  let openingContent: string;
  if (topicCard) {
    openingContent = `สวัสดีครับ! ยินดีที่ได้ร่วมพัฒนาโครงงานเรื่อง "${topicCard.title}" นะครับ จากปรากฏการณ์ "${topicCard.phenomenon}" ลองสังเกตปัญหาในชีวิตประจำวันหรือชุมชนรอบตัว มีปัญหาหรือจุดติดขัดอะไรที่พบบ่อยและอยากแก้ไขมากที่สุดครับ?`;
  } else {
    openingContent =
      'สวัสดีครับ! ยินดีต้อนรับสู่ Idea Track ครับ ลองเล่าให้ครูฟังหน่อยครับว่าคุณสังเกตเห็นปัญหาหรือมีเรื่องอะไรที่สงสัยและอยากพัฒนาเป็นโครงงานบ้างครับ?';
  }

  const initialMessage: ChatMessage = {
    id: `msg_init_${Date.now()}`,
    role: 'coach',
    content: openingContent,
    tier: 1,
    aspect: 'problem',
    timestamp: new Date().toISOString(),
  };

  return {
    track,
    topicCard,
    gradeLevel,
    goal,
    messages: [initialMessage],
    questionCount: 0,
    aspectProgress: {
      problem: false,
      objective: false,
      methodology: false,
      measurement: false,
    },
    unlockedTiers: [1],
    currentTier: 1,
    phase: 'chatting',
    pendingTier3Example: null,
    studentRewrite: null,
    variablesDraft: {},
    savedIdea: null,
    isWaitingForResponse: false,
    isOffline: false,
    error: null,
  };
}

/**
 * Builds an Idea object from the ChatState and saves to store.
 */
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
    state.topicCard?.title ||
    state.messages.find((m) => m.role === 'student')?.content.slice(0, 80) ||
    'โครงงานที่พัฒนาผ่าน Socratic Advisor';

  const studentResponses = state.messages
    .filter((m) => m.role === 'student')
    .map((m) => m.content);

  const description =
    studentResponses.length > 0
      ? studentResponses.join('\n\n')
      : state.topicCard?.curiosityHook || 'โครงงานที่พัฒนาผ่านการสนทนากับครูที่ปรึกษา AI';

  const idea: Idea = {
    id: `idea_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    learnerId: params.learnerId,
    title,
    description,
    source: state.track,
    sourceTopicCardId: state.topicCard?.id,
    gradeLevel: params.gradeLevel,
    goal: params.goal,
    variables: state.variablesDraft as IdeaVariablesLite | undefined,
    usedTier3Example: Boolean(state.pendingTier3Example || state.studentRewrite),
    tier3Rewrite: state.studentRewrite ?? undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const parsed = IdeaSchema.parse(idea);
  return parsed;
}

/**
 * Pure state reducer for Socratic Advisor chat.
 */
export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'STUDENT_SEND_MESSAGE': {
      const studentMsg: ChatMessage = {
        id: `msg_stu_${Date.now()}_${state.messages.length}`,
        role: 'student',
        content: action.content.trim(),
        timestamp: new Date().toISOString(),
      };

      return {
        ...state,
        messages: [...state.messages, studentMsg],
        isWaitingForResponse: true,
        error: null,
      };
    }

    case 'COACH_RESPONSE_SUCCESS': {
      const resp = action.response;
      const coachMsg: ChatMessage = {
        id: `msg_coach_${Date.now()}_${state.messages.length}`,
        role: 'coach',
        content: resp.content,
        tier: resp.tier,
        aspect: resp.aspect === 'completed' ? undefined : resp.aspect,
        lenses: resp.lenses,
        examples: resp.examples,
        timestamp: new Date().toISOString(),
      };

      const newUnlockedTiers = state.unlockedTiers.includes(resp.tier)
        ? state.unlockedTiers
        : [...state.unlockedTiers, resp.tier].sort((a, b) => a - b);

      // Advance aspect progress: mark previous or current aspect covered
      const updatedProgress: CoachAspectProgress = { ...state.aspectProgress };
      if (resp.aspect && resp.aspect !== 'completed') {
        // Mark the aspect as worked on
        updatedProgress[resp.aspect] = true;
      }

      // Check if the previous message had an aspect
      const lastCoachMsg = [...state.messages]
        .reverse()
        .find((m) => m.role === 'coach' && m.aspect);
      if (lastCoachMsg && lastCoachMsg.aspect) {
        updatedProgress[lastCoachMsg.aspect] = true;
      }

      const nextQuestionCount = state.questionCount + 1;
      const allComplete = areAllAspectsCovered(updatedProgress);

      // Check Tier 3 rewrite gate
      if (resp.tier === 3 && resp.examples && resp.examples.length > 0) {
        return {
          ...state,
          messages: [...state.messages, coachMsg],
          questionCount: nextQuestionCount,
          aspectProgress: updatedProgress,
          unlockedTiers: newUnlockedTiers,
          currentTier: resp.tier,
          phase: 'rewrite',
          pendingTier3Example: resp.examples[0],
          isWaitingForResponse: false,
          error: null,
        };
      }

      // Check completion: all 4 aspects covered OR reached 8 questions
      const nextPhase: ChatPhase =
        allComplete || nextQuestionCount >= 8 ? 'variables' : 'chatting';

      return {
        ...state,
        messages: [...state.messages, coachMsg],
        questionCount: nextQuestionCount,
        aspectProgress: updatedProgress,
        unlockedTiers: newUnlockedTiers,
        currentTier: resp.tier,
        phase: nextPhase,
        isWaitingForResponse: false,
        error: null,
      };
    }

    case 'COACH_RESPONSE_FAILURE': {
      // Advance aspect progress from student's answer to the previous coach question
      const updatedProgress: CoachAspectProgress = { ...state.aspectProgress };
      const lastCoach = [...state.messages]
        .reverse()
        .find((m) => m.role === 'coach' && m.aspect);
      if (lastCoach && lastCoach.aspect) {
        updatedProgress[lastCoach.aspect] = true;
      }

      // Deterministic offline fallback for the next unfilled aspect
      const targetAspect = getNextUnfilledAspect(updatedProgress);
      const fallbackPromptData = FALLBACK_PROMPTS[targetAspect];

      let fallbackContent: string;
      let fallbackLenses: string[] | undefined;
      let fallbackExamples: string[] | undefined;

      if (state.currentTier === 1) {
        fallbackContent = fallbackPromptData.tier1;
      } else if (state.currentTier === 2) {
        fallbackContent = fallbackPromptData.tier2.content;
        fallbackLenses = fallbackPromptData.tier2.lenses;
      } else {
        fallbackContent = fallbackPromptData.tier3.content;
        fallbackExamples = fallbackPromptData.tier3.examples;
      }

      const fallbackMsg: ChatMessage = {
        id: `msg_fallback_${Date.now()}_${state.messages.length}`,
        role: 'coach',
        content: fallbackContent,
        tier: state.currentTier,
        aspect: targetAspect,
        lenses: fallbackLenses,
        examples: fallbackExamples,
        timestamp: new Date().toISOString(),
      };

      const nextQuestionCount = state.questionCount + 1;
      const allComplete = areAllAspectsCovered(updatedProgress);

      if (state.currentTier === 3 && fallbackExamples && fallbackExamples.length > 0) {
        return {
          ...state,
          messages: [...state.messages, fallbackMsg],
          questionCount: nextQuestionCount,
          aspectProgress: updatedProgress,
          phase: 'rewrite',
          pendingTier3Example: fallbackExamples[0],
          isWaitingForResponse: false,
          isOffline: true,
          error: action.error ?? 'AI offline: switching to deterministic guidance',
        };
      }

      const nextPhase: ChatPhase =
        allComplete || nextQuestionCount >= 8 ? 'variables' : 'chatting';

      return {
        ...state,
        messages: [...state.messages, fallbackMsg],
        questionCount: nextQuestionCount,
        aspectProgress: updatedProgress,
        phase: nextPhase,
        isWaitingForResponse: false,
        isOffline: true,
        error: action.error ?? 'AI offline: switching to deterministic guidance',
      };
    }

    case 'REQUEST_TIER': {
      const check = canRequestTier(state, action.tier);
      if (!check.allowed) {
        return {
          ...state,
          error: check.reasonTh ?? 'ไม่สามารถเลือกระดับนี้ได้ในขณะนี้',
        };
      }
      return {
        ...state,
        currentTier: action.tier,
        error: null,
      };
    }

    case 'SUBMIT_REWRITE': {
      if (state.phase !== 'rewrite') {
        return state;
      }

      const example = state.pendingTier3Example ?? '';
      const check = isRewriteAcceptable(example, action.rewrittenText);
      if (!check.acceptable) {
        return {
          ...state,
          error: check.reasonTh ?? 'ข้อความยังไม่ผ่านเกณฑ์การเขียนใหม่',
        };
      }

      const studentMsg: ChatMessage = {
        id: `msg_rewrite_${Date.now()}`,
        role: 'student',
        content: action.rewrittenText.trim(),
        timestamp: new Date().toISOString(),
      };

      const allComplete = areAllAspectsCovered(state.aspectProgress);
      const nextPhase: ChatPhase =
        allComplete || state.questionCount >= 8 ? 'variables' : 'chatting';

      return {
        ...state,
        messages: [...state.messages, studentMsg],
        studentRewrite: action.rewrittenText.trim(),
        phase: nextPhase,
        error: null,
      };
    }

    case 'SET_VARIABLES': {
      const validation = validateVariablesLite(action.variables);
      if (!validation.valid) {
        return {
          ...state,
          error: 'กรุณากรอกข้อมูลตัวแปรให้ครบถ้วนและถูกต้อง',
        };
      }

      return {
        ...state,
        variablesDraft: action.variables,
        error: null,
      };
    }

    case 'FINALIZE_IDEA': {
      const idea = buildIdeaFromChat(state, {
        learnerId: action.learnerId,
        goal: state.goal,
        gradeLevel: state.gradeLevel,
      });

      saveIdea(idea);

      return {
        ...state,
        savedIdea: idea,
        phase: 'done',
        error: null,
      };
    }

    default:
      return state;
  }
}
