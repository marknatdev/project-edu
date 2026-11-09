import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:project_edu_mobile/discovery/catalog.dart';
import 'package:project_edu_mobile/discovery/catalog.g.dart';
import 'package:project_edu_mobile/discovery/discovery_store.dart';
import 'package:project_edu_mobile/discovery/fit_score.dart';
import 'package:project_edu_mobile/discovery/rewrite_gate.dart';

/// In-memory server: assigns its own sequence numbers as the pull cursor.
class FakeRemote implements DiscoverySyncRemote {
  final List<(int, SyncItem)> rows = [];
  int _seq = 0;
  bool offline = false;

  @override
  Future<void> push(List<SyncItem> items) async {
    if (offline) throw Exception('offline');
    for (final i in items) {
      final idx = rows.indexWhere((r) => r.$2.key == i.key);
      final merged = mergeItem(idx == -1 ? null : rows[idx].$2, i);
      if (idx != -1) rows.removeAt(idx);
      rows.add((++_seq, merged));
    }
  }

  @override
  Future<SyncPull> pull(String? cursor) async {
    if (offline) throw Exception('offline');
    final after = int.tryParse(cursor ?? '') ?? 0;
    final page = rows.where((r) => r.$1 > after).toList();
    return SyncPull([for (final r in page) r.$2], page.isEmpty ? cursor : '${page.last.$1}');
  }
}

