# 0001 — AI provider ผ่าน OpenAI-compatible gateway (dev = OmniRoute local)

- Status: Accepted (dev); production provider ยังไม่ตัดสิน
- Date: 2026-11-03

## Context
แอปใช้ AI 3 งาน: สร้าง Topic Card เพิ่ม, Evaluation, เขียน Proposal/Plan
ยังไม่อยากผูก production กับ provider ใดตอนนี้ ช่วง dev มี OmniRoute รันอยู่ในเครื่อง (`http://localhost:20128/v1`, ต้องใช้ API key)

## Decision
โค้ดแอปคุยกับ AI ผ่าน interface แบบ OpenAI-compatible (base URL + key + model จาก env) เท่านั้น
- dev: ชี้ไป OmniRoute local
- production: เลือกทีหลัง (Gemini / OpenAI / Claude / OpenRouter) โดยเปลี่ยนแค่ env

## Alternatives
- ผูก SDK ของ provider เดียวตั้งแต่แรก — เร็วกว่าแต่เปลี่ยนยาก
- ใช้ SDK หลายเจ้าผ่าน adapter เอง — ยืดหยุ่นสุดแต่โค้ดเยอะเกินสำหรับ MVP

## Consequences
- ห้ามใช้ฟีเจอร์เฉพาะ provider (เช่น grounding ของ Gemini) โดยไม่ผ่าน interface กลาง
- ต้องทดสอบผลภาษาไทยซ้ำเมื่อเลือก production provider
- production ไม่มี OmniRoute → ต้องมี secret management ของจริงก่อนขึ้นระบบ
