import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/learner_state.dart';
import '../theme/app_theme.dart';
import '../views/ai_coach_dialog.dart';
import '../views/topic_discovery_view.dart';

class AppDrawer extends StatelessWidget {
  const AppDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final learner = context.watch<LearnerState>();

    return Drawer(
      backgroundColor: AppTheme.surface1,
      child: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                children: [
                  // User Profile Header
                  InkWell(
                    onTap: () {
                      learner.setTab(4);
                      Navigator.pop(context);
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8.0),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 26,
                            backgroundColor: AppTheme.surface3,
                            child: const Icon(Icons.person, color: Colors.white70, size: 30),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  learner.displayName,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: AppTheme.textPrimary,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  learner.handle,
                                  style: TextStyle(
                                    color: AppTheme.textMuted,
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  Divider(color: AppTheme.borderStroke, height: 24),

                  // Project Edu Research Tools
                  _DrawerItem(
                    icon: Icons.view_carousel_rounded,
                    title: 'สำรวจการ์ดหัวข้อวิจัย (Topic Cards)',
                    badgeText: 'HOT',
                    badgeColor: AppTheme.accentAmber,
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const TopicDiscoveryView()),
                      );
                    },
                  ),
                  _DrawerItem(
                    icon: Icons.folder_special_outlined,
                    title: 'โครงงานวิจัยของฉัน',
                    badgeText: '${learner.activeProjectsCount}',
                    badgeColor: AppTheme.primaryCyan,
                    onTap: () {
                      learner.setTab(0);
                      Navigator.pop(context);
                    },
                  ),
                  _DrawerItem(
                    icon: Icons.science_outlined,
                    title: 'บันทึกการทดลองแล็บ (Lab Log)',
                    badgeText: '${learner.labObservations.length}',
                    badgeColor: AppTheme.secondaryViolet,
                    onTap: () {
                      learner.setTab(2);
                      Navigator.pop(context);
                    },
                  ),
                  _DrawerItem(
                    icon: Icons.analytics_outlined,
                    title: 'เกณฑ์ประเมิน 5 มิติ (Evaluation)',
                    onTap: () {
                      Navigator.pop(context);
                      _showEvaluationDialog(context);
                    },
                  ),
                  _DrawerItem(
                    icon: Icons.shield_outlined,
                    title: 'คู่มือความปลอดภัยแล็บ SRC/ISEF',
                    badgeText: 'PASS',
                    badgeColor: AppTheme.accentGreen,
                    onTap: () {
                      Navigator.pop(context);
                      final sess = learner.startSrcSafetySession();
                      AiCoachModal.show(context, initialSession: sess);
                    },
                  ),
                  _DrawerItem(
                    icon: Icons.inventory_2_outlined,
                    title: 'รายการอุปกรณ์ & งบประมาณ BOM',
                    onTap: () {
                      Navigator.pop(context);
                      _showBomDialog(context);
                    },
                  ),
                  _DrawerItem(
                    icon: Icons.event_note_rounded,
                    title: 'ปฏิทินส่งผลงาน YSC 2027',
                    onTap: () {
                      Navigator.pop(context);
                      _showCalendarDialog(context);
                    },
                  ),
                  _DrawerItem(
                    icon: Icons.supervisor_account_outlined,
                    title: 'การตรวจรับรองโดยอาจารย์ที่ปรึกษา',
                    hasDot: true,
                    onTap: () {
                      learner.setTab(4);
                      Navigator.pop(context);
                    },
                  ),
                  _DrawerItem(
                    icon: Icons.record_voice_over_outlined,
                    title: 'ซ้อมตอบคำถามกรรมการ (Mock Judge)',
                    onTap: () {
                      Navigator.pop(context);
                      final sess = learner.createNewSession(
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
                  _DrawerItem(
                    icon: Icons.description_outlined,
                    title: 'ส่งออกเอกสารเค้าโครงงาน (.DOCX)',
                    onTap: () {
                      Navigator.pop(context);
                      _showExportDialog(context);
                    },
                  ),
                  _DrawerItem(
                    icon: Icons.manage_accounts_outlined,
                    title: 'ข้อมูลนักวิจัยเยาวชน',
                    onTap: () {
                      learner.setTab(4);
                      Navigator.pop(context);
                    },
                  ),

                  Divider(color: AppTheme.borderStroke, height: 28),

                  // Theme Switcher Section
                  Row(
                    children: [
                      Icon(Icons.contrast_rounded, size: 18, color: AppTheme.textSecondary),
                      SizedBox(width: 8),
                      Text(
                        'ธีม',
                        style: TextStyle(
                          color: AppTheme.textSecondary,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: AppTheme.surface2,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        _ThemeButton(
                          label: 'สว่าง',
                          icon: Icons.wb_sunny_outlined,
                          isSelected: learner.themeMode == AppThemeMode.light,
                          onTap: () => learner.setThemeMode(AppThemeMode.light),
                        ),
                        _ThemeButton(
                          label: 'ระบบ',
                          icon: Icons.smartphone_rounded,
                          isSelected: learner.themeMode == AppThemeMode.system,
                          onTap: () => learner.setThemeMode(AppThemeMode.system),
                        ),
                        _ThemeButton(
                          label: 'มืด',
                          icon: Icons.nightlight_round,
                          isSelected: learner.themeMode == AppThemeMode.dark,
                          onTap: () => learner.setThemeMode(AppThemeMode.dark),
                        ),
                      ],
                    ),
                  ),

                  Divider(color: AppTheme.borderStroke, height: 28),

                  // Secondary & Community
                  _DrawerItem(
                    icon: Icons.menu_book_outlined,
                    title: 'คลังงานวิจัยเดิม (Prior Work Citations)',
                    onTap: () => Navigator.pop(context),
                  ),
                  _DrawerItem(
                    icon: Icons.help_outline_rounded,
                    title: 'คู่มือและวิธีใช้ Project Edu',
                    onTap: () => Navigator.pop(context),
                  ),
                  _DrawerItem(
                    icon: Icons.forum_outlined,
                    title: 'ชุมชนแลกเปลี่ยนความรู้เยาวชน',
                    onTap: () => Navigator.pop(context),
                  ),
                  _DrawerItem(
                    icon: Icons.feedback_outlined,
                    title: 'แจ้งปัญหาหรือข้อเสนอแนะ',
                    onTap: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),

            // Logout Footer
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: InkWell(
                onTap: () => Navigator.pop(context),
                borderRadius: BorderRadius.circular(8),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 4.0),
                  child: Row(
                    children: const [
                      Icon(Icons.logout_rounded, color: AppTheme.accentRed, size: 22),
                      SizedBox(width: 12),
                      Text(
                        'ออกจากระบบ',
                        style: TextStyle(
                          color: AppTheme.accentRed,
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DrawerItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? badgeText;
  final Color? badgeColor;
  final bool hasDot;
  final VoidCallback onTap;

  const _DrawerItem({
    required this.icon,
    required this.title,
    this.badgeText,
    this.badgeColor,
    this.hasDot = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10.0, horizontal: 4.0),
        child: Row(
          children: [
            Icon(icon, color: AppTheme.textPrimary, size: 20),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                  color: AppTheme.textPrimary,
                  fontSize: 14.5,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            if (badgeText != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: badgeColor ?? AppTheme.primaryOrange,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  badgeText!,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            if (hasDot)
              Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(
                  color: AppTheme.accentRed,
                  shape: BoxShape.circle,
                ),
              ),
            const SizedBox(width: 6),
            Icon(Icons.chevron_right_rounded, color: AppTheme.textMuted, size: 20),
          ],
        ),
      ),
    );
  }
}

class _ThemeButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _ThemeButton({
    required this.label,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? AppTheme.surface3 : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 15,
                color: isSelected ? AppTheme.primaryCyan : AppTheme.textSecondary,
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  color: isSelected ? AppTheme.textPrimary : AppTheme.textSecondary,
                  fontSize: 12.5,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

void _showBomDialog(BuildContext context) {
  showModalBottomSheet(
    context: context,
    backgroundColor: AppTheme.surface1,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (ctx) => Padding(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(Icons.inventory_2_outlined, color: AppTheme.primaryCyan, size: 24),
                  const SizedBox(width: 8),
                  Text(
                    'รายการอุปกรณ์ & งบประมาณ (BOM)',
                    style: TextStyle(color: AppTheme.textPrimary, fontSize: 17, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close_rounded)),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.surface2,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppTheme.borderStroke),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('งบประมาณรวมที่ใช้:', style: TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
                Text('810 / 1,500 บาท', style: TextStyle(color: AppTheme.accentGreen, fontWeight: FontWeight.bold, fontSize: 15)),
              ],
            ),
          ),
          const SizedBox(height: 14),
          _BomTile(title: 'เซนเซอร์วัดฝุ่น PMS7003 Optical Scattering', cost: '420 ฿', status: 'จัดซื้อแล้ว', statusColor: AppTheme.accentGreen),
          _BomTile(title: 'บอร์ดไมโครคอนโทรลเลอร์ ESP32 NodeMCU', cost: '160 ฿', status: 'ยืมแล็บโรงเรียน', statusColor: AppTheme.primaryCyan),
          _BomTile(title: 'เซนเซอร์อุณหภูมิและความชื้น BME280', cost: '110 ฿', status: 'จัดซื้อแล้ว', statusColor: AppTheme.accentGreen),
          _BomTile(title: 'แบตเตอรี่ลิเธียม 18650 พร้อมโมดูลชาร์จ TP4056', cost: '120 ฿', status: 'มีแล้วในสต็อก', statusColor: AppTheme.textMuted),
        ],
      ),
    ),
  );
}

class _BomTile extends StatelessWidget {
  final String title;
  final String cost;
  final String status;
  final Color statusColor;

  const _BomTile({required this.title, required this.cost, required this.status, required this.statusColor});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppTheme.surface2,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.borderStroke),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(title, style: TextStyle(color: AppTheme.textPrimary, fontSize: 12.5, fontWeight: FontWeight.w500)),
          ),
          const SizedBox(width: 8),
          Text(cost, style: TextStyle(color: AppTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.bold)),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(4)),
            child: Text(status, style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold)),
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
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
    builder: (ctx) => Padding(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.calendar_month_rounded, color: AppTheme.primaryCyan, size: 24),
              const SizedBox(width: 8),
              Text('ปฏิทินส่งผลงานวิจัย YSC 2027', style: TextStyle(color: AppTheme.textPrimary, fontSize: 17, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 16),
          _DrawerCalendarRow(title: 'ส่งข้อเสนอโครงงาน (Proposal)', date: '1 ก.ค. - 31 ส.ค. 2026', status: 'กำลังเปิดรับ', color: AppTheme.accentGreen),
          _DrawerCalendarRow(title: 'ประกาศผลรอบคัดเลือก & อนุมัติทุน 3,000 บ.', date: '15 ก.ย. 2026', status: 'รอดำเนินการ', color: AppTheme.textMuted),
          _DrawerCalendarRow(title: 'ส่งรายงานฉบับสมบูรณ์ (Full Paper)', date: '15 ธ.ค. 2026', status: 'รอดำเนินการ', color: AppTheme.textMuted),
          _DrawerCalendarRow(title: 'รอบชิงชนะเลิศระดับประเทศ (National Finals)', date: 'มกราคม 2027', status: 'รอบชิง', color: AppTheme.accentAmber),
          _DrawerCalendarRow(title: 'ผู้แทนประเทศไทยสู่ Regeneron ISEF (สหรัฐฯ)', date: 'พฤษภาคม 2027', status: 'เป้าหมาย', color: AppTheme.secondaryViolet),
        ],
      ),
    ),
  );
}

