import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../theme/app_theme.dart';
import 'topic_card.dart';

enum AppThemeMode { dark, system, light }

class ChatMessage {
  final String text;
  final bool isUser;
  final DateTime timestamp;
  final String? userAskQuestion;
  final List<String>? userAskChoices;

  ChatMessage({
    required this.text,
    required this.isUser,
    required this.timestamp,
    this.userAskQuestion,
    this.userAskChoices,
  });
}

class LabObservation {
  final String id;
  final String time;
  final String note;
  final String tag;
  final DateTime createdAt;

  LabObservation({
    required this.id,
    required this.time,
    required this.note,
    required this.tag,
    required this.createdAt,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'time': time,
    'note': note,
    'tag': tag,
    'createdAt': createdAt.toIso8601String(),
  };

  factory LabObservation.fromJson(Map<String, dynamic> json) => LabObservation(
    id: json['id'] as String? ?? 'obs_${DateTime.now().millisecondsSinceEpoch}',
    time: json['time'] as String? ?? '',
    note: json['note'] as String? ?? '',
    tag: json['tag'] as String? ?? 'Trial 1',
    createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
  );
}

class ChatSession {
  final String id;
  String title;
  final String category; // 'SRC Safety', 'Socratic Research', 'Pivot Workshop'
  final DateTime createdAt;
  DateTime updatedAt;
  final List<ChatMessage> messages;

  ChatSession({
    required this.id,
    required this.title,
    required this.category,
    required this.createdAt,
    required this.updatedAt,
    required this.messages,
  });

  String get lastMessagePreview {
    if (messages.isEmpty) return 'ยังไม่มีข้อความ';
    final last = messages.last;
    return last.text.replaceAll('\n', ' ');
  }
}

class LearnerState extends ChangeNotifier {
  // Identity (Zero-PII compliant)
  String displayName = 'Nattapan Seksansukatikul (Mark)';
  String handle = '@mooslide';
  String schoolTier = 'มัธยมศึกษาตอนปลาย (ม.ปลาย)';
  int activeProjectsCount = 2;
  int evaluatedIdeasCount = 6;
  int approvedPivotsCount = 3;

  // Navigation: 0: Dashboard/Discovery, 1: AI Sessions, 2: Lab Timer, 3: Discussions, 4: Profile
  int activeTab = 0;

