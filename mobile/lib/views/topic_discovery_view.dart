import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/learner_state.dart';
import '../models/topic_card.dart';
import '../theme/app_theme.dart';
import 'ai_coach_dialog.dart';

class TopicDiscoveryView extends StatefulWidget {
  const TopicDiscoveryView({super.key});

  @override
  State<TopicDiscoveryView> createState() => _TopicDiscoveryViewState();
}

class _TopicDiscoveryViewState extends State<TopicDiscoveryView> {
  String _selectedSubject = 'ทั้งหมด';
  int _currentIndex = 0;

  List<TopicCard> get _filteredCards {
    if (_selectedSubject == 'ทั้งหมด') {
      return seedTopicCards;
    }
    return seedTopicCards.where((c) => c.subject == _selectedSubject).toList();
  }

  void _nextCard() {
    setState(() {
      if (_currentIndex < _filteredCards.length - 1) {
        _currentIndex++;
      } else {
        _currentIndex = 0; // Loop back
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final learner = context.watch<LearnerState>();
    final cards = _filteredCards;
    final currentCard = cards.isNotEmpty && _currentIndex < cards.length
        ? cards[_currentIndex]
        : null;

    final isFav = currentCard != null && learner.isShortlisted(currentCard.id);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.surface1,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new_rounded, color: AppTheme.textPrimary, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'สำรวจการ์ดหัวข้อวิจัย',
          style: TextStyle(
            color: AppTheme.textPrimary,
            fontWeight: FontWeight.bold,
            fontSize: 17,
          ),
        ),
        actions: [
          TextButton.icon(
            onPressed: () => _showShortlistSheet(context, learner),
            icon: Icon(Icons.favorite_rounded, color: AppTheme.accentRed, size: 18),
            label: Text(
              '${learner.shortlistedCards.length}',
              style: TextStyle(
                color: AppTheme.textPrimary,
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // 1. Subject Filter Chips
            Container(
              padding: const EdgeInsets.symmetric(vertical: 8.0),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: Row(
                  children: [
                    'ทั้งหมด',
                    'คอมพิวเตอร์ & AI',
                    'ชีววิทยา & สุขภาพ',
                    'ฟิสิกส์ & พลังงาน',
                    'วิศวกรรม & หุ่นยนต์',
                    'สิ่งแวดล้อม',
                  ].map((sub) {
                    final isSel = sub == _selectedSubject;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8.0),
                      child: ChoiceChip(
                        label: Text(
                          sub,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                            color: isSel
                                ? (AppTheme.isDark ? Colors.black : Colors.white)
                                : AppTheme.textPrimary,
                          ),
                        ),
                        selected: isSel,
                        selectedColor: AppTheme.primaryCyan,
                        backgroundColor: AppTheme.surface2,
                        side: BorderSide(
                          color: isSel ? AppTheme.primaryCyan : AppTheme.borderStroke,
                        ),
                        onSelected: (val) {
                          if (val) {
                            setState(() {
                              _selectedSubject = sub;
                              _currentIndex = 0;
                            });
                          }
                        },
                      ),
                    );
                  }).toList(),
                ),
              ),
            ),

            // 2. Main Topic Card Display
            Expanded(
              child: currentCard == null
                  ? Center(
                      child: Text('ไม่พบหัวข้อในหมวดนี้', style: TextStyle(color: AppTheme.textMuted)),
                    )
                  : Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                      child: Container(
                        padding: const EdgeInsets.all(20.0),
                        decoration: AppTheme.cardDecoration(
                          border: isFav ? AppTheme.accentRed.withValues(alpha: 0.5) : null,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Header: Subject & Counter
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: AppTheme.primaryCyan.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    currentCard.subject,
                                    style: TextStyle(
                                      color: AppTheme.primaryCyan,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 11.5,
                                    ),
                                  ),
                                ),
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: AppTheme.accentGreen.withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Row(
                                        children: [
                                          Icon(Icons.shield_rounded, size: 12, color: AppTheme.accentGreen),
                                          const SizedBox(width: 4),
                                          Text(
                                            'SRC Safe',
                                            style: TextStyle(color: AppTheme.accentGreen, fontSize: 10, fontWeight: FontWeight.bold),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      '${_currentIndex + 1}/${cards.length}',
                                      style: TextStyle(color: AppTheme.textMuted, fontSize: 12, fontWeight: FontWeight.bold),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),

                            // Title
                            Text(
                              currentCard.title,
                              style: TextStyle(
                                color: AppTheme.textPrimary,
                                fontSize: 17,
                                fontWeight: FontWeight.bold,
                                height: 1.3,
                              ),
                            ),
                            const SizedBox(height: 12),

                            // Scrollable Body Details
                            Expanded(
                              child: ListView(
                                children: [
                                  // Phenomenon
                                  _InfoBox(
                                    icon: Icons.lightbulb_outline_rounded,
                                    iconColor: AppTheme.accentAmber,
                                    title: 'ปัญหา / ปรากฏการณ์รอบตัว',
                                    content: currentCard.phenomenon,
                                  ),
                                  const SizedBox(height: 10),

                                  // Curiosity Hook
                                  _InfoBox(
                                    icon: Icons.science_outlined,
                                    iconColor: AppTheme.secondaryViolet,
                                    title: 'คำถามท้าทายเชิงวิทยาศาสตร์',
                                    content: currentCard.curiosityHook,
                                  ),
                                  const SizedBox(height: 10),

                                  // Variables Container
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: AppTheme.surface2,
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: AppTheme.borderStroke),
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text('การออกแบบตัวแปร (Variables):', style: TextStyle(color: AppTheme.textSecondary, fontSize: 11.5, fontWeight: FontWeight.bold)),
                                        const SizedBox(height: 6),
                                        Text('• ตัวแปรต้น: ${currentCard.independentVar}', style: TextStyle(color: AppTheme.textPrimary, fontSize: 12)),
                                        const SizedBox(height: 4),
                                        Text('• ตัวแปรตาม: ${currentCard.dependentVar}', style: TextStyle(color: AppTheme.textPrimary, fontSize: 12)),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 10),

                                  // Resource / Timeline summary
                                  Row(
                                    children: [
                                      Expanded(
                                        child: _StatPill(
                                          icon: Icons.schedule_rounded,
                                          label: '${currentCard.estimatedWeeks} สัปดาห์',
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: _StatPill(
                                          icon: Icons.payments_outlined,
                                          label: currentCard.estimatedBudgetBaht == 0
                                              ? 'งบ 0 บาท'
                                              : 'งบ ~${currentCard.estimatedBudgetBaht} ฿',
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
            ),

            // 3. Action Buttons Row (Tinder-Style Controls)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  // Pass / Skip Button
                  IconButton(
                    onPressed: _nextCard,
                    icon: Icon(Icons.close_rounded, size: 26, color: AppTheme.textMuted),
                    style: IconButton.styleFrom(
                      padding: const EdgeInsets.all(14),
                      backgroundColor: AppTheme.surface2,
                      side: BorderSide(color: AppTheme.borderStroke),
                    ),
                  ),

                  // Start AI Coaching Button
                  ElevatedButton.icon(
                    onPressed: currentCard == null
                        ? null
                        : () {
                            final sess = learner.createNewSession(
                              title: '🔬 วิจัย: ${currentCard.title}',
                              category: 'Socratic Research',
                              initialMessages: [
                                ChatMessage(
                                  text: 'สวัสดีครับโค้ช ผมสนใจทำโครงงานเรื่อง "${currentCard.title}" ในสาขา ${currentCard.subject} ช่วยแนะนำการตั้งสมมติฐานและวิธีวัดตัวแปรตามอย่างละเอียดหน่อยครับ',
                                  isUser: true,
                                  timestamp: DateTime.now(),
                                ),
                              ],
                            );
                            AiCoachModal.show(context, initialSession: sess);
                          },
                    icon: Icon(Icons.psychology_rounded, size: 20, color: AppTheme.isDark ? Colors.black : Colors.white),
                    label: Text(
                      'คุยกับ AI โค้ช',
                      style: TextStyle(
                        color: AppTheme.isDark ? Colors.black : Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 13.5,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryCyan,
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusPill)),
                    ),
                  ),

                  // Shortlist (Favorite) Button
                  IconButton(
                    onPressed: currentCard == null
                        ? null
                        : () {
                            learner.toggleShortlist(currentCard);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  learner.isShortlisted(currentCard.id)
                                      ? 'เก็บเข้า Shortlist เรียบร้อย ❤️'
                                      : 'นำออกจาก Shortlist แล้ว',
                                ),
                                duration: const Duration(milliseconds: 1200),
                              ),
                            );
                            _nextCard();
                          },
                    icon: Icon(
                      isFav ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                      size: 26,
                      color: AppTheme.accentRed,
                    ),
                    style: IconButton.styleFrom(
                      padding: const EdgeInsets.all(14),
                      backgroundColor: AppTheme.surface2,
                      side: BorderSide(color: isFav ? AppTheme.accentRed : AppTheme.borderStroke),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showShortlistSheet(BuildContext context, LearnerState learner) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.surface1,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            final items = learner.shortlistedCards;
            return Container(
              padding: const EdgeInsets.all(20),
              height: MediaQuery.of(ctx).size.height * 0.75,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.favorite_rounded, color: AppTheme.accentRed, size: 22),
                          const SizedBox(width: 8),
                          Text(
                            'Shortlist หัวข้อวิจัยที่คุณสนใจ (${items.length})',
                            style: TextStyle(
                              color: AppTheme.textPrimary,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(ctx),
                        icon: const Icon(Icons.close_rounded),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (items.isEmpty)
                    Expanded(
                      child: Center(
                        child: Text('ยังไม่มีหัวข้อใน Shortlist แตะปุ่มหัวใจ ❤️ เพื่อเก็บหัวข้อที่คุณสนใจ', style: TextStyle(color: AppTheme.textMuted)),
                      ),
                    )
                  else
                    Expanded(
                      child: ListView.builder(
                        itemCount: items.length,
                        itemBuilder: (ctx, idx) {
                          final c = items[idx];
                          return Card(
                            color: AppTheme.surface2,
                            margin: const EdgeInsets.only(bottom: 10),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                              side: BorderSide(color: AppTheme.borderStroke),
                            ),
                            child: ListTile(
                              title: Text(
                                c.title,
                                style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 13.5),
                              ),
                              subtitle: Text(
                                '${c.subject} • ${c.estimatedWeeks} สัปดาห์',
                                style: TextStyle(color: AppTheme.textMuted, fontSize: 11.5),
                              ),
                              trailing: IconButton(
                                icon: const Icon(Icons.delete_outline_rounded, color: AppTheme.accentRed, size: 20),
                                onPressed: () {
                                  learner.toggleShortlist(c);
                                  setSheetState(() {});
                                },
                              ),
                              onTap: () {
                                Navigator.pop(ctx);
                                final sess = learner.createNewSession(
                                  title: '🔬 วิจัย: ${c.title}',
                                  category: 'Socratic Research',
                                  initialMessages: [
                                    ChatMessage(
                                      text: 'สวัสดีครับโค้ช ผมเลือกหัวข้อ "${c.title}" จาก Shortlist ช่วยแนะนำขั้นตอนเริ่มต้นหน่อยครับ',
                                      isUser: true,
                                      timestamp: DateTime.now(),
                                    ),
                                  ],
                                );
                                AiCoachModal.show(context, initialSession: sess);
                              },
                            ),
                          );
                        },
                      ),
                    ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

class _InfoBox extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String content;

  const _InfoBox({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.content,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.surface2,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.borderStroke),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: iconColor),
              const SizedBox(width: 6),
              Text(
                title,
                style: TextStyle(
                  color: iconColor,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            content,
            style: TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 12.5,
              height: 1.35,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatPill extends StatelessWidget {
  final IconData icon;
  final String label;

  const _StatPill({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: AppTheme.surface2,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.borderStroke),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 14, color: AppTheme.textSecondary),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(color: AppTheme.textPrimary, fontSize: 11.5, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}
