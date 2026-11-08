import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/learner_state.dart';
import '../services/ai_coach_service.dart';
import '../services/project_repository.dart';
import '../theme/app_theme.dart';

class AiCoachModal extends StatefulWidget {
  final ChatSession? initialSession;

  const AiCoachModal({super.key, this.initialSession});

  static void show(BuildContext context, {ChatSession? initialSession}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AiCoachModal(initialSession: initialSession),
    );
  }

  @override
  State<AiCoachModal> createState() => _AiCoachModalState();
}

class _AiCoachModalState extends State<AiCoachModal> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _isLoading = false;
  late ChatSession _session;

  final List<String> _quickPrompts = [
    '🧪 ช่วยตรวจสอบตัวแปรต้น-ตาม',
    '🛡️ ประเมินความเสี่ยงแล็บ SRC/ISEF',
    '✨ แนะนำวิธีปรับมุมมอง (Pivot)',
    '🎤 ซ้อมพรีเซนต์ตอบกรรมการ',
  ];

  @override
  void initState() {
    super.initState();
    final learner = context.read<LearnerState>();
    _session = widget.initialSession ?? learner.currentSession;
  }

  Future<void> _sendMessage(String text) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty || _isLoading) return;

    _controller.clear();
    final userMsg = ChatMessage(
      text: trimmed,
      isUser: true,
      timestamp: DateTime.now(),
    );

    setState(() {
      _session.messages.add(userMsg);
      _session.updatedAt = DateTime.now();
      _isLoading = true;
    });

    _scrollToBottom();

    final isSrc = _session.category == 'SRC Safety';

    try {
      final history = _session.messages.map((m) {
        return {
          'role': m.isUser ? 'user' : 'assistant',
          'content': m.text,
        };
      }).toList();

      final rawReply = await AiCoachService.askCoach(
        userMessage: trimmed,
        conversationHistory: history,
        isSrcSession: isSrc,
      );

      final parsed = _parseUserAsk(rawReply);

      final assistantMsg = ChatMessage(
        text: parsed['cleanText'] as String,
        isUser: false,
        timestamp: DateTime.now(),
        userAskQuestion: parsed['question'] as String?,
        userAskChoices: parsed['choices'] as List<String>?,
      );

      if (mounted) {
        setState(() {
          _session.messages.add(assistantMsg);
          _session.updatedAt = DateTime.now();
          _isLoading = false;
        });
        _scrollToBottom();

        // Sync to Supabase in background
        ProjectRepository.saveProjectRecord(
          collection: 'coaching_sessions',
          recordKey: _session.id,
          data: {
            'id': _session.id,
            'title': _session.title,
            'category': _session.category,
            'messages_count': _session.messages.length,
            'last_message': assistantMsg.text,
            'updated_at': DateTime.now().toIso8601String(),
          },
        );
      }
    } catch (e) {
      if (mounted) {
        final String fallbackText;
        final String fallbackQuestion;
        final List<String> fallbackChoices;

        if (isSrc) {
          fallbackText = '⚠️ (โหมดสำรองออฟไลน์) การตรวจสอบความปลอดภัย SRC ต้องยืนยันว่าไม่มีสารพิษอันตราย สัตว์มีกระดูกสันหลัง หรือแรงดันไฟฟ้าสูง';
          fallbackQuestion = 'การทดลองของคุณเกี่ยวข้องกับเงื่อนไขความปลอดภัยใดต่อไปนี้?';
          fallbackChoices = [
            'ไม่มีสารเคมีอันตรายหรือสิ่งมีชีวิต (Non-hazardous Pass)',
            'มีการใช้สารเคมีหรือตัวอย่างจุลินทรีย์ (ต้องขอฟอร์ม 2/3)',
            'ใช้วงจรไฟฟ้าแรงดันต่ำปลอดภัย (< 12V DC)',
          ];
        } else {
          fallbackText = '⚠️ (โหมดสำรองออฟไลน์) หัวใจสำคัญของโครงงาน YSC/ISEF คือการตั้งสมมติฐานที่ทดสอบได้และมีตัวแปรวัดค่าได้เชิงตัวเลข';
          fallbackQuestion = 'คุณต้องการให้โค้ชช่วยแนะนำในส่วนใดต่อไปนี้?';
          fallbackChoices = [
            'นิยามตัวแปรต้น-ตัวแปรตามเชิงปริมาณ',
            'ออกแบบชุดการทดลองและกลุ่มควบคุม (Control Group)',
            'ค้นหางานวิจัยอ้างอิงเดิม (Prior Work)',
          ];
        }

        setState(() {
          _session.messages.add(
            ChatMessage(
              text: fallbackText,
              isUser: false,
              timestamp: DateTime.now(),
              userAskQuestion: fallbackQuestion,
              userAskChoices: fallbackChoices,
            ),
          );
          _isLoading = false;
        });
        _scrollToBottom();
      }
    }
  }

  Map<String, dynamic> _parseUserAsk(String raw) {
    if (!raw.contains('[USER_ASK]')) {
      return {'cleanText': raw.trim(), 'question': null, 'choices': null};
    }

    final parts = raw.split('[USER_ASK]');
    final cleanText = parts[0].trim();
    final askSection = parts[1].replaceAll('[/USER_ASK]', '').trim();

    String? question;
    final choices = <String>[];

    final lines = askSection.split('\n');
    for (final line in lines) {
      final l = line.trim();
      if (l.startsWith('คำถาม:') || l.startsWith('คำถามชวนคิด:')) {
        question = l.replaceFirst(RegExp(r'^(คำถาม:|คำถามชวนคิด:)\s*'), '').trim();
      } else if (l.startsWith('- ') || l.startsWith('• ') || RegExp(r'^\d+\.\s*').hasMatch(l)) {
        final choice = l.replaceFirst(RegExp(r'^(-|•|\d+\.)\s*'), '').trim();
        if (choice.isNotEmpty) {
          choices.add(choice);
        }
      }
    }

    return {
      'cleanText': cleanText,
      'question': question,
      'choices': choices.isNotEmpty ? choices : null,
    };
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final height = MediaQuery.of(context).size.height * 0.85;

    return Container(
      height: height,
      margin: EdgeInsets.only(bottom: bottomInset),
      decoration: BoxDecoration(
        color: AppTheme.background,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(top: BorderSide(color: AppTheme.borderStroke, width: 1.5)),
      ),
      child: Column(
        children: [
          // Drag handle
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(
              color: AppTheme.surface3,
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.secondaryViolet.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(Icons.psychology_rounded, color: AppTheme.secondaryViolet, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Socratic Research Coach',
                        style: TextStyle(
                          color: AppTheme.textPrimary,
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      Text(
                        'Gemini 3.8 Flash High • OmniRoute Cloud',
                        style: TextStyle(color: AppTheme.primaryCyan, fontSize: 11),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: Icon(Icons.close_rounded, color: AppTheme.textSecondary),
                ),
              ],
            ),
          ),
          Divider(color: AppTheme.borderStroke, height: 1),

          // Quick Prompt Chips
          SizedBox(
            height: 44,
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              scrollDirection: Axis.horizontal,
              itemCount: _quickPrompts.length,
              separatorBuilder: (context, index) => const SizedBox(width: 8),
              itemBuilder: (context, idx) {
                return InkWell(
                  onTap: () => _sendMessage(_quickPrompts[idx]),
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppTheme.surface1,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppTheme.borderStroke),
                    ),
                    child: Center(
                      child: Text(
                        _quickPrompts[idx],
                        style: TextStyle(color: AppTheme.textSecondary, fontSize: 11.5),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          // Chat Messages
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: _session.messages.length,
              itemBuilder: (context, idx) {
                final msg = _session.messages[idx];
                final isUser = msg.isUser;

                return Column(
                  crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                  children: [
                    Align(
                      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.82),
                        decoration: BoxDecoration(
                          color: isUser ? AppTheme.primaryCyan.withValues(alpha: 0.2) : AppTheme.surface1,
                          borderRadius: BorderRadius.only(
                            topLeft: const Radius.circular(16),
                            topRight: const Radius.circular(16),
                            bottomLeft: Radius.circular(isUser ? 16 : 4),
                            bottomRight: Radius.circular(isUser ? 4 : 16),
                          ),
                          border: Border.all(
                            color: isUser ? AppTheme.primaryCyan.withValues(alpha: 0.4) : AppTheme.borderStroke,
                          ),
                        ),
                        child: Text(
                          msg.text,
                          style: TextStyle(
                            color: isUser ? Colors.white : AppTheme.textPrimary,
                            fontSize: 13.5,
                            height: 1.4,
                          ),
                        ),
                      ),
                    ),

                    // Claude-like UserAsk Interactive Section
                    if (!isUser && msg.userAskQuestion != null)
                      Container(
                        margin: const EdgeInsets.only(bottom: 12, left: 4),
                        padding: const EdgeInsets.all(12),
                        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.86),
                        decoration: BoxDecoration(
                          color: AppTheme.surface2,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: AppTheme.secondaryViolet.withValues(alpha: 0.4)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(Icons.help_outline_rounded, color: AppTheme.secondaryViolet, size: 16),
                                SizedBox(width: 6),
                                Text(
                                  'คำถามชวนคิดจาก AI (UserAsk)',
                                  style: TextStyle(
                                    color: AppTheme.secondaryViolet,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              msg.userAskQuestion!,
                              style: TextStyle(
                                color: AppTheme.textPrimary,
                                fontWeight: FontWeight.w600,
                                fontSize: 13,
                              ),
                            ),
                            if (msg.userAskChoices != null && msg.userAskChoices!.isNotEmpty) ...[
                              const SizedBox(height: 10),
                              ...msg.userAskChoices!.map((choice) {
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 6.0),
                                  child: InkWell(
                                    onTap: () => _sendMessage(choice),
                                    borderRadius: BorderRadius.circular(10),
                                    child: Container(
                                      width: double.infinity,
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                      decoration: BoxDecoration(
                                        color: AppTheme.surface1,
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(color: AppTheme.primaryCyan.withValues(alpha: 0.3)),
                                      ),
                                      child: Row(
                                        children: [
                                          Icon(Icons.touch_app_rounded, color: AppTheme.primaryCyan, size: 14),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Text(
                                              choice,
                                              style: TextStyle(
                                                color: AppTheme.primaryCyan,
                                                fontSize: 12,
                                                fontWeight: FontWeight.w500,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                );
                              }),
                            ],
                          ],
                        ),
                      ),
                  ],
                );
              },
            ),
          ),

          if (_isLoading)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
              child: Row(
                children: [
                  SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primaryCyan),
                  ),
                  SizedBox(width: 8),
                  Text('โค้ชกำลังวิเคราะห์หลักการ...', style: TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                ],
              ),
            ),

          // Input Bar
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.surface1,
              border: Border(top: BorderSide(color: AppTheme.borderStroke)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    style: TextStyle(color: AppTheme.textPrimary, fontSize: 14),
                    decoration: InputDecoration(
                      hintText: 'พิมพ์ถามไอเดีย สมมติฐาน หรือปัญหา...',
                      hintStyle: TextStyle(color: AppTheme.textMuted, fontSize: 13),
                      filled: true,
                      fillColor: AppTheme.surface2,
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(20),
                        borderSide: BorderSide.none,
                      ),
                    ),
                    onSubmitted: _sendMessage,
                  ),
                ),
                const SizedBox(width: 8),
                InkWell(
                  onTap: () => _sendMessage(_controller.text),
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppTheme.primaryCyan,
                      shape: BoxShape.circle,
                    ),
                    child: const Center(
                      child: Icon(Icons.arrow_upward_rounded, color: Colors.black, size: 20),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
