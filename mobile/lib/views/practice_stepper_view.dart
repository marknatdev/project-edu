import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/learner_state.dart';
import '../theme/app_theme.dart';

class PracticeStepperView extends StatefulWidget {
  final VoidCallback onBack;

  const PracticeStepperView({super.key, required this.onBack});

  @override
  State<PracticeStepperView> createState() => _PracticeStepperViewState();
}

class _PracticeStepperViewState extends State<PracticeStepperView> {
  int _currentStep = 1; // 0: Select Subject, 1: Configure

  final List<Map<String, dynamic>> _subjects = [
    {
      'name': 'TGAT1',
      'title': 'การสื่อสารภาษาอังกฤษ',
      'types': '5 Question Types',
      'color': AppTheme.accentBlue,
      'icon': Icons.chat_bubble_outline_rounded,
    },
    {
      'name': 'TGAT2',
      'title': 'การคิดอย่างมีเหตุผล',
      'types': '17 Question Types',
      'color': const Color(0xFF6366F1),
      'icon': Icons.psychology_outlined,
    },
    {
      'name': 'ชีววิทยา',
      'title': 'A-Level ชีววิทยา',
      'types': '5 หมวดหมู่หลัก',
      'color': AppTheme.accentGreen,
      'icon': Icons.eco_outlined,
    },
    {
      'name': 'TPAT3',
      'title': 'ความถนัดด้านวิทยาศาสตร์ เทคโนโลยี',
      'types': '2 ส่วนสอบ',
      'color': const Color(0xFFEF4444),
      'icon': Icons.science_outlined,
    },
    {
      'name': 'คณิตศาสตร์ 1',
      'title': 'A-Level คณิตประยุกต์ 1',
      'types': '3 สาระหลัก',
      'color': AppTheme.primaryOrange,
      'icon': Icons.calculate_outlined,
    },
    {
      'name': 'TPAT1',
      'title': 'ความถนัดแพทย์ กสพท',
      'types': '3 ฉบับ',
      'color': const Color(0xFFF43F5E),
      'icon': Icons.medical_services_outlined,
    },
  ];

  final List<Map<String, dynamic>> _topics = [
    {'title': 'ระบบย่อยอาหาร', 'icon': '🍎', 'desc': 'Digestive System'},
    {'title': 'ระบบหายใจ', 'icon': '🫁', 'desc': 'Respiratory System'},
    {'title': 'ระบบหมุนเวียนเลือด', 'icon': '🫀', 'desc': 'Circulatory System'},
    {'title': 'ระบบขับถ่าย', 'icon': '🧪', 'desc': 'Excretory System'},
    {'title': 'ระบบน้ำเหลืองและภูมิคุ้มกัน', 'icon': '🛡️', 'desc': 'Lymphatic & Immune'},
    {'title': 'ระบบประสาทและการเคลื่อนที่', 'icon': '🧠', 'desc': 'Nervous & Locomotor'},
  ];

