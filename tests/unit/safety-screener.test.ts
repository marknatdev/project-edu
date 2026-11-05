import { describe, it, expect } from 'vitest';
import { screenIdea } from '@/lib/safety/screener';
import { SAFETY_CATEGORIES, type Idea } from '@/types/domain';
import { SafetyFlagSchema } from '@/lib/schemas';

describe('Safety Screener (SRC / ISEF Non-blocking Screener)', () => {
  describe('Clean text & False positive protection', () => {
    it('returns empty array for clean benign project descriptions', () => {
      const cleanTexts = [
        'แอปพลิเคชันจัดการเวลาอ่านหนังสือสำหรับนักเรียน',
        'ระบบรดน้ำต้นไม้อัตโนมัติด้วยบอร์ดไมโครคอนโทรลเลอร์ 5V',
        'ทฤษฎีกราฟกับการคำนวณเส้นทางเดินรถเมล์ที่สั้นที่สุด',
        'An interactive web dashboard for learning geometry',
        'Solar powered automatic plant monitoring with low voltage Arduino',
      ];

      for (const text of cleanTexts) {
        const flags = screenIdea(text);
        expect(flags).toEqual([]);
      }
    });

    it('avoids obvious Thai false positives (หนู pronoun, ม.ปลาย, ปลาสเตอร์, ไม้ด่าง, ราคา/ราก)', () => {
      const falsePositiveCases = [
        // 'หนู' as 1st person student pronoun
        'หนูอยากทำโครงงานประดิษฐ์ของเล่นจากเศษกระดาษเหลือใช้',
        'กลุ่มของหนูคิดค้นเกมการศึกษาคำศัพท์ภาษาอังกฤษ',
        'หนูสนใจศึกษาความหนาแน่นของใบพืชในสวนโรงเรียน',
        // 'ปลา' substring collisions
        'โครงงานศึกษาอัตราการเจริญเติบโตของพืชของนักเรียนระดับชั้น ม.ปลาย',
        'การเปรียบเทียบปลายยอดของถั่วงอกในสภาวะแสงที่ต่างกัน',
        'การทดสอบแรงยึดเกาะของแผ่นปลาสเตอร์ปิดแผล',
        // 'ด่าง' substring collisions (variegated plants, spots)
        'การขยายพันธุ์ไม้ด่างลายหินอ่อนด้วยวิธีเพาะเลี้ยงเนื้อเยื่อพืช',
        'สารสกัดจากพืชเพื่อลดจุดด่างดำบนใบกล้วยไม้',
        // 'รา' substring collisions (price, plant roots)
        'การสำรวจราคาสินค้าอุปโภคบริโภคในตลาดชุมชน',
        'การศึกษาโครงสร้างรากพืชน้ำเพื่อการบำบัดน้ำเสียเบื้องต้น',
      ];

      for (const text of falsePositiveCases) {
        const flags = screenIdea(text);
        expect(flags).toEqual([]);
      }
    });

    it('avoids obvious English false positives (word boundary: rat/rate, fish/selfish, cell/solar cell, lead to)', () => {
      const falsePositiveEnCases = [
        'Evaluating the error rate of a new sorting algorithm',
        'A study on how selfish routing causes traffic congestion',
        'Efficiency analysis of monocrystalline solar cell panels',
        'How optimal study habits lead to academic improvement',
        'Creating a database schema for school library management',
      ];

      for (const text of falsePositiveEnCases) {
        const flags = screenIdea(text);
        expect(flags).toEqual([]);
      }
    });
  });

  describe('Individual Category Detection (Thai & English)', () => {
    it('detects hazardous_chemicals category with ISEF Form 3/2 advisory', () => {
      const samples = [
        'การทดลองสกัดสารด้วยกรดเข้มข้นและด่างแก่',
        'ใช้กรดไฮโดรคลอริกในการสลายเซลลูโลส',
        'Synthesis using hydrochloric acid and toxic chemicals',
        'Testing corrosion resistance against concentrated nitric acid',
      ];

      for (const text of samples) {
        const flags = screenIdea(text);
        expect(flags.length).toBeGreaterThanOrEqual(1);
        const chemFlag = flags.find((f) => f.category === 'hazardous_chemicals');
        expect(chemFlag).toBeDefined();
        expect(chemFlag?.flagged).toBe(true);
        expect(chemFlag?.blocking).toBe(false);
        expect(chemFlag?.requiresPreApproval).toBe(true);
        expect(chemFlag?.advisoryTh).toContain('Form 3');
        expect(chemFlag?.advisoryTh).toContain('ต้องมีครูหรือผู้เชี่ยวชาญดูแล');
        expect(chemFlag?.matchedTerms?.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('detects vertebrate_animals category with ISEF Form 5A/5B advisory', () => {
      const samples = [
        'ศึกษาผลของอาหารเม็ดต่ออัตราการเติบโตของปลากัด',
        'การทดสอบประสิทธิภาพสมุนไพรในหนูทดลอง',
        'Testing nutritional supplements on laboratory mice and rats',
        'Behavioral study of goldfish and zebrafish in controlled aquariums',
      ];

      for (const text of samples) {
        const flags = screenIdea(text);
        expect(flags.length).toBeGreaterThanOrEqual(1);
        const animalFlag = flags.find((f) => f.category === 'vertebrate_animals');
        expect(animalFlag).toBeDefined();
        expect(animalFlag?.flagged).toBe(true);
        expect(animalFlag?.blocking).toBe(false);
        expect(animalFlag?.requiresPreApproval).toBe(true);
        expect(animalFlag?.advisoryTh).toContain('Form 5');
        expect(animalFlag?.advisoryTh).toContain('SRC');
        expect(animalFlag?.matchedTerms?.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('detects human_subjects category with ISEF Form 4 advisory', () => {
      const samples = [
        'แจกแบบสอบถามความพึงพอใจและให้อาสาสมัครทดสอบชิมเครื่องดื่ม',
        'การเก็บข้อมูลพฤติกรรมโดยใช้อาสาสมัครมนุษย์ 100 คน',
        'A human participant survey assessing student sleep patterns',
        'Sensory evaluation and taste test of healthy snack prototypes',
      ];

      for (const text of samples) {
        const flags = screenIdea(text);
        expect(flags.length).toBeGreaterThanOrEqual(1);
        const humanFlag = flags.find((f) => f.category === 'human_subjects');
        expect(humanFlag).toBeDefined();
        expect(humanFlag?.flagged).toBe(true);
        expect(humanFlag?.blocking).toBe(false);
        expect(humanFlag?.requiresPreApproval).toBe(true);
        expect(humanFlag?.advisoryTh).toContain('Form 4');
        expect(humanFlag?.advisoryTh).toContain('Informed Consent');
        expect(humanFlag?.matchedTerms?.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('detects biological_agents category with ISEF Form 6A/6B advisory', () => {
      const samples = [
        'เพาะเลี้ยงเชื้อราและแบคทีเรียที่สกัดจากขยะอินทรีย์',
        'การยับยั้งจุลินทรีย์ก่อโรคด้วยสารสกัดเปลือกมังคุด',
        'Culturing bacteria and fungus in petri dishes under incubator',
        'Evaluating antimicrobial resistance of Escherichia coli and viral pathogens',
      ];

      for (const text of samples) {
        const flags = screenIdea(text);
        expect(flags.length).toBeGreaterThanOrEqual(1);
        const bioFlag = flags.find((f) => f.category === 'biological_agents');
        expect(bioFlag).toBeDefined();
        expect(bioFlag?.flagged).toBe(true);
        expect(bioFlag?.blocking).toBe(false);
        expect(bioFlag?.requiresPreApproval).toBe(true);
        expect(bioFlag?.advisoryTh).toContain('Form 6');
        expect(bioFlag?.advisoryTh).toContain('BSL');
        expect(bioFlag?.matchedTerms?.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('detects high_voltage_radiation category with ISEF Form 3 advisory', () => {
      const samples = [
        'การสร้างเครื่องเร่งอนุภาคและหม้อแปลงไฟฟ้าแรงสูง 10kV',
        'ระบบตรวจวัดการแผ่รังสีและแสงเลเซอร์ความเข้มสูง',
        'Experiments using high voltage spark gap and intense laser beam',
        'Detecting cosmic radiation and x-ray emissions with Geiger counter',
      ];

      for (const text of samples) {
        const flags = screenIdea(text);
        expect(flags.length).toBeGreaterThanOrEqual(1);
        const radFlag = flags.find((f) => f.category === 'high_voltage_radiation');
        expect(radFlag).toBeDefined();
        expect(radFlag?.flagged).toBe(true);
        expect(radFlag?.blocking).toBe(false);
        expect(radFlag?.requiresPreApproval).toBe(true);
        expect(radFlag?.advisoryTh).toContain('Form 3');
        expect(radFlag?.advisoryTh).toContain('ครูหรือผู้เชี่ยวชาญ');
        expect(radFlag?.matchedTerms?.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('Multi-Category Detection & Non-blocking Guarantee', () => {
    it('detects multiple categories concurrently and preserves canonical category order', () => {
      const complexText = `
        โครงการพัฒนาแผ่นแปะสมุนไพร:
        1. ใช้กรดซัลฟิวริกเข้มข้นสกัดสารเคมี
        2. เพาะเชื้อแบคทีเรีย E. coli เพื่อทดสอบการยับยั้ง
        3. ทดสอบการระคายเคืองในหนูทดลอง
        4. ให้อาสาสมัครมนุษย์ทำแบบสอบถามและทดสอบการแพ้
        5. ใช้แสงเลเซอร์วัดความเรียบผิว
      `;

      const flags = screenIdea(complexText);
      expect(flags).toHaveLength(5);

      const detectedCategories = flags.map((f) => f.category);
      expect(detectedCategories).toEqual(SAFETY_CATEGORIES);

      // Verify every flag is non-blocking and passes schema validation
      for (const flag of flags) {
        expect(flag.blocking).toBe(false);
        expect(flag.flagged).toBe(true);
        const parsed = SafetyFlagSchema.safeParse(flag);
        expect(parsed.success).toBe(true);
      }
    });

    it('guarantees that blocking is NEVER true for any generated flag', () => {
      const texts = [
        'กรดเข้มข้น',
        'หนูขาว สัตว์ทดลอง',
        'แบบสอบถาม อาสาสมัคร',
        'แบคทีเรีย เชื้อรา',
        'ไฟฟ้าแรงสูง รังสี เลเซอร์',
      ];

      for (const t of texts) {
        const flags = screenIdea(t);
        for (const flag of flags) {
          expect(flag.blocking).toBe(false);
        }
      }
    });
  });

  describe('Idea Object Input Support', () => {
    it('screens Idea object inspecting title and description fields', () => {
      const mockIdea: Idea = {
        id: 'idea_001',
        learnerId: 'learner_anon',
        title: 'การบำบัดน้ำเสียชุมชนด้วยจุลินทรีย์ท้องถิ่น',
        description: 'ศึกษาประสิทธิภาพของแบคทีเรียและเชื้อราในการย่อยสลายสารอินทรีย์',
        source: 'idea_track',
        gradeLevel: 'm_plai',
        goal: 'ysc',
        createdAt: '2026-11-05T09:00:00Z',
        updatedAt: '2026-11-05T09:00:00Z',
      };

      const flags = screenIdea(mockIdea);
      expect(flags).toHaveLength(1);
      expect(flags[0].category).toBe('biological_agents');
      expect(flags[0].blocking).toBe(false);
      expect(flags[0].matchedTerms).toContain('จุลินทรีย์');
      expect(flags[0].matchedTerms).toContain('แบคทีเรีย');
      expect(flags[0].matchedTerms).toContain('เชื้อรา');
    });

    it('screens Idea object when risk term is in title only', () => {
      const mockIdea: Idea = {
        id: 'idea_002',
        learnerId: 'learner_anon',
        title: 'ระบบตัดวงจรไฟฟ้าแรงสูงอัตโนมัติ',
        description: 'การออกแบบวงจรประมวลผลสัญญาณดิจิทัลเพื่อความปลอดภัยในโรงเรียน',
        source: 'discovery_track',
        gradeLevel: 'm_ton',
        goal: 'nsc',
        createdAt: '2026-11-05T09:00:00Z',
        updatedAt: '2026-11-05T09:00:00Z',
      };

      const flags = screenIdea(mockIdea);
      expect(flags).toHaveLength(1);
      expect(flags[0].category).toBe('high_voltage_radiation');
      expect(flags[0].blocking).toBe(false);
      expect(flags[0].matchedTerms).toContain('ไฟฟ้าแรงสูง');
    });
  });
});
