import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:project_edu_mobile/models/learner_state.dart';
import 'package:project_edu_mobile/services/ai_coach_service.dart';
import 'package:project_edu_mobile/views/ai_coach_dialog.dart';

void main() {
  late List<List<dynamic>> sentPayloads;

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    sentPayloads = [];
    AiCoachService.accessToken = () async => 'test-token';
    AiCoachService.client = MockClient((request) async {
      final body = jsonDecode(request.body) as Map<String, dynamic>;
      expect(request.url.path, '/functions/v1/ai-coach');
      expect(request.headers['Authorization'], 'Bearer test-token');
      sentPayloads.add([
        ...(body['history'] as List<dynamic>),
        {'role': 'user', 'content': body['message']},
      ]);
      final reply = 'คำตอบที่ ${sentPayloads.length}';
      return http.Response.bytes(
        utf8.encode(jsonEncode({
          'reply': reply,
        })),
        200,
      );
    });
  });

  Future<LearnerState> openCoach(WidgetTester tester) async {
    final learner = LearnerState();
    await tester.pumpWidget(
      ChangeNotifierProvider.value(
        value: learner,
        child: MaterialApp(
          home: Builder(
            builder: (context) => Scaffold(
              body: TextButton(onPressed: () => AiCoachModal.show(context), child: const Text('open')),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
    return learner;
  }

  Future<void> send(WidgetTester tester, String text) async {
    await tester.enterText(find.byType(TextField), text);
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pumpAndSettle();
  }

  testWidgets('each user turn is sent to the model exactly once', (tester) async {
    await openCoach(tester);
    await send(tester, 'คำถามแรก');
    await send(tester, 'คำถามสอง');

    final second = sentPayloads.last.map((m) => '${m['role']}:${m['content']}').toList();
    expect(second, ['user:คำถามแรก', 'assistant:คำตอบที่ 1', 'user:คำถามสอง']);
  });

  testWidgets('AI replies are persisted with the session', (tester) async {
    await openCoach(tester);
    await send(tester, 'คำถามแรก');
    await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 50)));

    final restarted = LearnerState();
    await tester.runAsync(restarted.loadPersistedState);
    expect(restarted.sessions.single.messages.map((m) => m.text), ['คำถามแรก', 'คำตอบที่ 1']);
  });

  testWidgets('guests are asked to sign in and nothing is sent or saved', (tester) async {
    AiCoachService.accessToken = () async => null;
    final learner = await openCoach(tester);
    await send(tester, 'คำถามแรก');

    expect(sentPayloads, isEmpty);
    expect(learner.sessions, isEmpty);
    expect(find.textContaining('ต้องเข้าสู่ระบบด้วย Google'), findsOneWidget);
  });
}
