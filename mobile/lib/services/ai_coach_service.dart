import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'supabase_service.dart';

/// Thrown when the learner is not signed in; the AI Coach requires a Google account.
class AiCoachAuthRequired implements Exception {}

/// Calls the `ai-coach` Supabase Edge Function. The AI gateway key, URL, model and
/// system prompts live only on the server (supabase/functions/ai-coach).
class AiCoachService {
  /// HTTP seam; tests swap in `MockClient` from `package:http/testing.dart`.
  @visibleForTesting
  static http.Client client = http.Client();

  /// Access-token seam; returns null when nobody is signed in.
  @visibleForTesting
  static Future<String?> Function() accessToken = () async => SupabaseService.currentSession?.accessToken;

  static Uri get _endpoint => Uri.parse('${SupabaseService.supabaseUrl}/functions/v1/ai-coach');

  static Future<bool> get isSignedIn async => (await accessToken()) != null;

  /// Sends one coaching turn. [conversationHistory] holds the earlier turns only.
  static Future<String> askCoach({
    required String userMessage,
    List<Map<String, String>> conversationHistory = const [],
    bool isSrcSession = false,
  }) async {
    final token = await accessToken();
    if (token == null) throw AiCoachAuthRequired();

    // The server caps history at 20 turns; send the most recent ones.
    final history = conversationHistory.length > 20
        ? conversationHistory.sublist(conversationHistory.length - 20)
        : conversationHistory;

    final response = await client
        .post(
          _endpoint,
          headers: {
            'Authorization': 'Bearer $token',
            'apikey': SupabaseService.supabasePublishableKey,
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: json.encode({
            'mode': isSrcSession ? 'src' : 'socratic',
            'history': history,
            'message': userMessage,
          }),
        )
        .timeout(const Duration(seconds: 30));

    if (response.statusCode == 401) throw AiCoachAuthRequired();
    if (response.statusCode != 200) {
      throw Exception('ai-coach HTTP ${response.statusCode}');
    }
    final decoded = json.decode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>;
    return decoded['reply'] as String;
  }
}
