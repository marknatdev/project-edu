import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/learner_state.dart';
import '../services/supabase_service.dart';
import '../theme/app_theme.dart';
import '../views/ai_coach_dialog.dart';
import '../views/dashboard_view.dart';
import '../views/judge_defense_view.dart';
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
                      learner.setTab(3);
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
                    title: 'ไอเดียของฉัน',
                    onTap: () {
                      learner.setTab(3);
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
                      showEvaluationRubric(context);
                    },
                  ),
                  _DrawerItem(
                    icon: Icons.shield_outlined,
                    title: 'คู่มือความปลอดภัยแล็บ SRC/ISEF',
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
                      showCompetitionCalendar(context);
                    },
                  ),
                  _DrawerItem(
                    icon: Icons.record_voice_over_outlined,
                    title: 'ซ้อมตอบคำถามกรรมการ (Mock Judge)',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const JudgeDefenseView()));
                    },
                  ),
                  _DrawerItem(
                    icon: Icons.description_outlined,
                    title: 'ส่งออกเค้าโครงงาน (Markdown)',
                    onTap: () {
                      Navigator.pop(context);
                      showExportSheet(context);
                    },
                  ),
                  _DrawerItem(
                    icon: Icons.manage_accounts_outlined,
                    title: 'ข้อมูลนักวิจัยเยาวชน',
                    onTap: () {
                      learner.setTab(3);
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

                ],
              ),
            ),

            // Logout Footer
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: InkWell(
                onTap: () async {
                  Navigator.pop(context);
                  await SupabaseService.signOut();
                },
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
  final VoidCallback onTap;

  const _DrawerItem({
    required this.icon,
    required this.title,
    this.badgeText,
    this.badgeColor,
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
    isScrollControlled: true,
    backgroundColor: AppTheme.surface1,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (ctx) {
      return Consumer<LearnerState>(
        builder: (context, learner, _) {
          return Padding(
            padding: EdgeInsets.only(
              left: 20.0,
              right: 20.0,
              top: 20.0,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 20.0,
            ),
            child: SingleChildScrollView(
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
                        Text(
                          '${learner.totalBomCost} / ${learner.budgetConstraint}',
                          style: TextStyle(color: AppTheme.accentGreen, fontWeight: FontWeight.bold, fontSize: 15),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  if (learner.bomItems.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 20),
                      child: Center(
                        child: Text('ยังไม่มีรายการอุปกรณ์ แตะปุ่มด้านล่างเพื่อเพิ่ม', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                      ),
                    )
                  else
                    ...learner.bomItems.map((item) {
                      Color statusColor;
                      switch (item.status) {
                        case 'จัดซื้อแล้ว':
                          statusColor = AppTheme.accentGreen;
                          break;
                        case 'ยืมแล็บโรงเรียน':
                          statusColor = AppTheme.primaryCyan;
                          break;
                        case 'มีแล้วในสต็อก':
                          statusColor = AppTheme.secondaryViolet;
                          break;
                        default:
                          statusColor = AppTheme.accentAmber;
                      }
                      return _BomTile(
                        title: item.title,
                        cost: '${item.costBaht} ฿',
                        status: item.status,
                        statusColor: statusColor,
                        onDelete: () => learner.deleteBomItem(item.id),
                      );
                    }),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () => _showAddBomItemDialog(context, learner),
                      icon: Icon(Icons.add_rounded, size: 18, color: AppTheme.isDark ? Colors.black : Colors.white),
                      label: Text(
                        'เพิ่มรายการอุปกรณ์ / ค่าใช้จ่าย',
                        style: TextStyle(
                          color: AppTheme.isDark ? Colors.black : Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 13.5,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryCyan,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      );
    },
  );
}

void _showAddBomItemDialog(BuildContext context, LearnerState learner) {
  final titleController = TextEditingController();
  final costController = TextEditingController();
  String selectedStatus = 'จัดซื้อแล้ว';
  final statuses = ['จัดซื้อแล้ว', 'ยืมแล็บโรงเรียน', 'มีแล้วในสต็อก', 'รอจัดซื้อ'];

  showDialog(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setDialogState) => AlertDialog(
        backgroundColor: AppTheme.surface1,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('เพิ่มรายการอุปกรณ์ / วัสดุ', style: TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextField(
              controller: titleController,
              autofocus: true,
              style: TextStyle(color: AppTheme.textPrimary, fontSize: 13.5),
              decoration: InputDecoration(
                hintText: 'ชื่ออุปกรณ์ เช่น เซนเซอร์ CO2, หลอดแก้ว...',
                hintStyle: TextStyle(color: AppTheme.textMuted, fontSize: 12.5),
                filled: true,
                fillColor: AppTheme.surface2,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: AppTheme.borderStroke)),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: costController,
              keyboardType: TextInputType.number,
              style: TextStyle(color: AppTheme.textPrimary, fontSize: 13.5),
              decoration: InputDecoration(
                hintText: 'ราคาโดยประมาณ (บาท เช่น 150)',
                hintStyle: TextStyle(color: AppTheme.textMuted, fontSize: 12.5),
                filled: true,
                fillColor: AppTheme.surface2,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: AppTheme.borderStroke)),
              ),
            ),
            const SizedBox(height: 12),
            Text('สถานะการจัดหา:', style: TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              children: statuses.map((st) {
                final isSel = st == selectedStatus;
                return ChoiceChip(
                  label: Text(st, style: TextStyle(fontSize: 11, color: isSel ? Colors.white : AppTheme.textPrimary)),
                  selected: isSel,
                  selectedColor: AppTheme.secondaryViolet,
                  backgroundColor: AppTheme.surface2,
                  onSelected: (val) {
                    if (val) setDialogState(() => selectedStatus = st);
                  },
                );
              }).toList(),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('ยกเลิก', style: TextStyle(color: AppTheme.textMuted)),
          ),
          ElevatedButton(
            onPressed: () {
              final title = titleController.text.trim();
              final cost = int.tryParse(costController.text.trim()) ?? 0;
              if (title.isNotEmpty) {
                learner.addBomItem(title: title, costBaht: cost, status: selectedStatus);
              }
              Navigator.pop(ctx);
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryCyan),
            child: Text('บันทึก', style: TextStyle(color: AppTheme.isDark ? Colors.black : Colors.white, fontWeight: FontWeight.bold)),
          ),
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
  final VoidCallback? onDelete;

  const _BomTile({
    required this.title,
    required this.cost,
    required this.status,
    required this.statusColor,
    this.onDelete,
  });

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
          if (onDelete != null) ...[
            const SizedBox(width: 6),
            InkWell(
              onTap: onDelete,
              child: Icon(Icons.close_rounded, size: 14, color: AppTheme.textMuted),
            ),
          ],
        ],
      ),
    );
  }
}
