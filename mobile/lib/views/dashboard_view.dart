import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/learner_state.dart';
import '../theme/app_theme.dart';
import '../widgets/countdown_banner.dart';
import '../widgets/feature_grid.dart';
import '../widgets/quick_action_bar.dart';
import 'ai_coach_dialog.dart';
import 'topic_discovery_view.dart';

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
          onAiTutor: () {
            final sess = context.read<LearnerState>().createNewSession(
              title: '🎤 สัมภาษณ์ขุดไอเดียวิจัย (Interview)',
              category: 'Socratic Research',
              initialMessages: [
                ChatMessage(
                  text: 'สวัสดีครับโค้ช ผมอยากเริ่มทำโครงงานวิทย์แต่ยังไม่มีไอเดีย ช่วยสัมภาษณ์เจาะลึกความสนใจและปัญหาที่ผมอยากแก้หน่อยครับ',
                  isUser: true,
                  timestamp: DateTime.now(),
                ),
              ],
            );
            AiCoachModal.show(context, initialSession: sess);
          },
          onReview: () {
            final sess = context.read<LearnerState>().createNewSession(
              title: '🔄 เวิร์กช็อป Pivot ปรับมุมมองวิจัย',
              category: 'Pivot Workshop',
              initialMessages: [
                ChatMessage(
                  text: 'สวัสดีครับโค้ช ไอเดียโครงงานของผมต้องการปรับมุมมอง (Pivot) ให้มี Novelty และความเป็นไปได้สูงขึ้นตามเกณฑ์ YSC/ISEF ครับ',
                  isUser: true,
                  timestamp: DateTime.now(),
                ),
              ],
            );
            AiCoachModal.show(context, initialSession: sess);
          },
          onAllExam: onOpenPractice,
          onSaved: () => _showCalendarDialog(context),
          onAddEdit: () => _showExportDialog(context),
        ),
        const SizedBox(height: 14),

        // 3. Feature Grid 2x2 (Research Modules)
        FeatureGrid(
          onPracticeTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const TopicDiscoveryView()),
          ),
          onVocabTap: () => _showEvaluationDialog(context),
          onExamTap: () => _showExportDialog(context),
          onNotesTap: () {
            final sess = context.read<LearnerState>().createNewSession(
              title: '🧑‍⚖️ ซ้อมตอบคำถามกรรมการ (Mock Judge)',
              category: 'Socratic Research',
              initialMessages: [
                ChatMessage(
                  text: 'ขอเชิญท่านกรรมการเริ่มตั้งคำถามท้าทายเกี่ยวกับระเบียบวิธีวิจัย การควบคุมตัวแปร และผลกระทบของโครงงานได้เลยครับ',
                  isUser: true,
                  timestamp: DateTime.now(),
                ),
              ],
            );
            AiCoachModal.show(context, initialSession: sess);
          },
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
                    children: [
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
        InkWell(
          onTap: () {
            final sess = context.read<LearnerState>().startSrcSafetySession();
            AiCoachModal.show(context, initialSession: sess);
          },
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(16.0),
            decoration: AppTheme.cardDecoration(
              border: AppTheme.accentGreen.withValues(alpha: 0.35),
            ),
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
                          Icon(Icons.shield_outlined, color: AppTheme.accentGreen, size: 16),
                          SizedBox(width: 5),
                          Text(
                            'ธงความปลอดภัย (Safety Flag SRC/ISEF)',
                            style: TextStyle(
                              color: AppTheme.accentGreen,
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'การประเมินตัวแปรและแล็บ',
                        style: TextStyle(
                          color: AppTheme.textPrimary,
                          fontWeight: FontWeight.w800,
                          fontSize: 14.5,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
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
                        children: [
                          Icon(Icons.chat_outlined, color: AppTheme.primaryCyan, size: 14),
                          SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              'แตะเพื่อเปิดเซสชันปรึกษากรรมการ SRC ทันที >',
                              style: TextStyle(color: AppTheme.primaryCyan, fontSize: 11, fontWeight: FontWeight.bold),
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
                        '🛡️\nSRC Chat',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.accentGreen),
                      ),
                    ),
                  ),
                ),
              ],
            ),
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
              Text(label, style: TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
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

void _showCalendarDialog(BuildContext context) {
  showModalBottomSheet(
    context: context,
    backgroundColor: AppTheme.surface1,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (ctx) {
      return Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.calendar_month_rounded, color: AppTheme.primaryCyan, size: 24),
                const SizedBox(width: 8),
                Text(
                  'ปฏิทินการแข่งขันวิจัย YSC & ISEF',
                  style: TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _TimelineItem(
              title: 'ส่งข้อเสนอโครงงาน (Proposal Submission)',
              date: '1 ก.ค. - 31 ส.ค. 2026',
              status: 'กำลังเปิดรับสมัคร',
              statusColor: AppTheme.accentGreen,
              isCurrent: true,
            ),
            _TimelineItem(
              title: 'ประกาศผลรอบคัดเลือก & อนุมัติทุนวิจัย 3,000 บ.',
              date: '15 ก.ย. 2026',
              status: 'รอดำเนินการ',
              statusColor: AppTheme.textMuted,
            ),
            _TimelineItem(
              title: 'ส่งรายงานฉบับสมบูรณ์ (Full Paper)',
              date: '15 ธ.ค. 2026',
              status: 'รอดำเนินการ',
              statusColor: AppTheme.textMuted,
            ),
            _TimelineItem(
              title: 'นำเสนอผลงานรอบชิงชนะเลิศ (National Finals)',
              date: 'มกราคม 2027',
              status: 'รอดำเนินการ',
              statusColor: AppTheme.textMuted,
            ),
            _TimelineItem(
              title: 'ผู้แทนประเทศไทยสู่ Regeneron ISEF (สหรัฐอเมริกา)',
              date: 'พฤษภาคม 2027',
              status: 'เป้าหมายสูงสุด',
              statusColor: AppTheme.secondaryViolet,
              isLast: true,
            ),
          ],
        ),
      );
    },
  );
}

