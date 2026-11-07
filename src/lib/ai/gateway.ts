/**
 * OpenAI-compatible AI gateway for Project Edu
 * Implements ADR 0001 (OpenAI-compatible gateway, dev OmniRoute)
 *
 * Two entry points:
 * - `callAiStrict` — fresh generation (Discovery starter cards). NEVER returns
 *   substitute data: any unconfigured/unreachable/invalid outcome is a typed
 *   failure so callers can tell the learner the truth.
 * - `callAiGateway` — other features keep their documented deterministic
 *   offline fallback, built on the same strict call.
 *
 * Logging: only reason codes / HTTP status. Never the prompt, the model output,
 * the upstream error body (it can echo the learner's text) or the API key.
 */

import { z } from 'zod';
import { boundedText, BodyLimitError } from '@/lib/http/bounded-body';
import { isIP } from 'node:net';

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
  let isConfigured = Boolean(baseUrl && apiKey && model);
  if (isConfigured && (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1')) {
    try {
      const url = new URL(baseUrl);
      const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase().replace(/\.$/, '');
      // Production requires an operator-configured public HTTPS provider.
      // No dev gateway, literal IP, URL credentials or local-only hostname.
      isConfigured = url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash
        && host.includes('.') && !isIP(host) && !/(?:^|\.)(?:localhost|local|internal)$/.test(host);
    } catch { isConfigured = false; }
  }

  return {
    isConfigured,
    baseUrl,
    apiKey,
    model,
  };
}

export type AiFailureReason =
  | 'unconfigured'
  | 'upstream_http'
  | 'network'
  | 'timeout'
  | 'empty'
  | 'malformed_json'
  | 'schema'
  | 'too_large';

export interface StrictCallOptions<T> {
  schema: z.ZodType<T>;
  prompt: string;
  systemPrompt?: string;
  timeoutMs?: number;
  temperature?: number;
  /** Upper bound sent to the provider as `max_tokens`. */
  maxTokens?: number;
  /** Model message content larger than this is rejected unparsed. */
  maxContentBytes?: number;
}

export type StrictCallResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: AiFailureReason; status?: number; error?: string };

function failure(reason: AiFailureReason, error: string, status?: number): { ok: false; reason: AiFailureReason; status?: number; error: string } {
  // Reason code + status only: no prompt/output/upstream body/key in logs.
  console.warn(`[AiGateway] ${reason}${status ? ` (HTTP ${status})` : ''}`);
  return status === undefined ? { ok: false, reason, error } : { ok: false, reason, status, error };
}

/** Calls an OpenAI-compatible /chat/completions endpoint in JSON mode; no fallback. */
export async function callAiStrict<T>(options: StrictCallOptions<T>): Promise<StrictCallResult<T>> {
  const config = getAiConfig();
  if (!config.isConfigured) return { ok: false, reason: 'unconfigured' };

  const timeoutMs = options.timeoutMs ?? 15000;
  const maxContentBytes = options.maxContentBytes ?? 262_144;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const messages = [
      ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
      { role: 'user', content: options.prompt },
    ];
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      redirect: 'error', // never forward provider credentials to another origin
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: options.temperature ?? 0.7,
        response_format: { type: 'json_object' },
        max_tokens: options.maxTokens ?? 2000,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      return failure('upstream_http', `HTTP ${response.status}`, response.status);
    }

    // Minimal Response-likes (tests/other fetch shims) may expose only json().
    const raw = response.body !== undefined ? await boundedText(response, maxContentBytes * 2) : JSON.stringify(await response.json());
    if (Buffer.byteLength(raw, 'utf8') > maxContentBytes * 2) return failure('too_large', 'Response too large');
    let payload: { choices?: Array<{ message?: { content?: unknown } }> };
    try { payload = JSON.parse(raw); } catch { return failure('malformed_json', 'Malformed JSON in model output'); }

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) return failure('empty', 'Empty response content');
    if (Buffer.byteLength(content, 'utf8') > maxContentBytes) return failure('too_large', 'Model output too large');

    let parsedJson: unknown;
    try { parsedJson = JSON.parse(content); } catch { return failure('malformed_json', 'Malformed JSON in model output'); }

    const validation = options.schema.safeParse(parsedJson);
    if (!validation.success) return failure('schema', 'Zod validation failed');
    return { ok: true, data: validation.data };
  } catch (err: unknown) {
    if (err instanceof BodyLimitError) { controller.abort(); return failure('too_large', 'Response too large'); }
    const isAbort = err instanceof Error && (err.name === 'AbortError' || err.message.includes('aborted'));
    if (isAbort) return failure('timeout', `Timeout after ${timeoutMs}ms`);
    return failure('network', err instanceof Error ? err.message : String(err));
  } finally {
    clearTimeout(timeoutId);
  }
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
 * Features with a documented offline mode (coaching, evaluation, pivot,
 * proposal). If unconfigured, or if any error occurs, returns the deterministic
 * fallback labelled `source: 'fallback'`. NOT used for fresh Discovery cards.
 */
export async function callAiGateway<T>(options: GatewayCallOptions<T>): Promise<GatewayCallResult<T>> {
  const result = await callAiStrict(options);
  if (result.ok) return { source: 'ai', data: result.data };
  const data = await options.fallback();
  return result.error === undefined ? { source: 'fallback', data } : { source: 'fallback', data, error: result.error };
}
