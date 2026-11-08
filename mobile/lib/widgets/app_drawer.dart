import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/learner_state.dart';
import '../theme/app_theme.dart';

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
                                  style: const TextStyle(
                                    color: AppTheme.textPrimary,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  learner.handle,
                                  style: const TextStyle(
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

                  const Divider(color: AppTheme.borderStroke, height: 24),

                  // Project Edu Research Tools
                  _DrawerItem(
                    icon: Icons.folder_special_outlined,
                    title: 'โครงงานวิจัยของฉัน',
                    badgeText: '2',
                    badgeColor: AppTheme.primaryCyan,
                    onTap: () {
                      learner.setTab(0);
                      Navigator.pop(context);
                    },
                  ),
                  _DrawerItem(
                    icon: Icons.science_outlined,
                    title: 'บันทึกการทดลองแล็บ (Lab Log)',
                    onTap: () {
                      learner.setTab(2);
                      Navigator.pop(context);
                    },
                  ),
                  _DrawerItem(
                    icon: Icons.analytics_outlined,
                    title: 'เกณฑ์ประเมิน 5 มิติ (Evaluation)',
                    onTap: () => Navigator.pop(context),
                  ),
                  _DrawerItem(
                    icon: Icons.shield_outlined,
                    title: 'คู่มือความปลอดภัยแล็บ SRC/ISEF',
                    badgeText: 'PASS',
                    badgeColor: AppTheme.accentGreen,
                    onTap: () => Navigator.pop(context),
                  ),
                  _DrawerItem(
                    icon: Icons.inventory_2_outlined,
                    title: 'รายการอุปกรณ์ & งบประมาณ BOM',
                    onTap: () => Navigator.pop(context),
                  ),
                  _DrawerItem(
                    icon: Icons.event_note_rounded,
                    title: 'ปฏิทินส่งผลงาน YSC 2027',
                    onTap: () => Navigator.pop(context),
                  ),
                  _DrawerItem(
                    icon: Icons.supervisor_account_outlined,
                    title: 'การตรวจรับรองโดยอาจารย์ที่ปรึกษา',
                    hasDot: true,
                    onTap: () => Navigator.pop(context),
                  ),
                  _DrawerItem(
                    icon: Icons.record_voice_over_outlined,
                    title: 'ซ้อมตอบคำถามกรรมการ (Mock Judge)',
                    onTap: () => Navigator.pop(context),
                  ),
                  _DrawerItem(
                    icon: Icons.description_outlined,
                    title: 'ส่งออกเอกสารเค้าโครงงาน (.DOCX)',
                    onTap: () => Navigator.pop(context),
                  ),
                  _DrawerItem(
                    icon: Icons.manage_accounts_outlined,
                    title: 'ข้อมูลนักวิจัยเยาวชน',
                    onTap: () {
                      learner.setTab(4);
                      Navigator.pop(context);
                    },
                  ),

                  const Divider(color: AppTheme.borderStroke, height: 28),

                  // Theme Switcher Section
                  Row(
                    children: const [
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

                  const Divider(color: AppTheme.borderStroke, height: 28),

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
                style: const TextStyle(
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
            const Icon(Icons.chevron_right_rounded, color: AppTheme.textMuted, size: 20),
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
