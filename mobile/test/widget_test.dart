// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:project_edu_mobile/main.dart';
import 'package:project_edu_mobile/models/learner_state.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('Project Edu Full Navigation & System Integration Test', (WidgetTester tester) async {
    final learner = LearnerState();

    await tester.pumpWidget(
      ChangeNotifierProvider<LearnerState>.value(
        value: learner,
        child: const ProjectEduApp(),
      ),
    );
    await tester.pumpAndSettle();

    // 1. Verify PreLoginView & Guest Zero-PII Button
    expect(find.text('Project Edu'), findsOneWidget);
    final guestBtn = find.text('ทดลองใช้งานทันที (Guest Zero-PII Mode)');
    expect(guestBtn, findsOneWidget);

    // Tap to enter main dashboard
    await tester.tap(guestBtn);
    await tester.pumpAndSettle();

    // 2. Verify Dashboard View components
    expect(find.text('YSC 2027 รอบแรก'), findsOneWidget);
    expect(find.text('ค้นพบหัวข้อ'), findsOneWidget);
    expect(find.text('ผลตรวจไอเดีย 5 ด้าน (Evaluation)'), findsOneWidget);

    // 3. Open Claude-style AI Coach Modal from Floating Dock
    final floatingCoachBtn = find.byIcon(Icons.auto_awesome_rounded).last;
    await tester.tap(floatingCoachBtn);
    await tester.pumpAndSettle();

    // Verify Claude styling & empty state prompts
    expect(find.text('Claude Socratic Coach'), findsOneWidget);
    expect(find.text('สวัสดีครับ มีไอเดียวิจัยอะไรที่อยากปรึกษาไหมครับ?'), findsOneWidget);
    expect(find.text('🧪 ตรวจสอบตัวแปรต้น-ตาม'), findsOneWidget);

    // Dismiss AI Coach without typing
    final closeBtn = find.byIcon(Icons.close_rounded);
    expect(closeBtn, findsOneWidget);
    await tester.tap(closeBtn);
    await tester.pumpAndSettle();

    // Verify draft session was NOT saved to sessions list
    expect(learner.sessions, isEmpty);

    // 4. Test Tab Navigation to Lab Log Book (สมุดบันทึกแล็บ)
    final logBookNavIcon = find.byIcon(Icons.menu_book_outlined);
    expect(logBookNavIcon, findsOneWidget);
    await tester.tap(logBookNavIcon);
    await tester.pumpAndSettle();

    expect(find.text('สมุดบันทึกแล็บ (Lab Log Book)'), findsOneWidget);
    expect(find.text('00:00:00'), findsOneWidget);
    expect(find.text('ยังไม่มีบันทึกผลการทดลองในสมุดแล็บ'), findsOneWidget);

    // 5. Test Tab Navigation to Profile View
    final profileNavIcon = find.byIcon(Icons.account_circle_outlined);
    expect(profileNavIcon, findsOneWidget);
    await tester.tap(profileNavIcon);
    await tester.pumpAndSettle();

    expect(find.text('นักเรียนนักวิจัย'), findsOneWidget);
    expect(find.text('โครงงานของฉัน (Active Projects)'), findsOneWidget);
    expect(find.text('ยังไม่มีโครงงานที่บันทึกไว้ในบัญชีนี้\nแตะ "+ สร้างใหม่" เพื่อเลือกหัวข้อวิจัย หรือเริ่มบันทึกแล็บ'), findsOneWidget);
  });

  testWidgets('drawer logout leaves guest mode and returns to the login screen', (tester) async {
    final learner = LearnerState()..isGuestSession = true;
    await tester.pumpWidget(
      ChangeNotifierProvider<LearnerState>.value(value: learner, child: const ProjectEduApp()),
    );
    await tester.pumpAndSettle();

    tester.state<ScaffoldState>(find.byType(Scaffold).first).openDrawer();
    await tester.pumpAndSettle();
    await tester.tap(find.text('ออกจากระบบ'));
    await tester.pumpAndSettle();

    expect(learner.isGuestSession, isFalse);
    expect(find.text('ทดลองใช้งานทันที (Guest Zero-PII Mode)'), findsOneWidget);
  });
}
