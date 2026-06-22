import 'dart:math';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:dio/dio.dart';
import '../../core/api_client.dart';
import '../../shared/utils/mock_location_detector.dart';
import 'challenge_widget.dart';

class ScannerScreen extends StatefulWidget {
  const ScannerScreen({super.key});

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> {
  final MobileScannerController _scannerCtrl = MobileScannerController();
  bool _isProcessing = false;
  String? _lastResult;
  bool _lastSuccess = false;

  static const _chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  String _generateChallenge() => _chars[Random.secure().nextInt(_chars.length)];

  void _onBarcodeDetected(BarcodeCapture capture) {
    if (_isProcessing) return; // Block all scans while processing
    final rawValue = capture.barcodes.firstOrNull?.rawValue;
    if (rawValue == null || rawValue.isEmpty) return;

    _isProcessing = true;
    _handleScan(rawValue);
  }

  Future<void> _handleScan(String qrCodeId) async {
    final challenge = _generateChallenge();

    final passed = await showModalBottomSheet<bool>(
      context: context,
      isDismissible: false,
      enableDrag: false,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => ChallengeWidget(initialChallenge: challenge),
    );

    if (!mounted) return;

    if (passed != true) {
      setState(() { _isProcessing = false; });
      return;
    }

    await _captureAndSubmit(qrCodeId);
  }

  Future<void> _captureAndSubmit(String qrCodeId) async {
    setState(() { _lastResult = 'Đang lấy vị trí GPS...'; _lastSuccess = false; });

    try {
      final position = await MockLocationDetector.getVerifiedLocation();

      setState(() { _lastResult = 'Đang gửi dữ liệu...'; });

      await ApiClient.instance.post('/api/scan', data: {
        'qr_code_id': qrCodeId,
        'latitude': position.latitude,
        'longitude': position.longitude,
      });

      setState(() {
        _lastResult = 'Quét thành công!\n'
            'QR: $qrCodeId\n'
            'GPS: ${position.latitude.toStringAsFixed(6)}, ${position.longitude.toStringAsFixed(6)}';
        _lastSuccess = true;
      });
    } on MockLocationException catch (e) {
      _showError(e.message);
    } on DioException catch (e) {
      _showError(e.response?.data?['detail'] ?? 'Lỗi kết nối server');
    } catch (e) {
      _showError('Lỗi: $e');
    } finally {
      if (mounted) setState(() { _isProcessing = false; });
    }
  }

  void _showError(String msg) {
    setState(() { _lastResult = msg; _lastSuccess = false; });
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg), backgroundColor: Colors.red.shade700),
      );
    }
  }

  @override
  void dispose() {
    _scannerCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Quét Mã QR'),
        backgroundColor: const Color(0xFF2563EB),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.flash_on),
            onPressed: () => _scannerCtrl.toggleTorch(),
            tooltip: 'Đèn pin',
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            flex: 3,
            child: Stack(
              children: [
                MobileScanner(
                  controller: _scannerCtrl,
                  onDetect: _onBarcodeDetected,
                ),
                // Scan overlay guide
                Center(
                  child: Container(
                    width: 250,
                    height: 250,
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.white, width: 2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
                if (_isProcessing)
                  Container(
                    color: Colors.black38,
                    child: const Center(
                      child: CircularProgressIndicator(color: Colors.white),
                    ),
                  ),
              ],
            ),
          ),

          // Result panel
          Expanded(
            flex: 1,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              color: Colors.white,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Kết quả gần nhất:',
                    style: TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                  const SizedBox(height: 8),
                  if (_lastResult != null)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _lastSuccess ? Colors.green.shade50 : Colors.orange.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: _lastSuccess ? Colors.green.shade200 : Colors.orange.shade200,
                        ),
                      ),
                      child: Text(
                        _lastResult!,
                        style: TextStyle(
                          fontSize: 13,
                          color: _lastSuccess ? Colors.green.shade800 : Colors.orange.shade800,
                        ),
                      ),
                    )
                  else
                    const Text(
                      'Hướng camera vào mã QR để bắt đầu',
                      style: TextStyle(color: Colors.grey),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
