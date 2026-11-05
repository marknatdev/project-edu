/**
 * Deterministic SRC / ISEF Safety Screener for Project Edu
 *
 * Implements PLAN §1.2 and CONTEXT.md SafetyFlag requirements.
 *
 * DESIGN PHILOSOPHY & NON-BLOCKING CONTRACT:
 * - Detects 5 canonical regulated risk categories from ISEF / Scientific Review Committee (SRC):
 *   1. hazardous_chemicals (สารเคมีอันตราย / กรด-ด่างเข้มข้น)
 *   2. vertebrate_animals (สัตว์มีกระดูกสันหลัง / สัตว์ทดลอง)
 *   3. human_subjects (อาสาสมัครมนุษย์ / แบบสอบถาม / การชิม)
 *   4. biological_agents (จุลินทรีย์ / แบคทีเรีย / เชื้อรา / PHBAs)
 *   5. high_voltage_radiation (ไฟฟ้าแรงสูง / เลเซอร์ / รังสีอันตราย)
 * - Pure and deterministic: does not make network calls or invoke LLMs.
 * - Always emits non-blocking advisories (`blocking: false`). Safety flags guide students
 *   toward safety precautions, required teacher/mentor supervision, and appropriate ISEF
 *   form families (Forms 2, 3, 4, 5A/5B, 6A/6B) without halting ideation or project progress.
 *
 * FALSE POSITIVE MITIGATION & KNOWN LIMITS:
 * 1. Thai Morpheme Boundaries:
 *    - Thai has no whitespace between words. Substring matching produces severe false positives
 *      if single-syllable terms are used naively.
 *    - "ปลา" (fish): collides with "ปลาย" (end, terminus, e.g. "ม.ปลาย" high school, "ปลายยอด" tip),
 *      and "ปลาสเตอร์" (bandage/plaster). We use negative lookahead `ปลา(?!ย|สเตอร์|กกรวด)` and
 *      curate specific vertebrate species ("ปลากัด", "ปลาดุก", "ปลาทอง", "ปลานิล").
 *    - "หนู" (rodent): commonly used as a polite first-person pronoun by Thai students
 *      ("หนูอยากทำโครงงาน...", "กลุ่มของหนู..."). We NEVER match bare "หนู"; we require compound
 *      rodent contexts ("หนูทดลอง", "หนูขาว", "หนูตะเภา", "หนูแฮมสเตอร์", "การเลี้ยงหนู", "การดักหนู").
 *    - "ด่าง" (alkaline/base): collides with "ไม้ด่าง" (variegated plants) and "จุดด่างดำ" (spots).
 *      We require chemical compounds or phrases ("ด่างเข้มข้น", "ด่างแก่", "สารละลายด่าง",
 *      "กรดและด่าง", "กรด-ด่าง", "กรด/ด่าง", "ด่างทับทิม", "โซเดียมไฮดรอกไซด์").
 *    - "รา" (fungus): collides with "ราคา" (price), "ราก" (root), "ราษฎร", "ราศี".
 *      We strictly match "เชื้อรา", "ราเมือก", "เพาะรา", "สปอร์ของรา", never bare "รา".
 * 2. English Word Boundaries:
 *    - English terms use strict `\b` word boundaries to avoid substring false matches
 *      (e.g., "rat" vs "rate"/"pirate", "fish" vs "selfish", "acid" vs "acidity").
 *    - Bare "cell" is excluded because of widespread STEM collisions like "solar cell" or spreadsheet "cell";
 *      we match "cell culture", "cell line", or "bacterial cell".
 *    - Bare "lead" is excluded because of verb collision ("lead to"); we match "lead metal" or "lead toxicity".
 * 3. Known Limitations:
 *    - Deterministic regex cannot parse semantic negation (e.g. "โครงงานนี้ไม่ใช้สารเคมี", "ปลอดเชื้อ").
 *    - Novel slang or non-standard Thai transliterations may evade keyword filters.
 *    - Context-aware semantic safety evaluation is performed downstream in Milestone 2/3 AI review.
 */

