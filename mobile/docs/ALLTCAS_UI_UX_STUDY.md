# การศึกษาและวิเคราะห์ UI/UX ของแอปพลิเคชัน AllTCAS (AIITCAS)
> **เอกสารสรุปผลการวิจัยและถอดรหัสงานออกแบบสำหรับนำไปใช้ต่อยอดในงานพัฒนาและออกแบบ UI/UX**  
> *วันที่บันทึก:* 8 พฤศจิกายน 2026  
> *แพลตฟอร์มที่ทดสอบ:* iPadOS (1640×2360 Landscape Tablet Resolution)  
> *เวอร์ชันแอปพลิเคชัน:* AllTCAS v1.0.5 (`com.alllearn.alltcas`)

---

## 1. บทสรุปภาพรวมผลิตภัณฑ์ (Product & UX Overview)

AllTCAS (AIITCAS) เป็น Ed-Tech Platform สัญชาติไทยที่ออกแบบมาสำหรับกลุ่มเป้าหมายนักเรียนมัธยมปลายที่กำลังเตรียมตัวสอบเข้ามหาวิทยาลัยในระบบ **TCAS (TGAT / TPAT / A-Level)** โดยเฉพาะกลุ่ม **DEK70**

### แกนหลักของประสบการณ์ผู้ใช้งาน (Core UX Pillars)
1. **Stress-Reduction Dark Aesthetic:** ใช้อินเทอร์เฟซโทน Dark Mode คุณภาพสูง เพื่อลดความเมื่อยล้าของสายตาสำหรับการอ่านหนังสือและทำโจทย์เป็นเวลานาน
2. **Social Proof & Peer Accountability:** สร้างแรงกระตุ้นผ่านกระดานผู้นำ (Leaderboard), ระบบสะสมวันอ่านหนังสือ (Streak Fire), และระบบจับเวลาอ่านหนังสือร่วมกับเพื่อน
3. **Companion Gamification (Allie Ecosystem):** มีมาสคอตไดโนเสาร์/ลูกเจี๊ยบส้มชื่อ **Allie** ซึ่งทำหน้าที่เป็นตัวแทนของผู้ใช้ (Avatar) มีระบบเลเวล (EXP), การเติบโตตามชั่วโมงอ่านหนังสือ, เควสต์ประจำวัน และตู้เสื้อผ้าแต่งตัว
4. **Frictionless Practice Flow:** ระบบคลังข้อสอบแบบแบ่งประเภทชัดเจน พร้อม Stepper 2 ขั้นตอน (`1 เลือกวิชา` → `2 ตั้งค่า`) ที่เข้าใจง่าย

---

## 2. โครงสร้างสถาปัตยกรรมข้อมูล (Information Architecture)

```
AllTCAS (AIITCAS)
├── 1. Top Navigation Bar
│   ├── Drawer Menu (Hamburger)
│   ├── Brand Logo (AIITCAS)
│   ├── Quick Mode Toggle
│   ├── Search (ค้นหา)
│   └── Notifications (แจ้งเตือน + Badge)
│
├── 2. Main Dashboard (หน้าแรก)
│   ├── A. Social Leaderboard Widget (Top 100 วันนี้ + Sticky My Rank Pill #7822)
│   ├── B. Exam Countdown Carousel (TGAT/TPAT2-5: วัน/ชม./นาที)
│   ├── C. Quick Action Tools Row (AI Tutor, ทบทวน, All Exam, โจทย์ที่บันทึก)
│   ├── D. Core Feature Grid (2x2 Cards):
│   │   ├── TCAS Practice (ฝึกทำโจทย์เดี่ยว/กลุ่ม ฟรี)
│   │   ├── All Vocab (คลังคำศัพท์ + มินิเกมจับคู่/ควิซ)
│   │   ├── All Exam (Mock Exam จับเวลาเสมือนจริง)
│   │   └── All Notes (สมุดจดแยกวิชา รองรับ Stylus Pen)
│   └── E. Promotional & Event Banner (Pre-TCAS Mock Exam + สมัครสอบ)
│
├── 3. Study Tracker / Timer Room (จับเวลาอ่านหนังสือ)
│   ├── Daily Study Time Gauge (00:00:00)
│   ├── Allie Companion Presence & Animations
│   └── Subject Tagging & Focus Sessions
│
├── 4. Mascot Gamification (ห้องของ Allie)
│   ├── Level & EXP Progress Bar (เช่น Level 2 ขาดอีก 1,000 EXP)
│   ├── เส้นทางการโต (Evolution Roadmap)
│   ├── ตู้เสื้อผ้า (Wardrobe / Skin Customization)
│   └── ภารกิจประจำวัน (Daily Study Quests)
│
├── 5. Practice & Quiz Engine
│   ├── Step 1: เลือกวิชา (TGAT1, TGAT2, Biology, TPAT3, Math 1, TPAT1 กสพท)
│   ├── Step 2: ตั้งค่า (หัวข้อโจทย์, สุ่มทุกประเภท, จำนวน 5/10/20 ข้อ, สลับแสดงเฉลย, ตั้งเวลา)
│   └── Quiz Taking & Solution View
│
├── 6. Mock Exam Store (สมัครสอบและสั่งซื้อข้อสอบกระดาษ)
│   ├── Physical Exam Booklets (A-Level คณิต 1, TPAT3, TGAT1, TGAT2)
│   ├── Delivery Logistics & Roadmap (5 ขั้นตอน สั่งซื้อ → รับที่บ้าน → สอบพร้อมกัน → รู้คะแนน)
│   └── Direct Checkout & QR Payment
│
└── 7. Floating Bottom Navigation Dock (5 แท็บ)
    ├── Tab 1: Practice / Tools (แบบฝึกหัด)
    ├── Tab 2: Community / Discussion (คอมมูนิตี้พูดคุย)
    ├── Tab 3: Timer / Study Room (ปุ่มส้มเด่นตรงกลาง)
    ├── Tab 4: Friends / Social (กลุ่มเพื่อนและสถิติ)
    └── Tab 5: Profile / Settings (โปรไฟล์ผู้ใช้)
```

