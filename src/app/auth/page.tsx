import Link from 'next/link';
import { Compass } from 'lucide-react';
import { AccountButton } from '@/components/auth/AccountAccess';
import { safeNext } from '@/lib/auth/paths';
export const dynamic = 'force-dynamic';
const steps = [
  ['หาหัวข้อที่สนใจ', 'ตอบคำถามสั้น ๆ หรือเลือกจากการ์ดไอเดีย'],
  ['คุยกับครูที่ปรึกษา', 'ได้คำถามชวนคิดก่อน แล้วจึงได้คำใบ้'],
  ['ได้ข้อเสนอและแผนงาน', 'ส่งออก PDF หรือ Word ให้ครูตรวจ'],
] as const;
const messages: Record<string, string> = {
  cancelled: 'ยกเลิกการเข้าสู่ระบบแล้ว กดปุ่มด้านล่างเพื่อลองอีกครั้ง',
  error: 'เข้าสู่ระบบไม่สำเร็จ รหัสอาจหมดอายุหรือคำขอไม่ถูกต้อง กรุณาลองใหม่',
  unavailable: 'ยังเชื่อมต่อบัญชีไม่ได้ กรุณาลองใหม่อีกครั้ง',
};
/** Landing + sign-in (ADR 0003; Figma "Screens v2 · 00"): every app page redirects here until a Google account is verified. */
export default async function AuthPage({ searchParams }: { searchParams: Promise<{ status?: string; next?: string }> }) {
  const { status, next } = await searchParams;
  const notice = status ? messages[status] : undefined;
  return <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-6 lg:px-20">
    <header className="flex h-[88px] items-center justify-between">
      <span className="flex items-center gap-2.5 font-head text-headline">
        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent text-accent-on"><Compass className="h-[22px] w-[22px]" aria-hidden /></span>
        Project Edu
      </span>
      <Link href="/consent" className="hidden min-h-11 items-center px-3 font-medium text-accent-text lg:inline-flex">นโยบายความเป็นส่วนตัว</Link>
    </header>
    <main className="flex flex-1 flex-col gap-8 pb-6 lg:grid lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center lg:gap-20 lg:pb-12">
      <section className="flex flex-col">
        <h1 className="text-large-title lg:text-display">เริ่มโครงงานแรก<br />กับครูที่ปรึกษาที่ชวนคิด</h1>
        <p className="mt-3 max-w-[34rem] text-ink-2 lg:mt-4">สำหรับนักเรียน ม.ต้น–ม.ปลาย ช่วยตั้งแต่หาหัวข้อจนได้ข้อเสนอโครงงาน<span className="hidden lg:inline"> ด้วยคำถามที่ช่วยให้คุณคิดเอง ไม่ใช่คำตอบสำเร็จรูป</span></p>
        <ol className="mt-7 flex flex-col gap-5 lg:mt-10 lg:grid lg:grid-cols-3 lg:gap-6">
          {steps.map(([title, sub], i) => <li key={title} className="flex gap-3.5 lg:flex-col lg:gap-2.5">
            <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-tint font-medium text-accent-text">{i + 1}</span>
            <span><span className="block font-medium">{title}</span><span className="block text-callout text-ink-2">{sub}</span></span>
          </li>)}
        </ol>
      </section>
      <section aria-labelledby="signin-heading" className="mt-auto flex flex-col gap-4 lg:mt-0 lg:rounded-3xl lg:bg-surface lg:p-8 lg:shadow-e2">
        <figure className="rounded-2xl bg-surface p-4 shadow-e1 lg:bg-surface-2 lg:shadow-none">
          <figcaption className="flex items-center gap-1.5 text-caption text-ink-2">
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-accent-tint text-accent-text"><Compass className="h-3.5 w-3.5" aria-hidden /></span>
            ครูที่ปรึกษาจะถามแบบนี้
          </figcaption>
          <blockquote className="mt-1.5">ถ้าผักบุ้งโตเร็วขึ้น คุณจะวัดคำว่า “โตเร็ว” ด้วยอะไร</blockquote>
        </figure>
        <h2 id="signin-heading" className="sr-only lg:not-sr-only lg:mt-2 lg:text-title">เข้าสู่ระบบเพื่อเริ่ม</h2>
        <p className="hidden text-ink-2 lg:block">งานของคุณผูกกับบัญชี Google ของคุณเอง ไม่ปนกับคนอื่น</p>
        {notice && <p role="status" className="rounded-xl bg-caution-tint px-4 py-3 text-callout text-caution">{notice}</p>}
        <div className="mt-4 flex flex-col lg:mt-0"><AccountButton prominent next={safeNext(next)} /></div>
        <p className="text-center text-callout text-ink-2 lg:text-left">เราเก็บเพียงรหัสบัญชี ไม่เก็บชื่อ อีเมล หรือโรงเรียน</p>
        <Link href="/consent" className="-mt-2 inline-flex min-h-11 items-center justify-center font-medium text-accent-text lg:hidden">อ่านนโยบายความเป็นส่วนตัว</Link>
      </section>
    </main>
  </div>;
}
