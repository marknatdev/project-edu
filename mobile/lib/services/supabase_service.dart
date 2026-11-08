import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseService {
  static const String supabaseUrl = 'https://ppctndzkerwiokjfaklw.supabase.co';
  static const String supabasePublishableKey =
      'sb_publishable_HpiLFJtAjz9ww2FK2K5MCw_MnJlKcp2';

  static SupabaseClient get client => Supabase.instance.client;

  static bool _isInitialized = false;
  static bool get isInitialized => _isInitialized;

  static Future<void> initialize() async {
    if (_isInitialized) return;
    try {
      await Supabase.initialize(
        url: supabaseUrl,
        publishableKey: supabasePublishableKey,
        debug: kDebugMode,
      );
      _isInitialized = true;
    } catch (e) {
      debugPrint('Supabase init warning: $e');
    }
  }

  // Auth Helpers
  static User? get currentUser => _isInitialized ? client.auth.currentUser : null;
  static Session? get currentSession => _isInitialized ? client.auth.currentSession : null;
  static bool get isAuthenticated => currentUser != null;

  static Future<void> signInWithGoogle() async {
    if (!_isInitialized) await initialize();
    await client.auth.signInWithOAuth(
      OAuthProvider.google,
      redirectTo: 'com.marknatdev.projectedumobile://login-callback',
    );
  }

  static Future<void> signInWithApple() async {
    if (!_isInitialized) await initialize();
    await client.auth.signInWithOAuth(
      OAuthProvider.apple,
      redirectTo: 'com.marknatdev.projectedumobile://login-callback',
    );
  }

  static Future<void> signOut() async {
    if (!_isInitialized) return;
    await client.auth.signOut();
  }
}