  // AI Chat Sessions
  final List<ChatSession> sessions = [
    ChatSession(
      id: 'session_socratic_1',
      title: '🔬 ออกแบบตัวแปรโครงงาน AI ตรวจจับไมโครพลาสติก',
      category: 'Socratic Research',
      createdAt: DateTime.now().subtract(const Duration(hours: 2)),
      updatedAt: DateTime.now().subtract(const Duration(minutes: 15)),
      messages: [
        ChatMessage(
          text: 'สวัสดีครับอาจารย์โค้ช ผมสนใจทำโครงงานคัดแยกไมโครพลาสติกด้วยกล้องจุลทรรศน์และ AI ครับ',
          isUser: true,
          timestamp: DateTime.now().subtract(const Duration(minutes: 20)),
        ),
        ChatMessage(
          text: 'ยินดีต้อนรับสู่วงการวิจัยครับ! หัวข้อนี้มีศักยภาพสูงมากในการแก้ปัญหาสิ่งแวดล้อมทางน้ำ\n\nจากการวิเคราะห์เชิงวิทยาศาสตร์:\n1. ทฤษฎีที่เกี่ยวข้อง: การใช้ Darkfield Illumination หรือ Fluorescence ร่วมกับ Convolutional Neural Networks (CNN) เพื่อจำแนกอนุภาคขนาด 1-5 mm\n2. ตัวแปรต้น (Independent Variable): ชนิดของอนุภาคพลาสติก (PE, PP, PS) และแหล่งกำเนิดน้ำตัวอย่าง\n3. ตัวแปรตาม (Dependent Variable): ค่าความแม่นยำในการคัดแยก (Precision, Recall, F1-Score) และเวลาที่ใช้ในการประมวลผลต่อเฟรม\n4. ตัวแปรควบคุม (Controlled Variables): กำลังขยายของเลนส์ (10x/40x), ความสว่างของแหล่งกำเนิดแสง, และอัตราการไหลของน้ำใน Flow Cell\n\nเพื่อให้โครงงานมีระเบียบวิธีวิจัยที่รัดกุมระดับ YSC คุณต้องตัดสินใจเรื่องการเตรียมชุดข้อมูลทดสอบก่อนครับ',
          isUser: false,
          timestamp: DateTime.now().subtract(const Duration(minutes: 15)),
          userAskQuestion: 'คุณวางแผนจะเตรียมภาพไมโครพลาสติกสำหรับฝึกสอนโมเดล AI อย่างไร?',
          userAskChoices: [
            'เตรียมตัวอย่างมาตรฐานจากเม็ดพลาสติกบริสุทธิ์ในแล็บโรงเรียน',
            'เก็บตัวอย่างน้ำจริงจากแหล่งน้ำธรรมชาติแล้วกรองผ่าน Membrane',
            'ใช้ชุดข้อมูล Open Dataset ทางวิชาการร่วมกับภาพถ่ายจริง',
          ],
        ),
      ],
    ),
    ChatSession(
      id: 'session_src_1',
      title: '🛡️ ตรวจความปลอดภัยสารเคมีและอันตรายชีวภาพ (SRC Protocol)',
      category: 'SRC Safety',
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
      updatedAt: DateTime.now().subtract(const Duration(hours: 5)),
      messages: [
        ChatMessage(
          text: 'ขอปรึกษาเรื่องการใช้สารละลายโซเดียมไอโอไดด์ (NaI) สำหรับแยกความหนาแน่นพลาสติกครับ ปลอดภัยสำหรับแล็บโรงเรียนไหม?',
          isUser: true,
          timestamp: DateTime.now().subtract(const Duration(hours: 6)),
        ),
        ChatMessage(
          text: 'ตามเกณฑ์ความปลอดภัยของ SRC/ISEF สำหรับนักเรียนมัธยม:\n\n1. การประเมินสารเคมี (Hazard Assessment):\n- Sodium Iodide (NaI) จัดเป็นสารที่มีความเป็นพิษต่ำกว่า Zinc Chloride (ZnCl2) มาก และเป็นทางเลือกที่ปลอดภัย (Safer Alternative) สำหรับการแยกความหนาแน่น (Density Separation)\n- ข้อควรระวัง: ระวังการสัมผัสผิวหนังและการสูดดมไอระเหย ต้องสวมถุงมือไนไตรล์ แว่นตานิรภัย และทำในพื้นที่ที่มีการระบายอากาศดี\n\n2. การกำจัดของเสีย (Waste Management Protocol):\n- ห้ามเทสารละลายเข้มข้นลงท่อระบายน้ำโดยตรง ต้องมีภาชนะบรรจุของเสียเคมีเฉพาะเพื่อนำไปบำบัด',
          isUser: false,
          timestamp: DateTime.now().subtract(const Duration(hours: 5)),
          userAskQuestion: 'ในห้องปฏิบัติการโรงเรียนของคุณ มีอุปกรณ์ความปลอดภัยพื้นฐานต่อไปนี้พร้อมหรือไม่?',
          userAskChoices: [
            'มีตู้ดูดควัน (Fume Hood) และชุด PPE ครบถ้วน',
            'มีแว่นตานิรภัยและถุงมือ แต่ไม่มีตู้ดูดควัน (ต้องทำนอกอาคาร)',
            'ต้องการเปลี่ยนไปใช้น้ำเกลืออิ่มตัว (NaCl) ซึ่งปลอดภัย 100%',
          ],
        ),
      ],
    ),
  ];

