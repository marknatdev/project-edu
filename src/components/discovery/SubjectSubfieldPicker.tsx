'use client';

import React from 'react';
import { Atom, Cpu, Sigma, Sparkles, Check, Compass, HelpCircle } from 'lucide-react';
import { SUBJECTS, SUBFIELDS } from '@/data/subfields';

export interface SubjectSubfieldPickerProps {
  selectedSubjectId: string;
  onSelectSubject: (subjectId: string) => void;
  selectedSubfieldIds: string[] | 'unknown';
  onSelectSubfields: (subfields: string[] | 'unknown') => void;
  onProceedToDeck: () => void;
  matchingCardCount: number;
}

export function SubjectSubfieldPicker({
  selectedSubjectId,
  onSelectSubject,
  selectedSubfieldIds,
  onSelectSubfields,
  onProceedToDeck,
  matchingCardCount,
}: SubjectSubfieldPickerProps) {
  const currentSubfields = SUBFIELDS.filter((s) => s.subjectId === selectedSubjectId);
  const isMixedMode = selectedSubfieldIds === 'unknown';

  const handleToggleSubfield = (subfieldId: string) => {
    if (isMixedMode) {
      // Switching from "unknown" to a specific subfield
      onSelectSubfields([subfieldId]);
      return;
    }

    const currentList = Array.isArray(selectedSubfieldIds) ? selectedSubfieldIds : [];
    if (currentList.includes(subfieldId)) {
      const nextList = currentList.filter((id) => id !== subfieldId);
      // If none selected, default back to mixed mode
      onSelectSubfields(nextList.length > 0 ? nextList : 'unknown');
    } else {
      onSelectSubfields([...currentList, subfieldId]);
    }
  };

  const getSubjectIcon = (iconName: string) => {
    switch (iconName) {
      case 'Atom':
        return <Atom className="w-5 h-5" />;
      case 'Cpu':
        return <Cpu className="w-5 h-5" />;
      case 'Sigma':
        return <Sigma className="w-5 h-5" />;
      default:
        return <Compass className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Instructions */}
      <div className="bg-surface backdrop-blur-md border border-accent/30 rounded-3xl p-5 sm:p-6 shadow-e1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-tint border border-accent/30 text-caption font-semibold text-accent-text mb-3">
          <Compass className="w-3.5 h-3.5 text-accent-text" />
          <span>ขั้นตอนที่ 1 • เลือกสาขาวิชาที่สนใจ</span>
        </div>
        <h2 className="text-headline sm:text-title font-bold text-ink">
          คุณอยากเริ่มต้นสำรวจในหมวดหมู่วิชาใด?
        </h2>
        <p className="text-caption sm:text-callout text-ink-2 mt-1 leading-relaxed">
          เลือกหมวดหมู่วิชาหลักและสาขาย่อย หรือเลือก &ldquo;ยังไม่รู้&rdquo; เพื่อให้ระบบสุ่มหัวข้อหลากหลายสาขาแบบสมดุล
        </p>
      </div>

      {/* 2. Subject Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {SUBJECTS.map((subject) => {
          const isSelected = selectedSubjectId === subject.id;
          return (
            <button
              key={subject.id}
              type="button"
              onClick={() => {
                onSelectSubject(subject.id);
                // When subject changes, reset to mixed mode for that subject
                onSelectSubfields('unknown');
              }}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between min-h-[96px] ${
                isSelected
                  ? '   border-accent shadow-e1 ring-2 ring-accent'
                  : 'bg-surface border-separator hover:border-accent/30 hover:bg-surface-2'
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isSelected ? 'bg-accent text-white' : 'bg-surface-2 text-ink-2'
                  }`}
                >
                  {getSubjectIcon(subject.icon)}
                </div>
                {isSelected && (
                  <span className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </div>
              <div className="mt-3">
                <div className="font-bold text-callout text-ink">{subject.nameTh}</div>
                <div className="text-caption text-ink-3 line-clamp-1">{subject.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. Subfields Selection */}
      <div className="bg-surface backdrop-blur-md border border-separator rounded-3xl p-5 sm:p-6 space-y-4 shadow-e1">
        <div className="flex items-center justify-between">
          <label className="text-callout font-bold text-ink flex items-center gap-2">
            <span>สาขาย่อยในหมวดนี้</span>
            <span className="text-caption font-normal text-ink-3">(เลือกได้หลายข้อ)</span>
          </label>
          <span className="text-caption font-medium text-ink-3">
            {isMixedMode ? 'โหมดผสมผสาน' : `เลือก ${selectedSubfieldIds.length} สาขา`}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {/* Mixed Mode Button ("ยังไม่รู้") */}
          <button
            type="button"
            onClick={() => onSelectSubfields('unknown')}
            className={`min-h-11 px-3.5 py-2 rounded-xl text-caption font-semibold flex items-center gap-1.5 transition-all ${
              isMixedMode
                ? 'bg-caution text-white shadow-e1 ring-2 ring-amber-400/30'
                : 'bg-surface-2 text-ink-2 hover:bg-separator border border-separator'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>ยังไม่รู้ (ผสมผสานทุกสาขา)</span>
            {isMixedMode && <Check className="w-3 h-3 stroke-[3] ml-0.5" />}
          </button>

          {/* Subfields Chips */}
          {currentSubfields.map((subfield) => {
            const isPicked =
              !isMixedMode &&
              Array.isArray(selectedSubfieldIds) &&
              selectedSubfieldIds.includes(subfield.id);

            return (
              <button
                key={subfield.id}
                type="button"
                onClick={() => handleToggleSubfield(subfield.id)}
                className={`min-h-11 px-3.5 py-2 rounded-xl text-caption font-medium transition-all flex items-center gap-1.5 ${
                  isPicked
                    ? 'bg-accent text-white shadow-e1'
                    : 'bg-surface text-ink-2 border border-separator hover:border-accent/30 hover:bg-accent-tint'
                }`}
              >
                <span>{subfield.nameTh}</span>
                {isPicked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Action Banner */}
      <div className="sticky bottom-[92px] md:bottom-6 z-10 bg-surface/95 backdrop-blur-xl text-ink rounded-2xl p-4 shadow-e3 flex items-center justify-between gap-3">
        <div>
          <div className="text-caption text-ink-3">พร้อมสำรวจหัวข้อ</div>
          <div className="text-callout font-medium text-ink flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-accent-text" aria-hidden />
            <span>พบการ์ดหัวข้อ {matchingCardCount} ใบ</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onProceedToDeck}
          disabled={matchingCardCount === 0}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-accent hover:bg-accent disabled:opacity-50 text-white text-callout font-bold transition-all shadow-e2 flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <span>เริ่มดูการ์ด</span>
        </button>
      </div>
    </div>
  );
}