class _DrawerCalendarRow extends StatelessWidget {
  final String title;
  final String date;
  final String status;
  final Color color;

  const _DrawerCalendarRow({required this.title, required this.date, required this.status, required this.color});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(color: AppTheme.textPrimary, fontSize: 12.5, fontWeight: FontWeight.bold)),
                Text(date, style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(4)),
            child: Text(status, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}

void _showExportDialog(BuildContext context) {
  showModalBottomSheet(
    context: context,
    backgroundColor: AppTheme.surface1,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
    builder: (ctx) => Padding(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.file_download_outlined, color: AppTheme.accentGreen, size: 24),
              const SizedBox(width: 8),
              Text('ส่งออกเอกสารวิจัย (Research Export)', style: TextStyle(color: AppTheme.textPrimary, fontSize: 17, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 16),
          ListTile(
            leading: const Icon(Icons.description, color: Colors.blue),
            title: Text('เค้าโครงงานวิจัย (Research Proposal .docx)', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 13.5)),
            onTap: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('สร้างไฟล์ Word (.docx) สำเร็จ')));
            },
          ),
          ListTile(
            leading: const Icon(Icons.picture_as_pdf, color: Colors.red),
            title: Text('แบบฟอร์มความปลอดภัย SRC Form 1A/1B (.pdf)', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 13.5)),
            onTap: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('สร้างไฟล์ PDF SRC Form สำเร็จ')));
            },
          ),
        ],
      ),
    ),
  );
}

