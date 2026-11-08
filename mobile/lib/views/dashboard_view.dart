import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../widgets/countdown_banner.dart';
import '../widgets/feature_grid.dart';
import '../widgets/quick_action_bar.dart';

class DashboardView extends StatelessWidget {
  final VoidCallback onOpenPractice;

  const DashboardView({
    super.key,
    required this.onOpenPractice,
  });

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16.0, 16.0, 16.0, 100.0),
      children: [
        // 1. Hero Competition Countdown Banner (Top of Dashboard)
        const CountdownBanner(
          title: 'YSC 2027 รอบแรก',
          examDate: 'ส่งข้อเสนอโครงงาน 15 ธ.ค.',
          days: 36,
          hours: 14,
          minutes: 20,
        ),
        const SizedBox(height: 14),

        // 2. Quick Action Bar
        QuickActionBar(
          onAiTutor: () {},
          onReview: () {},
          onAllExam: onOpenPractice,
          onSaved: () {},
          onAddEdit: () {},
        ),
        const SizedBox(height: 14),

        // 3. Feature Grid 2x2 (Research Modules)
        FeatureGrid(
          onPracticeTap: onOpenPractice,
          onVocabTap: onOpenPractice,
          onExamTap: onOpenPractice,
          onNotesTap: () {},
        ),
        const SizedBox(height: 16),

        // 4. 5-Axis Idea Evaluation Card
        Container(
          padding: const EdgeInsets.all(16.0),
          decoration: AppTheme.cardDecoration(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: const [
                      Icon(Icons.analytics_rounded, color: AppTheme.secondaryViolet, size: 16),
                      SizedBox(width: 6),
                      Text(
                        'ผลตรวจไอเดีย 5 ด้าน (Evaluation)',
                        style: TextStyle(
                          color: AppTheme.textPrimary,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppTheme.accentGreen.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text(
                      'เกรด B+ (78%)',
                      style: TextStyle(
                        color: AppTheme.accentGreen,
                        fontWeight: FontWeight.bold,
                        fontSize: 11,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const _EvalBar(label: 'ความใหม่ (Novelty)', score: 0.85, color: AppTheme.accentGreen),
              const _EvalBar(label: 'ความเป็นไปได้ (Feasibility)', score: 0.90, color: AppTheme.accentGreen),
              const _EvalBar(label: 'ผลกระทบ (Impact)', score: 0.75, color: AppTheme.accentGreen),
              const _EvalBar(label: 'สมมติฐาน/วิธีวัดผล', score: 0.60, color: AppTheme.accentAmber),
              const _EvalBar(label: 'ความเหมาะกับเป้าหมาย', score: 0.80, color: AppTheme.accentGreen),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // 5. Research Safety & Advisor Status Card (Safety Flag)
        Container(
          padding: const EdgeInsets.all(16.0),
          decoration: AppTheme.cardDecoration(),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                flex: 7,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: const [
                        Icon(Icons.shield_outlined, color: AppTheme.primaryCyan, size: 15),
                        SizedBox(width: 4),
                        Text(
                          'ธงความปลอดภัย (Safety Flag SRC/ISEF)',
                          style: TextStyle(
                            color: AppTheme.primaryCyan,
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'การประเมินตัวแปรและแล็บ',
                      style: TextStyle(
                        color: AppTheme.textPrimary,
                        fontWeight: FontWeight.w800,
                        fontSize: 14.5,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: const [
                        Icon(Icons.check_circle_rounded, color: AppTheme.accentGreen, size: 14),
                        SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            'ผ่านเกณฑ์ระดับไม่เป็นอันตราย (Non-hazardous)',
                            style: TextStyle(color: AppTheme.textSecondary, fontSize: 11),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: const [
                        Icon(Icons.info_outline_rounded, color: AppTheme.accentAmber, size: 14),
                        SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            'รออาจารย์ที่ปรึกษากดยืนยัน (สามารถส่งออกฉบับร่างได้)',
                            style: TextStyle(color: AppTheme.textSecondary, fontSize: 11),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 3,
                child: Container(
                  height: 80,
                  decoration: BoxDecoration(
                    color: AppTheme.surface2,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.borderStroke),
                  ),
                  child: const Center(
                    child: Text(
                      '🔬\nLab Log',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 16),
                    ),
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

class _EvalBar extends StatelessWidget {
  final String label;
  final double score;
  final Color color;

  const _EvalBar({
    required this.label,
    required this.score,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
              Text('${(score * 100).toInt()}%', style: TextStyle(color: color, fontSize: 11.5, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 3),
          ClipRRect(
            borderRadius: BorderRadius.circular(3),
            child: LinearProgressIndicator(
              value: score,
              backgroundColor: AppTheme.surface2,
              valueColor: AlwaysStoppedAnimation<Color>(color),
              minHeight: 5,
            ),
          ),
        ],
      ),
    );
  }
}
