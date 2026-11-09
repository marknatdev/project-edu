import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'models/learner_state.dart';
import 'services/code_push_service.dart';
import 'services/supabase_service.dart';
import 'theme/app_theme.dart';
import 'views/dashboard_view.dart';
import 'views/lab_log_book_view.dart';
import 'views/practice_stepper_view.dart';
import 'views/pre_login_view.dart';
import 'views/profile_view.dart';
import 'views/sessions_view.dart';
import 'views/topic_discovery_view.dart';
import 'widgets/app_drawer.dart';
import 'widgets/app_header.dart';
import 'widgets/floating_dock.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SupabaseService.initialize();
  // Check for OTA updates in background via Shorebird CodePush
  CodePushService.checkForUpdatesInBackground();

  final learner = LearnerState();
  await learner.loadPersistedState();

  runApp(
    ChangeNotifierProvider.value(
      value: learner,
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
        currentBody = const LabLogBookView();
        break;
      case 3:
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
        onSearch: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const TopicDiscoveryView()),
        ),
        onNotifications: () => _showNotificationsSheet(context),
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
}

void _showNotificationsSheet(BuildContext context) {
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
                Icon(Icons.notifications_rounded, color: AppTheme.primaryCyan, size: 24),
                const SizedBox(width: 8),
                Text(
                  'การแจ้งเตือนงานวิจัย (Notifications)',
                  style: TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: AppTheme.accentAmber.withValues(alpha: 0.15), shape: BoxShape.circle),
                child: Icon(Icons.timer_outlined, color: AppTheme.accentAmber),
              ),
              title: Text('ส่งข้อเสนอโครงงาน YSC 2027', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 13.5)),
              subtitle: Text('เหลือเวลาอีก 42 วัน ก่อนปิดระบบรับสมัครรอบแรก', style: TextStyle(color: AppTheme.textMuted, fontSize: 11.5)),
            ),
            ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: AppTheme.accentGreen.withValues(alpha: 0.15), shape: BoxShape.circle),
                child: Icon(Icons.shield_outlined, color: AppTheme.accentGreen),
              ),
              title: Text('ผ่านการตรวจความปลอดภัย SRC', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 13.5)),
              subtitle: Text('โครงงานของคุณจัดอยู่ในระดับ Non-hazardous ไม่มีความเสี่ยงอันตราย', style: TextStyle(color: AppTheme.textMuted, fontSize: 11.5)),
            ),
            ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: AppTheme.secondaryViolet.withValues(alpha: 0.15), shape: BoxShape.circle),
                child: Icon(Icons.cloud_done_outlined, color: AppTheme.secondaryViolet),
              ),
              title: Text('Shorebird OTA ซิงค์แล้ว', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 13.5)),
              subtitle: Text('แอปเวอร์ชันของคุณได้รับการอัปเดตโค้ดล่าสุดเรียบร้อย', style: TextStyle(color: AppTheme.textMuted, fontSize: 11.5)),
            ),
          ],
        ),
      );
    },
  );
}

