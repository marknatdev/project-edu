import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class CountdownBanner extends StatelessWidget {
  final String title;
  final String examDate;
  final DateTime deadline;
  final DateTime? now; // test seam

  const CountdownBanner({
    super.key,
    required this.title,
    required this.examDate,
    required this.deadline,
    this.now,
  });

  @override
  Widget build(BuildContext context) {
    // shortcut: recomputed on rebuild only (minute precision), not ticking live.
    final left = deadline.difference(now ?? DateTime.now());
    final closed = left.isNegative;
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 18.0, vertical: 16.0),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [AppTheme.primaryOrange, AppTheme.orangeLight],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(AppTheme.radiusCard),
            boxShadow: [
              BoxShadow(
                color: AppTheme.orangeGlow,
                blurRadius: 16,
                offset: Offset(0, 6),
              ),
            ],
          ),
          child: Row(
            children: [
              // Hourglass Icon + Title & Date
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Center(
                  child: Icon(Icons.hourglass_bottom_rounded, color: Colors.white, size: 24),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                        fontSize: 17,
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      examDate,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.85),
                        fontWeight: FontWeight.w500,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),

              // Countdown Digits
              if (closed)
                const _CountdownBox(val: 'ปิดรับ', label: 'แล้ว')
              else
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _CountdownBox(val: left.inDays.toString().padLeft(2, '0'), label: 'วัน'),
                    const SizedBox(width: 6),
                    _CountdownBox(val: (left.inHours % 24).toString().padLeft(2, '0'), label: 'ชั่วโมง'),
                    const SizedBox(width: 6),
                    _CountdownBox(val: (left.inMinutes % 60).toString().padLeft(2, '0'), label: 'นาที'),
                  ],
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _CountdownBox extends StatelessWidget {
  final String val;
  final String label;

  const _CountdownBox({required this.val, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 5),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.white.withValues(alpha: 0.3), width: 1),
      ),
      child: Column(
        children: [
          Text(
            val,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w900,
              fontSize: 15,
              fontFamily: 'monospace',
            ),
          ),
          Text(
            label,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.85),
              fontSize: 9.5,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