  ChatSession? activeSession;

  ChatSession get currentSession {
    if (activeSession != null) return activeSession!;
    if (sessions.isNotEmpty) return sessions.first;
    final newSess = ChatSession(
      id: 'session_${DateTime.now().millisecondsSinceEpoch}',
      title: '🔬 การปรึกษาโครงงานวิทยาศาสตร์',
      category: 'Socratic Research',
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
      messages: [],
    );
    sessions.insert(0, newSess);
    activeSession = newSess;
    return newSess;
  }

  void selectSession(String id) {
    activeSession = sessions.firstWhere((s) => s.id == id, orElse: () => currentSession);
    notifyListeners();
  }

  ChatSession createNewSession({required String title, required String category, List<ChatMessage>? initialMessages}) {
    final session = ChatSession(
      id: 'session_${DateTime.now().millisecondsSinceEpoch}',
      title: title,
      category: category,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
      messages: initialMessages ?? [],
    );
    sessions.insert(0, session);
    activeSession = session;
    notifyListeners();
    return session;
  }

  ChatSession startSrcSafetySession({String? projectTopic}) {
    final topic = projectTopic ?? selectedField;
    final session = ChatSession(
      id: 'src_${DateTime.now().millisecondsSinceEpoch}',
      title: '🛡️ ตรวจความปลอดภัยแล็บ SRC ($topic)',
      category: 'SRC Safety',
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
      messages: [
        ChatMessage(
          text: 'สวัสดีครับอาจารย์ SRC ผมต้องการตรวจสอบความเสี่ยงและประเมินความปลอดภัยตามระเบียบ ISEF/YSC สำหรับโครงงานในสาขา $topic ครับ',
          isUser: true,
          timestamp: DateTime.now(),
        ),
      ],
    );
    sessions.insert(0, session);
    activeSession = session;
    activeTab = 1; // Switch to sessions tab
    notifyListeners();
    return session;
  }

  void addMessageToActiveSession(ChatMessage message) {
    currentSession.messages.add(message);
    currentSession.updatedAt = DateTime.now();
    notifyListeners();
  }

  void deleteSession(String id) {
    sessions.removeWhere((s) => s.id == id);
    if (activeSession?.id == id) {
      activeSession = sessions.isNotEmpty ? sessions.first : null;
    }
    notifyListeners();
  }

  void renameSession(String id, String newTitle) {
    final idx = sessions.indexWhere((s) => s.id == id);
    if (idx != -1) {
      sessions[idx].title = newTitle;
      sessions[idx].updatedAt = DateTime.now();
      notifyListeners();
    }
  }

  // Lab Experiment Timer
  int labTimerSeconds = 0;
  bool isTimerRunning = false;
  Timer? _ticker;
  String currentLabSessionTitle = 'ทดสอบการเหนี่ยวนำเซนเซอร์วัดค่าฝุ่น PM2.5';

  // Theme (Defaults to White / Light theme)
  AppThemeMode themeMode = AppThemeMode.light;

  // Project Settings & Discovery Constraints
  String selectedField = 'คอมพิวเตอร์ & ปัญญาประดิษฐ์';
  String gradeLevel = 'ม.ปลาย';
  String projectGoal = 'ประกวดแข่งขัน (YSC, ISEF, สพฐ.)';
  String budgetConstraint = '500 - 1,500 บาท';
  int timelineWeeks = 8;
  int teamSize = 2;

  final Set<String> availableResources = {
    'คอมพิวเตอร์ / โน้ตบุ๊ก',
    'ไมโครคอนโทรลเลอร์ & เซนเซอร์',
  };

  bool strictSafetyOnly = true;
  bool citePriorWorkOnly = true;

  void setTab(int index) {
    activeTab = index;
    notifyListeners();
  }

