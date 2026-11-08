import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/learner_state.dart';
import '../theme/app_theme.dart';

class ProfileView extends StatelessWidget {
  final VoidCallback onGoPractice;

  const ProfileView({super.key, required this.onGoPractice});

  @override
  Widget build(BuildContext context) {
    final learner = context.watch<LearnerState>();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16.0, 16.0, 16.0, 100.0),
      children: [
        // 1. User Profile Header
        Row(
          children: [
            Stack(
              children: [
                CircleAvatar(
                  radius: 36,
                  backgroundColor: AppTheme.surface3,
                  child: const Icon(Icons.person, color: Colors.white70, size: 40),
                ),
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: AppTheme.primaryOrange,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.camera_alt_rounded, color: Colors.white, size: 14),
                  ),
                ),
              ],
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: const [
                      Text('1', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                      SizedBox(width: 4),
                      Text('ผู้ติดตาม', style: TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
                      SizedBox(width: 14),
                      Text('0', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                      SizedBox(width: 4),
                      Text('กำลังติดตาม', style: TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    learner.displayName,
                    style: const TextStyle(
                      color: AppTheme.textPrimary,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  Text(
                    '${learner.handle} • เข้าร่วมเมื่อ พ.ย. 2569',
                    style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                  ),
                ],
              ),
            ),
          ],
        ),

        const SizedBox(height: 14),

        // Action Buttons: Edit Profile, Share Profile
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () {},
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppTheme.borderStroke),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusPill)),
                ),
                child: const Text('แก้ไขโปรไฟล์', style: TextStyle(color: AppTheme.textPrimary, fontSize: 13)),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: OutlinedButton(
                onPressed: () {},
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppTheme.borderStroke),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusPill)),
                ),
                child: const Text('แชร์โปรไฟล์', style: TextStyle(color: AppTheme.textPrimary, fontSize: 13)),
              ),
            ),
          ],
        ),

        const SizedBox(height: 18),

        // Mascot Bar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: AppTheme.cardDecoration(),
          child: Row(
            children: [
              const Text('🐥', style: TextStyle(fontSize: 24)),
              const SizedBox(width: 10),
              Text(
                'Allie • Level ${learner.companionLevel}',
                style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 14),
              ),
              const Spacer(),
              const Icon(Icons.chevron_right_rounded, color: AppTheme.textMuted),
            ],
          ),
        ),

        const SizedBox(height: 18),

        // 2. Study Statistics Locked Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: AppTheme.cardDecoration(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'สถิติการเรียน',
                style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 15),
              ),
              const SizedBox(height: 16),
              Center(
                child: Column(
                  children: [
                    const Icon(Icons.lock_outline_rounded, color: AppTheme.textMuted, size: 28),
                    const SizedBox(height: 8),
                    const Text(
                      'เรียนอีก 10 ชม. เพื่อปลดล็อกสถิติการเรียนและกราฟ 7 วัน',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                    ),
                    const SizedBox(height: 6),
                    const Text('0 / 10 ชม.', style: TextStyle(color: AppTheme.primaryOrange, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    ElevatedButton.icon(
                      onPressed: () => learner.setTab(2),
                      icon: const Icon(Icons.alarm_rounded, color: Colors.white, size: 18),
                      label: const Text('จับเวลาเรียน', style: TextStyle(color: Colors.white)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryOrange,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusPill)),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // 3. Practice Statistics Locked Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: AppTheme.cardDecoration(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'สถิติการฝึก (TGAT1)',
                style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 15),
              ),
              const SizedBox(height: 16),
              Center(
                child: Column(
                  children: [
                    const Icon(Icons.lock_outline_rounded, color: AppTheme.textMuted, size: 28),
                    const SizedBox(height: 8),
                    const Text(
                      'ทำโจทย์ TGAT1 อีก 100 ข้อ เพื่อปลดล็อกสถิติการฝึก',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                    ),
                    const SizedBox(height: 6),
                    const Text('0 / 100 ข้อ', style: TextStyle(color: AppTheme.primaryOrange, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    ElevatedButton.icon(
                      onPressed: onGoPractice,
                      icon: const Icon(Icons.play_arrow_rounded, color: Colors.white, size: 18),
                      label: const Text('ไปฝึก TGAT1', style: TextStyle(color: Colors.white)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryOrange,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusPill)),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
