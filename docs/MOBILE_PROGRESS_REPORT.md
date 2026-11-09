# รายงานสถานะและความคืบหน้า Project Edu Mobile (อิงตาม HANDOFF.md)

**วันที่ปรับปรุงข้อมูล:** 9 พฤศจิกายน 2026  
**แหล่งข้อมูลอ้างอิงหลัก (Single Source of Truth):** `docs/HANDOFF.md` (มีผลบังคับใช้เหนือรายงานฉบับเดิม)  
**Worktree:** `D:/millmaker/EdTech/.claude/worktrees/mobile-progress-report-23df6a` (Branch: `claude/mobile-progress-report-23df6a`)  
**Base Release ปัจจุบัน:** **`1.0.4+5`** (Flutter 3.47.9, `--no-tree-shake-icons`)  
**สถานะการเผยแพร่:** Staging Patch #1 (Android) และ #2 (iOS) อยู่บนแทร็ก `staging` (รอการทดสอบบนเครื่องจริงก่อนโปรโมตเป็น `stable`)  

---

## 1. การแก้ไขข้อมูลสำคัญจากรายงานฉบับก่อนหน้า (Key Corrections)

| รายการ | ข้อมูลเดิมที่คลาดเคลื่อน | ข้อมูลจริงที่ถูกต้องตาม HANDOFF.md & ADR |
| :--- | :--- | :--- |
| **Base Release** | ระบุว่าเป็น `1.0.3+4` | ปัจจุบัน Base Release ล่าสุดคือ **`1.0.4+5`** บน Shorebird และ GitHub Release |
| **สถานะ Shorebird Patch** | อ้างว่า Patch #23 อัปเดตทั้ง Android/iOS สู่ Stable แล้ว | Patch #23 เป็นการแพตช์ Android บน Release `1.0.3+4` เดิม และมีปัญหาไอคอนหายจากการตัด Asset diffs; ปัจจุบันย้ายมาเป็น Base `1.0.4+5` และมี **Patch #1 (Android) / Patch #2 (iOS) อยู่บนแทร็ก `staging`** (ยังไม่เข้า `stable`) |
| **การเข้าถึงของผู้ใช้ (Auth)** | มีโหมด Guest Zero-PII | **ยกเลิกโหมด Guest บนมือถือทั้งหมด** ตาม **ADR 0007** (ต้องเข้าสู่ระบบผ่าน Google Sign-in เท่านั้น เพื่อผูกกับระบบ Sync และ AI Quota) |
| **การเชื่อมต่อ AI** | เรียกตรงเข้า Cloudflare Tunnel ชั่วคราว / ฝัง Key | เรียกผ่าน **Supabase Edge Functions (`ai-coach`, `ai-topic-cards`)** ตาม **ADR 0005** ฝั่งหลังบ้านต่อผ่าน **Tailscale Funnel ถาวร** (`https://win-mc1lo20oj0g.tailc8aaa6.ts.net:8443/v1`) ไม่มี Key ค้างในตัวแอป |
| **ไฟล์แพ็กเกจ iOS (.ipa)** | อ้างว่าพร้อมติดตั้งได้ทั่วไป | ไฟล์ `.ipa` บน GitHub Release เป็น **Unsigned IPA** ต้องผ่านกระบวนการลงนามดิจิทัล (Signing) ก่อนจึงจะติดตั้งบนเครื่องจริงได้ |
| **สถานะความพร้อม** | ระบุว่า "Production Ready" และ "ทดสอบ 100%" | อยู่ในสถานะ **Staging Verification** ยังมีประเด็นค้างที่ต้องทดสอบบนเครื่องจริง และยังมีงานเปิดอีกหลายรายการ |

---

## 2. สถานะสถาปัตยกรรมและฟังก์ชันที่พัฒนาแล้ว (Implemented Features)

### 2.1 แถบนำทาง 5 รายการ และสมุดบันทึกแล็บ (5-Item Dock & Lab Log Book)
- **แถบนำทางด้านล่าง (`FloatingDock`):** มี 5 รายการชัดเจน ได้แก่:
  1. `Tab 0` แดชบอร์ด (`DashboardView`)
  2. `Tab 1` ประวัติห้องสนทนา AI (`SessionsView`)
  3. `Center Hero` ปุ่มกลมลอยเด่นขนาดใหญ่เปิด AI Coach
  4. `Tab 2` สมุดบันทึกแล็บ (`LabLogBookView` / Electronic Lab Notebook)
  5. `Tab 3` โปรไฟล์นักวิจัย (`ProfileView`) แสดงเวอร์ชันและหมายเลข Patch ท้ายหน้า
- **สมุดบันทึกแล็บ (`LabLogBookView`):**
  - รองรับการตั้งชื่อการทดลองแล็บจริง
  - นาฬิกาจับเวลาแล็บกะทัดรัด พร้อมตัวบ่งชี้สถานะการจับเวลา
  - การ์ดจำแนกตัวแปรวิจัย 3 ด้าน (ตัวแปรต้น, ตัวแปรตาม, ตัวแปรควบคุม)
  - ระบบตัวกรองและบันทึกสังเกตการณ์ (`ObservationLog`) พร้อมส่งออกตาราง Markdown