void _showEvaluationDialog(BuildContext context) {
  showModalBottomSheet(
    context: context,
    backgroundColor: AppTheme.surface1,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
    builder: (ctx) => Padding(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.analytics_rounded, color: AppTheme.secondaryViolet, size: 24),
              const SizedBox(width: 8),
              Text('เกณฑ์ประเมินโครงงาน 5 ด้าน (Rubric)', style: TextStyle(color: AppTheme.textPrimary, fontSize: 17, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 12),
          Text('เกรดรวมปัจจุบัน: B+ (78/100) • ตามเกณฑ์มาตรฐาน YSC/ISEF', style: TextStyle(color: AppTheme.textSecondary, fontSize: 12.5)),
          const SizedBox(height: 14),
          _EvalRow(label: '1. ความใหม่ (Novelty)', score: '85%'),
          _EvalRow(label: '2. ความเป็นไปได้ (Feasibility)', score: '90%'),
          _EvalRow(label: '3. ผลกระทบเชิงสังคม (Impact)', score: '75%'),
          _EvalRow(label: '4. สมมติฐานและการวัดผล (Testability)', score: '60%'),
          _EvalRow(label: '5. ความเหมาะสมตามระดับชั้น (Fit)', score: '80%'),
        ],
      ),
    ),
  );
}

class _EvalRow extends StatelessWidget {
  final String label;
  final String score;

  const _EvalRow({required this.label, required this.score});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: AppTheme.textPrimary, fontSize: 12.5)),
          Text(score, style: TextStyle(color: AppTheme.accentGreen, fontWeight: FontWeight.bold, fontSize: 13)),
        ],
      ),
    );
  }
}
