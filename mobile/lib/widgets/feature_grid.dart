import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class FeatureGrid extends StatelessWidget {
  final VoidCallback onPracticeTap;
  final VoidCallback onVocabTap;
  final VoidCallback onExamTap;
  final VoidCallback onNotesTap;

  const FeatureGrid({
    super.key,
    required this.onPracticeTap,
    required this.onVocabTap,
    required this.onExamTap,
    required this.onNotesTap,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _FeatureCard(
                title: 'TCAS Practice',
                subtitle: 'TGAT TPAT A-Level',
                icon: Icons.assignment_turned_in_rounded,
                iconColor: AppTheme.accentBlue,
                iconBg: const Color(0xFF0D3354),
                onTap: onPracticeTap,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _FeatureCard(
                title: 'All Vocab',
                subtitle: 'คลังคำศัพท์อังกฤษ',
                badgeText: 'DEK70',
                badgeColor: AppTheme.accentPurple,
                icon: Icons.menu_book_rounded,
                iconColor: AppTheme.primaryOrange,
                iconBg: const Color(0xFF4A2A0C),
                onTap: onVocabTap,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _FeatureCard(
                title: 'All Exam',
                subtitle: 'Mock Exam แนวข้อสอบ',
                badgeText: 'ใหม่',
                badgeColor: AppTheme.accentGreen,
                icon: Icons.fact_check_rounded,
                iconColor: AppTheme.accentGreen,
                iconBg: const Color(0xFF0F3D24),
                onTap: onExamTap,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _FeatureCard(
                title: 'All Notes',
                subtitle: 'จดโน้ตด้วยปากกา',
                badgeText: 'BETA',
                badgeColor: AppTheme.accentBlue,
                icon: Icons.edit_note_rounded,
                iconColor: AppTheme.accentPurple,
                iconBg: const Color(0xFF331D56),
                onTap: onNotesTap,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _FeatureCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final String? badgeText;
  final Color? badgeColor;
  final IconData icon;
  final Color iconColor;
  final Color iconBg;
  final VoidCallback onTap;

  const _FeatureCard({
    required this.title,
    required this.subtitle,
    this.badgeText,
    this.badgeColor,
    required this.icon,
    required this.iconColor,
    required this.iconBg,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppTheme.radiusCard),
        child: Container(
          padding: const EdgeInsets.all(14.0),
          decoration: AppTheme.cardDecoration(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Row: Icon + Badge
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: iconBg,
                      borderRadius: BorderRadius.circular(AppTheme.radiusIcon),
                      border: Border.all(color: iconColor.withValues(alpha: 0.3), width: 1),
                    ),
                    child: Center(
                      child: Icon(icon, color: iconColor, size: 24),
                    ),
                  ),
                  if (badgeText != null)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                      decoration: BoxDecoration(
                        color: badgeColor ?? AppTheme.accentGreen,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        badgeText!,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9.5,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 14),

              // Title
              Text(
                title,
                style: const TextStyle(
                  color: AppTheme.textPrimary,
                  fontWeight: FontWeight.w800,
                  fontSize: 15,
                ),
              ),
              const SizedBox(height: 2),

              // Subtitle
              Text(
                subtitle,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: AppTheme.textSecondary,
                  fontSize: 12,
                  fontWeight: FontWeight.w400,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
