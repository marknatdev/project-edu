/// Curated Topic Card for Socratic Research Discovery
class TopicCard {
  final String id;
  final String subject;
  final String title;
  final String phenomenon;
  final String curiosityHook;
  final String independentVar;
  final String dependentVar;
  final List<String> controlVars;
  final String difficulty;
  final int estimatedWeeks;
  final int estimatedBudgetBaht;
  final List<String> requiredEquipment;
  final bool isSafeSrc;
  final List<String> tags;

  const TopicCard({
    required this.id,
    required this.subject,
    required this.title,
    required this.phenomenon,
    required this.curiosityHook,
    required this.independentVar,
    required this.dependentVar,
    required this.controlVars,
    required this.difficulty,
    required this.estimatedWeeks,
    required this.estimatedBudgetBaht,
    required this.requiredEquipment,
    this.isSafeSrc = true,
    required this.tags,
  });
}

/// Curated Seed Topic Cards strictly aligned with YSC & ISEF Categories
const List<TopicCard> seedTopicCards = [
  TopicCard(
    id: 'cmp_ai_01',
    subject: 'คอมพิวเตอร์ & AI',
    title: 'ความแม่นยำของโมเดลตรวจจับใบหน้าเมื่อสวมหน้ากากในสภาพแสงสลัว',
    phenomenon: 'ระบบสแกนใบหน้าเข้าโรงเรียนทำงานผิดพลาดบ่อยครั้งเมื่อนักเรียนสวมหน้ากากอนามัย หรือเดินผ่านบริเวณชายคาที่มีแสงเงาย้อน',
    curiosityHook: 'โครงข่ายประสาทเทียมแบบ CNN สูญเสียฟีเจอร์สำคัญส่วนใดไปเมื่อใบหน้าส่วนล่างถูกบดบัง และมุมของแสงส่งผลต่อค่าความเชื่อมั่น (Confidence) อย่างไร?',
    independentVar: 'ระดับความสว่างของแสง (Lux) และรูปแบบการสวมหน้ากาก',
    dependentVar: 'ค่าความแม่นยำ (mAP / Accuracy) และเวลาในการตรวจจับ (ms)',
    controlVars: ['ระยะห่างระหว่างกล้องกับใบหน้า (1.5 ม.)', 'ความละเอียดกล้อง (1080p)', 'ชุดข้อมูลใบหน้าเดียวกัน'],
    difficulty: 'ปานกลาง',
    estimatedWeeks: 6,
    estimatedBudgetBaht: 0,
    requiredEquipment: ['โน้ตบุ๊กประมวลผล / Google Colab', 'เว็บแคมมาตรฐาน', 'แอปพลิเคชันวัดค่าแสง Lux'],
    isSafeSrc: true,
    tags: ['Computer Vision', 'CNN', 'Edge AI'],
  ),
  TopicCard(
    id: 'cmp_ai_02',
    subject: 'คอมพิวเตอร์ & AI',
    title: 'การตรวจจับระดับความสุกของกล้วยน้ำว้าด้วยการวิเคราะห์สเปซสี HSV',
    phenomenon: 'กล้วยน้ำว้าที่พร้อมจำหน่ายมีระดับความสุกแตกต่างกันและมีจุดกระสีน้ำตาลกระจายตัว ทำให้การคัดแยกด้วยสายตามีความคลาดเคลื่อนสูง',
    curiosityHook: 'การแปลงสเปซสี RGB เป็น HSV และการวิเคราะห์ค่าความอิ่มตัวสี (Saturation) ช่วยให้การจัดเกรดความสุกทนทานต่อแสงธรรมชาติได้ดีกว่าเพียงใด?',
    independentVar: 'โมเดลสเปซสี (RGB vs HSV Histogram)',
    dependentVar: 'ความถูกต้องในการจัดระดับความสุก 5 ระดับ (Confusion Matrix)',
    controlVars: ['กล่องถ่ายภาพควบคุมแสง', 'ระยะโฟกัสกล้องคงที่', 'สายพันธุ์กล้วยน้ำว้าเดียวกัน'],
    difficulty: 'ง่าย',
    estimatedWeeks: 4,
    estimatedBudgetBaht: 350,
    requiredEquipment: ['สมาร์ตโฟนสำหรับถ่ายภาพ', 'กล่องโฟมควบคุมแสง', 'คอมพิวเตอร์รัน Python / OpenCV'],
    isSafeSrc: true,
    tags: ['Image Processing', 'OpenCV', 'Smart Agriculture'],
  ),
  TopicCard(
    id: 'bio_sci_01',
    subject: 'ชีววิทยา & สุขภาพ',
    title: 'ประสิทธิภาพสารสกัดแทนนินจากเปลือกมังคุดในการยับยั้งเชื้อราบนแผ่นยางพารา',
    phenomenon: 'แผ่นยางพาราดิบในฤดูฝนมักเกิดเชื้อราจุดขาวและจุดดำ ทำให้ราคาผลผลิตตกต่ำ เกษตรกรนิยมใช้สารเคมีสังเคราะห์ที่มีกลิ่นฉุนและอันตราย',
    curiosityHook: 'สารสกัดแทนนินจากเปลือกมังคุดเหลือทิ้งที่ความเข้มข้นต่างกัน สามารถยับยั้งการเจริญเติบโตของเส้นใยราได้เทียบเท่าสารเคมีสังเคราะห์หรือไม่?',
    independentVar: 'ความเข้มข้นของสารสกัดเปลือกมังคุด (5%, 10%, 15%, 20%)',
    dependentVar: 'เส้นผ่านศูนย์กลางของวงยับยั้งการเจริญ (Inhibition Zone, มม.)',
    controlVars: ['สายพันธุ์เชื้อราทดสอบ', 'อุณหภูมิและความชื้นห้องบ่ม (28°C)', 'ปริมาตรหยดสารสกัด (20 uL)'],
    difficulty: 'ปานกลาง',
    estimatedWeeks: 6,
    estimatedBudgetBaht: 650,
    requiredEquipment: ['เปลือกมังคุดอบแห้ง', 'เอทานอลสกัด', 'จานเพาะเลี้ยงอาหารวุ้น PDA', 'ตู้บ่มเชื้อ'],
    isSafeSrc: true,
    tags: ['Bio-fungicide', 'Circular Economy', 'Natural Extract'],
  ),
  TopicCard(
    id: 'phy_eng_01',
    subject: 'ฟิสิกส์ & พลังงาน',
    title: 'การเพิ่มประสิทธิภาพแผงโซลาร์เซลล์ด้วยระบบระบายความร้อนด้วยท่อเทอร์โมไซฟอนน้ำ',
    phenomenon: 'เมื่อแผงโซลาร์เซลล์รับแสงแดดจัด อุณหภูมิผิวแผงอาจพุ่งสูงเกิน 60°C ส่งผลให้แรงดันไฟฟ้าตกและประสิทธิภาพการผลิตไฟฟ้าลดลงอย่างเห็นได้ชัด',
    curiosityHook: 'การใช้ระบบท่อถ่ายเทความร้อนแบบ Thermosiphon แบบไม่ใช้ปั๊มไฟฟ้า สามารถลดอุณหภูมิผิวแผงและกู้คืนกำลังไฟฟ้ากลับมาได้กี่วัตต์?',
    independentVar: 'อัตราการไหลเวียนและอุณหภูมิของสารระบายความร้อนในท่อ',
    dependentVar: 'อุณหภูมิผิวแผง (°C) และกำลังไฟฟ้าที่ผลิตได้ (Watt, P = V x I)',
    controlVars: ['ความเข้มแสงแดดตกกระทบ (W/m²)', 'มุมเอียงของแผง (15 องศา)', 'ขนาดแผงโซลาร์ 20W'],
    difficulty: 'ท้าทาย',
    estimatedWeeks: 8,
    estimatedBudgetBaht: 1200,
    requiredEquipment: ['แผงโซลาร์เซลล์ 20W x2', 'ท่อทองแดงระบายความร้อน', 'เซนเซอร์วัดอุณหภูมิ DS18B20', 'มัลติมิเตอร์บันทึกค่า'],
    isSafeSrc: true,
    tags: ['Clean Energy', 'Thermodynamics', 'Solar PV'],
  ),
  TopicCard(
    id: 'rob_emb_01',
    subject: 'วิศวกรรม & หุ่นยนต์',
    title: 'การชดเชยค่าความคลาดเคลื่อนของเซนเซอร์วัดค่าฝุ่น PM2.5 ด้วยฟิลเตอร์คาลมาน (Kalman Filter)',
    phenomenon: 'เซนเซอร์วัดฝุ่นราคาประหยัดแบบ Optical Scattering มักมีสัญญาณรบกวน (Noise) สูงเมื่อมีความชื้นในอากาศหรือลมพัดกรรโชก',
    curiosityHook: 'อัลกอริทึม Kalman Filter เชิงเส้น สามารถกรองสัญญาณรบกวนของเซนเซอร์ PMS7003 ให้เทียบเคียงเครื่องวัดมาตรฐานกรมควบคุมมลพิษได้แม่นยำขึ้นเพียงใด?',
    independentVar: 'พารามิเตอร์เมทริกซ์ความแปรปรวนร่วม (Covariance Q และ R) ใน Kalman Filter',
    dependentVar: 'ค่าเฉลี่ยความคลาดเคลื่อนกำลังสอง (RMSE) เมื่อเทียบกับสถานีตรวจวัดมาตรฐาน',
    controlVars: ['ตำแหน่งติดตั้งเซนเซอร์ข้างสถานีวัดจริง', 'อัตราการสุ่มตัวอย่าง (1 ครั้งต่อ 10 วินาที)'],
    difficulty: 'ท้าทาย',
    estimatedWeeks: 7,
    estimatedBudgetBaht: 850,
    requiredEquipment: ['บอร์ด ESP32 / Arduino', 'เซนเซอร์วัดฝุ่น PMS7003', 'เซนเซอร์ความชื้น BME280', 'SD Card Data Logger'],
    isSafeSrc: true,
    tags: ['Signal Processing', 'Kalman Filter', 'Environmental IoT'],
  ),
  TopicCard(
    id: 'env_mat_01',
    subject: 'สิ่งแวดล้อม',
    title: 'การดูดซับไอออนโลหะหนักตะกั่ว (Pb2+) ในน้ำเสียด้วยไบโอชาร์จากชานอ้อยดัดแปรผิว',
    phenomenon: 'น้ำทิ้งจากห้องปฏิบัติการและโรงชุบโลหะปนเปื้อนไอออนโลหะหนัก สารดูดซับทางการค้าเช่นถ่านกัมมันต์มีราคาสูงเกินไปสำหรับชุมชน',
    curiosityHook: 'ไบโอชาร์จากชานอ้อยที่ผ่านการเผาไพโรไลซิสและกระตุ้นด้วยกรดซิตริกจากเปลือกมะนาว มีความจุในการดูดซับตะกั่วสูงขึ้นกี่มิลลิกรัมต่อกรัม?',
    independentVar: 'ชนิดและความเข้มข้นของสารกระตุ้นพื้นผิวชีวมวล',
    dependentVar: 'ร้อยละการกำจัดตะกั่ว (% Removal) และความจุการดูดซับ (mg/g)',
    controlVars: ['เวลาสัมผัส (Contact Time 60 นาที)', 'ค่า pH ของสารละลาย (pH 5.0)', 'มวลของตัวดูดซับ (0.5 กรัม)'],
    difficulty: 'ท้าทาย',
    estimatedWeeks: 8,
    estimatedBudgetBaht: 900,
    requiredEquipment: ['ชานอ้อยแห้ง', 'เตาเผาไพโรไลซิสแบบปิด', 'ชุดทดสอบสารละลายตะกั่ว', 'เครื่องเขย่าสารละลาย'],
    isSafeSrc: true,
    tags: ['Biochar', 'Water Remediation', 'Adsorption Isotherm'],
  ),
];