---

## 3. ระบบการออกแบบเชิงภาพ (Visual Design System Tokens)

### 3.1 Color Palette (โทนสีและบทบาทการใช้งาน)

| Token Name | Hex Code | บทบาทการใช้งาน (Usage Role) |
|---|---|---|
| **Background / Canvas** | `#0D111A` | พื้นหลังหลักของหน้าจอ (Deep Midnight Slate) |
| **Surface / Card Level 1** | `#191E2B` | พื้นหลังของ Card, Section, Container หลัก |
| **Surface / Card Level 2** | `#222938` | พื้นหลังของ Sub-card, ช่องตัวเลือกที่ไม่ได้เลือก, Input |
| **Primary Accent (Brand)** | `#FF6D00` / `#F97316` | สีส้มเอกลักษณ์ของแบรนด์, ปุ่ม CTA หลัก, การนับถอยหลัง, แท็บที่เลือก |
| **Success / New Accent** | `#00E676` / `#10B981` | แท็ก `BETA`, `★ ใหม่`, การ์ด All Exam, ตัวบ่งชี้ความพร้อม |
| **Information / TGAT1** | `#00B0FF` / `#0284C7` | สีประจำหมวดภาษาอังกฤษ / การ์ด TCAS Practice |
| **Creative / Vocab Accent** | `#8B5CF6` / `#7C4DFF` | แท็ก `TGAT1 Vocab · DEK70`, การ์ด All Notes |
| **Warning / Streak Fire** | `#FF9100` / `#F59E0B` | สัญลักษณ์ไฟ Streak, เหรียญทองอันดับ 1 |
| **Text Primary** | `#FFFFFF` | ข้อความหัวข้อ, ตัวเลขสำคัญ, ชื่อฟีเจอร์ |
| **Text Secondary / Muted** | `#94A3B8` | คำอธิบายฟีเจอร์, เวลาที่เหลือ, ข้อความกำกับรอง |
| **Border / Divider** | `#262F40` | เส้นคั่นส่วน, ขอบ Card บางเฉียบเพื่อแบ่งมิติ |

### 3.2 Typography & Type Scale

ใช้ฟอนต์สไตล์ Modern Geometric Sans-serif สำหรับภาษาไทยและอังกฤษควบคู่กัน (เช่น Sukhumvit Set, Kanit, หรือ Prompt):

* **App Brand / Header:** Bold Display 24–28pt (ตัวหนา เด่นชัด)
* **Section Titles:** Semi-bold 18–20pt (เช่น `อันดับการเรียนวันนี้ (Top 100)`)
* **Card Titles:** Bold 16–18pt (เช่น `TCAS Practice`, `All Vocab`)
* **Body / Descriptions:** Regular/Medium 13–14pt สี `#94A3B8`
* **Chips & Badge Metadata:** Bold 11–12pt (เช่น `BETA`, `DEK70`, `5 ข้อ`, `10 ข้อ`)
* **Numerical Timers & Counts:** Monospace / Tabular Figures สำหรับตัวเลขนับเวลา (`19:01:35`, `82 วัน 01:26`)

