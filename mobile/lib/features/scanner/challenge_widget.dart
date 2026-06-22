import 'dart:math';
import 'package:flutter/material.dart';

class ChallengeWidget extends StatefulWidget {
  final String initialChallenge;

  const ChallengeWidget({required this.initialChallenge, super.key});

  @override
  State<ChallengeWidget> createState() => _ChallengeWidgetState();
}

class _ChallengeWidgetState extends State<ChallengeWidget> {
  late String _challenge;
  final _controller = TextEditingController();
  String? _error;

  static const _chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Loại 0,O,1,I

  @override
  void initState() {
    super.initState();
    _challenge = widget.initialChallenge;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _submit() {
    final input = _controller.text.trim().toUpperCase();
    if (input == _challenge) {
      Navigator.of(context).pop(true); // Đúng → tiếp tục
    } else {
      // Sinh challenge MỚI sau mỗi lần sai
      setState(() {
        _challenge = _chars[Random.secure().nextInt(_chars.length)];
        _controller.clear();
        _error = 'Sai ký tự. Vui lòng nhập ký tự mới bên dưới.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 24),

          const Text(
            'Xác nhận bạn đang ở hiện trường',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          const Text(
            'Nhập ký tự sau để tiếp tục:',
            style: TextStyle(color: Colors.grey),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),

          // Large challenge character display
          Container(
            width: 120,
            height: 120,
            decoration: BoxDecoration(
              color: const Color(0xFF2563EB),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Center(
              child: Text(
                _challenge,
                style: const TextStyle(
                  fontSize: 72,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                  fontFamily: 'monospace',
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),

          if (_error != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.red.shade200),
              ),
              child: Text(
                _error!,
                style: TextStyle(color: Colors.red.shade700, fontSize: 13),
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(height: 12),
          ],

          TextField(
            controller: _controller,
            autofocus: true,
            textCapitalization: TextCapitalization.characters,
            maxLength: 1,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              letterSpacing: 4,
              fontFamily: 'monospace',
            ),
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              counterText: '',
              hintText: '_',
            ),
            onChanged: (v) {
              if (v.length == 1) _submit(); // Auto-submit when 1 char typed
            },
          ),
          const SizedBox(height: 16),

          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  child: const Text('Hủy'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('Xác nhận'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
