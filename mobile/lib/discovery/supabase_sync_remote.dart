import 'package:supabase_flutter/supabase_flutter.dart';
import 'discovery_store.dart';

/// Real sync adapter: calls the edu_discovery_* RPCs (supabase/migrations/202611090001_discovery_sync.sql)
/// with the signed-in learner's JWT. The server scopes every row to auth.uid().
class SupabaseDiscoverySyncRemote implements DiscoverySyncRemote {
  final SupabaseClient client;
  SupabaseDiscoverySyncRemote(this.client);

  @override
  Future<void> push(List<SyncItem> items) async {
    // The server accepts at most 500 items per call.
    for (var i = 0; i < items.length; i += 500) {
      final batch = items.sublist(i, i + 500 > items.length ? items.length : i + 500);
      await client.rpc('edu_discovery_push', params: {
        'p_items': [
          for (final it in batch)
            {
              'kind': it.kind,
              'itemId': it.itemId,
              'payload': it.payload,
              'deleted': it.deleted,
              'updatedAt': it.updatedAt.toUtc().toIso8601String(),
            },
        ],
      });
    }
  }

  @override
  Future<SyncPull> pull(String? cursor) async {
    final items = <SyncItem>[];
    var after = int.tryParse(cursor ?? '') ?? 0;
    while (true) {
      final page = (await client.rpc('edu_discovery_pull', params: {'p_after': after, 'p_limit': 500})) as Map<String, dynamic>;
      final rows = (page['items'] as List).cast<Map<String, dynamic>>();
      for (final r in rows) {
        items.add(SyncItem(
          kind: r['kind'] as String,
          itemId: r['itemId'] as String,
          payload: (r['payload'] as Map).cast<String, dynamic>(),
          deleted: r['deleted'] as bool,
          updatedAt: DateTime.parse(r['updatedAt'] as String).toUtc(),
        ));
      }
      if (rows.length < 500 || page['cursor'] == null) {
        if (page['cursor'] != null) after = (page['cursor'] as num).toInt();
        break;
      }
      after = (page['cursor'] as num).toInt();
    }
    return SyncPull(items, after == 0 ? cursor : '$after');
  }
}
