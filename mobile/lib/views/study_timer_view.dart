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
        // Lab Session Context Card
        Container(
          padding: const EdgeInsets.all(16.0),
          decoration: AppTheme.cardDecoration(border: AppTheme.primaryCyan.withValues(alpha: 0.3)),
          child: Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: AppTheme.primaryCyan.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                  border: Border.all(color: AppTheme.primaryCyan, width: 1.5),
                ),
                child: const Center(
                  child: Icon(Icons.science_rounded, color: AppTheme.primaryCyan, size: 26),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: const [
                        Text(
                          'Lab Session • การทดลอง',
                          style: TextStyle(
                            color: AppTheme.primaryCyan,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                        Text(
                          'SRC Safety Pass',
                          style: TextStyle(color: AppTheme.accentGreen, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      learner.currentLabSessionTitle,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppTheme.textPrimary,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
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
                color: learner.isTimerRunning ? AppTheme.primaryCyan : AppTheme.borderStroke,
                width: 3.0,
              ),
              boxShadow: [
                if (learner.isTimerRunning)
                  BoxShadow(
                    color: AppTheme.primaryCyan.withValues(alpha: 0.35),
                    blurRadius: 30,
                    spreadRadius: 4,
                  ),
              ],
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.timer_rounded, color: AppTheme.secondaryViolet, size: 28),
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
                  learner.isTimerRunning ? 'กำลังจับเวลาทดลองแล็บ...' : 'แตะเพื่อเริ่มบันทึกการทดลอง',
                  style: TextStyle(
                    color: learner.isTimerRunning ? AppTheme.primaryCyan : AppTheme.textSecondary,
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 36),

        // Play/Pause Action Button & Reset
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            ElevatedButton.icon(
              onPressed: () => learner.toggleTimer(),
              icon: Icon(
                learner.isTimerRunning ? Icons.pause_rounded : Icons.play_arrow_rounded,
                color: Colors.black,
                size: 24,
              ),
              label: Text(
                learner.isTimerRunning ? 'พักการจับเวลา' : 'เริ่มบันทึกการทดลอง',
                style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 15),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryCyan,
                padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusPill)),
                elevation: 4,
              ),
            ),
            const SizedBox(width: 12),
            OutlinedButton(
              onPressed: () => learner.resetTimer(),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppTheme.borderStroke),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusPill)),
              ),
              child: const Icon(Icons.refresh_rounded, color: AppTheme.textSecondary),
            ),
          ],
        ),

        const SizedBox(height: 32),

        // Lab Observation Log Entries
        Container(
          padding: const EdgeInsets.all(16.0),
          decoration: AppTheme.cardDecoration(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Text(
                'บันทึกผลสังเกตการณ์ล่าสุด (Lab Observation)',
                style: TextStyle(
                  color: AppTheme.textPrimary,
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                ),
              ),
              SizedBox(height: 12),
              _ObservationRow(
                time: '14:30',
                note: 'เริ่มรอบการวัดครั้งที่ 1: อุณหภูมิควบคุม 25.4°C ค่าความต่างศักย์เซนเซอร์คงที่ 3.28V',
                tag: 'Trial 1',
              ),
              SizedBox(height: 8),
              _ObservationRow(
                time: '14:45',
                note: 'พ่นละอองควันทดสอบ: กราฟ PM2.5 ตอบสนองเพิ่มขึ้น 142 ug/m3 ในเวลา 3.2 วินาที',
                tag: 'Peak Event',
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ObservationRow extends StatelessWidget {
  final String time;
  final String note;
  final String tag;

  const _ObservationRow({
    required this.time,
    required this.note,
    required this.tag,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppTheme.surface2,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.borderStroke),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: AppTheme.secondaryViolet.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(time, style: const TextStyle(color: AppTheme.secondaryViolet, fontSize: 11, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              note,
              style: const TextStyle(color: AppTheme.textPrimary, fontSize: 12.5),
            ),
          ),
        ],
      ),
    );
  }
}
