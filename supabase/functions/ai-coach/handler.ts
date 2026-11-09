// Pure request handler for the mobile AI coach proxy. No Deno globals here, so it runs under Vitest.
// The OmniRoute key, base URL, model and system prompts live only on the server.

export type CoachUser = { id: string; isAnonymous: boolean };

export type CoachDeps = {
  getUser: (accessToken: string) => Promise<CoachUser | null>;
  admit: (ownerKey: string) => Promise<boolean>;
  fetchImpl: typeof fetch;
  env: { baseUrl: string; apiKey: string; model: string };
};

const LIMITS = { historyMessages: 20, historyChars: 4000, messageChars: 2000, maxTokens: 800 };

export const SYSTEM_PROMPTS = {
  socratic: `คุณคือ "AI Socratic Research Coach" ของแพลตฟอร์ม Project Edu
หน้าที่: ช่วยนักเรียนมัธยมพัฒนาโครงงานวิทยาศาสตร์ คอมพิวเตอร์ และนวัตกรรม (YSC, ISEF, สพฐ.)

กฎเหล็กสำคัญที่สุด:
1. ตอบสั้น กระชับ ตรงประเด็นมากที่สุด (เนื้อหาไม่เกิน 2-4 บรรทัด) ห้ามเกริ่นนำ ห้ามพูดยืดยาว
2. ให้มุมมองทางวิทยาศาสตร์ที่เฉียบคม ท้าทายตัวแปร หรือให้คำแนะนำตรงจุด
3. จบท้ายข้อความทุกครั้งด้วย [USER_ASK] เพื่อให้คำถามเจาะจงและตัวเลือกให้นักเรียนกดตอบได้ทันที:

[USER_ASK]
คำถาม: <คำถามกระชับ 1 ข้อเพื่อให้ผู้ใช้คิดหรือตัดสินใจ>
ตัวเลือก:
- <ตัวเลือกที่ 1 สั้นๆ>
- <ตัวเลือกที่ 2 สั้นๆ>
- <ตัวเลือกที่ 3 สั้นๆ>
[/USER_ASK]
`,
  src: `คุณคือ "คณะกรรมการความปลอดภัย SRC/ISEF" ของ Project Edu
หน้าที่: ตรวจสอบความเสี่ยงแล็บ สารเคมี ชีวภาพ และจริยธรรมโครงงานเยาวชน

กฎเหล็กสำคัญที่สุด:
1. ตอบสั้น กระชับ ชี้ความเสี่ยงหรือทางเลือกปลอดภัยใน 2-3 บรรทัดเท่านั้น ห้ามตอบยาว
2. จบท้ายข้อความทุกครั้งด้วย [USER_ASK] เพื่อถามยืนยันความปลอดภัยในแล็บ:

[USER_ASK]
คำถาม: <คำถามสั้นๆ ตรวจสอบความปลอดภัยห้องแล็บหรืออุปกรณ์>
ตัวเลือก:
- <ตัวเลือกที่ 1: มีครูดูแลและห้องแล็บควบคุม>
- <ตัวเลือกที่ 2: เปลี่ยนไปใช้วัสดุ/สารทดแทนที่ปลอดภัย 100%>
- <ตัวเลือกที่ 3: ใช้การจำลองด้วยคอมพิวเตอร์แทน>
[/USER_ASK]
`,
} as const;

type Turn = { role: 'user' | 'assistant'; content: string };
type CoachRequest = { mode: keyof typeof SYSTEM_PROMPTS; history: Turn[]; message: string };

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

const fail = (status: number, error: string, messageTh: string) => json(status, { error, messageTh });

function parseBody(raw: unknown): CoachRequest | null {
  if (!raw || typeof raw !== 'object') return null;
  const { mode, history, message } = raw as Record<string, unknown>;
  if (mode !== 'socratic' && mode !== 'src') return null;
  if (typeof message !== 'string' || !message.trim() || message.length > LIMITS.messageChars) return null;
  if (!Array.isArray(history) || history.length > LIMITS.historyMessages) return null;
  const turns: Turn[] = [];
  for (const t of history) {
    if (!t || typeof t !== 'object') return null;
    const { role, content } = t as Record<string, unknown>;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string' || content.length > LIMITS.historyChars) return null;
    turns.push({ role, content });
  }
  return { mode, history: turns, message: message.trim() };
}

export function createHandler(deps: CoachDeps) {
  return async (req: Request): Promise<Response> => {
    if (req.method !== 'POST') return fail(405, 'METHOD_NOT_ALLOWED', 'ใช้ได้เฉพาะ POST');

    const token = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    const user = token ? await deps.getUser(token).catch(() => null) : null;
    // Login is required: no token, invalid token, or a Supabase anonymous user are all rejected.
    if (!user || user.isAnonymous) return fail(401, 'AUTH_REQUIRED', 'ต้องเข้าสู่ระบบด้วย Google ก่อนใช้ AI Coach');

    let body: CoachRequest | null = null;
    try {
      body = parseBody(await req.json());
    } catch {
      body = null;
    }
    if (!body) return fail(400, 'INVALID_REQUEST', 'รูปแบบคำขอไม่ถูกต้อง');

    if (!(await deps.admit(`u:${user.id}`).catch(() => false))) {
      return fail(429, 'RATE_LIMITED', 'ส่งคำถามถี่เกินไป รอสักครู่แล้วลองใหม่');
    }

    let upstream: Response;
    try {
      upstream = await deps.fetchImpl(`${deps.env.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { authorization: `Bearer ${deps.env.apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model: deps.env.model,
          max_tokens: LIMITS.maxTokens,
          messages: [
            { role: 'system', content: SYSTEM_PROMPTS[body.mode] },
            ...body.history,
            { role: 'user', content: body.message },
          ],
        }),
        signal: AbortSignal.timeout(25_000),
      });
    } catch {
      console.warn('ai-coach upstream_unreachable');
      return fail(502, 'AI_UNAVAILABLE', 'AI Coach ไม่พร้อมใช้งานชั่วคราว');
    }
    if (!upstream.ok) {
      // Log only the status, never the upstream body, prompt or key.
      console.warn(`ai-coach upstream_status ${upstream.status}`);
      return fail(502, 'AI_UNAVAILABLE', 'AI Coach ไม่พร้อมใช้งานชั่วคราว');
    }
    const data = await upstream.json().catch(() => null);
    const reply = data?.choices?.[0]?.message?.content;
    if (typeof reply !== 'string' || !reply.trim()) {
      console.warn('ai-coach upstream_empty');
      return fail(502, 'AI_UNAVAILABLE', 'AI Coach ไม่พร้อมใช้งานชั่วคราว');
    }
    return json(200, { reply });
  };
}