### 3.3 Shape, Radius & Elevation

* **Card Corner Radius:** `16px` ถึง `20px` ขอบมนกำลังดี ให้ความรู้สึกเป็นมิตรและทันสมัย
* **Button & Pill Radius:** `9999px` (Full Rounded / Capsule Shape) ใช้กับปุ่ม CTA เช่น `อันดับของคุณ #7822 >`, `เริ่มทำ ▶`, และ Segmented Tabs
* **Squircle App Icons:** ไอคอนฟีเจอร์หลักใช้ทรง Squircle 3 มิติ (3D Illustration Style) มีแสงเงาไล่ระดับ (Gradient Depth)
* **Elevation & Shadows:** ไม่ใช้เงาฟุ้งแบบดั้งเดิม แต่ใช้ **Border Contrast (`1px solid #262F40`)** ร่วมกับพื้นผิวต่างระดับ เพื่อความคมชัดบนหน้าจอ OLED/Retina

---

## 4. รายละเอียดและสเปกของแต่ละคอมโพเนนต์ (Component Deep Dive)

### 4.1 Dashboard Social Leaderboard Widget
* **Layout:** แสดง 4–8 อันดับแรกแบบ Grid ในแนวนอน พร้อมรูปมาสคอต Allie ของแต่ละคน
* **Gamification Elements:**
  * อันดับ 1–3 แสดงเหรียญรางวัล ทอง, เงิน, ทองแดง
  * สัญลักษณ์เปลวไฟพร้อมตัวเลขวันที่อ่านหนังสือต่อเนื่อง (Streak Days) เช่น `🔥 42`
  * เวลาสะสมการอ่านของวัน (เช่น `19:01:35`)
* **Floating Sticky CTA:** มีแถบสีส้มลอยด้านล่างของ Widget แสดงสถานะของผู้ใช้เองทันที เช่น `🏆 อันดับของคุณ #7822 >` เพื่อให้ผู้ใช้ไม่ต้องเลื่อนหาตัวเอง

### 4.2 Exam Countdown Hero Banner
* **Structure:** พื้นหลังสีส้มสดใส ดึงดูดสายตาทันทีที่เปิดแอป
* **Content:**
  * ฝั่งซ้าย: โลโก้นาฬิกาทราย + ชื่อสนามสอบ (`TGAT/TPAT2-5`) + วันที่สอบจริง (`30 ม.ค. 70`)
  * ฝั่งขวา: กล่องนับถอยหลัง 3 ช่อง (วัน / ชั่วโมง / นาที)
  * Indicator Dots ด้านล่างสำหรับ Swipe ดูสนามสอบอื่น (เช่น A-Level, กสพท)

### 4.3 Feature Cards Grid (2x2 Matrix)
* ออกแบบด้วยสูตรสม่ำเสมอ:
  1. **Top Badge:** ชิปบอกสถานะ เช่น `TGAT1 Vocab · DEK70`, `★ ใหม่`, `⚗ BETA`
  2. **Left Graphic:** ไอคอน 3D ทรง Squircle ขนาดใหญ่ สื่อความหมายชัดเจน
  3. **Center Copy:** ชื่อฟีเจอร์หนา 1 บรรทัด + คำบรรยายประโยชน์สั้นๆ 2 บรรทัด
  4. **Right Affordance:** ปุ่มวงกลมสีขาวพร้อมลูกศรชี้ขวา (`→`) สร้างความชัดเจนในการกด (Clickability Affordance)

### 4.4 Multi-Step Practice Stepper Flow
* **Step 1: เลือกวิชา (Subject Selection):**
  * แสดงการ์ดวิชาแบบ Visual Card พร้อมสีประจำวิชา (TGAT1=ฟ้า, TGAT2=คราม, Bio=เขียว, TPAT3=แดง, Math=ส้ม)
  * มีตัวเลขระบุจำนวนรูปแบบโจทย์ชัดเจน เช่น `5 Question Types`, `17 Question Types`