### 2.2 ระบบค้นหาหัวข้อและคลังการ์ดแบบไดนามิก (Discovery Track)
- **Generated Catalog (ADR 0006):** คลังการ์ด 90 ใบถูกแปลงจาก `src/data/cards` ของเว็บมาเป็น Dart (`mobile/lib/discovery/catalog.g.dart`) เพื่อให้ Shorebird สามารถแพตช์อัปเดตผ่าน OTA ได้โดยไม่ติดข้อจำกัดด้าน Asset
- **Discovery Store & UI:** รองรับการเลือกวิชา (Subject) → สาขาย่อย (Subfield) → ปัดการ์ด (Flash Card Tinder-style: แตะเพื่อพลิก, ปัดซ้ายข้าม, ปัดขวาชอบ, ย้อนกลับได้)
- **Shortlist Comparison & Fit Score:** หน้ารวมการ์ดที่สนใจได้สูงสุด 5 ใบ จัดอันดับตามคะแนนความเหมาะสม (Fit Score Engine)
- **Idea Composer & Active Idea:** บังคับให้ผู้เรียนเขียนสรุปไอเดียด้วยภาษาของตนเอง (Rewrite Gate) ก่อนตั้งเป็น "Active Idea" สำหรับเริ่มการทดลอง

### 2.3 การจัดการข้อมูลและการซิงค์ (Sync & Persistence)
- **Discovery Sync (ADR 0008):** ข้อมูลการปัด, Shortlist, และไอเดีย เชื่อมต่อกับ Supabase ตาราง `edu_discovery_items` ผ่าน RPC `edu_discovery_push` และ `edu_discovery_pull` รองรับการรวมข้อมูลข้ามอุปกรณ์และบันทึก Tombstone เมื่อมีการลบ
- **Account-Scoped Local Data (ADR 0007):** ข้อมูลที่ยังอยู่ในเครื่อง (แชท AI, บันทึกแล็บ, BOM, การตั้งค่าโครงการ, กิจกรรมปฏิทิน) จะถูกล้างเมื่อ Login บัญชีใหม่ครั้งแรก หรือเมื่อมีการสลับบัญชี เพื่อความปลอดภัยของข้อมูล

### 2.4 หน้าปฏิทินวิจัยสไตล์ Google Calendar (`CalendarView`)
- **หน้าจอเต็มรูปแบบ (Full-screen Pushed Page):** แทนที่ BottomSheet เดิมด้วยหน้าจอ `CalendarView` มี AppBar และปุ่มย้อนกลับ โดย Dock ด้านล่างยังคง 5 ข้อเหมือนเดิม
- **Month/Year Toolbar & วันนี้:** หัวตารางเดือนภาษาไทยและปี พ.ศ. (เช่น "พฤศจิกายน 2569"), ปุ่มลัด "วันนี้" (Today), ปุ่มลูกศร `<` `>` เลื่อนข้ามเดือนและปี
- **ตารางปฏิทิน 7 คอลัมน์ (อา - ส):** แสดงวันที่เดือนก่อนหน้า/ถัดไปด้วยสีจาง, วงแหวนสถานะวันปัจจุบัน, ไฮไลต์วันที่เลือก และจุดสีระบุหมวดหมู่กิจกรรมใต้ตัวเลขวันที่
- **กำหนดการประจำวัน (Selected Date Agenda):** แสดงรายการกิจกรรมของวันที่เลือก พร้อมเวลา ("ทั้งวัน" หรือ "14:00 น."), ป้ายหมวดหมู่สี, บันทึกข้อความ, และเมนูแก้ไข/ลบ
- **การเพิ่มกิจกรรมใหม่:** ปุ่ม FAB `+ เพิ่มกิจกรรม` พร้อมฟอร์มระบุชื่อ, วันที่ (DatePicker), เวลา, ชิปหมวดหมู่ (แล็บวิจัย, กำหนดส่ง, ประชุมทีม, กิจกรรมวิจัย, ทั่วไป) และบันทึกเพิ่มเติม
- **จุดเชื่อมต่อครบถ้วน:** เชื่อมต่อจากปุ่ม "ปฏิทิน" บนแดชบอร์ด, เมนูปฏิทินใน App Drawer, และฟังก์ชัน `showCompetitionCalendar`

---

## 3. ผลการตรวจสอบโค้ดและการทดสอบจริง (Verified Verification)

ทดสอบจริงในสภาพแวดล้อม Worktree ล่าสุด (`D:/millmaker/EdTech/.claude/worktrees/mobile-progress-report-23df6a`):

