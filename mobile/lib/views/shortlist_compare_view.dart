import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../discovery/discovery_store.dart';
import '../discovery/fit_score.dart';
import '../models/learner_state.dart';
import '../theme/app_theme.dart';
import 'idea_composer.dart';

/// Compares the Shortlist side by side, ranked by Fit Score with the reasons behind each score.
class ShortlistCompareView extends StatelessWidget {
  const ShortlistCompareView({super.key});

  @override
  Widget build(BuildContext context) {
    final store = context.watch<DiscoveryStore>();
    final constraints = context.watch<LearnerState>().fitConstraints;
    final ranked = [for (final c in store.shortlist) (c, computeFitScore(c, constraints))]
      ..sort((a, b) => b.$2.score.compareTo(a.$2.score));
    final over = ranked.length - shortlistLimit;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.background,
        elevation: 0,
        iconTheme: IconThemeData(color: AppTheme.textPrimary),
        title: Text('เทียบ Shortlist (${ranked.length}/$shortlistLimit)',
            style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 17)),
      ),
      body: ranked.isEmpty
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text('ยังไม่มีการ์ดใน Shortlist ปัดขวาการ์ดที่สนใจเพื่อเก็บไว้เทียบ',
                    textAlign: TextAlign.center, style: TextStyle(color: AppTheme.textMuted)),
              ),
            )
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
              children: [
                if (over > 0)
                  Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.accentAmber.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text('Shortlist เกิน $shortlistLimit ใบ (รวมจากหลายอุปกรณ์) เอาออกอีก $over ใบก่อนเลือก',
                        style: TextStyle(color: AppTheme.textPrimary, fontSize: 12.5)),
                  ),
                Text('คะแนนความเหมาะ (Fit Score) เทียบการ์ดกับเวลา งบ อุปกรณ์ จำนวนคน และระดับชั้นที่คุณตั้งไว้',
                    style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                const SizedBox(height: 12),
                for (final (card, fit) in ranked)
                  Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: AppTheme.cardDecoration(),
                    child: ExpansionTile(
                      shape: const Border(),
                      leading: CircleAvatar(
                        backgroundColor: (fit.score >= 80 ? AppTheme.accentGreen : fit.score >= 60 ? AppTheme.accentAmber : AppTheme.accentRed)
                            .withValues(alpha: 0.15),
                        child: Text('${fit.score}', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold)),
                      ),
                      title: Text(card.title, style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 14)),
                      subtitle: Text(
                        '${card.estimatedWeeks} สัปดาห์ • ~${card.estimatedBudgetBaht} บาท • ${card.difficultyTh}${card.aiGenerated ? ' • AI คิดให้' : ''}',
                        style: TextStyle(color: AppTheme.textMuted, fontSize: 11.5),
                      ),
                      childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                      children: [
                        for (final r in fit.reasons)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 4),
                            child: Text('• $r', style: TextStyle(color: AppTheme.textSecondary, fontSize: 12.5)),
                          ),
                        const SizedBox(height: 8),
                        Row(children: [
                          TextButton.icon(
                            onPressed: () => store.removeFromShortlist(card.id),
                            icon: const Icon(Icons.remove_circle_outline_rounded, size: 18),
                            label: const Text('เอาออก'),
                          ),
                          const Spacer(),
                          FilledButton(
                            onPressed: over > 0 ? null : () => IdeaComposer.show(context, card),
                            child: const Text('เลือกใบนี้'),
                          ),
                        ]),
                      ],
                    ),
                  ),
              ],
            ),
    );
  }
}