  void setThemeMode(AppThemeMode mode) {
    themeMode = mode;
    AppTheme.isDark = mode == AppThemeMode.dark;
    notifyListeners();
    _savePersistedState();
  }

  // Lab Timer Methods
  void toggleTimer() {
    isTimerRunning = !isTimerRunning;
    if (isTimerRunning) {
      _ticker = Timer.periodic(const Duration(seconds: 1), (timer) {
        labTimerSeconds++;
        notifyListeners();
      });
    } else {
      _ticker?.cancel();
    }
    notifyListeners();
  }

  void resetTimer() {
    _ticker?.cancel();
    isTimerRunning = false;
    labTimerSeconds = 0;
    notifyListeners();
  }

  void setLabSessionTitle(String title) {
    currentLabSessionTitle = title;
    notifyListeners();
    _savePersistedState();
  }

  String get formattedStudyTime {
    final hours = (labTimerSeconds ~/ 3600).toString().padLeft(2, '0');
    final minutes = ((labTimerSeconds % 3600) ~/ 60).toString().padLeft(2, '0');
    final seconds = (labTimerSeconds % 60).toString().padLeft(2, '0');
    return '$hours:$minutes:$seconds';
  }

  // Lab Observations Log
  final List<LabObservation> labObservations = [
    LabObservation(
      id: 'obs_1',
      time: '14:30',
      note: 'เริ่มรอบการวัดครั้งที่ 1: อุณหภูมิควบคุม 25.4°C ค่าความต่างศักย์เซนเซอร์คงที่ 3.28V',
      tag: 'Trial 1',
      createdAt: DateTime.now().subtract(const Duration(minutes: 30)),
    ),
    LabObservation(
      id: 'obs_2',
      time: '14:45',
      note: 'พ่นละอองควันทดสอบ: กราฟ PM2.5 ตอบสนองเพิ่มขึ้น 142 ug/m3 ในเวลา 3.2 วินาที',
      tag: 'Peak Event',
      createdAt: DateTime.now().subtract(const Duration(minutes: 15)),
    ),
  ];

