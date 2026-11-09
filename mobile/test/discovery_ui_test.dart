import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:project_edu_mobile/discovery/catalog.g.dart';
import 'package:project_edu_mobile/discovery/discovery_store.dart';
import 'package:project_edu_mobile/models/learner_state.dart';
import 'package:project_edu_mobile/theme/app_theme.dart';
import 'package:project_edu_mobile/views/topic_discovery_view.dart';

Future<(LearnerState, DiscoveryStore)> pumpDiscovery(WidgetTester tester, {DiscoveryStore? store}) async {
  tester.view.physicalSize = const Size(1080, 2340);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  final learner = LearnerState()..gradeLevel = 'ม.ปลาย';
  final discovery = store ?? DiscoveryStore();
  await tester.pumpWidget(MultiProvider(
    providers: [ChangeNotifierProvider.value(value: learner), ChangeNotifierProvider.value(value: discovery)],
    child: MaterialApp(theme: AppTheme.lightTheme, home: const TopicDiscoveryView()),
  ));
  await tester.pumpAndSettle();
  return (learner, discovery);
}

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  testWidgets('subject → subfield → like, undo, flip, write own idea, make it the Active Idea', (tester) async {
    final (learner, store) = await pumpDiscovery(tester);

    await tester.tap(find.text('วิทยาศาสตร์'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('ฟิสิกส์และพลังงาน'));
    await tester.pumpAndSettle();
    expect(store.currentSubfieldId, 'sci_physics');

    final first = store.deck('sci_physics', 'm_plai').first;
    expect(find.text(first.title), findsOneWidget);

    await tester.tap(find.byTooltip('สนใจ'));
    await tester.pumpAndSettle();
    expect(store.shortlist.single.id, first.id);
    expect(find.text('Shortlist 1/5'), findsOneWidget);

    await tester.tap(find.byTooltip('ย้อน'));
    await tester.pumpAndSettle();
    expect(store.shortlist, isEmpty);
    expect(find.text(first.title), findsOneWidget);

    // Flip to the back and choose this card right away.
    await tester.tap(find.text(first.title));
    await tester.pumpAndSettle();
    expect(find.text('อยากทำเลย เลือกใบนี้'), findsOneWidget);
    await tester.ensureVisible(find.text('อยากทำเลย เลือกใบนี้')); // the back face scrolls on small cards
    await tester.pumpAndSettle();
    await tester.tap(find.text('อยากทำเลย เลือกใบนี้'));
    await tester.pumpAndSettle();

    // A copy of the card is refused.
    await tester.enterText(find.byType(TextField), first.phenomenon);
    await tester.tap(find.text('บันทึกเป็นไอเดีย'));
    await tester.pumpAndSettle();
    expect(store.ideas, isEmpty);
    expect(find.textContaining('สำนวนภาษาและความเข้าใจของตนเอง'), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'ผมอยากวัดว่าหลังคาใบจากช่วยให้ห้องเย็นลงกี่องศาเมื่อเทียบกับสังกะสีในบ้านจริงสามหลัง');
    await tester.tap(find.text('บันทึกเป็นไอเดีย'));
    await tester.pumpAndSettle();
    expect(store.ideas, hasLength(1));
    expect(store.activeIdea, isNull);

    await tester.tap(find.text('ตั้งเป็นไอเดียหลัก'));
    await tester.pumpAndSettle();
    expect(store.activeIdea!.text, startsWith('ผมอยากวัด'));
    expect(learner.currentLabSessionTitle, startsWith('ผมอยากวัด'));
    expect(find.text('Claude Socratic Coach'), findsOneWidget);
  });

  testWidgets('a 6th like opens the compare screen; an empty deck offers review and AI', (tester) async {
    final store = DiscoveryStore()..currentSubfieldId = 'sci_physics';
    for (final c in discoveryCatalogCards.where((c) => c.subfieldId == 'math_stats_prob').take(5)) {
      store.swipe(c, like: true);
    }
    await pumpDiscovery(tester, store: store);

    await tester.tap(find.byTooltip('สนใจ'));
    await tester.pumpAndSettle();
    expect(find.text('เทียบ Shortlist (5/5)'), findsOneWidget);
    expect(find.text('เลือกใบนี้'), findsNothing); // collapsed rows until expanded
    await tester.pageBack();
    await tester.pumpAndSettle();

    for (final c in store.deck('sci_physics', 'm_plai')) {
      store.swipe(c, like: false);
    }
    await tester.pumpAndSettle();
    expect(find.text('ปัดการ์ดในสาขานี้ครบแล้ว'), findsOneWidget);
    expect(find.textContaining('ดูใบที่ข้ามอีกรอบ'), findsOneWidget);
    expect(find.text('ให้ AI คิดการ์ดจากความสนใจ'), findsOneWidget);
  });
}
