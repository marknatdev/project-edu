import type { Idea } from '@/types/domain';
import { createHash } from 'node:crypto';

/** Synthetic learner idea. Never real learner data. */
export function ideaFixture(overrides: Partial<Idea> = {}): Idea {
  return {
    id: 'idea-repairs-01',
    learnerId: 'learner-client-chosen',
    title: 'ไบโอพลาสติกจากเปลือกทุเรียน',
    description: 'ทดสอบความแข็งแรงของฟิล์มไบโอพลาสติกจากเปลือกทุเรียนเพื่อลดขยะบรรจุภัณฑ์',
    goal: 'ysc',
    gradeLevel: 'm_plai',
    source: 'idea_track',
    createdAt: '2026-11-05T10:00:00.000Z',
    updatedAt: '2026-11-05T10:00:00.000Z',
    ...overrides,
  };
}

type Handler = (req: Request) => Promise<Response>;
/** One browser cookie jar against real route handlers (no shared identity). */
export function cookieJar(origin = 'http://localhost') {
  let cookie = '';
  const self = {
    get cookie() { return cookie; },
    set cookie(value: string) { cookie = value; },
    async send(handler: Handler, path: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) {
      const headers: Record<string, string> = { cookie, ...(init.headers ?? {}) };
      // Synthetic account fixtures send the verified account workspace scope (ADR 0003).
      const session = /sb-[^=]+-auth-token=base64-([^;]+)/.exec(cookie)?.[1];
      if (session) {
        const id = JSON.parse(Buffer.from(session, 'base64url').toString()).user.id;
        headers['x-edu-workspace'] ??= 'account:' + createHash('sha256').update('u:' + id).digest('hex');
      }
      if (origin.startsWith('https:')) headers.origin = origin;
      if (init.body !== undefined) headers['Content-Type'] = 'application/json';
      const response = await handler(new Request(origin + path, { method: init.method ?? 'POST', headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body) }));
      const set = response.headers.get('set-cookie');
      if (set && /edu-coaching-owner=[^;]+/.test(set) && !/Max-Age=0/i.test(set)) cookie = set.split(';')[0];
      // Arbitrary HTTP response shape: each test asserts the public contract it uses.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { status: response.status, set, data: await response.json() as Record<string, any> };
    },
  };
  return self;
}
