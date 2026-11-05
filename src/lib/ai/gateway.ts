/**
 * OpenAI-compatible AI gateway for Project Edu
 * Implements ADR 0001 (OpenAI-compatible gateway, dev OmniRoute)
 * Fail-closed with deterministic offline fallback when unconfigured or failing.
 */

import { z } from 'zod';

export interface AiConfig {
  isConfigured: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
}

/**
 * Reads AI configuration dynamically at call time from process.env.
 * Never cache at module scope so vi.stubEnv works in tests and Next.js does not freeze it.
 */
export function getAiConfig(): AiConfig {
  const rawBaseUrl = process.env.AI_BASE_URL?.trim() || '';
  const apiKey = process.env.AI_API_KEY?.trim() || '';
  const model = process.env.AI_MODEL?.trim() || '';

  // Clean trailing slashes
  const baseUrl = rawBaseUrl.replace(/\/+$/, '');
  const isConfigured = Boolean(baseUrl && apiKey && model);

  return {
    isConfigured,
    baseUrl,
    apiKey,
    model,
  };
}

export interface GatewayCallOptions<T> {
  schema: z.ZodType<T>;
  prompt: string;
  systemPrompt?: string;
  fallback: () => T | Promise<T>;
  timeoutMs?: number;
  temperature?: number;
}

export interface GatewayCallResult<T> {
  source: 'ai' | 'fallback';
  data: T;
  error?: string;
}

/**
 * Invokes an OpenAI-compatible /chat/completions endpoint with JSON output mode.
 * If unconfigured, or if any error occurs (network, non-2xx, timeout, invalid JSON, Zod mismatch),
 * it returns the deterministic offline fallback.
 */
export async function callAiGateway<T>(
  options: GatewayCallOptions<T>
): Promise<GatewayCallResult<T>> {
  const config = getAiConfig();

  if (!config.isConfigured) {
    const data = await options.fallback();
    return {
      source: 'fallback',
      data,
    };
  }

  const timeoutMs = options.timeoutMs ?? 15000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const endpoint = `${config.baseUrl}/chat/completions`;
    const messages = [
      ...(options.systemPrompt
        ? [{ role: 'system', content: options.systemPrompt }]
        : []),
      { role: 'user', content: options.prompt },
    ];

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: options.temperature ?? 0.7,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.warn(
        `[AiGateway] Non-2xx response from AI endpoint (${response.status}): ${errorText}`
      );
      const data = await options.fallback();
      return {
        source: 'fallback',
        data,
        error: `HTTP ${response.status}`,
      };
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    const content = payload?.choices?.[0]?.message?.content;
    if (!content) {
      console.warn('[AiGateway] Missing choice content in AI response');
      const data = await options.fallback();
      return {
        source: 'fallback',
        data,
        error: 'Empty response content',
      };
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(content);
    } catch (parseErr) {
      console.warn('[AiGateway] Failed to parse JSON from AI response:', parseErr);
      const data = await options.fallback();
      return {
        source: 'fallback',
        data,
        error: 'Malformed JSON in model output',
      };
    }

    const validationResult = options.schema.safeParse(parsedJson);
    if (!validationResult.success) {
      console.warn(
        '[AiGateway] Zod schema validation failed on AI output:',
        validationResult.error
      );
      const data = await options.fallback();
      return {
        source: 'fallback',
        data,
        error: 'Zod validation failed',
      };
    }

    return {
      source: 'ai',
      data: validationResult.data,
    };
  } catch (err: unknown) {
    const isAbort =
      err instanceof Error &&
      (err.name === 'AbortError' || err.message.includes('aborted'));
    const errorMessage = isAbort
      ? `Timeout after ${timeoutMs}ms`
      : err instanceof Error
        ? err.message
        : String(err);

    console.warn(`[AiGateway] Call failed: ${errorMessage}`);
    const data = await options.fallback();
    return {
      source: 'fallback',
      data,
      error: errorMessage,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
