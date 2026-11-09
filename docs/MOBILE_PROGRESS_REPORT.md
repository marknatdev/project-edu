# รายงานความคืบหน้าการพัฒนา Project Edu Mobile (Flutter & Shorebird)

**วันที่รายงาน:** 9 พฤศจิกายน 2026  
**สถานะ:** เสร็จสมบูรณ์พร้อมใช้งาน (Production Ready)  
**เวอร์ชันหลัก:** `1.0.3+4`  
**Git Commit ล่าสุด:** `01ce806` (พุชขึ้น `origin/main` เรียบร้อยแล้ว)  
**แพตช์ Shorebird OTA ล่าสุด:** `Patch #23` (แทร็ก `stable`)  

---

## 1. ภาพรวมการดำเนินงาน (Executive Summary)

ตามข้อกำหนดการพัฒนาล่าสุด ได้ดำเนินการปรับปรุงและยกระดับแอปพลิเคชันเสร็จสิ้นครบถ้วนทุกมิติ:
1. **เปลี่ยนหน้า Lab Timer เดิม ให้กลายเป็น "สมุดบันทึกแล็บ (Lab Log Book / Electronic Lab Notebook)" ฉบับเต็ม:** รองรับการบันทึกผลการทดลองวิทยาศาสตร์จริง กำหนดตัวแปรวิจัย 3 ด้าน จับเวลาแล็บสัมพัทธ์ และคัดลอกตารางผลแล็บ
2. **ปรับแถบนำทางด้านล่าง (Floating Dock) ให้มีพอดี 5 รายการ:** จัดสัดส่วนให้สะอาดตา ไม่อัดแน่น โดยคงปุ่ม AI Coach เป็นปุ่มทรงกลมลอยเด่นขนาดใหญ่ตรงกลางอย่างสง่างาม
3. **กวาดล้าง Mockup Data ออกจากระบบ 100%:** บัญชีผู้ใช้เริ่มต้นเป็น Clean State ทั้งหมด พร้อมกลไก Draft-only session ไม่บันทึกแชทเปล่า และปุ่ม Reset Data (🧹) ในหน้าโปรไฟล์
4. **แก้ไขบั๊กและทดสอบระบบเชิงลึกทุกส่วน:** กู้คืน Cloudflare Tunnel ของ OmniRoute, แก้ไข ID collision บน Windows, กำจัด double escaping และผ่านการทดสอบอัตโนมัติ 100% ทั้ง Web (393/393) และ Mobile (9/9)
5. **เผยแพร่แพตช์ Shorebird OTA และส่งมอบไฟล์ติดตั้งล่าสุด:** เผยแพร่ Patch 23 ขึ้นแทร็ก stable และคอมไพล์ไฟล์ `.apk` (57 MB) และจัดเตรียม `.ipa` (8.3 MB) พร้อมติดตั้ง

---

## 2. รายละเอียดฟีเจอร์ใหม่: สมุดบันทึกแล็บ (Lab Log Book)

ไฟล์ที่พัฒนา: `mobile/lib/views/lab_log_book_view.dart`

