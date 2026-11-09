import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../models/learner_state.dart';
import '../theme/app_theme.dart';
import 'ai_coach_dialog.dart';

class LabLogBookView extends StatefulWidget {
  const LabLogBookView({super.key});

  @override
  State<LabLogBookView> createState() => _LabLogBookViewState();
}

class _LabLogBookViewState extends State<LabLogBookView> {
  String _selectedFilterTag = 'ทั้งหมด';

  @override
  Widget build(BuildContext context) {
    final learner = context.watch<LearnerState>();

    final filteredObservations = _selectedFilterTag == 'ทั้งหมด'
        ? learner.labObservations
        : learner.labObservations
            .where((o) => o.tag.toLowerCase().contains(_selectedFilterTag.toLowerCase()))
            .toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16.0, 20.0, 16.0, 110.0),
      children: [
        // 1. Header: Lab Log Book Title Banner
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.menu_book_rounded, color: AppTheme.primaryCyan, size: 22),
                      const SizedBox(width: 8),
                      Flexible(
                        child: Text(
                          'สมุดบันทึกแล็บ (Lab Log Book)',
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: AppTheme.textPrimary,
                            fontWeight: FontWeight.bold,
                            fontSize: 17,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Electronic Lab Notebook • YSC/ISEF',
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // 2. Active Experiment Card
        Container(
          padding: const EdgeInsets.all(16.0),
          decoration: AppTheme.cardDecoration(border: AppTheme.primaryCyan.withValues(alpha: 0.35)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppTheme.primaryCyan.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppTheme.primaryCyan, width: 1.2),
                    ),
                    child: Center(
                      child: Icon(Icons.biotech_rounded, color: AppTheme.primaryCyan, size: 24),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'หัวข้อการทดลองปัจจุบัน',
                          style: TextStyle(
                            color: AppTheme.primaryCyan,
                            fontSize: 11.5,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          learner.currentLabSessionTitle.isNotEmpty
                              ? learner.currentLabSessionTitle
                              : 'ยังไม่ได้ตั้งชื่อการทดลอง (แตะดินสอเพื่อตั้งชื่อ)',
                          style: TextStyle(
                            color: learner.currentLabSessionTitle.isNotEmpty
                                ? AppTheme.textPrimary
                                : AppTheme.textMuted,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            height: 1.3,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => _showEditTitleDialog(context, learner),
                    tooltip: 'แก้ไขชื่อการทดลอง',
                    icon: Icon(Icons.edit_outlined, size: 18, color: AppTheme.primaryCyan),
                    style: IconButton.styleFrom(
                      backgroundColor: AppTheme.surface2,
                      side: BorderSide(color: AppTheme.borderStroke),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Action Buttons Row: Add observation & Copy table
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _showAddObservationDialog(context, learner),
                      icon: Icon(Icons.add_rounded, size: 18, color: AppTheme.isDark ? Colors.black : Colors.white),
                      label: Text(
                        'จดบันทึกผลแล็บ',
                        style: TextStyle(
                          color: AppTheme.isDark ? Colors.black : Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 12.5,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryCyan,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  OutlinedButton.icon(
                    onPressed: learner.labObservations.isEmpty
                        ? null
                        : () => _copyObservationsTable(context, learner),
                    icon: Icon(Icons.copy_rounded, size: 16, color: AppTheme.textPrimary),
                    label: Text(
                      'คัดลอกตาราง',
                      style: TextStyle(
                        color: AppTheme.textPrimary,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: AppTheme.borderStroke),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // 3. Compact Lab Stopwatch Card (Compact Timer Tool)
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
          decoration: AppTheme.cardDecoration(),
          child: Row(
            children: [
              // Running dot indicator
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: learner.isTimerRunning ? AppTheme.accentGreen : AppTheme.textMuted,
                  boxShadow: learner.isTimerRunning
                      ? [
                          BoxShadow(
                            color: AppTheme.accentGreen.withValues(alpha: 0.6),
                            blurRadius: 8,
                            spreadRadius: 2,
                          ),
                        ]
                      : null,
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'เวลาทำการทดลอง',
                    style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
                  ),
                  _StopwatchText(learner: learner),
                ],
              ),
              const Spacer(),
              // Play / Pause Button
              IconButton(
                onPressed: () {
                  HapticFeedback.lightImpact();
                  learner.toggleTimer();
                },
                tooltip: learner.isTimerRunning ? 'หยุดชั่วคราว' : 'เริ่มจับเวลา',
                icon: Icon(
                  learner.isTimerRunning ? Icons.pause_rounded : Icons.play_arrow_rounded,
                  color: learner.isTimerRunning ? Colors.white : (AppTheme.isDark ? Colors.black : Colors.white),
                  size: 22,
                ),
                style: IconButton.styleFrom(
                  backgroundColor: learner.isTimerRunning ? AppTheme.accentAmber : AppTheme.primaryCyan,
                  padding: const EdgeInsets.all(10),
                ),
              ),
              const SizedBox(width: 6),
              // Reset Button
              IconButton(
                onPressed: !learner.isTimerRunning && learner.labTimerSeconds == 0
                    ? null
                    : () {
                        HapticFeedback.mediumImpact();
                        learner.resetTimer();
                      },
                tooltip: 'รีเซ็ตเวลา',
                icon: Icon(Icons.refresh_rounded, size: 20, color: AppTheme.textMuted),
                style: IconButton.styleFrom(
                  backgroundColor: AppTheme.surface2,
                  side: BorderSide(color: AppTheme.borderStroke),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // 4. Research Variables & Rigor Prompt Card
        Container(
          padding: const EdgeInsets.all(14.0),
          decoration: AppTheme.cardDecoration(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Icon(Icons.schema_outlined, size: 16, color: AppTheme.secondaryViolet),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'กรอบตัวแปรการทดลอง (Variables)',
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: AppTheme.textPrimary,
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ),
                  InkWell(
                    onTap: () {
                      final sess = learner.createNewSession(
                        title: '🧪 ตรวจสอบตัวแปร: ${learner.currentLabSessionTitle.isNotEmpty ? learner.currentLabSessionTitle : learner.selectedField}',
                        category: 'Socratic Research',
                        initialMessages: [
                          ChatMessage(
                            text: 'สวัสดีครับอาจารย์โค้ช ผมต้องการตรวจสอบความรัดกุมของตัวแปรต้น ตัวแปรตาม และกลุ่มควบคุม (Control Group) สำหรับการทดลองแล็บนี้ครับ',
                            isUser: true,
                            timestamp: DateTime.now(),
                          ),
                        ],
                      );
                      AiCoachModal.show(context, initialSession: sess);
                    },
                    borderRadius: BorderRadius.circular(6),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      child: Row(
                        children: [
                          Icon(Icons.auto_awesome_rounded, size: 13, color: AppTheme.primaryCyan),
                          const SizedBox(width: 4),
                          Text(
                            'ปรึกษา AI โค้ช',
                            style: TextStyle(color: AppTheme.primaryCyan, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  _VariableChip(title: 'ตัวแปรต้น', subtitle: 'ปัจจัยทดสอบ', color: AppTheme.primaryCyan),
                  _VariableChip(title: 'ตัวแปรตาม', subtitle: 'ค่าที่วัด (Metric)', color: AppTheme.secondaryViolet),
                  _VariableChip(title: 'ตัวแปรควบคุม', subtitle: 'ชุดมาตรฐาน/Control', color: AppTheme.accentGreen),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // 5. Observations Timeline Header & Tag Filter
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Icon(Icons.format_list_bulleted_rounded, color: AppTheme.primaryCyan, size: 18),
                const SizedBox(width: 8),
                Text(
                  'บันทึกข้อมูลเชิงประจักษ์ (${learner.labObservations.length})',
                  style: TextStyle(
                    color: AppTheme.textPrimary,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
            if (learner.labObservations.isNotEmpty)
              Text(
                'เรียงจากล่าสุด',
                style: TextStyle(color: AppTheme.textMuted, fontSize: 11.5),
              ),
          ],
        ),
        const SizedBox(height: 10),

        // Filter Chips
        if (learner.labObservations.isNotEmpty)
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: ['ทั้งหมด', 'Trial', 'Control', 'Peak', 'Anomaly', 'Milestone'].map((tag) {
                final isSelected = _selectedFilterTag == tag;
                return Padding(
                  padding: const EdgeInsets.only(right: 6.0),
                  child: FilterChip(
                    label: Text(tag),
                    selected: isSelected,
                    onSelected: (val) => setState(() => _selectedFilterTag = tag),
                    backgroundColor: AppTheme.surface1,
                    selectedColor: AppTheme.primaryCyan.withValues(alpha: 0.2),
                    labelStyle: TextStyle(
                      color: isSelected ? AppTheme.primaryCyan : AppTheme.textSecondary,
                      fontSize: 11.5,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    ),
                    side: BorderSide(
                      color: isSelected ? AppTheme.primaryCyan : AppTheme.borderStroke,
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
                  ),
                );
              }).toList(),
            ),
          ),
        const SizedBox(height: 10),

        // 6. Observations List / Empty State
        if (filteredObservations.isEmpty)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 32.0, horizontal: 16.0),
            decoration: AppTheme.cardDecoration(),
            child: Column(
              children: [
                Icon(Icons.science_outlined, size: 40, color: AppTheme.textMuted),
                const SizedBox(height: 10),
                Text(
                  learner.labObservations.isEmpty
                      ? 'ยังไม่มีบันทึกผลการทดลองในสมุดแล็บ'
                      : 'ไม่พบบันทึกในหมวด $_selectedFilterTag',
                  style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 14),
                ),
                const SizedBox(height: 6),
                Text(
                  learner.labObservations.isEmpty
                      ? 'แตะปุ่ม "จดบันทึกผลแล็บ" ด้านบนเพื่อเริ่มบันทึกผลการทดลองรอบแรก (Trial 1)'
                      : 'ลองเลือกตัวกรองหมวดอื่น หรือกดบันทึกผลใหม่',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppTheme.textMuted, fontSize: 12, height: 1.4),
                ),
              ],
            ),
          )
        else
          ...filteredObservations.map((obs) => _ObservationLogCard(
                observation: obs,
                onDelete: () => learner.deleteObservation(obs.id),
              )),
      ],
    );
  }

  void _copyObservationsTable(BuildContext context, LearnerState learner) {
    final buffer = StringBuffer();
    buffer.writeln('| เวลา | หมวดหมู่ | บันทึกผลการทดลอง / ข้อมูลเชิงประจักษ์ |');
    buffer.writeln('| :--- | :--- | :--- |');
    for (final o in learner.labObservations.reversed) {
      buffer.writeln('| ${o.time} | ${o.tag} | ${o.note.replaceAll('\n', ' ')} |');
    }

    Clipboard.setData(ClipboardData(text: buffer.toString()));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('คัดลอกตารางผลการทดลองแบบ Markdown ลงคลิปบอร์ดแล้ว 📋'),
        duration: Duration(seconds: 2),
      ),
    );
  }

  void _showEditTitleDialog(BuildContext context, LearnerState learner) {
    final controller = TextEditingController(text: learner.currentLabSessionTitle);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.surface1,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          'ตั้งชื่อหัวข้อการทดลองแล็บ',
          style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 16),
        ),
        content: TextField(
          controller: controller,
          autofocus: true,
          style: TextStyle(color: AppTheme.textPrimary, fontSize: 14),
          decoration: InputDecoration(
            hintText: 'เช่น ทดสอบการเหนี่ยวนำเซนเซอร์วัดค่าฝุ่น',
            hintStyle: TextStyle(color: AppTheme.textMuted),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: AppTheme.primaryCyan),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('ยกเลิก', style: TextStyle(color: AppTheme.textMuted)),
          ),
          ElevatedButton(
            onPressed: () {
              final newTitle = controller.text.trim();
              if (newTitle.isNotEmpty) {
                learner.setLabSessionTitle(newTitle);
              }
              Navigator.pop(ctx);
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryCyan),
            child: Text(
              'บันทึก',
              style: TextStyle(
                color: AppTheme.isDark ? Colors.black : Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showAddObservationDialog(BuildContext context, LearnerState learner) {
    final noteController = TextEditingController();
    String selectedTag = 'Trial 1';
    final presets = [
      'เริ่มรอบการวัดครั้งแรก: ค่าตัวแปรคงที่ตามสภาพแวดล้อมควบคุม',
      'ค่าตอบสนองพีค (Peak): พบการเปลี่ยนแปลงอย่างมีนัยสำคัญ',
      'การทดสอบชุดควบคุม (Control Group): ค่าคงที่ baseline',
      'พบความคลาดเคลื่อน (Anomaly): ทำการวัดซ้ำเพื่อตรวจสอบ',
      'เสร็จสิ้นรอบการสังเกต: สรุปค่าเฉลี่ยและเตรียมนำไปพล็อต',
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.surface1,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(Icons.edit_note_rounded, color: AppTheme.primaryCyan, size: 22),
                      const SizedBox(width: 8),
                      Text(
                        'จดบันทึกผลแล็บใหม่',
                        style: TextStyle(
                          color: AppTheme.textPrimary,
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                    ],
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(ctx),
                    icon: Icon(Icons.close_rounded, color: AppTheme.textMuted, size: 20),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Tag selection
              Text(
                'ประเภทการบันทึก (Tag):',
                style: TextStyle(color: AppTheme.textMuted, fontSize: 12, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: ['Trial 1', 'Trial 2', 'Control', 'Peak Event', 'Anomaly', 'Milestone'].map((tag) {
                    final isSelected = selectedTag == tag;
                    return Padding(
                      padding: const EdgeInsets.only(right: 6.0),
                      child: ChoiceChip(
                        label: Text(tag),
                        selected: isSelected,
                        onSelected: (val) => setSheetState(() => selectedTag = tag),
                        backgroundColor: AppTheme.surface2,
                        selectedColor: AppTheme.primaryCyan.withValues(alpha: 0.25),
                        labelStyle: TextStyle(
                          color: isSelected ? AppTheme.primaryCyan : AppTheme.textSecondary,
                          fontSize: 12,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        ),
                        side: BorderSide(color: isSelected ? AppTheme.primaryCyan : AppTheme.borderStroke),
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 12),

              // Quick presets chips
              Text(
                'ข้อความสำเร็จรูป (แตะเพื่อใส่ข้อความ):',
                style: TextStyle(color: AppTheme.textMuted, fontSize: 11.5),
              ),
              const SizedBox(height: 6),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: presets.map((p) => Padding(
                    padding: const EdgeInsets.only(right: 6.0),
                    child: ActionChip(
                      label: Text(p.length > 25 ? '${p.substring(0, 25)}...' : p),
                      backgroundColor: AppTheme.surface2,
                      side: BorderSide(color: AppTheme.borderStroke),
                      labelStyle: TextStyle(color: AppTheme.textSecondary, fontSize: 11),
                      onPressed: () {
                        noteController.text = p;
                        setSheetState(() {});
                      },
                    ),
                  )).toList(),
                ),
              ),
              const SizedBox(height: 12),

              // Note text field
              TextField(
                controller: noteController,
                maxLines: 3,
                style: TextStyle(color: AppTheme.textPrimary, fontSize: 14),
                decoration: InputDecoration(
                  hintText: 'บันทึกการสังเกต, ผลการวัด, ค่าสถิติ หรือความผิดปกติที่พบ...',
                  hintStyle: TextStyle(color: AppTheme.textMuted, fontSize: 13),
                  filled: true,
                  fillColor: AppTheme.surface2,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppTheme.borderStroke)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppTheme.primaryCyan)),
                ),
              ),
              const SizedBox(height: 16),

              // Save button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    final note = noteController.text.trim();
                    if (note.isNotEmpty) {
                      learner.addObservation(note: note, tag: selectedTag);
                      Navigator.pop(ctx);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('บันทึกผลการทดลองลงสมุดแล็บเรียบร้อย 🧪'),
                          duration: Duration(seconds: 1),
                        ),
                      );
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryCyan,
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Text(
                    'บันทึกผลการทดลอง',
                    style: TextStyle(
                      color: AppTheme.isDark ? Colors.black : Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Ticks only itself once a second while running, instead of rebuilding the whole app.
class _StopwatchText extends StatefulWidget {
  final LearnerState learner;
  const _StopwatchText({required this.learner});

  @override
  State<_StopwatchText> createState() => _StopwatchTextState();
}

class _StopwatchTextState extends State<_StopwatchText> {
  Timer? _ticker;

  @override
  void initState() {
    super.initState();
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (widget.learner.isTimerRunning) setState(() {});
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Text(
      widget.learner.formattedStudyTime,
      style: TextStyle(
        color: AppTheme.textPrimary,
        fontWeight: FontWeight.bold,
        fontSize: 22,
        fontFamily: 'monospace',
      ),
    );
  }
}

class _VariableChip extends StatelessWidget {
  final String title;
  final String subtitle;
  final Color color;

  const _VariableChip({
    required this.title,
    required this.subtitle,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 11)),
          Text(subtitle, style: TextStyle(color: AppTheme.textSecondary, fontSize: 10)),
        ],
      ),
    );
  }
}

class _ObservationLogCard extends StatelessWidget {
  final LabObservation observation;
  final VoidCallback onDelete;

  const _ObservationLogCard({
    required this.observation,
    required this.onDelete,
  });

  Color _getTagColor(String tag) {
    switch (tag.toLowerCase()) {
      case 'control':
        return AppTheme.secondaryViolet;
      case 'peak event':
      case 'peak':
        return AppTheme.accentAmber;
      case 'anomaly':
      case 'error':
        return AppTheme.accentRed;
      case 'milestone':
        return AppTheme.accentGreen;
      default:
        return AppTheme.primaryCyan;
    }
  }

  @override
  Widget build(BuildContext context) {
    final tagColor = _getTagColor(observation.tag);

    return Container(
      margin: const EdgeInsets.only(bottom: 10.0),
      padding: const EdgeInsets.all(14.0),
      decoration: AppTheme.cardDecoration(),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: tagColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: tagColor.withValues(alpha: 0.3)),
            ),
            child: Text(
              observation.tag,
              style: TextStyle(color: tagColor, fontSize: 11, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      observation.time,
                      style: TextStyle(
                        color: AppTheme.textMuted,
                        fontSize: 11,
                        fontFamily: 'monospace',
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    InkWell(
                      onTap: onDelete,
                      borderRadius: BorderRadius.circular(4),
                      child: Padding(
                        padding: const EdgeInsets.all(2.0),
                        child: Icon(Icons.delete_outline_rounded, size: 16, color: AppTheme.textMuted),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  observation.note,
                  style: TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 13,
                    height: 1.4,
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
