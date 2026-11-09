import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../discovery/ai_card_service.dart';
import '../discovery/catalog.dart';
import '../discovery/catalog.g.dart';
import '../discovery/discovery_store.dart';
import '../models/learner_state.dart';
import '../theme/app_theme.dart';
import 'shortlist_compare_view.dart';
import 'idea_composer.dart';

/// Discovery Track: Subject → Subfield → swipe flash cards → Shortlist (max 5) → compare → Idea.
class TopicDiscoveryView extends StatelessWidget {
  const TopicDiscoveryView({super.key});

  @override
  Widget build(BuildContext context) {
    final store = context.watch<DiscoveryStore>();
    final subfield = discoverySubfields.where((f) => f.id == store.currentSubfieldId).firstOrNull;
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.background,
        elevation: 0,
        title: Text(subfield?.nameTh ?? 'ค้นหาหัวข้อโครงงาน',
            style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 17)),
        iconTheme: IconThemeData(color: AppTheme.textPrimary),
        actions: [
          if (subfield != null)
            IconButton(
              tooltip: 'เปลี่ยนสาขาย่อย',
              icon: const Icon(Icons.swap_horiz_rounded),
              onPressed: () => store.setSubfield(null),
            ),
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: ActionChip(
              avatar: Icon(Icons.favorite_rounded, size: 16, color: AppTheme.accentRed),
              label: Text('Shortlist ${store.shortlist.length}/$shortlistLimit'),
              onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ShortlistCompareView())),
            ),
          ),
        ],
      ),
      body: subfield == null ? const _SubjectSubfieldPicker() : _Deck(subfield: subfield),
    );
  }
}

class _SubjectSubfieldPicker extends StatefulWidget {
  const _SubjectSubfieldPicker();
  @override
  State<_SubjectSubfieldPicker> createState() => _SubjectSubfieldPickerState();
}

class _SubjectSubfieldPickerState extends State<_SubjectSubfieldPicker> {
  String? _subjectId;

  @override
  Widget build(BuildContext context) {
    final subject = discoverySubjects.where((s) => s.id == _subjectId).firstOrNull;
    final items = subject == null
        ? [for (final s in discoverySubjects) (s.nameTh, s.description, () => setState(() => _subjectId = s.id))]
        : [
            for (final f in discoverySubfields.where((f) => f.subjectId == subject.id))
              (f.nameTh, f.description, () => context.read<DiscoveryStore>().setSubfield(f.id)),
          ];
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      children: [
        if (subject != null)
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: () => setState(() => _subjectId = null),
              icon: const Icon(Icons.arrow_back_rounded, size: 18),
              label: Text('วิชา: ${subject.nameTh}'),
            ),
          ),
        Text(subject == null ? '1. เลือกวิชาที่สนใจ' : '2. เลือกสาขาย่อย',
            style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 16)),
        const SizedBox(height: 12),
        for (final (title, desc, onTap) in items)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Material(
              color: AppTheme.surface1,
              borderRadius: BorderRadius.circular(16),
              child: ListTile(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(color: AppTheme.borderStroke),
                ),
                title: Text(title, style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold)),
                subtitle: Text(desc, style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: onTap,
              ),
            ),
          ),
      ],
    );
  }
}

class _Deck extends StatefulWidget {
  final DiscoverySubfield subfield;
  const _Deck({required this.subfield});
  @override
  State<_Deck> createState() => _DeckState();
}

class _DeckState extends State<_Deck> {
  bool _generating = false;

  void _openCompare() => Navigator.push(context, MaterialPageRoute(builder: (_) => const ShortlistCompareView()));