| ฟังก์ชันการทำงาน | รายละเอียดทางเทคนิค |
| :--- | :--- |
| **Experiment Banner** | แสดงชื่อการทดลองปัจจุบัน พร้อมปุ่มไอคอนดินสอแตะเพื่อแก้ไขชื่อแล็บ และบันทึกลง `SharedPreferences` ถาวร |
| **Research Variables & Rigor** | การ์ดสรุปตัวแปรวิจัย 3 หมวด: ตัวแปรต้น (ปัจจัยทดสอบ), ตัวแปรตาม (Metric), ตัวแปรควบคุม (Control) พร้อมปุ่มลัดแตะส่งปรึกษา AI Coach ได้ทันที |
| **Compact Lab Stopwatch** | นาฬิกาจับเวลาแล็บกะทัดรัด แสดงเวลาในรูปแบบ `HH:MM:SS` พร้อมไฟสถานะ Pulse (เขียว = กำลังนับเวลา), ปุ่ม Start/Pause และปุ่ม Reset |
| **Observation Tag Filter** | แท็บชิปกรองหมวดหมู่การสังเกตการณ์: `ทั้งหมด`, `Trial`, `Control`, `Peak`, `Anomaly`, `Milestone` เพื่อให้เรียกดูข้อมูลง่าย |
| **Interactive Logger Sheet** | โมดอลกรอกบันทึกผลแล็บใหม่ รองรับการเลือกแท็กผลการทดลอง ชิปคำช่วยพิมพ์ด่วน (Presets) และบันทึกเวลาที่จับได้อัตโนมัติ |
| **Observation Timeline Cards** | การ์ดแสดงผลบันทึกผลแล็บแต่ละจุด แสดงเวลาสัมพัทธ์ แท็กกำกับสี และปุ่มลบรายการ |
| **Markdown Table Export** | ปุ่ม `📋 คัดลอกตาราง` สำหรับแปลงข้อมูลการทดลองทั้งหมดให้อยู่ในรูปตาราง Markdown นำไปวางในเล่มโครงงานหรือ Google Docs ได้ทันที |

---

## 3. สถาปัตยกรรมแถบนำทางใหม่ (5-Item Floating Dock)

ไฟล์ที่พัฒนา: `mobile/lib/widgets/floating_dock.dart`, `mobile/lib/main.dart`

ปรับโครงสร้างแถบนำทางด้านล่างให้มีองค์ประกอบรวมกัน **5 ข้อพอดี** ตามสเปก:

```
[ Tab 0 ]      [ Tab 1 ]       [ CENTER HERO ]       [ Tab 2 ]       [ Tab 3 ]
แดชบอร์ด        ห้องสนทนา       AI Coach (ปุ่มใหญ่)    สมุดบันทึกแล็บ     โปรไฟล์
Dashboard      Sessions         Hero Floating Btn    Lab Log Book     Profile
```

1. **Tab 0: แดชบอร์ด (Dashboard):** หน้าจอศูนย์รวมสถานะโครงงานวิทยาศาสตร์, การ์ดเป้าหมาย YSC, และสถิติ
2. **Tab 1: ห้องสนทนา AI (Sessions):** ประวัติการปรึกษากับ Socratic AI ย้อนหลัง พร้อมเมนูเปลี่ยนชื่อและลบห้อง
3. **Center Hero Button: ปุ่มคุยกับ AI ขนาดใหญ่:** ปุ่มทรงกลม Elevated Button โทนสี Gradient Cyan-Violet มีเงาแสงเรืองรอง (Glow Effect) ลอยเด่นตรงกลาง
4. **Tab 2: สมุดบันทึกแล็บ (Lab Log Book):** เข้าสู่หน้าสมุดบันทึกการทดลองแล็บวิทยาศาสตร์ฉบับเต็ม
5. **Tab 3: โปรไฟล์นักวิจัย (Profile):** ข้อมูลนักวิจัย, บัตรดิจิทัล, ผลงาน Shortlist, การลงนามรับรอง SRC, และปุ่มล้างข้อมูลบัญชี

> **หมายเหตุ:** สำหรับหน้าจอ **ซ้อมตอบคำถามกรรมการ (Judge Defense View)** ได้รับการจัดวางให้เข้าถึงแบบ Full-screen Push จากการ์ดบนแดชบอร์ด และเมนูในแถบ App Drawer ด้านข้าง เพื่อลดความแออัดของ Dock ด้านล่าง

---

## 4. ผลการตรวจสอบคุณภาพและการทดสอบ (Quality Assurance)