* **Step 2: ตั้งค่าโจทย์ (Quiz Customization):**
  * **2-Column Layout:** ซ้ายเลือกหัวข้อย่อย ขวาตั้งค่าเงื่อนไข
  * **Quick Batch Action:** ปุ่ม `🔀 สุ่มทุกประเภท` ด้านบน สำหรับคนที่ไม่อยากเลือกทีละบท
  * **Sub-topic Gear (`⚙`):** แต่ละหัวข้อมีไอคอนฟันเฟืองสำหรับเข้าไปติ๊กเลือกบทย่อยเฉพาะเจาะจงได้
  * **Segmented Pills:** ปรับจำนวนข้อได้ทันที (`5 ข้อ`, `10 ข้อ`, `20 ข้อ`)
  * **Toggles with Icons:** สวิตช์เปิด-ปิด แสดงเฉลย (หลอดไฟ) และ จับเวลา (นาฬิกาจับเวลา)
  * **Dual Action Footer:** ปุ่มเล่นกับเพื่อน (`👥 เล่นกับเพื่อน`) ควบคู่กับปุ่มเริ่มเดี่ยว (`เริ่มทำ ▶`)

### 4.5 Floating Bottom Navigation Dock
* เป็นแคปซูลลอยตัวเหนือบาร์ล่างของหน้าจอ ไม่ติดขอบล่าง 100%
* แท็บตรงกลาง (จับเวลา) เป็นวงกลมสีส้มขนาดใหญ่กว่าแท็บอื่น และมีแสงเรือง (Glow Effect) เพื่อกระตุ้นให้ผู้ใช้กดเริ่มจับเวลาอ่านหนังสือบ่อยที่สุด

---

## 5. การวิเคราะห์จุดแข็ง จุดที่ควรพัฒนา และโอกาสในการออกแบบ (UX Analysis)

### จุดแข็ง (UX Strengths ที่ควรนำมาเป็นแบบอย่าง)
1. **Strong Value-Driven Hierarchy:** จัดเรียงลำดับความสำคัญได้ดีมาก ผู้ใช้เปิดแอปมาจะเห็น (1) เวลาที่เหลือในการเตรียมตัว (2) อันดับของตนเองและเพื่อน และ (3) ทางลัดเข้าสู่การฝึกทำข้อสอบทันที
2. **High-Engagement Gamification:** การใช้มาสคอต Allie และระบบ EXP เชื่อมโยงกับชั่วโมงการอ่านหนังสือจริง เปลี่ยนความเครียดจากการสอบให้เป็นเกมการพัฒนาตัวละคร
3. **Clear Dual-Mode Affordance:** รองรับทั้งการเรียนคนเดียวแบบมุ่งมั่น (Solo Focus) และการท้าทายกับกลุ่มเพื่อน (Multiplayer / Peer Challenge)
4. **Optimized for Tablet / iPad Form Factor:** ในหน้าตั้งค่าโจทย์ การแบ่งฝั่งซ้าย-ขวา (Two-Column) ใช้พื้นที่แนวนอนของแท็บเล็ตได้อย่างมีประสิทธิภาพ ไม่ปล่อยให้หน้าจอว่างเกินไป

### จุดที่ควรระวังและแนวทางปรับปรุง (UX Considerations & Friction Points)
1. **Tap Target Precision ในหน้าเลือกหัวข้อ:** ในการ์ดหมวดหมู่โจทย์ มีทั้งตัวการ์ด, ไอคอนรูปภาพ, ปุ่มฟันเฟือง `⚙` และ Checkbox รวมอยู่ในพื้นที่เล็ก หากผู้ใช้แตะไม่ตรงอาจเกิดความสับสนระหว่างการ "เลือกหัวข้อ" กับการ "เปิดเมนูตั้งค่าย่อย"
   * *คำแนะนำ:* ควรทำให้การแตะที่บริเวณใดก็ได้บนตัวการ์ดเป็นการ Toggle Checkbox โดยอัตโนมัติ และแยกปุ่ม `⚙` ให้มี Hitbox ชัดเจน
2. **Fail-Closed Validation Feedback:** เมื่อยังไม่ได้เลือกหมวดหมู่โจทย์ ปุ่ม `เริ่มทำ ▶` ยังคงแสดงเป็นสีส้ม แต่เมื่อกดแล้วไม่มีการทำงานใดๆ
   * *คำแนะนำ:* ควรเปลี่ยนสถานะปุ่มเป็น Disabled (สีเทาจางพร้อมเปอร์เซ็นต์ความโปร่งแสง 50%) หรือแสดง Toast/Snackbar แจ้งเตือนว่า *"กรุณาเลือกอย่างน้อย 1 หัวข้อ"*
3. **Banner Cognitive Load:** ส่วนล่างของ Dashboard มีแบนเนอร์โปรโมตการสอบจริง ซึ่งมีรายละเอียดและตัวหนังสือค่อนข้างแน่น อาจแย่งความสนใจจากปุ่มเมนูหลัก
   * *คำแนะนำ:* ใช้สไตล์ Minimal Banner ที่เน้น CTA เดียว เช่น *"สมัคร Pre-TCAS70 รับข้อสอบถึงบ้าน"* พร้อมปุ่มเดียว

