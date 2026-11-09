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

class BomItem {
  final String id;
  final String title;
  final int costBaht;
  final String status;

  BomItem({
    required this.id,
    required this.title,
    required this.costBaht,
    required this.status,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'costBaht': costBaht,
    'status': status,
  };

  factory BomItem.fromJson(Map<String, dynamic> json) => BomItem(
    id: json['id'] as String? ?? 'bom_${DateTime.now().millisecondsSinceEpoch}',
    title: json['title'] as String? ?? '',
    costBaht: json['costBaht'] as int? ?? 0,
    status: json['status'] as String? ?? 'จัดซื้อแล้ว',
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
  String displayName = 'นักเรียนนักวิจัย';
  String handle = '@researcher';
  String schoolTier = 'มัธยมศึกษาตอนปลาย (ม.ปลาย)';
  int get activeProjectsCount => (currentLabSessionTitle.isNotEmpty ? 1 : 0) + shortlistedCards.length;
  int get evaluatedIdeasCount => shortlistedCards.length;
  int get approvedPivotsCount => 0;

  // Navigation: 0: Dashboard/Discovery, 1: AI Sessions, 2: Lab Timer, 3: Discussions, 4: Profile
  int activeTab = 0;
  static int _idCounter = 0;

  // AI Chat Sessions (Initial clean state: no mockup sessions)
  final List<ChatSession> sessions = [];

  ChatSession? activeSession;

  ChatSession get currentSession {
    if (activeSession != null) return activeSession!;
    if (sessions.isNotEmpty) return sessions.first;
    return ChatSession(
      id: 'session_${DateTime.now().microsecondsSinceEpoch}_${++_idCounter}',
      title: '🔬 การปรึกษาโครงงานวิทยาศาสตร์',
      category: 'Socratic Research',
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
      messages: [],
    );
  }

  void selectSession(String id) {
    activeSession = sessions.firstWhere((s) => s.id == id, orElse: () => currentSession);
    notifyListeners();
  }

  ChatSession createNewSession({required String title, required String category, List<ChatMessage>? initialMessages}) {
    return ChatSession(
      id: 'session_${DateTime.now().microsecondsSinceEpoch}_${++_idCounter}',
      title: title,
      category: category,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
      messages: initialMessages ?? [],
    );
  }

  ChatSession startSrcSafetySession({String? projectTopic}) {
    final topic = projectTopic ?? (selectedField.isNotEmpty ? selectedField : 'วิทยาศาสตร์ประยุกต์');
    return ChatSession(
      id: 'src_${DateTime.now().microsecondsSinceEpoch}_${++_idCounter}',
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

  void saveOrInsertSession(ChatSession session) {
    if (!sessions.any((s) => s.id == session.id)) {
      sessions.insert(0, session);
    }
    activeSession = session;
    notifyListeners();
    _savePersistedState();
  }

  void pruneEmptySessions() {
    // Only retain sessions where user actively typed or interacted (at least one user message)
    sessions.removeWhere((s) => s.messages.isEmpty || !s.messages.any((m) => m.isUser));
    if (activeSession != null && !activeSession!.messages.any((m) => m.isUser)) {
      activeSession = sessions.isNotEmpty ? sessions.first : null;
    }
    notifyListeners();
    _savePersistedState();
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
  String currentLabSessionTitle = '';

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

  // Lab Observations Log (Clean state: no mock observations)
  final List<LabObservation> labObservations = [];

  void addObservation({required String note, required String tag, String? customTime}) {
    final now = DateTime.now();
    final timeStr = customTime ??
        (labTimerSeconds > 0
            ? '$formattedStudyTime (${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')})'
            : '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}');
    labObservations.insert(0, LabObservation(
      id: 'obs_${now.microsecondsSinceEpoch}_${++_idCounter}',
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

  // BOM Management (Clean state: no mock items)
  final List<BomItem> bomItems = [];

  int get totalBomCost => bomItems.fold(0, (sum, item) => sum + item.costBaht);

  void addBomItem({required String title, required int costBaht, required String status}) {
    bomItems.add(BomItem(
      id: 'bom_${DateTime.now().microsecondsSinceEpoch}_${++_idCounter}',
      title: title,
      costBaht: costBaht,
      status: status,
    ));
    notifyListeners();
    _savePersistedState();
  }

  void deleteBomItem(String id) {
    bomItems.removeWhere((item) => item.id == id);
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

      // 5. BOM Items
      final bomJson = prefs.getStringList('bom_items');
      if (bomJson != null && bomJson.isNotEmpty) {
        bomItems.clear();
        for (final s in bomJson) {
          try {
            final map = jsonDecode(s) as Map<String, dynamic>;
            bomItems.add(BomItem.fromJson(map));
          } catch (_) {}
        }
      }

      // Automatically prune any legacy mock entries on device
      sessions.removeWhere((s) => s.id == 'session_socratic_1' || s.id == 'session_src_1');
      labObservations.removeWhere((o) => o.id == 'obs_1' || o.id == 'obs_2');
      bomItems.removeWhere((b) => b.id.startsWith('bom_') && int.tryParse(b.id.replaceAll('bom_', '')) != null && int.parse(b.id.replaceAll('bom_', '')) <= 4);
      if (currentLabSessionTitle == 'ทดสอบการเหนี่ยวนำเซนเซอร์วัดค่าฝุ่น PM2.5') {
        currentLabSessionTitle = '';
      }

      notifyListeners();
    } catch (e) {
      debugPrint('Error loading persisted learner state: $e');
    }
  }

  Future<void> clearAllAccountData() async {
    sessions.clear();
    activeSession = null;
    labObservations.clear();
    bomItems.clear();
    shortlistedCards.clear();
    currentLabSessionTitle = '';
    labTimerSeconds = 0;
    isTimerRunning = false;
    _ticker?.cancel();
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('shortlisted_ids');
      await prefs.remove('lab_observations');
      await prefs.remove('lab_session_title');
      await prefs.remove('bom_items');
      await prefs.remove('available_resources');
      await prefs.remove('selected_field');
      await prefs.remove('project_goal');
      await prefs.remove('grade_level');
    } catch (e) {
      debugPrint('Error clearing persisted state: $e');
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
      await prefs.setStringList('bom_items', bomItems.map((b) => jsonEncode(b.toJson())).toList());
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
