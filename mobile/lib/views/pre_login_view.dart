import 'package:flutter/material.dart';

class PreLoginView extends StatelessWidget {
  final VoidCallback onLoginSuccess;

  const PreLoginView({super.key, required this.onLoginSuccess});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28.0, vertical: 20.0),
          child: Column(
            children: [
              const SizedBox(height: 16),

              // Brand Logo & Title
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: const Color(0xFFFF6D00).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Center(
                      child: Text(
                        'A',
                        style: TextStyle(
                          color: Color(0xFFFF6D00),
                          fontWeight: FontWeight.w900,
                          fontSize: 22,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'AIITCAS',
                    style: TextStyle(
                      color: Color(0xFFFF6D00),
                      fontWeight: FontWeight.w900,
                      fontSize: 24,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),

              const Spacer(),

              // Isometric Spatial Net Folding Blueprint
              CustomPaint(
                size: const Size(180, 180),
                painter: _SpatialNetPainter(),
              ),

              const Spacer(),

              // OAuth Social Buttons (Black Pills)
              _SocialButton(
                icon: const Text('G', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: Colors.blue)),
                label: 'ดำเนินการต่อด้วย Google',
                onTap: onLoginSuccess,
              ),
              const SizedBox(height: 12),
              _SocialButton(
                icon: const Icon(Icons.apple, color: Colors.white, size: 22),
                label: 'Continue with Apple',
                onTap: onLoginSuccess,
              ),

              const SizedBox(height: 16),

              // Divider "หรือ"
              Row(
                children: const [
                  Expanded(child: Divider(color: Color(0xFFE2E8F0))),
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 14),
                    child: Text('หรือ', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13)),
                  ),
                  Expanded(child: Divider(color: Color(0xFFE2E8F0))),
                ],
              ),

              const SizedBox(height: 16),

              // Staff Login Button
              OutlinedButton.icon(
                onPressed: onLoginSuccess,
                icon: const Icon(Icons.person_outline_rounded, color: Color(0xFF334155), size: 18),
                label: const Text(
                  'เข้าสู่ระบบสำหรับเจ้าหน้าที่',
                  style: TextStyle(color: Color(0xFF334155), fontWeight: FontWeight.w600, fontSize: 14),
                ),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(48),
                  side: const BorderSide(color: Color(0xFFCBD5E1)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9999)),
                ),
              ),

              const SizedBox(height: 14),

              // Invite code & Login help
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: const [
                  Text('🏷️ ', style: TextStyle(fontSize: 13)),
                  Text(
                    'ฉันมี code เชิญจากเพื่อน',
                    style: TextStyle(
                      color: Color(0xFFFF6D00),
                      fontSize: 13,
                      decoration: TextDecoration.underline,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              const Text(
                'login ไม่ได้',
                style: TextStyle(
                  color: Color(0xFFFF6D00),
                  fontSize: 13,
                  decoration: TextDecoration.underline,
                ),
              ),

              const SizedBox(height: 24),

              // Legal / Terms Notice
              const Text(
                'เมื่อดำเนินการต่อ ถือว่าคุณยินยอมตาม ข้อกำหนดการใช้งาน และรับทราบ นโยบายความเป็นส่วนตัว ของ AIITCAS',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 11,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }
}

class _SocialButton extends StatelessWidget {
  final Widget icon;
  final String label;
  final VoidCallback onTap;

  const _SocialButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: onTap,
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(48),
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9999)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          icon,
          const SizedBox(width: 10),
          Text(
            label,
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14.5),
          ),
        ],
      ),
    );
  }
}

// Paints the 3D Net / Box Folding Blueprint
class _SpatialNetPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF1D39C4)
      ..strokeWidth = 2.0
      ..style = PaintingStyle.stroke;

    final fillPaint = Paint()
      ..color = const Color(0xFF2F54EB).withValues(alpha: 0.08)
      ..style = PaintingStyle.fill;

    final u = size.width / 4; // grid unit

    // 4 vertical / horizontal cross squares (unfolded box net)
    final squares = [
      Rect.fromLTWH(u, 0, u, u),      // top flap
      Rect.fromLTWH(0, u, u, u),      // left flap
      Rect.fromLTWH(u, u, u, u),      // center square
      Rect.fromLTWH(u * 2, u, u, u),  // right flap 1
      Rect.fromLTWH(u * 3, u, u, u),  // right flap 2
      Rect.fromLTWH(u, u * 2, u, u),  // bottom flap
    ];

    for (final rect in squares) {
      canvas.drawRect(rect, fillPaint);
      canvas.drawRect(rect, paint);
    }

    // Direction arrows
    final arrowPaint = Paint()
      ..color = const Color(0xFF1D39C4)
      ..strokeWidth = 2.0
      ..style = PaintingStyle.stroke;

    // Up arrow in top flap
    canvas.drawLine(Offset(u * 1.5, u * 0.8), Offset(u * 1.5, u * 0.2), arrowPaint);
    canvas.drawLine(Offset(u * 1.5, u * 0.2), Offset(u * 1.3, u * 0.4), arrowPaint);
    canvas.drawLine(Offset(u * 1.5, u * 0.2), Offset(u * 1.7, u * 0.4), arrowPaint);

    // Left arrow in left flap
    canvas.drawLine(Offset(u * 0.8, u * 1.5), Offset(u * 0.2, u * 1.5), arrowPaint);
    canvas.drawLine(Offset(u * 0.2, u * 1.5), Offset(u * 0.4, u * 1.3), arrowPaint);
    canvas.drawLine(Offset(u * 0.2, u * 1.5), Offset(u * 0.4, u * 1.7), arrowPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
