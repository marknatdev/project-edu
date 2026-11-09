import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:project_edu_mobile/discovery/discovery_store.dart';
import 'package:project_edu_mobile/main.dart';
import 'package:project_edu_mobile/models/learner_state.dart';
import 'package:project_edu_mobile/services/supabase_service.dart';

Future<(LearnerState, DiscoveryStore)> pumpApp(WidgetTester tester) async {
  final learner = LearnerState();
  final discovery = DiscoveryStore();
  await tester.pumpWidget(
    MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: learner),
        ChangeNotifierProvider.value(value: discovery),
      ],
      child: const ProjectEduApp(),
    ),
  );
  await tester.pumpAndSettle();
  return (learner, discovery);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() => SharedPreferences.setMockInitialValues({}));
  tearDown(() => SupabaseService.userIdOverride = null);

  testWidgets('signed out: only Google sign-in, no Guest mode (ADR 0007)', (tester) async {
    SupabaseService.userIdOverride = () => null;
    await pumpApp(tester);
    expect(find.text('เข้าสู่ระบบด้วย Google'), findsOneWidget);
    expect(find.textContaining('Guest'), findsNothing);
  });

  testWidgets('first sign-in on a device clears data left from before (ADR 0007)', (tester) async {
    SharedPreferences.setMockInitialValues({
      'lab_session_title': 'ข้อมูลเก่าจากโหมด Guest',
      'device_owner_uid_v1': '',
    });
    SupabaseService.userIdOverride = () => 'user-a';
    final learner = LearnerState();
    await learner.loadPersistedState();
    final discovery = DiscoveryStore();
    await tester.pumpWidget(MultiProvider(
      providers: [ChangeNotifierProvider.value(value: learner), ChangeNotifierProvider.value(value: discovery)],
      child: const ProjectEduApp(),
    ));
    await tester.pumpAndSettle();
    expect(learner.currentLabSessionTitle, isEmpty);
  });

  testWidgets('signed in: dashboard, coach, lab log and profile', (tester) async {
    SupabaseService.userIdOverride = () => 'user-a';
    final (learner, _) = await pumpApp(tester);

    expect(find.text('YSC 2027 รอบแรก'), findsOneWidget);
    expect(find.text('ผลตรวจไอเดีย 5 ด้าน (Evaluation)'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.auto_awesome_rounded).last);
    await tester.pumpAndSettle();
    expect(find.text('Claude Socratic Coach'), findsOneWidget);
    await tester.tap(find.byIcon(Icons.close_rounded));
    await tester.pumpAndSettle();
    expect(learner.sessions, isEmpty);

    await tester.tap(find.byIcon(Icons.menu_book_outlined));
    await tester.pumpAndSettle();
    expect(find.text('สมุดบันทึกแล็บ (Lab Log Book)'), findsOneWidget);
    expect(find.text('00:00:00'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.account_circle_outlined));
    await tester.pumpAndSettle();
    expect(find.text('ไอเดียของฉัน'), findsOneWidget);
    expect(find.textContaining('ยังไม่มีไอเดีย'), findsOneWidget);
  });

  testWidgets('drawer logout returns to the sign-in screen', (tester) async {
    SupabaseService.userIdOverride = () => 'user-a';
    await pumpApp(tester);
    tester.state<ScaffoldState>(find.byType(Scaffold).first).openDrawer();
    await tester.pumpAndSettle();
    await tester.tap(find.text('ออกจากระบบ'));
    await tester.pumpAndSettle();
    expect(find.text('เข้าสู่ระบบด้วย Google'), findsOneWidget);
  });
}
