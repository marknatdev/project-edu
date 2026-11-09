import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/learner_state.dart';
import '../services/code_push_service.dart';
import '../services/supabase_service.dart';
import '../theme/app_theme.dart';
import 'topic_discovery_view.dart';

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
                  child: Icon(Icons.school_rounded, color: AppTheme.primaryCyan, size: 38),
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
                      const SizedBox(width: 10),
                      InkWell(
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const TopicDiscoveryView()),
                        ),
                        child: _buildStatBadge('${learner.shortlistedCards.length}', 'Shortlist ❤️'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    learner.displayName,
                    style: TextStyle(
                      color: AppTheme.textPrimary,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  Text(
                    '${learner.handle} • ${learner.schoolTier}',
                    style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
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
            const Spacer(),
            IconButton(
              onPressed: () => _showResetDataConfirmDialog(context, learner),
              tooltip: 'ล้างข้อมูลทั้งหมดในเครื่อง',
              icon: Icon(Icons.delete_sweep_outlined, size: 18, color: AppTheme.textMuted),
              style: IconButton.styleFrom(
                side: BorderSide(color: AppTheme.borderStroke),
                backgroundColor: AppTheme.surface1,
              ),
            ),
            const SizedBox(width: 6),
            IconButton(
              onPressed: () async {
                await SupabaseService.signOut();
                onSignOut?.call();
              },
              tooltip: 'ออกจากระบบ',
              icon: const Icon(Icons.logout_rounded, size: 18, color: AppTheme.accentRed),
              style: IconButton.styleFrom(
                side: BorderSide(color: AppTheme.borderStroke),
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
                child: Icon(Icons.biotech_rounded, color: AppTheme.primaryCyan, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'เป้าหมายการแข่งขัน: ${learner.projectGoal}',
                      style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 13.5),
                    ),
                    Text(
                      'สาขา${learner.selectedField} • ${learner.gradeLevel}',
                      style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded, color: AppTheme.textMuted),
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
                  Expanded(
                    child: Text(
                      'โครงงานของฉัน (Active Projects)',
                      style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                  ),
                  TextButton(
                    onPressed: onGoPractice,
                    child: Text('+ สร้างใหม่', style: TextStyle(color: AppTheme.primaryCyan, fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // Main Active Lab Project (if exists)
              if (learner.currentLabSessionTitle.isNotEmpty) ...[
                _buildProjectItem(
                  title: learner.currentLabSessionTitle,
                  field: learner.selectedField,
                  status: 'กำลังทดลองแล็บ (${learner.labObservations.length} บันทึก)',
                  statusColor: AppTheme.primaryCyan,
                ),
                const SizedBox(height: 10),
              ],

              // Shortlisted Topics
              if (learner.shortlistedCards.isNotEmpty)
                ...learner.shortlistedCards.take(3).map((card) => Padding(
                  padding: const EdgeInsets.only(bottom: 10.0),
                  child: _buildProjectItem(
                    title: card.title,
                    field: card.subject,
                    status: 'Shortlisted (สนใจทำ)',
                    statusColor: AppTheme.secondaryViolet,
                  ),
                ))
              else if (learner.currentLabSessionTitle.isEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 12),
                  alignment: Alignment.center,
                  child: Column(
                    children: [
                      Icon(Icons.biotech_outlined, size: 36, color: AppTheme.textMuted),
                      const SizedBox(height: 8),
                      Text(
                        'ยังไม่มีโครงงานที่บันทึกไว้ในบัญชีนี้\nแตะ "+ สร้างใหม่" เพื่อเลือกหัวข้อวิจัย หรือเริ่มบันทึกแล็บ',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: AppTheme.textMuted, fontSize: 12.5, height: 1.4),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),

        const SizedBox(height: 16),
        // Lets testers confirm on the device which Shorebird patch is running.
        // shortcut: version text is hardcoded, update it with pubspec.yaml on the next release.
        FutureBuilder<int?>(
          future: CodePushService.getCurrentPatchNumber(),
          builder: (context, snap) => Text(
            snap.data == null ? 'แอปเวอร์ชัน 1.0.4+5 (ยังไม่มี patch)' : 'แอปเวอร์ชัน 1.0.4+5 • Patch #${snap.data}',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
          ),
        ),
      ],
    );
  }

  static Widget _buildStatBadge(String count, String label) {
    return Row(
      children: [
        Text(count, style: TextStyle(color: AppTheme.primaryCyan, fontWeight: FontWeight.bold, fontSize: 15)),
        const SizedBox(width: 4),
        Text(label, style: TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
      ],
    );
  }

  static Widget _buildProjectItem({
    required String title,
    required String field,
    required String status,
    required Color statusColor,
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
              Text(field, style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            title,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 13.5),
          ),
        ],
      ),
    );
  }
}

void _showResetDataConfirmDialog(BuildContext context, LearnerState learner) {
  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: AppTheme.surface1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Row(
        children: const [
          Icon(Icons.warning_amber_rounded, color: AppTheme.accentRed, size: 22),
          SizedBox(width: 8),
          Text(
            'ล้างข้อมูลบัญชีทั้งหมด',
            style: TextStyle(color: AppTheme.accentRed, fontWeight: FontWeight.bold, fontSize: 16),
          ),
        ],
      ),
      content: Text(
        'ต้องการล้างบันทึกการทดลองแล็บ รายการอุปกรณ์ BOM Shortlist การตั้งค่าโครงงาน และประวัติการสนทนาทั้งหมดในเครื่องนี้ใช่หรือไม่? กู้คืนไม่ได้',
        style: TextStyle(color: AppTheme.textPrimary, fontSize: 13, height: 1.4),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx),
          child: Text('ยกเลิก', style: TextStyle(color: AppTheme.textMuted)),
        ),
        ElevatedButton(
          onPressed: () async {
            Navigator.pop(ctx);
            await learner.clearAllAccountData();
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('ล้างข้อมูลในเครื่องเรียบร้อยแล้ว'),
                  duration: Duration(seconds: 2),
                ),
              );
            }
          },
          style: ElevatedButton.styleFrom(backgroundColor: AppTheme.accentRed),
          child: const Text('ยืนยันล้างข้อมูล', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        ),
      ],
    ),
  );
}
