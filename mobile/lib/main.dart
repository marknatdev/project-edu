import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'models/learner_state.dart';
import 'services/code_push_service.dart';
import 'services/supabase_service.dart';
import 'theme/app_theme.dart';
import 'views/dashboard_view.dart';
import 'views/practice_stepper_view.dart';
import 'views/pre_login_view.dart';
import 'views/profile_view.dart';
import 'views/sessions_view.dart';
import 'views/study_timer_view.dart';
import 'widgets/app_drawer.dart';
import 'widgets/app_header.dart';
import 'widgets/floating_dock.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SupabaseService.initialize();
  // Check for OTA updates in background via Shorebird CodePush
  CodePushService.checkForUpdatesInBackground();
  runApp(
    ChangeNotifierProvider(
      create: (_) => LearnerState(),
      child: const ProjectEduApp(),
    ),
  );
}

class ProjectEduApp extends StatelessWidget {
  const ProjectEduApp({super.key});

  @override
  Widget build(BuildContext context) {
    final learner = context.watch<LearnerState>();
    final isDark = learner.themeMode == AppThemeMode.dark;
    AppTheme.isDark = isDark;

    return MaterialApp(
      title: 'Project Edu Mobile',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: isDark ? ThemeMode.dark : ThemeMode.light,
      home: const MainShell(),
    );
  }
}

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  bool _isInPracticeMode = false;
  bool _isGuestSession = false;

  @override
  Widget build(BuildContext context) {
    final user = SupabaseService.currentUser;
    final isLoggedIn = user != null || _isGuestSession;

    if (!isLoggedIn) {
      return PreLoginView(
        onLoginSuccess: () => setState(() => _isGuestSession = true),
      );
    }

    final learner = context.watch<LearnerState>();

    // If currently inside the Practice Stepper Flow
    if (_isInPracticeMode) {
      return PracticeStepperView(
        onBack: () => setState(() => _isInPracticeMode = false),
      );
    }

    Widget currentBody;
    switch (learner.activeTab) {
      case 0:
        currentBody = DashboardView(
          onOpenPractice: () => setState(() => _isInPracticeMode = true),
        );
        break;
      case 1:
        currentBody = const SessionsView();
        break;
      case 2:
        currentBody = const StudyTimerView();
        break;
      case 3:
        currentBody = _buildPlaceholderTab('การอภิปรายและคำถามกรรมการ (Mock Judge Defense)');
        break;
      case 4:
        currentBody = ProfileView(
          onGoPractice: () => setState(() => _isInPracticeMode = true),
          onSignOut: () => setState(() => _isGuestSession = false),
        );
        break;
      default:
        currentBody = DashboardView(
          onOpenPractice: () => setState(() => _isInPracticeMode = true),
        );
    }

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: AppTheme.background,
      appBar: AppHeader(
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
        onSearch: () {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('กำลังค้นหาบทเรียนและโจทย์...'),
              backgroundColor: AppTheme.surface2,
            ),
          );
        },
        onNotifications: () {},
      ),
      drawer: const AppDrawer(),
      body: Stack(
        children: [
          currentBody,
          const FloatingDock(),
        ],
      ),
    );
  }

  Widget _buildPlaceholderTab(String title) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppTheme.surface2,
                shape: BoxShape.circle,
                border: Border.all(color: AppTheme.borderStroke),
              ),
              child: Icon(Icons.hub_outlined, color: AppTheme.primaryCyan, size: 36),
            ),
            const SizedBox(height: 16),
            Text(
              title,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'กำลังเชื่อมต่อข้อมูลกับเซิร์ฟเวอร์ Project Edu Cloud...',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
            ),
          ],
        ),
      ),
    );
  }
}