---

## 6. แนวทางการนำไปประยุกต์ใช้ในการออกแบบระบบใหม่ (Design Guidelines for New Projects)

เมื่อนำแนวคิดของ AllTCAS ไปพัฒนาแอปพลิเคชันหรือแพลตฟอร์มการเรียนรู้/การทำงาน:

```
[Design Rule Checklist]
✔ Background: ใช้ Deep Slate (#0D111A) แทน Pure Black (#000000) เพื่อลด Contrast Harshness
✔ Primary Accent: ใช้สีส้ม (#FF6D00) เฉพาะจุดที่เป็น Action สำคัญที่สุด (Timer, Submit, CTA)
✔ Data Chunking: ข้อมูลสถิติและเวลาต้องใช้ Monospace Font / Tabular Figures เสมอ
✔ Stepper Pattern: แยกขั้นตอนการทำงานซับซ้อนให้ไม่เกิน 2–3 ขั้นตอน พร้อม Breadcrumb ด้านบน
✔ Empty State & Microcopy: ทุกหน้าหมวดหมู่ที่ยังไม่พร้อม ให้มีป้ายกำกับ "เร็วๆ นี้" พร้อมระบุ Roadmap ชัดเจน
✔ Tactile Feedback: ให้มี Affordance ชัดเจนเมื่อ Hover/Press ด้วยการยกความสว่างของ Card ขึ้น 5–8%
```

---

## 7. การปรับตัวของเลย์เอาต์แนวตั้ง (Portrait Responsive Adaptation)

จากการตรวจสอบหน้าจอ iPad เมื่อหมุนเป็น **แนวตั้ง (Portrait)** แอปพลิเคชันปรับโครงสร้างและสถาปัตยกรรมข้อมูลเพื่อการใช้งานมือเดียว/แนวตั้งอย่างเป็นระบบ ดังนี้:

### 7.1 ลำดับการเรียงเนื้อหาในแนวตั้ง (Single Vertical Scroll Stream)
ในแนวตั้ง เลย์เอาต์จะเปลี่ยนจาก Multi-Column Split ของแนวนอนเป็น **Single Vertical Column** ที่ผู้ใช้สามารถไถฟีดเลื่อนลงได้อย่างเป็นธรรมชาติ:

1. **Top App Bar:** Hamburger Menu | โลโก้ AllTCAS | Quick Toggle | Search | Bell แจ้งเตือน (Badge `1`)
2. **Study Leaderboard Card (Top 100):**
   - แถวบน: อันดับ 1–4 แสดงอวตารมาสคอต Allie, เหรียญรางวัล (ทอง/เงิน/ทองแดง), วันที่ Streak (`🔥 42`), ชื่อผู้ใช้, และเวลาอ่านหนังสือ (`19:01:35`)
   - แถวล่าง: อันดับ 5–8 แสดงแบบจางลง (Dimmed) อยู่ใต้ปุ่มลอย
   - **Floating User Rank Pill:** ปุ่มสีส้มทึบ `🏆 อันดับของคุณ #7825 >` ลอยอยู่กึ่งกลางทับขอบล่างของการ์ดลีดเดอร์บอร์ด เพื่อให้ผู้ใช้กดดูตำแหน่งตนเองได้ทันทีโดยไม่ต้องเลื่อนหา
3. **Hero Countdown Banner (TGAT/TPAT2-5):**
   - แบนเนอร์สีส้มเต็มความกว้าง (Full-width Solid Orange)
   - ฝั่งซ้าย: โลโก้นาฬิกาทราย + ชื่อสนามสอบ `TGAT/TPAT2-5` + วันที่สอบ `สอบ 30 ม.ค. 70`
   - ฝั่งขวา: 3 การ์ดตัวเลขนับถอยหลัง `82 วัน` | `01 ชั่วโมง` | `24 นาที`
   - จุด Indicator 3 จุดด้านล่าง (Active Pill สีส้ม + 2 จุดสีเทา)
4. **Horizontal Quick Actions Bar:**
   - 5 ไอคอนเรียงตามแนวนอนพร้อมชิประบุสถานะ:
     * `AI Tutor` (ชิป `BETA` สีเขียวนีออน)
     * `ทบทวน` (Badge แจ้งเตือนสีแดง `1`)
     * `All Exam` (ชิป `NEW` สีเขียว)
     * `โจทย์ที่บันทึก` (ไอคอน Bookmark)
     * `เพิ่ม/แก้ไข` (ไอคอน `+` เส้นประ)
