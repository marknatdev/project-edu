import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:project_edu_mobile/models/learner_state.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('LearnerState Core System Tests', () {
    late LearnerState state;

    setUp(() {
      SharedPreferences.setMockInitialValues({});
      state = LearnerState();
    });

    test('Initial state should be completely clean without mock data', () {
      expect(state.sessions, isEmpty);
      expect(state.labObservations, isEmpty);
      expect(state.bomItems, isEmpty);
      expect(state.shortlistedCards, isEmpty);
      expect(state.currentLabSessionTitle, isEmpty);
      expect(state.activeProjectsCount, equals(0));
      expect(state.displayName, equals('นักเรียนนักวิจัย'));
    });

    test('createNewSession creates an uncommitted draft without polluting sessions list', () {
      final draft = state.createNewSession(
        title: 'ทดสอบการตั้งสมมติฐาน',
        category: 'Socratic Research',
      );

      expect(draft.title, equals('ทดสอบการตั้งสมมติฐาน'));
      expect(draft.category, equals('Socratic Research'));
      // Must NOT be added to sessions list yet
      expect(state.sessions, isEmpty);
    });

    test('saveOrInsertSession commits a session to state', () {
      final draft = state.createNewSession(
        title: 'โครงงานวิจัยไมโครพลาสติก',
        category: 'Socratic Research',
      );
      state.saveOrInsertSession(draft);

      expect(state.sessions.length, equals(1));
      expect(state.sessions.first.id, equals(draft.id));
      expect(state.activeSession?.id, equals(draft.id));
    });

    test('pruneEmptySessions removes unresponded empty sessions', () {
      final draft = state.createNewSession(
        title: 'บทสนทนาที่ไม่มีข้อความ',
        category: 'Socratic Research',
      );
      state.saveOrInsertSession(draft);
      expect(state.sessions.length, equals(1));

      // User did not interact, prune should remove it
      state.pruneEmptySessions();
      expect(state.sessions, isEmpty);
    });

    test('pruneEmptySessions retains sessions where user interacted', () {
      final session = state.createNewSession(
        title: 'บทสนทนาจริง',
        category: 'Socratic Research',
      );
      session.messages.add(ChatMessage(
        text: 'มีคำถามเกี่ยวกับตัวแปรต้นครับ',
        isUser: true,
        timestamp: DateTime.now(),
      ));
      state.saveOrInsertSession(session);

      state.pruneEmptySessions();
      expect(state.sessions.length, equals(1));
      expect(state.sessions.first.messages.first.text, contains('ตัวแปรต้น'));
    });

    test('BOM Management adds, sums cost, and deletes items correctly', () {
      expect(state.totalBomCost, equals(0));

      state.addBomItem(title: 'เซนเซอร์ DHT22', costBaht: 85, status: 'จัดซื้อแล้ว');
      state.addBomItem(title: 'บอร์ด ESP32', costBaht: 150, status: 'ยืมแล็บโรงเรียน');

      expect(state.bomItems.length, equals(2));
      expect(state.totalBomCost, equals(235));

      final firstId = state.bomItems.first.id;
      state.deleteBomItem(firstId);

      expect(state.bomItems.length, equals(1));
      expect(state.totalBomCost, equals(150));
    });

    test('Lab Observations logging records entries with timestamps and deletes them', () {
      expect(state.labObservations, isEmpty);

      state.addObservation(note: 'เริ่มวัดค่าความชื้นรอบแรก', tag: 'Trial 1', customTime: '10:00');
      expect(state.labObservations.length, equals(1));
      expect(state.labObservations.first.note, equals('เริ่มวัดค่าความชื้นรอบแรก'));
      expect(state.labObservations.first.tag, equals('Trial 1'));
      expect(state.labObservations.first.time, equals('10:00'));

      final obsId = state.labObservations.first.id;
      state.deleteObservation(obsId);
      expect(state.labObservations, isEmpty);
    });

    test('clearAllAccountData resets everything to clean state', () async {
      state.setLabSessionTitle('การวิจัยตรวจจับสารปนเปื้อน');
      state.addBomItem(title: 'หลอดทดลอง', costBaht: 50, status: 'มีแล้วในสต็อก');
      state.addObservation(note: 'บันทึกการสังเกต', tag: 'Obs');

      expect(state.currentLabSessionTitle.isNotEmpty, isTrue);
      expect(state.bomItems.isNotEmpty, isTrue);
      expect(state.labObservations.isNotEmpty, isTrue);

      await state.clearAllAccountData();

      expect(state.currentLabSessionTitle, isEmpty);
      expect(state.bomItems, isEmpty);
      expect(state.labObservations, isEmpty);
      expect(state.sessions, isEmpty);
    });

    test('clearAllAccountData also resets project settings, in memory and after restart', () async {
      state.setBudgetConstraint('ไม่เกิน 100 บาท');
      state.setTeamSize(3);
      state.setTimelineWeeks(20);
      state.setStrictSafetyOnly(false);
      await Future<void>.delayed(Duration.zero);

      await state.clearAllAccountData();
      expect(state.budgetConstraint, '500 - 1,500 บาท');
      expect(state.teamSize, 2);

      final restarted = LearnerState();
      await restarted.loadPersistedState();
      expect(restarted.budgetConstraint, '500 - 1,500 บาท');
      expect(restarted.teamSize, 2);
      expect(restarted.timelineWeeks, 8);
      expect(restarted.strictSafetyOnly, isTrue);
    });

    test('guest mode survives a restart until sign-out', () async {
      state.setGuestSession(true);
      await Future<void>.delayed(Duration.zero);
      final restarted = LearnerState();
      await restarted.loadPersistedState();
      expect(restarted.isGuestSession, isTrue);

      restarted.setGuestSession(false);
      await Future<void>.delayed(Duration.zero);
      final again = LearnerState();
      await again.loadPersistedState();
      expect(again.isGuestSession, isFalse);
    });

    test('lab stopwatch counts wall-clock time, pauses, and survives a restart', () async {
      var now = DateTime(2026, 11, 9, 10);
      state.clock = () => now;

      state.toggleTimer();
      now = now.add(const Duration(minutes: 5)); // phone locked, no ticks
      expect(state.labTimerSeconds, 300);
      expect(state.formattedStudyTime, '00:05:00');

      state.toggleTimer(); // pause
      now = now.add(const Duration(minutes: 10));
      expect(state.labTimerSeconds, 300);
      expect(state.isTimerRunning, isFalse);

      state.toggleTimer(); // resume, then app is killed
      await Future<void>.delayed(Duration.zero);
      now = now.add(const Duration(seconds: 30));

      final restarted = LearnerState()..clock = () => now;
      await restarted.loadPersistedState();
      expect(restarted.isTimerRunning, isTrue);
      expect(restarted.labTimerSeconds, 330);

      restarted.resetTimer();
      expect(restarted.labTimerSeconds, 0);
      expect(restarted.isTimerRunning, isFalse);
    });

    test('chat sessions survive an app restart, including AI replies and renames', () async {
      final session = state.createNewSession(title: 'แชทแรก', category: 'SRC Safety');
      session.messages.add(ChatMessage(text: 'สวัสดี', isUser: true, timestamp: DateTime(2026, 11, 9, 10)));
      state.saveOrInsertSession(session);
      // AI reply arrives after the session was committed
      session.messages.add(ChatMessage(
        text: 'คำตอบ',
        isUser: false,
        timestamp: DateTime(2026, 11, 9, 10, 1),
        userAskQuestion: 'เลือกข้อไหน?',
        userAskChoices: ['ก', 'ข'],
      ));
      state.touchSession(session);
      state.renameSession(session.id, 'ชื่อใหม่');
      await Future<void>.delayed(Duration.zero);

      final restarted = LearnerState();
      await restarted.loadPersistedState();

      expect(restarted.sessions, hasLength(1));
      final restored = restarted.sessions.single;
      expect(restored.id, session.id);
      expect(restored.title, 'ชื่อใหม่');
      expect(restored.category, 'SRC Safety');
      expect(restored.messages.map((m) => m.text), ['สวัสดี', 'คำตอบ']);
      expect(restored.messages.last.isUser, isFalse);
      expect(restored.messages.last.userAskChoices, ['ก', 'ข']);

      restarted.deleteSession(session.id);
      await Future<void>.delayed(Duration.zero);
      final again = LearnerState();
      await again.loadPersistedState();
      expect(again.sessions, isEmpty);
    });
  });
}
