import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/learner_state.dart';
import '../theme/app_theme.dart';
import 'ai_coach_dialog.dart';

class JudgeQuestionData {
  final String id;
  final String persona; // 'ysc', 'nsc', 'tcas'
  final String personaTitle;
  final String axis;
  final String axisLabel;
  final String prompt;
  final List<String> checklist;

  const JudgeQuestionData({
    required this.id,
    required this.persona,
    required this.personaTitle,
    required this.axis,
    required this.axisLabel,
    required this.prompt,
    required this.checklist,
  });
}

const List<JudgeQuestionData> judgeQuestions = [
  // YSC Questions
  JudgeQuestionData(
    id: 'ysc_novelty',
    persona: 'ysc',
    personaTitle: 'กรรมการ YSC (วิทยาศาสตร์รุ่นเยาว์)',
    axis: 'novelty',
    axisLabel: 'ความใหม่ (Novelty)',
    prompt: 'งานของคุณต่างจากงานวิจัยที่คล้ายกันตรงไหน และมีหลักฐานใดให้ตรวจสอบความต่างนั้นได้จริง?',
    checklist: [
      'บอกความต่างจากงานวิจัยเดิมด้วยภาษาของตนเอง',
      'อ้างอิงเฉพาะแหล่งข้อมูลหรือ Paper ที่ตรวจสอบได้',
      'แยกข้อสันนิษฐานส่วนตัวออกจากสิ่งที่มีหลักฐานยืนยัน',
    ],
  ),
  JudgeQuestionData(
    id: 'ysc_rigor',
    persona: 'ysc',
    personaTitle: 'กรรมการ YSC (วิทยาศาสตร์รุ่นเยาว์)',
    axis: 'rigor',
    axisLabel: 'ความรัดกุมเชิงวิทย์ (Rigor)',
    prompt: 'คุณจะใช้ชุดควบคุม (Control Group) ใด ควบคุมตัวแปรแทรกซ้อนอย่างไร และวัดซ้ำพร้อมระบุหน่วยวัดอะไร?',
    checklist: [
      'ระบุสิ่งที่เปรียบเทียบและชุดควบคุมให้ชัดเจน',
      'ระบุหน่วยวัดเชิงตัวเลข (Metric) และจำนวนรอบการวัดซ้ำ',
      'อธิบายวิธีป้องกันตัวแปรแทรกซ้อนในสภาพแวดล้อมแล็บ',
    ],
  ),
  JudgeQuestionData(
    id: 'ysc_feasibility',
    persona: 'ysc',
    personaTitle: 'กรรมการ YSC (วิทยาศาสตร์รุ่นเยาว์)',
    axis: 'feasibility',
    axisLabel: 'ความเป็นไปได้ (Feasibility)',
    prompt: 'หากเวลา งบประมาณ หรืออุปกรณ์ในแล็บไม่เพียงพอ คุณจะลดทอนขอบเขตส่วนใดโดยยังตอบคำถามวิจัยเดิมได้?',
    checklist: [
      'ระบุข้อจำกัดเวลา งบประมาณ และอุปกรณ์ที่มีอยู่จริง',
      'อธิบายขอบเขตการทดลองขั้นต่ำที่ตอบสมมติฐานได้',
      'เตรียมแผนสำรองสำหรับการทดลองที่ไม่เป็นไปตามคาด',
    ],
  ),

  // NSC Questions
  JudgeQuestionData(
    id: 'nsc_novelty',
    persona: 'nsc',
    personaTitle: 'กรรมการ NSC (ซอฟต์แวร์แห่งประเทศไทย)',
    axis: 'novelty',
    axisLabel: 'ความใหม่ (Novelty)',
    prompt: 'ระบบหรืออัลกอริทึม AI ของคุณต่างจากโมเดล Baseline ที่มีอยู่เดิมอย่างไร และจะเปรียบเทียบอย่างเป็นธรรมได้อย่างไร?',
    checklist: [
      'ระบุสถาปัตยกรรมโมเดลและ Benchmark ที่ใช้อ้างอิง',
      'แสดงการทดสอบเปรียบเทียบบนชุดข้อมูลทดสอบเดียวกัน (Test Split)',
      'วัดค่าความเร็วในการประมวลผล (Latency) ร่วมกับความแม่นยำ',
    ],
  ),
  JudgeQuestionData(
    id: 'nsc_rigor',
    persona: 'nsc',
    personaTitle: 'กรรมการ NSC (ซอฟต์แวร์แห่งประเทศไทย)',
    axis: 'rigor',
    axisLabel: 'ความรัดกุมเชิงซอฟต์แวร์ (Rigor)',
    prompt: 'คุณแบ่งชุดข้อมูลฝึก/ทดสอบอย่างไร ป้องกันข้อมูลรั่ว (Data Leakage) อย่างไร และวัดผลด้วย Metric ใด?',
    checklist: [
      'ระบุอัตราส่วน Train/Val/Test Split ที่เป็นอิสระต่อกัน',
      'ป้องกันไม่ให้ข้อมูลจากชุดทดสอบปนเปื้อนในกระบวนการ Preprocessing',
      'เลือกใช้ Metric ที่เหมาะสม เช่น F1-Score ในกรณีข้อมูลไม่สมดุล',
    ],
  ),

  // TCAS Questions
  JudgeQuestionData(
    id: 'tcas_fit',
    persona: 'tcas',
    personaTitle: 'กรรมการสอบสัมภาษณ์ TCAS พอร์ตโฟลิโอ',
    axis: 'fit',
    axisLabel: 'บทบาทและทักษะ (Self-Reflection)',
    prompt: 'บทบาทที่แท้จริงของคุณในโครงงานนี้คืออะไร คุณได้ทักษะอะไร และสิ่งนี้เชื่อมโยงกับสาขาที่อยากเข้าเรียนอย่างไร?',
    checklist: [
      'อธิบายส่วนที่ตนเองลงมือเขียนโค้ดหรือทำการทดลองจริงอย่างจริงใจ',
      'สะท้อนบทเรียนและความล้มเหลวที่พบระหว่างทำโครงงาน',
      'เชื่อมโยงทักษะที่ได้รับเข้ากับวิชาชีพหรือสาขาในมหาวิทยาลัย',
    ],
  ),
];