5. **Core Feature 2x2 Grid:**
   - ปรับเป็นกริด 2 คอลัมน์ × 2 แถว ที่มีความสูงกะทัดรัดขึ้น เหมาะกับการแตะด้วยนิ้ว:
     * ซ้ายบน: **TCAS Practice** (ไอคอนกระดานคลิปบอร์ดฟ้า, Subtitle `TGAT TPAT A-Level`)
     * ขวาบน: **All Vocab** (ป้าย `DEK70` สีม่วง, ไอคอนสมุดส้ม, Subtitle `คลังคำศัพท์อังกฤษ`)
     * ซ้ายล่าง: **All Exam** (ป้าย `ใหม่` สีเขียว, ไอคอนกระดาษคำตอบ OMR เขียว, Subtitle `Mock Exam แนวข้อสอบ`)
     * ขวาล่าง: **All Notes** (ป้าย `BETA` สีฟ้า, ไอคอนสมุดม่วงพร้อม Stylus, Subtitle `จดโน้ตด้วยปากกา`)
6. **Promotional Banner (Pre-TCAS70 Mock Exam):**
   - การ์ดสองคอลัมน์แนวนอน: ฝั่งซ้ายเป็นข้อความและราคา `เริ่มต้นชุดละ 59 บาท!` + Bullet points `✔` / ฝั่งขวาเป็นรูปเล่มข้อสอบจริงซ้อนกันแบบ Perspective 3 มิติ
7. **Bottom Dock (5 Tabs):**
   - ยึดติดที่ขอบล่างของหน้าจอ พร้อมปุ่มจับเวลาตรงกลางขนาดใหญ่

### 7.2 ตารางเปรียบเทียบการปรับตัว Landscape vs. Portrait

| มิติการออกแบบ (Dimension) | แนวนอน (Landscape) | แนวตั้ง (Portrait) |
|---|---|---|
| **Viewport Ratio** | กว้าง เน้น Side-by-Side (16:9 / 4:3 Wide) | สูง เน้น Vertical Hierarchy (3:4 / 9:16 Tall) |
| **Leaderboard Presentation** | แสดง Ranks 1–8 ในแถวเดียว กว้างเต็มพื้นที่ | แบ่งเป็น 2 แถว (1–4 ด้านบน, 5–8 ด้านล่างแบบ Dimmed ใต้ Floating Pill) |
| **Feature Grid** | การ์ดมีพื้นที่คำบรรยาย 2–3 บรรทัด พร้อมปุ่มลูกศรขาว `→` | ตัดปุ่มลูกศรออก ใช้การ์ดขนาดกะทัดรัด (Compact Squircle) + Title + Subtitle สั้น |
| **Quick Actions** | แสดงเป็นปุ่มทางลัดด้านบนพร้อมปุ่ม "ดูเพิ่มเติม ∨" | เป็นบาร์แถวเดียว 5 ไอคอน พร้อมปุ่ม `+ เพิ่ม/แก้ไข` |
| **Reachability & Ergonomics** | เน้นการวางบนโต๊ะหรือใช้สองมือจับด้านข้าง | รองรับการถือมือเดียวหรือใช้มือข้างที่ถนัดสกรอลล์ได้อย่างรวดเร็ว |

---

## 8. โครงสร้างเมนูสไลด์ด้านข้าง (Navigation Drawer & Sidebar Architecture)

เมื่อแตะที่ไอคอน Hamburger Menu (พิกัด $X \approx 170\text{px}, Y \approx 130\text{px}$) เมนูสไลด์ด้านข้าง (Drawer) จะเลื่อนออกมาจากขอบซ้าย โดยกินพื้นที่ประมาณ 40% ของความกว้างหน้าจอ พร้อมกับมีพื้นหลังด้านหลังมืดลง (Scrim / Dimmed Backdrop):

