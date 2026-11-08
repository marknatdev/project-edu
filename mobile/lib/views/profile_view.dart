import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/learner_state.dart';
import '../services/supabase_service.dart';
import '../theme/app_theme.dart';

class ProfileView extends StatelessWidget {
  final VoidCallback onGoPractice;
  final VoidCallback? onSignOut;

  const ProfileView({
    super.key,
    required this.onGoPractice,
    this.onSignOut,
  });

  @override
  Widget build(BuildContext context) {
    final learner = context.watch<LearnerState>();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16.0, 16.0, 16.0, 100.0),
      children: [
        // 1. Researcher Profile Header
        Row(
          children: [
            Stack(
              children: [
                CircleAvatar(
                  radius: 36,
                  backgroundColor: AppTheme.surface3,
                  child: const Icon(Icons.school_rounded, color: AppTheme.primaryCyan, size: 38),
                ),
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: AppTheme.primaryCyan,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.verified_rounded, color: Colors.black, size: 14),
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
                    children: [
                      _buildStatBadge('${learner.activeProjectsCount}', 'โครงงานวิจัย'),
                      const SizedBox(width: 12),
                      _buildStatBadge('${learner.evaluatedIdeasCount}', 'ไอเดียตรวจแล้ว'),
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
                    '${learner.handle} • ${learner.schoolTier}',
                    style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                  ),
                ],
              ),
            ),
          ],
        ),

        const SizedBox(height: 14),

        // Action Buttons: Edit Profile, Share Profile, Sign Out
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.badge_outlined, size: 16, color: AppTheme.primaryCyan),
                label: const Text('บัตรนักวิจัย', style: TextStyle(color: AppTheme.textPrimary, fontSize: 13)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppTheme.borderStroke),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusPill)),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.share_outlined, size: 16, color: AppTheme.secondaryViolet),
                label: const Text('แชร์โครงงาน', style: TextStyle(color: AppTheme.textPrimary, fontSize: 13)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppTheme.borderStroke),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusPill)),
                ),
              ),
            ),
            const SizedBox(width: 8),
            IconButton(
              onPressed: () async {
                await SupabaseService.signOut();
                onSignOut?.call();
              },
              tooltip: 'ออกจากระบบ',
              icon: const Icon(Icons.logout_rounded, size: 18, color: AppTheme.accentRed),
              style: IconButton.styleFrom(
                side: const BorderSide(color: AppTheme.borderStroke),
                backgroundColor: AppTheme.surface1,
              ),
            ),
          ],
        ),

        const SizedBox(height: 18),

        // Research Track Status Capsule
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: AppTheme.cardDecoration(border: AppTheme.primaryCyan.withValues(alpha: 0.3)),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.primaryCyan.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.biotech_rounded, color: AppTheme.primaryCyan, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text(
                      'เป้าหมายการแข่งขัน: YSC 2027',
                      style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 13.5),
                    ),
                    Text(
                      'สาขาวิทยาการคอมพิวเตอร์และปัญญาประดิษฐ์ • รอบแรก',
                      style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded, color: AppTheme.textMuted),
            ],
          ),
        ),

        const SizedBox(height: 18),

        // 2. Active Research Projects List
        Container(
          padding: const EdgeInsets.all(16),
          decoration: AppTheme.cardDecoration(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'โครงงานของฉัน (Active Projects)',
                    style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  TextButton(
                    onPressed: onGoPractice,
                    child: const Text('+ สร้างใหม่', style: TextStyle(color: AppTheme.primaryCyan, fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // Project 1
              _buildProjectItem(
                title: 'การคัดแยกสารตกค้างไมโครพลาสติกด้วย AI & Microscopic Vision',
                field: 'คอมพิวเตอร์ & AI',
                status: 'ร่างเค้าโครง (Proposal)',
                statusColor: AppTheme.primaryCyan,
                progress: 0.65,
              ),
              const SizedBox(height: 10),

              // Project 2
              _buildProjectItem(
                title: 'แผ่นกรองฝุ่นไฟฟ้าสถิตจากวัสดุชีวภาพเหลือใช้',
                field: 'วัสดุศาสตร์ & สิ่งแวดล้อม',
                status: 'ผ่านตรวจความปลอดภัย SRC',
                statusColor: AppTheme.accentGreen,
                progress: 0.40,
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // 3. Advisor Sign-off Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: AppTheme.cardDecoration(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: const [
                  Icon(Icons.assignment_ind_outlined, color: AppTheme.secondaryViolet, size: 20),
                  SizedBox(width: 8),
                  Text(
                    'การรับรองโดยอาจารย์ที่ปรึกษา',
                    style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.surface2,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.pending_actions_rounded, color: AppTheme.accentAmber, size: 24),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text('รอตรวจเค้าโครง 1 โครงงาน', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w600, fontSize: 13.5)),
                          Text('สร้างลิงก์สำหรับส่งให้อาจารย์ที่ปรึกษาตรวจผ่านเว็บ', style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                        ],
                      ),
                    ),
                    ElevatedButton(
                      onPressed: () {},
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.secondaryViolet,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusPill)),
                      ),
                      child: const Text('ส่งตรวจ', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
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

  static Widget _buildStatBadge(String count, String label) {
    return Row(
      children: [
        Text(count, style: const TextStyle(color: AppTheme.primaryCyan, fontWeight: FontWeight.bold, fontSize: 15)),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
      ],
    );
  }

  static Widget _buildProjectItem({
    required String title,
    required String field,
    required String status,
    required Color statusColor,
    required double progress,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.surface2,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.borderStroke),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(status, style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.bold)),
              ),
              Text(field, style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            title,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 13.5),
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(3),
            child: LinearProgressIndicator(
              value: progress,
              backgroundColor: AppTheme.surface3,
              valueColor: AlwaysStoppedAnimation<Color>(statusColor),
              minHeight: 4,
            ),
          ),
        ],
      ),
    );
  }
}
