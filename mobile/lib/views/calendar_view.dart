import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/learner_state.dart';
import '../theme/app_theme.dart';

/// Full-screen research calendar view inspired by Google Calendar UX.
/// Features Thai month/year headers (Buddhist Era), previous/next month navigation,
/// a "Today" (วันนี้) jump shortcut, 7-column grid with event indicators, and an
/// interactive agenda for the selected date with event creation, editing, and deletion.
class CalendarView extends StatefulWidget {
  final DateTime? initialDate;

  const CalendarView({super.key, this.initialDate});

  @override
  State<CalendarView> createState() => _CalendarViewState();
}

class _CalendarViewState extends State<CalendarView> {
  late DateTime _selectedDate;
  late int _displayYear;
  late int _displayMonth;

  static const List<String> _thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
    'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
    'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];

  static const List<String> _thaiWeekdays = [
    'อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส',
  ];

  static const List<String> _categories = [
    'แล็บวิจัย', 'กำหนดส่ง', 'ประชุมทีม', 'กิจกรรมวิจัย', 'ทั่วไป',
  ];

  @override
  void initState() {
    super.initState();
    final now = widget.initialDate ?? DateTime.now();
    _selectedDate = DateTime(now.year, now.month, now.day);
    _displayYear = now.year;
    _displayMonth = now.month;
  }

  void _goToToday() {
    final now = DateTime.now();
    setState(() {
      _selectedDate = DateTime(now.year, now.month, now.day);
      _displayYear = now.year;
      _displayMonth = now.month;
    });
  }

  void _previousMonth() {
    setState(() {
      if (_displayMonth == 1) {
        _displayMonth = 12;
        _displayYear -= 1;
      } else {
        _displayMonth -= 1;
      }
    });
  }

  void _nextMonth() {
    setState(() {
      if (_displayMonth == 12) {
        _displayMonth = 1;
        _displayYear += 1;
      } else {
        _displayMonth += 1;
      }
    });
  }

  Color _categoryColor(String category) {
    switch (category) {
      case 'แล็บวิจัย':
        return AppTheme.primaryCyan;
      case 'กำหนดส่ง':
        return AppTheme.accentRed;
      case 'ประชุมทีม':
        return AppTheme.secondaryViolet;
      case 'กิจกรรมวิจัย':
        return AppTheme.accentGreen;
      default:
        return AppTheme.accentAmber;
    }
  }

