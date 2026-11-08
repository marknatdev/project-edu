import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/learner_state.dart';
import '../theme/app_theme.dart';
import 'ai_coach_dialog.dart';

class SessionsView extends StatefulWidget {
  const SessionsView({super.key});

  @override
  State<SessionsView> createState() => _SessionsViewState();
}

class _SessionsViewState extends State<SessionsView> {
  String _selectedCategory = 'ทั้งหมด';

  @override
  Widget build(BuildContext context) {
    final learner = context.watch<LearnerState>();

    final filteredSessions = _selectedCategory == 'ทั้งหมด'
        ? learner.sessions
        : learner.sessions.where((s) => s.category == _selectedCategory).toList();

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16.0, 16.0, 16.0, 100.0),
          children: [
            // Top Bar
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'ห้องสนทนากับ AI Coach',
                      style: TextStyle(
                        color: AppTheme.textPrimary,
                        fontWeight: FontWeight.bold,
                        fontSize: 20,
                      ),
                    ),
                    Text(
                      '${learner.sessions.length} บทสนทนาที่บันทึกไว้ • ซิงค์ Supabase',
                      style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12.5),
                    ),
                  ],
                ),
                ElevatedButton.icon(
                  onPressed: () {
                    final newSess = learner.createNewSession(
                      title: '🔬 ปรึกษาโครงงาน ${learner.selectedField}',
                      category: 'Socratic Research',
                    );
                    AiCoachModal.show(context, initialSession: newSess);
                  },
                  icon: const Icon(Icons.add_rounded, size: 18, color: Colors.black),
                  label: const Text(
                    'เริ่มคุยใหม่',
                    style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 12.5),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryCyan,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusPill)),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Category Filter Pills
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: ['ทั้งหมด', 'Socratic Research', 'SRC Safety', 'Pivot Workshop'].map((cat) {
                  final isSelected = _selectedCategory == cat;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: ChoiceChip(
                      label: Text(cat),
                      selected: isSelected,
                      onSelected: (_) => setState(() => _selectedCategory = cat),
                      selectedColor: AppTheme.primaryCyan.withValues(alpha: 0.2),
                      backgroundColor: AppTheme.surface1,
                      labelStyle: TextStyle(
                        color: isSelected ? AppTheme.primaryCyan : AppTheme.textSecondary,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        fontSize: 12,
                      ),
                      side: BorderSide(
                        color: isSelected ? AppTheme.primaryCyan : AppTheme.borderStroke,
                      ),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusPill)),
                    ),
                  );
                }).toList(),
              ),
            ),

            const SizedBox(height: 16),

            // Sessions List
            if (filteredSessions.isEmpty)
              Container(
                padding: const EdgeInsets.all(32),
                decoration: AppTheme.cardDecoration(),
                child: Center(
                  child: Column(
                    children: [
                      const Icon(Icons.chat_bubble_outline_rounded, size: 40, color: AppTheme.textMuted),
                      const SizedBox(height: 12),
                      Text(
                        'ไม่มีบทสนทนาในหมวด $_selectedCategory',
                        style: const TextStyle(color: AppTheme.textSecondary, fontSize: 14),
                      ),
                    ],
                  ),
                ),
              )
            else
              ...filteredSessions.map((session) {
                final isSrc = session.category == 'SRC Safety';
                final badgeColor = isSrc ? AppTheme.accentGreen : AppTheme.secondaryViolet;

                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: AppTheme.cardDecoration(
                    border: isSrc ? AppTheme.accentGreen.withValues(alpha: 0.3) : AppTheme.borderStroke,
                  ),
                  child: InkWell(
                    onTap: () {
                      learner.selectSession(session.id);
                      AiCoachModal.show(context, initialSession: session);
                    },
                    borderRadius: BorderRadius.circular(16),
                    child: Padding(
                      padding: const EdgeInsets.all(14.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: badgeColor.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      isSrc ? Icons.shield_rounded : Icons.psychology_rounded,
                                      size: 13,
                                      color: badgeColor,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      session.category,
                                      style: TextStyle(color: badgeColor, fontSize: 11, fontWeight: FontWeight.bold),
                                    ),
                                  ],
                                ),
                              ),
                              Text(
                                _formatTimestamp(session.updatedAt),
                                style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Text(
                            session.title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppTheme.textPrimary,
                              fontWeight: FontWeight.bold,
                              fontSize: 14.5,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            session.lastMessagePreview,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppTheme.textSecondary,
                              fontSize: 12.5,
                              height: 1.3,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }

  String _formatTimestamp(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 60) {
      return '${diff.inMinutes} นาทีที่แล้ว';
    } else if (diff.inHours < 24) {
      return '${diff.inHours} ชม. ที่แล้ว';
    } else {
      return '${dt.day}/${dt.month}/${dt.year}';
    }
  }
}
