import 'dart:async';
import 'package:flutter/material.dart';

enum AppThemeMode { dark, system, light }

class LearnerState extends ChangeNotifier {
  // Identity (Zero-PII compliant)
  String displayName = 'Nattapan Seksansukatikul (Mark)';
  String handle = '@mooslide';
  String schoolTier = 'มัธยมศึกษาตอนปลาย (ม.ปลาย)';
  int activeProjectsCount = 2;
  int evaluatedIdeasCount = 6;
  int approvedPivotsCount = 3;

  // Navigation: 0: Dashboard/Discovery, 1: Projects, 2: Lab Timer, 3: Discussions, 4: Profile
  int activeTab = 0;

  // Lab Experiment Timer
  int labTimerSeconds = 0;
  bool isTimerRunning = false;
  Timer? _ticker;
  String currentLabSessionTitle = 'ทดสอบการเหนี่ยวนำเซนเซอร์วัดค่าฝุ่น PM2.5';

  // Theme
  AppThemeMode themeMode = AppThemeMode.dark;

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
    notifyListeners();
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

  String get formattedStudyTime {
    final hours = (labTimerSeconds ~/ 3600).toString().padLeft(2, '0');
    final minutes = ((labTimerSeconds % 3600) ~/ 60).toString().padLeft(2, '0');
    final seconds = (labTimerSeconds % 60).toString().padLeft(2, '0');
    return '$hours:$minutes:$seconds';
  }

  // Discovery Project Settings Methods
  void selectField(String field) {
    selectedField = field;
    notifyListeners();
  }

  void setGradeLevel(String level) {
    gradeLevel = level;
    notifyListeners();
  }

  void setProjectGoal(String goal) {
    projectGoal = goal;
    notifyListeners();
  }

  void setBudgetConstraint(String budget) {
    budgetConstraint = budget;
    notifyListeners();
  }

  void setTimelineWeeks(int weeks) {
    timelineWeeks = weeks;
    notifyListeners();
  }

  void setTeamSize(int size) {
    teamSize = size;
    notifyListeners();
  }

  void toggleResource(String resource) {
    if (availableResources.contains(resource)) {
      availableResources.remove(resource);
    } else {
      availableResources.add(resource);
    }
    notifyListeners();
  }

  void setStrictSafetyOnly(bool val) {
    strictSafetyOnly = val;
    notifyListeners();
  }

  void setCitePriorWorkOnly(bool val) {
    citePriorWorkOnly = val;
    notifyListeners();
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }
}
