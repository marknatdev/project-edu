import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:project_edu_mobile/discovery/discovery_store.dart';
import 'package:project_edu_mobile/main.dart';
import 'package:project_edu_mobile/models/learner_state.dart';
import 'package:project_edu_mobile/services/supabase_service.dart';
import 'package:project_edu_mobile/theme/app_theme.dart';
import 'package:project_edu_mobile/views/calendar_view.dart';

Widget createTestCalendar({LearnerState? learner, DateTime? initialDate}) {
  final state = learner ?? LearnerState();
  return ChangeNotifierProvider.value(
    value: state,
    child: MaterialApp(
      theme: AppTheme.lightTheme,
      home: CalendarView(initialDate: initialDate),
    ),
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() => SharedPreferences.setMockInitialValues({}));
  tearDown(() => SupabaseService.userIdOverride = null);

  group('CalendarView Tests', () {
    testWidgets('renders month header, weekday row, and empty agenda state', (tester) async {
      final fixedDate = DateTime(2026, 11, 9);
      await tester.pumpWidget(createTestCalendar(initialDate: fixedDate));
      await tester.pumpAndSettle();

      expect(find.text('ปฏิทินวิจัย'), findsOneWidget);
      expect(find.text('วันนี้'), findsOneWidget);
      // November 2026 in Buddhist Era: 2026 + 543 = 2569
      expect(find.text('พฤศจิกายน 2569'), findsOneWidget);

      // Weekdays
      expect(find.text('อา'), findsOneWidget);
      expect(find.text('จ'), findsOneWidget);
      expect(find.text('ศ'), findsOneWidget);

      // Empty agenda
      expect(find.text('ยังไม่มีกิจกรรมในวันนี้'), findsOneWidget);
      expect(find.text('ไม่มีกิจกรรม'), findsOneWidget);
    });

    testWidgets('month navigation previous and next works across year rollover', (tester) async {
      // Start in January 2026
      final janDate = DateTime(2026, 1, 15);
      await tester.pumpWidget(createTestCalendar(initialDate: janDate));
      await tester.pumpAndSettle();

      expect(find.text('มกราคม 2569'), findsOneWidget);

      // Go previous -> December 2025 (2568)
      await tester.tap(find.byTooltip('เดือนก่อนหน้า'));
      await tester.pumpAndSettle();
      expect(find.text('ธันวาคม 2568'), findsOneWidget);

      // Go next twice -> January 2026 then February 2026
      await tester.tap(find.byTooltip('เดือนถัดไป'));
      await tester.pumpAndSettle();
      expect(find.text('มกราคม 2569'), findsOneWidget);

      await tester.tap(find.byTooltip('เดือนถัดไป'));
      await tester.pumpAndSettle();
      expect(find.text('กุมภาพันธ์ 2569'), findsOneWidget);
    });

    testWidgets('today button resets view to current month and date', (tester) async {
      // Start in July 2025
      final pastDate = DateTime(2025, 7, 10);
      await tester.pumpWidget(createTestCalendar(initialDate: pastDate));
      await tester.pumpAndSettle();

      expect(find.text('กรกฎาคม 2568'), findsOneWidget);

      // Tap 'วันนี้'
      await tester.tap(find.text('วันนี้'));
      await tester.pumpAndSettle();

      final now = DateTime.now();
      final nowBYear = now.year + 543;
      expect(find.textContaining('$nowBYear'), findsWidgets);
    });

    testWidgets('add and delete calendar event in state updates agenda dynamically', (tester) async {
      final fixedDate = DateTime(2026, 11, 9);
      final learner = LearnerState();
      await tester.pumpWidget(createTestCalendar(learner: learner, initialDate: fixedDate));
      await tester.pumpAndSettle();

      expect(find.text('ยังไม่มีกิจกรรมในวันนี้'), findsOneWidget);

      // Add event directly to LearnerState
      final event = ResearchCalendarEvent(
        id: 'test_evt_1',
        title: 'ทดสอบส่งสารเคมีแล็บ SRC',
        date: fixedDate,
        time: '10:30',
        category: 'แล็บวิจัย',
        note: 'นำเอกสารแนบให้อาจารย์ที่ปรึกษาเซ็น',
        createdAt: DateTime.now(),
      );
      learner.addCalendarEvent(event);
      await tester.pumpAndSettle();

      // Should now show in agenda
      expect(find.text('ทดสอบส่งสารเคมีแล็บ SRC'), findsOneWidget);
      expect(find.text('10:30 น.'), findsOneWidget);
      expect(find.text('แล็บวิจัย'), findsOneWidget);
      expect(find.text('นำเอกสารแนบให้อาจารย์ที่ปรึกษาเซ็น'), findsOneWidget);
      expect(find.text('1 กิจกรรม'), findsOneWidget);

      // Delete event
      learner.deleteCalendarEvent('test_evt_1');
      await tester.pumpAndSettle();

      expect(find.text('ยังไม่มีกิจกรรมในวันนี้'), findsOneWidget);
      expect(find.text('ไม่มีกิจกรรม'), findsOneWidget);
    });

    testWidgets('dashboard quick action "ปฏิทิน" navigates directly to CalendarView', (tester) async {
      SupabaseService.userIdOverride = () => 'test-user-calendar';
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

      // Look for the calendar quick action button
      final calendarQuickAction = find.text('ปฏิทิน');
      expect(calendarQuickAction, findsOneWidget);

      await tester.tap(calendarQuickAction);
      await tester.pumpAndSettle();

      // Verify we arrived at CalendarView
      expect(find.text('ปฏิทินวิจัย'), findsOneWidget);
      expect(find.text('เพิ่มกิจกรรม'), findsOneWidget);
      expect(find.byIcon(Icons.calendar_month_rounded), findsWidgets);
    });

    testWidgets('add event via UI modal sheet and verify account wipe purges it', (tester) async {
      final fixedDate = DateTime(2026, 11, 9);
      final learner = LearnerState();

      await tester.pumpWidget(createTestCalendar(learner: learner, initialDate: fixedDate));
      await tester.pumpAndSettle();

      // Tap FAB to open modal sheet
      await tester.tap(find.text('เพิ่มกิจกรรม'));
      await tester.pumpAndSettle();

      expect(find.text('เพิ่มกิจกรรมวิจัย'), findsOneWidget);

      // Enter Title
      await tester.enterText(find.byType(TextField).first, 'ประชุมตรวจร่างข้อเสนอโครงงาน');
      await tester.pumpAndSettle();

      // Select 'กำหนดส่ง' category chip
      await tester.tap(find.text('กำหนดส่ง'));
      await tester.pumpAndSettle();

      // Submit
      await tester.tap(find.text('บันทึกกิจกรรม'));
      await tester.pumpAndSettle();

      // Verify event appears in agenda
      expect(find.text('ประชุมตรวจร่างข้อเสนอโครงงาน'), findsOneWidget);
      expect(find.text('กำหนดส่ง'), findsOneWidget);
      expect(learner.calendarEvents.length, 1);
      expect(learner.calendarEvents.first.title, 'ประชุมตรวจร่างข้อเสนอโครงงาน');
      expect(learner.calendarEvents.first.category, 'กำหนดส่ง');

      // Test account wipe clears calendar events
      await learner.clearAllAccountData();
      await tester.pumpAndSettle();

      expect(learner.calendarEvents.isEmpty, true);
      expect(find.text('ยังไม่มีกิจกรรมในวันนี้'), findsOneWidget);
    });
  });
}