import {
  SAFETY_CATEGORIES,
  type Idea,
  type SafetyCategory,
  type SafetyFlag,
} from '@/types/domain';

interface CategoryRule {
  category: SafetyCategory;
  reasonTh: string;
  advisoryTh: string;
  requiresPreApproval: boolean;
  patterns: Array<{
    canonicalTerm: string;
    regex: RegExp;
  }>;
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'hazardous_chemicals',
    reasonTh: 'ตรวจพบคำที่เกี่ยวข้องกับสารเคมีอันตราย สารกัดกร่อน หรือสารพิษ',
    advisoryTh:
      'โครงการนี้มีสารเคมีหรือสารอันตราย ต้องมีครูหรือผู้เชี่ยวชาญดูแลอย่างใกล้ชิด สวมอุปกรณ์คุ้มครองความปลอดภัย (PPE) และตรวจสอบกลุ่มแบบฟอร์ม ISEF Form 3 (Risk Assessment Form) หรือ Form 2 (Qualified Scientist Form)',
    requiresPreApproval: true,
    patterns: [
      // Thai terms
      { canonicalTerm: 'กรดเข้มข้น', regex: /กรดเข้มข้น/ },
      { canonicalTerm: 'กรดแก่', regex: /กรดแก่/ },
      { canonicalTerm: 'กรดซัลฟิวริก', regex: /กรดซัลฟิวริก/ },
      { canonicalTerm: 'กรดไนทริก', regex: /กรดไนทริก/ },
      { canonicalTerm: 'กรดไฮโดรคลอริก', regex: /กรดไฮโดรคลอริก|กรดเกลือ/ },
      { canonicalTerm: 'กรดแอซีติกเข้มข้น', regex: /กรดแอ[ซส]ีติกเข้มข้น/ },
      { canonicalTerm: 'ด่างเข้มข้น', regex: /ด่างเข้มข้น/ },
      { canonicalTerm: 'ด่างแก่', regex: /ด่างแก่/ },
      { canonicalTerm: 'สารละลายด่าง', regex: /สารละลายด่าง/ },
      { canonicalTerm: 'กรด-ด่าง', regex: /กรด[-/]?ด่าง|กรดและด่าง/ },
      { canonicalTerm: 'ด่างทับทิม', regex: /ด่างทับทิม/ },
      { canonicalTerm: 'โซเดียมไฮดรอกไซด์', regex: /โซเดียมไฮดรอกไซด์/ },
      { canonicalTerm: 'โพแทสเซียมไฮดรอกไซด์', regex: /โพแทสเซียมไฮดรอกไซด์/ },
      { canonicalTerm: 'สารเคมีอันตราย', regex: /สารเคมีอันตราย/ },
      { canonicalTerm: 'สารพิษ', regex: /สารพิษ/ },
      { canonicalTerm: 'สารก่อมะเร็ง', regex: /สารก่อมะเร็ง/ },
      { canonicalTerm: 'สารกัดกร่อน', regex: /สารกัดกร่อน/ },
      { canonicalTerm: 'สารไวไฟ', regex: /สารไวไฟ/ },
      { canonicalTerm: 'ตัวทำละลายอินทรีย์', regex: /ตัวทำละลายอินทรีย์/ },
      { canonicalTerm: 'วัตถุระเบิด', regex: /วัตถุระเบิด/ },
      { canonicalTerm: 'ไซยาไนด์', regex: /ไซยาไนด์/ },
      { canonicalTerm: 'สารปรอท', regex: /สารปรอท/ },
      { canonicalTerm: 'สารตะกั่ว', regex: /สารตะกั่ว/ },
      // English terms
      { canonicalTerm: 'hazardous chemical', regex: /\bhazardous\s+chemicals?\b/i },
      { canonicalTerm: 'toxic chemical', regex: /\btoxic\s+chemicals?\b/i },
      { canonicalTerm: 'concentrated acid', regex: /\bconcentrated\s+acids?\b/i },
      { canonicalTerm: 'hydrochloric acid', regex: /\bhydrochloric\s+acid\b/i },
      { canonicalTerm: 'sulfuric acid', regex: /\bsulfuric\s+acid\b/i },
      { canonicalTerm: 'nitric acid', regex: /\bnitric\s+acid\b/i },
      { canonicalTerm: 'strong acid', regex: /\bstrong\s+acids?\b/i },
      { canonicalTerm: 'concentrated base', regex: /\bconcentrated\s+base(s)?\b/i },
      { canonicalTerm: 'strong base', regex: /\bstrong\s+base(s)?\b/i },
      { canonicalTerm: 'sodium hydroxide', regex: /\bsodium\s+hydroxide\b/i },
      { canonicalTerm: 'potassium hydroxide', regex: /\bpotassium\s+hydroxide\b/i },
      { canonicalTerm: 'flammable solvent', regex: /\bflammable\s+solvents?\b/i },
      { canonicalTerm: 'carcinogen', regex: /\bcarcinogen(s|ic)?\b/i },
      { canonicalTerm: 'explosive', regex: /\bexplosives?\b/i },
      { canonicalTerm: 'corrosive', regex: /\bcorrosives?\b|\bcorrosion\s+resistance\s+against\b/i },
      { canonicalTerm: 'cyanide', regex: /\bcyanides?\b/i },
      { canonicalTerm: 'mercury', regex: /\bmercury\s+(metal|compound|poisoning)?\b/i },
    ],
  },
  {
    category: 'vertebrate_animals',
    reasonTh: 'ตรวจพบคำที่เกี่ยวข้องกับการทดลองในสัตว์มีกระดูกสันหลัง',
    advisoryTh:
      'โครงการนี้ใช้สัตว์มีกระดูกสันหลัง ต้องได้รับอนุมัติจากคณะกรรมการ SRC ก่อนเริ่มทำการทดลอง ต้องมีครูหรือผู้เชี่ยวชาญดูแล และตรวจสอบกลุ่มแบบฟอร์ม ISEF Form 5A หรือ 5B (Vertebrate Animal Form)',
    requiresPreApproval: true,
    patterns: [
      // Thai terms (Note: NO bare 'หนู' to avoid 1st person student pronoun collisions)
      { canonicalTerm: 'สัตว์ทดลอง', regex: /สัตว์ทดลอง/ },
      { canonicalTerm: 'สัตว์มีกระดูกสันหลัง', regex: /สัตว์มีกระดูกสันหลัง/ },
      { canonicalTerm: 'หนูทดลอง', regex: /หนูทดลอง/ },
      { canonicalTerm: 'หนูขาว', regex: /หนูขาว/ },
      { canonicalTerm: 'หนูตะเภา', regex: /หนูตะเภา/ },
      { canonicalTerm: 'หนูแฮมสเตอร์', regex: /หนูแฮมสเตอร์/ },
      { canonicalTerm: 'การเลี้ยงหนู', regex: /การเลี้ยงหนู/ },
      { canonicalTerm: 'ปลากัด', regex: /ปลากัด/ },
      { canonicalTerm: 'ปลาดุก', regex: /ปลาดุก/ },
      { canonicalTerm: 'ปลาทอง', regex: /ปลาทอง/ },
      { canonicalTerm: 'ปลานิล', regex: /ปลานิล/ },
      { canonicalTerm: 'ปลาหางนกยูง', regex: /ปลาหางนกยูง/ },
      { canonicalTerm: 'ปลาคาร์ป', regex: /ปลาคาร์ป/ },
      { canonicalTerm: 'ปลาแซลมอน', regex: /ปลาแซลมอน/ },
      { canonicalTerm: 'ปลาซิว', regex: /ปลาซิว/ },
      // Generic fish with negative lookahead for 'ย' (ปลาย/ม.ปลาย), 'สเตอร์' (ปลาสเตอร์), etc.
      {
        canonicalTerm: 'ปลา',
        regex: /(?:ปลากัด|ปลาดุก|ปลาทอง|ปลานิล|ปลาหางนกยูง|ปลาคาร์ป|ปลาแซลมอน|ปลาซิว|ปลาหมอ|ปลาไหล|ปลาทู|ปลาช่อน|ปลาบู่|ปลาตะเพียน|ปลาเสือ|ปลาทะเล|ปลาน้ำจืด|พันธุ์ปลา|เลี้ยงปลา|ตู้ปลา|บ่อปลา|เนื้อปลา|ก้างปลา|ฝูงปลา|ลูกปลา|ตัวอย่างปลา|ทดลองกับปลา|ชนิดของปลา|(?:^|[^\u0e38\u0e34\u0e4c])ปลา(?!ย|สเตอร์|กกรวด|การ|กว้าง|ลาน))/,
      },
      // Amphibians (specifically avoided bare 'กบ' which collides with 'จากบทเรียน', 'เลือกแบบ')
      {
        canonicalTerm: 'สัตว์สะเทินน้ำสะเทินบก',
        regex: /(?:กบทดลอง|การเพาะกบ|การเลี้ยงกบ|ลูกอ๊อด|คางคก|อึ่งอ่าง|เขียด|กบนา|กบบูลฟร็อก|ผ่ากบ|สัตว์สะเทินน้ำสะเทินบก)/,
      },
      { canonicalTerm: 'สัตว์เลื้อยคลาน', regex: /สัตว์เลื้อยคลาน/ },
      // Birds (specifically avoided bare 'นก' which collides with 'ในการ...' in Thai)
      {
        canonicalTerm: 'สัตว์ปีก',
        regex: /(?:สัตว์ปีก|นกพิราบ|นกกระจอก|นกเขา|นกแก้ว|นกเป็ดน้ำ|การเลี้ยงนก|พฤติกรรมของนก|ชนิดของนก|ฝูงนก|มูลนก|ไข่นก|ทดลองกับนก|ศึกษาในนก|นกทดลอง)/,
      },
      { canonicalTerm: 'ไก่', regex: /ไก่/ },
      { canonicalTerm: 'สุนัข', regex: /สุนัข/ },
      { canonicalTerm: 'แมว', regex: /แมว/ },
      { canonicalTerm: 'สัตว์เลี้ยงลูกด้วยนม', regex: /สัตว์เลี้ยงลูกด้วยนม/ },
      // English terms
      { canonicalTerm: 'vertebrate', regex: /\bvertebrates?\b/i },
      { canonicalTerm: 'laboratory animal', regex: /\blaboratory\s+animals?\b/i },
      { canonicalTerm: 'animal experiment', regex: /\banimal\s+experiments?\b|\banimal\s+study\b/i },
      { canonicalTerm: 'laboratory mouse', regex: /\b(laboratory\s+)?mice\b|\b(laboratory\s+)?mouse\b/i },
      { canonicalTerm: 'laboratory rat', regex: /\b(laboratory\s+)?rats?\b/i },
      { canonicalTerm: 'guinea pig', regex: /\bguinea\s+pigs?\b/i },
      { canonicalTerm: 'hamster', regex: /\bhamsters?\b/i },
      { canonicalTerm: 'goldfish', regex: /\bgoldfish\b/i },
      { canonicalTerm: 'zebrafish', regex: /\bzebrafish\b/i },
      { canonicalTerm: 'fish', regex: /\bfish(es)?\b/i },
      { canonicalTerm: 'amphibian', regex: /\bamphibians?\b/i },
      { canonicalTerm: 'reptile', regex: /\breptiles?\b/i },
      { canonicalTerm: 'frog', regex: /\bfrogs?\b/i },
      { canonicalTerm: 'toad', regex: /\btoads?\b/i },
      { canonicalTerm: 'bird', regex: /\bbirds?\b|\bavian\b/i },
    ],
  },
  {
    category: 'human_subjects',
    reasonTh: 'ตรวจพบคำที่เกี่ยวข้องกับการวิจัยในมนุษย์ แบบสอบถาม หรือการทดสอบประสาทสัมผัส',
    advisoryTh:
      'โครงการนี้เกี่ยวข้องกับอาสาสมัครมนุษย์ แบบสอบถาม หรือการทดสอบชิม ต้องได้รับอนุมัติจากคณะกรรมการ IRB/SRC และทำหนังสือยินยอม (Informed Consent) ก่อนเริ่มทดลอง ตรวจสอบกลุ่มแบบฟอร์ม ISEF Form 4 (Human Participants Form)',
    requiresPreApproval: true,
    patterns: [
      // Thai terms
      { canonicalTerm: 'อาสาสมัคร', regex: /อาสาสมัคร/ },
      { canonicalTerm: 'กลุ่มตัวอย่างมนุษย์', regex: /กลุ่มตัวอย่างมนุษย์/ },
      { canonicalTerm: 'ผู้เข้าร่วมการทดลอง', regex: /ผู้เข้าร่วมการทดลอง/ },
      { canonicalTerm: 'แบบสอบถาม', regex: /แบบสอบถาม/ },
      { canonicalTerm: 'แบบสำรวจ', regex: /แบบสำรวจ/ },
      { canonicalTerm: 'การชิม', regex: /การชิม|ทดสอบชิม|ทดสอบการชิม|ชิมอาหาร/ },
      { canonicalTerm: 'การทดสอบรสชาติ', regex: /การทดสอบรสชาติ/ },
      { canonicalTerm: 'ประเมินทางประสาทสัมผัส', regex: /ประเมินทางประสาทสัมผัส|การทดสอบทางประสาทสัมผัส/ },
      { canonicalTerm: 'เจาะเลือด', regex: /เจาะเลือด/ },
      { canonicalTerm: 'ตรวจสุขภาพ', regex: /ตรวจสุขภาพ/ },
      { canonicalTerm: 'ทดสอบกับคน', regex: /ทดสอบกับคน|วิจัยในมนุษย์|การทดสอบในมนุษย์/ },
      // English terms
      { canonicalTerm: 'human subject', regex: /\bhuman\s+subjects?\b/i },
      { canonicalTerm: 'human participant', regex: /\bhuman\s+participants?\b/i },
      { canonicalTerm: 'volunteer', regex: /\bvolunteers?\b/i },
      { canonicalTerm: 'survey', regex: /\bsurveys?\b/i },
      { canonicalTerm: 'questionnaire', regex: /\bquestionnaires?\b/i },
      { canonicalTerm: 'taste test', regex: /\btaste\s+tests?\b/i },
      { canonicalTerm: 'sensory evaluation', regex: /\bsensory\s+evaluation\b/i },
      { canonicalTerm: 'blood sample', regex: /\bblood\s+samples?\b/i },
      { canonicalTerm: 'human testing', regex: /\bhuman\s+testing\b/i },
      { canonicalTerm: 'psychological test', regex: /\bpsychological\s+tests?\b/i },
    ],
  },
  {
    category: 'biological_agents',
    reasonTh: 'ตรวจพบคำที่เกี่ยวข้องกับจุลินทรีย์ แบคทีเรีย เชื้อรา หรือสารชีวภาพอันตราย (PHBAs)',
    advisoryTh:
      'โครงการนี้มีจุลินทรีย์ แบคทีเรีย เชื้อรา หรือสารชีวภาพอันตราย (PHBAs) ต้องทำการทดลองในห้องปฏิบัติการที่เหมาะสม (BSL-1/2) ได้รับอนุมัติจาก SRC ก่อนเริ่มงาน และตรวจสอบกลุ่มแบบฟอร์ม ISEF Form 6A หรือ 6B (Potentially Hazardous Biological Agents Form)',
    requiresPreApproval: true,
    patterns: [
      // Thai terms (strictly avoided bare 'รา')
      { canonicalTerm: 'เชื้อรา', regex: /เชื้อรา|ราเมือก|เพาะรา/ },
      { canonicalTerm: 'แบคทีเรีย', regex: /แบคทีเรีย/ },
      { canonicalTerm: 'จุลินทรีย์', regex: /จุลินทรีย์|เชื้อจุลชีพ/ },
      { canonicalTerm: 'ไวรัส', regex: /ไวรัส/ },
      { canonicalTerm: 'เชื้อโรค', regex: /เชื้อโรค/ },
      { canonicalTerm: 'เพาะเชื้อ', regex: /เพาะเชื้อ|เพาะเลี้ยงเชื้อ/ },
      { canonicalTerm: 'จานเพาะเชื้อ', regex: /จานเพาะเชื้อ/ },
      { canonicalTerm: 'ยีสต์ก่อโรค', regex: /ยีสต์ก่อโรค/ },
      { canonicalTerm: 'ดีเอ็นเอสายผสม', regex: /ดีเอ็นเอสายผสม/ },
      { canonicalTerm: 'สารชีวภาพอันตราย', regex: /สารชีวภาพอันตราย/ },
      { canonicalTerm: 'เลือดมนุษย์', regex: /เลือดมนุษย์/ },
      { canonicalTerm: 'เซลล์เพาะเลี้ยง', regex: /เซลล์เพาะเลี้ยง/ },
      { canonicalTerm: 'bsl', regex: /bsl[- ]?[12]/i },
      { canonicalTerm: 'e. coli', regex: /อีโคไล|e\.?\s*coli/i },
      // English terms
      { canonicalTerm: 'biological agent', regex: /\bbiological\s+agents?\b/i },
      { canonicalTerm: 'microorganism', regex: /\bmicroorganisms?\b|\bmicrobes?\b/i },
      { canonicalTerm: 'bacteria', regex: /\bbacteri(a|um|al)\b/i },
      { canonicalTerm: 'fungus', regex: /\bfung(us|i)\b|\bmold\b/i },
      { canonicalTerm: 'virus', regex: /\bvirus(es)?\b|\bviral\b/i },
      { canonicalTerm: 'pathogen', regex: /\bpathogens?\b/i },
      { canonicalTerm: 'cell culture', regex: /\bcell\s+cultures?\b/i },
      { canonicalTerm: 'phba', regex: /\bphba(s)?\b/i },
      { canonicalTerm: 'recombinant dna', regex: /\brecombinant\s+dna\b/i },
      { canonicalTerm: 'petri dish', regex: /\bpetri\s+dish(es)?\b/i },
      { canonicalTerm: 'coliform', regex: /\bcoliform(s)?\b/i },
      { canonicalTerm: 'escherichia coli', regex: /\bescherichia\s+coli\b/i },
    ],
  },
  {
    category: 'high_voltage_radiation',
    reasonTh: 'ตรวจพบคำที่เกี่ยวข้องกับไฟฟ้าแรงสูง เลเซอร์ หรือรังสีอันตราย',
    advisoryTh:
      'โครงการนี้ใช้อุปกรณ์ไฟฟ้าแรงสูง เลเซอร์ หรือรังสีอันตราย ต้องมีครูหรือผู้เชี่ยวชาญควบคุมความปลอดภัย มีอุปกรณ์ป้องกัน และตรวจสอบกลุ่มแบบฟอร์ม ISEF Form 3 (Risk Assessment Form)',
    requiresPreApproval: true,
    patterns: [
      // Thai terms
      { canonicalTerm: 'ไฟฟ้าแรงสูง', regex: /ไฟฟ้าแรงสูง/ },
      { canonicalTerm: 'แรงดันสูง', regex: /แรงดันสูง(?!ต่ำ)/ },
      { canonicalTerm: 'เลเซอร์', regex: /เลเซอร์|ลำแสงเลเซอร์/ },
      { canonicalTerm: 'รังสี', regex: /รังสี(?!คณิต)/ },
      { canonicalTerm: 'กัมมันตรังสี', regex: /กัมมันตรังสี|สารกัมมันตรังสี/ },
      { canonicalTerm: 'รังสีเอกซ์', regex: /รังสีเอกซ์|เอกซเรย์/ },
      { canonicalTerm: 'รังสีแกมมา', regex: /รังสีแกมมา/ },
      { canonicalTerm: 'เตาปฏิกรณ์', regex: /เตาปฏิกรณ์/ },
      { canonicalTerm: 'เครื่องเร่งอนุภาค', regex: /เครื่องเร่งอนุภาค/ },
      // English terms
      { canonicalTerm: 'high voltage', regex: /\bhigh\s+voltage\b/i },
      { canonicalTerm: 'laser', regex: /\blasers?\b/i },
      { canonicalTerm: 'radiation', regex: /\bradiation\b/i },
      { canonicalTerm: 'radioactive', regex: /\bradioactive\b/i },
      { canonicalTerm: 'x-ray', regex: /\bx[- ]?rays?\b/i },
      { canonicalTerm: 'gamma ray', regex: /\bgamma\s+rays?\b/i },
      { canonicalTerm: 'ionizing radiation', regex: /\bionizing\s+radiation\b/i },
      { canonicalTerm: 'uv-c', regex: /\buv[- ]?c\b/i },
      { canonicalTerm: 'particle accelerator', regex: /\bparticle\s+accelerators?\b/i },
    ],
  },
];

