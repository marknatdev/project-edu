import Link from 'next/link';
import { Compass, FileText, MessageCircle, ShieldCheck } from 'lucide-react';
import { AccountButton } from '@/components/auth/AccountAccess';
import { safeNext } from '@/lib/auth/paths';
export const dynamic = 'force-dynamic';
const steps = [
  [Compass, 'ค้นหาหัวข้อด้วยการ์ดไอเดียตั้งต้น', 'ตอบไม่กี่คำถาม แล้วปัดเลือกการ์ดที่สนใจ'],
  [MessageCircle, 'คิดต่อยอดกับครูที่ปรึกษา AI', 'ถามชวนคิดก่อน ไม่คิดไอเดียแทนคุณ'],
  [FileText, 'ได้ข้อเสนอโครงงานและแผนรายสัปดาห์', 'ประเมิน 5 ด้าน แล้วส่งออก PDF/Word'],
] as const;
/** Landing + sign-in (ADR 0003): every app page redirects here until a Google account is verified. */
export default async function AuthPage({ searchParams }: { searchParams: Promise<{ status?: string; next?: string }> }) {
  const { status, next } = await searchParams;
  const messages: Record<string,string> = { cancelled: 'ยกเลิกการเข้าสู่ระบบแล้ว', error: 'เข้าสู่ระบบไม่สำเร็จ รหัสอาจหมดอายุหรือคำขอไม่ถูกต้อง กรุณาลองใหม่', unavailable: 'ยังเชื่อมต่อบัญชีไม่ได้ กรุณาลองใหม่' };
  return <main className="mx-auto grid min-h-screen max-w-5xl items-center gap-10 p-6 md:grid-cols-[1fr_420px]">
    <section className="space-y-5">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg"><Compass className="h-9 w-9" aria-hidden /></div>
      <h1 className="text-3xl font-extrabold leading-tight text-slate-900 font-prompt">เริ่มโครงงานแรกของคุณ กับครูที่ปรึกษาที่ถามชวนคิด</h1>
      <p className="text-slate-600 leading-relaxed">สำหรับนักเรียน ม.ต้น และ ม.ปลาย · วิทยาศาสตร์ คอมพิวเตอร์ คณิตศาสตร์ · ได้ไอเดียที่เป็นของคุณเอง ไม่ใช่โครงงานสำเร็จรูป</p>
      <ul className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        {steps.map(([Icon, title, sub]) => <li key={title} className="flex gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Icon className="h-5 w-5" aria-hidden /></span>
          <span><span className="block font-semibold text-slate-900">{title}</span><span className="block text-sm text-slate-600">{sub}</span></span>
        </li>)}
      </ul>
    </section>
    <section aria-labelledby="signin-heading" className="space-y-4 rounded-3xl bg-white p-6 shadow-lg sm:p-8">
      <h2 id="signin-heading" className="text-xl font-bold text-slate-900">เข้าสู่ระบบเพื่อเริ่ม</h2>
      {status && messages[status] && <p role="status" className="text-sm text-amber-800">{messages[status]}</p>}
      <AccountButton next={safeNext(next)} />
      <p className="flex gap-2 text-sm leading-relaxed text-slate-600"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden />ต้องเข้าสู่ระบบก่อนใช้งาน · แอปใช้บัญชีเพื่อยืนยันตัวตนเท่านั้น ไม่คัดลอกชื่อหรืออีเมลลงโครงงาน และไม่ขอสิทธิ์ Drive หรือ Calendar</p>
      <Link href="/consent" className="block min-h-11 py-3 text-indigo-700 underline">นโยบายความเป็นส่วนตัว (PDPA)</Link>
    </section>
  </main>;
}
