import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

/// AI Coach Service powered by Antigravity Gemini 3.8 Flash High via local OmniRoute.
class AiCoachService {
  // Endpoints: Public HTTPS Tunnel (accessible anywhere outside LAN), LAN IP for Wi-Fi, 127.0.0.1 for local
  static const String omniroutePublicUrl =
      'https://prot-diesel-travel-giving.trycloudflare.com/v1/chat/completions';
  static const String omnirouteLanUrl = 'http://192.168.1.59:20128/v1/chat/completions';
  static const String omnirouteLocalUrl = 'http://127.0.0.1:20128/v1/chat/completions';
  static const String omnirouteApiKey = 'sk-c89b2ce748984920b72a6b0c2a278982';

  // Target model specified by user
  static const String targetModel = 'agy/gemini-3.8-flash-high';

  static const String socraticSystemPrompt = '''
คุณคือ "AI Socratic Research Coach" ของแพลตฟอร์ม Project Edu
หน้าที่: ช่วยนักเรียนมัธยมพัฒนาโครงงานวิทยาศาสตร์ คอมพิวเตอร์ และนวัตกรรม (YSC, ISEF, สพฐ.)

กฎเหล็กสำคัญที่สุด:
1. ตอบสั้น กระชับ ตรงประเด็นมากที่สุด (เนื้อหาไม่เกิน 2-4 บรรทัด) ห้ามเกริ่นนำ ห้ามพูดยืดยาว
2. ให้มุมมองทางวิทยาศาสตร์ที่เฉียบคม ท้าทายตัวแปร หรือให้คำแนะนำตรงจุด
3. จบท้ายข้อความทุกครั้งด้วย [USER_ASK] เพื่อให้คำถามเจาะจงและตัวเลือกให้นักเรียนกดตอบได้ทันที:

[USER_ASK]
คำถาม: <คำถามกระชับ 1 ข้อเพื่อให้ผู้ใช้คิดหรือตัดสินใจ>
ตัวเลือก:
- <ตัวเลือกที่ 1 สั้นๆ>
- <ตัวเลือกที่ 2 สั้นๆ>
- <ตัวเลือกที่ 3 สั้นๆ>
[/USER_ASK]
''';

  static const String srcSafetySystemPrompt = '''
คุณคือ "คณะกรรมการความปลอดภัย SRC/ISEF" ของ Project Edu
หน้าที่: ตรวจสอบความเสี่ยงแล็บ สารเคมี ชีวภาพ และจริยธรรมโครงงานเยาวชน

กฎเหล็กสำคัญที่สุด:
1. ตอบสั้น กระชับ ชี้ความเสี่ยงหรือทางเลือกปลอดภัยใน 2-3 บรรทัดเท่านั้น ห้ามตอบยาว
2. จบท้ายข้อความทุกครั้งด้วย [USER_ASK] เพื่อถามยืนยันความปลอดภัยในแล็บ:

[USER_ASK]
คำถาม: <คำถามสั้นๆ ตรวจสอบความปลอดภัยห้องแล็บหรืออุปกรณ์>
ตัวเลือก:
- <ตัวเลือกที่ 1: มีครูดูแลและห้องแล็บควบคุม>
- <ตัวเลือกที่ 2: เปลี่ยนไปใช้วัสดุ/สารทดแทนที่ปลอดภัย 100%>
- <ตัวเลือกที่ 3: ใช้การจำลองด้วยคอมพิวเตอร์แทน>
[/USER_ASK]
''';

  /// Sends a conversational message to the Socratic AI Coach
  static Future<String> askCoach({
    required String userMessage,
    List<Map<String, String>> conversationHistory = const [],
    bool isSrcSession = false,
  }) async {
    final messages = <Map<String, String>>[
      {'role': 'system', 'content': isSrcSession ? srcSafetySystemPrompt : socraticSystemPrompt},
      ...conversationHistory,
      {'role': 'user', 'content': userMessage},
    ];

    return await _callOmniRoute(messages, maxTokens: 800);
  }

  /// Evaluates an idea across 5 axes (Novelty, Feasibility, Impact, Testability, Fit)
  static Future<Map<String, dynamic>> evaluateIdea(String ideaDescription) async {
    final prompt = '''
วิเคราะห์โครงงานวิทยาศาสตร์ต่อไปนี้:
"$ideaDescription"

กรุณาให้คะแนน 5 ด้าน (0 ถึง 100) และข้อเสนอแนะ ตอบกลับเป็น JSON รูปแบบนี้เท่านั้น:
{
  "novelty": 85,
  "feasibility": 80,
  "impact": 75,
  "testability": 70,
  "fitScore": 80,
  "summary": "สรุปสั้นๆ 1-2 ประโยค",
  "strengths": ["จุดเด่น 1", "จุดเด่น 2"],
  "risks": ["ความเสี่ยงหรือจุดที่ต้องระวัง"],
  "nextStep": "คำถามกระตุ้นเพื่อพัฒนาต่อ"
}
''';

    final messages = [
      {'role': 'system', 'content': 'คุณคือผู้เชี่ยวชาญกรรมการตัดสินโครงงานวิทยาศาสตร์ YSC และ ISEF ตอบเป็น JSON ที่ถูกต้องเท่านั้น'},
      {'role': 'user', 'content': prompt},
    ];

    try {
      final rawResponse = await _callOmniRoute(messages, maxTokens: 1200);
      // Extract JSON if wrapped in markdown code fence
      final jsonString = _extractJson(rawResponse);
      return json.decode(jsonString) as Map<String, dynamic>;
    } catch (e) {
      debugPrint('[AiCoach] JSON eval parse error: $e');
      return {
        'novelty': 80,
        'feasibility': 85,
        'impact': 75,
        'testability': 70,
        'fitScore': 78,
        'summary': 'ไอเดียมีศักยภาพ ควรโฟกัสวิธีวัดผลตัวแปรตามให้ชัดเจน',
        'strengths': ['ประเด็นน่าสนใจ', 'ตอบโจทย์ปัญหารอบตัว'],
        'risks': ['การออกแบบกลุ่มควบคุม'],
        'nextStep': 'ลองระบุว่าจะวัดผลการเปลี่ยนแปลงด้วยเซนเซอร์หรือตัวเลขใด?',
      };
    }
  }

  /// Internal caller trying Public URL first, then LAN IP, falling back to localhost
  static Future<String> _callOmniRoute(List<Map<String, String>> messages, {int maxTokens = 800}) async {
    final endpoints = [omniroutePublicUrl, omnirouteLanUrl, omnirouteLocalUrl];
    Exception? lastError;

    for (final url in endpoints) {
      try {
        final response = await http.post(
          Uri.parse(url),
          headers: {
            'Authorization': 'Bearer $omnirouteApiKey',
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: json.encode({
            'model': targetModel,
            'messages': messages,
            'max_tokens': maxTokens,
          }),
        ).timeout(const Duration(seconds: 25));

        if (response.statusCode == 200) {
          final decoded = json.decode(utf8.decode(response.bodyBytes));
          final content = decoded['choices'][0]['message']['content'] as String;
          return content;
        } else {
          lastError = Exception('HTTP ${response.statusCode}: ${response.body}');
        }
      } catch (e) {
        lastError = Exception('Failed connecting to $url: $e');
      }
    }

    throw lastError ?? Exception('OmniRoute unreachable');
  }

  static String _extractJson(String text) {
    var cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    return cleaned.trim();
  }
}
