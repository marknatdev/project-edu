import 'package:flutter/material.dart';
import '../services/ai_coach_service.dart';
import '../services/project_repository.dart';
import '../theme/app_theme.dart';

class AiCoachModal extends StatefulWidget {
  const AiCoachModal({super.key});

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const AiCoachModal(),
    );
  }

  @override
  State<AiCoachModal> createState() => _AiCoachModalState();
}

class _AiCoachModalState extends State<AiCoachModal> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _isLoading = false;

  final List<Map<String, String>> _messages = [
    {
      'role': 'assistant',
      'content': 'สวัสดีครับ! ผมคือ AI Socratic Coach ที่ขับเคลื่อนด้วย Gemini 3.8 Flash High '
          'พร้อมท้าทายสมมติฐาน ตรวจสอบตัวแปร และพาซ้อมตอบกรรมการโครงงานวิทย์ครับ '
          'วันนี้อยากปรึกษาหรือพัฒนาโครงงานเรื่องอะไรดีครับ?'
    }
  ];

  final List<String> _quickPrompts = [
    '🧪 ช่วยตรวจสอบตัวแปรต้น-ตาม',
    '🛡️ ประเมินความเสี่ยงแล็บ SRC/ISEF',
    '✨ แนะนำวิธีปรับมุมมอง (Pivot)',
    '🎤 ซ้อมพรีเซนต์ตอบกรรมการ',
  ];

  Future<void> _sendMessage(String text) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty || _isLoading) return;

    _controller.clear();
    setState(() {
      _messages.add({'role': 'user', 'content': trimmed});
      _isLoading = true;
    });

    _scrollToBottom();

    try {
      final reply = await AiCoachService.askCoach(
        userMessage: trimmed,
        conversationHistory: _messages
            .where((m) => m['role'] != 'system')
            .toList(),
      );

      if (mounted) {
        setState(() {
          _messages.add({'role': 'assistant', 'content': reply});
          _isLoading = false;
        });
        _scrollToBottom();

        // Sync to Supabase in background
        ProjectRepository.saveProjectRecord(
          collection: 'coaching',
          recordKey: 'session_${DateTime.now().millisecondsSinceEpoch}',
          data: {'messages': _messages, 'model': AiCoachService.targetModel},
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _messages.add({
            'role': 'assistant',
            'content': '⚠️ ไม่สามารถติดต่อ OmniRoute ได้ กรุณาตรวจสอบว่า Gateway รันอยู่ที่พอร์ต 20128: $e'
          });
          _isLoading = false;
        });
        _scrollToBottom();
      }
    }
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
      decoration: const BoxDecoration(
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
                  child: const Icon(Icons.psychology_rounded, color: AppTheme.secondaryViolet, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        'Socratic Research Coach',
                        style: TextStyle(
                          color: AppTheme.textPrimary,
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      Text(
                        'Antigravity Gemini 3.8 Flash High (OmniRoute)',
                        style: TextStyle(color: AppTheme.primaryCyan, fontSize: 11),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded, color: AppTheme.textSecondary),
                ),
              ],
            ),
          ),
          const Divider(color: AppTheme.borderStroke, height: 1),

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
                        style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11.5),
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
              itemCount: _messages.length,
              itemBuilder: (context, idx) {
                final msg = _messages[idx];
                final isUser = msg['role'] == 'user';

                return Align(
                  alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
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
                      msg['content'] ?? '',
                      style: TextStyle(
                        color: isUser ? Colors.white : AppTheme.textPrimary,
                        fontSize: 13.5,
                        height: 1.4,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          if (_isLoading)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
              child: Row(
                children: const [
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
            decoration: const BoxDecoration(
              color: AppTheme.surface1,
              border: Border(top: BorderSide(color: AppTheme.borderStroke)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14),
                    decoration: InputDecoration(
                      hintText: 'พิมพ์ถามไอเดีย สมมติฐาน หรือปัญหา...',
                      hintStyle: const TextStyle(color: AppTheme.textMuted, fontSize: 13),
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
                    decoration: const BoxDecoration(
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