  void addObservation({required String note, required String tag, String? customTime}) {
    final now = DateTime.now();
    final timeStr = customTime ??
        (labTimerSeconds > 0
            ? '$formattedStudyTime (${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')})'
            : '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}');
    labObservations.insert(0, LabObservation(
      id: 'obs_${now.millisecondsSinceEpoch}',
      time: timeStr,
      note: note,
      tag: tag,
      createdAt: now,
    ));
    notifyListeners();
    _savePersistedState();
  }

  void deleteObservation(String id) {
    labObservations.removeWhere((o) => o.id == id);
    notifyListeners();
    _savePersistedState();
  }

  // Discovery Project Settings Methods
  void selectField(String field) {
    selectedField = field;
    notifyListeners();
    _savePersistedState();
  }

  // Topic Cards Shortlist
  final List<TopicCard> shortlistedCards = [];

  void toggleShortlist(TopicCard card) {
    if (shortlistedCards.any((c) => c.id == card.id)) {
      shortlistedCards.removeWhere((c) => c.id == card.id);
    } else {
      shortlistedCards.add(card);
    }
    notifyListeners();
    _savePersistedState();
  }

  bool isShortlisted(String cardId) {
    return shortlistedCards.any((c) => c.id == cardId);
  }

  void setGradeLevel(String level) {
    gradeLevel = level;
    notifyListeners();
    _savePersistedState();
  }

  void setProjectGoal(String goal) {
    projectGoal = goal;
    notifyListeners();
    _savePersistedState();
  }

  void setBudgetConstraint(String budget) {
    budgetConstraint = budget;
    notifyListeners();
    _savePersistedState();
  }

  void setTimelineWeeks(int weeks) {
    timelineWeeks = weeks;
    notifyListeners();
    _savePersistedState();
  }

  void setTeamSize(int size) {
    teamSize = size;
    notifyListeners();
    _savePersistedState();
  }

  void toggleResource(String resource) {
    if (availableResources.contains(resource)) {
      availableResources.remove(resource);
    } else {
      availableResources.add(resource);
    }
    notifyListeners();
    _savePersistedState();
  }

  void setStrictSafetyOnly(bool val) {
    strictSafetyOnly = val;
    notifyListeners();
    _savePersistedState();
  }

  void setCitePriorWorkOnly(bool val) {
    citePriorWorkOnly = val;
    notifyListeners();
    _savePersistedState();
  }

  Future<void> loadPersistedState() async {
    try {
      final prefs = await SharedPreferences.getInstance();

      // 1. Theme
      final themeStr = prefs.getString('theme_mode');
      if (themeStr != null) {
        if (themeStr == 'dark') {
          themeMode = AppThemeMode.dark;
          AppTheme.isDark = true;
        } else if (themeStr == 'light') {
          themeMode = AppThemeMode.light;
          AppTheme.isDark = false;
        }
      }

      // 2. Shortlisted Topic Cards
      final shortIds = prefs.getStringList('shortlisted_ids');
      if (shortIds != null && shortIds.isNotEmpty) {
        shortlistedCards.clear();
        for (final id in shortIds) {
          final found = seedTopicCards.where((c) => c.id == id);
          if (found.isNotEmpty) {
            shortlistedCards.add(found.first);
          }
        }
      }

      // 3. Lab Observations
      final obsJson = prefs.getStringList('lab_observations');
      if (obsJson != null && obsJson.isNotEmpty) {
        labObservations.clear();
        for (final s in obsJson) {
          try {
            final map = jsonDecode(s) as Map<String, dynamic>;
            labObservations.add(LabObservation.fromJson(map));
          } catch (_) {}
        }
      }

      // 4. Constraints
      selectedField = prefs.getString('selected_field') ?? selectedField;
      gradeLevel = prefs.getString('grade_level') ?? gradeLevel;
      projectGoal = prefs.getString('project_goal') ?? projectGoal;
      budgetConstraint = prefs.getString('budget_constraint') ?? budgetConstraint;
      timelineWeeks = prefs.getInt('timeline_weeks') ?? timelineWeeks;
      teamSize = prefs.getInt('team_size') ?? teamSize;
      final resList = prefs.getStringList('available_resources');
      if (resList != null) {
        availableResources.clear();
        availableResources.addAll(resList);
      }
      strictSafetyOnly = prefs.getBool('strict_safety_only') ?? strictSafetyOnly;
      citePriorWorkOnly = prefs.getBool('cite_prior_work_only') ?? citePriorWorkOnly;
      currentLabSessionTitle = prefs.getString('lab_session_title') ?? currentLabSessionTitle;

      notifyListeners();
    } catch (e) {
      debugPrint('Error loading persisted learner state: $e');
    }
  }

  Future<void> _savePersistedState() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('theme_mode', themeMode.name);
      await prefs.setStringList('shortlisted_ids', shortlistedCards.map((c) => c.id).toList());
      await prefs.setStringList('lab_observations', labObservations.map((o) => jsonEncode(o.toJson())).toList());
      await prefs.setString('selected_field', selectedField);
      await prefs.setString('grade_level', gradeLevel);
      await prefs.setString('project_goal', projectGoal);
      await prefs.setString('budget_constraint', budgetConstraint);
      await prefs.setInt('timeline_weeks', timelineWeeks);
      await prefs.setInt('team_size', teamSize);
      await prefs.setStringList('available_resources', availableResources.toList());
      await prefs.setBool('strict_safety_only', strictSafetyOnly);
      await prefs.setBool('cite_prior_work_only', citePriorWorkOnly);
      await prefs.setString('lab_session_title', currentLabSessionTitle);
    } catch (e) {
      debugPrint('Error saving learner state: $e');
    }
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }
}
