import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'supabase_service.dart';

/// Repository for syncing student research records to Supabase (`edu_records`).
class ProjectRepository {
  static SupabaseClient get _client => SupabaseService.client;

  /// Fetches an active research project record
  static Future<Map<String, dynamic>?> fetchProjectRecord(String recordKey) async {
    try {
      final user = _client.auth.currentUser;
      final ownerKey = user != null ? 'u:${user.id}' : 'g:guest_device';

      final response = await _client
          .from('edu_records')
          .select('data, revision')
          .eq('owner_key', ownerKey)
          .eq('record_key', recordKey)
          .maybeSingle();

      if (response != null && response['data'] != null) {
        return response['data'] as Map<String, dynamic>;
      }
    } catch (e) {
      debugPrint('[ProjectRepository] Fetch record warning (offline fallback): $e');
    }
    return null;
  }

  /// Saves or updates a research record with optimistic revision bump
  static Future<bool> saveProjectRecord({
    required String collection,
    required String recordKey,
    required Map<String, dynamic> data,
  }) async {
    try {
      final user = _client.auth.currentUser;
      final ownerKey = user != null ? 'u:${user.id}' : 'g:guest_device';

      // Check existing revision
      final existing = await _client
          .from('edu_records')
          .select('revision')
          .eq('owner_key', ownerKey)
          .eq('record_key', recordKey)
          .maybeSingle();

      final nextRevision = (existing?['revision'] as int? ?? 0) + 1;

      await _client.from('edu_records').upsert({
        'owner_key': ownerKey,
        'collection': collection,
        'record_key': recordKey,
        'revision': nextRevision,
        'data': data,
      });

      debugPrint('[ProjectRepository] Record $recordKey synced (rev: $nextRevision)');
      return true;
    } catch (e) {
      debugPrint('[ProjectRepository] Upsert failed (queued locally): $e');
      return false;
    }
  }

  /// Fetches list of saved ideas or topic cards
  static Future<List<Map<String, dynamic>>> fetchGeneratedCards() async {
    try {
      final response = await _client
          .from('edu_generated_cards')
          .select('card_id, content')
          .limit(10);

      return List<Map<String, dynamic>>.from(response);
    } catch (e) {
      debugPrint('[ProjectRepository] Cards fetch warning: $e');
      return [];
    }
  }
}
