import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/learner_state.dart';
import '../theme/app_theme.dart';

class LeaderboardCard extends StatelessWidget {
  final VoidCallback? onViewAll;
  final VoidCallback? onUserRankTap;

  const LeaderboardCard({
    super.key,
    this.onViewAll,
    this.onUserRankTap,
  });

  @override
  Widget build(BuildContext context) {
    final learner = context.watch<LearnerState>();

    return Stack(
      clipBehavior: Clip.none,
      alignment: Alignment.bottomCenter,
      children: [
        // Main Card Container
        Container(
          margin: const EdgeInsets.only(bottom: 16.0),
          padding: const EdgeInsets.fromLTRB(16.0, 16.0, 16.0, 28.0),
          decoration: AppTheme.cardDecoration(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'อันดับการเรียนวันนี้ (Top 100)',
                    style: TextStyle(
                      color: AppTheme.textPrimary,
                      fontWeight: FontWeight.w700,
                      fontSize: 15.5,
                    ),
                  ),
                  InkWell(
                    onTap: onViewAll,
                    borderRadius: BorderRadius.circular(4),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                      child: Row(
                        children: const [
                          Text(
                            'ดูทั้งหมด',
                            style: TextStyle(
                              color: AppTheme.primaryOrange,
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                          SizedBox(width: 2),
                          Icon(Icons.chevron_right_rounded, color: AppTheme.primaryOrange, size: 16),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Ranks 1 to 4 Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: const [
                  _LearnerAvatar(
                    rank: 1,
                    medalColor: Color(0xFFFFD700),
                    streak: 42,
                    name: 'Tawan Pho...',
                    time: '19:01:35',
                  ),
                  _LearnerAvatar(
                    rank: 2,
                    medalColor: Color(0xFFC0C0C0),
                    streak: 24,
                    name: 'Messi',
                    time: '15:30:38',
                  ),
                  _LearnerAvatar(
                    rank: 3,
                    medalColor: Color(0xFFCD7F32),
                    streak: 14,
                    name: 'RIN',
                    time: '15:12:54',
                  ),
                  _LearnerAvatar(
                    rank: 4,
                    medalColor: AppTheme.textMuted,
                    streak: 1,
                    name: 'lemondrrrr',
                    time: '14:06:00',
                  ),
                ],
              ),
            ],
          ),
        ),

        // Floating Sticky User Rank Pill
        Positioned(
          bottom: 2,
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: onUserRankTap,
              borderRadius: BorderRadius.circular(AppTheme.radiusPill),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                decoration: BoxDecoration(
                  color: AppTheme.primaryOrange,
                  borderRadius: BorderRadius.circular(AppTheme.radiusPill),
                  boxShadow: const [
                    BoxShadow(
                      color: AppTheme.orangeGlow,
                      blurRadius: 12,
                      offset: Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.emoji_events_rounded, color: Colors.white, size: 16),
                    const SizedBox(width: 6),
                    Text(
                      'อันดับของคุณ #${learner.userRank} >',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _LearnerAvatar extends StatelessWidget {
  final int rank;
  final Color medalColor;
  final int streak;
  final String name;
  final String time;

  const _LearnerAvatar({
    required this.rank,
    required this.medalColor,
    required this.streak,
    required this.name,
    required this.time,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            // Mascot Avatar Container
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: AppTheme.surface2,
                shape: BoxShape.circle,
                border: Border.all(
                  color: rank <= 3 ? medalColor : AppTheme.borderStroke,
                  width: 2.0,
                ),
              ),
              child: Center(
                child: Text(
                  rank == 1 ? '🐣' : (rank == 2 ? '🐥' : (rank == 3 ? '🦊' : '🦉')),
                  style: const TextStyle(fontSize: 26),
                ),
              ),
            ),
            // Rank Badge
            Positioned(
              top: -4,
              left: -4,
              child: Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  color: medalColor,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppTheme.surface1, width: 2),
                ),
                child: Center(
                  child: Text(
                    '$rank',
                    style: const TextStyle(
                      color: Colors.black,
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        // Streak Flame
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.local_fire_department_rounded, color: AppTheme.accentFire, size: 13),
            const SizedBox(width: 1),
            Text(
              '$streak',
              style: const TextStyle(
                color: AppTheme.accentFire,
                fontSize: 11,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 2),
        // Name
        SizedBox(
          width: 70,
          child: Text(
            name,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        // Study Time
        Text(
          time,
          style: TextStyle(
            color: rank == 1 ? AppTheme.primaryOrange : AppTheme.textMuted,
            fontSize: 10.5,
            fontFamily: 'monospace',
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
