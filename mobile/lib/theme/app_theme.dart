import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Design tokens with dual-theme support (White Theme as default)
class AppTheme {
  // Theme state: defaults to false (White / Light theme default)
  static bool isDark = false;

  // Colors - Dynamic based on isDark
  static Color get background => isDark ? const Color(0xFF0B0F17) : const Color(0xFFF8FAFC);
  static Color get surface1 => isDark ? const Color(0xFF131B2A) : const Color(0xFFFFFFFF);
  static Color get surface2 => isDark ? const Color(0xFF1B263B) : const Color(0xFFF1F5F9);
  static Color get surface3 => isDark ? const Color(0xFF24334D) : const Color(0xFFE2E8F0);

  static Color get primaryCyan => isDark ? const Color(0xFF00E5FF) : const Color(0xFF0284C7);
  static Color get secondaryViolet => isDark ? const Color(0xFF8B5CF6) : const Color(0xFF7C3AED);
  static const Color primaryOrange = Color(0xFFFF6D00);
  static const Color orangeLight = Color(0xFFFF8A00);
  static Color get orangeGlow => isDark ? const Color(0x4DFF6D00) : const Color(0x26FF6D00);
  static Color get cyanGlow => isDark ? const Color(0x4D00E5FF) : const Color(0x260284C7);
  static Color get violetGlow => isDark ? const Color(0x4D8B5CF6) : const Color(0x267C3AED);

  static const Color accentGreen = Color(0xFF10B981);
  static Color get accentBlue => primaryCyan;
  static Color get accentPurple => secondaryViolet;
  static const Color accentAmber = Color(0xFFF59E0B);
  static const Color accentFire = Color(0xFFFF9100);
  static const Color accentRed = Color(0xFFEF4444);

  static Color get textPrimary => isDark ? Colors.white : const Color(0xFF0F172A);
  static Color get textSecondary => isDark ? const Color(0xFF94A3B8) : const Color(0xFF475569);
  static Color get textMuted => isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8);

  static Color get borderStroke => isDark ? const Color(0xFF262F40) : const Color(0xFFE2E8F0);
  static Color get borderSubtle => isDark ? const Color(0x33FFFFFF) : const Color(0xFFCBD5E1);

  // Border Radii
  static const double radiusCard = 20.0;
  static const double radiusPill = 9999.0;
  static const double radiusIcon = 14.0;

  // Box Decorations
  static BoxDecoration cardDecoration({
    Color? surface,
    Color? border,
    double radius = radiusCard,
  }) {
    return BoxDecoration(
      color: surface ?? surface1,
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(
        color: border ?? borderStroke,
        width: 1.0,
      ),
      boxShadow: isDark
          ? null
          : [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 10,
                offset: const Offset(0, 2),
              ),
            ],
    );
  }

  // Light Theme (White Theme - Default)
  static ThemeData get lightTheme {
    const bg = Color(0xFFF8FAFC);
    const surf = Color(0xFFFFFFFF);
    const txtPrim = Color(0xFF0F172A);
    const txtSec = Color(0xFF475569);
    const bdr = Color(0xFFE2E8F0);
    const primary = Color(0xFF0284C7);

    final textTheme = GoogleFonts.promptTextTheme(ThemeData.light().textTheme);

    return ThemeData(
      brightness: Brightness.light,
      scaffoldBackgroundColor: bg,
      primaryColor: primary,
      colorScheme: const ColorScheme.light(
        primary: primary,
        secondary: Color(0xFF10B981),
        surface: surf,
        error: Color(0xFFEF4444),
      ),
      textTheme: textTheme.copyWith(
        displayLarge: textTheme.displayLarge?.copyWith(
          color: txtPrim,
          fontWeight: FontWeight.bold,
          letterSpacing: -0.5,
        ),
        titleLarge: textTheme.titleLarge?.copyWith(
          color: txtPrim,
          fontWeight: FontWeight.w700,
        ),
        titleMedium: textTheme.titleMedium?.copyWith(
          color: txtPrim,
          fontWeight: FontWeight.w600,
        ),
        bodyLarge: textTheme.bodyLarge?.copyWith(
          color: txtPrim,
        ),
        bodyMedium: textTheme.bodyMedium?.copyWith(
          color: txtSec,
          fontSize: 13,
        ),
        labelSmall: textTheme.labelSmall?.copyWith(
          color: const Color(0xFF94A3B8),
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: bdr,
        thickness: 1,
      ),
    );
  }

  static ThemeData get darkTheme {
    final textTheme = GoogleFonts.promptTextTheme(ThemeData.dark().textTheme);

    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: background,
      primaryColor: primaryOrange,
      colorScheme: ColorScheme.dark(
        primary: primaryOrange,
        secondary: accentGreen,
        surface: surface1,
        error: accentRed,
      ),
      textTheme: textTheme.copyWith(
        displayLarge: textTheme.displayLarge?.copyWith(
          color: textPrimary,
          fontWeight: FontWeight.bold,
          letterSpacing: -0.5,
        ),
        titleLarge: textTheme.titleLarge?.copyWith(
          color: textPrimary,
          fontWeight: FontWeight.w700,
        ),
        titleMedium: textTheme.titleMedium?.copyWith(
          color: textPrimary,
          fontWeight: FontWeight.w600,
        ),
        bodyLarge: textTheme.bodyLarge?.copyWith(
          color: textPrimary,
        ),
        bodyMedium: textTheme.bodyMedium?.copyWith(
          color: textSecondary,
          fontSize: 13,
        ),
        labelSmall: textTheme.labelSmall?.copyWith(
          color: textMuted,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
      dividerTheme: DividerThemeData(
        color: borderStroke,
        thickness: 1,
      ),
    );
  }
}
