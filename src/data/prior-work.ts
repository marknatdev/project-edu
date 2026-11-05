import type { VerifiedPriorWork } from '@/types/domain';

/**
 * Verified Prior Work Database (งานที่คล้ายกันที่มีอยู่จริง)
 *
 * Real Thai student competition projects (YSC, NSC, ISEF Thailand) and
 * peer-reviewed research papers from Thai Journals Online (ThaiJO).
 *
 * Every entry was strictly verified by fetching the live URL via web_extract,
 * capturing the exact observed page title, and timestamped on 2026-11-05.
 * Zero fabricated citations.
 */
export const PRIOR_WORK: VerifiedPriorWork[] = [
  // 1. Computer / AI / Assistive Tech
  {
    id: 'ibraille-isef2025',
    title: 'ไอเบรลล์ : การปฏิรูปการศึกษาเบรลล์อย่างเป็นระบบด้วย AI และเทคโนโลยีสัมผัสต้นทุนต่ำ เพื่อสังคมแห่งความเท่าเทียมที่ปราศจากการเลือกปฏิบัติ',
    authors: 'ศิวกร สุวรรณหงส์, ปัณณวิชญ์ พลนิรันดร์, ศตพร ธนปัญญากุล',
    year: 2025,
    competitionOrVenue: 'REGENERON ISEF 2025 (Grand Award 1st Place)',
    url: 'https://www.nstda.or.th/home/news_post/isef-20250518',
    summary: 'แพลตฟอร์มการเรียนรู้อักษรเบรลล์แบบปฏิสัมพันธ์ที่ผสานระบบตรวจจับด้วยปัญญาประดิษฐ์และอุปกรณ์สัมผัสฮาร์ดแวร์ต้นทุนต่ำเพื่อช่วยผู้บกพร่องทางการมองเห็น',
    difference: 'ใช้ระบบประมวลผลภาพร่วมกับอุปกรณ์ตอบสนองเชิงกลต้นทุนต่ำแทนการใช้อุปกรณ์อักษรเบรลล์ไฟฟ้าราคาสูง',
    subfieldIds: ['comp_ai_ml', 'comp_software_app'],
    keywords: ['ไอเบรลล์', 'อักษรเบรลล์', 'AI', 'สัมผัส', 'ผู้พิการทางสายตา', 'braille', 'ปัญญาประดิษฐ์'],
    verifiedAt: '2026-11-05',
    observedTitle: 'สุดยอดเยาวชนไทย! กวาด 11 รางวัล บนเวที REGENERON ISEF 2025',
  },

  // 2. Applied Mathematics / Modeling / Fluid & Geometry
  {
    id: 'sprinkler-polar-isef2018',
    title: 'การศึกษาสมการเชิงขั้วของการกระจายตัวของน้ำจากหัวสปริงเกอร์ชนิดใบพัดแบบต่างๆ',
    authors: 'อดิศร ขันทอง, วิชยา เนตรมนต์ประภา, กุลณัฐ บูรณารมย์',
    year: 2018,
    competitionOrVenue: 'Intel ISEF 2018 (Grand Award 4th Place)',
    url: 'https://www.nectec.or.th/news/news-pr-news/result-isef2018.html',
    summary: 'การสร้างแบบจำลองทางคณิตศาสตร์ในรูปสมการเชิงขั้วเพื่ออธิบายและพยากรณ์รูปแบบการกระจายตัวของละอองน้ำจากหัวสปริงเกอร์ใบพัดแบบต่างๆ เพื่อเพิ่มประสิทธิภาพการชลประทาน',
    difference: 'อธิบายพลวัตของละอองน้ำด้วยระบบพิกัดเชิงขั้วเพื่อปรับปรุงรูปแบบการให้น้ำในแปลงเกษตรอย่างแม่นยำ',
    subfieldIds: ['math_applied', 'math_geometry'],
    keywords: ['สมการเชิงขั้ว', 'สปริงเกอร์', 'การกระจายตัวของน้ำ', 'เรขาคณิต', 'สมการคณิตศาสตร์', 'polar coordinates'],
    verifiedAt: '2026-11-05',
    observedTitle: 'เด็กไทยสุดเจ๋ง! คว้า 6 รางวัลใหญ่ จากการประกวดโครงงานวิทยาศาสตร์ระดับโลก Intel ISEF 2018 - NECTEC : National Electronics and Computer Technology Center',
  },

  // 3. Computer / Educational Web / Chemistry
  {
    id: 'wonder-bonding-nsc2018',
    title: 'สวนสนุกสู่โลกเสมือนพันธะเคมี : Wonder bonding land',
    authors: 'นักเรียนโรงเรียนปรินส์รอยแยลส์วิทยาลัย',
    year: 2018,
    competitionOrVenue: 'NSC 2018 (รางวัลที่ 1) / TICTA 2018',
    url: 'https://www.nectec.or.th/news/news-pr-news/ticta2018-nsc.html',
    summary: 'ซอฟต์แวร์จำลองเชิงโต้ตอบในรูปแบบเกมโลกเสมือนเพื่อช่วยให้นักเรียนเข้าใจโครงสร้างอะตอมและการสร้างพันธะเคมีแบบเห็นภาพจริง',
    difference: 'เน้นการสร้างปฏิสัมพันธ์แบบเกมสามมิติเพื่อลดความซับซ้อนของมโนทัศน์พันธะเคมีเชิงนามธรรม',
    subfieldIds: ['comp_software_app', 'sci_chemistry'],
    keywords: ['พันธะเคมี', 'เกมการศึกษา', 'โลกเสมือน', 'การเรียนรู้', 'ซอฟต์แวร์การศึกษา', 'interactive', 'เคมี'],
    verifiedAt: '2026-11-05',
    observedTitle: 'เยาวชน NSC 2018 คว้ารางวัลจากเวทีประกวดซอฟต์แวร์ดีเด่นแห่งชาติ (TICTA 2018) - NECTEC : National Electronics and Computer Technology Center',
  },

  // 4. Mathematics / Applied Modeling
  {
    id: 'math-modeling-sikkha',
    title: 'การพัฒนาการจัดการเรียนรู้โดยใช้แบบจำลองทางคณิตศาสตร์ เพื่อส่งเสริมความสามารถในการอภิปรายทางคณิตศาสตร์ เรื่อง การวัดความยาว',
    authors: 'อรอุมา ชินมาลา, น้ำทิพย์ องอาจวาณิชย์',
    year: 2025,
    competitionOrVenue: 'สิกขา วารสารศึกษาศาสตร์ มหาวิทยาลัยนเรศวร',
    url: 'https://so05.tci-thaijo.org/index.php/sikkha/article/view/272696',
    summary: 'การศึกษาแนวทางการใช้แบบจำลองทางคณิตศาสตร์เชื่อมโยงบริบทสถานการณ์ในชีวิตประจำวันเพื่ออธิบายการวัดและการแก้ปัญหาเชิงปริมาณ',
    difference: 'ใช้แบบจำลองทางคณิตศาสตร์เป็นเครื่องมือจำลองสถานการณ์จริงเพื่อกระตุ้นกระบวนการให้เหตุผลทางคณิตศาสตร์',
    subfieldIds: ['math_applied'],
    keywords: ['แบบจำลองทางคณิตศาสตร์', 'การวัดความยาว', 'คณิตศาสตร์ประยุกต์', 'การอภิปราย', 'modeling'],
    verifiedAt: '2026-11-05',
    observedTitle: 'การพัฒนาการจัดการเรียนรู้โดยใช้แบบจำลองทางคณิตศาสตร์ เพื่อส่งเสริมความสามารถในการอภิปรายทางคณิตศาสตร์ เรื่อง การวัดความยาว สำหรับนักเรียนชั้นประถมศึกษาปีที่ 3 | สิกขา วารสารศึกษาศาสตร์',
  },

  // 5. Discrete Mathematics / Graph Theory / TSP
  {
    id: 'shortest-path-ayutthaya-tsp',
    title: 'การหาเส้นทางที่สั้นที่สุดในการไหว้พระ 9 วัด ในจังหวัดพระนครศรีอยุธยา โดยใช้ตัวแบบปัญหาการเดินทางของพนักงานขาย',
    authors: 'รุ่งรัตน์ สมานหมู่',
    year: 2024,
    competitionOrVenue: 'วารสารวิทยาศาสตร์และเทคโนโลยี มหาวิทยาลัยราชภัฏบุรีรัมย์',
    url: 'https://ph02.tci-thaijo.org/index.php/scibru/article/view/252918',
    summary: 'การประยุกต์ใช้ทฤษฎีกราฟถ่วงน้ำหนักและตัวแบบปัญหาการเดินทางของพนักงานขาย (TSP) เพื่อคำนวณหาลำดับการเดินทางที่มีระยะทางรวมและเวลาสั้นที่สุด',
    difference: 'คำนวณเส้นทางเหมาะสมที่สุดด้วยอัลกอริทึมหาค่าเหมาะที่สุดบนเมทริกซ์ระยะทางจริงของสถานที่ท่องเที่ยว',
    subfieldIds: ['math_discrete', 'math_applied', 'comp_data_science'],
    keywords: ['เส้นทางสั้นที่สุด', 'ปัญหาการเดินทางของพนักงานขาย', 'TSP', 'ทฤษฎีกราฟ', 'กราฟถ่วงน้ำหนัก', 'shortest path'],
    verifiedAt: '2026-11-05',
    observedTitle: 'การหาเส้นทางที่สั้นที่สุดในการไหว้พระ 9 วัด ในจังหวัดพระนครศรีอยุธยา โดยใช้ตัวแบบปัญหาการเดินทางของพนักงานขาย | วารสารวิทยาศาสตร์และเทคโนโลยี มหาวิทยาลัยราชภัฏบุรีรัมย์',
  },

  // 6. Physics / Solar Energy & Energy Storage
  {
    id: 'supercapacitor-solar-charge',
    title: 'การศึกษาการเก็บประจุและการปล่อยประจุของตัวเก็บประจุยวดยิ่งร่วมกับแบตเตอรี่โดยใช้พลังงานแสงอาทิตย์เป็นแหล่งกำเนิดพลังงาน',
    authors: 'กิตติ กอบัวแก้ว, ประสิทธิ์ ภูสมมา',
    year: 2022,
    competitionOrVenue: 'วารสารเทคโนโลยีอุตสาหกรรมและการจัดการ มหาวิทยาลัยราชภัฏเลย',
    url: 'https://ph02.tci-thaijo.org/index.php/itm-journal/article/view/246567',
    summary: 'การศึกษาคุณลักษณะเชิงไฟฟ้าของการทำงานร่วมกันระหว่างตัวเก็บประจุยวดยิ่งและแบตเตอรี่เคมีโดยรับพลังงานจากแผงเซลล์แสงอาทิตย์เพื่อลดเวลาประจุไฟฟ้า',
    difference: 'ศึกษาพฤติกรรมทรานเชียนต์และอัตราการรับกระแสสูงของระบบไฮบริดตัวเก็บประจุยวดยิ่งกับพลังงานแสงอาทิตย์',
    subfieldIds: ['sci_physics'],
    keywords: ['ตัวเก็บประจุยวดยิ่ง', 'พลังงานแสงอาทิตย์', 'โซลาร์เซลล์', 'แบตเตอรี่', 'การเก็บประจุ', 'solar cell', 'ไฟฟ้า'],
    verifiedAt: '2026-11-05',
    observedTitle: 'การศึกษาการเก็บประจุและการปล่อยประจุของตัวเก็บประจุยวดยิ่งร่วมกับแบตเตอรี่โดยใช้พลังงานแสงอาทิตย์เป็นแหล่งกำเนิดพลังงาน | วารสารเทคโนโลยีอุตสาหกรรมและการจัดการ',
  },

  // 7. Environmental Science / Water Quality
  {
    id: 'groundwater-quality-narathiwat',
    title: 'สภาพการใช้น้ำบาดาลและปัญหาด้านคุณภาพน้ำบาดาลในพื้นที่อำเภอเมือง จังหวัดนราธิวาส',
    authors: 'อิลยาส มามะ, โมฮำมัดตอลา อาแซ, วรวีร์ มือเส๊าะ, อัซมิน หะยีสาแล',
    year: 2014,
    competitionOrVenue: 'Princess of Naradhiwas University Journal',
    url: 'https://li01.tci-thaijo.org/index.php/pnujr/article/view/53846',
    summary: 'การสำรวจและประเมินคุณภาพทางกายภาพและเคมีของน้ำบาดาลในชุมชน พร้อมทั้งศึกษาประสิทธิภาพการปรับปรุงคุณภาพน้ำด้วยวิธีการต้มและกรอง',
    difference: 'เน้นการวิเคราะห์คุณภาพน้ำระดับชุมชนจริงร่วมกับการหาวิธีการบำบัดขั้นพื้นฐานที่ชาวบ้านทำได้เอง',
    subfieldIds: ['sci_environment'],
    keywords: ['น้ำบาดาล', 'คุณภาพน้ำ', 'การกรองน้ำ', 'สิ่งแวดล้อม', 'สารปนเปื้อน', 'น้ำอุปโภคบริโภค'],
    verifiedAt: '2026-11-05',
    observedTitle: 'สภาพการใช้น้ำบาดาลและปัญหาด้านคุณภาพน้ำบาดาลในพื้นที่อำเภอเมือง จังหวัดนราธิวาส | Princess of Naradhiwas University Journal',
  },

  // 8. Statistics & Probability / Predictive Regression
  {
    id: 'linear-regression-predictive',
    title: 'การวิเคราะห์เชิงเปรียบเทียบความสัมพันธ์ระหว่างข้อมูล เพื่อคัดเลือกตัวแปรที่มีศักยภาพในการพยากรณ์ด้วยการถดถอยเชิงเส้นอย่างง่าย',
    authors: 'กุลิสรา ทรัพย์ประกอบ, นาวิน ดวงสุวรรณ์, ปยุต มีมานะ',
    year: 2025,
    competitionOrVenue: 'วารสารการจัดการเทคโนโลยีและนวัตกรรมดิจิทัล',
    url: 'https://ph05.tci-thaijo.org/index.php/TMDI/article/view/190',
    summary: 'การวิเคราะห์เปรียบเทียบค่าสัมประสิทธิ์สหสัมพันธ์เพื่อคัดกรองตัวแปรอิสระที่มีผลทางสถิติสูงสุดก่อนนำเข้าสู่แบบจำลองการถดถอยเชิงเส้นเพื่อพยากรณ์ผลลัพธ์',
    difference: 'ใช้เกณฑ์ทางสถิติคัดกรองตัวแปรก่อนสร้างสมการพยากรณ์เพื่อป้องกันภาวะตัวแปรรบกวน',
    subfieldIds: ['math_stats_prob', 'comp_data_science'],
    keywords: ['การถดถอยเชิงเส้น', 'การพยากรณ์', 'สหสัมพันธ์', 'สถิติ', 'การวิเคราะห์ข้อมูล', 'regression', 'ความน่าจะเป็น'],
    verifiedAt: '2026-11-05',
    observedTitle: 'การวิเคราะห์เชิงเปรียบเทียบความสัมพันธ์ระหว่างข้อมูล เพื่อคัดเลือกตัวแปรที่มีศักยภาพในการพยากรณ์ด้วยการถดถอยเชิงเส้นอย่างง่าย | วารสารการจัดการเทคโนโลยีและนวัตกรรมดิจิทัล',
  },

  // 9. Data Science / Graph-based Association Rules
  {
    id: 'association-rules-graph',
    title: 'การทำเหมืองข้อมูลกฎความสัมพันธ์ด้วยวิธีค่าถ่วงน้ำหนักสูงสุดจากกราฟบริบูรณ์แบบสมมาตร',
    authors: 'Pramool Suksakaophong, Phayung Meesad',
    year: 2016,
    competitionOrVenue: 'Information Technology Journal KMUTNB',
    url: 'https://ph01.tci-thaijo.org/index.php/IT_Journal/article/view/72838',
    summary: 'การบูรณาการทฤษฎีกราฟบริบูรณ์แบบสมมาตรเข้ากับการสกัดกฎความสัมพันธ์ในเหมืองข้อมูลเพื่อเพิ่มความเร็วในการค้นหารูปแบบชุดข้อมูลขนาดใหญ่',
    difference: 'แปลงโครงสร้างชุดข้อมูลให้อยู่ในรูปกราฟเพื่อลดรอบการสแกนฐานข้อมูลซ้ำซ้อน',
    subfieldIds: ['comp_data_science', 'math_discrete'],
    keywords: ['เหมืองข้อมูล', 'กฎความสัมพันธ์', 'กราฟบริบูรณ์', 'ทฤษฎีกราฟ', 'ขั้นตอนวิธี', 'data mining'],
    verifiedAt: '2026-11-05',
    observedTitle: 'การทำเหมืองข้อมูลกฎความสัมพันธ์ด้วยวิธีค่าถ่วงน้ำหนักสูงสุดจากกราฟบริบูรณ์แบบสมมาตร | Information Technology Journal KMUTNB',
  },

  // 10. Data Science / Missing Data Imputation & Machine Learning
  {
    id: 'missing-data-data-mining',
    title: 'การเปรียบเทียบประสิทธิภาพการทำนายผลการจำแนกกรณีข้อมูลสูญหายด้วยเทคนิคการทำเหมืองข้อมูล',
    authors: 'จิตกานต์ จันทราช, มนทิราลัย ชัยมงคล, รัตนชัย แซ่โง้ว, สายทิพย์ พลอยสัมฤทธิ์, สายชล สินสมบูรณ์ทอง',
    year: 2020,
    competitionOrVenue: 'Thai Journal of Science and Technology',
    url: 'https://li01.tci-thaijo.org/index.php/tjst/article/view/229672',
    summary: 'การทดสอบเปรียบเทียบวิธีการจัดการข้อมูลสูญหายและการใช้อัลกอริทึมจำแนกประเภทข้อมูล เช่น ต้นไม้ตัดสินใจ และ โครงข่ายประสาทเทียม เพื่อวัดความแม่นยำ',
    difference: 'เปรียบเทียบผลกระทบของวิธีการทดแทนค่าสูญหายแต่ละรูปแบบต่อความแม่นยำของโมเดลการเรียนรู้ของเครื่อง',
    subfieldIds: ['comp_data_science', 'comp_ai_ml'],
    keywords: ['ข้อมูลสูญหาย', 'การจำแนกประเภท', 'เหมืองข้อมูล', 'การทำนาย', 'KNN', 'decision tree', 'neural network'],
    verifiedAt: '2026-11-05',
    observedTitle: 'การเปรียบเทียบประสิทธิภาพการทำนายผลการจำแนกกรณีข้อมูลสูญหายด้วยเทคนิคการทำเหมืองข้อมูล | Thai Journal of Science and Technology',
  },

  // 11. Mathematics / Geometry
  {
    id: 'quadrilateral-circles-geometry',
    title: 'วงกลมแนบในและวงกลมล้อมรอบของรูปสี่เหลี่ยม',
    authors: 'ปวีณา ถ้ำแก้ว, จักรกริช ถ้ำแก้ว',
    year: 2022,
    competitionOrVenue: 'วารสารวิทยาศาสตร์และเทคโนโลยี มหาวิทยาลัยราชภัฏบุรีรัมย์',
    url: 'https://ph02.tci-thaijo.org/index.php/scibru/article/view/245558',
    summary: 'การพิสูจน์ความสัมพันธ์เชิงเรขาคณิตของรัศมี จุดศูนย์กลาง และพื้นที่ของวงกลมที่แนบในและล้อมรอบรูปสี่เหลี่ยมประเภทต่างๆ',
    difference: 'พัฒนาสมการทางคณิตศาสตร์เพื่อหาความสัมพันธ์ของรูปสี่เหลี่ยมที่มีทั้งวงกลมแนบในและล้อมรอบ (Bicentric quadrilateral)',
    subfieldIds: ['math_geometry'],
    keywords: ['วงกลมแนบใน', 'วงกลมล้อมรอบ', 'รูปสี่เหลี่ยม', 'เรขาคณิต', 'รัศมี', 'geometry'],
    verifiedAt: '2026-11-05',
    observedTitle: 'วงกลมแนบในและวงกลมล้อมรอบของรูปสี่เหลี่ยม | วารสารวิทยาศาสตร์และเทคโนโลยี มหาวิทยาลัยราชภัฏบุรีรัมย์ (ออนไลน์)',
  },

  // 12. Computer / IoT / Smart Farm & Agriculture
  {
    id: 'smart-farms-wsn-iot',
    title: 'Application with the Wireless Sensor Network in Smart Farms',
    authors: 'Chonnikarn Rodmorn, Montree Panmuang, Worawut Chonglekha',
    year: 2021,
    competitionOrVenue: 'Recent Science and Technology',
    url: 'https://li01.tci-thaijo.org/index.php/rmutsvrj/article/view/240437',
    summary: 'ระบบตรวจวัดและควบคุมการรดน้ำในแปลงเกษตรอัตโนมัติด้วยเครือข่ายเซนเซอร์ไร้สายและเทคโนโลยีอินเทอร์เน็ตของสรรพสิ่ง (IoT) ช่วยประหยัดน้ำและลดแรงงาน',
    difference: 'ใช้โครงข่ายเซนเซอร์ไร้สายกระจายตัวตามจุดต่างๆ เพื่อการตัดสินใจจ่ายน้ำตามระดับความชื้นจริงของดินในแต่ละโซน',
    subfieldIds: ['comp_iot_hardware', 'sci_biology', 'sci_environment'],
    keywords: ['เครือข่ายเซนเซอร์ไร้สาย', 'สมาร์ตฟาร์ม', 'IoT', 'ความชื้นในดิน', 'ระบบรดน้ำอัตโนมัติ', 'smart farm'],
    verifiedAt: '2026-11-05',
    observedTitle: 'Application with the Wireless Sensor Network in Smart Farms | Recent Science and Technology',
  },

  // 13. AI / Computer Vision / Agriculture
  {
    id: 'rice-classification-machine-learning',
    title: 'การประยุกต์ใช้การประมวลผลภาพร่วมกับการเรียนรู้เครื่องเพื่อจำแนกพันธุ์ข้าว',
    authors: 'อนุสรณ์ วงศ์สง่า, วริศรา นิลคง',
    year: 2024,
    competitionOrVenue: 'วารสารวิชาการมหาวิทยาลัยอีสเทิร์นเอเชีย ฉบับวิทยาศาสตร์และเทคโนโลยี',
    url: 'https://he01.tci-thaijo.org/index.php/EAUHJSci/article/view/274808',
    summary: 'การสกัดคุณลักษณะทางสัณฐานวิทยาของเมล็ดข้าวจากภาพถ่ายดิจิทัลและใช้โมเดลการเรียนรู้ของเครื่องในการจำแนกสายพันธุ์ข้าวไทยได้อย่างแม่นยำ',
    difference: 'วิเคราะห์ลักษณะทางกายภาพภายนอกของเมล็ดข้าวเปลือกด้วยการประมวลผลภาพดิจิทัลแทนการตรวจสอบด้วยสายตามนุษย์',
    subfieldIds: ['comp_ai_ml', 'sci_biology'],
    keywords: ['ประมวลผลภาพ', 'การเรียนรู้เครื่อง', 'จำแนกพันธุ์ข้าว', 'เมล็ดข้าว', 'image processing', 'machine learning'],
    verifiedAt: '2026-11-05',
    observedTitle: 'การประยุกต์ใช้การประมวลผลภาพร่วมกับการเรียนรู้เครื่องเพื่อจำแนกพันธุ์ข้าว | วารสารวิชาการมหาวิทยาลัยอีสเทิร์นเอเชีย ฉบับวิทยาศาสตร์และเทคโนโลยี (online)',
  },

  // 14. Computer / Web Application / Medical Screening
  {
    id: 'cervical-cancer-classification-web',
    title: 'การพัฒนาเว็บแอปพลิเคชันเพื่อจำแนกผู้ป่วยโรคมะเร็งปากมดลูก',
    authors: 'เชิดศักดิ์ เจริญชัย, สุรศักดิ์ แว่นรัมย์, ณัฏฐ์ ดิษเจริญ',
    year: 2019,
    competitionOrVenue: 'วารสารวิทยาศาสตร์และวิทยาศาสตร์ศึกษา (JSSE)',
    url: 'https://so04.tci-thaijo.org/index.php/JSSE/article/view/194865',
    summary: 'การพัฒนาเว็บแอปพลิเคชันที่เชื่อมโยงกับโมเดลโครงข่ายประสาทเทียมเพื่อช่วยคัดกรองและประเมินความเสี่ยงของผู้ป่วยโรคมะเร็งปากมดลูกผ่านเบราว์เซอร์',
    difference: 'แปลงแบบจำลอง AI ให้ทำงานผ่านระบบเว็บอินเทอร์เฟซเพื่อให้บุคลากรทางการแพทย์ในพื้นที่ห่างไกลใช้งานได้สะดวก',
    subfieldIds: ['comp_software_app', 'comp_ai_ml'],
    keywords: ['เว็บแอปพลิเคชัน', 'การจำแนกผู้ป่วย', 'โครงข่ายประสาทเทียม', 'ระบบสนับสนุนการวินิจฉัย', 'เว็บแอพ'],
    verifiedAt: '2026-11-05',
    observedTitle: 'การพัฒนาเว็บแอปพลิเคชันเพื่อจำแนกผู้ป่วยโรคมะเร็งปากมดลูก | วารสารวิทยาศาสตร์และวิทยาศาสตร์ศึกษา (JSSE)',
  },

  // 15. Environmental Science / Public Health / Air Quality
  {
    id: 'pm25-respiratory-health-effect',
    title: 'การสัมผัสฝุ่นละออง PM2.5 กับอาการกำเริบของผู้ป่วยโรคปอดอุดกั้นเรื้อรัง ในโรงพยาบาลเกาะคา จังหวัดลำปาง',
    authors: 'ประเสริฐ สุเมธวานิชย์',
    year: 2023,
    competitionOrVenue: 'วารสารวิชาการสุขภาพภาคเหนือ',
    url: 'https://he01.tci-thaijo.org/index.php/johss/article/view/261437',
    summary: 'การเก็บข้อมูลสถิติเปรียบเทียบระดับฝุ่นละออง PM2.5 ในบรรยากาศกับจำนวนและอาการกำเริบของผู้ป่วยระบบทางเดินหายใจ เพื่อวิเคราะห์สหสัมพันธ์เชิงระบาดวิทยา',
    difference: 'ใช้ข้อมูลจริงจากสถานีตรวจวัดคุณภาพอากาศเทียบกับเวชระเบียนผู้ป่วยเพื่อยืนยันผลกระทบของมลพิษในพื้นที่จริง',
    subfieldIds: ['sci_environment', 'math_stats_prob'],
    keywords: ['ฝุ่นละออง', 'PM2.5', 'คุณภาพอากาศ', 'มลพิษทางอากาศ', 'สถิติสาธารณสุข', 'correlation'],
    verifiedAt: '2026-11-05',
    observedTitle: 'การสัมผัสฝุ่นละออง PM2.5 กับอาการกำเริบของผู้ป่วยโรคปอดอุดกั้นเรื้อรัง ในโรงพยาบาลเกาะคา จังหวัดลำปาง | วารสารวิชาการสุขภาพภาคเหนือ',
  },

  // 16. Chemistry / Biomaterial / Post-harvest Coating
  {
    id: 'pomelo-pectin-extraction-coating',
    title: 'การศึกษาการสกัดเพกทินจากเปลือกเหลือทิ้งของส้มโอเพื่อประยุกต์ใช้ในการยืดอายุการเก็บรักษามะม่วงน้ำดอกไม้สุก',
    authors: 'สิขรินทร์ ก้อนในเมือง',
    year: 2023,
    competitionOrVenue: 'วารสาร มจร อุบลปริทรรศน์',
    url: 'https://so06.tci-thaijo.org/index.php/mcjou/article/view/267141',
    summary: 'การศึกษาสภาวะเหมาะสมในการสกัดเพกทินจากเปลือกส้มโอเหลือทิ้งทางการเกษตร แล้วนำสารละลายเพกทินมาพัฒนาเป็นฟิล์มเคลือบผิวผลไม้เพื่อชะลอการสุกเน่าเสีย',
    difference: 'เพิ่มมูลค่าวัสดุเหลือทิ้งทางการเกษตรโดยพัฒนาเป็นสารเคลือบชีวภาพที่ปลอดภัยต่อผู้บริโภคแทนสารเคมีสังเคราะห์',
    subfieldIds: ['sci_chemistry', 'sci_biology'],
    keywords: ['เพกทิน', 'เปลือกส้มโอ', 'สารเคลือบผิว', 'ยืดอายุการเก็บรักษา', 'วัสดุชีวภาพ', 'การสกัด'],
    verifiedAt: '2026-11-05',
    observedTitle: 'การศึกษาการสกัดเพกทินจากเปลือกเหลือทิ้งของส้มโอ (Citrus maxima Merr.) จากอำเภอบ้านแท่นจังหวัดชัยภูมิ เพื่อประยุกต์ใช้ในการยืดอายุการเก็บรักษามะม่วงน้ำดอกไม้สุก | วารสาร มจร อุบลปริทรรศน์',
  },

  // 17. Mathematics / Differential Equations & Epidemic Modeling
  {
    id: 'sir-epidemic-gravity-modeling',
    title: 'An SIR Epidemic Model with Gravity in Patchy Environment: Analyses for Two Patches System',
    authors: 'Sompon Puangsun, Klot Patanarapeelert',
    year: 2018,
    competitionOrVenue: 'Current Applied Science and Technology',
    url: 'https://li01.tci-thaijo.org/index.php/cast/article/view/135748',
    summary: 'การสร้างและวิเคราะห์แบบจำลองทางคณิตศาสตร์ SIR ที่ผนวกกฎแรงโน้มถ่วงของการเคลื่อนย้ายประชากร เพื่ออธิบายการแพร่ระบาดของโรคระหว่างสองพื้นที่',
    difference: 'ผสานกฎความโน้มถ่วงเชิงพื้นที่เข้ากับระบบสมการเชิงอนุพันธ์เพื่อสร้างแบบจำลองการแพร่กระจายเชื้อที่สมจริงยิ่งขึ้น',
    subfieldIds: ['math_applied', 'math_stats_prob'],
    keywords: ['แบบจำลอง SIR', 'โรคระบาด', 'สมการเชิงอนุพันธ์', 'การแพร่กระจาย', 'epidemic model', 'พลวัตประชากร'],
    verifiedAt: '2026-11-05',
    observedTitle: 'An SIR Epidemic Model with Gravity in Patchy Environment: Analyses for Two Patches System | CURRENT APPLIED SCIENCE AND TECHNOLOGY',
  },

  // 18. Physics / Heat Transfer & Building Insulation
  {
    id: 'thermal-insulation-metal-roof',
    title: 'สมรรถนะเชิงความร้อนของฉนวนกันความร้อน: การติดตั้งฉนวนกันความร้อน ใต้หลังคาเมทัลชีท',
    authors: 'วารีรัตน์ อมาตยกุล, จิระพันธ์ พุกดำ, ดนัย นนทิวรวงษ์, วิจิตร พวงสมบัติ',
    year: 2023,
    competitionOrVenue: 'วารสารวิชาการเทคโนโลยีอุตสาหกรรม มหาวิทยาลัยราชภัฏสวนสุนันทา',
    url: 'https://ph01.tci-thaijo.org/index.php/fit-ssru/article/view/251567',
    summary: 'การทดสอบเปรียบเทียบสมรรถนะการลดอุณหภูมิและการถ่ายเทความร้อนของฉนวนชนิดใยแก้วและใยหินใต้หลังคาเมทัลชีทของบ้านทดสอบจริง',
    difference: 'วัดค่าอุณหภูมิและฟลักซ์ความร้อนในบ้านทดสอบขนาดจริงเพื่อประเมินความคุ้มค่าของการประหยัดพลังงานในอาคาร',
    subfieldIds: ['sci_physics'],
    keywords: ['ฉนวนกันความร้อน', 'สมรรถนะความร้อน', 'หลังคาเมทัลชีท', 'การถ่ายโอนความร้อน', 'อุณหภูมิ', 'พลังงาน'],
    verifiedAt: '2026-11-05',
    observedTitle: 'สมรรถนะเชิงความร้อนของฉนวนกันความร้อน: การติดตั้งฉนวนกันความร้อน ใต้หลังคาเมทัลชีท | วารสารวิชาการเทคโนโลยีอุตสาหกรรม : มหาวิทยาลัยราชภัฏสวนสุนันทา',
  },

  // 19. Chemistry & Biology / Natural Dye & Histology
  {
    id: 'natural-dye-plant-tissue-staining',
    title: 'สีสกัดจากฝางและอัญชันสำหรับการย้อมสีเนื้อเยื่อพืชแบบย้อมทับ',
    authors: 'นภัสสรณ์ กุยวารี, อรวรรณ วนะชีวิน',
    year: 2023,
    competitionOrVenue: 'วารสาร มรภ.กพ. วิทยาศาสตร์ คณิตศาสตร์ และเทคโนโลยี',
    url: 'https://ph03.tci-thaijo.org/index.php/smt/article/view/436',
    summary: 'การทดสอบสกัดสารสีธรรมชาติจากแก่นฝางและดอกอัญชันเพื่อใช้ย้อมสีเนื้อเยื่อพืชส่วนท่อลำเลียงไซเลมและโฟลเอ็มทดแทนสีย้อมสารเคมีอันตราย',
    difference: 'ใช้สีย้อมธรรมชาติปลอดสารพิษสำหรับการศึกษาชีววิทยาในห้องปฏิบัติการระดับโรงเรียน',
    subfieldIds: ['sci_chemistry', 'sci_biology'],
    keywords: ['สีย้อมธรรมชาติ', 'แก่นฝาง', 'ดอกอัญชัน', 'การย้อมสีเนื้อเยื่อ', 'สารสกัดจากพืช', 'plant histology'],
    verifiedAt: '2026-11-05',
    observedTitle: 'สีสกัดจากฝางและอัญชันสำหรับการย้อมสีเนื้อเยื่อพืชแบบย้อมทับ | วารสาร มรภ.กพ. วิทยาศาสตร์ คณิตศาสตร์ และเทคโนโลยี',
  },

  // 20. Physics & Chemistry / Bio-insulation Materials
  {
    id: 'banana-rubber-thermal-insulation',
    title: 'สมบัติทางความร้อนและทางกายภาพของฉนวนกันความร้อน จากเส้นใยกาบกล้วยผสมน้ำยางพารา',
    authors: 'ปริย นิลแสงรัตน์, มาวิน ปูนอน, กลยุทธ ดีจริง, นาวิน นิลแสงรัตน์',
    year: 2025,
    competitionOrVenue: 'วารสารวิทยาศาสตร์ วิศวกรรมศาสตร์ และเทคโนโลยี มหาวิทยาลัยราชภัฏมหาสารคาม',
    url: 'https://ph03.tci-thaijo.org/index.php/jsetRMU/article/view/3920',
    summary: 'การพัฒนาแผ่นฉนวนกันความร้อนชีวภาพจากเส้นใยกาบกล้วยผสมน้ำยางพาราธรรมชาติ พร้อมทดสอบค่าการนำความร้อนและการหน่วงการลามไฟ',
    difference: 'ผลิตวัสดุกันความร้อนที่เป็นมิตรต่อสิ่งแวดล้อมและย่อยสลายได้ทางชีวภาพจากเศษวัสดุการเกษตร',
    subfieldIds: ['sci_physics', 'sci_chemistry'],
    keywords: ['เส้นใยกาบกล้วย', 'น้ำยางพารา', 'ฉนวนกันความร้อน', 'การนำความร้อน', 'วัสดุชีวภาพ', 'การลามไฟ'],
    verifiedAt: '2026-11-05',
    observedTitle: 'สมบัติทางความร้อนและทางกายภาพของฉนวนกันความร้อน จากเส้นใยกาบกล้วยผสมน้ำยางพารา | วารสารวิทยาศาสตร์ วิศวกรรมศาสตร์ และเทคโนโลยี มหาวิทยาลัยราชภัฏมหาสารคาม',
  },

  // 21. Mathematics / 2D Geometry Diagnostics
  {
    id: 'math-diagnostic-2d-geometry',
    title: 'การพัฒนาแบบทดสอบวินิจฉัยการเรียนคณิตศาสตร์ เรื่อง รูปเรขาคณิตสองมิติ',
    authors: 'จิตติญา สมเพ็ง',
    year: 2024,
    competitionOrVenue: 'วารสารเทคโนโลยีและสื่อสารการศึกษา มหาวิทยาลัยมหาสารคาม',
    url: 'https://so02.tci-thaijo.org/index.php/etcedumsujournal/article/view/272500',
    summary: 'การวิจัยเพื่อวินิจฉัยข้อบกพร่องและมโนทัศน์ที่คลาดเคลื่อนของผู้เรียนเกี่ยวกับสมบัติของรูปทรงเรขาคณิตสองมิติ เส้นขนาน และการหาพื้นที่',
    difference: 'จำแนกข้อผิดพลาดที่พบบ่อยในการคำนวณและระบุรูปทรงเรขาคณิตเพื่อปรับปรุงกระบวนการเรียนรู้',
    subfieldIds: ['math_geometry'],
    keywords: ['รูปเรขาคณิตสองมิติ', 'เรขาคณิต', 'แบบทดสอบวินิจฉัย', 'มโนทัศน์คณิตศาสตร์', 'มุมและพื้นที่'],
    verifiedAt: '2026-11-05',
    observedTitle: 'การพัฒนาแบบทดสอบวินิจฉัยการเรียนคณิตศาสตร์ เรื่อง รูปเรขาคณิตสองมิติ สำหรับนักเรียนชั้นประถมศึกษาปีที่ 6 โรงเรียนในสังกัด สำนักงานเขตพื้นที่การศึกษา ประถมศึกษายโสธร เขต 1 | วารสารเทคโนโลยีและสื่อสารการศึกษา คณะศึกษาศาสตร์ มหาวิทยาลัยมหาสารคาม',
  },

  // 22. Mathematics / 3D Geometry & Spatial Thinking
  {
    id: 'creative-3d-geometry-learning',
    title: 'การพัฒนากิจกรรมการเรียนรู้แบบสร้างสรรค์เป็นฐานเพื่อส่งเสริมความคิดสร้างสรรค์ทางคณิตศาสตร์ เรื่อง รูปเรขาคณิตสามมิติ',
    authors: 'สุธีพร กุลค้อ, นงลักษณ์ วิริยะพงษ์, มนชยา เจียงประดิษฐ์',
    year: 2023,
    competitionOrVenue: 'Journal of Science and Science Education',
    url: 'https://so04.tci-thaijo.org/index.php/JSSE/article/view/264744',
    summary: 'การออกแบบและศึกษาความสามารถในการมองเห็นภาพมิติสัมพันธ์ การคลี่รูปทรง และการประกอบรูปเรขาคณิตสามมิติ',
    difference: 'เน้นการสร้างปฏิสัมพันธ์กับโมเดลสามมิติและการคลี่รูปทรงเพื่อพัฒนาทักษะมิติสัมพันธ์',
    subfieldIds: ['math_geometry'],
    keywords: ['รูปเรขาคณิตสามมิติ', 'ความคิดสร้างสรรค์', 'เรขาคณิต', 'รูปทรงเรขาคณิต', 'การคลี่รูปทรง'],
    verifiedAt: '2026-11-05',
    observedTitle: 'การพัฒนากิจกรรมการเรียนรู้แบบสร้างสรรค์เป็นฐาน (CBL) เพื่อส่งเสริมความคิดสร้างสรรค์ทางคณิตศาสตร์และผลสัมฤทธิ์ทางการเรียน เรื่อง รูปเรขาคณิตสามมิติ ของนักเรียนชั้นประถมศึกษาปีที่ 6 | Journal of Science and Science Education',
  },

  // 23. Computer / IoT / Smart Greenhouse & Agriculture
  {
    id: 'iot-mushroom-greenhouse-blynk',
    title: 'Automated IoT-Based Mushroom Greenhouse Control System for Real-Time Environmental Management via Blynk Application',
    authors: 'Chainarong Janthoom, Suphalak Batpho, Sittisak Thongsuk, Maytagorn Thongkaobua',
    year: 2024,
    competitionOrVenue: 'International Scientific Journal of Engineering and Technology (ISJET)',
    url: 'https://ph02.tci-thaijo.org/index.php/isjet/article/view/260822',
    summary: 'การพัฒนาระบบควบคุมสภาพแวดล้อมอัตโนมัติในโรงเรือนเพาะเห็ดด้วยเซนเซอร์วัดอุณหภูมิและความชื้น เชื่อมต่อไมโครคอนโทรลเลอร์และการสั่งการผ่านแอปพลิเคชันมือถือ',
    difference: 'ควบคุมสภาพแวดล้อมแบบวงรอบปิดพร้อมการแจ้งเตือนและควบคุมทางไกลผ่านโมบายแอปพลิเคชัน',
    subfieldIds: ['comp_iot_hardware', 'sci_biology'],
    keywords: ['โรงเรือนเพาะเห็ด', 'IoT', 'Blynk', 'ESP32', 'เซนเซอร์ความชื้น', 'ควบคุมสภาพแวดล้อม', 'smart greenhouse'],
    verifiedAt: '2026-11-05',
    observedTitle: 'Automated IoT-Based Mushroom Greenhouse Control System for Real-Time Environmental Management via Blynk Application | INTERNATIONAL SCIENTIFIC JOURNAL OF ENGINEERING AND TECHNOLOGY (ISJET)',
  },

  // 24. Environmental Science / Chemical Coagulation & Heavy Metals
  {
    id: 'wastewater-chemical-coagulation',
    title: 'การบำบัดน้ำเสียจากโรงงานอุตสาหกรรมผลิตข้อต่อท่อประปาเหล็ก ด้วยการตกตะกอนเคมีร่วมกับการดูดซับ',
    authors: 'ปารินดา สุขสบาย',
    year: 2012,
    competitionOrVenue: 'Journal of Food Health and Bioenvironmental Science',
    url: 'https://li01.tci-thaijo.org/index.php/sdust/article/view/5143',
    summary: 'การทดสอบกระบวนการบำบัดน้ำเสียปนเปื้อนโลหะหนักและไขมันด้วยการตกตะกอนทางเคมีร่วมกับการดูดซับผ่านคอลัมน์ถ่านกัมมันต์',
    difference: 'ผสานกระบวนการตกตะกอนเคมีเบื้องต้นกับการดูดซับขั้นสูงเพื่อกำจัดทั้งสารแขวนลอยและสารละลายโลหะหนัก',
    subfieldIds: ['sci_environment', 'sci_chemistry'],
    keywords: ['บำบัดน้ำเสีย', 'การตกตะกอนเคมี', 'การดูดซับ', 'ถ่านกัมมันต์', 'โลหะหนัก', 'wastewater treatment'],
    verifiedAt: '2026-11-05',
    observedTitle: 'การบำบัดน้ำเสียจากโรงงานอุตสาหกรรมผลิตข้อต่อท่อประปาเหล็ก ด้วยการตกตะกอนเคมีร่วมกับการดูดซับ | Journal of Food Health and Bioenvironmental Science',
  },

  // 25. Environmental Science / Biological Wastewater Treatment
  {
    id: 'wastewater-bacteria-cassava',
    title: 'การบำบัดน้ำเสียจากโรงงานผลิตแป้งมันสำปะหลังด้วยแบคทีเรียท้องถิ่นที่มีประสิทธิภาพที่คัดเลือกได้จากน้ำเสีย',
    authors: 'กุลยา โรจน์พานิช, นิพนธ์ ตังคณานุรักษ์, คณิตา ตังคณานุรักษ์',
    year: 2017,
    competitionOrVenue: 'Thai Journal of Science and Technology',
    url: 'https://li01.tci-thaijo.org/index.php/tjst/article/view/78677',
    summary: 'การคัดแยกและเพาะเลี้ยงแบคทีเรียท้องถิ่นที่ทนทานต่อสภาวะน้ำเสียจากโรงงานแป้งมันสำปะหลังเพื่อช่วยย่อยสลายสารอินทรีย์และลดค่าความสกปรกของน้ำ',
    difference: 'ใช้จุลินทรีย์ท้องถิ่นที่ปรับตัวกับน้ำเสียเฉพาะแหล่งเพื่อเพิ่มประสิทธิภาพการย่อยสลายทางชีวภาพ',
    subfieldIds: ['sci_environment', 'sci_biology'],
    keywords: ['บำบัดน้ำเสีย', 'แป้งมันสำปะหลัง', 'แบคทีเรียท้องถิ่น', 'จุลินทรีย์', 'ลดค่า COD', 'บำบัดชีวภาพ'],
    verifiedAt: '2026-11-05',
    observedTitle: 'การบำบัดน้ำเสียจากโรงงานผลิตแป้งมันสำปะหลังด้วยแบคทีเรียท้องถิ่นที่มีประสิทธิภาพที่คัดเลือกได้จากน้ำเสีย | Thai Journal of Science and Technology',
  },

  // 26. Computer / AI / Agricultural Computer Vision
  {
    id: 'phonyong-prime-ysc2025',
    title: 'Phonyong Prime+: ระบบวิเคราะห์คุณภาพและบ่งบอกเหตุผลของระดับคุณภาพเนื้อโคขุนโพนยางคำ',
    authors: 'ปฏิพล เจริญผล, พีรพัฒน์ พรมจันทร์, อรรจน์ คงทอง',
    year: 2025,
    competitionOrVenue: 'YSC 2025 / Inventions Geneva',
    url: 'https://www.nstda.or.th/home/news_post/ysc-inventions-geneva-20260316',
    summary: 'ระบบปัญญาประดิษฐ์วิเคราะห์เกรดเนื้อวัวจากภาพถ่ายหน้าตัดลายไขมันแทรก พร้อมทั้งให้เหตุผลประกอบการตัดสินใจตามมาตรฐานการจัดเกรด',
    difference: 'ผสานการจำแนกภาพถ่ายเนื้อด้วย Deep Learning ร่วมกับการสร้างคำอธิบายเชิงเหตุผล (Explainable AI) สำหรับเกษตรกรและผู้ค้า',
    subfieldIds: ['comp_ai_ml', 'comp_data_science'],
    keywords: ['โคขุนโพนยางคำ', 'วิเคราะห์คุณภาพเนื้อ', 'ปัญญาประดิษฐ์', 'AI', 'การประมวลผลภาพ', 'ลายไขมัน'],
    verifiedAt: '2026-11-05',
    observedTitle: 'สวทช. นำทีม YSC ร่วมประกวด Inventions Geneva ครั้งที่ 51',
  },
];
