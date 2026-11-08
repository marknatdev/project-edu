import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class QuickActionBar extends StatelessWidget {
  final VoidCallback? onAiTutor;
  final VoidCallback? onReview;
  final VoidCallback? onAllExam;
  final VoidCallback? onSaved;
  final VoidCallback? onAddEdit;

  const QuickActionBar({
    super.key,
    this.onAiTutor,
    this.onReview,
    this.onAllExam,
    this.onSaved,
    this.onAddEdit,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _QuickItem(
            icon: Icons.auto_awesome_rounded,
            label: 'AI Tutor',
            badgeText: 'BETA',
            badgeColor: AppTheme.accentGreen,
            onTap: onAiTutor,
          ),
          _QuickItem(
            icon: Icons.refresh_rounded,
            label: 'ทบทวน',
            countBadge: '1',
            badgeColor: AppTheme.accentRed,
            onTap: onReview,
          ),
          _QuickItem(
            icon: Icons.description_outlined,
            label: 'All Exam',
            badgeText: 'NEW',
            badgeColor: AppTheme.accentGreen,
            onTap: onAllExam,
          ),
          _QuickItem(
            icon: Icons.bookmark_border_rounded,
            label: 'โจทย์ที่บันทึก',
            onTap: onSaved,
          ),
          _QuickItem(
            icon: Icons.add_rounded,
            label: 'เพิ่ม/แก้ไข',
            isDashed: true,
            onTap: onAddEdit,
          ),
        ],
      ),
    );
  }
}

class _QuickItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? badgeText;
  final String? countBadge;
  final Color? badgeColor;
  final bool isDashed;
  final VoidCallback? onTap;

  const _QuickItem({
    required this.icon,
    required this.label,
    this.badgeText,
    this.countBadge,
    this.badgeColor,
    this.isDashed = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4.0, vertical: 4.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                // Icon Button Surface
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: isDashed ? Colors.transparent : AppTheme.surface1,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isDashed ? AppTheme.textMuted : AppTheme.borderStroke,
                      style: isDashed ? BorderStyle.solid : BorderStyle.solid,
                      width: 1.2,
                    ),
                  ),
                  child: Center(
                    child: Icon(
                      icon,
                      color: isDashed ? AppTheme.textMuted : AppTheme.textPrimary,
                      size: 24,
                    ),
                  ),
                ),

                // Top Pill Tag (BETA / NEW)
                if (badgeText != null)
                  Positioned(
                    top: -6,
                    right: -6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                      decoration: BoxDecoration(
                        color: badgeColor ?? AppTheme.accentGreen,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        badgeText!,
                        style: const TextStyle(
                          color: Colors.black,
                          fontSize: 8.5,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ),

                // Red Notification Badge Count
                if (countBadge != null)
                  Positioned(
                    top: -4,
                    right: -4,
                    child: Container(
                      padding: const EdgeInsets.all(3.5),
                      decoration: BoxDecoration(
                        color: badgeColor ?? AppTheme.accentRed,
                        shape: BoxShape.circle,
                      ),
                      constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                      child: Center(
                        child: Text(
                          countBadge!,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 9.5,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              label,
              style: const TextStyle(
                color: AppTheme.textSecondary,
                fontSize: 11,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