  void _swipe(DiscoveryCard card, {required bool like}) {
    HapticFeedback.selectionClick();
    final result = context.read<DiscoveryStore>().swipe(card, like: like);
    if (result == SwipeResult.shortlistFull) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Shortlist ครบ 5 ใบแล้ว เทียบแล้วเอาออกก่อนจึงจะเก็บใบใหม่ได้')),
      );
      _openCompare();
    }
  }

  Future<void> _askAi() async {
    final interest = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.surface1,
      builder: (ctx) => _AiInterestSheet(subfield: widget.subfield),
    );
    if (interest == null || !mounted) return;
    setState(() => _generating = true);
    final messenger = ScaffoldMessenger.of(context);
    final store = context.read<DiscoveryStore>();
    try {
      final cards = await AiCardService.generate(
        subfield: widget.subfield,
        gradeLevel: context.read<LearnerState>().gradeCode,
        interest: interest,
      );
      store.addAiCards(cards);
      messenger.showSnackBar(SnackBar(content: Text('AI คิดการ์ดใหม่ให้ ${cards.length} ใบ')));
    } on AiCardError catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.messageTh)));
    } catch (_) {
      messenger.showSnackBar(const SnackBar(content: Text('เชื่อมต่อไม่ได้ ลองใหม่เมื่อมีอินเทอร์เน็ต')));
    } finally {
      if (mounted) setState(() => _generating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final store = context.watch<DiscoveryStore>();
    final learner = context.watch<LearnerState>();
    final deck = store.deck(widget.subfield.id, learner.gradeCode);
    final aiButton = OutlinedButton.icon(
      onPressed: _generating ? null : _askAi,
      icon: _generating
          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
          : const Icon(Icons.auto_awesome_rounded, size: 18),
      label: Text(_generating ? 'AI กำลังคิด...' : 'ให้ AI คิดการ์ดจากความสนใจ'),
    );

    if (deck.isEmpty) {
      final skipped = store.skippedCount(widget.subfield.id);
      return ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Icon(Icons.style_rounded, size: 48, color: AppTheme.textMuted),
          const SizedBox(height: 12),
          Text('ปัดการ์ดในสาขานี้ครบแล้ว',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 17)),
          const SizedBox(height: 20),
          aiButton,
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: skipped == 0 ? null : () => store.reviewSkipped(widget.subfield.id),
            icon: const Icon(Icons.replay_rounded, size: 18),
            label: Text('ดูใบที่ข้ามอีกรอบ ($skipped ใบ)'),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: () => store.setSubfield(null),
            icon: const Icon(Icons.swap_horiz_rounded, size: 18),
            label: const Text('เปลี่ยนสาขาย่อย'),
          ),
          if (store.shortlist.isNotEmpty) ...[
            const SizedBox(height: 10),
            FilledButton(onPressed: _openCompare, child: Text('เทียบ Shortlist (${store.shortlist.length} ใบ)')),
          ],
        ],
      );
    }

    final card = deck.first;
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
          child: Text('เหลือ ${deck.length} ใบ • แตะการ์ดเพื่อพลิกดูรายละเอียด • ปัดซ้ายข้าม ปัดขวาสนใจ',
              textAlign: TextAlign.center, style: TextStyle(color: AppTheme.textMuted, fontSize: 11.5)),
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Dismissible(
              key: ValueKey('deck_${card.id}'),
              confirmDismiss: (dir) async {
                final like = dir == DismissDirection.startToEnd;
                if (like && store.shortlistFull) {
                  _swipe(card, like: true); // shows the message and opens compare
                  return false;
                }
                return true;
              },
              onDismissed: (dir) => _swipe(card, like: dir == DismissDirection.startToEnd),
              child: FlashCard(card: card),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _RoundButton(icon: Icons.close_rounded, label: 'ข้าม', onTap: () => _swipe(card, like: false)),
              _RoundButton(icon: Icons.undo_rounded, label: 'ย้อน', onTap: store.canUndo ? store.undo : null),
              _RoundButton(
                icon: Icons.favorite_rounded,
                label: 'สนใจ',
                color: AppTheme.accentRed,
                onTap: () => _swipe(card, like: true),
              ),
            ],
          ),
        ),
        Padding(padding: const EdgeInsets.fromLTRB(16, 0, 16, 16), child: SizedBox(width: double.infinity, child: aiButton)),
      ],
    );
  }
}

class _RoundButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  final Color? color;
  const _RoundButton({required this.icon, required this.label, required this.onTap, this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton.outlined(
          onPressed: onTap,
          iconSize: 28,
          tooltip: label,
          icon: Icon(icon, color: onTap == null ? AppTheme.textMuted : (color ?? AppTheme.textPrimary)),
        ),
        Text(label, style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
      ],
    );
  }
}

/// Topic Card as a two-sided flash card: tap to flip.
class FlashCard extends StatefulWidget {
  final DiscoveryCard card;
  const FlashCard({super.key, required this.card});
  @override
  State<FlashCard> createState() => _FlashCardState();
}

class _FlashCardState extends State<FlashCard> {
  bool _back = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => setState(() => _back = !_back),
      child: TweenAnimationBuilder<double>(
        tween: Tween(end: _back ? math.pi : 0),
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeInOut,
        builder: (context, angle, _) {
          final showBack = angle > math.pi / 2;
          // At rest, draw the face without the 3D transform: a perspective matrix breaks hit testing
          // for the buttons on the back.
          if ((angle - (_back ? math.pi : 0)).abs() < 0.001) {
            return _CardFace(child: _back ? _Back(card: widget.card) : _Front(card: widget.card));
          }
          return Transform(
            alignment: Alignment.center,
            transform: Matrix4.identity()
              ..setEntry(3, 2, 0.001)
              ..rotateY(angle),
            child: showBack
                ? Transform(
                    alignment: Alignment.center,
                    transform: Matrix4.identity()..rotateY(math.pi),
                    child: _CardFace(child: _back ? _Back(card: widget.card) : const SizedBox()),
                  )
                : _CardFace(child: _Front(card: widget.card)),
          );
        },
      ),
    );
  }
}

class _CardFace extends StatelessWidget {
  final Widget child;
  const _CardFace({required this.child});
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: AppTheme.cardDecoration(),
      child: child,
    );
  }
}

