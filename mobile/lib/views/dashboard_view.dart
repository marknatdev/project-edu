import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../models/learner_state.dart';
import '../theme/app_theme.dart';
import '../widgets/countdown_banner.dart';
import '../widgets/feature_grid.dart';
import '../widgets/quick_action_bar.dart';
import 'ai_coach_dialog.dart';
import 'judge_defense_view.dart';
import 'topic_discovery_view.dart';

class DashboardView extends StatelessWidget {
  final VoidCallback onOpenPractice;

  const DashboardView({super.key, required this.onOpenPractice});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16.0, 16.0, 16.0, 100.0),
      children: [
        // 1. Hero Competition Countdown Banner (Top of Dashboard)
        CountdownBanner(
          title: 'YSC 2027 รอบแรก',
          examDate: 'ส่งข้อเสนอโครงงาน 10 ก.ย. 2569',
          deadline: DateTime(2026, 9, 10, 23, 59),
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
                  text:
                      'สวัสดีครับโค้ช ผมอยากเริ่มทำโครงงานวิทย์แต่ยังไม่มีไอเดีย ช่วยสัมภาษณ์เจาะลึกความสนใจและปัญหาที่ผมอยากแก้หน่อยครับ',
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
                  text:
                      'สวัสดีครับโค้ช ไอเดียโครงงานของผมต้องการปรับมุมมอง (Pivot) ให้มี Novelty และความเป็นไปได้สูงขึ้นตามเกณฑ์ YSC/ISEF ครับ',
                  isUser: true,
                  timestamp: DateTime.now(),
                ),
              ],
            );
            AiCoachModal.show(context, initialSession: sess);
          },
          onAllExam: onOpenPractice,
          onSaved: () => showCompetitionCalendar(context),
          onAddEdit: () => showExportSheet(context),
        ),
        const SizedBox(height: 14),

        // 3. Feature Grid 2x2 (Research Modules)
        FeatureGrid(
          onPracticeTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const TopicDiscoveryView()),
          ),
          onVocabTap: () => showEvaluationRubric(context),
          onExamTap: () => showExportSheet(context),
          onNotesTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const JudgeDefenseView()),
          ),
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
                      Icon(
                        Icons.analytics_rounded,
                        color: AppTheme.secondaryViolet,
                        size: 16,
                      ),
                      const SizedBox(width: 6),
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
                ],
              ),
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8.0),
                child: Text(
                  'ยังไม่มีการตรวจไอเดียในบัญชีนี้ • เริ่มสำรวจหัวข้อวิจัยหรือสร้างโครงงานใหม่เพื่อประเมินความใหม่ (Novelty) และระเบียบวิธีวิจัย',
                  style: TextStyle(
                    color: AppTheme.textMuted,
                    fontSize: 12,
                    height: 1.4,
                  ),
                ),
              ),
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
                          Icon(
                            Icons.shield_outlined,
                            color: AppTheme.accentGreen,
                            size: 16,
                          ),
                          SizedBox(width: 5),
                          Flexible(
                            child: Text(
                              'ธงความปลอดภัย (Safety Flag SRC/ISEF)',
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: AppTheme.accentGreen,
                                fontSize: 11.5,
                                fontWeight: FontWeight.w700,
                              ),
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
                          Icon(
                            Icons.info_outline_rounded,
                            color: AppTheme.textMuted,
                            size: 14,
                          ),
                          SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              'ยังไม่ได้ประเมิน • เป็นคำแนะนำ ต้องให้ครูหรือคณะกรรมการ SRC ยืนยัน',
                              style: TextStyle(
                                color: AppTheme.textSecondary,
                                fontSize: 11,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Icon(
                            Icons.chat_outlined,
                            color: AppTheme.primaryCyan,
                            size: 14,
                          ),
                          SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              'แตะเพื่อเปิดเซสชันปรึกษากรรมการ SRC ทันที >',
                              style: TextStyle(
                                color: AppTheme.primaryCyan,
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
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
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.accentGreen,
                        ),
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

void showCompetitionCalendar(BuildContext context) {
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
                Icon(
                  Icons.calendar_month_rounded,
                  color: AppTheme.primaryCyan,
                  size: 24,
                ),
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
            Text(
              'ช่วงเวลาโดยประมาณจากประกาศล่าสุดที่ตรวจสอบแล้ว (5 พ.ย. 2569) ปีถัดไปต้องตรวจประกาศจริงอีกครั้ง',
              style: TextStyle(color: AppTheme.textMuted, fontSize: 11.5, height: 1.4),
            ),
            const SizedBox(height: 12),
            for (final (i, season) in const [
              ('YSC: ส่งข้อเสนอโครงงาน', 'ส.ค. – ก.ย. (YSC 2027 ปิดรับข้อเสนอ 10 ก.ย. 2569)'),
              ('NSC: ส่งข้อเสนอโครงการซอฟต์แวร์', 'พ.ค. (NSC 2026 เปิด 1–29 พ.ค. 2569)'),
              ('ศิลปหัตถกรรมนักเรียน', 'ก.ย. – ธ.ค. แต่ละเขตไม่เท่ากัน ถามครูหรือเขตพื้นที่'),
              ('Regeneron ISEF 2027', '8–14 พ.ค. 2570 ต้องผ่านเวทีในเครือก่อน'),
            ].indexed)
              _TimelineItem(
                title: season.$1,
                date: season.$2,
                isLast: i == 3,
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
  final bool isLast;

  const _TimelineItem({required this.title, required this.date, this.isLast = false});

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
                color: AppTheme.surface3,
                border: Border.all(color: AppTheme.borderStroke, width: 2),
              ),
            ),
            if (!isLast) Container(width: 2, height: 38, color: AppTheme.borderStroke),
          ],
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(color: AppTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.bold),
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

void showExportSheet(BuildContext context) {
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
                Icon(
                  Icons.file_download_outlined,
                  color: AppTheme.accentGreen,
                  size: 24,
                ),
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
                decoration: BoxDecoration(
                  color: Colors.blue.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.description, color: Colors.blue),
              ),
              title: Text(
                'โครงร่างวิจัย (Markdown)',
                style: TextStyle(
                  color: AppTheme.textPrimary,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
              subtitle: Text(
                'ฟอร์แมตมาตรฐานพร้อมบทนำ สมมติฐาน และวิธีทดลอง',
                style: TextStyle(color: AppTheme.textMuted, fontSize: 11.5),
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                Navigator.pop(ctx);
                final learner = context.read<LearnerState>();
                showProposalPreviewDialog(context, learner);
              },
            ),
          ],
        ),
      );
    },
  );
}