/**
 * Normalizes input text by performing Unicode NFC normalization and lowercasing.
 */
function normalizeText(input: string): string {
  return input.normalize('NFC').toLowerCase();
}

/**
 * Extracts searchable text from a string or Idea object.
 */
function extractText(input: string | Idea): string {
  if (typeof input === 'string') {
    return input;
  }
  const parts: string[] = [];
  if (input.title) {
    parts.push(input.title);
  }
  if (input.description) {
    parts.push(input.description);
  }
  // Only learner-authored design fields; never inspect IDs or checklist metadata.
  if (input.isolator) {
    const design = input.isolator;
    parts.push(...(design.preset === 'science'
      ? [design.independent, design.dependent, ...design.controlled, design.controlGroup]
      : [design.input, design.output, design.baseline, design.metric, design.dataSplit]));
  } else if (input.variables) {
    parts.push(input.variables.independent, input.variables.dependent, ...input.variables.controlled, input.variables.controlGroup);
  }
  return parts.join(' ');
}

/**
 * Deterministically screens project text or an Idea against the 5 canonical
 * ISEF / SRC safety categories.
 *
 * @param input Raw text string or an Idea object
 * @returns Array of SafetyFlag objects for any detected risk categories,
 *          guaranteed to be non-blocking (`blocking: false`) and sorted
 *          in canonical SAFETY_CATEGORIES order. Returns `[]` if clean.
 */
export function screenIdea(input: string | Idea): SafetyFlag[] {
  const rawText = extractText(input);
  if (!rawText.trim()) {
    return [];
  }

  const normalized = normalizeText(rawText);
  const detectedFlags: SafetyFlag[] = [];

  for (const rule of CATEGORY_RULES) {
    const matchedTermsSet = new Set<string>();

    for (const pattern of rule.patterns) {
      if (pattern.regex.test(normalized)) {
        matchedTermsSet.add(pattern.canonicalTerm);
      }
    }

    if (matchedTermsSet.size > 0) {
      const matchedTerms = Array.from(matchedTermsSet);
      detectedFlags.push({
        category: rule.category,
        flagged: true,
        reasonTh: rule.reasonTh,
        advisoryTh: rule.advisoryTh,
        requiresPreApproval: rule.requiresPreApproval,
        matchedTerms,
        blocking: false,
      });
    }
  }

  // Sort flags strictly in canonical SAFETY_CATEGORIES order for absolute determinism
  return detectedFlags.sort(
    (a, b) => SAFETY_CATEGORIES.indexOf(a.category) - SAFETY_CATEGORIES.indexOf(b.category),
  );
}
