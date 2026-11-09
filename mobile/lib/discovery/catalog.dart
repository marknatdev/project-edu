// Discovery Track model. The catalog data itself is generated into catalog.g.dart (ADR 0006).

class DiscoverySubject {
  final String id;
  final String nameTh;
  final String description;
  const DiscoverySubject({required this.id, required this.nameTh, required this.description});
}

class DiscoverySubfield {
  final String id;
  final String subjectId;
  final String nameTh;
  final String description;
  const DiscoverySubfield({required this.id, required this.subjectId, required this.nameTh, required this.description});
}

/// A Topic Card: a starting idea, not a finished project, and never claimed to be novel.
class DiscoveryCard {
  final String id;
  final String subjectId;
  final String subfieldId;
  final String title;
  final String phenomenon;
  final String curiosityHook;

  /// 'm_ton' and/or 'm_plai'.
  final List<String> gradeLevels;

  /// 'beginner' | 'intermediate' | 'advanced'.
  final String difficulty;
  final int estimatedWeeks;
  final int estimatedBudgetBaht;
  final List<String> requiredEquipment;
  final int minTeamSize;
  final int maxTeamSize;
  final List<String> requiredSkills;

  /// True for cards the AI generated for this learner (shown with an "AI คิดให้" label).
  final bool aiGenerated;

  const DiscoveryCard({
    required this.id,
    required this.subjectId,
    required this.subfieldId,
    required this.title,
    required this.phenomenon,
    required this.curiosityHook,
    required this.gradeLevels,
    required this.difficulty,
    required this.estimatedWeeks,
    required this.estimatedBudgetBaht,
    required this.requiredEquipment,
    required this.minTeamSize,
    required this.maxTeamSize,
    required this.requiredSkills,
    this.aiGenerated = false,
  });

  String get difficultyTh => switch (difficulty) {
        'beginner' => 'เริ่มต้น',
        'intermediate' => 'ปานกลาง',
        _ => 'ท้าทาย',
      };

  Map<String, dynamic> toJson() => {
        'id': id,
        'subjectId': subjectId,
        'subfieldId': subfieldId,
        'title': title,
        'phenomenon': phenomenon,
        'curiosityHook': curiosityHook,
        'gradeLevels': gradeLevels,
        'difficulty': difficulty,
        'estimatedWeeks': estimatedWeeks,
        'estimatedBudgetBaht': estimatedBudgetBaht,
        'requiredEquipment': requiredEquipment,
        'minTeamSize': minTeamSize,
        'maxTeamSize': maxTeamSize,
        'requiredSkills': requiredSkills,
        'aiGenerated': aiGenerated,
      };

  factory DiscoveryCard.fromJson(Map<String, dynamic> j) => DiscoveryCard(
        id: j['id'] as String,
        subjectId: j['subjectId'] as String,
        subfieldId: j['subfieldId'] as String,
        title: j['title'] as String,
        phenomenon: j['phenomenon'] as String? ?? '',
        curiosityHook: j['curiosityHook'] as String? ?? '',
        gradeLevels: (j['gradeLevels'] as List? ?? const ['m_ton', 'm_plai']).cast<String>(),
        difficulty: j['difficulty'] as String? ?? 'intermediate',
        estimatedWeeks: (j['estimatedWeeks'] as num? ?? 0).toInt(),
        estimatedBudgetBaht: (j['estimatedBudgetBaht'] as num? ?? 0).toInt(),
        requiredEquipment: (j['requiredEquipment'] as List? ?? const []).cast<String>(),
        minTeamSize: (j['minTeamSize'] as num? ?? 1).toInt(),
        maxTeamSize: (j['maxTeamSize'] as num? ?? 3).toInt(),
        requiredSkills: (j['requiredSkills'] as List? ?? const []).cast<String>(),
        aiGenerated: j['aiGenerated'] as bool? ?? false,
      );
}
