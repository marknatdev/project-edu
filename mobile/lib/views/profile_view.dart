import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/learner_state.dart';
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
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryCyan,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.verified_rounded,
                      color: AppTheme.isDark ? Colors.black : Colors.white,
                      size: 14,
                    ),
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
                      const SizedBox(width: 10),
                      _buildStatBadge('${learner.evaluatedIdeasCount}', 'ตรวจแล้ว'),
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
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => _showResearcherBadgeDialog(context, learner),
                icon: Icon(Icons.badge_outlined, size: 16, color: AppTheme.primaryCyan),
                label: Text('บัตรนักวิจัย', style: TextStyle(color: AppTheme.textPrimary, fontSize: 13)),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: AppTheme.borderStroke),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusPill)),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => _showSharePortfolioDialog(context, learner),
                icon: Icon(Icons.share_outlined, size: 16, color: AppTheme.secondaryViolet),
                label: Text('แชร์โครงงาน', style: TextStyle(color: AppTheme.textPrimary, fontSize: 13)),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: AppTheme.borderStroke),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusPill)),
                ),
              ),
            ),
            const SizedBox(width: 8),
            IconButton(
              onPressed: () => _showResetDataConfirmDialog(context, learner),
              tooltip: 'ล้างข้อมูล Mock Data ออกจากบัญชีทั้งหมด',
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
                  Text(
                    'โครงงานของฉัน (Active Projects)',
                    style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 15),
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
                  progress: learner.labObservations.isNotEmpty ? 0.70 : 0.30,
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
                    progress: 0.35,
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

        // 3. Advisor Sign-off Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: AppTheme.cardDecoration(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
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
                        children: [
                          Text('รอตรวจเค้าโครง 1 โครงงาน', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w600, fontSize: 13.5)),
                          Text('สร้างลิงก์สำหรับส่งให้อาจารย์ที่ปรึกษาตรวจผ่านเว็บ', style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                        ],
                      ),
                    ),
                    ElevatedButton(
                      onPressed: () => _showAdvisorSignOffDialog(context, learner),
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

void _showResearcherBadgeDialog(BuildContext context, LearnerState learner) {
  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: AppTheme.surface1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      contentPadding: const EdgeInsets.all(20),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppTheme.primaryCyan.withValues(alpha: 0.15),
                  AppTheme.secondaryViolet.withValues(alpha: 0.15),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.primaryCyan.withValues(alpha: 0.3)),
            ),
            child: Column(
              children: [
                CircleAvatar(
                  radius: 34,
                  backgroundColor: AppTheme.surface3,
                  child: const Icon(Icons.person, color: Colors.white, size: 36),
                ),
                const SizedBox(height: 10),
                Text(
                  learner.displayName,
                  style: TextStyle(color: AppTheme.textPrimary, fontSize: 17, fontWeight: FontWeight.bold),
                ),
                Text(
                  learner.schoolTier,
                  style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.surface1,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: AppTheme.borderStroke),
                  ),
                  child: Text(
                    'ID: EDU-YSC-2027-TH',
                    style: TextStyle(
                      color: AppTheme.primaryCyan,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.1,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.shield_rounded, size: 14, color: AppTheme.accentGreen),
                    const SizedBox(width: 4),
                    Text(
                      'SRC Safety Qualified • Zero-PII Protected',
                      style: TextStyle(color: AppTheme.accentGreen, fontSize: 10.5, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryCyan,
              minimumSize: const Size.fromHeight(42),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: Text(
              'ปิด',
              style: TextStyle(
                color: AppTheme.isDark ? Colors.black : Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

void _showSharePortfolioDialog(BuildContext context, LearnerState learner) {
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
                Icon(Icons.share_outlined, color: AppTheme.secondaryViolet, size: 24),
                const SizedBox(width: 8),
                Text(
                  'แชร์พอร์ตโฟลิโอโครงงานวิจัย',
                  style: TextStyle(color: AppTheme.textPrimary, fontSize: 17, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Text(
              'สร้างลิงก์สำหรับนำเสนอผลงานบนเว็บ (รองรับทั้งมือถือและแท็บเล็ต)',
              style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: AppTheme.surface2,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppTheme.borderStroke),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'https://project-edu.vercel.app/share/ysc-th-2027',
                      style: TextStyle(color: AppTheme.primaryCyan, fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ),
                  InkWell(
                    onTap: () {
                      Navigator.pop(ctx);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('คัดลอกลิงก์แชร์พอร์ตโครงงานวิจัยแล้ว!')),
                      );
                    },
                    child: Icon(Icons.copy_rounded, size: 18, color: AppTheme.textSecondary),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('กำลังส่งออกรูปภาพ QR Code สำหรับติดโปสเตอร์...')),
                );
              },
              icon: const Icon(Icons.qr_code_2_rounded, size: 18),
              label: const Text('สร้าง QR Code ติดโปสเตอร์นำเสนอ'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.secondaryViolet,
                minimumSize: const Size.fromHeight(44),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ],
        ),
      );
    },
  );
}

void _showAdvisorSignOffDialog(BuildContext context, LearnerState learner) {
  final emailController = TextEditingController();
  final nameController = TextEditingController();

  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppTheme.surface1,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (ctx) => Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.supervisor_account_rounded, color: AppTheme.secondaryViolet, size: 24),
              const SizedBox(width: 8),
              Text(
                'ส่งให้อาจารย์ที่ปรึกษาตรวจรับรอง',
                style: TextStyle(color: AppTheme.textPrimary, fontSize: 17, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            'อาจารย์สามารถเปิดอ่านเค้าโครง ประเมินคะแนน และลงนามรับรองความปลอดภัย SRC ผ่านเว็บได้โดยตรง',
            style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: nameController,
            style: TextStyle(color: AppTheme.textPrimary, fontSize: 13.5),
            decoration: InputDecoration(
              labelText: 'ชื่อ-นามสกุลอาจารย์ที่ปรึกษา',
              labelStyle: TextStyle(color: AppTheme.textMuted, fontSize: 12),
              filled: true,
              fillColor: AppTheme.surface2,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: AppTheme.borderStroke)),
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: emailController,
            style: TextStyle(color: AppTheme.textPrimary, fontSize: 13.5),
            decoration: InputDecoration(
              labelText: 'อีเมลโรงเรียนของอาจารย์',
              labelStyle: TextStyle(color: AppTheme.textMuted, fontSize: 12),
              filled: true,
              fillColor: AppTheme.surface2,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: AppTheme.borderStroke)),
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('ส่งคำขอตรวจและรหัส PIN ให้อาจารย์ที่ปรึกษาเรียบร้อย!')),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryCyan,
              minimumSize: const Size.fromHeight(46),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: Text(
              'ส่งคำขอตรวจเค้าโครงงาน',
              style: TextStyle(
                color: AppTheme.isDark ? Colors.black : Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
          ),
        ],
      ),
    ),
  );
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
        'ต้องการล้างข้อมูล Mock Data, บันทึกการทดลองแล็บ, รายการอุปกรณ์ BOM, และประวัติการสนทนาทั้งหมดในบัญชีนี้ใช่หรือไม่?\n\n(การดำเนินการนี้จะรีเซ็ตข้อมูลในเครื่องให้สะอาด 100%)',
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
                  content: Text('ล้างข้อมูลในบัญชีเรียบร้อยแล้ว บัญชีสะอาด 100% ✨'),
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
