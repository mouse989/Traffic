import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../core/secure_storage.dart';
import '../features/auth/login_screen.dart';
import '../features/scanner/scanner_screen.dart';

final router = GoRouter(
  initialLocation: '/scanner',
  redirect: (context, state) async {
    final isLoggedIn = await SecureStorageService.hasTokens();
    final isOnLogin = state.matchedLocation == '/login';
    if (!isLoggedIn && !isOnLogin) return '/login';
    if (isLoggedIn && isOnLogin) return '/scanner';
    return null;
  },
  routes: [
    GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
    GoRoute(path: '/scanner', builder: (_, __) => const ScannerScreen()),
  ],
);
