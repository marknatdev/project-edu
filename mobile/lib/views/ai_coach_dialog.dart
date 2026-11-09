import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
  bool _isCommitted = false;

  // Claude-style signature terracotta color
  static const Color _claudeTerracotta = Color(0xFFD97757);

  final List<Map<String, String>> _starterPrompts = [
    {
      'title': '🧪 ตรวจสอบตัวแปรต้น-ตาม',
      'desc': 'วิเคราะห์ความแม่นยำและการควบคุมตัวแปรแทรกซ้อน',
      'prompt': 'ช่วยวิเคราะห์ตัวแปรต้น ตัวแปรตาม และตัวแปรควบคุมของโครงงานนี้หน่อยครับ ว่ารัดกุมตามเกณฑ์วิทยาศาสตร์หรือยัง',
    },
    {
      'title': '🛡️ ประเมินความเสี่ยงแล็บ SRC',
      'desc': 'ตรวจสอบสารเคมีและสิ่งมีชีวิตตามเกณฑ์ ISEF/YSC',
      'prompt': 'ช่วยตรวจทานความปลอดภัยแล็บ (SRC Safety) ให้หน่อยครับ ว่าเข้าข่ายสารเคมีอันตรายหรือต้องใช้ฟอร์มขออนุญาตไหม',
    },
    {
      'title': '💡 แนะนำมุมมอง Pivot ไอเดีย',
      'desc': 'พลิกมุมมองปัญหาเดิมด้วยเทคนิคหรือวิธีการทดลองใหม่',
      'prompt': 'หากงานวิจัยที่คล้ายกันมีคนทำไปเยอะแล้ว มีแนวทาง Pivot หรือปรับมุมมองให้มีความใหม่ (Novelty) อย่างไรได้บ้างครับ',
    },
    {
      'title': '🎤 ซ้อมรับมือคำถามกรรมการ',
      'desc': 'เตรียมเหตุผลและหลักฐานเชิงประจักษ์สำหรับข้อโต้แย้ง',
      'prompt': 'สมมติว่าท่านเป็นกรรมการ YSC กรุณาตั้งคำถามท้าทายเกี่ยวกับระเบียบวิธีวิจัยและสถิติการวัดผลของโครงงานนี้ 1 ข้อครับ',
    },
  ];

  @override
  void initState() {
    super.initState();
    if (widget.initialSession != null) {
      _session = widget.initialSession!;
      _isCommitted = _session.messages.any((m) => m.isUser);
    } else {
      // Draft session: in-memory only, will NOT be saved unless user sends a message
      _session = ChatSession(
        id: 'session_${DateTime.now().millisecondsSinceEpoch}',
        title: '🔬 การปรึกษาโครงงานวิทยาศาสตร์',
        category: 'Socratic Research',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        messages: [],
      );
      _isCommitted = false;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    // If the user opened the chat but never interacted/sent a message, ensure it is pruned
    try {
      context.read<LearnerState>().pruneEmptySessions();
    } catch (_) {}
    super.dispose();
  }

  Future<void> _sendMessage(String text) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty || _isLoading) return;

    final learner = context.read<LearnerState>();
    HapticFeedback.lightImpact();

    // Commit session on user's first message
    if (!_isCommitted) {
      learner.saveOrInsertSession(_session);
      _isCommitted = true;
    }

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

  void _resetToNewChat() {
    setState(() {
      _session = ChatSession(
        id: 'session_${DateTime.now().millisecondsSinceEpoch}',
        title: '🔬 การปรึกษาโครงงานวิทยาศาสตร์',
        category: 'Socratic Research',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        messages: [],
      );
      _isCommitted = false;
      _controller.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final height = MediaQuery.of(context).size.height * 0.88;

    return Container(
      height: height,
      margin: EdgeInsets.only(bottom: bottomInset),
      decoration: BoxDecoration(
        color: AppTheme.background,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(top: BorderSide(color: AppTheme.borderStroke, width: 1.5)),
      ),
      child: Column(
        children: [
          // Drag handle
          Container(
            width: 36,
            height: 4,
            margin: const EdgeInsets.symmetric(vertical: 8),
            decoration: BoxDecoration(
              color: AppTheme.surface3,
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Claude-style Minimalist Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
            child: Row(
              children: [
                // Claude Star Badge
                Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: _claudeTerracotta.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: _claudeTerracotta.withValues(alpha: 0.3)),
                  ),
                  child: const Center(
                    child: Text(
                      '✦',
                      style: TextStyle(
                        color: _claudeTerracotta,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            'Claude Socratic Coach',
                            style: TextStyle(
                              color: AppTheme.textPrimary,
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                            decoration: BoxDecoration(
                              color: AppTheme.surface2,
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(color: AppTheme.borderStroke),
                            ),
                            child: Text(
                              'โสเครติส',
                              style: TextStyle(
                                color: AppTheme.textMuted,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                      Text(
                        'ไม่เฉลยคำตอบตรงๆ • ช่วยคิดและตั้งคำถามท้าทาย',
                        style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
                      ),
                    ],
                  ),
                ),

                // New chat button
                if (_session.messages.isNotEmpty)
                  IconButton(
                    tooltip: 'เริ่มแชตใหม่',
                    onPressed: _resetToNewChat,
                    icon: Icon(Icons.edit_note_rounded, color: AppTheme.textSecondary, size: 22),
                  ),

                // Close button
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: Icon(Icons.close_rounded, color: AppTheme.textSecondary, size: 20),
                ),
              ],
            ),
          ),
          Divider(color: AppTheme.borderStroke, height: 1),

          // Chat Messages or Claude-style Empty State
          Expanded(
            child: _session.messages.isEmpty
                ? _buildClaudeEmptyState()
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                    itemCount: _session.messages.length,
                    itemBuilder: (context, idx) {
                      final msg = _session.messages[idx];
                      return msg.isUser
                          ? _buildUserMessageBubble(msg)
                          : _buildClaudeAssistantMessage(msg);
                    },
                  ),
          ),

          // Loading indicator
          if (_isLoading)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 8.0),
              child: Row(
                children: [
                  const Text('✦', style: TextStyle(color: _claudeTerracotta, fontSize: 16)),
                  const SizedBox(width: 8),
                  Text(
                    'Claude กำลังคิดและวิเคราะห์หลักการ...',
                    style: TextStyle(color: AppTheme.textSecondary, fontSize: 12.5),
                  ),
                ],
              ),
            ),

          // Claude-style Pill Input Bar
          Container(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            decoration: BoxDecoration(
              color: AppTheme.background,
              border: Border(top: BorderSide(color: AppTheme.borderStroke.withValues(alpha: 0.5))),
            ),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: AppTheme.surface1,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: AppTheme.borderStroke, width: 1.2),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      maxLines: 4,
                      minLines: 1,
                      style: TextStyle(color: AppTheme.textPrimary, fontSize: 14, height: 1.35),
                      decoration: InputDecoration(
                        hintText: 'ถามไอเดีย สมมติฐาน หรือปัญหาการทดลอง...',
                        hintStyle: TextStyle(color: AppTheme.textMuted, fontSize: 13),
                        border: InputBorder.none,
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(vertical: 8),
                      ),
                      onSubmitted: _sendMessage,
                    ),
                  ),
                  const SizedBox(width: 8),
                  ValueListenableBuilder<TextEditingValue>(
                    valueListenable: _controller,
                    builder: (context, val, _) {
                      final hasText = val.text.trim().isNotEmpty;
                      return InkWell(
                        onTap: hasText ? () => _sendMessage(_controller.text) : null,
                        borderRadius: BorderRadius.circular(18),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          width: 34,
                          height: 34,
                          margin: const EdgeInsets.only(bottom: 2),
                          decoration: BoxDecoration(
                            color: hasText ? _claudeTerracotta : AppTheme.surface2,
                            shape: BoxShape.circle,
                          ),
                          child: Center(
                            child: Icon(
                              Icons.arrow_upward_rounded,
                              color: hasText ? Colors.white : AppTheme.textMuted,
                              size: 18,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Claude-style Empty State with Greeting & Prompt Cards
  Widget _buildClaudeEmptyState() {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      children: [
        Center(
          child: Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: _claudeTerracotta.withValues(alpha: 0.12),
              shape: BoxShape.circle,
              border: Border.all(color: _claudeTerracotta.withValues(alpha: 0.3)),
            ),
            child: const Center(
              child: Text(
                '✦',
                style: TextStyle(
                  color: _claudeTerracotta,
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 14),
        Center(
          child: Text(
            'สวัสดีครับ มีไอเดียวิจัยอะไรที่อยากปรึกษาไหมครับ?',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        const SizedBox(height: 6),
        Center(
          child: Text(
            'ผมคือโค้ชโสเครติส พร้อมช่วยท้าทายสมมติฐาน ออกแบบตัวแปร และเตรียมตัวก่อนขึ้นเวทีประกวด YSC / ISEF',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppTheme.textSecondary, fontSize: 12.5, height: 1.35),
          ),
        ),
        const SizedBox(height: 24),

        // Starter Prompt Cards (Claude Style)
        Text(
          'ประเด็นที่นักเรียนมักเริ่มปรึกษา:',
          style: TextStyle(color: AppTheme.textMuted, fontSize: 12, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 10),
        ..._starterPrompts.map((p) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 8.0),
            child: InkWell(
              onTap: () => _sendMessage(p['prompt']!),
              borderRadius: BorderRadius.circular(14),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.surface1,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppTheme.borderStroke),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            p['title']!,
                            style: TextStyle(
                              color: AppTheme.textPrimary,
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            p['desc']!,
                            style: TextStyle(color: AppTheme.textMuted, fontSize: 11.5),
                          ),
                        ],
                      ),
                    ),
                    Icon(Icons.arrow_forward_rounded, size: 16, color: AppTheme.textMuted),
                  ],
                ),
              ),
            ),
          );
        }),
      ],
    );
  }

  // User Message Bubble (Right-aligned, softly rounded)
  Widget _buildUserMessageBubble(ChatMessage msg) {
    return Align(
      alignment: Alignment.centerRight,
      child: Container(
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.80),
        decoration: BoxDecoration(
          color: AppTheme.isDark ? AppTheme.surface2 : const Color(0xFFF0EFEB),
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(18),
            topRight: Radius.circular(18),
            bottomLeft: Radius.circular(18),
            bottomRight: Radius.circular(4),
          ),
          border: Border.all(color: AppTheme.borderStroke),
        ),
        child: Text(
          msg.text,
          style: TextStyle(
            color: AppTheme.textPrimary,
            fontSize: 14,
            height: 1.4,
          ),
        ),
      ),
    );
  }

  // Claude Assistant Message (Left-aligned, open unboxed typography)
  Widget _buildClaudeAssistantMessage(ChatMessage msg) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 18.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Claude Header in message
          Row(
            children: [
              Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  color: _claudeTerracotta.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: const Center(
                  child: Text(
                    '✦',
                    style: TextStyle(
                      color: _claudeTerracotta,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'Claude Coach',
                style: TextStyle(
                  color: AppTheme.textSecondary,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),

          // Message Body (Generous typography)
          Padding(
            padding: const EdgeInsets.only(left: 28.0),
            child: Text(
              msg.text,
              style: TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 14,
                height: 1.45,
              ),
            ),
          ),

          // Interactive Claude-like Follow-up Choices Card (UserAsk)
          if (msg.userAskQuestion != null) ...[
            const SizedBox(height: 10),
            Padding(
              padding: const EdgeInsets.only(left: 28.0),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.surface1,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: _claudeTerracotta.withValues(alpha: 0.3)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Text('✦', style: TextStyle(color: _claudeTerracotta, fontSize: 13)),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            msg.userAskQuestion!,
                            style: TextStyle(
                              color: AppTheme.textPrimary,
                              fontWeight: FontWeight.bold,
                              fontSize: 12.5,
                            ),
                          ),
                        ),
                      ],
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
                                color: AppTheme.surface2,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: AppTheme.borderStroke),
                              ),
                              child: Row(
                                children: [
                                  const Text('✦', style: TextStyle(color: _claudeTerracotta, fontSize: 11)),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      choice,
                                      style: TextStyle(
                                        color: AppTheme.isDark ? AppTheme.primaryCyan : const Color(0xFF0D5C54),
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
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
            ),
          ],

          // Action bar (Copy button)
          Padding(
            padding: const EdgeInsets.only(left: 28.0, top: 6.0),
            child: Row(
              children: [
                InkWell(
                  onTap: () {
                    HapticFeedback.lightImpact();
                    Clipboard.setData(ClipboardData(text: msg.text));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('คัดลอกข้อความของโค้ชลงคลิปบอร์ดแล้ว'),
                        duration: Duration(milliseconds: 900),
                      ),
                    );
                  },
                  borderRadius: BorderRadius.circular(6),
                  child: Padding(
                    padding: const EdgeInsets.all(4.0),
                    child: Icon(Icons.copy_rounded, size: 14, color: AppTheme.textMuted),
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