class _Front extends StatelessWidget {
  final DiscoveryCard card;
  const _Front({required this.card});
  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (card.aiGenerated)
            Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AppTheme.secondaryViolet.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text('AI คิดให้ • ยังไม่ได้ตรวจว่ามีคนทำแล้วหรือยัง',
                  style: TextStyle(color: AppTheme.secondaryViolet, fontSize: 11, fontWeight: FontWeight.bold)),
            ),
          Text(card.title, style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w800, fontSize: 20, height: 1.3)),
          const SizedBox(height: 16),
          _Section(icon: Icons.visibility_outlined, title: 'ปรากฏการณ์ที่สังเกตได้', text: card.phenomenon),
          const SizedBox(height: 12),
          _Section(icon: Icons.help_outline_rounded, title: 'คำถามชวนสงสัย', text: card.curiosityHook),
          const SizedBox(height: 12),
          Text('แตะเพื่อพลิกดูสิ่งที่ต้องใช้', style: TextStyle(color: AppTheme.textMuted, fontSize: 11.5)),
        ],
      ),
    );
  }
}

class _Back extends StatelessWidget {
  final DiscoveryCard card;
  const _Back({required this.card});
  @override
  Widget build(BuildContext context) {
    final fit = context.read<LearnerState>().fitConstraints;
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(card.title, style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 12),
          Wrap(spacing: 8, runSpacing: 8, children: [
            _Pill('${card.estimatedWeeks} สัปดาห์'),
            _Pill(card.estimatedBudgetBaht == 0 ? 'ไม่ใช้งบ' : 'งบ ~${card.estimatedBudgetBaht} บาท'),
            _Pill('ความยาก: ${card.difficultyTh}'),
            _Pill('ทีม ${card.minTeamSize}-${card.maxTeamSize} คน'),
          ]),
          const SizedBox(height: 14),
          _Section(icon: Icons.handyman_outlined, title: 'อุปกรณ์', text: card.requiredEquipment.map((e) => '• $e').join('\n')),
          const SizedBox(height: 12),
          _Section(icon: Icons.school_outlined, title: 'ทักษะที่ต้องใช้', text: card.requiredSkills.map((e) => '• $e').join('\n')),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: () => IdeaComposer.show(context, card),
              icon: const Icon(Icons.bolt_rounded),
              label: const Text('อยากทำเลย เลือกใบนี้'),
            ),
          ),
          if (fit.teamSize < card.minTeamSize || fit.teamSize > card.maxTeamSize)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text('ทีมของคุณมี ${fit.teamSize} คน การ์ดนี้แนะนำ ${card.minTeamSize}-${card.maxTeamSize} คน',
                  style: TextStyle(color: AppTheme.accentAmber, fontSize: 11.5)),
            ),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final IconData icon;
  final String title;
  final String text;
  const _Section({required this.icon, required this.title, required this.text});
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(children: [
          Icon(icon, size: 16, color: AppTheme.primaryCyan),
          const SizedBox(width: 6),
          Expanded(child: Text(title, style: TextStyle(color: AppTheme.primaryCyan, fontWeight: FontWeight.bold, fontSize: 12.5))),
        ]),
        const SizedBox(height: 4),
        Text(text, style: TextStyle(color: AppTheme.textSecondary, fontSize: 13.5, height: 1.45)),
      ],
    );
  }
}

class _Pill extends StatelessWidget {
  final String text;
  const _Pill(this.text);
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(color: AppTheme.surface2, borderRadius: BorderRadius.circular(20)),
      child: Text(text, style: TextStyle(color: AppTheme.textPrimary, fontSize: 12)),
    );
  }
}

class _AiInterestSheet extends StatefulWidget {
  final DiscoverySubfield subfield;
  const _AiInterestSheet({required this.subfield});
  @override
  State<_AiInterestSheet> createState() => _AiInterestSheetState();
}

class _AiInterestSheetState extends State<_AiInterestSheet> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(context).viewInsets.bottom + 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('ให้ AI คิดการ์ดใน "${widget.subfield.nameTh}"',
              style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 6),
          Text('การ์ดที่ AI คิดเป็นแค่จุดตั้งต้น ยังไม่ได้ตรวจว่ามีคนทำแล้วหรือยัง และใช้โควตารายวันร่วมกับเว็บ',
              style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
          const SizedBox(height: 12),
          TextField(
            controller: _controller,
            maxLength: 200,
            decoration: const InputDecoration(
              labelText: 'เล่าสิ่งที่สนใจ (ไม่บังคับ)',
              hintText: 'เช่น บ้านปลูกทุเรียน อยากรู้เรื่องดินกับปุ๋ย',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: FilledButton(onPressed: () => Navigator.pop(context, _controller.text), child: const Text('ให้ AI คิดการ์ด')),
          ),
        ],
      ),
    );
  }
}
