import 'package:shared_preferences/shared_preferences.dart';
import '../discovery/discovery_store.dart';
import '../models/learner_state.dart';

/// ADR 0007: device-local data belongs to the last account that signed in on this device.
/// The first sign-in (including data left from the old Guest mode) and any switch to a different
/// account start from a clean device; the same account signing back in keeps its local data.
class AccountScope {
  static const _ownerKey = 'device_owner_uid_v1';

  static Future<void> enter(String uid, LearnerState learner, DiscoveryStore discovery) async {
    final prefs = await SharedPreferences.getInstance();
    if (prefs.getString(_ownerKey) != uid) {
      await learner.clearAllAccountData();
      await discovery.clearLocal();
      await prefs.setString(_ownerKey, uid);
    }
  }
}