| การทดสอบ | คำสั่ง | ผลลัพธ์ที่ยืนยัน |
| :--- | :--- | :--- |
| **Mobile Static Analysis** | `flutter analyze` | **No issues found!** (0 errors, 0 warnings, 0 lints) |
| **Mobile Automated Tests** | `flutter test` | **37/37 passed** ครอบคลุม 5 ชุดทดสอบ:<br>• `calendar_view_test.dart` (6/6 passed)<br>• `ai_coach_dialog_test.dart`<br>• `discovery_core_test.dart`<br>• `discovery_ui_test.dart`<br>• `widget_test.dart` |
| **Web TypeScript Check** | `npm run typecheck` | **0 errors** (`tsc --noEmit` ผ่านสมบูรณ์) |
| **Mobile Card Catalog Sync** | `vitest mobile-dart-catalog.test.ts` | **3/3 passed** (ยืนยันว่า `catalog.g.dart` สอดคล้องกับ `src/data` 100%) |

---

## 4. สถานะ Release และ Artifacts ปัจจุบัน

- **Shorebird App ID:** `fb59b69d-72a4-4d2d-926e-8cc82ae756f2`
- **Active Base Release:** `1.0.4+5` (Android & iOS)
- **Staging Patches:** 
  - Patch #1 (Android) และ Patch #2 (iOS) เผยแพร่ผ่าน GitHub Actions Run `42636947445` เข้าแทร็ก `staging`
  - การทดสอบ Staging ต้องใช้คำสั่ง:
    ```bash
    shorebird preview --release-version 1.0.4+5 --track staging
    ```
- **GitHub Release `mobile-v1.0.4+5` Artifacts:**
  - `project-edu-1.0.4+5.apk`: ลงนามใหม่ด้วย Debug Keystore ของเครื่องเจ้าของโปรเจกต์ (ติดตั้งทับ 1.0.3 ได้โดยข้อมูลไม่หาย)
  - `project-edu-1.0.4+5-unsigned.ipa`: ไฟล์ IPA ที่ยังไม่ได้ลงนาม (Unsigned) ต้อง Sign ก่อนติดตั้งลงอุปกรณ์ iOS จริง

---

## 5. ปัญหาที่ยังค้างอยู่และความเสี่ยง (Open Issues & Known Risks)

1. **การยืนยัน Google Sign-in บนอุปกรณ์จริง:** เนื่องจากยกเลิกโหมด Guest แล้ว หาก URL Redirect (`com.marknatdev.projectedumobile://login-callback`) มีปัญหาบนอุปกรณ์จริง ผู้ใช้จะไม่สามารถเข้าสู่ระบบได้ จำเป็นต้องทดสอบผ่านเครื่องจริงก่อนโปรโมต Patch สู่ `stable`
2. **ข้อผิดพลาดของ `project_repository.dart`:** พบว่ายังมีการเรียกเขียนตาราง `edu_records` โดยตรงจากฝั่ง Client ซึ่งติดสิทธิ์ของ Supabase RLS (แสดงใน Test Log) ต้องทำการ Refactor ให้เรียกผ่าน RPC หรือถอดออก
3. **การซิงค์ฝั่ง Web App:** ฝั่งมือถือมี RPC Sync สำหรับ Discovery แล้ว แต่หน้าเว็บยังไม่ได้เชื่อมต่อกับ `edu_discovery_items`
4. **ตัวนับเวลาถอยหลังการแข่งขัน (Countdown Banner):** ยังตั้งเป้าหมายไปที่ YSC 2027 ซึ่งปิดรับผลงานไปตั้งแต่วันที่ 10 ก.ย. 2026 อยู่ระหว่างรอข้อสรุปเป้าหมายการแข่งขันรอบถัดไป
5. **การตั้งค่า Release Keystore บน CI:** ปัจจุบัน CI ใช้ Random Keystore ทำให้ APK ที่บิลด์จาก CI ติดตั้งทับตัวเดิมไม่ได้ ต้องตั้งค่า Keystore กลางใน GitHub Secrets
6. **การกระจายแอปบน iOS:** ยังไม่มี Apple Developer Account สำหรับการขึ้น TestFlight หรือ Sign in with Apple

---

## 6. ลำดับความสำคัญในการทำงานขั้นถัดไป (Prioritized Next Steps)

1. **[ความสำคัญสูงสุด] ทดสอบ 1.0.4+5 ร่วมกับ Staging Patch บนเครื่องจริง:**
   - ทดสอบโฟลว์ Google Sign-in, การดึง AI Coach ผ่าน Edge Function, และการซิงค์ Discovery บนอุปกรณ์จริง
   - เมื่อผ่านการตรวจสอบแล้ว จึงขออนุมัติโปรโมต Patch ขึ้นสู่แทร็ก `stable`
2. **[สำคัญ] แก้ไข `project_repository.dart`:**
   - ลบการเรียกเขียนตาราง `edu_records` โดยตรงเพื่อขจัด Assertion Error
3. **[สำคัญ] พัฒนา Discovery Sync ฝั่ง Web Application:**
   - เชื่อมต่อ `src/lib/storage/store.ts` เข้ากับ RPC `edu_discovery_push` / `edu_discovery_pull`
4. **[ปรับปรุงระบบบิลด์] ตั้งค่า Release Keystore ใน GitHub Actions:**
   - นำ Release Keystore ใส่ใน Secret เพื่อให้ APK บิลด์อัตโนมัติสามารถอัปเกรดได้ทันที
