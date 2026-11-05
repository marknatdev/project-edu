/**
 * Client-side communication helper for Socratic Advisor AI Gateway endpoint.
 * Calls /api/ai/coach per ADR 0001 (Stateless Gateway) & ADR 0002 (Socratic Advisor First).
 */

import type { CoachAspect, CoachingTier } from '@/lib/ai/socratic-coach';
import type { GradeLevel } from '@/types/domain';

export interface FetchCoachTurnParams {
  anonymousId: string;
  ideaId?: string;
  requestedTier?: CoachingTier;
  targetAspect?: CoachAspect;
  learnerResponse?: string;
  ideaContext?: {
    title?: string;
    description?: string;
    subfieldId?: string;
    gradeLevel?: GradeLevel;
  };
}

export interface CoachApiResponse {
  success: boolean;
  data?: {
    source: 'ai' | 'fallback';
    tier: CoachingTier;
    aspect: CoachAspect | 'completed';
    content: string;
    lenses?: string[];
    examples?: string[];
  };
  error?: string;
  isOfflineFallback?: boolean;
}

export async function fetchCoachTurn(
  params: FetchCoachTurnParams
): Promise<CoachApiResponse> {
  try {
    const res = await fetch('/api/ai/coach', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const errorJson = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      return {
        success: false,
        error: errorJson.error || `Server responded with status ${res.status}`,
        isOfflineFallback: true,
      };
    }

    const json = (await res.json()) as {
      source: 'ai' | 'fallback';
      tier: CoachingTier;
      aspect: CoachAspect | 'completed';
      content: string;
      lenses?: string[];
      examples?: string[];
    };

    return {
      success: true,
      data: json,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    return {
      success: false,
      error: message,
      isOfflineFallback: true,
    };
  }
}
