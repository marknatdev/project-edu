import 'dart:convert';
import '../services/ai_coach_service.dart';
import '../services/supabase_service.dart';
import 'catalog.dart';

/// Thrown with a Thai message the UI can show as-is.
class AiCardError implements Exception {
  final String messageTh;
  AiCardError(this.messageTh);
  @override
  String toString() => messageTh;
}

/// Asks the `ai-topic-cards` Edge Function for fresh Topic Cards (ADR 0005). Uses the same daily
/// card quota as the web; requires a signed-in learner. Reuses the AI Coach HTTP/token seams.
class AiCardService {
  static Future<List<DiscoveryCard>> generate({
    required DiscoverySubfield subfield,
    required String gradeLevel,
    String interest = '',
  }) async {
    final token = await AiCoachService.accessToken();
    if (token == null) throw AiCardError('ต้องเข้าสู่ระบบด้วย Google ก่อนให้ AI คิดการ์ด');
    final response = await AiCoachService.client
        .post(
          Uri.parse('${SupabaseService.supabaseUrl}/functions/v1/ai-topic-cards'),
          headers: {
            'Authorization': 'Bearer $token',
            'apikey': SupabaseService.supabasePublishableKey,
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: jsonEncode({
            'subjectId': subfield.subjectId,
            'subfieldId': subfield.id,
            'subfieldName': subfield.nameTh,
            'gradeLevel': gradeLevel,
            'interest': interest.trim(),
          }),
        )
        .timeout(const Duration(seconds: 60));
    final body = jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>;
    if (response.statusCode != 200) {
      throw AiCardError(body['messageTh'] as String? ?? 'AI คิดการ์ดไม่สำเร็จ ลองใหม่อีกครั้ง');
    }
    return [
      for (final c in (body['cards'] as List).cast<Map<String, dynamic>>())
        DiscoveryCard(
          id: c['id'] as String,
          subjectId: c['subjectId'] as String,
          subfieldId: c['subfieldId'] as String,
          title: c['title'] as String,
          phenomenon: c['phenomenon'] as String? ?? '',
          curiosityHook: c['curiosityHook'] as String? ?? '',
          gradeLevels: (c['targetGradeLevels'] as List? ?? [gradeLevel]).cast<String>(),
          difficulty: c['difficulty'] as String? ?? 'intermediate',
          estimatedWeeks: (c['estimatedWeeks'] as num? ?? 6).toInt(),
          estimatedBudgetBaht: (c['estimatedBudgetBaht'] as num? ?? 0).toInt(),
          requiredEquipment: (c['requiredEquipment'] as List? ?? const []).cast<String>(),
          minTeamSize: (c['minTeamSize'] as num? ?? 1).toInt(),
          maxTeamSize: (c['maxTeamSize'] as num? ?? 3).toInt(),
          requiredSkills: (c['requiredSkills'] as List? ?? const []).cast<String>(),
          aiGenerated: true,
        ),
    ];
  }
}