```
┌──────────────────────────────────────┐
│ [Avatar] Nattapan Seksansukat...     │
│          @mooslide                   │
├──────────────────────────────────────┤
│ 🔔 การแจ้งเตือน                 [1] >│
│ 📢 มีอะไรใหม่?                  [•] >│
│ ✨ Who Are You                      >│
│ 🏆 เควสการเรียนรู้                  >│
│ ⏰ Study Alarm                      >│
│ 🪄 AI Tutor                         >│
│ ⨍x เครื่องแก้สมการ                 >│
│ 🐥 Allie ของฉัน                 [3] >│
│ 🔖 คลังคำของฉัน                     >│
│ ✏️ แก้ไขโปรไฟล์                     >│
├──────────────────────────────────────┤
│ ◐ ธีม                                │
│ [ ☀️ สว่าง | 📱 ระบบ | 🌙 มืด (Active) ] │
├──────────────────────────────────────┤
│ ⚙️ ตั้งค่า                          >│
│ ❓ ช่วยเหลือ และเกี่ยวกับ            >│
│ ☁️ บริจาคโจทย์                      >│
│ ⚠️ แจ้งปัญหา-เสนอแนะ                >│
│ 🤍 ติดตามเรา                        >│
│ 🎁 Donate ให้ทีมพัฒนา               >│
├──────────────────────────────────────┤
│ 🚪 ออกจากระบบ (สีแดง)                │
└──────────────────────────────────────┘
```

### 8.1 องค์ประกอบหลักใน Drawer (Categorized Breakdown)

1. **User Identity Header:**
   - Avatar วงกลมขนาดใหญ่
   - Display Name (`Nattapan Seksansukatikul (Mark)`)
   - Handle (`@mooslide`)
