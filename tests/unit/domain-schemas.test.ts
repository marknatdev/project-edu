import { describe, it, expect } from 'vitest';
import {
  LearnerSchema,
  GradeLevelSchema,
  GoalSchema,
  TrackSchema,
  ConstraintsSchema,
  InterviewSchema,
  SubjectSchema,
  SubfieldSchema,
  TopicCardSchema,
  SwipeDirectionSchema,
  SwipeActionSchema,
  ShortlistItemSchema,
  FitScoreSchema,
  IdeaSchema,
  EvaluationAxisSchema,
  EvaluationSchema,
  RubricPresetSchema,
  PriorWorkSchema,
  SafetyCategorySchema,
  SafetyFlagSchema,
  PivotCoachingSchema,
  PivotSchema,
  ProjectSchema,
  ProposalSchema,
  PlanSchema,
} from '@/lib/schemas';
import type {
  Learner,
  GradeLevel,
  Goal,
  Track,
  Constraints,
  Interview,
  Subject,
  Subfield,
  TopicCard,
  SwipeAction,
  ShortlistItem,
  FitScore,
  Idea,
  Evaluation,
  RubricPreset,
  PriorWork,
  SafetyFlag,
  PivotCoaching,
  Pivot,
  Project,
  Proposal,
  Plan,
} from '@/types/domain';

// Compile-time type-level equality check
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;

// Verify zero type drift between domain interfaces and Zod inferred types
export type _TypeChecks = [
  Assert<Equals<Learner, import('zod').infer<typeof LearnerSchema>>>,
  Assert<Equals<GradeLevel, import('zod').infer<typeof GradeLevelSchema>>>,
  Assert<Equals<Goal, import('zod').infer<typeof GoalSchema>>>,
  Assert<Equals<Track, import('zod').infer<typeof TrackSchema>>>,
  Assert<Equals<Constraints, import('zod').infer<typeof ConstraintsSchema>>>,
  Assert<Equals<Interview, import('zod').infer<typeof InterviewSchema>>>,
  Assert<Equals<Subject, import('zod').infer<typeof SubjectSchema>>>,
  Assert<Equals<Subfield, import('zod').infer<typeof SubfieldSchema>>>,
  Assert<Equals<TopicCard, import('zod').infer<typeof TopicCardSchema>>>,
  Assert<Equals<SwipeAction, import('zod').infer<typeof SwipeActionSchema>>>,
  Assert<Equals<ShortlistItem, import('zod').infer<typeof ShortlistItemSchema>>>,
  Assert<Equals<FitScore, import('zod').infer<typeof FitScoreSchema>>>,
  Assert<Equals<Idea, import('zod').infer<typeof IdeaSchema>>>,
  Assert<Equals<Evaluation, import('zod').infer<typeof EvaluationSchema>>>,
  Assert<Equals<RubricPreset, import('zod').infer<typeof RubricPresetSchema>>>,
  Assert<Equals<PriorWork, import('zod').infer<typeof PriorWorkSchema>>>,
  Assert<Equals<SafetyFlag, import('zod').infer<typeof SafetyFlagSchema>>>,
  Assert<Equals<PivotCoaching, import('zod').infer<typeof PivotCoachingSchema>>>,
  Assert<Equals<Pivot, import('zod').infer<typeof PivotSchema>>>,
  Assert<Equals<Project, import('zod').infer<typeof ProjectSchema>>>,
  Assert<Equals<Proposal, import('zod').infer<typeof ProposalSchema>>>,
  Assert<Equals<Plan, import('zod').infer<typeof PlanSchema>>>,
];

