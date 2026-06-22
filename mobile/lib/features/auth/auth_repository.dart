import 'package:dio/dio.dart';
import '../../core/api_client.dart';
import '../../core/secure_storage.dart';

class AuthRepository {
  final Dio _dio = ApiClient.instance;

  Future<void> login(String username, String password) async {
    final resp = await _dio.post('/auth/login', data: {
      'username': username,
      'password': password,
    });

    final accessToken = resp.data['access_token'] as String;
    final refreshToken = resp.data['refresh_token'] as String;

    // Decode role from JWT payload (middle segment, base64)
    final parts = accessToken.split('.');
    if (parts.length != 3) throw Exception('Invalid token format');
    final payload = String.fromCharCodes(
      base64Decode(_normalizeBase64(parts[1])),
    );
    final Map<String, dynamic> claims = _parseJson(payload);
    final role = claims['role'] as String? ?? 'STAFF';

    await SecureStorageService.saveTokens(
      accessToken: accessToken,
      refreshToken: refreshToken,
      username: username,
      role: role,
    );
  }

  Future<void> logout() => SecureStorageService.clearAll();

  Future<bool> isLoggedIn() => SecureStorageService.hasTokens();

  String _normalizeBase64(String s) {
    var str = s.replaceAll('-', '+').replaceAll('_', '/');
    while (str.length % 4 != 0) {
      str += '=';
    }
    return str;
  }

  Map<String, dynamic> _parseJson(String json) {
    // Simple JSON parse - safe for JWT payload
    final pairs = <String, dynamic>{};
    final content = json.trim().replaceAll(RegExp(r'^\{|\}$'), '');
    for (final pair in content.split(',')) {
      final kv = pair.split(':');
      if (kv.length >= 2) {
        final key = kv[0].trim().replaceAll('"', '');
        final val = kv.sublist(1).join(':').trim().replaceAll('"', '');
        pairs[key] = val;
      }
    }
    return pairs;
  }
}

List<int> base64Decode(String s) {
  final bytes = <int>[];
  final table = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  var i = 0;
  while (i < s.length) {
    final b0 = table.indexOf(s[i++]);
    final b1 = table.indexOf(s[i++]);
    final b2 = i < s.length && s[i] != '=' ? table.indexOf(s[i++]) : -1;
    final b3 = i < s.length && s[i] != '=' ? table.indexOf(s[i++]) : -1;
    if (b0 >= 0 && b1 >= 0) bytes.add((b0 << 2) | (b1 >> 4));
    if (b2 >= 0) bytes.add(((b1 & 0xF) << 4) | (b2 >> 2));
    if (b3 >= 0) bytes.add(((b2 & 0x3) << 6) | b3);
  }
  return bytes;
}