void showEvaluationRubric(BuildContext context) {
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
                Icon(
                  Icons.analytics_rounded,
                  color: AppTheme.secondaryViolet,
                  size: 24,
                ),
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
              'ยังไม่มีคะแนนประเมินจริงในแอปมือถือ ใช้เกณฑ์นี้ทบทวนไอเดียด้วยตัวเอง หรือคุยกับ AI Coach ให้ช่วยตั้งคำถามทีละด้าน',
              style: TextStyle(
                color: AppTheme.textSecondary,
                fontSize: 12.5,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 14),
            for (final axis in const [
              ['1. ความใหม่ (Novelty)', 'ต่างจากงานที่มีอยู่แล้วอย่างไร'],
              [
                '2. ความเป็นไปได้ (Feasibility)',
                'ทำได้จริงด้วยเวลา งบ และอุปกรณ์ที่มีไหม',
              ],
              ['3. ผลกระทบ (Impact)', 'ช่วยแก้ปัญหาของใครหรืออะไร'],
              [
                '4. สมมติฐานและการวัดผล (Testability)',
                'วัดตัวแปรตามเป็นตัวเลขได้ และมีกลุ่มควบคุม',
              ],
              ['5. ความเหมาะสม (Fit)', 'เหมาะกับระดับชั้นและเวทีที่ตั้งเป้า'],
            ])
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(
                        text: '${axis[0]}\n',
                        style: TextStyle(
                          color: AppTheme.textPrimary,
                          fontWeight: FontWeight.bold,
                          fontSize: 12.5,
                        ),
                      ),
                      TextSpan(
                        text: axis[1],
                        style: TextStyle(
                          color: AppTheme.textMuted,
                          fontSize: 11.5,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      );
    },
  );
}

