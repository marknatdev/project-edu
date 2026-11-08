import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/learner_state.dart';
import '../theme/app_theme.dart';
import '../views/ai_coach_dialog.dart';

class FloatingDock extends StatelessWidget {
  const FloatingDock({super.key});

  @override
  Widget build(BuildContext context) {
    final learner = context.watch<LearnerState>();

    return Align(
      alignment: Alignment.bottomCenter,
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xE6141A26),
          borderRadius: BorderRadius.circular(32),
          border: Border.all(color: AppTheme.borderStroke, width: 1.2),
          boxShadow: const [
            BoxShadow(
              color: Colors.black45,
              blurRadius: 20,
              offset: Offset(0, 8),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            // Tab 0: Research Dashboard
            _DockTab(
              icon: Icons.dashboard_outlined,
              activeIcon: Icons.dashboard_rounded,
              isActive: learner.activeTab == 0,
              onTap: () => learner.setTab(0),
            ),

            // Tab 1: Saved Shortlist & Prior Work
            _DockTab(
              icon: Icons.bookmarks_outlined,
              activeIcon: Icons.bookmarks_rounded,
              isActive: learner.activeTab == 1,
              onTap: () => learner.setTab(1),
            ),

            // Center: Elevated AI Socratic Coach Button
            GestureDetector(
              onTap: () => AiCoachModal.show(context),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppTheme.primaryCyan, AppTheme.secondaryViolet],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.cyanGlow,
                      blurRadius: 16,
                      spreadRadius: 2,
                      offset: const Offset(0, 2),
                    ),
                  ],
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.3),
                    width: 1.5,
                  ),
                ),
                child: const Center(
                  child: Icon(
                    Icons.auto_awesome_rounded,
                    color: Colors.white,
                    size: 26,
                  ),
                ),
              ),
            ),

            // Tab 2: Lab Observation Timer & Log
            _DockTab(
              icon: Icons.science_outlined,
              activeIcon: Icons.science_rounded,
              isActive: learner.activeTab == 2,
              onTap: () => learner.setTab(2),
            ),

            // Tab 4: Researcher Profile
            _DockTab(
              icon: Icons.account_circle_outlined,
              activeIcon: Icons.account_circle_rounded,
              isActive: learner.activeTab == 4,
              onTap: () => learner.setTab(4),
            ),
          ],
        ),
      ),
    );
  }
}

class _DockTab extends StatelessWidget {
  final IconData icon;
  final IconData activeIcon;
  final bool isActive;
  final VoidCallback onTap;

  const _DockTab({
    required this.icon,
    required this.activeIcon,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: onTap,
      splashRadius: 24,
      icon: Icon(
        isActive ? activeIcon : icon,
        color: isActive ? AppTheme.primaryCyan : AppTheme.textSecondary,
        size: 24,
      ),
    );
  }
}
