// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { encodeSharePayload, decodeSharePayload } from '@/lib/export/share-link';
import { exportFixture } from '../fixtures/export';

describe('read-only share document codec', () => {
  it('preserves the explicit presentation-template opt-in while keeping old links unchanged', async () => {
    const output = await decodeSharePayload(await encodeSharePayload({ ...exportFixture, includeTemplates: true }));
    expect(output.includeTemplates).toBe(true);
    expect(await decodeSharePayload(await encodeSharePayload(exportFixture))).not.toHaveProperty('includeTemplates');
  });
  it('refuses an oversized Proposal before compression even if it compresses well', async () => {
    const input = structuredClone(exportFixture);
    input.proposal.methodology = 'ก'.repeat(100_000);
    await expect(encodeSharePayload(input)).rejects.toThrow('ใหญ่เกิน');
  });

  it('rejects too-long tokens on both encode and decode', async () => {
    const { randomBytes } = await import('node:crypto');
    const input = structuredClone(exportFixture);
    input.proposal.methodology = randomBytes(20_000).toString('hex');
    await expect(encodeSharePayload(input)).rejects.toThrow('ใหญ่เกิน');
    await expect(decodeSharePayload('A'.repeat(12_001))).rejects.toThrow('ใหญ่เกิน');
  });

  it('bounds decompressed bytes so a small hostile gzip cannot expand without limit', async () => {
    const { gzipSync } = await import('node:zlib');
    const token = gzipSync(' '.repeat(1_000_000)).toString('base64url');
    await expect(decodeSharePayload(token)).rejects.toThrow('ใหญ่เกิน');
  });

  it('rejects corrupted, non-canonical, missing, and unsupported-version documents', async () => {
    const { gzipSync } = await import('node:zlib');
    const valid = await encodeSharePayload(exportFixture);
    for (const token of ['', 'not-a-gzip', ` ${valid}`, gzipSync('{}').toString('base64url'),
      gzipSync(JSON.stringify({ version: 2, ...exportFixture })).toString('base64url')]) {
      await expect(decodeSharePayload(token)).rejects.toThrow();
    }
  });

  it('exports only document fields, never identity or conversation state', async () => {
    const input = { ...exportFixture, learnerId: 'private-learner', interview: { realName: 'not-for-export' },
      proposal: { ...exportFixture.proposal, school: 'private-school' } };
    const decoded = await decodeSharePayload(await encodeSharePayload(input));
    expect(decoded).toEqual({ version: 1, ...exportFixture });
    expect(JSON.stringify(decoded)).not.toContain('private');
  });

  it('round-trips Thai Proposal and Plan without mutating the source', async () => {
    const before = structuredClone(exportFixture);
    const token = await encodeSharePayload(exportFixture);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(await decodeSharePayload(token)).toEqual({ version: 1, ...before });
    expect(exportFixture).toEqual(before);
  });
});
