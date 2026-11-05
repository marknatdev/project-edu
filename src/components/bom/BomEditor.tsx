'use client';

import { useState } from 'react';
import type { Project } from '@/types/domain';
import type { BomItem } from '@/lib/bom/budget';
import { updateProjectBom } from '@/lib/storage/store';
import { BomItemForm } from './BomItemForm';
import { BudgetSummary, baht } from './BudgetSummary';

export function BomEditor({ project, budgetBaht, lockSelection }: { project: Project; budgetBaht: number | null; lockSelection: (locked: boolean) => void }) {
  const [items, setItems] = useState(project.bom ?? []);
  const [editing, setEditing] = useState<BomItem | 'new' | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const edit = (item: BomItem | 'new' | null) => { setEditing(item); lockSelection(item !== null); setError(''); setMessage(''); };
  function persist(next: BomItem[]): boolean {
    try {
      if (!updateProjectBom(project.id, next)) throw new Error('missing');
      setItems(next);
      setError('');
      setMessage('บันทึก BOM ในเบราว์เซอร์นี้แล้ว');
      return true;
    } catch {
      setError('บันทึกไม่สำเร็จ ข้อมูลเดิมยังอยู่ โปรดลองอีกครั้ง โดยยังไม่ปิดหน้านี้');
      return false;
    }
  }

  return (
    <div className="space-y-4">
      <BudgetSummary items={items} budgetBaht={budgetBaht} />
      <p className="text-xs text-slate-500">งบอ้างอิง Constraints จาก Interview ปัจจุบัน • ราคาประเมินที่ผู้เรียนกรอกเอง ไม่ใช่ใบเสนอราคา • บันทึกแยกตาม Project</p>
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {message && <p role="status" className="text-xs text-emerald-700">{message}</p>}
      <ul aria-label="รายการวัสดุอุปกรณ์" className="space-y-3">
        {items.map((item) => <li key={item.id}>
          {editing !== 'new' && editing?.id === item.id ? <BomItemForm item={editing} onCancel={() => edit(null)} onSave={(next) => {
            if (persist(items.map((row) => row.id === next.id ? next : row))) { setEditing(null); lockSelection(false); }
          }} /> : <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex justify-between gap-3">
              <div className="min-w-0"><h2 className="font-bold text-slate-900 break-words">{item.name}</h2><p className="mt-1 text-xs text-slate-500">{item.quantity} ชิ้น × {baht(item.unitPriceBaht)} ฿ / ชิ้น (ซื้อใหม่)</p></div>
              <p className="shrink-0 text-right text-sm font-bold text-indigo-700">{baht((item.useSchoolSubstitute ? item.substitutePriceBaht : item.unitPriceBaht) * item.quantity)} ฿</p>
            </div>
            <button type="button" role="switch" aria-checked={item.useSchoolSubstitute} disabled={editing !== null} aria-label={`ใช้ของในโรงเรียนแทน ${item.name}`} onClick={() => persist(items.map((row) => row.id === item.id ? { ...row, useSchoolSubstitute: !row.useSchoolSubstitute } : row))} className={`w-full min-h-11 rounded-xl border px-3 py-2 text-left text-xs font-semibold flex items-center gap-2 disabled:opacity-50 ${item.useSchoolSubstitute ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
              <span aria-hidden="true" className={`shrink-0 w-10 h-6 rounded-full p-1 ${item.useSchoolSubstitute ? 'bg-emerald-600' : 'bg-slate-300'}`}><span className={`block w-4 h-4 rounded-full bg-white transition-transform ${item.useSchoolSubstitute ? 'translate-x-4' : ''}`} /></span>
              <span>♻️ ใช้ของในโรงเรียนแทน<br /><span className="font-normal">{baht(item.substitutePriceBaht)} ฿ / ชิ้น • {item.useSchoolSubstitute ? 'เปิด' : 'ปิด'}</span></span>
            </button>
            {deleting === item.id ? <div className="space-y-2 text-sm"><p>ลบรายการนี้จาก BOM?</p><div className="grid grid-cols-2 gap-2"><button type="button" className="min-h-11 rounded-xl border border-slate-200" onClick={() => setDeleting(null)}>ยกเลิก</button><button type="button" className="min-h-11 rounded-xl bg-rose-600 text-white" onClick={() => { if (persist(items.filter((row) => row.id !== item.id))) setDeleting(null); }}>ยืนยันลบ</button></div></div> : <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <button type="button" disabled={editing !== null} className="min-h-11 rounded-xl border border-slate-200 text-slate-700 disabled:opacity-50" onClick={() => edit(item)}>แก้ไข</button>
              <button type="button" disabled={editing !== null} className="min-h-11 rounded-xl border border-rose-100 text-rose-700 disabled:opacity-50" onClick={() => setDeleting(item.id)}>ลบ</button>
            </div>}
          </article>}
        </li>)}
      </ul>
      {items.length === 0 && editing !== 'new' && <p className="rounded-2xl border border-dashed border-indigo-200 p-5 text-center text-sm text-slate-600">ยังไม่มีรายการ ลองสำรวจอุปกรณ์ที่มีแล้วเพิ่มวัสดุที่ต้องใช้</p>}
      {editing === 'new' ? <BomItemForm onCancel={() => edit(null)} onSave={(item) => {
        if (persist([...items, item])) { setEditing(null); lockSelection(false); }
      }} /> : <button type="button" disabled={editing !== null || items.length >= 200} onClick={() => { setDeleting(null); edit('new'); }} className="w-full min-h-11 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50 p-3 text-sm font-bold text-indigo-700 disabled:opacity-50">+ เพิ่มรายการวัสดุ {items.length >= 200 && '(ครบ 200 รายการแล้ว)'}</button>}
    </div>
  );
}