  @override
  Widget build(BuildContext context) {
    final learner = context.watch<LearnerState>();

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.background,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: AppTheme.textPrimary, size: 20),
          onPressed: () {
            if (_currentStep == 1) {
              setState(() => _currentStep = 0);
            } else {
              widget.onBack();
            }
          },
        ),
        title: Row(
          children: [
            _StepBadge(
              stepNumber: '1',
              title: 'เลือกวิชา',
              isCompleted: _currentStep > 0,
              isActive: _currentStep == 0,
            ),
            const SizedBox(width: 8),
            const Icon(Icons.chevron_right_rounded, color: AppTheme.textMuted, size: 18),
            const SizedBox(width: 8),
            _StepBadge(
              stepNumber: '2',
              title: 'ตั้งค่า',
              isCompleted: false,
              isActive: _currentStep == 1,
            ),
          ],
        ),
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: 16.0),
            child: Icon(Icons.key_rounded, color: AppTheme.primaryOrange, size: 20),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1.0),
          child: Container(color: AppTheme.borderStroke, height: 1.0),
        ),
      ),
      body: _currentStep == 0 ? _buildStep1Subject(learner) : _buildStep2Config(learner),
    );
  }

  // Step 1: Subject Selection
  Widget _buildStep1Subject(LearnerState learner) {
    return ListView(
      padding: const EdgeInsets.all(16.0),
      children: [
        const Text(
          'เลือกวิชาที่ต้องการฝึก',
          style: TextStyle(
            color: AppTheme.textPrimary,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'ข้อสอบจำลองเสมือนจริง อัปเดตตามโครงสร้างพิมพ์เขียว TCAS ล่าสุด',
          style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
        ),
        const SizedBox(height: 16),
        ..._subjects.map((s) {
          final isSelected = learner.selectedSubject == s['name'];
          return Container(
            margin: const EdgeInsets.only(bottom: 12.0),
            decoration: AppTheme.cardDecoration(
              border: isSelected ? s['color'] as Color : AppTheme.borderStroke,
            ),
            child: ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              leading: Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: (s['color'] as Color).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(
                  child: Icon(s['icon'] as IconData, color: s['color'] as Color, size: 24),
                ),
              ),
              title: Text(
                s['name'] as String,
                style: const TextStyle(
                  color: AppTheme.textPrimary,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              subtitle: Text(
                '${s['title']} • ${s['types']}',
                style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12.5),
              ),
              trailing: const Icon(Icons.chevron_right_rounded, color: AppTheme.textMuted),
              onTap: () {
                learner.selectSubject(s['name'] as String);
                setState(() => _currentStep = 1);
              },
            ),
          );
        }),
      ],
    );
  }

  // Step 2: Topic & Quiz Settings
  Widget _buildStep2Config(LearnerState learner) {
    final canStart = learner.selectedTopics.isNotEmpty;

    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16.0),
            children: [
              // Header & Randomize All Action
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'ประเภทโจทย์',
                        style: TextStyle(
                          color: AppTheme.textPrimary,
                          fontWeight: FontWeight.bold,
                          fontSize: 17,
                        ),
                      ),
                      Text(
                        'วิชา: ${learner.selectedSubject}',
                        style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12.5),
                      ),
                    ],
                  ),
                  TextButton.icon(
                    onPressed: () {
                      learner.selectAllTopics(_topics.map((t) => t['title'] as String).toList());
                    },
                    icon: const Icon(Icons.shuffle_rounded, size: 16, color: AppTheme.primaryOrange),
                    label: const Text(
                      'สุ่มทุกประเภท',
                      style: TextStyle(color: AppTheme.primaryOrange, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // 6 Topics Grid / List
              ..._topics.map((t) {
                final isChecked = learner.selectedTopics.contains(t['title']);
                return InkWell(
                  onTap: () => learner.toggleTopic(t['title'] as String),
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: isChecked ? AppTheme.surface2 : AppTheme.surface1,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: isChecked ? AppTheme.primaryOrange : AppTheme.borderStroke,
                        width: isChecked ? 1.5 : 1.0,
                      ),
                    ),
                    child: Row(
                      children: [
                        Text(t['icon'] as String, style: const TextStyle(fontSize: 22)),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                t['title'] as String,
                                style: const TextStyle(
                                  color: AppTheme.textPrimary,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 14.5,
                                ),
                              ),
                              Text(
                                t['desc'] as String,
                                style: const TextStyle(color: AppTheme.textMuted, fontSize: 11.5),
                              ),
                            ],
                          ),
                        ),
                        // Sub-topic Gear
                        IconButton(
                          icon: const Icon(Icons.settings_outlined, color: AppTheme.textMuted, size: 18),
                          onPressed: () {},
                        ),
                        // Checkbox
                        Checkbox(
                          value: isChecked,
                          activeColor: AppTheme.primaryOrange,
                          checkColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(5)),
                          onChanged: (_) => learner.toggleTopic(t['title'] as String),
                        ),
                      ],
                    ),
                  ),
                );
              }),

              const SizedBox(height: 16),
              const Divider(color: AppTheme.borderStroke),
              const SizedBox(height: 12),

              // Number of Questions
              const Text(
                'จำนวนข้อ',
                style: TextStyle(
                  color: AppTheme.textPrimary,
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [5, 10, 20].map((count) {
                  final isSelected = learner.questionCount == count;
                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4.0),
                      child: InkWell(
                        onTap: () => learner.setQuestionCount(count),
                        borderRadius: BorderRadius.circular(AppTheme.radiusPill),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: isSelected ? AppTheme.primaryOrange : AppTheme.surface1,
                            borderRadius: BorderRadius.circular(AppTheme.radiusPill),
                            border: Border.all(
                              color: isSelected ? AppTheme.primaryOrange : AppTheme.borderStroke,
                            ),
                          ),
                          child: Center(
                            child: Text(
                              '$count ข้อ',
                              style: TextStyle(
                                color: isSelected ? Colors.white : AppTheme.textSecondary,
                                fontWeight: FontWeight.bold,
                                fontSize: 13.5,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),

              const SizedBox(height: 18),

              // Additional Options (Toggles)
              const Text(
                'ตัวเลือกเพิ่มเติม',
                style: TextStyle(
                  color: AppTheme.textPrimary,
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                ),
              ),
              const SizedBox(height: 8),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                activeThumbColor: AppTheme.primaryOrange,
                secondary: const Icon(Icons.lightbulb_outline_rounded, color: AppTheme.primaryOrange),
                title: const Text('แสดงเฉลย', style: TextStyle(color: AppTheme.textPrimary, fontSize: 14)),
                value: learner.showSolutions,
                onChanged: (val) {
                  setState(() => learner.showSolutions = val);
                },
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                activeThumbColor: AppTheme.primaryOrange,
                secondary: const Icon(Icons.timer_outlined, color: AppTheme.primaryOrange),
                title: const Text('ตั้งเวลาทำข้อสอบ', style: TextStyle(color: AppTheme.textPrimary, fontSize: 14)),
                value: learner.enableTimer,
                onChanged: (val) {
                  setState(() => learner.enableTimer = val);
                },
              ),
            ],
          ),
        ),

        // Bottom Action Bar
        Container(
          padding: const EdgeInsets.all(16.0),
          decoration: BoxDecoration(
            color: AppTheme.surface1,
            border: const Border(top: BorderSide(color: AppTheme.borderStroke)),
          ),
          child: Row(
            children: [
              // Play with friends
              OutlinedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.group_outlined, color: AppTheme.textPrimary, size: 18),
                label: const Text('เล่นกับเพื่อน', style: TextStyle(color: AppTheme.textPrimary)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppTheme.borderStroke),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusPill)),
                ),
              ),
              const SizedBox(width: 12),

              // Start CTA
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: canStart
                      ? () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('กำลังเปิดข้อสอบ ${learner.selectedSubject} (${learner.questionCount} ข้อ)...'),
                              backgroundColor: AppTheme.surface2,
                            ),
                          );
                        }
                      : null,
                  icon: const Icon(Icons.play_arrow_rounded, color: Colors.white),
                  label: const Text(
                    'เริ่มทำ ▶',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryOrange,
                    disabledBackgroundColor: AppTheme.surface3,
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusPill)),
                    elevation: canStart ? 4 : 0,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _StepBadge extends StatelessWidget {
  final String stepNumber;
  final String title;
  final bool isCompleted;
  final bool isActive;

  const _StepBadge({
    required this.stepNumber,
    required this.title,
    required this.isCompleted,
    required this.isActive,
  });

  @override
  Widget build(BuildContext context) {
    if (isCompleted) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(3),
            decoration: const BoxDecoration(
              color: AppTheme.primaryOrange,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.check, color: Colors.white, size: 12),
          ),
          const SizedBox(width: 6),
          Text(
            title,
            style: const TextStyle(
              color: AppTheme.primaryOrange,
              fontWeight: FontWeight.bold,
              fontSize: 13,
            ),
          ),
        ],
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: isActive ? AppTheme.primaryOrange : Colors.transparent,
        borderRadius: BorderRadius.circular(AppTheme.radiusPill),
        border: Border.all(
          color: isActive ? AppTheme.primaryOrange : AppTheme.borderStroke,
        ),
      ),
      child: Text(
        '$stepNumber $title',
        style: TextStyle(
          color: isActive ? Colors.white : AppTheme.textMuted,
          fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
          fontSize: 12.5,
        ),
      ),
    );
  }
}
