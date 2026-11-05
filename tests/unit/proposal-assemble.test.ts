import { describe, it, expect } from 'vitest';
import {
  assembleProposal,
  updateProposalSection,
  verifyProposalProvenance,
  type ProposalAssemblySources,
} from '@/lib/proposal/assemble';
import type { Idea, Interview, Proposal } from '@/types/domain';

describe('Proposal Assembly (ADR 0002: Co-created, Student-Only Content)', () => {
  const mockIdea: Idea = {
    id: 'idea-citrus-01',
    learnerId: 'learner-anon-42',
    title: 'สารเคลือบชีวภาพจากเพกตินเปลือกส้มโอชะลอการสุกของมะม่วง',
    description: 'การเน่าเสียของผลไม้น้ำดอกไม้หลังการเก็บเกี่ยวสร้างความสูญเสียทางเศรษฐกิจ จึงต้องการทดสอบสารเคลือบธรรมชาติจากของเหลือใช้ทางการเกษตร',
    source: 'idea_track',
    gradeLevel: 'm_plai',
    goal: 'ysc',
    variables: {
      independent: 'ความเข้มข้นของเพกตินเปลือกส้มโอ (1%, 3%, 5%)',
      dependent: 'การสูญเสียน้ำหนัก ความแน่นเนื้อ และค่าสีเปลือก',
      controlled: ['อุณหภูมิห้องเก็บรักษา (25°C) พันธุ์มะม่วง ระยะความสุกเริ่มต้น'],
      controlGroup: 'ไม่เคลือบเพกติน',
      replicates: 3,
    },
    createdAt: '2026-11-05T08:00:00.000Z',
    updatedAt: '2026-11-05T08:00:00.000Z',
  };

  const mockInterview: Interview = {
    id: 'interview-01',
    learnerId: 'learner-anon-42',
    gradeLevel: 'm_plai',
    goal: 'ysc',
    constraints: {
      timeWeeks: 8,
      budgetBaht: 2500,
      equipment: ['เครื่องปั่น', 'เครื่องชั่งดิจิทัล', 'บีกเกอร์'],
      teamSize: 2,
      skills: ['การทดลองเคมีพื้นฐาน', 'การบันทึกข้อมูล'],
    },
    hasInitialIdea: true,
    selectedTrack: 'idea_track',
    completedAt: '2026-11-05T08:05:00.000Z',
  };

  describe('Seam 1: Assembly pre-filled ONLY from student answers', () => {
    it('pre-fills 5 sections and title strictly from student input with no AI hallucinations', () => {
      const sources: ProposalAssemblySources = {
        idea: mockIdea,
        interview: mockInterview,
        studentAnswers: {
          problemStatement: mockIdea.description,
          objectives: [
            'เพื่อสกัดเพกตินจากเปลือกส้มโอ',
            'เพื่อเปรียบเทียบประสิทธิภาพสารเคลือบเพกตินแต่ละความเข้มข้นในการชะลอการสุก',
          ],
          hypothesis: 'สารเคลือบเพกตินความเข้มข้น 3% จะช่วยลดอัตราการสูญเสียน้ำหนักและคงความแน่นเนื้อได้ดีที่สุด',
          methodology: '1. สกัดเพกติน 2. เตรียมสารละลาย 3. เคลือบผิวมะม่วง 4. สังเกตผลทุก 3 วันเป็นเวลา 14 วัน',
        },
      };

      const proposal = assembleProposal(sources);

      // Title must match student title
      expect(proposal.title).toBe(mockIdea.title);

      // 1. ที่มาและความสำคัญ (problemStatement)
      expect(proposal.problemStatement).toBe(mockIdea.description);

      // 2. วัตถุประสงค์ (objectives)
      expect(proposal.objectives).toEqual([
        'เพื่อสกัดเพกตินจากเปลือกส้มโอ',
        'เพื่อเปรียบเทียบประสิทธิภาพสารเคลือบเพกตินแต่ละความเข้มข้นในการชะลอการสุก',
      ]);

      // 3. สมมติฐาน (hypothesis)
      expect(proposal.hypothesis).toBe(
        'สารเคลือบเพกตินความเข้มข้น 3% จะช่วยลดอัตราการสูญเสียน้ำหนักและคงความแน่นเนื้อได้ดีที่สุด'
      );

      // 4. ตัวแปร (variables: independent, dependent, controlled)
      expect(proposal.variables.independent).toContain('ความเข้มข้นของเพกตินเปลือกส้มโอ (1%, 3%, 5%)');
      expect(proposal.variables.dependent).toContain('การสูญเสียน้ำหนัก ความแน่นเนื้อ และค่าสีเปลือก');
      expect(proposal.variables.controlled).toContain('อุณหภูมิห้องเก็บรักษา (25°C) พันธุ์มะม่วง ระยะความสุกเริ่มต้น');

      // 5. วิธีทำ / ขั้นตอนดำเนินงาน (methodology)
      expect(proposal.methodology).toBe(
        '1. สกัดเพกติน 2. เตรียมสารละลาย 3. เคลือบผิวมะม่วง 4. สังเกตผลทุก 3 วันเป็นเวลา 14 วัน'
      );
    });

    it('provenance check confirms 100% of non-empty text traces to student input', () => {
      const sources: ProposalAssemblySources = {
        idea: mockIdea,
        interview: mockInterview,
        studentAnswers: {
          problemStatement: 'ปัญหาขยะเปลือกส้มโอในชุมชน',
          objectives: ['สกัดเพกติน'],
          hypothesis: 'เพกตินชะลอการสูญเสียน้ำหนักได้',
          methodology: 'สกัดด้วยกรดซิตริกความร้อน',
        },
      };

      const proposal = assembleProposal(sources);
      const provenance = verifyProposalProvenance(proposal, sources);

      expect(provenance.valid).toBe(true);
      expect(provenance.untracedFields).toEqual([]);
    });

    it('returns clean empty strings and arrays when student has not answered yet', () => {
      const sources: ProposalAssemblySources = {
        idea: null,
        interview: null,
        studentAnswers: {},
      };

      const proposal = assembleProposal(sources);

      expect(proposal.title).toBe('');
      expect(proposal.problemStatement).toBe('');
      expect(proposal.objectives).toEqual([]);
      expect(proposal.hypothesis).toBe('');
      expect(proposal.variables).toEqual({
        independent: [],
        dependent: [],
        controlled: [],
      });
      expect(proposal.methodology).toBe('');
    });

    it('converts comma or newline separated student variables into array items', () => {
      const sources: ProposalAssemblySources = {
        idea: {
          ...mockIdea,
          variables: {
            independent: 'ความเข้มข้น 1%, ความเข้มข้น 3%, ความเข้มข้น 5%',
            dependent: 'น้ำหนักผลไม้\nความแน่นเนื้อ\nสีเปลือก',
            controlled: 'อุณหภูมิ, ความชื้น, แสงแดด',
          },
        },
      };

      const proposal = assembleProposal(sources);

      expect(proposal.variables.independent).toEqual([
        'ความเข้มข้น 1%',
        'ความเข้มข้น 3%',
        'ความเข้มข้น 5%',
      ]);
      expect(proposal.variables.dependent).toEqual([
        'น้ำหนักผลไม้',
        'ความแน่นเนื้อ',
        'สีเปลือก',
      ]);
      expect(proposal.variables.controlled).toEqual([
        'อุณหภูมิ',
        'ความชื้น',
        'แสงแดด',
      ]);
    });
  });

  describe('Seam 2: Student Edits & Immutability', () => {
    it('preserves user manual edits when re-assembling with preserveEdits flag', () => {
      const initialSources: ProposalAssemblySources = {
        idea: mockIdea,
        studentAnswers: {
          problemStatement: 'ข้อความดั้งเดิมจากนักเรียน',
        },
      };
      const initialProposal = assembleProposal(initialSources);

      // Student edits problemStatement manually
      const editedProposal = updateProposalSection(
        initialProposal,
        'problemStatement',
        'นักเรียนปรับปรุงข้อความที่มาและความสำคัญเพิ่มเติมด้วยตนเอง'
      );

      expect(editedProposal.problemStatement).toBe(
        'นักเรียนปรับปรุงข้อความที่มาและความสำคัญเพิ่มเติมด้วยตนเอง'
      );
      // Immutability check: initialProposal untouched
      expect(initialProposal.problemStatement).toBe('ข้อความดั้งเดิมจากนักเรียน');

      // Re-assembling with preserveEdits keeps the edited text
      const reassembled = assembleProposal({
        idea: mockIdea,
        studentAnswers: {
          problemStatement: 'ข้อความดั้งเดิมจากนักเรียน',
        },
        existingProposal: editedProposal,
        preserveEdits: true,
      });

      expect(reassembled.problemStatement).toBe(
        'นักเรียนปรับปรุงข้อความที่มาและความสำคัญเพิ่มเติมด้วยตนเอง'
      );
    });

    it('updates variables array sections immutably', () => {
      const proposal: Proposal = {
        title: 'โครงงานทดสอบ',
        problemStatement: 'ที่มา',
        objectives: ['ข้อ 1'],
        hypothesis: 'สมมติฐาน',
        variables: {
          independent: ['ตัวแปรต้นเดิม'],
          dependent: ['ตัวแปรตามเดิม'],
          controlled: ['ตัวแปรควบคุมเดิม'],
        },
        methodology: 'วิธีทำ',
      };

      const updated = updateProposalSection(proposal, 'variables', {
        independent: ['ตัวแปรต้นแก้ไขใหม่'],
        dependent: ['ตัวแปรตามเดิม'],
        controlled: ['ตัวแปรควบคุมเดิม'],
      });

      expect(updated.variables.independent).toEqual(['ตัวแปรต้นแก้ไขใหม่']);
      expect(proposal.variables.independent).toEqual(['ตัวแปรต้นเดิม']);
    });
  });

  describe('Seam 3: Zero-PII Compliance', () => {
    it('filters out or rejects any PII fields (realName, school) accidentally passed', () => {
      const sourcesWithForbiddenPii = {
        idea: mockIdea,
        studentAnswers: {
          problemStatement: 'ที่มาโครงงาน',
          realName: 'นายสมชาย ใจดี',
          school: 'โรงเรียนวิทยาศาสตร์ชั้นนำ',
        },
      } as unknown as ProposalAssemblySources;

      const proposal = assembleProposal(sourcesWithForbiddenPii);

      // Proposal structure must not expose or contain PII keys
      expect(proposal).not.toHaveProperty('realName');
      expect(proposal).not.toHaveProperty('school');
      const json = JSON.stringify(proposal);
      expect(json).not.toContain('นายสมชาย ใจดี');
      expect(json).not.toContain('โรงเรียนวิทยาศาสตร์ชั้นนำ');
    });
  });
});
