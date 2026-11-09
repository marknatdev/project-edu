// Port of isRewriteAcceptable (src/lib/advisor/chat-reducer.ts): the learner must describe the idea
// in their own words before a Topic Card becomes their Idea.

class RewriteCheck {
  final bool acceptable;
  final String? reasonTh;
  final double overlapRatio;
  const RewriteCheck(this.acceptable, this.reasonTh, this.overlapRatio);
}

String _normalize(String text) => text.toLowerCase().replaceAll(RegExp(r'[^\p{L}\p{N}]', unicode: true), '').trim();

Set<String> _trigrams(String text) {
  if (text.length < 3) return {text};
  return {for (var i = 0; i <= text.length - 3; i++) text.substring(i, i + 3)};
}

RewriteCheck checkRewrite(String source, String rewrite) {
  final trimmed = rewrite.trim();
  if (trimmed.length < 15) {
    return const RewriteCheck(false, 'กรุณาเขียนอธิบายแนวทางในมุมมองของคุณอย่างน้อย 15 ตัวอักษร', 0);
  }
  final a = _normalize(source);
  final b = _normalize(trimmed);
  if (a == b) {
    return const RewriteCheck(false, 'กรุณาเขียนใหม่ด้วยสำนวนภาษาและความเข้าใจของตนเอง (ห้ามคัดลอกหรือดัดแปลงข้อความตัวอย่างตรงๆ)', 1);
  }
  final setA = _trigrams(a);
  final setB = _trigrams(b);
  final shared = setB.where(setA.contains).length;
  final ratio = setA.length + setB.length == 0 ? 0.0 : 2 * shared / (setA.length + setB.length);
  if (ratio > 0.65) {
    return RewriteCheck(false, 'กรุณาเขียนใหม่ด้วยสำนวนภาษาและความเข้าใจของตนเอง (หลีกเลี่ยงการคัดลอกข้อความตัวอย่างตรงๆ)', ratio);
  }
  return RewriteCheck(true, null, ratio);
}
