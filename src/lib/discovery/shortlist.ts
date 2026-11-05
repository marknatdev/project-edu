import { computeFitScore } from '@/lib/rubrics/engine';
import { screenIdea } from '@/lib/safety/screener';
import type {
  TopicCard,
  Constraints,
  GradeLevel,
  FitScore,
} from '@/types/domain';

export interface RankedShortlistItem {
  card: TopicCard;
  fitScore: FitScore;
  superLiked?: boolean;
  timeRatio: number;
  budgetRatio: number;
  reasons: string[];
  pros: string[];
  cons: string[];
}

export type ShortlistSortKey = 'fit' | 'budget' | 'weeks';

export interface ComparisonDimension {
  key: string;
  label: string;
  valueA: string;
  valueB: string;
  winner: 'a' | 'b' | 'tie';
  winnerNote?: string;
}

export interface ComparisonResult {
  cardA: TopicCard;
  cardB: TopicCard;
  dimensions: ComparisonDimension[];
  takeaway: string;
}

/**
 * Evaluates, scores, and ranks shortlisted cards against learner constraints and grade level.
 */
export function rankShortlist(
  cards: TopicCard[],
  constraints: Constraints,
  gradeLevel: GradeLevel,
  superLikedCardIds: string[] = []
): RankedShortlistItem[] {
  const superLikedSet = new Set(superLikedCardIds);

  const items: RankedShortlistItem[] = cards.map((card) => {
    const fitScore = computeFitScore(card, constraints, gradeLevel);
    const superLiked = superLikedSet.has(card.id);

    const timeRatio =
      constraints.timeWeeks > 0
        ? Number((card.estimatedWeeks / constraints.timeWeeks).toFixed(2))
        : 1;

    const budgetRatio =
      constraints.budgetBaht > 0
        ? Number((card.estimatedBudgetBaht / constraints.budgetBaht).toFixed(2))
        : 0;

    // Plain-Thai "ทำไมได้ Fit นี้" factor explanations
    const reasons: string[] = [];

    // Time reason
    if (fitScore.breakdown.time === 100) {
      reasons.push(
        `เวลาเหมาะสม: คาดว่าใช้ ${card.estimatedWeeks} สัปดาห์ (จากกรอบที่ตั้งไว้ ${constraints.timeWeeks} สัปดาห์)`
      );
    } else {
      reasons.push(
        `ระยะเวลาอาจกระชั้นชิด: คาดว่าใช้ ${card.estimatedWeeks} สัปดาห์ (เกินกรอบ ${constraints.timeWeeks} สัปดาห์)`
      );
    }

    // Budget reason
    if (fitScore.breakdown.budget === 100) {
      reasons.push(
        `งบประมาณอยู่ในเกณฑ์: คาดว่าใช้ ${card.estimatedBudgetBaht.toLocaleString()} บาท (จากงบ ${constraints.budgetBaht.toLocaleString()} บาท)`
      );
    } else {
      reasons.push(
        `งบประมาณอาจตึงตัว: คาดว่าใช้ ${card.estimatedBudgetBaht.toLocaleString()} บาท (เกินงบ ${constraints.budgetBaht.toLocaleString()} บาท)`
      );
    }

    // Equipment reason
    if (fitScore.breakdown.equipment === 100) {
      reasons.push(`อุปกรณ์พร้อม: มีอุปกรณ์จำเป็นครบถ้วนสำหรับการทดลอง`);
    } else {
      const needed = card.requiredEquipment.filter(
        (eq) => !constraints.equipment.some((userEq) => userEq.toLowerCase().includes(eq.toLowerCase()))
      );
      reasons.push(
        `ต้องจัดหาอุปกรณ์เพิ่ม: ${needed.length > 0 ? needed.join(', ') : 'อุปกรณ์เฉพาะทาง'}`
      );
    }

    // Team reason
    if (fitScore.breakdown.teamSize === 100) {
      reasons.push(`ขนาดทีมเหมาะสม: สมาชิก ${constraints.teamSize} คน เหมาะกับเนื้องาน`);
    } else {
      reasons.push(
        `ขนาดทีม: ปัจจุบันมี ${constraints.teamSize} คน (การ์ดแนะนำ ${card.minTeamSize}-${card.maxTeamSize} คน)`
      );
    }

    // Skills reason
    if (fitScore.breakdown.skills >= 80) {
      reasons.push(`ทักษะตรงกับความพร้อม: ทักษะที่ต้องใช้อยู่ในเกณฑ์ที่ทำได้`);
    } else {
      reasons.push(`ต้องศึกษาทักษะเพิ่มเติม: ${card.requiredSkills.join(', ')}`);
    }

    // Pros
    const pros: string[] = [];
    if (fitScore.score >= 80) {
      pros.push('ความพร้อมสูงมาก สอดคล้องกับข้อจำกัดปัจจุบันของผู้เรียน');
    }
    const safetyCheck = screenIdea(
      `${card.title} ${card.phenomenon} ${card.curiosityHook}`
    );
    if (safetyCheck.length === 0 && (!card.safetyCategories || card.safetyCategories.length === 0)) {
      pros.push('ผ่านเกณฑ์ความปลอดภัยเบื้องต้น ไม่มีสารเคมีหรือสิ่งมีชีวิตควบคุมอันตรายสูง');
    }
    if (card.estimatedBudgetBaht <= 500) {
      pros.push('ประหยัดงบประมาณ ใช้วัสดุหาง่ายในท้องถิ่นหรือโรงเรียน');
    }
    if (card.estimatedWeeks <= 4) {
      pros.push('ใช้เวลาสั้น สรุปผลและวิเคราะห์ข้อมูลได้รวดเร็ว');
    }
    if (card.difficulty === 'beginner') {
      pros.push('ระดับเริ่มต้น เหมาะสำหรับการเริ่มต้นทำโครงงานครั้งแรก');
    }
    if (pros.length === 0) {
      pros.push('หัวข้อมีความน่าสนใจและเป็นประเด็นใหม่ในสาขาวิชา');
    }

    // Cons / Considerations
    const cons: string[] = [];
    if (safetyCheck.length > 0 || (card.safetyCategories && card.safetyCategories.length > 0)) {
      cons.push('มีประเด็นความปลอดภัยที่ต้องมีครูที่ปรึกษากำกับดูแล และเตรียมเอกสาร SRC/ISEF');
    }
    if (budgetRatio > 1) {
      cons.push(`งบประมาณอาจเกินเป้าหมาย (${card.estimatedBudgetBaht.toLocaleString()} ฿)`);
    }
    if (timeRatio > 1) {
      cons.push(`ระยะเวลาอาจเกินกรอบที่ตั้งไว้ (${card.estimatedWeeks} สัปดาห์)`);
    }
    if (card.difficulty === 'advanced') {
      cons.push('ความยากระดับสูง ต้องใช้ความรู้เชิงทฤษฎีและการทดลองเฉพาะทาง');
    }
    if (cons.length === 0) {
      cons.push('ควรกำหนดแผนการทดลองและตัวแปรให้ชัดเจนก่อนลงมือทำ');
    }

    return {
      card,
      fitScore,
      superLiked,
      timeRatio,
      budgetRatio,
      reasons,
      pros,
      cons,
    };
  });

  // Sort descending by fit score, super-liked cards break ties
  return items.sort((a, b) => {
    if (b.fitScore.score !== a.fitScore.score) {
      return b.fitScore.score - a.fitScore.score;
    }
    if (a.superLiked && !b.superLiked) return -1;
    if (!a.superLiked && b.superLiked) return 1;
    return 0;
  });
}

