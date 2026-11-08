import 'dart:async';
import 'package:flutter/material.dart';

enum AppThemeMode { dark, system, light }

class LearnerState extends ChangeNotifier {
  // Identity
  String displayName = 'Nattapan Seksansukatikul (Mark)';
  String handle = '@mooslide';
  int userRank = 7825;
  int streakDays = 42;
  int companionLevel = 2;
  int companionExp = 1450;
  int companionNextExp = 2500;

  // Navigation
  int activeTab = 0; // 0: Practice, 1: Community, 2: Timer, 3: Social, 4: Profile

  // Study Timer
  int studySecondsToday = 14;
  bool isTimerRunning = false;
  Timer? _ticker;

  // Theme
  AppThemeMode themeMode = AppThemeMode.dark;

  // Practice Stepper
  String selectedSubject = 'TGAT1';
  int questionCount = 10;
  bool showSolutions = true;
  bool enableTimer = false;
  final Set<String> selectedTopics = {'ระบบย่อยอาหาร', 'ระบบหายใจ'};

  void setTab(int index) {
    activeTab = index;
    notifyListeners();
  }

  void setThemeMode(AppThemeMode mode) {
    themeMode = mode;
    notifyListeners();
  }

  void toggleTimer() {
    isTimerRunning = !isTimerRunning;
    if (isTimerRunning) {
      _ticker = Timer.periodic(const Duration(seconds: 1), (timer) {
        studySecondsToday++;
        notifyListeners();
      });
    } else {
      _ticker?.cancel();
    }
    notifyListeners();
  }

  String get formattedStudyTime {
    final hours = (studySecondsToday ~/ 3600).toString().padLeft(2, '0');
    final minutes = ((studySecondsToday % 3600) ~/ 60).toString().padLeft(2, '0');
    final seconds = (studySecondsToday % 60).toString().padLeft(2, '0');
    return '$hours:$minutes:$seconds';
  }

  void selectSubject(String subject) {
    selectedSubject = subject;
    notifyListeners();
  }

  void setQuestionCount(int count) {
    questionCount = count;
    notifyListeners();
  }

  void toggleTopic(String topic) {
    if (selectedTopics.contains(topic)) {
      selectedTopics.remove(topic);
    } else {
      selectedTopics.add(topic);
    }
    notifyListeners();
  }

  void selectAllTopics(List<String> allTopics) {
    selectedTopics.addAll(allTopics);
    notifyListeners();
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }
}
