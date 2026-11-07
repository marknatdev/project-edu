import Link from 'next/link';
import { AccountButton } from '@/components/auth/AccountAccess';
export const dynamic = 'force-dynamic';
export default async function AuthPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const status = (await searchParams).status;
  const messages: Record<string,string> = { cancelled: 'ยกเลิกการเข้าสู่ระบบแล้ว งานในเครื่องยังอยู่', error: 'เข้าสู่ระบบไม่สำเร็จ รหัสอาจหมดอายุหรือคำขอไม่ถูกต้อง งานในเครื่องยังอยู่', unavailable: 'ยังเชื่อมต่อบัญชีไม่ได้ กรุณาลองใหม่ งานในเครื่องยังอยู่' };
  return <main className="mx-auto max-w-lg p-6 space-y-4">
    <h1 className="text-xl font-bold">บัญชี Google (ไม่บังคับ)</h1>
    <p role="status" className="text-sm text-slate-700">{messages[status ?? ''] ?? 'คุณใช้งาน Guest ต่อได้โดยไม่เข้าสู่ระบบ'}</p>
    <p className="text-sm text-slate-600">การเข้าสู่ระบบไม่ย้ายหรือเขียนทับงานในเครื่อง และยังไม่ซิงค์โครงงานข้ามอุปกรณ์</p>
    <AccountButton />
    <Link href="/" className="block min-h-11 py-3 text-indigo-700 underline">กลับไปใช้งานโดยไม่เข้าสู่ระบบ</Link>
    <Link href="/consent" className="block min-h-11 py-3 text-indigo-700 underline">การใช้ข้อมูลและความเป็นส่วนตัว</Link>
  </main>;
}
