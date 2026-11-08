import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Design tokens strictly derived from AllTCAS UI/UX Study
class AppTheme {
  // Colors
  static const Color background = Color(0xFF0D111A);
  static const Color surface1 = Color(0xFF191E2B);
  static const Color surface2 = Color(0xFF222938);
  static const Color surface3 = Color(0xFF2A3347);

  static const Color primaryCyan = Color(0xFF00B0FF);
  static const Color primaryOrange = Color(0xFFFF6D00);
  static const Color orangeLight = Color(0xFFFF8A00);
  static const Color orangeGlow = Color(0x4DFF6D00);
  static const Color cyanGlow = Color(0x4D00B0FF);

  static const Color accentGreen = Color(0xFF00E676);
  static const Color accentBlue = Color(0xFF00B0FF);
  static const Color accentPurple = Color(0xFF8B5CF6);
  static const Color accentFire = Color(0xFFFF9100);
  static const Color accentRed = Color(0xFFEF4444);

  static const Color textPrimary = Colors.white;
  static const Color textSecondary = Color(0xFF94A3B8);
  static const Color textMuted = Color(0xFF64748B);

  static const Color borderStroke = Color(0xFF262F40);
  static const Color borderSubtle = Color(0x33FFFFFF);

  // Border Radii
  static const double radiusCard = 20.0;
  static const double radiusPill = 9999.0;
  static const double radiusIcon = 14.0;

  // Box Decorations
  static BoxDecoration cardDecoration({Color? surface, Color? border}) {
    return BoxDecoration(
      color: surface ?? surface1,
      borderRadius: BorderRadius.circular(radiusCard),
      border: Border.all(
        color: border ?? borderStroke,
        width: 1.0,
      ),
    );
  }

  static ThemeData get darkTheme {
    final textTheme = GoogleFonts.promptTextTheme(ThemeData.dark().textTheme);

    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: background,
      primaryColor: primaryOrange,
      colorScheme: const ColorScheme.dark(
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
      dividerTheme: const DividerThemeData(
        color: borderStroke,
        thickness: 1,
      ),
    );
  }
}
