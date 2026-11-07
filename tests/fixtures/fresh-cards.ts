import { vi } from 'vitest';

/**
 * TEST FIXTURE — MOCKED OpenAI-compatible upstream. Responses are hand-written
 * sample candidates, NOT real model output and NOT live AI evidence.
 */
export interface UpstreamCall { prompt: string; system: string; body: Record<string, unknown> }

export function mockUpstream(respond: (call: UpstreamCall, index: number) => unknown, options: { delayMs?: number } = {}) {
  const calls: UpstreamCall[] = [];
  const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { messages: Array<{ role: string; content: string }> } & Record<string, unknown>;
    const call = { body, system: body.messages.find(m => m.role === 'system')?.content ?? '', prompt: body.messages.find(m => m.role === 'user')?.content ?? '' };
    calls.push(call);
    if (options.delayMs) await new Promise<void>((ok, fail) => {
      // Like real fetch: an aborted request rejects with AbortError.
      const timer = setTimeout(ok, options.delayMs);
      init?.signal?.addEventListener('abort', () => { clearTimeout(timer); fail(Object.assign(new Error('aborted'), { name: 'AbortError' })); });
    });
    const content = respond(call, calls.length - 1);
    if (content instanceof Response) return content;
    return new Response(JSON.stringify({ choices: [{ message: { content: typeof content === 'string' ? content : JSON.stringify(content) } }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { calls, fetchMock };
}

export function candidate(overrides: Record<string, unknown> = {}) {
  return {
    title: 'ตัวกรองน้ำตู้ปลาจากวัสดุเหลือใช้',
    problem: 'น้ำในตู้ปลาขุ่นเร็วและต้องเปลี่ยนน้ำบ่อย',
    roughDirection: 'ลองเปรียบเทียบวัสดุกรองราคาถูก 3 แบบ แล้ววัดความขุ่นด้วยกล้องมือถือทุกวัน',
    interestLink: 'ต่อยอดจากความชอบดูแลตู้ปลา',
    subfieldId: 'sci_environment',
    difficulty: 'beginner',
    estimatedWeeks: 5,
    estimatedBudgetBaht: 250,
    requiredEquipment: ['ขวดพลาสติก', 'มือถือ'],
    minTeamSize: 1,
    maxTeamSize: 3,
    requiredSkills: ['การสังเกต'],
    fitNotes: ['ใช้งบไม่เกิน 300 บาท', 'ใช้มือถือที่มีอยู่แล้ว'],
    safetyConcerns: [],
    ...overrides,
  };
}

const POOL: Array<[string, string, string]> = [
  ['ตัวกรองน้ำตู้ปลาจากวัสดุเหลือใช้', 'น้ำในตู้ปลาขุ่นเร็วและต้องเปลี่ยนน้ำบ่อย', 'เปรียบเทียบวัสดุกรอง 3 แบบ วัดความขุ่นด้วยภาพถ่าย'],
  ['แอปจดบันทึกการให้อาหารสัตว์เลี้ยง', 'ลืมว่าให้อาหารไปแล้วหรือยังจนให้ซ้ำ', 'ออกแบบหน้าจอบันทึกง่าย ๆ แล้วทดลองใช้กับเพื่อน 1 สัปดาห์'],
  ['ไฟกลางคืนเปิดอัตโนมัติจากแสงรอบข้าง', 'ทางเดินหน้าบ้านมืดและเปิดไฟค้างทั้งคืน', 'ใช้เซนเซอร์แสงราคาถูก ทดลองตั้งค่าความไวหลายระดับ'],
  ['ป้ายเตือนพื้นเปียกแบบพับได้จากกระดาษลัง', 'ห้องน้ำโรงเรียนลื่นแต่ไม่มีป้ายเตือน', 'ทดสอบความแข็งแรงของโครงกระดาษลังหลายแบบ'],
  ['สถิติเวลารอรถสองแถวหน้าโรงเรียน', 'ไม่รู้ว่าควรออกจากบ้านกี่โมงจึงไม่ต้องรอนาน', 'เก็บข้อมูลเวลารถมาถึง 2 สัปดาห์ แล้วหาค่าเฉลี่ยและการกระจาย'],
  ['กระถางรดน้ำเองด้วยไส้ตะเกียง', 'ต้นไม้ในห้องเรียนเหี่ยวช่วงวันหยุด', 'เทียบวัสดุไส้ตะเกียง 3 ชนิด วัดความชื้นดินทุกวัน'],
  ['เกมทายคำศัพท์วิทยาศาสตร์บนกระดาษ', 'จำคำศัพท์วิทยาศาสตร์ภาษาอังกฤษไม่ได้', 'ออกแบบกติกาเกมแล้วทดสอบคะแนนก่อนและหลังเล่น'],
  ['ที่บังแดดหน้าต่างจากกล่องนม', 'ห้องเรียนฝั่งตะวันตกร้อนตอนบ่าย', 'วัดอุณหภูมิหลังติดที่บังแดดเทียบกับไม่ติด'],
];
export function distinctCandidates(n: number, offset = 0) {
  return Array.from({ length: n }, (_, i) => {
    const [title, problem, roughDirection] = POOL[(i + offset) % POOL.length];
    return candidate({ title, problem, roughDirection });
  });
}

/** Synthetic, mutually distinct candidates (random Thai letters) for quota
 * tests where repeat-screening must not be the limiting factor. */
const THAI = 'กขคงจฉชซญดตถทธนบปผพฟภมยรลวศสหอฮ';
const randomThai = (n: number) => Array.from({ length: n }, () => THAI[Math.floor(Math.random() * THAI.length)]).join('');
export function syntheticDistinct(n: number) {
  return Array.from({ length: n }, () => candidate({ title: `ไอเดีย${randomThai(14)}`, problem: `ปัญหา${randomThai(18)}`, roughDirection: `ทดลอง${randomThai(18)}` }));
}