class JudgeDefenseView extends StatefulWidget {
  const JudgeDefenseView({super.key});

  @override
  State<JudgeDefenseView> createState() => _JudgeDefenseViewState();
}

class _JudgeDefenseViewState extends State<JudgeDefenseView> {
  String _selectedPersona = 'all'; // 'all', 'ysc', 'nsc', 'tcas'
  int _questionIndex = 0;
  final TextEditingController _answerController = TextEditingController();
  final Set<int> _checkedItems = {};

  List<JudgeQuestionData> get _filteredQuestions {
    if (_selectedPersona == 'all') {
      return judgeQuestions;
    }
    return judgeQuestions.where((q) => q.persona == _selectedPersona).toList();
  }

  JudgeQuestionData get _currentQuestion {
    final list = _filteredQuestions;
    if (_questionIndex >= list.length) {
      _questionIndex = 0;
    }
    return list[_questionIndex];
  }

  void _nextQuestion() {
    setState(() {
      final list = _filteredQuestions;
      if (_questionIndex < list.length - 1) {
        _questionIndex++;
      } else {
        _questionIndex = 0;
      }
      _answerController.clear();
      _checkedItems.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    final learner = context.watch<LearnerState>();
    final q = _currentQuestion;

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16.0, 16.0, 16.0, 100.0),
          children: [
            // 1. Header Title & Intro
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.secondaryViolet.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(Icons.record_voice_over_rounded, color: AppTheme.secondaryViolet, size: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'ซ้อมตอบคำถามกรรมการ (Mock Judge)',
                        style: TextStyle(
                          color: AppTheme.textPrimary,
                          fontSize: 17,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        'ฝึกอธิบายไอเดียด้วยเหตุผลและหลักฐานเชิงประจักษ์',
                        style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // 2. Persona Filter Chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildPersonaChip('ทั้งหมด', 'all'),
                  const SizedBox(width: 8),
                  _buildPersonaChip('🔬 เวที YSC', 'ysc'),
                  const SizedBox(width: 8),
                  _buildPersonaChip('💻 ซอฟต์แวร์ NSC', 'nsc'),
                  const SizedBox(width: 8),
                  _buildPersonaChip('🎓 สัมภาษณ์ TCAS', 'tcas'),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // 3. Current Question Card
            Container(
              padding: const EdgeInsets.all(18.0),
              decoration: AppTheme.cardDecoration(
                border: AppTheme.secondaryViolet.withValues(alpha: 0.4),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppTheme.secondaryViolet.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          q.personaTitle,
                          style: TextStyle(color: AppTheme.secondaryViolet, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryCyan.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          q.axisLabel,
                          style: TextStyle(color: AppTheme.primaryCyan, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    q.prompt,
                    style: TextStyle(
                      color: AppTheme.textPrimary,
                      fontSize: 15.5,
                      fontWeight: FontWeight.bold,
                      height: 1.35,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // 4. Student Response Textarea
            Text(
              'ร่างแนวทางการตอบของคุณ:',
              style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 13.5),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _answerController,
              maxLines: 4,
              style: TextStyle(color: AppTheme.textPrimary, fontSize: 13.5),
              decoration: InputDecoration(
                hintText: 'พิมพ์ประเด็นหลักและหลักฐานเชิงประจักษ์ที่คุณจะใช้อธิบายต่อหน้ากรรมการ...',
                hintStyle: TextStyle(color: AppTheme.textMuted, fontSize: 12.5),
                filled: true,
                fillColor: AppTheme.surface1,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: AppTheme.borderStroke),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: AppTheme.secondaryViolet, width: 1.5),
                ),
              ),
            ),
            const SizedBox(height: 14),

            // 5. Self-Review Checklist
            Container(
              padding: const EdgeInsets.all(14.0),
              decoration: AppTheme.cardDecoration(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.checklist_rounded, size: 18, color: AppTheme.accentGreen),
                      const SizedBox(width: 6),
                      Text(
                        'เกณฑ์ตรวจทานความรัดกุมของคำตอบ (Self-Checklist):',
                        style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  ...List.generate(q.checklist.length, (idx) {
                    final item = q.checklist[idx];
                    final isChecked = _checkedItems.contains(idx);
                    return InkWell(
                      onTap: () {
                        setState(() {
                          if (isChecked) {
                            _checkedItems.remove(idx);
                          } else {
                            _checkedItems.add(idx);
                          }
                        });
                      },
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4.0),
                        child: Row(
                          children: [
                            Icon(
                              isChecked ? Icons.check_box_rounded : Icons.check_box_outline_blank_rounded,
                              size: 18,
                              color: isChecked ? AppTheme.accentGreen : AppTheme.textMuted,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                item,
                                style: TextStyle(
                                  color: isChecked ? AppTheme.accentGreen : AppTheme.textSecondary,
                                  fontSize: 12,
                                  decoration: isChecked ? TextDecoration.lineThrough : null,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // 6. Action Buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      final sess = learner.createNewSession(
                        title: '🧑‍⚖️ ${q.personaTitle}: ${q.axisLabel}',
                        category: 'Socratic Research',
                        initialMessages: [
                          ChatMessage(
                            text: 'คำถามจากกรรมการ: "${q.prompt}"\\n\\nช่วยแนะนำแนวทางและหลักฐานทางวิทยาศาสตร์ที่ผมควรเตรียมเพื่อตอบคำถามนี้ให้ได้คะแนนเต็มหน่อยครับ',
                            isUser: true,
                            timestamp: DateTime.now(),
                          ),
                        ],
                      );
                      AiCoachModal.show(context, initialSession: sess);
                    },
                    icon: Icon(Icons.psychology_outlined, size: 18, color: AppTheme.primaryCyan),
                    label: Text(
                      'ขอโค้ชช่วยติว',
                      style: TextStyle(color: AppTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.bold),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: AppTheme.borderStroke),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _nextQuestion,
                    icon: Icon(
                      Icons.arrow_forward_rounded,
                      size: 18,
                      color: AppTheme.isDark ? Colors.black : Colors.white,
                    ),
                    label: Text(
                      'คำถามถัดไป',
                      style: TextStyle(
                        color: AppTheme.isDark ? Colors.black : Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.secondaryViolet,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPersonaChip(String label, String value) {
    final isSel = _selectedPersona == value;
    return ChoiceChip(
      label: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
          color: isSel ? (AppTheme.isDark ? Colors.black : Colors.white) : AppTheme.textPrimary,
        ),
      ),
      selected: isSel,
      selectedColor: AppTheme.secondaryViolet,
      backgroundColor: AppTheme.surface2,
      side: BorderSide(color: isSel ? AppTheme.secondaryViolet : AppTheme.borderStroke),
      onSelected: (val) {
        if (val) {
          setState(() {
            _selectedPersona = value;
            _questionIndex = 0;
            _answerController.clear();
            _checkedItems.clear();
          });
        }
      },
    );
  }
}
