export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Decorative backdrop glow */}
      <div className="w-full max-w-3xl mx-auto">
        <div className="bg-white/85 backdrop-blur-md border border-indigo-500/20 shadow-xl rounded-3xl p-6 sm:p-10 space-y-8">
          {/* Header & Badges */}
          <div className="space-y-4 text-center sm:text-left">
            <div className="inline-flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Project Edu
              </span>
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-pink-50 text-pink-700 border border-pink-200">
                ม.ต้น & ม.ปลาย
              </span>
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-mint-50 text-emerald-700 border border-mint-200">
                Zero-PII Guest Mode
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 font-prompt">
              ผู้ช่วยเริ่มต้นโครงงาน ม.ต้น และ ม.ปลาย
            </h1>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-prompt">
              เปลี่ยนความสงสัยรอบตัวให้เป็นหัวข้อโครงงานที่จับต้องได้ พร้อมรับคำแนะนำแบบ Socratic จากครูที่ปรึกษา AI
              และวิเคราะห์ความเป็นไปได้ตามข้อจำกัดจริงของผู้เรียน
            </p>
          </div>

          {/* Track selection cards overview (A+B Neo-Pop & Glass) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-5 rounded-2xl bg-white/70 border border-indigo-100 shadow-sm hover:border-indigo-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-bold text-lg mb-3 shadow">
                1
              </div>
              <h2 className="text-lg font-bold text-slate-800 mb-1 font-prompt">
                เส้นทางค้นหา (Discovery Track)
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                สำหรับผู้เรียนที่ยังไม่มีหัวข้อ สำรวจการ์ดหัวข้อ 90 ใบ เลือกวิชา ปัดการ์ด และจัด Shortlist ร่วมกัน
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/70 border border-pink-100 shadow-sm hover:border-pink-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-pink-500 text-white flex items-center justify-center font-bold text-lg mb-3 shadow">
                2
              </div>
              <h2 className="text-lg font-bold text-slate-800 mb-1 font-prompt">
                เส้นทางมีไอเดีย (Idea Track)
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                สำหรับผู้เรียนที่มีไอเดียในใจแล้ว เล่ารายละเอียดเพื่อประเมิน 5 ด้าน และรับคำแนะนำต่อยอด
              </p>
            </div>
          </div>

          {/* Pedagogical Scaffolding Notice */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-700">
              หลักการ Socratic Advisor First:
            </p>
            <p>
              AI ทำหน้าที่ชวนคิดและตั้งคำถามเพื่อกระตุ้นความเป็นเจ้าของความคิดของผู้เรียน (Ownership)
              ตามเกณฑ์มาตรฐานการแข่งขันทางวิทยาศาสตร์และนวัตกรรม
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