/**
 * Sorts ranked shortlist items by fit, budget, or weeks.
 */
export function sortShortlist(
  items: RankedShortlistItem[],
  sortBy: ShortlistSortKey
): RankedShortlistItem[] {
  const copy = [...items];
  switch (sortBy) {
    case 'budget':
      return copy.sort((a, b) => {
        if (a.card.estimatedBudgetBaht !== b.card.estimatedBudgetBaht) {
          return a.card.estimatedBudgetBaht - b.card.estimatedBudgetBaht;
        }
        return b.fitScore.score - a.fitScore.score;
      });
    case 'weeks':
      return copy.sort((a, b) => {
        if (a.card.estimatedWeeks !== b.card.estimatedWeeks) {
          return a.card.estimatedWeeks - b.card.estimatedWeeks;
        }
        return b.fitScore.score - a.fitScore.score;
      });
    case 'fit':
    default:
      return copy.sort((a, b) => {
        if (b.fitScore.score !== a.fitScore.score) {
          return b.fitScore.score - a.fitScore.score;
        }
        if (a.superLiked && !b.superLiked) return -1;
        if (!a.superLiked && b.superLiked) return 1;
        return 0;
      });
  }
}

/**
 * Recommends the single best card from the ranked shortlist.
 */
export function recommendOne(
  items: RankedShortlistItem[]
): { item: RankedShortlistItem; reason: string } | null {
  if (items.length === 0) {
    return null;
  }

  // Top item according to ranking
  const top = items[0];
  const fitText = `คะแนน Fit สูงสุด ${top.fitScore.score}%`;
  const superText = top.superLiked ? ' (คุณปักหมุดอยากทำเลย)' : '';
  const reason = `แนะนำอันดับ 1 เนื่องจาก${fitText}${superText} ทั้งระยะเวลา (${top.card.estimatedWeeks} สัปดาห์) และงบประมาณ (${top.card.estimatedBudgetBaht.toLocaleString()} ฿) สอดคล้องกับข้อจำกัดของคุณมากที่สุด`;

  return { item: top, reason };
}

