// Discovery Track state: swipes, Shortlist, Ideas, the Active Idea and AI cards.
// Everything is a SyncItem keyed by kind + itemId so it can sync with the account (ADR 0008):
// additions from every device are kept, removals are synced as tombstones, newest action wins.
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'catalog.dart';
import 'catalog.g.dart';

const int shortlistLimit = 5;

class SyncItem {
  /// 'swipe' | 'shortlist' | 'idea' | 'active_idea' | 'ai_card'.
  final String kind;
  final String itemId;
  final Map<String, dynamic> payload;
  final bool deleted;
  final DateTime updatedAt;

  /// Changed on this device and not yet pushed.
  final bool dirty;

  const SyncItem({
    required this.kind,
    required this.itemId,
    this.payload = const {},
    this.deleted = false,
    required this.updatedAt,
    this.dirty = false,
  });

  String get key => '$kind:$itemId';

  SyncItem copyWith({Map<String, dynamic>? payload, bool? deleted, DateTime? updatedAt, bool? dirty}) => SyncItem(
        kind: kind,
        itemId: itemId,
        payload: payload ?? this.payload,
        deleted: deleted ?? this.deleted,
        updatedAt: updatedAt ?? this.updatedAt,
        dirty: dirty ?? this.dirty,
      );

  Map<String, dynamic> toJson() => {
        'kind': kind,
        'itemId': itemId,
        'payload': payload,
        'deleted': deleted,
        'updatedAt': updatedAt.toUtc().toIso8601String(),
        'dirty': dirty,
      };

  factory SyncItem.fromJson(Map<String, dynamic> j) => SyncItem(
        kind: j['kind'] as String,
        itemId: j['itemId'] as String,
        payload: (j['payload'] as Map?)?.cast<String, dynamic>() ?? const {},
        deleted: j['deleted'] as bool? ?? false,
        updatedAt: DateTime.parse(j['updatedAt'] as String),
        dirty: j['dirty'] as bool? ?? false,
      );
}

/// ADR 0008: newest action wins per item; on a tie the removal wins so a removed card does not come back.
SyncItem mergeItem(SyncItem? local, SyncItem remote) {
  if (local == null) return remote.copyWith(dirty: false);
  final cmp = remote.updatedAt.compareTo(local.updatedAt);
  if (cmp > 0 || (cmp == 0 && remote.deleted && !local.deleted)) return remote.copyWith(dirty: false);
  return local;
}

/// One page of remote changes. [cursor] is a server-assigned position (not a device clock),
/// so items pushed late by a device with a skewed clock are still pulled.
class SyncPull {
  final List<SyncItem> items;
  final String? cursor;
  const SyncPull(this.items, this.cursor);
}

/// Remote side of the sync seam (real: Supabase; tests: in-memory fake).
abstract class DiscoverySyncRemote {
  Future<void> push(List<SyncItem> items);
  Future<SyncPull> pull(String? cursor);
}

class Idea {
  final String id;
  final String cardId;
  final String text;
  final DateTime createdAt;
  const Idea({required this.id, required this.cardId, required this.text, required this.createdAt});
}

enum SwipeResult { recorded, shortlistFull }

class DiscoveryStore extends ChangeNotifier {
  static const _prefsKey = 'discovery_items_v1';
  static const _pulledKey = 'discovery_last_pull_v1';

  @visibleForTesting
  DateTime Function() clock = () => DateTime.now().toUtc();

  final Map<String, SyncItem> _items = {};

  /// Each entry is one swipe: the keys it touched and what they held before.
  final List<List<(String, SyncItem?)>> _undo = [];
  List<(String, SyncItem?)>? _recording;
  String? _cursor;
  int _idCounter = 0;

  // ---- reads -------------------------------------------------------------

  Iterable<SyncItem> _live(String kind) => _items.values.where((i) => i.kind == kind && !i.deleted);

  List<DiscoveryCard> get aiCards => [for (final i in _live('ai_card')) DiscoveryCard.fromJson(i.payload)];

  DiscoveryCard? cardById(String id) {
    for (final c in discoveryCatalogCards) {
      if (c.id == id) return c;
    }
    for (final c in aiCards) {
      if (c.id == id) return c;
    }
    return null;
  }

  bool isSwiped(String cardId) => _items['swipe:$cardId']?.deleted == false;

  /// Unswiped cards for a subfield that suit the learner's grade level: catalog first, then AI cards.
  List<DiscoveryCard> deck(String subfieldId, String gradeLevel) => [
        ...discoveryCatalogCards,
        ...aiCards,
      ].where((c) => c.subfieldId == subfieldId && c.gradeLevels.contains(gradeLevel) && !isSwiped(c.id)).toList();

  int skippedCount(String subfieldId) => _live('swipe')
      .where((i) => i.payload['action'] == 'skip' && cardById(i.itemId)?.subfieldId == subfieldId)
      .length;

  /// May exceed [shortlistLimit] after merging devices; the learner trims it on the compare screen.
  List<DiscoveryCard> get shortlist {
    final items = _live('shortlist').toList()..sort((a, b) => a.updatedAt.compareTo(b.updatedAt));
    return [for (final i in items) ?cardById(i.itemId)];
  }

  bool get shortlistFull => shortlist.length >= shortlistLimit;

