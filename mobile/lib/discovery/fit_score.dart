// Port of computeFitScore + rankShortlist reasons (src/lib/rubrics/engine.ts, src/lib/discovery/shortlist.ts).
// Keep the formula identical to the web so a card scores the same on both.
import 'catalog.dart';

class FitConstraints {
  final int timeWeeks;
  final int budgetBaht;
  final List<String> equipment;
  final int teamSize;
  final List<String> skills;

  /// 'm_ton' | 'm_plai'.
  final String gradeLevel;

  const FitConstraints({
    required this.timeWeeks,
    required this.budgetBaht,
    required this.equipment,
    required this.teamSize,
    required this.skills,
    required this.gradeLevel,
  });
}

class FitScore {
  final int score;
  final Map<String, int> breakdown;
  final List<String> reasons;
  const FitScore(this.score, this.breakdown, this.reasons);
}

String _norm(String s) => s.trim().toLowerCase();

int _ratioScore(num have, num need) => (have / need * 100).clamp(0, 100).round();

int _matchScore(List<String> required, List<String> available) {
  if (required.isEmpty) return 100;
  final have = available.map(_norm).toSet();
  return (required.where((r) => have.contains(_norm(r))).length / required.length * 100).round();
}

String _baht(int v) => v.toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => ',');

FitScore computeFitScore(DiscoveryCard card, FitConstraints c) {
  final time = card.estimatedWeeks > 0 && c.timeWeeks < card.estimatedWeeks ? _ratioScore(c.timeWeeks, card.estimatedWeeks) : 100;
  final budget =
      card.estimatedBudgetBaht > 0 && c.budgetBaht < card.estimatedBudgetBaht ? _ratioScore(c.budgetBaht, card.estimatedBudgetBaht) : 100;
  final equipment = _matchScore(card.requiredEquipment, c.equipment);
  var team = 100;
  if (card.minTeamSize > 0 && c.teamSize < card.minTeamSize) {
    team = _ratioScore(c.teamSize, card.minTeamSize);
  } else if (c.teamSize > 0 && c.teamSize > card.maxTeamSize) {
    team = _ratioScore(card.maxTeamSize, c.teamSize);
  }
  final skills = _matchScore(card.requiredSkills, c.skills);
  final grade = card.gradeLevels.contains(c.gradeLevel) ? 100 : 50;
  final score = ((time + budget + equipment + team + skills + grade) / 6).clamp(0, 100).round();

  final missingEquipment = card.requiredEquipment.where((eq) => !c.equipment.any((u) => _norm(u).contains(_norm(eq)))).toList();
  final reasons = <String>[
    time == 100
        ? 'เวลาเหมาะสม: คาดว่าใช้ ${card.estimatedWeeks} สัปดาห์ (จากกรอบที่ตั้งไว้ ${c.timeWeeks} สัปดาห์)'
        : 'ระยะเวลาอาจกระชั้นชิด: คาดว่าใช้ ${card.estimatedWeeks} สัปดาห์ (เกินกรอบ ${c.timeWeeks} สัปดาห์)',
    budget == 100
        ? 'งบประมาณอยู่ในเกณฑ์: คาดว่าใช้ ${_baht(card.estimatedBudgetBaht)} บาท (จากงบ ${_baht(c.budgetBaht)} บาท)'
        : 'งบประมาณอาจตึงตัว: คาดว่าใช้ ${_baht(card.estimatedBudgetBaht)} บาท (เกินงบ ${_baht(c.budgetBaht)} บาท)',
    equipment == 100
        ? 'อุปกรณ์พร้อม: มีอุปกรณ์จำเป็นครบถ้วนสำหรับการทดลอง'
        : 'ต้องจัดหาอุปกรณ์เพิ่ม: ${missingEquipment.isNotEmpty ? missingEquipment.join(', ') : 'อุปกรณ์เฉพาะทาง'}',
    team == 100
        ? 'ขนาดทีมเหมาะสม: สมาชิก ${c.teamSize} คน เหมาะกับเนื้องาน'
        : 'ขนาดทีม: ปัจจุบันมี ${c.teamSize} คน (การ์ดแนะนำ ${card.minTeamSize}-${card.maxTeamSize} คน)',
    skills >= 80 ? 'ทักษะตรงกับความพร้อม: ทักษะที่ต้องใช้อยู่ในเกณฑ์ที่ทำได้' : 'ต้องศึกษาทักษะเพิ่มเติม: ${card.requiredSkills.join(', ')}',
  ];
  return FitScore(
    score,
    {'time': time, 'budget': budget, 'equipment': equipment, 'teamSize': team, 'skills': skills, 'gradeLevel': grade},
    reasons,
  );
}
