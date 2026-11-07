'use client';

import { useState, type FormEvent } from 'react';
import { BomItemSchema, type BomItem } from '@/lib/bom/budget';

const inputClass = 'mt-1 min-h-11 w-full min-w-0 rounded-xl border border-separator bg-surface p-3 text-callout focus:outline-none focus:ring-2 focus:ring-accent';

export function BomItemForm({ item, onSave, onCancel }: { item?: BomItem; onSave: (item: BomItem) => void; onCancel: () => void }) {
  const [name, setName] = useState(item?.name ?? '');
  const [quantity, setQuantity] = useState(String(item?.quantity ?? 1));
  const [price, setPrice] = useState(item ? String(item.unitPriceBaht) : '');
  const [substitute, setSubstitute] = useState(String(item?.substitutePriceBaht ?? 0));
  const [error, setError] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = BomItemSchema.safeParse({
      id: item?.id ?? crypto.randomUUID(), name,
      quantity: quantity.trim() ? Number(quantity) : NaN,
      unitPriceBaht: price.trim() ? Number(price) : NaN,
      substitutePriceBaht: substitute.trim() ? Number(substitute) : NaN,
      useSchoolSubstitute: item?.useSchoolSubstitute ?? false,
    });
    if (!result.success) { setError('ตรวจชื่อรายการ จำนวนเต็ม 1–9,999 และราคา 0–1,000,000 บาท (ทศนิยมไม่เกิน 2 ตำแหน่ง)'); return; }
    onSave(result.data);
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border-2 border-accent/30 bg-accent-tint p-4 space-y-3">
      <h2 className="font-bold text-accent-text">{item ? 'แก้ไขรายการ' : 'เพิ่มรายการวัสดุ'}</h2>
      <label className="block text-caption font-semibold">ชื่อวัสดุ / อุปกรณ์<input autoFocus aria-label="ชื่อวัสดุ / อุปกรณ์" required maxLength={120} className={inputClass} value={name} onChange={(e) => setName(e.target.value)} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block min-w-0 text-caption font-semibold">จำนวน<input aria-label="จำนวน" type="number" inputMode="numeric" required min="1" max="9999" step="1" className={inputClass} value={quantity} onChange={(e) => setQuantity(e.target.value)} /></label>
        <label className="block min-w-0 text-caption font-semibold">ราคา / ชิ้น (฿)<input aria-label="ราคาต่อชิ้น" type="number" inputMode="decimal" required min="0" max="1000000" step="0.01" className={inputClass} value={price} onChange={(e) => setPrice(e.target.value)} /></label>
      </div>
      <label className="block text-caption font-semibold">ราคาใช้ของในโรงเรียนแทน / ชิ้น (฿)<input aria-label="ราคาทดแทนต่อชิ้น" type="number" inputMode="decimal" required min="0" max="1000000" step="0.01" className={inputClass} value={substitute} onChange={(e) => setSubstitute(e.target.value)} /></label>
      <p className="text-caption text-ink-2">กรอกราคาประเมินเอง เช่น 0 หากยืมได้ฟรี ตรวจความพร้อมและค่าใช้จ่ายกับครูก่อนใช้จริง ไม่ต้องระบุชื่อโรงเรียน</p>
      {error && <p role="alert" className="text-caption text-risk">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancel} className="min-h-11 rounded-xl bg-surface border border-separator text-callout font-semibold">ยกเลิก</button>
        <button type="submit" className="min-h-11 rounded-xl bg-accent px-2 text-white text-callout font-semibold">บันทึกรายการ</button>
      </div>
    </form>
  );
}