  List<Idea> get ideas {
    final list = [
      for (final i in _live('idea'))
        Idea(
          id: i.itemId,
          cardId: i.payload['cardId'] as String? ?? '',
          text: i.payload['text'] as String? ?? '',
          createdAt: DateTime.tryParse(i.payload['createdAt'] as String? ?? '') ?? i.updatedAt,
        ),
    ]..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return list;
  }

  Idea? get activeIdea {
    final id = _items['active_idea:current'];
    if (id == null || id.deleted) return null;
    for (final idea in ideas) {
      if (idea.id == id.payload['ideaId']) return idea;
    }
    return null;
  }

  bool get canUndo => _undo.isNotEmpty;

  // ---- writes ------------------------------------------------------------

  void _put(String kind, String itemId, {Map<String, dynamic> payload = const {}, bool deleted = false}) {
    final key = '$kind:$itemId';
    _recording?.add((key, _items[key]));
    _items[key] = SyncItem(kind: kind, itemId: itemId, payload: payload, deleted: deleted, updatedAt: clock(), dirty: true);
  }

  /// Skip or like the top card. A like when the Shortlist is full records nothing and returns
  /// [SwipeResult.shortlistFull]: the learner must compare and remove one first.
  SwipeResult swipe(DiscoveryCard card, {required bool like}) {
    if (like && shortlistFull) return SwipeResult.shortlistFull;
    _recording = [];
    _put('swipe', card.id, payload: {'action': like ? 'like' : 'skip'});
    if (like) _put('shortlist', card.id);
    _undo.add(_recording!);
    _recording = null;
    _changed();
    return SwipeResult.recorded;
  }

  /// Reverts the latest swipe (both its swipe and Shortlist entries).
  void undo() {
    if (!canUndo) return;
    for (final (key, previous) in _undo.removeLast().reversed) {
      // Reverting is itself a new action, so it must sync (a tombstone if nothing was there before).
      _items[key] = (previous ?? _items[key]!.copyWith(deleted: true)).copyWith(updatedAt: clock(), dirty: true);
    }
    _changed();
  }

  void removeFromShortlist(String cardId) {
    _put('shortlist', cardId, deleted: true);
    _changed();
  }

  /// Puts skipped cards of a subfield back into its deck.
  void reviewSkipped(String subfieldId) {
    for (final i in _live('swipe').toList()) {
      if (i.payload['action'] == 'skip' && cardById(i.itemId)?.subfieldId == subfieldId) {
        _put('swipe', i.itemId, deleted: true);
      }
    }
    _clearUndo();
    _changed();
  }

  void addAiCards(List<DiscoveryCard> cards) {
    for (final c in cards) {
      _put('ai_card', c.id, payload: c.toJson());
    }
    _changed();
  }

  /// Saves the learner's own-words idea for a card. Does not make it the Active Idea.
  Idea addIdea(DiscoveryCard card, String text) {
    final now = clock();
    final id = 'idea_${now.microsecondsSinceEpoch}_${++_idCounter}';
    _put('idea', id, payload: {'cardId': card.id, 'text': text.trim(), 'createdAt': now.toIso8601String()});
    _changed();
    return ideas.firstWhere((i) => i.id == id);
  }

  void setActiveIdea(String ideaId) {
    _put('active_idea', 'current', payload: {'ideaId': ideaId});
    _changed();
  }

  // ---- persistence & sync -----------------------------------------------

  void _clearUndo() => _undo.clear();

  void _changed() {
    notifyListeners();
    save();
  }

  Future<void> save() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList(_prefsKey, [for (final i in _items.values) jsonEncode(i.toJson())]);
      if (_cursor != null) await prefs.setString(_pulledKey, _cursor!);
    } catch (e) {
      debugPrint('discovery save failed: $e');
    }
  }

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    _items.clear();
    for (final s in prefs.getStringList(_prefsKey) ?? const <String>[]) {
      try {
        final item = SyncItem.fromJson(jsonDecode(s) as Map<String, dynamic>);
        _items[item.key] = item;
      } catch (_) {}
    }
    _cursor = prefs.getString(_pulledKey);
    _clearUndo();
    notifyListeners();
  }

  /// Removes everything on this device (account switch). Server data is untouched.
  Future<void> clearLocal() async {
    _items.clear();
    _cursor = null;
    _clearUndo();
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_prefsKey);
    await prefs.remove(_pulledKey);
  }

  /// Pushes local changes, then pulls and merges remote ones. Safe to call offline: it throws and
  /// leaves dirty items for the next attempt.
  Future<void> sync(DiscoverySyncRemote remote) async {
    final dirty = _items.values.where((i) => i.dirty).toList();
    if (dirty.isNotEmpty) {
      await remote.push(dirty);
      for (final d in dirty) {
        final now = _items[d.key];
        // Only clear the flag if nothing changed while the push was in flight.
        if (now != null && now.updatedAt == d.updatedAt) _items[d.key] = now.copyWith(dirty: false);
      }
    }
    final page = await remote.pull(_cursor);
    for (final r in page.items) {
      _items[r.key] = mergeItem(_items[r.key], r);
    }
    _cursor = page.cursor ?? _cursor;
    notifyListeners();
    await save();
  }
}
