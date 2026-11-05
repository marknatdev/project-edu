import type { Proposal, Plan } from '@/types/domain';

export const exportFixture: { title: string; proposal: Proposal; plan: Plan } = {
  title: 'พลังงานแสงอาทิตย์',
  proposal: {
    title: 'พลังงานแสงอาทิตย์',
    problemStatement: 'ชุมชนต้องการลดค่าไฟ',
    objectives: ['เปรียบเทียบกำลังไฟ'],
    hypothesis: 'มุมเอียงมากขึ้น',
    variables: {
      independent: ['มุมเอียงแผง'], dependent: ['กำลังไฟ (W)'], controlled: ['ชนิดแผง'],
    },
    methodology: 'วัดกำลังไฟวันละ 3 ครั้ง',
  },
  plan: {
    totalWeeks: 1, targetDeadline: '2026-12-01T00:00:00.000Z',
    milestones: [{ week: 1, title: 'เตรียมแผง', description: 'ติดตั้งแผงและวัดค่า', deliverable: 'ตารางกำลังไฟ', completed: false }],
  },
};