describe('Domain Schemas & Validation', () => {
  describe('LearnerSchema (Zero-PII by construction)', () => {
    it('accepts valid anonymous learner with grade level', () => {
      const validLearner = {
        id: 'guest_123e4567-e89b-12d3-a456-426614174000',
        gradeLevel: 'm_ton',
        createdAt: '2026-11-05T09:00:00.000Z',
        updatedAt: '2026-11-05T09:00:00.000Z',
      };
      const result = LearnerSchema.safeParse(validLearner);
      expect(result.success).toBe(true);
    });

    it('rejects PII fields: realName, schoolName, email, citizenId', () => {
      const piiAttempt = {
        id: 'guest_123',
        gradeLevel: 'm_plai',
        createdAt: '2026-11-05T09:00:00.000Z',
        updatedAt: '2026-11-05T09:00:00.000Z',
        realName: 'สมชาย รักเรียน',
        schoolName: 'โรงเรียนเตรียมอุดมศึกษา',
      };
      const result = LearnerSchema.safeParse(piiAttempt);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.code === 'unrecognized_keys')).toBe(true);
      }
    });

    it('rejects invalid gradeLevel', () => {
      const invalid = {
        id: 'guest_123',
        gradeLevel: 'm_7',
        createdAt: '2026-11-05T09:00:00.000Z',
        updatedAt: '2026-11-05T09:00:00.000Z',
      };
      const result = LearnerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('GradeLevel & Goal & Track Schemas', () => {
    it('validates GradeLevel strictly (m_ton, m_plai)', () => {
      expect(GradeLevelSchema.safeParse('m_ton').success).toBe(true);
      expect(GradeLevelSchema.safeParse('m_plai').success).toBe(true);
      expect(GradeLevelSchema.safeParse('grade_10').success).toBe(false);
      expect(GradeLevelSchema.safeParse('').success).toBe(false);
    });

    it('validates canonical Goals (4 competitions + 3 non-competitions)', () => {
      const validGoals = ['ysc', 'nsc', 'silapa', 'isef', 'classroom', 'portfolio', 'curiosity'];
      for (const goal of validGoals) {
        expect(GoalSchema.safeParse(goal).success).toBe(true);
      }
      expect(GoalSchema.safeParse('hackathon').success).toBe(false);
      expect(GoalSchema.safeParse('olympiad').success).toBe(false);
    });

    it('validates Track routing values', () => {
      expect(TrackSchema.safeParse('idea_track').success).toBe(true);
      expect(TrackSchema.safeParse('discovery_track').success).toBe(true);
      expect(TrackSchema.safeParse('fast_track').success).toBe(false);
    });
  });

  describe('ConstraintsSchema', () => {
    it('accepts valid constraints', () => {
      const constraints = {
        timeWeeks: 12,
        budgetBaht: 1500,
        equipment: ['microscope', 'beaker'],
        teamSize: 2,
        skills: ['python', 'chemistry_basics'],
      };
      expect(ConstraintsSchema.safeParse(constraints).success).toBe(true);
    });

    it('rejects negative time or budget', () => {
      expect(
        ConstraintsSchema.safeParse({
          timeWeeks: -1,
          budgetBaht: 500,
          equipment: [],
          teamSize: 1,
          skills: [],
        }).success,
      ).toBe(false);

      expect(
        ConstraintsSchema.safeParse({
          timeWeeks: 4,
          budgetBaht: -50,
          equipment: [],
          teamSize: 1,
          skills: [],
        }).success,
      ).toBe(false);
    });

    it('rejects team size <= 0 or > 10', () => {
      expect(
        ConstraintsSchema.safeParse({
          timeWeeks: 4,
          budgetBaht: 0,
          equipment: [],
          teamSize: 0,
          skills: [],
        }).success,
      ).toBe(false);

      expect(
        ConstraintsSchema.safeParse({
          timeWeeks: 4,
          budgetBaht: 0,
          equipment: [],
          teamSize: 15,
          skills: [],
        }).success,
      ).toBe(false);
    });
  });

  describe('InterviewSchema', () => {
    it('accepts valid interview session', () => {
      const interview = {
        id: 'int_001',
        learnerId: 'guest_123',
        gradeLevel: 'm_ton',
        goal: 'ysc',
        constraints: {
          timeWeeks: 8,
          budgetBaht: 1000,
          equipment: ['arduino'],
          teamSize: 3,
          skills: ['coding'],
        },
        hasInitialIdea: false,
        selectedTrack: 'discovery_track',
        completedAt: '2026-11-05T09:30:00.000Z',
      };
      expect(InterviewSchema.safeParse(interview).success).toBe(true);
    });
  });

  describe('Subject & Subfield & TopicCard Schemas', () => {
    it('accepts valid Subject and Subfield', () => {
      const subject = {
        id: 'science',
        nameTh: 'วิทยาศาสตร์',
        nameEn: 'Science',
        description: 'ฟิสิกส์ เคมี ชีววิทยา และวิทยาศาสตร์สิ่งแวดล้อม',
        icon: 'Atom',
      };
      const subfield = {
        id: 'renewable_energy',
        subjectId: 'science',
        nameTh: 'พลังงานทดแทน',
        nameEn: 'Renewable Energy',
        description: 'เซลล์แสงอาทิตย์ พลังงานลม ชีวมวล',
        icon: 'Sun',
      };
      expect(SubjectSchema.safeParse(subject).success).toBe(true);
      expect(SubfieldSchema.safeParse(subfield).success).toBe(true);
    });

    it('accepts valid TopicCard (problem spark, not finished idea)', () => {
      const card = {
        id: 'card_sci_01',
        subjectId: 'science',
        subfieldId: 'renewable_energy',
        title: 'การดักจับความร้อนเหลือทิ้งจากคอมเพรสเซอร์แอร์ในโรงเรียน',
        phenomenon: 'คอมเพรสเซอร์แอร์ปล่อยลมร้อนตลอดทั้งวัน แต่พลังงานความร้อนนี้สูญเปล่า',
        curiosityHook: 'เราสามารถนำความร้อนเหลือทิ้งนี้มาทำอะไรที่เป็นประโยชน์ในโรงเรียนได้บ้าง?',
        targetGradeLevels: ['m_ton', 'm_plai'],
        difficulty: 'intermediate',
        estimatedWeeks: 6,
        estimatedBudgetBaht: 1200,
        requiredEquipment: ['เทอร์โมมิเตอร์', 'ท่อทองแดง'],
        minTeamSize: 1,
        maxTeamSize: 3,
        requiredSkills: ['งานช่างพื้นฐาน'],
      };
      expect(TopicCardSchema.safeParse(card).success).toBe(true);
    });
  });

  describe('SwipeAction & ShortlistItem', () => {
    it('accepts 4 swipe directions: skip, interested, do_it_now, undo', () => {
      for (const dir of ['skip', 'interested', 'do_it_now', 'undo'] as const) {
        expect(SwipeDirectionSchema.safeParse(dir).success).toBe(true);
        expect(
          SwipeActionSchema.safeParse({
            cardId: 'card_01',
            direction: dir,
            timestamp: '2026-11-05T09:35:00.000Z',
          }).success,
        ).toBe(true);
      }
      expect(SwipeDirectionSchema.safeParse('superlike').success).toBe(false);
    });
  });

  describe('FitScoreSchema (0-100 range and breakdown)', () => {
    it('validates 0-100 integer boundaries', () => {
      const baseBreakdown = {
        time: 80,
        budget: 90,
        equipment: 70,
        teamSize: 100,
        skills: 60,
        gradeLevel: 100,
      };

      expect(FitScoreSchema.safeParse({ score: 0, breakdown: baseBreakdown }).success).toBe(true);
      expect(FitScoreSchema.safeParse({ score: 100, breakdown: baseBreakdown }).success).toBe(true);
      expect(FitScoreSchema.safeParse({ score: 50, breakdown: baseBreakdown }).success).toBe(true);

      // Invalid boundaries
      expect(FitScoreSchema.safeParse({ score: -1, breakdown: baseBreakdown }).success).toBe(false);
      expect(FitScoreSchema.safeParse({ score: 101, breakdown: baseBreakdown }).success).toBe(false);
      expect(FitScoreSchema.safeParse({ score: 75.5, breakdown: baseBreakdown }).success).toBe(false);
    });

    it('validates ShortlistItem containing card and FitScore', () => {
      const item = {
        card: {
          id: 'card_sci_01',
          subjectId: 'science',
          subfieldId: 'renewable_energy',
          title: 'พลังงานความร้อนเหลือทิ้ง',
          phenomenon: 'ปรากฏการณ์ความร้อนจากแอร์',
          curiosityHook: 'นำกลับมาใช้ประโยชน์ได้อย่างไร?',
          targetGradeLevels: ['m_ton', 'm_plai'],
          difficulty: 'beginner',
          estimatedWeeks: 4,
          estimatedBudgetBaht: 500,
          requiredEquipment: ['มิเตอร์'],
          minTeamSize: 1,
          maxTeamSize: 2,
          requiredSkills: ['สังเกต'],
        },
        fitScore: {
          score: 85,
          breakdown: {
            time: 90,
            budget: 80,
            equipment: 85,
            teamSize: 100,
            skills: 80,
            gradeLevel: 100,
          },
        },
        addedAt: '2026-11-05T09:40:00.000Z',
      };
      expect(ShortlistItemSchema.safeParse(item).success).toBe(true);
    });
  });

  describe('IdeaSchema', () => {
    it('accepts valid student idea', () => {
      const idea = {
        id: 'idea_001',
        learnerId: 'guest_123',
        title: 'ระบบอุ่นน้ำล้างจานจากความร้อนเหลือทิ้งคอมเพรสเซอร์แอร์',
        description: 'นำท่อทองแดงมาขดรอบคอนเดนเซอร์เพื่อดึงความร้อนไปอุ่นน้ำสำหรับโรงอาหาร',
        source: 'discovery_track',
        sourceTopicCardId: 'card_sci_01',
        gradeLevel: 'm_ton',
        goal: 'ysc',
        createdAt: '2026-11-05T09:45:00.000Z',
        updatedAt: '2026-11-05T09:45:00.000Z',
      };
      expect(IdeaSchema.safeParse(idea).success).toBe(true);
    });
  });

  describe('EvaluationSchema (5 axes: 1-10 scores, badges, rationale, feedback)', () => {
    it('validates 1-10 integer score boundaries for axis evaluation', () => {
      const validAxis = {
        score: 8,
        badge: 'green',
        rationale: 'มีมุมมองใหม่ในการประยุกต์ใช้ในบริบทโรงเรียน',
        feedback: 'ควรเพิ่มการเปรียบเทียบอัตราการถ่ายเทความร้อน',
      };
      expect(EvaluationAxisSchema.safeParse(validAxis).success).toBe(true);

      // Boundary tests
      expect(EvaluationAxisSchema.safeParse({ ...validAxis, score: 1 }).success).toBe(true);
      expect(EvaluationAxisSchema.safeParse({ ...validAxis, score: 10 }).success).toBe(true);
      expect(EvaluationAxisSchema.safeParse({ ...validAxis, score: 0 }).success).toBe(false);
      expect(EvaluationAxisSchema.safeParse({ ...validAxis, score: 11 }).success).toBe(false);
      expect(EvaluationAxisSchema.safeParse({ ...validAxis, score: 7.5 }).success).toBe(false);
      expect(EvaluationAxisSchema.safeParse({ ...validAxis, badge: 'blue' }).success).toBe(false);
    });

    it('accepts full Evaluation with 5 axes, safetyFlags, and priorWork', () => {
      const evaluation = {
        id: 'eval_001',
        ideaId: 'idea_001',
        overallScore: 8,
        overallBadge: 'green',
        axes: {
          novelty: { score: 7, badge: 'green', rationale: 'แปลกใหม่', feedback: 'ดี' },
          feasibility: { score: 8, badge: 'green', rationale: 'ทำได้จริง', feedback: 'ตรวจท่อ' },
          impact: { score: 9, badge: 'green', rationale: 'ประหยัดพลังงาน', feedback: 'วัดผลชัดเจน' },
          rigor: { score: 7, badge: 'green', rationale: 'มีตัวแปรควบคุม', feedback: 'บันทึกอุณหภูมิ' },
          fit: { score: 9, badge: 'green', rationale: 'ตรงเกณฑ์ YSC ฟิสิกส์/วิศวะ', feedback: 'พร้อมยื่น' },
        },
        safetyFlags: [],
        priorWork: [
          {
            id: 'pw_001',
            title: 'การประยุกต์ใช้ความร้อนเหลือทิ้งเพื่อผลิตน้ำร้อน',
            authors: 'นายวิทยา กิจการดี',
            year: 2023,
            competitionOrVenue: 'YSC 2023',
            url: 'https://nstda.or.th/ysc/projects/2023/heat-recovery',
            summary: 'ศึกษาการดึงความร้อนจากแอร์บ้าน 12000 BTU',
            difference: 'งานเดิมเน้นแอร์บ้าน แต่งานนี้ออกแบบสำหรับโรงอาหารโรงเรียนขนาดใหญ่',
          },
        ],
        evaluatedAt: '2026-11-05T09:50:00.000Z',
      };
      expect(EvaluationSchema.safeParse(evaluation).success).toBe(true);
    });
  });

  describe('PriorWorkSchema (http/https requirement)', () => {
    const validPriorWork = {
      id: 'pw_001',
      title: 'การศึกษาเซลล์แสงอาทิตย์สีย้อมไวแสงจากเปลือกมังคุด',
      authors: 'สมศรี นักวิจัย',
      year: 2024,
      competitionOrVenue: 'YSC 2024',
      url: 'https://example.com/project',
      summary: 'สกัดสีย้อมจากเปลือกมังคุดเพื่อทำ DSSC',
      difference: 'ใช้สารสกัดจากพืชต่างชนิดกัน',
    };

    it('accepts valid http and https URLs', () => {
      expect(PriorWorkSchema.safeParse({ ...validPriorWork, url: 'https://ysc.org/report.pdf' }).success).toBe(true);
      expect(PriorWorkSchema.safeParse({ ...validPriorWork, url: 'http://scisoc.or.th/paper/123' }).success).toBe(true);
    });

    it('rejects non-http(s) schemes: ftp, javascript, data, or bare text', () => {
      expect(PriorWorkSchema.safeParse({ ...validPriorWork, url: 'ftp://files.example.com/doc.pdf' }).success).toBe(false);
      expect(PriorWorkSchema.safeParse({ ...validPriorWork, url: 'javascript:alert(1)' }).success).toBe(false);
      expect(PriorWorkSchema.safeParse({ ...validPriorWork, url: 'not-a-valid-url' }).success).toBe(false);
      expect(PriorWorkSchema.safeParse({ ...validPriorWork, url: '' }).success).toBe(false);
    });
  });

  describe('SafetyFlagSchema (SRC/ISEF 5 risk categories)', () => {
    it('validates 5 canonical categories', () => {
      const canonicalCategories = [
        'hazardous_chemicals',
        'vertebrate_animals',
        'human_subjects',
        'biological_agents',
        'high_voltage_radiation',
      ] as const;

      for (const cat of canonicalCategories) {
        expect(SafetyCategorySchema.safeParse(cat).success).toBe(true);
        expect(
          SafetyFlagSchema.safeParse({
            category: cat,
            flagged: true,
            reasonTh: 'มีการใช้สารเคมีกัดกร่อน',
            advisoryTh: 'ต้องสวมถุงมือและอยู่ภายใต้การควบคุมของครูผู้ดูแล',
            requiresPreApproval: true,
          }).success,
        ).toBe(true);
      }

      expect(SafetyCategorySchema.safeParse('nuclear_reactor').success).toBe(false);
      expect(SafetyCategorySchema.safeParse('fireworks').success).toBe(false);
    });
  });

  describe('RubricPresetSchema', () => {
    it('accepts valid preset with 5 weights and criteria', () => {
      const preset = {
        id: 'preset_ysc_m_plai',
        goal: 'ysc',
        gradeLevel: 'm_plai',
        nameTh: 'เกณฑ์การประเมิน YSC (ม.ปลาย)',
        descriptionTh: 'เน้นกระบวนการทางวิทยาศาสตร์ ระเบียบวิธีวิจัย ความคิดริเริ่มสร้างสรรค์',
        weights: {
          novelty: 0.2,
          feasibility: 0.15,
          impact: 0.15,
          rigor: 0.35,
          fit: 0.15,
        },
        criteria: {
          novelty: 'มีความคิดริเริ่ม ไม่ซ้ำกับโครงงานเดิม',
          feasibility: 'มีแผนดำเนินงานและเครื่องมือพร้อม',
          impact: 'สร้างประโยชน์เชิงวิชาการหรือชุมชน',
          rigor: 'กำหนดตัวแปรและสมมติฐานที่วัดผลเชิงปริมาณได้',
          fit: 'ตรงตามมาตรฐานการแข่งขันระดับชาติ',
        },
        isHeuristic: false,
      };
      expect(RubricPresetSchema.safeParse(preset).success).toBe(true);
    });
  });

  describe('Pivot & PivotCoachingSchema (3-tier scaffolding)', () => {
    it('accepts valid PivotCoaching structure', () => {
      const coaching = {
        tier: 1,
        tier1Prompt: 'จะทำอย่างไรให้โครงงานนี้วัดผลเชิงปริมาณได้แม่นยำขึ้นโดยไม่ต้องใช้เครื่องมือราคาแพง?',
        tier2Lenses: [
          'Abstraction Ladder: ย่อสเกลลงมาทดสอบในห้องเรียน',
          'Cross-Pollination: เปลี่ยนวัสดุเป็นของเหลือใช้ในท้องถิ่น',
          'Boundary Probing: ทดสอบในสภาวะสุดขั้ว',
        ],
        tier3Examples: ['ติดตั้งท่อขนาน', 'ใช้วาล์วควบคุมแรงดัน'],
        selectedAngle: 'ใช้ท่อทองแดงดัดขนานร่วมกับเซนเซอร์ Arduino ราคาประหยัด',
      };
      expect(PivotCoachingSchema.safeParse(coaching).success).toBe(true);

      const pivot = {
        id: 'piv_001',
        originalIdeaId: 'idea_001',
        redAxes: ['feasibility'],
        coaching,
        newIdeaTitle: 'ระบบแลกเปลี่ยนความร้อนต้นทุนต่ำสำหรับโรงเรียน',
        newIdeaDescription: 'ปรับใช้วัสดุเหลือใช้และเซนเซอร์ราคาประหยัด',
        createdAt: '2026-11-05T10:00:00.000Z',
      };
      expect(PivotSchema.safeParse(pivot).success).toBe(true);
    });
  });

  describe('Project, Proposal & Plan Schemas', () => {
    it('accepts valid Proposal with hypothesis, variables, and methodology', () => {
      const proposal = {
        title: 'โครงงานการนำความร้อนเหลือทิ้งมาผลิตน้ำอุ่น',
        problemStatement: 'โรงเรียนมีการใช้พลังงานไฟฟ้าจำนวนมากในระบบปรับอากาศ และปล่อยความร้อนทิ้ง',
        objectives: ['เพื่อออกแบบระบบดักจับความร้อน', 'เพื่อวัดประสิทธิภาพการถ่ายเทความร้อน'],
        hypothesis: 'การเพิ่มพื้นที่ผิวท่อขดจะทำให้อุณหภูมิน้ำเพิ่มขึ้นอย่างน้อย 5 องศาเซลเซียส',
        variables: {
          independent: ['ความยาวของท่อทองแดง', 'อัตราการไหลของน้ำ'],
          dependent: ['อุณหภูมิน้ำที่เพิ่มขึ้น'],
          controlled: ['อุณหภูมิอากาศแวดล้อม', 'ขนาด BTU ของคอมเพรสเซอร์'],
        },
        methodology: 'ติดตั้งท่อทองแดง ต่อเข้ากับถังเก็บน้ำ และบันทึกอุณหภูมิทุก 30 นาที เป็นเวลา 7 วัน',
      };
      expect(ProposalSchema.safeParse(proposal).success).toBe(true);
    });

    it('accepts valid Plan with weekly milestones', () => {
      const plan = {
        targetDeadline: '2027-01-15T00:00:00.000Z',
        totalWeeks: 8,
        milestones: [
          {
            week: 1,
            title: 'สืบค้นข้อมูลและจัดหาอุปกรณ์',
            description: 'เตรียมท่อทองแดงและเซนเซอร์',
            deliverable: 'รายการอุปกรณ์ครบถ้วน',
            completed: true,
          },
          {
            week: 2,
            title: 'ประกอบชุดทดลอง',
            description: 'ต่อวงจรและเดินท่อน้ำ',
            deliverable: 'ชุดทดลองพร้อมทำงาน',
            completed: false,
          },
        ],
      };
      expect(PlanSchema.safeParse(plan).success).toBe(true);
    });

    it('accepts valid Project linking Idea, Proposal and Plan', () => {
      const project = {
        id: 'proj_001',
        learnerId: 'guest_123',
        ideaId: 'idea_001',
        title: 'โครงงานการนำความร้อนเหลือทิ้งมาผลิตน้ำอุ่น',
        proposal: {
          title: 'โครงงานการนำความร้อนเหลือทิ้งมาผลิตน้ำอุ่น',
          problemStatement: 'ปัญหาความร้อนสูญเปล่า',
          objectives: ['ประหยัดพลังงาน'],
          hypothesis: 'อุณหภูมิน้ำเพิ่มขึ้น',
          variables: {
            independent: ['ความยาวท่อ'],
            dependent: ['อุณหภูมิน้ำ'],
            controlled: ['ขนาดแอร์'],
          },
          methodology: 'ทดลองและบันทึกผล',
        },
        plan: {
          targetDeadline: '2027-01-15T00:00:00.000Z',
          totalWeeks: 4,
          milestones: [
            {
              week: 1,
              title: 'เตรียมการ',
              description: 'เตรียมของ',
              deliverable: 'ของครบ',
              completed: true,
            },
          ],
        },
        status: 'in_progress',
        createdAt: '2026-11-05T10:15:00.000Z',
        updatedAt: '2026-11-05T10:15:00.000Z',
      };
      expect(ProjectSchema.safeParse(project).success).toBe(true);
    });
  });
});