class _TimelineItem extends StatelessWidget {
  final String title;
  final String date;
  final String status;
  final Color statusColor;
  final bool isCurrent;
  final bool isLast;

  const _TimelineItem({
    required this.title,
    required this.date,
    required this.status,
    required this.statusColor,
    this.isCurrent = false,
    this.isLast = false,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 14,
              height: 14,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isCurrent ? AppTheme.primaryCyan : AppTheme.surface3,
                border: Border.all(
                  color: isCurrent ? AppTheme.primaryCyan : AppTheme.borderStroke,
                  width: 2,
                ),
              ),
            ),
            if (!isLast)
              Container(
                width: 2,
                height: 38,
                color: AppTheme.borderStroke,
              ),
          ],
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: TextStyle(
                        color: isCurrent ? AppTheme.primaryCyan : AppTheme.textPrimary,
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      status,
                      style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              Text(date, style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ],
    );
  }
}

void _showExportDialog(BuildContext context) {
  showModalBottomSheet(
    context: context,
    backgroundColor: AppTheme.surface1,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (ctx) {
      return Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.file_download_outlined, color: AppTheme.accentGreen, size: 24),
                const SizedBox(width: 8),
                Text(
                  'ส่งออกเอกสารวิจัย (Research Export)',
                  style: TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: Colors.blue.withValues(alpha: 0.15), shape: BoxShape.circle),
                child: const Icon(Icons.description, color: Colors.blue),
              ),
              title: Text('โครงร่างวิจัย (Research Proposal .docx)', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 14)),
              subtitle: Text('ฟอร์แมตมาตรฐานพร้อมบทนำ สมมติฐาน และวิธีทดลอง', style: TextStyle(color: AppTheme.textMuted, fontSize: 11.5)),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('สร้างไฟล์ Word (.docx) สำเร็จ กำลังเปิดดาวน์โหลด...')),
                );
              },
            ),
            ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: Colors.red.withValues(alpha: 0.15), shape: BoxShape.circle),
                child: const Icon(Icons.picture_as_pdf, color: Colors.red),
              ),
              title: Text('เอกสารรับรองความปลอดภัย SRC Form 1A/1B (.pdf)', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 14)),
              subtitle: Text('แบบฟอร์มตรวจสอบความเสี่ยงสำหรับอาจารย์ที่ปรึกษาลงนาม', style: TextStyle(color: AppTheme.textMuted, fontSize: 11.5)),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('สร้างไฟล์ PDF SRC Form สำเร็จ')),
                );
              },
            ),
            ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: Colors.green.withValues(alpha: 0.15), shape: BoxShape.circle),
                child: const Icon(Icons.table_chart, color: Colors.green),
              ),
              title: Text('รายการวัสดุและอุปกรณ์ BOM (.xlsx)', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 14)),
              subtitle: Text('แจกแจงงบประมาณและแหล่งจัดซื้ออุปกรณ์', style: TextStyle(color: AppTheme.textMuted, fontSize: 11.5)),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('สร้างไฟล์ Excel BOM สำเร็จ')),
                );
              },
            ),
            ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: AppTheme.primaryCyan.withValues(alpha: 0.15), shape: BoxShape.circle),
                child: Icon(Icons.share, color: AppTheme.primaryCyan),
              ),
              title: Text('คัดลอกลิงก์ให้อาจารย์ที่ปรึกษาตรวจ (Share Link)', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 14)),
              subtitle: Text('อาจารย์สามารถเปิดดูความคืบหน้าและประเมินผ่านเว็บได้', style: TextStyle(color: AppTheme.textMuted, fontSize: 11.5)),
              trailing: const Icon(Icons.copy),
              onTap: () {
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('คัดลอกลิงก์สำหรับอาจารย์ที่ปรึกษาลงคลิปบอร์ดแล้ว!')),
                );
              },
            ),
          ],
        ),
      );
    },
  );
}