void showProposalPreviewDialog(BuildContext context, LearnerState learner) {
  final buffer = StringBuffer();
  buffer.writeln('# ข้อเสนอโครงงานวิจัยทางวิทยาศาสตร์ (Research Proposal)');
  buffer.writeln('เป้าหมายโครงงาน: ${learner.projectGoal}');
  buffer.writeln('สาขาวิชา: ${learner.selectedField}');
  buffer.writeln(
    'ระดับชั้น: ${learner.gradeLevel} (ขนาดทีม: ${learner.teamSize} คน)',
  );
  buffer.writeln('--------------------------------------------------');
  buffer.writeln('## 1. ชื่อโครงงาน (Project Title)');
  buffer.writeln(
    learner.currentLabSessionTitle.isNotEmpty
        ? learner.currentLabSessionTitle
        : 'โครงงานวิทยาศาสตร์ที่อยู่ระหว่างการพัฒนา',
  );
  buffer.writeln('');
  buffer.writeln('## 2. ที่มาและความสำคัญ');
  buffer.writeln(
    'โครงงานนี้มุ่งศึกษาและพัฒนาองค์ความรู้ในสาขา ${learner.selectedField} โดยเน้นการตั้งสมมติฐานที่วัดผลได้จริง และการควบคุมตัวแปรทางวิทยาศาสตร์ตามมาตรฐาน SRC/ISEF',
  );
  buffer.writeln('');
  buffer.writeln('## 3. วัตถุประสงค์และสมมติฐาน');
  buffer.writeln('- วัตถุประสงค์: เพื่อเปรียบเทียบผลของตัวแปรต้นต่อตัวแปรตาม');
  buffer.writeln(
    '- สมมติฐาน: หากตัวแปรต้นได้รับการควบคุมและปรับเปลี่ยน จะส่งผลให้ตัวแปรตามเปลี่ยนแปลงอย่างมีนัยสำคัญทางสถิติ',
  );
  buffer.writeln('');
  buffer.writeln('## 4. แผนการดำเนินงานและงบประมาณ');
  buffer.writeln('- ระยะเวลาการทดลอง: ${learner.timelineWeeks} สัปดาห์');
  buffer.writeln('- กรอบงบประมาณ: ${learner.budgetConstraint}');
  buffer.writeln('- ทรัพยากรที่มี: ${learner.availableResources.join(", ")}');
  buffer.writeln('');
  buffer.writeln(
    '## 5. บันทึกผลแล็บและการสังเกตการณ์เบื้องต้น (${learner.labObservations.length} รายการ)',
  );
  if (learner.labObservations.isEmpty) {
    buffer.writeln('(อยู่ระหว่างเตรียมการทดลอง)');
  } else {
    for (final obs in learner.labObservations) {
      buffer.writeln('- [${obs.time}] (${obs.tag}): ${obs.note}');
    }
  }
  buffer.writeln('');
  buffer.writeln('## 6. มาตรการความปลอดภัย (SRC Safety)');
  buffer.writeln(
    learner.strictSafetyOnly
        ? '• ตั้งใจเลือกเฉพาะวิธีที่ไม่ใช้สารอันตรายและไม่ทดลองในสัตว์มีกระดูกสันหลัง (ยังต้องให้ครูหรือคณะกรรมการ SRC ตรวจยืนยัน)'
        : '• อยู่ระหว่างการตรวจสอบของคณะกรรมการความปลอดภัยโรงเรียน',
  );

  final proposalText = buffer.toString();

  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: AppTheme.surface1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Row(
        children: [
          Icon(
            Icons.description_rounded,
            color: AppTheme.primaryCyan,
            size: 22,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'เค้าโครงงานวิจัย (.DOCX / Markdown)',
              style: TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 15.5,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
      content: SizedBox(
        width: double.maxFinite,
        height: MediaQuery.of(context).size.height * 0.55,
        child: SingleChildScrollView(
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.surface2,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.borderStroke),
            ),
            child: SelectableText(
              proposalText,
              style: TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 12.5,
                fontFamily: 'monospace',
                height: 1.4,
              ),
            ),
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx),
          child: Text('ปิด', style: TextStyle(color: AppTheme.textMuted)),
        ),
        ElevatedButton.icon(
          onPressed: () {
            Clipboard.setData(ClipboardData(text: proposalText));
            Navigator.pop(ctx);
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                  'คัดลอกเค้าโครงงานทั้งหมดลงคลิปบอร์ดแล้ว พร้อมนำไปวางใน Word หรือ Docs 📋',
                ),
                duration: Duration(seconds: 2),
              ),
            );
          },
          icon: Icon(
            Icons.copy_rounded,
            size: 16,
            color: AppTheme.isDark ? Colors.black : Colors.white,
          ),
          label: Text(
            'คัดลอกทั้งหมด',
            style: TextStyle(
              color: AppTheme.isDark ? Colors.black : Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 13,
            ),
          ),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.primaryCyan,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        ),
      ],
    ),
  );
}
