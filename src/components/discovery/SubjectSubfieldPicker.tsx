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
      <div className="bg-white/90 backdrop-blur-md border border-indigo-100 rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-xs font-semibold text-indigo-700 mb-3">
          <Compass className="w-3.5 h-3.5 text-indigo-600" />
          <span>ขั้นตอนที่ 1 • เลือกสาขาวิชาที่สนใจ</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-prompt">
          คุณอยากเริ่มต้นสำรวจในหมวดหมู่วิชาใด?
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
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
                  ? 'bg-gradient-to-br from-indigo-500/10 to-indigo-600/15 border-indigo-500 shadow-sm ring-2 ring-indigo-500/20'
                  : 'bg-white border-slate-200/90 hover:border-indigo-300 hover:bg-slate-50/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {getSubjectIcon(subject.icon)}
                </div>
                {isSelected && (
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </div>
              <div className="mt-3">
                <div className="font-bold text-sm text-slate-900 font-prompt">{subject.nameTh}</div>
                <div className="text-[11px] text-slate-500 line-clamp-1">{subject.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. Subfields Selection */}
      <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-slate-800 font-prompt flex items-center gap-2">
            <span>สาขาย่อยในหมวดนี้</span>
            <span className="text-xs font-normal text-slate-500">(เลือกได้หลายข้อ)</span>
          </label>
          <span className="text-xs font-medium text-slate-500">
            {isMixedMode ? 'โหมดผสมผสาน' : `เลือก ${selectedSubfieldIds.length} สาขา`}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {/* Mixed Mode Button ("ยังไม่รู้") */}
          <button
            type="button"
            onClick={() => onSelectSubfields('unknown')}
            className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isMixedMode
                ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-400/30'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
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
                className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                  isPicked
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
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
      <div className="sticky bottom-4 z-10 bg-slate-900 text-white rounded-2xl p-4 shadow-xl flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-slate-300">พร้อมสำรวจหัวข้อ</div>
          <div className="text-sm font-bold text-white font-prompt flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>พบการ์ดหัวข้อ {matchingCardCount} ใบ</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onProceedToDeck}
          disabled={matchingCardCount === 0}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-bold font-prompt transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <span>เริ่มปัดการ์ด</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