/**
 * Compares two cards side-by-side with per-dimension winner analysis and takeaway.
 */
export function compareTwo(
  cardA: TopicCard,
  cardB: TopicCard,
  constraints: Constraints,
  gradeLevel: GradeLevel
): ComparisonResult {
  const fitA = computeFitScore(cardA, constraints, gradeLevel);
  const fitB = computeFitScore(cardB, constraints, gradeLevel);

  const safetyA = (cardA.safetyCategories?.length ?? 0) === 0;
  const safetyB = (cardB.safetyCategories?.length ?? 0) === 0;

  const difficultyOrder = { beginner: 1, intermediate: 2, advanced: 3 };

  const dimensions: ComparisonDimension[] = [
    {
      key: 'fit',
      label: 'Fit Score',
      valueA: `${fitA.score}%`,
      valueB: `${fitB.score}%`,
      winner: fitA.score === fitB.score ? 'tie' : fitA.score > fitB.score ? 'a' : 'b',
      winnerNote:
        fitA.score === fitB.score
          ? 'เหมาะสมเท่ากัน'
          : fitA.score > fitB.score
            ? 'หัวข้อซ้ายเข้ากับข้อจำกัดมากกว่า'
            : 'หัวข้อขวาเข้ากับข้อจำกัดมากกว่า',
    },
    {
      key: 'budget',
      label: 'งบประมาณ',
      valueA: `${cardA.estimatedBudgetBaht.toLocaleString()} ฿`,
      valueB: `${cardB.estimatedBudgetBaht.toLocaleString()} ฿`,
      winner:
        cardA.estimatedBudgetBaht === cardB.estimatedBudgetBaht
          ? 'tie'
          : cardA.estimatedBudgetBaht < cardB.estimatedBudgetBaht
            ? 'a'
            : 'b',
      winnerNote:
        cardA.estimatedBudgetBaht === cardB.estimatedBudgetBaht
          ? 'งบประมาณเท่ากัน'
          : cardA.estimatedBudgetBaht < cardB.estimatedBudgetBaht
            ? 'หัวข้อซ้ายประหยัดกว่า'
            : 'หัวข้อขวาประหยัดกว่า',
    },
    {
      key: 'weeks',
      label: 'ระยะเวลา',
      valueA: `${cardA.estimatedWeeks} สัปดาห์`,
      valueB: `${cardB.estimatedWeeks} สัปดาห์`,
      winner:
        cardA.estimatedWeeks === cardB.estimatedWeeks
          ? 'tie'
          : cardA.estimatedWeeks < cardB.estimatedWeeks
            ? 'a'
            : 'b',
      winnerNote:
        cardA.estimatedWeeks === cardB.estimatedWeeks
          ? 'ใช้เวลาเท่ากัน'
          : cardA.estimatedWeeks < cardB.estimatedWeeks
            ? 'หัวข้อซ้ายใช้เวลาน้อยกว่า'
            : 'หัวข้อขวาใช้เวลาน้อยกว่า',
    },
    {
      key: 'safety',
      label: 'ความปลอดภัย',
      valueA: safetyA ? 'ปลอดภัย (ทั่วไป)' : 'มีข้อควรระวัง SRC',
      valueB: safetyB ? 'ปลอดภัย (ทั่วไป)' : 'มีข้อควรระวัง SRC',
      winner: safetyA === safetyB ? 'tie' : safetyA ? 'a' : 'b',
      winnerNote:
        safetyA === safetyB
          ? 'ระดับความปลอดภัยใกล้เคียงกัน'
          : safetyA
            ? 'หัวข้อซ้ายไม่มีสาร/สิ่งมีชีวิตควบคุม'
            : 'หัวข้อขวาไม่มีสาร/สิ่งมีชีวิตควบคุม',
    },
    {
      key: 'difficulty',
      label: 'ความยาก',
      valueA:
        cardA.difficulty === 'beginner'
          ? 'ระดับเริ่มต้น'
          : cardA.difficulty === 'intermediate'
            ? 'ระดับปานกลาง'
            : 'ระดับสูง',
      valueB:
        cardB.difficulty === 'beginner'
          ? 'ระดับเริ่มต้น'
          : cardB.difficulty === 'intermediate'
            ? 'ระดับปานกลาง'
            : 'ระดับสูง',
      winner:
        difficultyOrder[cardA.difficulty] === difficultyOrder[cardB.difficulty]
          ? 'tie'
          : difficultyOrder[cardA.difficulty] < difficultyOrder[cardB.difficulty]
            ? 'a'
            : 'b',
      winnerNote:
        difficultyOrder[cardA.difficulty] === difficultyOrder[cardB.difficulty]
          ? 'ความยากระดับเดียวกัน'
          : difficultyOrder[cardA.difficulty] < difficultyOrder[cardB.difficulty]
            ? 'หัวข้อซ้ายเริ่มต้นได้ง่ายกว่า'
            : 'หัวข้อขวาเริ่มต้นได้ง่ายกว่า',
    },
  ];

  // Synthesize takeaway
  let takeaway = '';
  if (fitA.score > fitB.score) {
    takeaway = `หัวข้อ "${cardA.title}" เข้ากับเวลาและงบประมาณของคุณมากกว่า (${fitA.score}% vs ${fitB.score}%)`;
  } else if (fitB.score > fitA.score) {
    takeaway = `หัวข้อ "${cardB.title}" เข้ากับเวลาและงบประมาณของคุณมากกว่า (${fitB.score}% vs ${fitA.score}%)`;
  } else {
    takeaway = `ทั้งสองหัวข้อมีคะแนน Fit เท่ากัน (${fitA.score}%) ให้พิจารณาจากความสนใจในหัวข้อและความพร้อมของอุปกรณ์`;
  }

  return {
    cardA,
    cardB,
    dimensions,
    takeaway,
  };
}
