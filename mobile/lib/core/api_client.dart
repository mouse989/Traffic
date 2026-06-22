import 'package:dio/dio.dart';
import 'constants.dart';
import 'secure_storage.dart';

class ApiClient {
  static final Dio _dio = _createDio();

  static Dio get instance => _dio;

  static Dio _createDio() {
    final dio = Dio(BaseOptions(
      baseUrl: AppConstants.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
    ));

    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await SecureStorageService.getAccessToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          try {
            final refreshToken = await SecureStorageService.getRefreshToken();
            if (refreshToken == null) throw Exception('No refresh token');

            final refreshDio = Dio(BaseOptions(baseUrl: AppConstants.apiBaseUrl));
            final resp = await refreshDio.post('/auth/refresh', data: {'refresh_token': refreshToken});

            final newAccess = resp.data['access_token'] as String;
            final newRefresh = resp.data['refresh_token'] as String;
            final username = await SecureStorageService.getUsername() ?? '';
            final role = await SecureStorageService.getRole() ?? 'STAFF';

            await SecureStorageService.saveTokens(
              accessToken: newAccess,
              refreshToken: newRefresh,
              username: username,
              role: role,
            );

            // Retry original request
            error.requestOptions.headers['Authorization'] = 'Bearer $newAccess';
            final retryResp = await dio.fetch(error.requestOptions);
            return handler.resolve(retryResp);
          } catch (_) {
            await SecureStorageService.clearAll();
            // Navigator redirect handled at app level via token watch
          }
        }
        handler.next(error);
      },
    ));

    return dio;
  }
}
