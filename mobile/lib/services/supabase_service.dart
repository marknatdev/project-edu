import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseService {
  static const String supabaseUrl = 'https://ppctndzkerwiokjfaklw.supabase.co';
  static const String supabasePublishableKey =
      'sb_publishable_HpiLFJtAjz9ww2FK2K5MCw_MnJlKcp2';

  static SupabaseClient get client => Supabase.instance.client;

  static bool _isInitialized = false;
  static bool get isInitialized => _isInitialized;

  /// Bumped on every sign-in/sign-out so the UI can rebuild (ADR 0007: the app requires sign-in).
  static final ValueNotifier<int> authVersion = ValueNotifier(0);
  static StreamSubscription<AuthState>? _authSub;

  /// Test seam: when set, stands in for the signed-in user's id (null = signed out).
  @visibleForTesting
  static String? Function()? userIdOverride;

  static Future<void> initialize() async {
    if (_isInitialized) return;
    try {
      await Supabase.initialize(
        url: supabaseUrl,
        publishableKey: supabasePublishableKey,
        debug: kDebugMode,
      );
      _isInitialized = true;
      _authSub = client.auth.onAuthStateChange.listen((_) => authVersion.value++);
    } catch (e) {
      debugPrint('Supabase init warning: $e');
    }
  }

  // Auth Helpers
  static User? get currentUser => _isInitialized ? client.auth.currentUser : null;
  static Session? get currentSession => _isInitialized ? client.auth.currentSession : null;
  static String? get currentUserId => userIdOverride != null ? userIdOverride!() : currentUser?.id;
  static bool get isAuthenticated => currentUserId != null;

  static Future<void> signInWithGoogle() async {
    if (!_isInitialized) await initialize();
    await client.auth.signInWithOAuth(
      OAuthProvider.google,
      redirectTo: 'com.marknatdev.projectedumobile://login-callback',
    );
  }

  static Future<void> signOut() async {
    if (userIdOverride != null) {
      userIdOverride = () => null;
      authVersion.value++;
      return;
    }
    if (!_isInitialized) return;
    await client.auth.signOut();
  }

  @visibleForTesting
  static void disposeForTest() => _authSub?.cancel();
}
