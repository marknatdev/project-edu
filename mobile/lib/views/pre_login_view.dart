import 'dart:async';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/supabase_service.dart';
import '../theme/app_theme.dart';

class PreLoginView extends StatefulWidget {
  final VoidCallback onLoginSuccess;

  const PreLoginView({super.key, required this.onLoginSuccess});

  @override
  State<PreLoginView> createState() => _PreLoginViewState();
}

class _PreLoginViewState extends State<PreLoginView> {
  bool _isLoading = false;
  StreamSubscription<AuthState>? _authSubscription;

  @override
  void initState() {
    super.initState();
    if (SupabaseService.isInitialized) {
      _authSubscription = SupabaseService.client.auth.onAuthStateChange.listen((data) {
        if (data.session != null && mounted) {
          widget.onLoginSuccess();
        }
      });
    }
  }

  @override
  void dispose() {
    _authSubscription?.cancel();
    super.dispose();
  }

  Future<void> _handleGoogleSignIn() async {
    if (_isLoading) return;
    setState(() => _isLoading = true);

    try {
      await SupabaseService.signInWithGoogle();
      // On web/desktop or deep link callback, onAuthStateChange handles transition.
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('เข้าสู่ระบบไม่สำเร็จ: $e'),
            backgroundColor: AppTheme.accentRed,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28.0, vertical: 20.0),
          child: Column(
            children: [
              const SizedBox(height: 20),

              // Brand Logo & Title
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: AppTheme.primaryCyan.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppTheme.primaryCyan, width: 1.5),
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.primaryCyan.withValues(alpha: 0.3),
                          blurRadius: 12,
                        ),
                      ],
                    ),
                    child: const Center(
                      child: Text(
                        'P',
                        style: TextStyle(
                          color: AppTheme.primaryCyan,
                          fontWeight: FontWeight.w900,
                          fontSize: 22,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  const Text(
                    'Project Edu',
                    style: TextStyle(
                      color: AppTheme.textPrimary,
                      fontWeight: FontWeight.w900,
                      fontSize: 24,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              const Text(
                'Youth Science & AI Research Incubator',
                style: TextStyle(color: AppTheme.secondaryViolet, fontSize: 12, fontWeight: FontWeight.w500),
              ),

              const Spacer(),

              // Tech Blueprint Graphic
              Container(
                width: 180,
                height: 180,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppTheme.surface1,
                  border: Border.all(color: AppTheme.primaryCyan.withValues(alpha: 0.4), width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.primaryCyan.withValues(alpha: 0.15),
                      blurRadius: 30,
                      spreadRadius: 5,
                    ),
                  ],
                ),
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: const [
                      Icon(Icons.biotech_rounded, size: 56, color: AppTheme.primaryCyan),
                      SizedBox(height: 8),
                      Text(
                        'YSC • ISEF • สพฐ.',
                        style: TextStyle(color: AppTheme.secondaryViolet, fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ),

              const Spacer(),

              // Google OAuth Button
              _SocialButton(
                icon: _isLoading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primaryCyan),
                      )
                    : const Text('G', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: Colors.blueAccent)),
                label: _isLoading ? 'กำลังเปิดหน้าเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google (Supabase Auth)',
                onTap: _handleGoogleSignIn,
              ),
              const SizedBox(height: 12),

              // Zero-PII Guest Mode
              OutlinedButton.icon(
                onPressed: widget.onLoginSuccess,
                icon: const Icon(Icons.lock_clock_outlined, color: AppTheme.primaryCyan, size: 18),
                label: const Text(
                  'ทดลองใช้งานทันที (Guest Zero-PII Mode)',
                  style: TextStyle(color: AppTheme.primaryCyan, fontWeight: FontWeight.w600, fontSize: 14),
                ),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(48),
                  side: const BorderSide(color: AppTheme.primaryCyan),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9999)),
                ),
              ),

              const SizedBox(height: 24),

              // Legal / Terms Notice
              const Text(
                'ข้อมูลการวิจัยและการสนทนากับ AI Coach เป็นไปตามนโยบาย Zero-PII และ PDPA สำหรับเยาวชน เพื่อส่งเสริมการเรียนรู้วิทยาศาสตร์อย่างปลอดภัย',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppTheme.textMuted,
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
        backgroundColor: AppTheme.surface2,
        foregroundColor: AppTheme.textPrimary,
        minimumSize: const Size.fromHeight(48),
        elevation: 0,
        side: const BorderSide(color: AppTheme.borderStroke),
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
