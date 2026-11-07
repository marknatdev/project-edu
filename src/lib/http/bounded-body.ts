/** Byte budgets apply before decoding/JSON validation, never after buffering.
 * A length header may reject early but can never authorize additional bytes. */
export class BodyLimitError extends Error {}
export async function boundedText(message: Pick<Request, 'body' | 'headers'>, maxBytes: number): Promise<string> {
  const length = message.headers.get('content-length');
  if (length && /^\d+$/.test(length) && Number(length) > maxBytes) {
    void message.body?.cancel().catch(() => {});
    throw new BodyLimitError('TOO_LARGE');
  }
  if (!message.body) return '';
  const reader = message.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const parts: string[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) throw new BodyLimitError('TOO_LARGE');
      parts.push(decoder.decode(value, { stream: true }));
    }
    parts.push(decoder.decode());
    return parts.join('');
  } catch (e) {
    // Do not await a hostile source's cancellation promise.
    void reader.cancel().catch(() => {});
    throw e;
  } finally { reader.releaseLock(); }
}
