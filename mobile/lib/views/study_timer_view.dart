import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/learner_state.dart';
import '../theme/app_theme.dart';

class StudyTimerView extends StatelessWidget {
  const StudyTimerView({super.key});

  @override
  Widget build(BuildContext context) {
    final learner = context.watch<LearnerState>();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16.0, 24.0, 16.0, 100.0),
      children: [
        // Mascot Card
        Container(
          padding: const EdgeInsets.all(16.0),
          decoration: AppTheme.cardDecoration(),
          child: Row(
            children: [
              Container(
                width: 58,
                height: 58,
                decoration: BoxDecoration(
                  color: AppTheme.surface2,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppTheme.primaryOrange, width: 2),
                ),
                child: const Center(
                  child: Text('🐥', style: TextStyle(fontSize: 32)),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Allie • Level ${learner.companionLevel}',
                          style: const TextStyle(
                            color: AppTheme.textPrimary,
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                        Text(
                          '${learner.companionExp} / ${learner.companionNextExp} EXP',
                          style: const TextStyle(color: AppTheme.primaryOrange, fontSize: 12),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: learner.companionExp / learner.companionNextExp,
                        backgroundColor: AppTheme.surface3,
                        valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primaryOrange),
                        minHeight: 6,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 36),

        // Big Digital Stopwatch Circle
        Center(
          child: Container(
            width: 250,
            height: 250,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppTheme.surface1,
              border: Border.all(
                color: learner.isTimerRunning ? AppTheme.primaryOrange : AppTheme.borderStroke,
                width: 3.0,
              ),
              boxShadow: [
                if (learner.isTimerRunning)
                  const BoxShadow(
                    color: AppTheme.orangeGlow,
                    blurRadius: 30,
                    spreadRadius: 4,
                  ),
              ],
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.alarm_rounded, color: AppTheme.textMuted, size: 28),
                const SizedBox(height: 8),
                Text(
                  learner.formattedStudyTime,
                  style: const TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 40,
                    fontWeight: FontWeight.w900,
                    fontFamily: 'monospace',
                    letterSpacing: 2,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  learner.isTimerRunning ? 'กำลังจับเวลาเรียน...' : 'แตะเพื่อเริ่มจับเวลา',
                  style: TextStyle(
                    color: learner.isTimerRunning ? AppTheme.primaryOrange : AppTheme.textSecondary,
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 36),

        // Play/Pause Action Button
        Center(
          child: ElevatedButton.icon(
            onPressed: () => learner.toggleTimer(),
            icon: Icon(
              learner.isTimerRunning ? Icons.pause_rounded : Icons.play_arrow_rounded,
              color: Colors.white,
              size: 24,
            ),
            label: Text(
              learner.isTimerRunning ? 'พักการอ่าน' : 'เริ่มจับเวลาอ่านหนังสือ',
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryOrange,
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusPill)),
              elevation: 6,
            ),
          ),
        ),

        const SizedBox(height: 32),

        // Focus Quests
        Container(
          padding: const EdgeInsets.all(16.0),
          decoration: AppTheme.cardDecoration(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Text(
                'ภารกิจประจำวันนี้',
                style: TextStyle(
                  color: AppTheme.textPrimary,
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                ),
              ),
              SizedBox(height: 12),
              _QuestRow(title: 'เวลาเรียน: ครบ 60 นาทีวันนี้', progress: '0 / 60 นาที', exp: '+60 EXP'),
              SizedBox(height: 8),
              _QuestRow(title: 'รักษา Streak: อ่านอย่างน้อย 1 ครั้ง', progress: '0 / 1 ครั้ง', exp: '+20 EXP'),
            ],
          ),
        ),
      ],
    );
  }
}

class _QuestRow extends StatelessWidget {
  final String title;
  final String progress;
  final String exp;

  const _QuestRow({
    required this.title,
    required this.progress,
    required this.exp,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13)),
            Text(progress, style: const TextStyle(color: AppTheme.textMuted, fontSize: 11.5)),
          ],
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(
            color: AppTheme.primaryOrange.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(
            exp,
            style: const TextStyle(color: AppTheme.primaryOrange, fontWeight: FontWeight.bold, fontSize: 11.5),
          ),
        ),
      ],
    );
  }
}
