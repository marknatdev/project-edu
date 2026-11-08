import 'package:flutter/foundation.dart';
import 'package:shorebird_code_push/shorebird_code_push.dart';

/// Service managing Over-The-Air (OTA) updates using Shorebird CodePush.
/// Allows Dart code and asset updates without reinstalling .ipa / .apk.
class CodePushService {
  static final ShorebirdUpdater _updater = ShorebirdUpdater();
  static bool _isChecking = false;

  /// Check for and download updates in background on app startup.
  static Future<void> checkForUpdatesInBackground() async {
    if (_isChecking) return;
    _isChecking = true;

    try {
      if (!_updater.isAvailable) {
        debugPrint('[CodePush] Shorebird updater is not available (debug or standard Flutter build).');
        return;
      }

      final status = await _updater.checkForUpdate();
      if (status == UpdateStatus.outdated) {
        debugPrint('[CodePush] New OTA patch detected. Downloading update...');
        await _updater.update();
        debugPrint('[CodePush] OTA patch downloaded. Next app restart will run updated code.');
      } else if (status == UpdateStatus.restartRequired) {
        debugPrint('[CodePush] Restart required to apply already-downloaded patch.');
      } else {
        debugPrint('[CodePush] App is up to date.');
      }
    } catch (e) {
      debugPrint('[CodePush] Check failed: $e');
    } finally {
      _isChecking = false;
    }
  }

  /// Get current running patch number (null if base binary or debug mode).
  static Future<int?> getCurrentPatchNumber() async {
    try {
      if (!_updater.isAvailable) return null;
      final patch = await _updater.readCurrentPatch();
      return patch?.number;
    } catch (e) {
      return null;
    }
  }
}
