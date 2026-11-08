import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../models/learner_state.dart';
import '../theme/app_theme.dart';

class StudyTimerView extends StatelessWidget {
  const StudyTimerView({super.key});

  @override
  Widget build(BuildContext context) {
    final learner = context.watch<LearnerState>();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16.0, 24.0, 16.0, 100.0),
      children: [
        // Lab Session Context Card
        Container(
          padding: const EdgeInsets.all(16.0),
          decoration: AppTheme.cardDecoration(border: AppTheme.primaryCyan.withValues(alpha: 0.3)),
          child: Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: AppTheme.primaryCyan.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                  border: Border.all(color: AppTheme.primaryCyan, width: 1.5),
                ),
                child: Center(
                  child: Icon(Icons.science_rounded, color: AppTheme.primaryCyan, size: 26),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Lab Session • การทดลอง',
                          style: TextStyle(
                            color: AppTheme.primaryCyan,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                        Text(
                          'SRC Safety Pass',
                          style: TextStyle(color: AppTheme.accentGreen, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            learner.currentLabSessionTitle,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: AppTheme.textPrimary,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                        ),
                        InkWell(
                          onTap: () => _showEditTitleDialog(context, learner),
                          borderRadius: BorderRadius.circular(6),
                          child: Padding(
                            padding: const EdgeInsets.all(4.0),
                            child: Icon(Icons.edit_outlined, size: 16, color: AppTheme.primaryCyan),
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

        const SizedBox(height: 36),

        // Big Digital Stopwatch Circle
        Center(
          child: Container(
            width: 250,
            height: 250,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppTheme.surface1,
              border: Border.all(
                color: learner.isTimerRunning ? AppTheme.primaryCyan : AppTheme.borderStroke,
                width: 3.0,
              ),
              boxShadow: [
                if (learner.isTimerRunning)
                  BoxShadow(
                    color: AppTheme.primaryCyan.withValues(alpha: 0.35),
                    blurRadius: 30,
                    spreadRadius: 4,
                  ),
              ],
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.timer_rounded, color: AppTheme.secondaryViolet, size: 28),
                const SizedBox(height: 8),
                Text(
                  learner.formattedStudyTime,
                  style: TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 40,
                    fontWeight: FontWeight.w900,
                    fontFamily: 'monospace',
                    letterSpacing: 2,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  learner.isTimerRunning ? 'กำลังจับเวลาทดลองแล็บ...' : 'แตะเพื่อเริ่มบันทึกการทดลอง',
                  style: TextStyle(
                    color: learner.isTimerRunning ? AppTheme.primaryCyan : AppTheme.textSecondary,
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 36),

        // Play/Pause Action Button & Reset
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            ElevatedButton.icon(
              onPressed: () => learner.toggleTimer(),
              icon: Icon(
                learner.isTimerRunning ? Icons.pause_rounded : Icons.play_arrow_rounded,
                color: AppTheme.isDark ? Colors.black : Colors.white,
                size: 24,
              ),
              label: Text(
                learner.isTimerRunning ? 'พักการจับเวลา' : 'เริ่มบันทึกการทดลอง',
                style: TextStyle(
                  color: AppTheme.isDark ? Colors.black : Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryCyan,
                padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusPill)),
                elevation: 4,
              ),
            ),
            const SizedBox(width: 12),
            OutlinedButton(
              onPressed: () => learner.resetTimer(),
              style: OutlinedButton.styleFrom(
                side: BorderSide(color: AppTheme.borderStroke),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusPill)),
              ),
              child: Icon(Icons.refresh_rounded, color: AppTheme.textSecondary),
            ),
          ],
        ),

        const SizedBox(height: 32),

        // Lab Observation Log Entries
        Container(
          padding: const EdgeInsets.all(16.0),
          decoration: AppTheme.cardDecoration(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'บันทึกผลสังเกตการณ์แล็บ (${learner.labObservations.length})',
                    style: TextStyle(
                      color: AppTheme.textPrimary,
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                    ),
                  ),
                  Row(
                    children: [
                      if (learner.labObservations.isNotEmpty) ...[
                        InkWell(
                          onTap: () {
                            HapticFeedback.lightImpact();
                            final buffer = StringBuffer();
                            buffer.writeln('# ผลการสังเกตการณ์แล็บ: ${learner.currentLabSessionTitle}');
                            buffer.writeln('วันที่บันทึก: ${DateTime.now().toLocal().toString().split('.')[0]}');
                            buffer.writeln('----------------------------------------');
                            buffer.writeln('เวลาแล็บ\t|\tแท็ก\t|\tบันทึกผลการทดลอง');
                            for (final o in learner.labObservations) {
                              buffer.writeln('${o.time}\t|\t${o.tag}\t|\t${o.note}');
                            }
                            Clipboard.setData(ClipboardData(text: buffer.toString()));
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('คัดลอกตารางบันทึกผลแล็บลงคลิปบอร์ดแล้ว พร้อมนำไปใส่ในเล่มโครงงาน 📋'),
                                duration: Duration(seconds: 2),
                              ),
                            );
                          },
                          borderRadius: BorderRadius.circular(20),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            margin: const EdgeInsets.only(right: 8),
                            decoration: BoxDecoration(
                              color: AppTheme.surface2,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: AppTheme.borderStroke),
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.copy_rounded, size: 13, color: AppTheme.textSecondary),
                                const SizedBox(width: 4),
                                Text(
                                  'คัดลอกตาราง',
                                  style: TextStyle(color: AppTheme.textSecondary, fontSize: 11, fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                      InkWell(
                        onTap: () => _showAddObservationSheet(context, learner),
                        borderRadius: BorderRadius.circular(20),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryCyan.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.add_rounded, size: 14, color: AppTheme.primaryCyan),
                              const SizedBox(width: 4),
                              Text(
                                'เพิ่มบันทึก',
                                style: TextStyle(color: AppTheme.primaryCyan, fontSize: 11.5, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (learner.labObservations.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 20),
                  child: Center(
                    child: Text('ยังไม่มีบันทึกผลการทดลอง แตะ + เพิ่มบันทึก เพื่อเริ่มจดบันทึก', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                  ),
                )
              else
                ...learner.labObservations.map((obs) => Padding(
                  padding: const EdgeInsets.only(bottom: 8.0),
                  child: _ObservationRow(
                    time: obs.time,
                    note: obs.note,
                    tag: obs.tag,
                    onDelete: () => learner.deleteObservation(obs.id),
                  ),
                )),
            ],
          ),
        ),
      ],
    );
  }
}

class _ObservationRow extends StatelessWidget {
  final String time;
  final String note;
  final String tag;
  final VoidCallback? onDelete;

  const _ObservationRow({
    required this.time,
    required this.note,
    required this.tag,
    this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppTheme.surface2,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.borderStroke),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: AppTheme.secondaryViolet.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(time, style: TextStyle(color: AppTheme.secondaryViolet, fontSize: 11, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                      decoration: BoxDecoration(
                        color: AppTheme.surface3,
                        borderRadius: BorderRadius.circular(3),
                      ),
                      child: Text(tag, style: TextStyle(color: AppTheme.textMuted, fontSize: 10, fontWeight: FontWeight.bold)),
                    ),
                    if (onDelete != null)
                      InkWell(
                        onTap: onDelete,
                        child: Icon(Icons.close_rounded, size: 14, color: AppTheme.textMuted),
                      ),
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  note,
                  style: TextStyle(color: AppTheme.textPrimary, fontSize: 12.5),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

void _showAddObservationSheet(BuildContext context, LearnerState learner) {
  final controller = TextEditingController();
  String selectedTag = 'Trial 1';
  final tags = ['Trial 1', 'Trial 2', 'Peak Event', 'Calibration', 'Anomaly', 'Final Result'];

  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppTheme.surface1,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setModalState) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'บันทึกผลการทดลอง (Add Observation)',
                  style: TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(ctx),
                  icon: const Icon(Icons.close_rounded),
                ),
              ],
            ),
            if (learner.labTimerSeconds > 0) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.secondaryViolet.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.timer_outlined, size: 14, color: AppTheme.secondaryViolet),
                    const SizedBox(width: 6),
                    Text(
                      'บันทึก ณ เวลาแล็บ: ${learner.formattedStudyTime}',
                      style: TextStyle(color: AppTheme.secondaryViolet, fontSize: 11.5, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 12),
            Text('แท็กประเภทการทดลอง:', style: TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              children: tags.map((t) {
                final isSel = t == selectedTag;
                return ChoiceChip(
                  label: Text(t, style: TextStyle(fontSize: 11, color: isSel ? Colors.white : AppTheme.textPrimary)),
                  selected: isSel,
                  selectedColor: AppTheme.secondaryViolet,
                  backgroundColor: AppTheme.surface2,
                  onSelected: (val) {
                    if (val) setModalState(() => selectedTag = t);
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 10),
            Text('ข้อความช่วยพิมพ์ด่วน (Presets):', style: TextStyle(color: AppTheme.textSecondary, fontSize: 11.5)),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                'อุณหภูมิคงที่',
                'เกิดฟองก๊าซ/ปฏิกิริยา',
                'เซนเซอร์แตะค่าสูงสุด',
                'เริ่มทดสอบรอบถัดไป',
                'สังเกตเห็นการเปลี่ยนสี',
              ].map((preset) => InkWell(
                onTap: () {
                  setModalState(() {
                    if (controller.text.isEmpty) {
                      controller.text = preset;
                    } else {
                      controller.text = '${controller.text} • $preset';
                    }
                  });
                },
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.surface2,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppTheme.borderStroke),
                  ),
                  child: Text(
                    '+ $preset',
                    style: TextStyle(color: AppTheme.textSecondary, fontSize: 11),
                  ),
                ),
              )).toList(),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              maxLines: 3,
              style: TextStyle(color: AppTheme.textPrimary, fontSize: 13.5),
              decoration: InputDecoration(
                hintText: 'บันทึกค่าที่วัดได้ สภาพแวดล้อม หรือพฤติกรรมของตัวแปร...',
                hintStyle: TextStyle(color: AppTheme.textMuted, fontSize: 13),
                filled: true,
                fillColor: AppTheme.surface2,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: AppTheme.borderStroke),
                ),
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {
                final text = controller.text.trim();
                if (text.isNotEmpty) {
                  learner.addObservation(note: text, tag: selectedTag);
                }
                Navigator.pop(ctx);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryCyan,
                minimumSize: const Size.fromHeight(46),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: Text(
                'บันทึกลงสมุดแล็บ',
                style: TextStyle(
                  color: AppTheme.isDark ? Colors.black : Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ),
          ],
        ),
      ),
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
      title: Text('แก้ไขชื่อการทดลองแล็บ', style: TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.bold)),
      content: TextField(
        controller: controller,
        autofocus: true,
        style: TextStyle(color: AppTheme.textPrimary, fontSize: 14),
        decoration: InputDecoration(
          hintText: 'เช่น ทดสอบการเจริญเติบโตของแหนเป็ดในน้ำทิ้ง...',
          hintStyle: TextStyle(color: AppTheme.textMuted, fontSize: 13),
          filled: true,
          fillColor: AppTheme.surface2,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: AppTheme.borderStroke)),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx),
          child: Text('ยกเลิก', style: TextStyle(color: AppTheme.textMuted)),
        ),
        ElevatedButton(
          onPressed: () {
            final t = controller.text.trim();
            if (t.isNotEmpty) {
              learner.setLabSessionTitle(t);
            }
            Navigator.pop(ctx);
          },
          style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryCyan),
          child: Text('บันทึก', style: TextStyle(color: AppTheme.isDark ? Colors.black : Colors.white, fontWeight: FontWeight.bold)),
        ),
      ],
    ),
  );
}
