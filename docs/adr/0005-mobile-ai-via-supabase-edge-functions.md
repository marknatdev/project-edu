# 0005 — แอปมือถือเรียก AI ผ่าน Supabase Edge Function

- Status: Accepted
- Date: 2026-11-09

แอป Flutter เคยฝัง API key ของ AI gateway (OmniRoute) กับ URL ของ tunnel ไว้ในตัวแอป ซึ่งใครแกะ APK/IPA ก็ได้ key ไป และ key นั้นหลุดสู่สาธารณะเมื่อ repo เปิดเป็น public จึงตัดสินใจให้มือถือเรียก AI ผ่าน Supabase Edge Function เท่านั้น (เริ่มจาก `ai-coach`; การ์ดไอเดียที่ AI สร้างก็ใช้แนวทางเดียวกัน) โดยเก็บ key, URL, ชื่อโมเดล และ system prompt ไว้ฝั่ง server, บังคับให้ผู้เรียน login ด้วย Google (ไม่รับผู้ใช้ anonymous) และใช้ rate limit กับโควตาชุดเดียวกับเว็บผ่าน RPC เดิมด้วย owner key `u:<uuid>` ทำให้โควตารวมกันทั้งเว็บและมือถือ

## Considered Options
- **เพิ่ม route ฝั่ง Next.js บน Vercel**: route เดิมของเว็บบังคับ cookie และตรวจ same-origin ใช้กับแอป native ไม่ได้ ต้องเพิ่มเส้นทางยืนยันตัวตนแบบ Bearer token เข้าไปในระบบ auth ที่ละเอียดอ่อน และตอนนี้ไม่ได้ deploy เว็บอัตโนมัติแล้ว
- **ซ่อน key ในแอป** (obfuscate, `--dart-define`): ไม่ได้ผล เพราะดึงออกจากไฟล์แอปได้เสมอ

## Consequences
- ต้อง login ก่อนใช้ AI (ต่อมา ADR 0007 ยกเลิกโหมด Guest บนมือถือทั้งหมด)
- AI gateway ต้องเข้าถึงได้ด้วย URL ถาวร (ตอนนี้ใช้ Tailscale Funnel) เพราะ Edge Function อยู่บน cloud
- Edge Function อยู่ใน `supabase/functions/` และ deploy แยกจาก migration (`supabase functions deploy`)
