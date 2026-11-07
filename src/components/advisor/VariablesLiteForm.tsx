'use client';

import React, { useState } from 'react';
import { FlaskConical, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { IdeaVariablesLite } from '@/types/domain';
import { validateVariablesLite } from '@/lib/advisor/chat-reducer';

export interface VariablesLiteFormProps {
  initialValues?: Partial<IdeaVariablesLite>;
  onSubmitVariables: (variables: IdeaVariablesLite) => void;
  isSubmitting?: boolean;
}

export function VariablesLiteForm({
  initialValues,
  onSubmitVariables,
  isSubmitting = false,
}: VariablesLiteFormProps) {
  const [independent, setIndependent] = useState(initialValues?.independent ?? '');
  const [dependent, setDependent] = useState(initialValues?.dependent ?? '');
  const [controlGroup, setControlGroup] = useState(initialValues?.controlGroup ?? '');
  const [replicates, setReplicates] = useState<number>(initialValues?.replicates ?? 3);

  // Controlled variables array
  const [controlledList, setControlledList] = useState<string[]>(
    initialValues?.controlled && initialValues.controlled.length > 0
      ? initialValues.controlled
      : ['']
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAddControlled = () => {
    setControlledList((prev) => [...prev, '']);
  };

  const handleRemoveControlled = (index: number) => {
    setControlledList((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length === 0 ? [''] : next;
    });
  };

  const handleControlledChange = (index: number, val: string) => {
    setControlledList((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
    if (errors.controlled) {
      setErrors((e) => {
        const copy = { ...e };
        delete copy.controlled;
        return copy;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const filteredControlled = controlledList
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const payload = {
      independent: independent.trim(),
      dependent: dependent.trim(),
      controlled: filteredControlled,
      controlGroup: controlGroup.trim(),
      replicates: Number(replicates),
    };

    const validation = validateVariablesLite(payload);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    if (validation.data) {
      onSubmitVariables(validation.data);
    }
  };

  return (
    <div className="bg-surface border border-accent/30 rounded-3xl p-4 sm:p-7 shadow-e1 space-y-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-accent-tint border border-accent/30 flex items-center justify-center shrink-0">
          <FlaskConical className="w-5 h-5 text-accent-text" />
        </div>
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-tint text-accent-text text-caption font-bold">
            <span>ตัวแปรและชุดควบคุม (Variables Step Lite)</span>
          </div>
          <h2 className="text-headline sm:text-headline font-semibold text-ink mt-1">
            ระบุตัวแปรและระเบียบวิธีวิจัย
          </h2>
          <p className="text-caption sm:text-callout text-ink-2 leading-relaxed">
            กำหนดตัวแปรต้น ตัวแปรตาม ตัวแปรควบคุม และชุดควบคุม เพื่อความแม่นยำทางวิทยาศาสตร์
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. ตัวแปรต้น */}
        <div>
          <label
            htmlFor="inp-independent"
            className="block text-caption font-bold text-ink mb-1"
          >
            1. ตัวแปรต้น (สิ่งที่จัดกระทำหรือต้องการทดสอบ) <span className="text-risk">*</span>
          </label>
          <input
            id="inp-independent"
            type="text"
            value={independent}
            onChange={(e) => {
              setIndependent(e.target.value);
              if (errors.independent) setErrors((prev) => ({ ...prev, independent: '' }));
            }}
            placeholder="ตัวอย่าง: ความเข้มข้นของสารสกัดเพกทิน (1%, 3%, 5%)"
            className="w-full min-h-[44px] px-3.5 py-2 rounded-2xl border border-control focus:border-accent focus:ring-2 focus:ring-accent text-caption sm:text-callout text-ink placeholder:text-ink-3 outline-none transition-all"
          />
          {errors.independent && (
            <p className="text-risk text-caption mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {errors.independent}
            </p>
          )}
        </div>

        {/* 2. ตัวแปรตาม */}
        <div>
          <label
            htmlFor="inp-dependent"
            className="block text-caption font-bold text-ink mb-1"
          >
            2. ตัวแปรตาม (สิ่งที่วัดผลและหน่วยวัด) <span className="text-risk">*</span>
          </label>
          <input
            id="inp-dependent"
            type="text"
            value={dependent}
            onChange={(e) => {
              setDependent(e.target.value);
              if (errors.dependent) setErrors((prev) => ({ ...prev, dependent: '' }));
            }}
            placeholder="ตัวอย่าง: ระยะเวลาการคงความสด (วัน) หรืออัตราการสูญเสียน้ำหนัก (%)"
            className="w-full min-h-[44px] px-3.5 py-2 rounded-2xl border border-control focus:border-accent focus:ring-2 focus:ring-accent text-caption sm:text-callout text-ink placeholder:text-ink-3 outline-none transition-all"
          />
          {errors.dependent && (
            <p className="text-risk text-caption mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {errors.dependent}
            </p>
          )}
        </div>

        {/* 3. ตัวแปรควบคุม */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-caption font-bold text-ink">
              3. ตัวแปรควบคุม (สภาวะที่ต้องควบคุมให้เหมือนกันทุกชุด) <span className="text-risk">*</span>
            </label>
            <button
              type="button"
              onClick={handleAddControlled}
              className="text-caption text-accent-text hover:text-accent-text font-bold flex items-center gap-1 min-h-11 px-2 py-0.5"
            >
              <Plus className="w-3.5 h-3.5" /> เพิ่มข้อ
            </button>
          </div>

          <div className="space-y-2">
            {controlledList.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => handleControlledChange(idx, e.target.value)}
                  placeholder={`ตัวแปรควบคุมข้อที่ ${idx + 1} (เช่น อุณหภูมิห้อง 25°C)`}
                  className="flex-1 min-h-11 px-3.5 py-2 rounded-2xl border border-control focus:border-accent focus:ring-2 focus:ring-accent text-caption sm:text-callout text-ink placeholder:text-ink-3 outline-none transition-all"
                />
                {controlledList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveControlled(idx)}
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-ink-3 hover:text-risk hover:bg-risk-tint transition-all shrink-0"
                    aria-label={`ลบตัวแปรควบคุมข้อที่ ${idx + 1}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {errors.controlled && (
            <p className="text-risk text-caption mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {errors.controlled}
            </p>
          )}
        </div>

        {/* 4. ชุดควบคุม (Control Group) */}
        <div>
          <label
            htmlFor="inp-control-group"
            className="block text-caption font-bold text-ink mb-1"
          >
            4. ชุดควบคุม (Control Group / Baseline Comparison) <span className="text-risk">*</span>
          </label>
          <input
            id="inp-control-group"
            type="text"
            value={controlGroup}
            onChange={(e) => {
              setControlGroup(e.target.value);
              if (errors.controlGroup) setErrors((prev) => ({ ...prev, controlGroup: '' }));
            }}
            placeholder="ตัวอย่าง: กลุ่มตัวอย่างที่ไม่ได้รับการเคลือบสาร (วางไว้ในสภาวะเดียวกัน)"
            className="w-full min-h-[44px] px-3.5 py-2 rounded-2xl border border-control focus:border-accent focus:ring-2 focus:ring-accent text-caption sm:text-callout text-ink placeholder:text-ink-3 outline-none transition-all"
          />
          {errors.controlGroup && (
            <p className="text-risk text-caption mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {errors.controlGroup}
            </p>
          )}
        </div>

        {/* 5. จำนวนซ้ำ (Replicates n) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="inp-replicates"
              className="text-caption font-bold text-ink"
            >
              5. จำนวนซ้ำในการทดลอง (Replicates n) <span className="text-risk">*</span>
            </label>
            <span className="text-caption text-accent-text bg-accent-tint px-2 py-0.5 rounded-full font-semibold">
              แนะนำ n ≥ 3 หรือ n ≥ 5 สำหรับโครงงานวิจัย
            </span>
          </div>
          <input
            id="inp-replicates"
            type="number"
            min={1}
            max={100}
            value={replicates}
            onChange={(e) => {
              setReplicates(parseInt(e.target.value, 10) || 1);
              if (errors.replicates) setErrors((prev) => ({ ...prev, replicates: '' }));
            }}
            className="w-32 min-h-[44px] px-3.5 py-2 rounded-2xl border border-control focus:border-accent focus:ring-2 focus:ring-accent text-caption sm:text-callout text-ink outline-none transition-all"
          />
          {errors.replicates && (
            <p className="text-risk text-caption mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {errors.replicates}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[44px] px-5 py-3 rounded-2xl bg-accent hover:bg-accent-press text-white font-bold text-callout flex items-center justify-center gap-2 transition-all shadow-e2 active:scale-[0.99] disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'กำลังบันทึกไอเดีย...' : 'บันทึกไอเดียโครงงาน →'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
