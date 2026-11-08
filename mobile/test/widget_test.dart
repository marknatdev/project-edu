// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:project_edu_mobile/main.dart';
import 'package:project_edu_mobile/models/learner_state.dart';

void main() {
  testWidgets('Project Edu App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(
      ChangeNotifierProvider(
        create: (_) => LearnerState(),
        child: const ProjectEduApp(),
      ),
    );

    // Verify brand logo renders on PreLoginView
    expect(find.text('Project Edu'), findsOneWidget);

    // Tap Guest Zero-PII mode to enter Main Dashboard
    await tester.tap(find.text('ทดลองใช้งานทันที (Guest Zero-PII Mode)'));
    await tester.pumpAndSettle();

    // Verify Dashboard renders
    expect(find.text('YSC 2027 รอบแรก'), findsOneWidget);
  });
}
