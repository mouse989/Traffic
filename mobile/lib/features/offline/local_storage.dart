import 'dart:io';
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

part 'local_storage.g.dart';

class PendingScans extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get qrCodeId => text()();
  RealColumn get latitude => real()();
  RealColumn get longitude => real()();
  TextColumn get scannedAt => text()();  // ISO timestamp captured at scan time
  IntColumn get retryCount => integer().withDefault(const Constant(0))();
  BoolColumn get synced => boolean().withDefault(const Constant(false))();
}

@DriftDatabase(tables: [PendingScans])
class LocalDatabase extends _$LocalDatabase {
  LocalDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 1;

  Future<int> insertPendingScan({
    required String qrCodeId,
    required double latitude,
    required double longitude,
  }) {
    return into(pendingScans).insert(PendingScansCompanion.insert(
      qrCodeId: qrCodeId,
      latitude: latitude,
      longitude: longitude,
      scannedAt: DateTime.now().toIso8601String(),
    ));
  }

  Future<List<PendingScan>> getUnsynced() {
    return (select(pendingScans)
      ..where((t) => t.synced.equals(false))
      ..where((t) => t.retryCount.isSmallerThanValue(5))
      ..orderBy([(t) => OrderingTerm.asc(t.id)]))
        .get();
  }

  Future<void> markSynced(int id) {
    return (update(pendingScans)..where((t) => t.id.equals(id)))
        .write(const PendingScansCompanion(synced: Value(true)));
  }

  Future<void> incrementRetry(int id) {
    return customUpdate(
      'UPDATE pending_scans SET retry_count = retry_count + 1 WHERE id = ?',
      variables: [Variable.withInt(id)],
    );
  }
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dir = await getApplicationDocumentsDirectory();
    final file = File(p.join(dir.path, 'traffic_offline.db'));
    return NativeDatabase.createInBackground(file);
  });
}
