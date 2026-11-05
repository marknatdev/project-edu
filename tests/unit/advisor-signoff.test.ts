// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createAdvisorRequest, encodeAdvisorRequest, decodeAdvisorRequest, encodeAdvisorDecision, decodeAdvisorDecision } from '@/lib/advisor-review/codec';
import { beginAdvisorReview, importAdvisorDecision, readAdvisorReview } from '@/lib/advisor-review/review-store';
import { createMemoryStorage, createProject, getProject, updateProjectProposal, wipeAllLearnerData } from '@/lib/storage/store';
import { savePresentationNotes } from '@/lib/presentation/notes-store';
import { exportFixture } from '../fixtures/export';

describe('unauthenticated advisor handoff codec', () => {
  it('imports a decision only for its Project and exact snapshot; edits cannot inherit approval', async () => {
    const storage = createMemoryStorage();
    createProject({ id: 'a', ...exportFixture }, storage);
    createProject({ id: 'b', ...exportFixture }, storage);
    const request = await decodeAdvisorRequest(await beginAdvisorReview('a', storage));
    const code = encodeAdvisorDecision({ version: 1, requestId: request.requestId, fingerprint: request.fingerprint,
      decision: 'approved', comment: 'ตรวจแล้ว', decidedAt: '2026-11-05T00:00:00.000Z' });
    await expect(importAdvisorDecision('b', code, storage)).rejects.toThrow('โครงงาน');
    await importAdvisorDecision('a', code, storage);
    expect(readAdvisorReview('a', storage)?.decision?.decision).toBe('approved');
    expect(getProject('a', storage)?.status).toBe('in_progress');
    updateProjectProposal('a', { ...exportFixture.proposal, hypothesis: 'แก้สมมติฐานแล้ว' }, storage);
    await expect(importAdvisorDecision('a', code, storage)).rejects.toThrow('เปลี่ยน');
    wipeAllLearnerData(storage);
    expect(readAdvisorReview('a', storage)).toBeNull();
  });
  it('rejects an import if the student edits the Project while its checksum is being checked', async () => {
    const storage = createMemoryStorage();
    createProject({ id: 'a', ...exportFixture }, storage);
    const request = await decodeAdvisorRequest(await beginAdvisorReview('a', storage));
    const code = encodeAdvisorDecision({ version: 1, requestId: request.requestId, fingerprint: request.fingerprint,
      decision: 'approved', comment: '', decidedAt: '2026-11-05T00:00:00.000Z' });
    const pending = importAdvisorDecision('a', code, storage);
    updateProjectProposal('a', { ...exportFixture.proposal, hypothesis: 'เปลี่ยนระหว่างตรวจ' }, storage);
    await expect(pending).rejects.toThrow('เปลี่ยน');
    expect(readAdvisorReview('a', storage)?.decision).toBeUndefined();
  });

  it('refuses a revision response with no actionable comment', async () => {
    const request = await createAdvisorRequest(exportFixture);
    expect(() => encodeAdvisorDecision({ version: 1, requestId: request.requestId, fingerprint: request.fingerprint,
      decision: 'revision', comment: '   ', decidedAt: '2026-11-05T00:00:00.000Z' })).toThrow();
  });

  it('binds saved presentation notes too and invalidates older requests even when content is unchanged', async () => {
    const storage = createMemoryStorage();
    createProject({ id: 'a', ...exportFixture }, storage);
    const first = await decodeAdvisorRequest(await beginAdvisorReview('a', storage));
    const decision = (request: typeof first) => encodeAdvisorDecision({ version: 1, requestId: request.requestId, fingerprint: request.fingerprint,
      decision: 'approved', comment: '', decidedAt: '2026-11-05T00:00:00.000Z' });
    const second = await decodeAdvisorRequest(await beginAdvisorReview('a', storage));
    await expect(importAdvisorDecision('a', decision(first), storage)).rejects.toThrow('ล่าสุด');
    savePresentationNotes('a', { role: 'บทบาทใหม่', skills: '', learning: '', targetField: '', results: '' }, storage);
    await expect(importAdvisorDecision('a', decision(second), storage)).rejects.toThrow('เปลี่ยน');
    expect(readAdvisorReview('a', storage)?.decision).toBeUndefined();
  });

  it('rejects tampered snapshots, huge or malformed requests and corrupt return codes', async () => {
    const request = await createAdvisorRequest(exportFixture);
    const valid = await encodeAdvisorRequest(request);
    const parts = valid.split('.');
    parts[1] = '0'.repeat(64);
    for (const bad of ['', 'broken', parts.join('.'), 'a'.repeat(12103)]) await expect(decodeAdvisorRequest(bad)).rejects.toThrow();
    for (const bad of ['', 'not-json', 'A'.repeat(12001), 'https://example.org/other#advisor=x', '<script>']) expect(() => decodeAdvisorDecision(bad)).toThrow();
    const base = { version: 1 as const, requestId: request.requestId, fingerprint: request.fingerprint, decision: 'approved' as const, comment: '', decidedAt: '2026-11-05T00:00:00.000Z' };
    for (const invalid of [{ ...base, version: 2 }, { ...base, comment: 'ก'.repeat(1501) }, { ...base, decision: 'anything' }, { ...base, realName: 'not-allowed' }]) {
      const code = Buffer.from(JSON.stringify(invalid)).toString('base64url');
      expect(() => decodeAdvisorDecision(code)).toThrow();
    }
  });

  it('leaves the pending review unchanged if saving the response fails', async () => {
    const storage = createMemoryStorage();
    createProject({ id: 'a', ...exportFixture }, storage);
    const request = await decodeAdvisorRequest(await beginAdvisorReview('a', storage));
    const code = encodeAdvisorDecision({ version: 1, requestId: request.requestId, fingerprint: request.fingerprint,
      decision: 'approved', comment: '', decidedAt: '2026-11-05T00:00:00.000Z' });
    const failing = { ...storage, setItem: () => { throw new Error('QuotaExceededError'); } };
    await expect(importAdvisorDecision('a', code, failing)).rejects.toThrow('QuotaExceededError');
    expect(readAdvisorReview('a', storage)?.decision).toBeUndefined();
    await importAdvisorDecision('a', code, storage);
    expect(readAdvisorReview('a', storage)?.decision?.decision).toBe('approved');
  });

  it('round-trips a read-only Thai snapshot and teacher decision without learner identity', async () => {
    const input = { ...exportFixture, learnerId: 'private-learner', school: 'private-school' };
    const request = await createAdvisorRequest(input);
    expect(await decodeAdvisorRequest(await encodeAdvisorRequest(request))).toEqual(request);
    expect(JSON.stringify(request)).not.toContain('private');
    const decision = { version: 1 as const, requestId: request.requestId, fingerprint: request.fingerprint,
      decision: 'revision' as const, comment: 'อธิบายชุดควบคุมเพิ่ม', decidedAt: '2026-11-05T00:00:00.000Z' };
    const code = encodeAdvisorDecision(decision);
    expect(decodeAdvisorDecision(code)).toEqual(decision);
    expect(decodeAdvisorDecision(`https://example.org/proposal#advisor=${code}`)).toEqual(decision);
  });
});
