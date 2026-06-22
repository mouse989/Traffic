import 'dart:io';
import 'package:geolocator/geolocator.dart';

class MockLocationException implements Exception {
  final String message;
  MockLocationException(this.message);

  @override
  String toString() => 'MockLocationException: $message';
}

class MockLocationDetector {
  static Future<Position> getVerifiedLocation() async {
    final permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      final requested = await Geolocator.requestPermission();
      if (requested == LocationPermission.denied ||
          requested == LocationPermission.deniedForever) {
        throw Exception('Quyền truy cập vị trí bị từ chối');
      }
    }

    final position = await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.best,
      timeLimit: const Duration(seconds: 20),
    );

    // Android: OS-level mock detection via Location.isFromMockProvider()
    if (Platform.isAndroid && position.isMocked) {
      throw MockLocationException(
        'Phát hiện GPS giả (Mock Location). Vui lòng tắt ứng dụng fake GPS.',
      );
    }

    // Heuristic for iOS and additional Android check:
    // Real GPS never reports exactly 0.0 meters accuracy
    if (position.accuracy == 0.0) {
      throw MockLocationException(
        'Độ chính xác GPS bất thường (0.0m). Có thể đang dùng fake GPS.',
      );
    }

    return position;
  }
}