void _showEvaluationDialog(BuildContext context) {
  showModalBottomSheet(
    context: context,
    backgroundColor: AppTheme.surface1,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (ctx) {
      return Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.analytics_rounded, color: AppTheme.secondaryViolet, size: 24),
                const SizedBox(width: 8),
                Text(
                  'เกณฑ์ประเมินโครงงาน 5 ด้าน (Rubric)',
                  style: TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              'เกรดรวมปัจจุบัน: B+ (78/100) • ตามเกณฑ์มาตรฐาน YSC/ISEF',
              style: TextStyle(color: AppTheme.textSecondary, fontSize: 12.5),
            ),
            const SizedBox(height: 16),
            const _EvalBar(label: '1. ความใหม่ (Novelty) - 85%', score: 0.85, color: AppTheme.accentGreen),
            const _EvalBar(label: '2. ความเป็นไปได้ (Feasibility) - 90%', score: 0.90, color: AppTheme.accentGreen),
            const _EvalBar(label: '3. ผลกระทบเชิงสังคม (Impact) - 75%', score: 0.75, color: AppTheme.accentGreen),
            const _EvalBar(label: '4. สมมติฐานและการวัดผล (Testability) - 60%', score: 0.60, color: AppTheme.accentAmber),
            const _EvalBar(label: '5. ความเหมาะสมตามระดับชั้น (Fit) - 80%', score: 0.80, color: AppTheme.accentGreen),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.surface2,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppTheme.borderStroke),
              ),
              child: Row(
                children: [
                  Icon(Icons.lightbulb_outline_rounded, color: AppTheme.accentAmber, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'คำแนะนำจาก AI Coach: ควรเพิ่มความแม่นยำในการวัดผลตัวแปรตาม โดยระบุหน่วยวัดเชิงตัวเลขและเครื่องมือสอบเทียบให้ชัดเจน',
                      style: TextStyle(color: AppTheme.textPrimary, fontSize: 11.5),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    },
  );
}
