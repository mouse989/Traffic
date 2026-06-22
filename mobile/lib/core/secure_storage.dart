import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'constants.dart';

class SecureStorageService {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  static Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
    required String username,
    required String role,
  }) async {
    await Future.wait([
      _storage.write(key: AppConstants.tokenKey, value: accessToken),
      _storage.write(key: AppConstants.refreshTokenKey, value: refreshToken),
      _storage.write(key: AppConstants.usernameKey, value: username),
      _storage.write(key: AppConstants.roleKey, value: role),
    ]);
  }

  static Future<String?> getAccessToken() =>
      _storage.read(key: AppConstants.tokenKey);

  static Future<String?> getRefreshToken() =>
      _storage.read(key: AppConstants.refreshTokenKey);

  static Future<String?> getUsername() =>
      _storage.read(key: AppConstants.usernameKey);

  static Future<String?> getRole() =>
      _storage.read(key: AppConstants.roleKey);

  static Future<void> clearAll() => _storage.deleteAll();

  static Future<bool> hasTokens() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }
}
