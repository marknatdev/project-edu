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

                  // 10 Personal Tools
                  _DrawerItem(
                    icon: Icons.notifications_none_rounded,
                    title: 'การแจ้งเตือน',
                    badgeText: '1',
                    badgeColor: AppTheme.accentRed,
                    onTap: () => Navigator.pop(context),
                  ),
                  _DrawerItem(
                    icon: Icons.campaign_outlined,
                    title: 'มีอะไรใหม่?',
                    hasDot: true,
                    onTap: () => Navigator.pop(context),
                  ),
                  _DrawerItem(
                    icon: Icons.auto_awesome_outlined,
                    title: 'Who Are You',
                    onTap: () => Navigator.pop(context),
                  ),
                  _DrawerItem(
                    icon: Icons.emoji_events_outlined,
                    title: 'เควสการเรียนรู้',
                    onTap: () => Navigator.pop(context),
                  ),
                  _DrawerItem(
                    icon: Icons.alarm_rounded,
                    title: 'Study Alarm',
                    onTap: () => Navigator.pop(context),
                  ),
                  _DrawerItem(
                    icon: Icons.psychology_outlined,
                    title: 'AI Tutor',
                    onTap: () => Navigator.pop(context),
                  ),
                  _DrawerItem(
                    icon: Icons.functions_rounded,
                    title: 'เครื่องแก้สมการ',
                    onTap: () => Navigator.pop(context),
                  ),
                  _DrawerItem(
                    icon: Icons.pets_rounded,
                    title: 'Allie ของฉัน',
                    badgeText: '3',
                    badgeColor: AppTheme.accentRed,
                    onTap: () => Navigator.pop(context),
                  ),
                  _DrawerItem(
                    icon: Icons.bookmark_border_rounded,
                    title: 'คลังคำของฉัน',
                    onTap: () => Navigator.pop(context),
                  ),
                  _DrawerItem(
                    icon: Icons.edit_outlined,
                    title: 'แก้ไขโปรไฟล์',
                    onTap: () => Navigator.pop(context),
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
                    icon: Icons.settings_outlined,
                    title: 'ตั้งค่า',
                    onTap: () => Navigator.pop(context),
                  ),
                  _DrawerItem(
                    icon: Icons.help_outline_rounded,
                    title: 'ช่วยเหลือ และเกี่ยวกับ',
                    onTap: () => Navigator.pop(context),
                  ),
                  _DrawerItem(
                    icon: Icons.cloud_upload_outlined,
                    title: 'บริจาคโจทย์',
                    onTap: () => Navigator.pop(context),
                  ),
                  _DrawerItem(
                    icon: Icons.report_problem_outlined,
                    title: 'แจ้งปัญหา-เสนอแนะ',
                    onTap: () => Navigator.pop(context),
                  ),
                  _DrawerItem(
                    icon: Icons.favorite_border_rounded,
                    title: 'ติดตามเรา',
                    onTap: () => Navigator.pop(context),
                  ),
                  _DrawerItem(
                    icon: Icons.card_giftcard_rounded,
                    title: 'Donate ให้ทีมพัฒนา',
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
                color: isSelected ? AppTheme.primaryOrange : AppTheme.textSecondary,
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
