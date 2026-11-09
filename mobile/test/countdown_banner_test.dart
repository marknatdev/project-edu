import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:project_edu_mobile/widgets/countdown_banner.dart';

void main() {
  Future<void> pump(WidgetTester tester, DateTime now) => tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: CountdownBanner(
            title: 'YSC',
            examDate: 'ส่งข้อเสนอ',
            deadline: DateTime(2026, 9, 10, 23, 59),
            now: now,
          ),
        ),
      ));

  testWidgets('counts down from the real deadline', (tester) async {
    await pump(tester, DateTime(2026, 9, 8, 20, 29));
    expect(find.text('02'), findsOneWidget); // days
    expect(find.text('03'), findsOneWidget); // hours
    expect(find.text('30'), findsOneWidget); // minutes
  });

  testWidgets('shows closed once the deadline has passed', (tester) async {
    await pump(tester, DateTime(2026, 11, 9));
    expect(find.text('ปิดรับ'), findsOneWidget);
  });
}