DiscoveryCard card(String id) => discoveryCatalogCards.firstWhere((c) => c.id == id);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() => SharedPreferences.setMockInitialValues({}));

  group('catalog', () {
    test('has the 90 web cards across 3 subjects and every card has a subfield', () {
      expect(discoveryCatalogCards, hasLength(90));
      expect(discoverySubjects.map((s) => s.id), ['science', 'computer', 'mathematics']);
      final subfieldIds = discoverySubfields.map((f) => f.id).toSet();
      expect(discoveryCatalogCards.every((c) => subfieldIds.contains(c.subfieldId)), isTrue);
    });
  });

  group('fit score (same formula as the web)', () {
    final c = card('sci-phy-02'); // 6 weeks, 1200 baht, team 1-2, m_plai only
    test('perfect constraints score 100 except unmatched equipment and skills', () {
      final f = computeFitScore(
        c,
        FitConstraints(
          timeWeeks: 8,
          budgetBaht: 1500,
          equipment: c.requiredEquipment,
          teamSize: 2,
          skills: c.requiredSkills,
          gradeLevel: 'm_plai',
        ),
      );
      expect(f.score, 100);
    });
    test('tight time, budget, team and grade lower the score and explain why', () {
      final f = computeFitScore(
        c,
        const FitConstraints(timeWeeks: 3, budgetBaht: 600, equipment: [], teamSize: 4, skills: [], gradeLevel: 'm_ton'),
      );
      expect(f.breakdown, {'time': 50, 'budget': 50, 'equipment': 0, 'teamSize': 50, 'skills': 0, 'gradeLevel': 50});
      expect(f.score, 33);
      expect(f.reasons.first, contains('ระยะเวลาอาจกระชั้นชิด'));
      expect(f.reasons[1], contains('1,200 บาท'));
    });
  });

  group('rewrite gate', () {
    test('rejects short text and near copies, accepts own words', () {
      final source = card('sci-phy-01').phenomenon;
      expect(checkRewrite(source, 'สั้นไป').acceptable, isFalse);
      expect(checkRewrite(source, source).acceptable, isFalse);
      expect(checkRewrite(source, '$source ครับ').acceptable, isFalse);
      expect(checkRewrite(source, 'ผมอยากวัดว่าหลังคาจากใบไม้ช่วยให้บ้านเย็นลงกี่องศาเมื่อเทียบกับสังกะสี').acceptable, isTrue);
    });
  });

  group('deck, swipe, shortlist', () {
    test('deck filters by subfield and grade and drops swiped cards', () {
      final s = DiscoveryStore();
      final deck = s.deck('sci_physics', 'm_ton');
      expect(deck.every((c) => c.subfieldId == 'sci_physics' && c.gradeLevels.contains('m_ton')), isTrue);
      expect(deck.any((c) => c.id == 'sci-phy-02'), isFalse); // m_plai only
      s.swipe(deck.first, like: false);
      expect(s.deck('sci_physics', 'm_ton').any((c) => c.id == deck.first.id), isFalse);
      expect(s.skippedCount('sci_physics'), 1);
      s.reviewSkipped('sci_physics');
      expect(s.deck('sci_physics', 'm_ton').first.id, deck.first.id);
    });

    test('a 6th like is refused so the learner compares first; undo reverts a whole swipe', () {
      final s = DiscoveryStore();
      final cards = discoveryCatalogCards.take(6).toList();
      for (final c in cards.take(5)) {
        expect(s.swipe(c, like: true), SwipeResult.recorded);
      }
      expect(s.swipe(cards[5], like: true), SwipeResult.shortlistFull);
      expect(s.isSwiped(cards[5].id), isFalse);
      s.undo();
      expect(s.shortlist, hasLength(4));
      expect(s.isSwiped(cards[4].id), isFalse);
      s.removeFromShortlist(cards[0].id);
      expect(s.shortlist.map((c) => c.id), isNot(contains(cards[0].id)));
    });
  });

  group('ideas', () {
    test('an idea becomes the Active Idea only when set, and switching keeps the old one', () {
      final s = DiscoveryStore();
      final a = s.addIdea(card('sci-phy-01'), 'ไอเดียแรกของผมเรื่องหลังคาเย็น');
      expect(s.activeIdea, isNull);
      s.setActiveIdea(a.id);
      final b = s.addIdea(card('sci-phy-02'), 'ไอเดียที่สองเรื่องฝุ่นบนแผงโซลาร์');
      s.setActiveIdea(b.id);
      expect(s.activeIdea!.id, b.id);
      expect(s.ideas.map((i) => i.id), containsAll([a.id, b.id]));
    });
  });

  group('sync (ADR 0008)', () {
    test('two devices merge additions, removals propagate, and offline changes are kept', () async {
      final server = FakeRemote();
      var t = DateTime.utc(2026, 11, 9, 10);
      final phone = DiscoveryStore()..clock = () => t = t.add(const Duration(seconds: 1));
      final web = DiscoveryStore()..clock = () => t = t.add(const Duration(seconds: 1));
      final a = card('sci-phy-01'), b = card('sci-phy-03'), c = card('sci-phy-04');

      phone.swipe(a, like: true);
      web.swipe(b, like: true);
      await phone.sync(server);
      await web.sync(server);
      await phone.sync(server);
      expect(phone.shortlist.map((x) => x.id), unorderedEquals([a.id, b.id]));
      expect(web.shortlist.map((x) => x.id), unorderedEquals([a.id, b.id]));

      // Removing on the phone must not be undone by the web's older copy.
      phone.removeFromShortlist(a.id);
      await phone.sync(server);
      await web.sync(server);
      expect(web.shortlist.map((x) => x.id), [b.id]);

      // Offline: the change stays dirty and is pushed later.
      server.offline = true;
      phone.swipe(c, like: true);
      await expectLater(phone.sync(server), throwsException);
      server.offline = false;
      await phone.sync(server);
      await web.sync(server);
      expect(web.shortlist.map((x) => x.id), unorderedEquals([b.id, c.id]));
    });

    test('state survives a restart and clearLocal wipes the device only', () async {
      final s = DiscoveryStore();
      s.swipe(card('sci-phy-01'), like: true);
      await Future<void>.delayed(Duration.zero);
      final restarted = DiscoveryStore();
      await restarted.load();
      expect(restarted.shortlist.single.id, 'sci-phy-01');
      await restarted.clearLocal();
      final again = DiscoveryStore();
      await again.load();
      expect(again.shortlist, isEmpty);
    });
  });
}