### ฝั่ง Web Application (`D:/millmaker/EdTech`):
- **TypeScript Typecheck:** ผ่านสมบูรณ์ (`0 errors`)
- **ESLint Validation:** ผ่านสมบูรณ์ (`0 warnings/errors`)
- **Vitest Unit & Integration Tests:** ผ่านครบทั้ง **48 ไฟล์ รวม 393/393 passed (100%)**

### ฝั่ง Mobile Flutter Application (`mobile/`):
- **Flutter Analyze:** `No issues found!` (0 errors, 0 warnings, 0 lints)
- **Unit Tests (`mobile/test/learner_state_test.dart`):**
  - `clean state initializes with zero mock data`: ผ่าน
  - `createNewSession does NOT immediately append session`: ผ่าน
  - `saveOrInsertSession persists non-empty session`: ผ่าน
  - `addLabObservation and BOM calculation work accurately`: ผ่าน
  - `resetAllAccountData purges state back to clean`: ผ่าน
- **Widget Integration Tests (`mobile/test/widget_test.dart`):**
  - PreLogin -> Guest Login -> Dashboard: ผ่าน
  - AI Coach Dialog Open & Dismiss without leaking draft: ผ่าน
  - Tab 2 Navigation to Lab Log Book (Header, Stopwatch, Empty state): ผ่าน
  - Tab 3 Navigation to Profile View (Researcher info, Reset dialog): ผ่าน
  - **สรุปผลการทดสอบ Mobile:** **9/9 tests passed (100%)**

---

## 5. การส่งมอบและการเผยแพร่ (Release & Distribution)

### 1) Shorebird CodePush (OTA Update)
- **App ID:** `fb59b69d-72a4-4d2d-926e-8cc82ae756f2`
- **Release Version:** `1.0.3+4`
- **Shorebird Patch:** **Patch #23** (`789806`)
- **Channel:** `stable`
- **การมีผล:** อุปกรณ์ที่ติดตั้งแอปเวอร์ชัน `1.0.3+4` อยู่แล้ว จะได้รับอัปเดตหน้า Lab Log Book และ Dock 5 ข้อ อัตโนมัติทันทีที่เปิดแอป

### 2) แพ็กเกจไฟล์สำหรับติดตั้งโดยตรง (Standalone Artifacts)

| แพลตฟอร์ม | ไฟล์ | ขนาด | ตำแหน่งไฟล์บนเครื่อง |
| :--- | :--- | :--- | :--- |
| **Android** | `project-edu-release.apk` | 57 MB | `D:/millmaker/project-edu-release.apk` |
| **iOS / iPadOS** | `project-edu-release.ipa` | 8.3 MB | `D:/millmaker/project-edu-release.ipa` |
| **iOS (Latest Link)** | `project-edu-latest.ipa` | 8.3 MB | `D:/millmaker/project-edu-latest.ipa` |

---

## 6. สรุปรายการไฟล์ที่เกี่ยวข้อง (Key Source Files)

- `mobile/lib/views/lab_log_book_view.dart`: หน้าต่างสมุดบันทึกแล็บ (Lab Log Book) เต็มรูปแบบ
- `mobile/lib/widgets/floating_dock.dart`: วิดเจ็ตแถบนำทาง 5 องค์ประกอบ พร้อมปุ่ม AI Coach ทรงกลมลอยเด่น
- `mobile/lib/main.dart`: โครงสร้างหน้าหลัก ควบคุมการสลับแท็บและการเปิด AI Coach
- `mobile/lib/models/learner_state.dart`: จัดการสถานะผู้เรียน, ข้อสังเกตแล็บ, อุปกรณ์ BOM, และ Draft-only session
- `mobile/lib/services/ai_coach_service.dart`: การเชื่อมต่อ AI Gateway พร้อม Fallback endpoints
- `mobile/test/learner_state_test.dart`: ชุดทดสอบ State, Draft persistence และ Reset data
- `mobile/test/widget_test.dart`: ชุดทดสอบ UI Flow, Navigation และการทำงานร่วมกัน