2. **Learning Tools & Personal Hub:**
   - **การแจ้งเตือน (Notifications):** มี Badge วงกลมสีแดงระบุตัวเลข `1`
   - **มีอะไรใหม่? (What's New?):** มีจุดเตือนสีแดง (Red Dot indicator) สำหรับอัปเดตฟีเจอร์ใหม่
   - **Who Are You:** ค้นหาตัวตนและสไตล์การเรียน
   - **เควสการเรียนรู้ (Learning Quests):** ภารกิจสะสมคะแนน
   - **Study Alarm:** ระบบตั้งเวลาเตือนความจำสำหรับอ่านหนังสือ
   - **AI Tutor:** ผู้ช่วยตอบข้อสงสัยการเรียน
   - **เครื่องแก้สมการ (Equation Solver):** ตัวช่วยคำนวณคณิตศาสตร์และวิทยาศาสตร์
   - **Allie ของฉัน (My Allie):** มี Badge สีแดง `3` แสดงจำนวนไอเทม/การอัปเกรดที่รออยู่
   - **คลังคำของฉัน (Word Vault):** บุ๊กมาร์กคำศัพท์ที่เซฟไว้
   - **แก้ไขโปรไฟล์ (Edit Profile):** เปลี่ยนข้อมูลส่วนตัว
3. **Theme Switcher Component:**
   - ใช้ Segmented Control 3 ตัวเลือกในแถวเดียว:
     * `สว่าง` (Light - ไอคอนดวงอาทิตย์)
     * `ระบบ` (System - ไอคอนอุปกรณ์)
     * `มืด` (Dark - ไอคอนพระจันทร์เสี้ยว - Active อยู่ในปัจจุบัน)
4. **Community & Contribution:**
   - **บริจาคโจทย์ (Donate Questions):** ฟีเจอร์ Crowd-sourced ข้อสอบจากนักเรียนและติวเตอร์
   - **แจ้งปัญหา-เสนอแนะ (Feedback & Bug Report):** ช่องทางสื่อสารโดยตรงกับทีมงาน
   - **Donate ให้ทีมพัฒนา (Support Developers):** ปุ่มสนับสนุนทีมผู้พัฒนา
5. **System Footer:**
   - **ออกจากระบบ (Log Out):** ใช้สีแดงเตือน (`#EF4444`) ทั้งไอคอนและตัวอักษร แยกความแตกต่างชัดเจนจากเมนูทั่วไป

---

## 9. สถาปัตยกรรมหน้าก่อนเข้าสู่ระบบ (Pre-Login & Authentication Architecture)

หน้าต้อนรับและลงชื่อเข้าใช้งาน (Landing / Auth Screen) ถูกออกแบบด้วยแนวคิด **Minimalist & Zero-Friction Onboarding** โดยเปลี่ยนจาก Dark Mode ภายในแอป มาเป็นหน้าจอพื้นหลัง **สีขาวสะอาดตา (Pure White `#FFFFFF`)**:

```
┌──────────────────────────────────────┐
│                                      │
│               [Logo]                 │
│              AIITCAS                 │
│                                      │
│        ┌───┐                         │
│        │ ↑ │                         │
│    ┌───┼───┼───┐                     │
│    │ ← │   │   │  (3D Net / Box)     │
│    └───┼───┼───┘                     │
│        │   │                         │
│        └───┘                         │
│                                      │
│  [ ● ดำเนินการต่อด้วย Google       ]  │
│  [  Continue with Apple           ]  │
│                                      │
│               ── หรือ ──              │
│                                      │
│  [ 👤 เข้าสู่ระบบสำหรับเจ้าหน้าที่  ]  │
│                                      │
│    🏷️ ฉันมี code เชิญจากเพื่อน         │
│          login ไม่ได้                │
│                                      │
│ เมื่อดำเนินการต่อ ถือว่าคุณยินยอมตาม      │
│ <u>ข้อกำหนดการใช้งาน</u> และรับทราบ         │
│ <u>นโยบายความเป็นส่วนตัว</u> ของ AIITCAS │
└──────────────────────────────────────┘
```

### 9.1 การวิเคราะห์องค์ประกอบหลัก (Deep Dive Breakdown)

1. **Branding & Visual Metaphor (การสื่อสารเชิงสัญลักษณ์):**
   - **Logo:** ตัวอักษร `A` สีส้มสดใสที่ดัดแปลงมาจากไม้บรรทัดพับสถาปัตย์และวงเวียนเรขาคณิต เคียงคู่กับตัวพิมพ์ใหญ่หนา `AIITCAS`
   - **Hero Illustration:** ภาพ Isometric Blueprint คลี่กล่อง 3 มิติ (3D Spatial Net Folding) สีน้ำเงินเข้มและฟ้า ซึ่งเป็นรูปแบบข้อสอบ **มิติสัมพันธ์ (Spatial Aptitude)** ยอดนิยมของสนามสอบ TPAT3 และ TPAT4
   - **Implicit Domain Communication:** ไม่จำเป็นต้องมีสโลแกนยาวๆ ตัวภาพลูกบาศก์คลี่กล่องสามารถสื่อสารกับเด็กนักเรียน ม.ปลาย (DEK) ได้ทันทีว่าแอปนี้สร้างมาเพื่อการเตรียมสอบข้อสอบแนวนี้
2. **Authentication Flow (การเข้าสู่ระบบแบบไร้แรงเสียดทาน):**
   - **Primary Action (Social OAuth):** ใช้ปุ่มทรงแคปซูลสีดำทึบ (`#000000`) 2 ตัวเลือกหลัก:
     * `ดำเนินการต่อด้วย Google` (พร้อมโลโก้ Google 4 สี)
     * `Continue with Apple` (พร้อมโลโก้ Apple สีขาว)
     * *ข้อดีทาง UX:* ไม่ต้องให้เด็กจำรหัสผ่านหรือกรอกแบบฟอร์มยาวๆ แตะเพียงครั้งเดียวสามารถเข้าสู่ระบบและเริ่มทำโจทย์ได้ทันที
   - **Role Separation (การแบ่งบทบาทผู้ใช้):**
     * มีปุ่มสีขาวขอบเทาอ่อน `👤 เข้าสู่ระบบสำหรับเจ้าหน้าที่` (Staff/Admin Portal) แยกออกจากโฟลว์ของนักเรียนทั่วไปอย่างชัดเจน
3. **Growth & Referral Mechanics (กลไกการบอกต่อ):**
   - ลิงก์สีส้มพร้อมไอคอนแท็กตั๋ว: `🏷️ ฉันมี code เชิญจากเพื่อน` เป็นกลไก Viral Loop ที่เปิดให้กรอก Referral Code เพื่อรับสิทธิพิเศษหรือ EXP โบนัสทั้งผู้ชวนและผู้สมัคร
4. **Error Recovery & Help:**
   - ลิงก์สีส้มขีดเส้นใต้: `login ไม่ได้` สำหรับส่งต่อไปยังช่องทางช่วยเหลือหรือรีเซ็ตบัญชี
5. **Legal & Compliance:**
   - ข้อความกำกับด้านล่างสุด ระบุการยอมรับ **ข้อกำหนดการใช้งาน** และ **นโยบายความเป็นส่วนตัว** พร้อมขีดเส้นใต้ลิงก์ไปยังเอกสารกฎหมายอย่างโปร่งใส

---

*เอกสารฉบับนี้ถูกสังเคราะห์ขึ้นจากการสำรวจและทดสอบอินเทอร์เฟซจริงบนอุปกรณ์ iPad ทั้งในแนวนอน (Landscape), แนวตั้ง (Portrait), โครงสร้าง Sidebar Drawer, และหน้า Pre-Login Authentication อย่างละเอียดผ่านระบบอัตโนมัติ พร้อมสำหรับนำไปใช้อ้างอิงในงานออกแบบ UI/UX ต่อไป*
