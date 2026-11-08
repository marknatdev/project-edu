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
  int _currentStep = 1; // 0: Select Field, 1: Configure Constraints

  final List<Map<String, dynamic>> _fields = [
    {
      'name': 'คอมพิวเตอร์ & AI',
      'title': 'Computer Science & AI',
      'types': '12 สาขาย่อย',
      'color': AppTheme.primaryCyan,
      'icon': Icons.memory_rounded,
    },
    {
      'name': 'ชีววิทยา & การแพทย์',
      'title': 'Biological & Health Sciences',
      'types': '8 สาขาย่อย',
      'color': AppTheme.accentGreen,
      'icon': Icons.eco_rounded,
    },
    {
      'name': 'ฟิสิกส์ & พลังงาน',
      'title': 'Physics & Clean Energy',
      'types': '6 สาขาย่อย',
      'color': AppTheme.secondaryViolet,
      'icon': Icons.bolt_rounded,
    },
    {
      'name': 'วิศวกรรม & หุ่นยนต์',
      'title': 'Robotics & Embedded Systems',
      'types': '9 สาขาย่อย',
      'color': AppTheme.accentAmber,
      'icon': Icons.precision_manufacturing_rounded,
    },
    {
      'name': 'สิ่งแวดล้อม',
      'title': 'Environmental Science',
      'types': '7 สาขาย่อย',
      'color': const Color(0xFF14B8A6),
      'icon': Icons.forest_rounded,
    },
    {
      'name': 'คณิตศาสตร์ประยุกต์',
      'title': 'Applied Mathematics',
      'types': '5 สาขาย่อย',
      'color': const Color(0xFF3B82F6),
      'icon': Icons.calculate_rounded,
    },
  ];

  static const List<String> _goals = [
    'ประกวดแข่งขัน (YSC, ISEF, สพฐ.)',
    'ส่งงานในชั้นเรียน',
    'สะสมผลงาน (Portfolio/TCAS)',
    'ทำตามความสนใจอิสระ',
  ];

  static const List<String> _budgets = [
    '< 500 บาท',
    '500 - 1,500 บาท',
    '1,500 - 3,000 บาท',
    'ไม่จำกัดงบ',
  ];

  static const List<Map<String, dynamic>> _resourcesList = [
    {'name': 'คอมพิวเตอร์ / โน้ตบุ๊ก', 'icon': Icons.computer_rounded, 'desc': 'มีเครื่องสำหรับเขียนโปรแกรม/รัน AI'},
    {'name': 'ห้องแล็บ / สารเคมีพื้นฐาน', 'icon': Icons.biotech_rounded, 'desc': 'มีอุปกรณ์เครื่องแก้ว/สารเคมีในโรงเรียน'},
    {'name': 'ไมโครคอนโทรลเลอร์ & เซนเซอร์', 'icon': Icons.developer_board_rounded, 'desc': 'ESP32 / Arduino / เซนเซอร์วัดค่า'},
    {'name': 'ลงพื้นที่สำรวจภาคสนาม', 'icon': Icons.nature_people_rounded, 'desc': 'สะดวกเก็บตัวอย่างดิน/น้ำ/ชุมชน'},
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
          icon: Icon(Icons.arrow_back_ios_new_rounded, color: AppTheme.textPrimary, size: 20),
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
              title: 'เลือกสาขา',
              isCompleted: _currentStep > 0,
              isActive: _currentStep == 0,
            ),
            const SizedBox(width: 8),
            Icon(Icons.chevron_right_rounded, color: AppTheme.textMuted, size: 18),
            const SizedBox(width: 8),
            _StepBadge(
              stepNumber: '2',
              title: 'ตั้งค่าโครงงาน',
              isCompleted: false,
              isActive: _currentStep == 1,
            ),
          ],
        ),
        actions: [
          Padding(
            padding: EdgeInsets.only(right: 16.0),
            child: Icon(Icons.tune_rounded, color: AppTheme.primaryCyan, size: 20),
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
        Text(
          'เลือกสาขาวิทยาศาสตร์ที่สนใจ',
          style: TextStyle(
            color: AppTheme.textPrimary,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'รองรับหมวดการแข่งขัน YSC, สพฐ. และมาตรฐานโครงงานระดับชาติ',
          style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
        ),
        const SizedBox(height: 16),
        ..._fields.map((s) {
          final isSelected = learner.selectedField == s['name'];
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
                style: TextStyle(
                  color: AppTheme.textPrimary,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              subtitle: Text(
                '${s['title']} • ${s['types']}',
                style: TextStyle(color: AppTheme.textSecondary, fontSize: 12.5),
              ),
              trailing: Icon(Icons.chevron_right_rounded, color: AppTheme.textMuted),
              onTap: () {
                learner.selectField(s['name'] as String);
                setState(() => _currentStep = 1);
              },
            ),
          );
        }),
      ],
    );
  }

  // Step 2: Project Edu Topic Discovery Settings
  Widget _buildStep2Config(LearnerState learner) {
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16.0),
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'ขอบเขตและข้อจำกัดโครงงาน',
                        style: TextStyle(
                          color: AppTheme.textPrimary,
                          fontWeight: FontWeight.bold,
                          fontSize: 17,
                        ),
                      ),
                      Text(
                        'สาขา: ${learner.selectedField}',
                        style: TextStyle(color: AppTheme.primaryCyan, fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                  OutlinedButton.icon(
                    onPressed: () => setState(() => _currentStep = 0),
                    icon: Icon(Icons.edit_rounded, size: 14, color: AppTheme.secondaryViolet),
                    label: Text('เปลี่ยนสาขา', style: TextStyle(color: AppTheme.secondaryViolet, fontSize: 12)),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: AppTheme.secondaryViolet),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // 1. ระดับชั้น (Grade Level)
              _buildSectionTitle('1. ระดับชั้นการศึกษา'),
              Row(
                children: [
                  Expanded(
                    child: _buildChoicePill(
                      label: 'ม.ต้น (ม.1 - ม.3)',
                      isSelected: learner.gradeLevel == 'ม.ต้น',
                      onTap: () => learner.setGradeLevel('ม.ต้น'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildChoicePill(
                      label: 'ม.ปลาย (ม.4 - ม.6)',
                      isSelected: learner.gradeLevel == 'ม.ปลาย',
                      onTap: () => learner.setGradeLevel('ม.ปลาย'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),

              // 2. เป้าหมายโครงงาน (Goal)
              _buildSectionTitle('2. เป้าหมายหลักของโครงงาน'),
              ..._goals.map((goal) {
                final isSelected = learner.projectGoal == goal;
                return InkWell(
                  onTap: () => learner.setProjectGoal(goal),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                    decoration: BoxDecoration(
                      color: isSelected ? AppTheme.surface2 : AppTheme.surface1,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSelected ? AppTheme.primaryCyan : AppTheme.borderStroke,
                        width: isSelected ? 1.5 : 1.0,
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          isSelected ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded,
                          color: isSelected ? AppTheme.primaryCyan : AppTheme.textMuted,
                          size: 18,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            goal,
                            style: TextStyle(
                              color: isSelected ? AppTheme.textPrimary : AppTheme.textSecondary,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                              fontSize: 13.5,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
              const SizedBox(height: 14),

              // 3. กรอบงบประมาณ (Budget)
              _buildSectionTitle('3. กรอบงบประมาณค่าอุปกรณ์'),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _budgets.map((budget) {
                  final isSelected = learner.budgetConstraint == budget;
                  return _buildChoicePill(
                    label: budget,
                    isSelected: isSelected,
                    onTap: () => learner.setBudgetConstraint(budget),
                  );
                }).toList(),
              ),
              const SizedBox(height: 18),

              // 4. ระยะเวลา & ขนาดทีม
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildSectionTitle('4. ระยะเวลาทำ'),
                        Row(
                          children: [4, 8, 12].map((w) {
                            final isSelected = learner.timelineWeeks == w;
                            return Expanded(
                              child: Padding(
                                padding: const EdgeInsets.only(right: 6.0),
                                child: _buildChoicePill(
                                  label: '$w สัปดาห์',
                                  isSelected: isSelected,
                                  onTap: () => learner.setTimelineWeeks(w),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildSectionTitle('5. ขนาดทีม'),
                        Row(
                          children: [1, 2, 3].map((size) {
                            final isSelected = learner.teamSize == size;
                            final labels = {1: '1 คน', 2: '2 คน', 3: '3 คน'};
                            return Expanded(
                              child: Padding(
                                padding: const EdgeInsets.only(right: 6.0),
                                child: _buildChoicePill(
                                  label: labels[size]!,
                                  isSelected: isSelected,
                                  onTap: () => learner.setTeamSize(size),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),

              // 6. อุปกรณ์ที่มีพร้อม (Resources Checkboxes)
              _buildSectionTitle('6. อุปกรณ์และความพร้อมที่มี'),
              ..._resourcesList.map((res) {
                final name = res['name'] as String;
                final isChecked = learner.availableResources.contains(name);
                return InkWell(
                  onTap: () => learner.toggleResource(name),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: isChecked ? AppTheme.surface2 : AppTheme.surface1,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isChecked ? AppTheme.secondaryViolet : AppTheme.borderStroke,
                        width: isChecked ? 1.5 : 1.0,
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(res['icon'] as IconData, color: isChecked ? AppTheme.secondaryViolet : AppTheme.textMuted, size: 20),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                name,
                                style: TextStyle(
                                  color: AppTheme.textPrimary,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 13.5,
                                ),
                              ),
                              Text(
                                res['desc'] as String,
                                style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
                              ),
                            ],
                          ),
                        ),
                        Checkbox(
                          value: isChecked,
                          activeColor: AppTheme.secondaryViolet,
                          checkColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                          onChanged: (_) => learner.toggleResource(name),
                        ),
                      ],
                    ),
                  ),
                );
              }),
              const SizedBox(height: 12),

              // 7. Security & Ethics Toggles
              _buildSectionTitle('7. นโยบายการคัดกรองหัวข้อ'),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                activeThumbColor: AppTheme.primaryCyan,
                secondary: const Icon(Icons.shield_outlined, color: AppTheme.accentGreen),
                title: Text('ความปลอดภัยระดับสูง (เลี่ยงอันตราย SRC/ISEF)', style: TextStyle(color: AppTheme.textPrimary, fontSize: 13.5)),
                subtitle: Text('ไม่แนะนำหัวข้อทดลองในสัตว์มีกระดูกสันหลังหรือสารพิษรุนแรง', style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                value: learner.strictSafetyOnly,
                onChanged: (val) => learner.setStrictSafetyOnly(val),
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                activeThumbColor: AppTheme.primaryCyan,
                secondary: Icon(Icons.menu_book_rounded, color: AppTheme.secondaryViolet),
                title: Text('เน้นหัวข้อที่มีงานวิจัยอ้างอิงชัดเจน (Prior Work)', style: TextStyle(color: AppTheme.textPrimary, fontSize: 13.5)),
                subtitle: Text('มีเอกสารและ Paper ตรวจสอบได้สำหรับเขียนบทนำ', style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                value: learner.citePriorWorkOnly,
                onChanged: (val) => learner.setCitePriorWorkOnly(val),
              ),
            ],
          ),
        ),

        // Bottom Action Bar
        Container(
          padding: const EdgeInsets.all(16.0),
          decoration: BoxDecoration(
            color: AppTheme.surface1,
            border: Border(top: BorderSide(color: AppTheme.borderStroke)),
          ),
          child: SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      'กำลังสร้าง Topic Cards สำหรับสาขา ${learner.selectedField} (${learner.gradeLevel}, ทีม ${learner.teamSize} คน)...',
                    ),
                    backgroundColor: AppTheme.surface2,
                  ),
                );
              },
              icon: const Icon(Icons.auto_awesome_rounded, color: Colors.black, size: 20),
              label: const Text(
                'เริ่มค้นพบหัวข้อโครงงาน (สร้างการ์ดไอเดีย) ▶',
                style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 14.5),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryCyan,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusPill)),
                elevation: 4,
                shadowColor: AppTheme.primaryCyan.withValues(alpha: 0.5),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Text(
        title,
        style: TextStyle(
          color: AppTheme.textPrimary,
          fontWeight: FontWeight.bold,
          fontSize: 14.5,
        ),
      ),
    );
  }

  Widget _buildChoicePill({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppTheme.radiusPill),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primaryCyan.withValues(alpha: 0.15) : AppTheme.surface1,
          borderRadius: BorderRadius.circular(AppTheme.radiusPill),
          border: Border.all(
            color: isSelected ? AppTheme.primaryCyan : AppTheme.borderStroke,
            width: isSelected ? 1.5 : 1.0,
          ),
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              color: isSelected ? AppTheme.primaryCyan : AppTheme.textSecondary,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
              fontSize: 12.5,
            ),
          ),
        ),
      ),
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
            decoration: BoxDecoration(
              color: AppTheme.primaryCyan,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.check, color: Colors.black, size: 12),
          ),
          const SizedBox(width: 6),
          Text(
            title,
            style: TextStyle(
              color: AppTheme.primaryCyan,
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
        color: isActive ? AppTheme.primaryCyan : Colors.transparent,
        borderRadius: BorderRadius.circular(AppTheme.radiusPill),
        border: Border.all(
          color: isActive ? AppTheme.primaryCyan : AppTheme.borderStroke,
        ),
      ),
      child: Text(
        '$stepNumber $title',
        style: TextStyle(
          color: isActive ? Colors.black : AppTheme.textMuted,
          fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
          fontSize: 12.5,
        ),
      ),
    );
  }
}
