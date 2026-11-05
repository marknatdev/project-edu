'use client';

import { useState } from 'react';
import type { Idea, VariableIsolator } from '@/types/domain';
import { createIsolator } from '@/lib/variables/presets';
import { checkRigor, evaluateIsolator, QUANTITATIVE_UNITS } from '@/lib/variables/rigor';

const inputClass = 'mt-2 w-full min-w-0 min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100';

function Field({ label, value, onChange, hint }: { label: string; value: string; onChange: (value: string) => void; hint: string }) {
  return <label className="block text-sm font-semibold text-slate-800">{label}
    <textarea rows={2} className={inputClass} value={value} onChange={(event) => onChange(event.target.value)} placeholder={hint} />
  </label>;
}

export function VariableIsolatorCanvas({ idea, onSave }: { idea: Idea; onSave: (design: VariableIsolator) => boolean }) {
  const [science, setScience] = useState(() => createIsolator(idea, 'science'));
  const [computing, setComputing] = useState(() => createIsolator(idea, 'computing'));
  const [preset, setPreset] = useState<VariableIsolator['preset']>(idea.isolator?.preset ?? 'science');
  const [dirty, setDirty] = useState(false);
  const design = preset === 'science' ? science : computing;
  const rigor = checkRigor(design);
  const axis = evaluateIsolator(design);
  const updateScience = (patch: Partial<typeof science>) => { setScience({ ...science, ...patch }); setDirty(true); };
  const updateComputing = (patch: Partial<typeof computing>) => { setComputing({ ...computing, ...patch }); setDirty(true); };
  return (
    <section className="space-y-4" aria-label="ตารางแยกตัวแปรและชุดควบคุม">
      <div className="rounded-3xl border border-indigo-100 bg-white p-4 sm:p-6 space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-bold text-indigo-700">VARIABLE & CONTROL ISOLATOR</p>
          <h1 className="text-xl font-bold text-slate-900">ตารางแยกตัวแปร & ชุดควบคุม</h1>
          <p className="text-sm text-slate-600">คุณเป็นคนออกแบบและกรอกคำตอบเอง ใช้คำถามชวนคิดเพื่อแยกสิ่งที่เปลี่ยน สิ่งที่วัด และสิ่งที่ต้องคงเดิม</p>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">เลือกรูปแบบการศึกษา</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(['science', 'computing'] as const).map((value) => <button type="button" key={value} aria-pressed={preset === value} onClick={() => { setPreset(value); setDirty(true); }} className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm font-semibold ${preset === value ? 'border-indigo-600 bg-indigo-50 text-indigo-800' : 'border-slate-200 text-slate-600'}`}>
              {value === 'science' ? '🔬 วิทยาศาสตร์' : '💻 คอมพิวเตอร์ / AI'}
            </button>)}
          </div>
          <p className="mt-2 text-xs text-slate-500">บันทึกเฉพาะรูปแบบที่เลือก สลับกลับได้โดยคำตอบที่ยังไม่บันทึกไม่หายระหว่างอยู่หน้านี้</p>
        </fieldset>
      </div>
      <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (onSave(design)) setDirty(false); }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 space-y-4">
            {design.preset === 'science' ? <>
              <Field label="ตัวแปรต้น (IV)" value={science.independent} onChange={(independent) => updateScience({ independent })} hint="คุณจะเปลี่ยนสิ่งใด และเปลี่ยนเป็นกี่ระดับ?" />
              <Field label="ตัวแปรตาม (DV)" value={science.dependent} onChange={(dependent) => updateScience({ dependent })} hint="จะสังเกตหรือวัดผลอะไร?" />
              <Field label="ตัวแปรควบคุม (หนึ่งรายการต่อบรรทัด)" value={science.controlled.join('\n')} onChange={(value) => updateScience({ controlled: value.split('\n') })} hint="ต้องคงเงื่อนไขใดให้เหมือนกันทุกชุด?" />
            </> : <>
              <Field label="ข้อมูลนำเข้า (Input)" value={computing.input} onChange={(input) => updateComputing({ input })} hint="ระบบรับข้อมูลใด? ไม่ใส่ข้อมูลส่วนตัวของอาสาสมัคร" />
              <Field label="ผลลัพธ์ (Output)" value={computing.output} onChange={(output) => updateComputing({ output })} hint="ระบบควรส่งผลอะไรออกมา?" />
              <Field label="ตัวชี้วัด (Metric)" value={computing.metric} onChange={(metric) => updateComputing({ metric })} hint="จะวัดความสำเร็จหรือความผิดพลาดด้วยอะไร?" />
              <Field label="การแบ่งข้อมูล (Data split)" value={computing.dataSplit} onChange={(dataSplit) => updateComputing({ dataSplit })} hint="แยกฝึก / ตรวจสอบ / ทดสอบอย่างไร ไม่ให้ข้อมูลซ้ำหรือรั่ว?" />
            </>}
          </div>
          <div className="min-w-0 rounded-3xl border border-indigo-200 bg-indigo-50/50 p-4 sm:p-6 space-y-4">
            {design.preset === 'science'
              ? <Field label="ชุดควบคุม / กลุ่มเปรียบเทียบ" value={science.controlGroup} onChange={(controlGroup) => updateScience({ controlGroup })} hint="เมื่อไม่เปลี่ยนตัวแปรต้น ผลควรเป็นอย่างไร?" />
              : <Field label="วิธีเปรียบเทียบ (Baseline)" value={computing.baseline} onChange={(baseline) => updateComputing({ baseline })} hint="จะเปรียบเทียบกับวิธีเดิมใดโดยใช้ข้อมูลทดสอบเดียวกัน?" />}
            <label className="block text-sm font-semibold text-slate-800">หน่วยวัดเชิงปริมาณ
              <input list="quantitative-units" className={inputClass} value={design.unit} placeholder="เลือกหรือพิมพ์หน่วย เช่น °C, Ω, mg/L" onChange={(event) => preset === 'science' ? updateScience({ unit: event.target.value, customUnitConfirmed: false }) : updateComputing({ unit: event.target.value, customUnitConfirmed: false })} />
              <datalist id="quantitative-units">{QUANTITATIVE_UNITS.map((unit) => <option key={unit} value={unit} />)}</datalist>
            </label>
            {design.unit.trim() && !QUANTITATIVE_UNITS.includes(design.unit.trim()) && <label className="flex min-h-[44px] items-center gap-3 text-sm text-slate-700">
              <input type="checkbox" checked={design.customUnitConfirmed ?? false} className="h-5 w-5 shrink-0 accent-indigo-600" onChange={(event) => preset === 'science' ? updateScience({ customUnitConfirmed: event.target.checked }) : updateComputing({ customUnitConfirmed: event.target.checked })} />
              ฉันระบุหน่วยเชิงปริมาณหรือช่วงคะแนนที่วัดได้แล้ว และจะให้ครูช่วยตรวจ
            </label>}
            <label className="block text-sm font-semibold text-slate-800">{preset === 'science' ? 'จำนวนซ้ำต่อกลุ่ม (n)' : 'จำนวนรอบทดสอบอิสระ (n)'}
              <input type="number" min={0} max={1000000} step={1} className={inputClass} value={design.replicates || ''} onChange={(event) => preset === 'science' ? updateScience({ replicates: Number(event.target.value) }) : updateComputing({ replicates: Number(event.target.value) })} placeholder="ยังไม่ระบุ" />
            </label>
            <p className="text-xs text-slate-600">n ≥ 3 เป็นเกณฑ์ชวนคิดของแอป ไม่ใช่จำนวนตัวอย่างที่รับรองความถูกต้องทางสถิติหรือข้อบังคับการแข่งขัน</p>
          </div>
        </div>
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 sm:p-6 space-y-3" aria-live="polite">
          <h2 className="font-bold text-slate-900">Rigor Check • {rigor.passed ? 'ครบ 3 จุดตรวจเบื้องต้น' : 'ยังมีจุดที่ชวนคิดต่อ'}</h2>
          <ul className="space-y-2 text-sm text-slate-800">{rigor.checks.map((check) => <li key={check.id}>{check.passed ? '✓ มีข้อมูลแล้ว' : '○ ยังไม่ครบ'} — {check.hintTh}</li>)}</ul>
          <p className="text-sm text-slate-700">ประมาณคะแนนด้านสมมติฐาน/วิธีวัดผล: {axis.score}/10 (heuristic ไม่ใช่คะแนนทางการ)</p>
          <p className="text-sm text-slate-700">{axis.feedback}</p>
          <p className="text-xs text-slate-600">ไม่บล็อกการร่าง Proposal แม้ยังกรอกไม่ครบ บันทึกแล้วกดประเมินใหม่เพื่ออัปเดตคะแนนทั้ง 5 ด้านตามโควตา</p>
        </div>
        <button type="submit" className="w-full min-h-[44px] rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white">บันทึกตารางแยกตัวแปร</button>
        <p className="text-xs text-slate-500" role="status">{dirty ? 'มีการแก้ไขที่ยังไม่บันทึก' : 'บันทึกเฉพาะเมื่อกดปุ่ม • ไม่ใช้โควตา AI'}</p>
      </form>
    </section>
  );
}
