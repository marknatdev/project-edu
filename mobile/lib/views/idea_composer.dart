import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../discovery/catalog.dart';
import '../discovery/discovery_store.dart';
import '../discovery/rewrite_gate.dart';
import '../models/learner_state.dart';
import '../theme/app_theme.dart';
import 'ai_coach_dialog.dart';

/// The learner turns a chosen Topic Card into their own Idea (own words, no copying), then may
/// confirm it as the Active Idea, which names the lab experiment and opens the AI Coach.
class IdeaComposer extends StatefulWidget {
  final DiscoveryCard card;
  const IdeaComposer({super.key, required this.card});

  static Future<void> show(BuildContext context, DiscoveryCard card) => showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: AppTheme.surface1,
        builder: (_) => IdeaComposer(card: card),
      );

  @override
  State<IdeaComposer> createState() => _IdeaComposerState();
}

class _IdeaComposerState extends State<IdeaComposer> {
  final _controller = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final card = widget.card;
    // Compare with each card field on its own: against the whole card a pasted field looks "different enough".
    final check = [card.title, card.phenomenon, card.curiosityHook]
        .map((source) => checkRewrite(source, _controller.text))
        .firstWhere((c) => !c.acceptable, orElse: () => checkRewrite(card.title, _controller.text));
    if (!check.acceptable) {
      setState(() => _error = check.reasonTh);
      return;
    }
    final store = context.read<DiscoveryStore>();
    final learner = context.read<LearnerState>();
    final navigator = Navigator.of(context);
    final rootContext = navigator.context;
    final idea = store.addIdea(card, _controller.text);
    final previous = store.activeIdea;

    final makeActive = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('บันทึกไอเดียแล้ว'),
        content: Text(previous == null
            ? 'ตั้งเป็นไอเดียหลักที่กำลังทำอยู่เลยไหม? (ตั้งชื่อการทดลองในสมุดแล็บ แล้วเปิดคุยกับ AI Coach)'
            : 'ตอนนี้ไอเดียหลักคือ "${previous.text}"\nสลับมาใช้ไอเดียนี้แทนไหม? ไอเดียเดิมยังอยู่ในรายการไอเดียของคุณ'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('ยังไม่ตอนนี้')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: Text(previous == null ? 'ตั้งเป็นไอเดียหลัก' : 'สลับ')),
        ],
      ),
    );
    navigator.pop();
    if (makeActive != true) return;
    store.setActiveIdea(idea.id);
    final title = idea.text.length > 80 ? '${idea.text.substring(0, 80)}…' : idea.text;
    learner.setLabSessionTitle(title);
    final session = learner.createNewSession(
      title: '💡 ${card.title}',
      category: 'Socratic Research',
      initialMessages: [
        ChatMessage(
          text: 'ไอเดียของผม: ${idea.text}\n(เริ่มจากการ์ด "${card.title}") ช่วยตั้งคำถามให้ผมคิดเรื่องสมมติฐานและวิธีวัดผลหน่อยครับ',
          isUser: true,
          timestamp: DateTime.now(),
        ),
      ],
    );
    if (rootContext.mounted) AiCoachModal.show(rootContext, initialSession: session);
  }

  @override
  Widget build(BuildContext context) {
    final card = widget.card;
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(context).viewInsets.bottom + 20),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('เขียนไอเดียด้วยคำพูดของคุณเอง', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 17)),
            const SizedBox(height: 6),
            Text('การ์ด "${card.title}" เป็นแค่จุดตั้งต้น เล่าว่าคุณอยากทำอะไร กับใคร และจะรู้ได้อย่างไรว่าได้ผล (ห้ามคัดลอกข้อความบนการ์ด)',
                style: TextStyle(color: AppTheme.textMuted, fontSize: 12.5, height: 1.4)),
            const SizedBox(height: 12),
            TextField(
              controller: _controller,
              minLines: 3,
              maxLines: 6,
              maxLength: 500,
              onChanged: (_) => setState(() => _error = null),
              decoration: InputDecoration(border: const OutlineInputBorder(), errorText: _error, errorMaxLines: 3),
            ),
            const SizedBox(height: 8),
            SizedBox(width: double.infinity, child: FilledButton(onPressed: _save, child: const Text('บันทึกเป็นไอเดีย'))),
          ],
        ),
      ),
    );
  }
}
