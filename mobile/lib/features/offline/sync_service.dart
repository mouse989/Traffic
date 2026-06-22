import 'package:connectivity_plus/connectivity_plus.dart';
import '../../core/api_client.dart';
import 'local_storage.dart';

class SyncService {
  final LocalDatabase _db;
  bool _isSyncing = false;

  SyncService(this._db) {
    // Listen for network reconnection and auto-sync
    Connectivity().onConnectivityChanged.listen((result) {
      if (result != ConnectivityResult.none) {
        syncPending();
      }
    });
  }

  Future<void> syncPending() async {
    if (_isSyncing) return;
    _isSyncing = true;

    try {
      final pending = await _db.getUnsynced();
      for (final scan in pending) {
        try {
          await ApiClient.instance.post('/api/scan', data: {
            'qr_code_id': scan.qrCodeId,
            'latitude': scan.latitude,
            'longitude': scan.longitude,
          });
          await _db.markSynced(scan.id);
        } catch (_) {
          await _db.incrementRetry(scan.id);
        }
      }
    } finally {
      _isSyncing = false;
    }
  }
}