  String _formatThaiDate(DateTime d) {
    final bYear = d.year + 543;
    final month = _thaiMonths[d.month - 1];
    const daysTh = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];
    final dayName = daysTh[d.weekday - 1];
    return 'วัน$dayNameที่ ${d.day} $month $bYear';
  }

  @override
  Widget build(BuildContext context) {
    final learner = context.watch<LearnerState>();
    final today = DateTime.now();
    final isToday = today.year == _selectedDate.year &&
        today.month == _selectedDate.month &&
        today.day == _selectedDate.day;

    final selectedEvents = learner.getEventsForDate(_selectedDate);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.surface1,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_rounded, color: AppTheme.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'ปฏิทินวิจัย',
          style: TextStyle(
            color: AppTheme.textPrimary,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8.0),
            child: OutlinedButton(
              style: OutlinedButton.styleFrom(
                foregroundColor: isToday ? AppTheme.primaryCyan : AppTheme.textSecondary,
                side: BorderSide(
                  color: isToday ? AppTheme.primaryCyan : AppTheme.borderStroke,
                ),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              onPressed: _goToToday,
              child: const Text('วันนี้', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppTheme.primaryCyan,
        foregroundColor: Colors.black,
        elevation: 4,
        onPressed: () => _showAddEditEventDialog(context, initialDate: _selectedDate),
        icon: const Icon(Icons.add_rounded),
        label: const Text('เพิ่มกิจกรรม', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.only(bottom: 90),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 1. Month / Year Navigation Header
            _buildMonthNavigationHeader(),

            // 2. Weekday Header Row (อา - ส)
            _buildWeekdayRow(),

            // 3. Calendar Month Grid
            _buildMonthGrid(learner),

            const SizedBox(height: 12),
            Divider(color: AppTheme.borderStroke, height: 1),

            // 4. Agenda for Selected Date
            _buildAgendaSection(context, learner, selectedEvents),

            const SizedBox(height: 16),

            // 5. Historical Competition Timeline Reference (Non-blocking)
            _buildHistoricalMilestonesCard(),
          ],
        ),
      ),
    );
  }

  Widget _buildMonthNavigationHeader() {
    final bYear = _displayYear + 543;
    final monthName = _thaiMonths[_displayMonth - 1];

    return Container(
      color: AppTheme.surface1,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(Icons.calendar_month_rounded, color: AppTheme.primaryCyan, size: 22),
              const SizedBox(width: 8),
              Text(
                '$monthName $bYear',
                style: TextStyle(
                  color: AppTheme.textPrimary,
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          Row(
            children: [
              IconButton(
                icon: Icon(Icons.chevron_left_rounded, color: AppTheme.textPrimary),
                tooltip: 'เดือนก่อนหน้า',
                onPressed: _previousMonth,
              ),
              IconButton(
                icon: Icon(Icons.chevron_right_rounded, color: AppTheme.textPrimary),
                tooltip: 'เดือนถัดไป',
                onPressed: _nextMonth,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildWeekdayRow() {
    return Container(
      color: AppTheme.surface1,
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: _thaiWeekdays.map((day) {
          final isWeekend = day == 'อา' || day == 'ส';
          return Expanded(
            child: Center(
              child: Text(
                day,
                style: TextStyle(
                  color: isWeekend ? AppTheme.accentRed.withValues(alpha: 0.85) : AppTheme.textMuted,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildMonthGrid(LearnerState learner) {
    final firstDayOfMonth = DateTime(_displayYear, _displayMonth, 1);
    final daysInMonth = DateTime(_displayYear, _displayMonth + 1, 0).day;
    final firstWeekday = firstDayOfMonth.weekday % 7; // 0 = Sunday, 1 = Monday, ...

    final prevMonthDays = DateTime(_displayYear, _displayMonth, 0).day;

    final totalCells = ((firstWeekday + daysInMonth) / 7).ceil() * 7;
    final today = DateTime.now();

    return Container(
      color: AppTheme.surface1,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      child: GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: totalCells,
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 7,
          mainAxisSpacing: 4,
          crossAxisSpacing: 4,
          childAspectRatio: 1.05,
        ),
        itemBuilder: (context, index) {
          final isPrevMonth = index < firstWeekday;
          final isNextMonth = index >= firstWeekday + daysInMonth;

          DateTime cellDate;
          int displayDay;

          if (isPrevMonth) {
            displayDay = prevMonthDays - (firstWeekday - index - 1);
            final prevMonth = _displayMonth == 1 ? 12 : _displayMonth - 1;
            final prevYear = _displayMonth == 1 ? _displayYear - 1 : _displayYear;
            cellDate = DateTime(prevYear, prevMonth, displayDay);
          } else if (isNextMonth) {
            displayDay = index - (firstWeekday + daysInMonth) + 1;
            final nextMonth = _displayMonth == 12 ? 1 : _displayMonth + 1;
            final nextYear = _displayMonth == 12 ? _displayYear + 1 : _displayYear;
            cellDate = DateTime(nextYear, nextMonth, displayDay);
          } else {
            displayDay = index - firstWeekday + 1;
            cellDate = DateTime(_displayYear, _displayMonth, displayDay);
          }

          final isSelected = cellDate.year == _selectedDate.year &&
              cellDate.month == _selectedDate.month &&
              cellDate.day == _selectedDate.day;

          final isCellToday = cellDate.year == today.year &&
              cellDate.month == today.month &&
              cellDate.day == today.day;

          final hasEvents = learner.hasEventsOnDate(cellDate);
          final events = learner.getEventsForDate(cellDate);

          return InkWell(
            borderRadius: BorderRadius.circular(24),
            onTap: () {
              setState(() {
                _selectedDate = cellDate;
                if (isPrevMonth || isNextMonth) {
                  _displayYear = cellDate.year;
                  _displayMonth = cellDate.month;
                }
              });
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isSelected
                    ? AppTheme.primaryCyan
                    : (isCellToday ? AppTheme.primaryCyan.withValues(alpha: 0.12) : Colors.transparent),
                border: isCellToday && !isSelected
                    ? Border.all(color: AppTheme.primaryCyan, width: 1.5)
                    : null,
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    '$displayDay',
                    style: TextStyle(
                      color: isSelected
                          ? Colors.black
                          : (isPrevMonth || isNextMonth
                              ? AppTheme.textMuted.withValues(alpha: 0.4)
                              : AppTheme.textPrimary),
                      fontWeight: (isSelected || isCellToday) ? FontWeight.bold : FontWeight.w500,
                      fontSize: 13.5,
                    ),
                  ),
                  if (hasEvents) ...[
                    const SizedBox(height: 2),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: events.take(3).map((e) {
                        return Container(
                          width: 4.5,
                          height: 4.5,
                          margin: const EdgeInsets.symmetric(horizontal: 1),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: isSelected ? Colors.black : _categoryColor(e.category),
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildAgendaSection(
    BuildContext context,
    LearnerState learner,
    List<ResearchCalendarEvent> events,
  ) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Flexible(
                child: Text(
                  _formatThaiDate(_selectedDate),
                  style: TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: events.isEmpty
                      ? AppTheme.surface2
                      : AppTheme.primaryCyan.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: events.isEmpty
                        ? AppTheme.borderStroke
                        : AppTheme.primaryCyan.withValues(alpha: 0.3),
                  ),
                ),
                child: Text(
                  events.isEmpty ? 'ไม่มีกิจกรรม' : '${events.length} กิจกรรม',
                  style: TextStyle(
                    color: events.isEmpty ? AppTheme.textMuted : AppTheme.primaryCyan,
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (events.isEmpty)
            _buildEmptyAgendaState(context)
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: events.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final event = events[index];
                return _buildEventCard(context, learner, event);
              },
            ),
        ],
      ),
    );
  }

  Widget _buildEmptyAgendaState(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
      decoration: BoxDecoration(
        color: AppTheme.surface1,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.borderStroke),
      ),
      child: Column(
        children: [
          Icon(Icons.event_available_outlined, color: AppTheme.textMuted, size: 36),
          const SizedBox(height: 8),
          Text(
            'ยังไม่มีกิจกรรมในวันนี้',
            style: TextStyle(
              color: AppTheme.textPrimary,
              fontWeight: FontWeight.w600,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'แตะปุ่มด้านล่างเพื่อบันทึกนัดหมายวิจัย กำหนดส่ง หรือนัดแล็บ',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: AppTheme.primaryCyan,
              side: BorderSide(color: AppTheme.primaryCyan.withValues(alpha: 0.5)),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            onPressed: () => _showAddEditEventDialog(context, initialDate: _selectedDate),
            icon: const Icon(Icons.add_rounded, size: 16),
            label: const Text('เพิ่มกิจกรรมวันนี้'),
          ),
        ],
      ),
    );
  }

  Widget _buildEventCard(
    BuildContext context,
    LearnerState learner,
    ResearchCalendarEvent event,
  ) {
    final catColor = _categoryColor(event.category);

    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surface1,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.borderStroke),
      ),
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              width: 5,
              decoration: BoxDecoration(
                color: catColor,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(14),
                  bottomLeft: Radius.circular(14),
                ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: catColor.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            event.category,
                            style: TextStyle(
                              color: catColor,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        if (event.time != null && event.time!.isNotEmpty)
                          Row(
                            children: [
                              Icon(Icons.schedule_rounded, size: 13, color: AppTheme.textMuted),
                              const SizedBox(width: 3),
                              Text(
                                '${event.time} น.',
                                style: TextStyle(
                                  color: AppTheme.textMuted,
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          )
                        else
                          Text(
                            'ทั้งวัน',
                            style: TextStyle(color: AppTheme.textMuted, fontSize: 11.5),
                          ),
                        const Spacer(),
                        PopupMenuButton<String>(
                          icon: Icon(Icons.more_vert_rounded, color: AppTheme.textMuted, size: 18),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          onSelected: (val) {
                            if (val == 'edit') {
                              _showAddEditEventDialog(context, eventToEdit: event);
                            } else if (val == 'delete') {
                              _confirmDeleteEvent(context, learner, event.id);
                            }
                          },
                          itemBuilder: (ctx) => [
                            const PopupMenuItem(
                              value: 'edit',
                              child: Row(
                                children: [
                                  Icon(Icons.edit_outlined, size: 16),
                                  SizedBox(width: 8),
                                  Text('แก้ไข'),
                                ],
                              ),
                            ),
                            const PopupMenuItem(
                              value: 'delete',
                              child: Row(
                                children: [
                                  Icon(Icons.delete_outline_rounded, color: Colors.red, size: 16),
                                  SizedBox(width: 8),
                                  Text('ลบ', style: TextStyle(color: Colors.red)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      event.title,
                      style: TextStyle(
                        color: AppTheme.textPrimary,
                        fontSize: 14.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (event.note != null && event.note!.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        event.note!,
                        style: TextStyle(color: AppTheme.textSecondary, fontSize: 12.5, height: 1.3),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHistoricalMilestonesCard() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0),
      child: Material(
        color: AppTheme.surface1,
        shape: RoundedRectangleBorder(
          side: BorderSide(color: AppTheme.borderStroke),
          borderRadius: BorderRadius.circular(16),
        ),
        clipBehavior: Clip.antiAlias,
        child: ExpansionTile(
          initiallyExpanded: false,
          tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
          leading: Icon(Icons.history_edu_rounded, color: AppTheme.accentAmber, size: 22),
          title: Text(
            'บันทึกกำหนดการแข่งขัน (ข้อมูลอ้างอิง)',
            style: TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 13.5,
              fontWeight: FontWeight.w600,
            ),
          ),
          subtitle: Text(
            'อ้างอิงจากรอบประกาศล่าสุด (รอประกาศรอบถัดไป)',
            style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
          ),
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Column(
                children: const [
                  _HistoricalRow(
                    title: 'YSC: ส่งข้อเสนอโครงงาน',
                    detail: 'ส.ค. – ก.ย. (รอบล่าสุด YSC 2027 ปิดรับ 10 ก.ย. 2569)',
                  ),
                  SizedBox(height: 8),
                  _HistoricalRow(
                    title: 'NSC: ข้อเสนอโครงการซอฟต์แวร์',
                    detail: 'พ.ค. (รอบล่าสุด NSC 2026 เปิด 1–29 พ.ค. 2569)',
                  ),
                  SizedBox(height: 8),
                  _HistoricalRow(
                    title: 'งานศิลปหัตถกรรมนักเรียน',
                    detail: 'ก.ย. – ธ.ค. (กำหนดการขึ้นอยู่กับแต่ละเขตพื้นที่การศึกษา)',
                  ),
                  SizedBox(height: 8),
                  _HistoricalRow(
                    title: 'Regeneron ISEF 2027',
                    detail: '8–14 พ.ค. 2570 (ต้องผ่านเวทีในเครือก่อนส่งตัวแทน)',
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showAddEditEventDialog(
    BuildContext context, {
    DateTime? initialDate,
    ResearchCalendarEvent? eventToEdit,
  }) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.surface1,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => _AddEditEventSheet(
        initialDate: initialDate ?? _selectedDate,
        eventToEdit: eventToEdit,
        onSaved: (savedDate) {
          setState(() {
            _selectedDate = savedDate;
            _displayYear = savedDate.year;
            _displayMonth = savedDate.month;
          });
        },
      ),
    );
  }

  void _confirmDeleteEvent(BuildContext context, LearnerState learner, String eventId) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.surface1,
        title: Text('ลบกิจกรรม', style: TextStyle(color: AppTheme.textPrimary)),
        content: Text('คุณต้องการลบกิจกรรมนี้ออกจากปฏิทินวิจัยใช่หรือไม่?',
            style: TextStyle(color: AppTheme.textSecondary)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('ยกเลิก', style: TextStyle(color: AppTheme.textMuted)),
          ),
          TextButton(
            onPressed: () {
              learner.deleteCalendarEvent(eventId);
              Navigator.pop(ctx);
            },
            child: const Text('ลบกิจกรรม', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}

class _HistoricalRow extends StatelessWidget {
  final String title;
  final String detail;

  const _HistoricalRow({required this.title, required this.detail});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          margin: const EdgeInsets.only(top: 5),
          width: 6,
          height: 6,
          decoration: BoxDecoration(
            color: AppTheme.accentAmber,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  color: AppTheme.textPrimary,
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                detail,
                style: TextStyle(color: AppTheme.textMuted, fontSize: 11.5, height: 1.3),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _AddEditEventSheet extends StatefulWidget {
  final DateTime initialDate;
  final ResearchCalendarEvent? eventToEdit;
  final ValueChanged<DateTime> onSaved;

  const _AddEditEventSheet({
    required this.initialDate,
    this.eventToEdit,
    required this.onSaved,
  });

  @override
  State<_AddEditEventSheet> createState() => _AddEditEventSheetState();
}

class _AddEditEventSheetState extends State<_AddEditEventSheet> {
  late final TextEditingController _titleController;
  late final TextEditingController _timeController;
  late final TextEditingController _noteController;
  late DateTime _eventDate;
  late String _selectedCategory;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.eventToEdit?.title ?? '');
    _timeController = TextEditingController(text: widget.eventToEdit?.time ?? '');
    _noteController = TextEditingController(text: widget.eventToEdit?.note ?? '');
    _eventDate = widget.eventToEdit?.date ?? widget.initialDate;
    _selectedCategory = widget.eventToEdit?.category ?? _CalendarViewState._categories.first;
  }

  @override
  void dispose() {
    _titleController.dispose();
    _timeController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  Color _categoryColor(String category) {
    switch (category) {
      case 'แล็บวิจัย':
        return AppTheme.primaryCyan;
      case 'กำหนดส่ง':
        return AppTheme.accentRed;
      case 'ประชุมทีม':
        return AppTheme.secondaryViolet;
      case 'กิจกรรมวิจัย':
        return AppTheme.accentGreen;
      default:
        return AppTheme.accentAmber;
    }
  }

  @override
  Widget build(BuildContext context) {
    final bYear = _eventDate.year + 543;
    final month = _CalendarViewState._thaiMonths[_eventDate.month - 1];

    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  widget.eventToEdit == null ? 'เพิ่มกิจกรรมวิจัย' : 'แก้ไขกิจกรรม',
                  style: TextStyle(
                    color: AppTheme.textPrimary,
                    fontWeight: FontWeight.bold,
                    fontSize: 17,
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.close_rounded, color: AppTheme.textMuted),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Title
            TextField(
              controller: _titleController,
              style: TextStyle(color: AppTheme.textPrimary),
              decoration: InputDecoration(
                labelText: 'ชื่อกิจกรรมหรือเป้าหมายแล็บ *',
                labelStyle: TextStyle(color: AppTheme.textMuted),
                hintText: 'เช่น สรุปผลการทดลองชุดที่ 1, ส่งร่าง Proposal',
                hintStyle: TextStyle(color: AppTheme.textMuted.withValues(alpha: 0.5)),
                filled: true,
                fillColor: AppTheme.surface2,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: AppTheme.borderStroke),
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Date & Time Row
            Row(
              children: [
                Expanded(
                  flex: 3,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: _eventDate,
                        firstDate: DateTime(2020),
                        lastDate: DateTime(2035),
                      );
                      if (picked != null) {
                        setState(() {
                          _eventDate = DateTime(picked.year, picked.month, picked.day);
                        });
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                      decoration: BoxDecoration(
                        color: AppTheme.surface2,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.borderStroke),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.calendar_today_rounded, size: 16, color: AppTheme.primaryCyan),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              '${_eventDate.day} $month $bYear',
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(color: AppTheme.textPrimary, fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 2,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () async {
                      final picked = await showTimePicker(
                        context: context,
                        initialTime: TimeOfDay.now(),
                      );
                      if (picked != null) {
                        final hh = picked.hour.toString().padLeft(2, '0');
                        final mm = picked.minute.toString().padLeft(2, '0');
                        setState(() {
                          _timeController.text = '$hh:$mm';
                        });
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                      decoration: BoxDecoration(
                        color: AppTheme.surface2,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.borderStroke),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.schedule_rounded, size: 16, color: AppTheme.textMuted),
                          const SizedBox(width: 6),
                          Flexible(
                            child: Text(
                              _timeController.text.isEmpty ? 'เวลา (ไม่ระบุ)' : '${_timeController.text} น.',
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: _timeController.text.isEmpty ? AppTheme.textMuted : AppTheme.textPrimary,
                                fontSize: 12.5,
                              ),
                            ),
                          ),
                          if (_timeController.text.isNotEmpty)
                            GestureDetector(
                              onTap: () {
                                setState(() {
                                  _timeController.clear();
                                });
                              },
                              child: Icon(Icons.close_rounded, size: 14, color: AppTheme.textMuted),
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Category Chips
            Text(
              'หมวดหมู่กิจกรรม:',
              style: TextStyle(color: AppTheme.textMuted, fontSize: 12, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: _CalendarViewState._categories.map((cat) {
                final isSelected = _selectedCategory == cat;
                final color = _categoryColor(cat);
                return ChoiceChip(
                  label: Text(
                    cat,
                    style: TextStyle(
                      color: isSelected ? Colors.black : AppTheme.textPrimary,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                      fontSize: 12,
                    ),
                  ),
                  selected: isSelected,
                  selectedColor: color,
                  backgroundColor: AppTheme.surface2,
                  side: BorderSide(
                    color: isSelected ? color : AppTheme.borderStroke,
                  ),
                  onSelected: (val) {
                    if (val) {
                      setState(() {
                        _selectedCategory = cat;
                      });
                    }
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 12),

            // Note
            TextField(
              controller: _noteController,
              maxLines: 2,
              style: TextStyle(color: AppTheme.textPrimary, fontSize: 13),
              decoration: InputDecoration(
                labelText: 'บันทึกเพิ่มเติม (ไม่บังคับ)',
                labelStyle: TextStyle(color: AppTheme.textMuted),
                filled: true,
                fillColor: AppTheme.surface2,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: AppTheme.borderStroke),
                ),
              ),
            ),
            const SizedBox(height: 18),

            // Submit
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryCyan,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () {
                final title = _titleController.text.trim();
                if (title.isEmpty) return;

                final learner = context.read<LearnerState>();
                if (widget.eventToEdit == null) {
                  final newEvent = ResearchCalendarEvent(
                    id: 'evt_${DateTime.now().microsecondsSinceEpoch}',
                    title: title,
                    date: _eventDate,
                    time: _timeController.text.trim().isEmpty ? null : _timeController.text.trim(),
                    category: _selectedCategory,
                    note: _noteController.text.trim().isEmpty ? null : _noteController.text.trim(),
                    createdAt: DateTime.now(),
                  );
                  learner.addCalendarEvent(newEvent);
                } else {
                  final updated = ResearchCalendarEvent(
                    id: widget.eventToEdit!.id,
                    title: title,
                    date: _eventDate,
                    time: _timeController.text.trim().isEmpty ? null : _timeController.text.trim(),
                    category: _selectedCategory,
                    note: _noteController.text.trim().isEmpty ? null : _noteController.text.trim(),
                    createdAt: widget.eventToEdit!.createdAt,
                  );
                  learner.updateCalendarEvent(updated);
                }

                widget.onSaved(_eventDate);
                Navigator.pop(context);
              },
              child: Text(
                widget.eventToEdit == null ? 'บันทึกกิจกรรม' : 'บันทึกการแก้ไข',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
