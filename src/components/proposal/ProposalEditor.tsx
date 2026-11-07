'use client';

import React, { useState } from 'react';
import {
  Save,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { Proposal, ProposalVariables } from '@/types/domain';
import { updateProposalSection } from '@/lib/proposal/assemble';
import type { ProposalQuotaStatus } from '@/lib/proposal/quota-client';

interface ProposalEditorProps {
  proposal: Proposal;
  quotaStatus?: ProposalQuotaStatus;
  isSaving?: boolean;
  onSave: (updatedProposal: Proposal) => void;
  onReassemble: () => void;
  /** True when the stored proposal no longer matches the one this editor loaded. */
  changedElsewhere?: () => boolean;
}

export function ProposalEditor({
  proposal: initialProposal,
  quotaStatus,
  isSaving = false,
  onSave,
  onReassemble,
  changedElsewhere,
}: ProposalEditorProps) {
  const [proposal, setProposal] = useState<Proposal>(initialProposal);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showReassembleConfirm, setShowReassembleConfirm] = useState(false);

  const proposalRef = React.useRef(proposal);
  proposalRef.current = proposal;
  const onSaveRef = React.useRef(onSave);
  onSaveRef.current = onSave;
  const loadedRef = React.useRef(initialProposal);
  loadedRef.current = initialProposal;
  const changedElsewhereRef = React.useRef(changedElsewhere);
  changedElsewhereRef.current = changedElsewhere;

  // Sync state if initialProposal changes from outside (e.g. project switch)
  React.useEffect(() => {
    setProposal(initialProposal);
  }, [initialProposal]);

  React.useEffect(() => {
    const preserve = (event: Event) => {
      // Unedited: nothing to flush (a stale snapshot would overwrite newer saves from other tabs).
      if (JSON.stringify(proposalRef.current) === JSON.stringify(loadedRef.current)) return;
      // Edited but the stored copy changed since load: veto so the learner decides.
      if (changedElsewhereRef.current?.()) { event.preventDefault(); return; }
      try { onSaveRef.current(proposalRef.current); } catch { event.preventDefault(); }
    };
    window.addEventListener('edtech:before-account-navigation', preserve);
    return () => window.removeEventListener('edtech:before-account-navigation', preserve);
  }, []);

  const handleTitleChange = (val: string) => {
    setProposal((prev) => updateProposalSection(prev, 'title', val));
  };

  const handleProblemChange = (val: string) => {
    setProposal((prev) => updateProposalSection(prev, 'problemStatement', val));
  };

  const handleHypothesisChange = (val: string) => {
    setProposal((prev) => updateProposalSection(prev, 'hypothesis', val));
  };

  const handleMethodologyChange = (val: string) => {
    setProposal((prev) => updateProposalSection(prev, 'methodology', val));
  };

  // Objectives handlers
  const handleObjectiveChange = (index: number, val: string) => {
    const next = [...proposal.objectives];
    next[index] = val;
    setProposal((prev) => updateProposalSection(prev, 'objectives', next));
  };

  const handleAddObjective = () => {
    const next = [...proposal.objectives, ''];
    setProposal((prev) => updateProposalSection(prev, 'objectives', next));
  };

  const handleRemoveObjective = (index: number) => {
    const next = proposal.objectives.filter((_, i) => i !== index);
    setProposal((prev) => updateProposalSection(prev, 'objectives', next));
  };

  // Variables handlers
  const handleVariableChange = (
    kind: keyof ProposalVariables,
    index: number,
    val: string
  ) => {
    const nextList = [...proposal.variables[kind]];
    nextList[index] = val;
    const nextVars: ProposalVariables = {
      ...proposal.variables,
      [kind]: nextList,
    };
    setProposal((prev) => updateProposalSection(prev, 'variables', nextVars));
  };

  const handleAddVariable = (kind: keyof ProposalVariables) => {
    const nextList = [...proposal.variables[kind], ''];
    const nextVars: ProposalVariables = {
      ...proposal.variables,
      [kind]: nextList,
    };
    setProposal((prev) => updateProposalSection(prev, 'variables', nextVars));
  };

  const handleRemoveVariable = (kind: keyof ProposalVariables, index: number) => {
    const nextList = proposal.variables[kind].filter((_, i) => i !== index);
    const nextVars: ProposalVariables = {
      ...proposal.variables,
      [kind]: nextList,
    };
    setProposal((prev) => updateProposalSection(prev, 'variables', nextVars));
  };

  const handleSaveClick = () => {
    onSave(proposal);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const isQuotaExhausted = quotaStatus ? quotaStatus.remaining <= 0 : false;

  return (
    <div className="space-y-6">
      <p className="text-callout text-ink-2">
        ทุกส่วนเรียบเรียงจากคำตอบของคุณเอง แก้ไขได้อิสระ
        {quotaStatus && <> · สร้างใหม่จากคำตอบได้อีก {quotaStatus.remaining} จาก {quotaStatus.limit} ครั้งวันนี้ (การแก้ไขเองไม่เสียโควตา)</>}
      </p>

      {/* Quota Exceeded Alert if exhausted */}
      {isQuotaExhausted && quotaStatus?.messageTh && (
        <div className="p-3.5 rounded-2xl bg-caution-tint border border-caution/30 text-caution text-caption flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-caution mt-0.5 shrink-0" />
          <div>
            <div className="font-bold mb-0.5">{quotaStatus.unavailable ? 'ยังตรวจสิทธิ์สร้างข้อเสนอไม่ได้' : 'โควตาสร้างข้อเสนอสำหรับวันนี้ครบแล้ว'}</div>
            <div>{quotaStatus.messageTh} คุณยังคงสามารถพิมพ์แก้ไขและบันทึกข้อความได้ตลอดเวลา</div>
          </div>
        </div>
      )}

      {/* Project Title Card */}
      <div className="bg-surface rounded-3xl border border-separator p-5 sm:p-6 shadow-e1 space-y-2">
        <label className="block font-medium text-ink">
          ชื่อโครงงาน
        </label>
        <input
          type="text"
          value={proposal.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="ระบุชื่อโครงงานฉบับสมบูรณ์..."
          className="w-full text-body sm:text-headline font-bold text-ink px-4 py-2.5 rounded-xl border border-separator focus:outline-none focus:ring-2 focus:ring-accent min-h-[44px]"
        />
      </div>

      {/* 1. ที่มาและความสำคัญ (problemStatement) */}
      <div className="bg-surface rounded-3xl border border-separator p-5 sm:p-6 shadow-e1 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-ink text-callout sm:text-body flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-accent-tint text-accent-text text-caption flex items-center justify-center font-semibold">
              1
            </span>
            <span>ที่มาและความสำคัญของโครงงาน</span>
          </h3>
          <span className="text-caption text-ink-3">
            {proposal.problemStatement.length} ตัวอักษร
          </span>
        </div>
        <textarea
          rows={5}
          value={proposal.problemStatement}
          onChange={(e) => handleProblemChange(e.target.value)}
          placeholder="อธิบายปัญหาที่พบ ช่องว่างความรู้ หรือแรงบันดาลใจที่ทำให้เริ่มทำโครงงานนี้..."
          className="w-full text-caption sm:text-callout text-ink p-3.5 rounded-2xl border border-separator focus:outline-none focus:ring-2 focus:ring-accent leading-relaxed"
        />
      </div>

      {/* 2. วัตถุประสงค์ (objectives) */}
      <div className="bg-surface rounded-3xl border border-separator p-5 sm:p-6 shadow-e1 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-ink text-callout sm:text-body flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-accent-tint text-accent-text text-caption flex items-center justify-center font-semibold">
              2
            </span>
            <span>วัตถุประสงค์</span>
          </h3>
          <button
            type="button"
            onClick={handleAddObjective}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-accent-tint text-accent-text text-caption font-semibold hover:bg-accent-tint transition min-h-11"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>เพิ่มข้อ</span>
          </button>
        </div>

        <div className="space-y-2">
          {proposal.objectives.length === 0 ? (
            <p className="text-caption text-ink-3 italic py-2">
              ยังไม่มีข้อความวัตถุประสงค์ กดปุ่ม &quot;เพิ่มข้อ&quot; เพื่อระบุ
            </p>
          ) : (
            proposal.objectives.map((obj, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-caption font-bold text-ink-3 w-5 text-right shrink-0">
                  {idx + 1}.
                </span>
                <input
                  type="text"
                  value={obj}
                  onChange={(e) => handleObjectiveChange(idx, e.target.value)}
                  placeholder={`เช่น เพื่อศึกษาประสิทธิภาพของ...`}
                  className="flex-1 text-caption sm:text-callout text-ink px-3 py-2 rounded-xl border border-separator focus:outline-none focus:ring-2 focus:ring-accent min-h-11"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveObjective(idx)}
                  className="p-2 text-ink-3 hover:text-risk rounded-lg min-h-11 min-w-[40px] flex items-center justify-center"
                  aria-label={`ลบวัตถุประสงค์ข้อที่ ${idx + 1}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. สมมติฐาน (hypothesis) */}
      <div className="bg-surface rounded-3xl border border-separator p-5 sm:p-6 shadow-e1 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-ink text-callout sm:text-body flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-accent-tint text-accent-text text-caption flex items-center justify-center font-semibold">
              3
            </span>
            <span>สมมติฐานการทดลอง/การศึกษา</span>
          </h3>
        </div>
        <textarea
          rows={3}
          value={proposal.hypothesis}
          onChange={(e) => handleHypothesisChange(e.target.value)}
          placeholder="ถ้า... ดังนี้แล้ว... (เช่น หากเพิ่มความเข้มข้นสารสกัด จะลดการเจริญเติบโตของแบคทีเรียได้อย่างมีนัยสำคัญ)..."
          className="w-full text-caption sm:text-callout text-ink p-3.5 rounded-2xl border border-separator focus:outline-none focus:ring-2 focus:ring-accent leading-relaxed"
        />
      </div>

      {/* 4. ตัวแปร (variables) */}
      <div className="bg-surface rounded-3xl border border-separator p-5 sm:p-6 shadow-e1 space-y-4">
        <h3 className="font-bold text-ink text-callout sm:text-body flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-accent-tint text-accent-text text-caption flex items-center justify-center font-semibold">
            4
          </span>
          <span>ตัวแปรในการทดลอง/การพัฒนา</span>
        </h3>

        {/* 4.1 ตัวแปรต้น */}
        <div className="p-3.5 rounded-2xl bg-surface-2 border border-separator space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-caption font-bold text-ink-2">
              ตัวแปรต้น
            </span>
            <button
              type="button"
              onClick={() => handleAddVariable('independent')}
              className="text-caption text-accent-text hover:text-accent-text font-semibold flex items-center gap-1 min-h-11 px-2"
            >
              <Plus className="w-3 h-3" />
              <span>เพิ่ม</span>
            </button>
          </div>
          {proposal.variables.independent.length === 0 ? (
            <p className="text-caption text-ink-3 italic">ยังไม่มีตัวแปรต้น</p>
          ) : (
            proposal.variables.independent.map((val, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={val}
                  onChange={(e) => handleVariableChange('independent', idx, e.target.value)}
                  placeholder="เช่น ชนิดของสารเคลือบ / ความเข้มข้น"
                  className="flex-1 text-caption text-ink px-3 py-1.5 rounded-lg border border-separator focus:outline-none focus:ring-2 focus:ring-accent min-h-11"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveVariable('independent', idx)}
                  className="p-2 text-ink-3 hover:text-risk min-h-11 min-w-[40px] flex items-center justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* 4.2 ตัวแปรตาม */}
        <div className="p-3.5 rounded-2xl bg-surface-2 border border-separator space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-caption font-bold text-ink-2">
              ตัวแปรตาม
            </span>
            <button
              type="button"
              onClick={() => handleAddVariable('dependent')}
              className="text-caption text-accent-text hover:text-accent-text font-semibold flex items-center gap-1 min-h-11 px-2"
            >
              <Plus className="w-3 h-3" />
              <span>เพิ่ม</span>
            </button>
          </div>
          {proposal.variables.dependent.length === 0 ? (
            <p className="text-caption text-ink-3 italic">ยังไม่มีตัวแปรตาม</p>
          ) : (
            proposal.variables.dependent.map((val, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={val}
                  onChange={(e) => handleVariableChange('dependent', idx, e.target.value)}
                  placeholder="เช่น อัตราการสูญเสียน้ำหนัก / ความแน่นเนื้อ"
                  className="flex-1 text-caption text-ink px-3 py-1.5 rounded-lg border border-separator focus:outline-none focus:ring-2 focus:ring-accent min-h-11"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveVariable('dependent', idx)}
                  className="p-2 text-ink-3 hover:text-risk min-h-11 min-w-[40px] flex items-center justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* 4.3 ตัวแปรควบคุม */}
        <div className="p-3.5 rounded-2xl bg-surface-2 border border-separator space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-caption font-bold text-ink-2">
              ตัวแปรควบคุม
            </span>
            <button
              type="button"
              onClick={() => handleAddVariable('controlled')}
              className="text-caption text-accent-text hover:text-accent-text font-semibold flex items-center gap-1 min-h-11 px-2"
            >
              <Plus className="w-3 h-3" />
              <span>เพิ่ม</span>
            </button>
          </div>
          {proposal.variables.controlled.length === 0 ? (
            <p className="text-caption text-ink-3 italic">ยังไม่มีตัวแปรควบคุม</p>
          ) : (
            proposal.variables.controlled.map((val, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={val}
                  onChange={(e) => handleVariableChange('controlled', idx, e.target.value)}
                  placeholder="เช่น อุณหภูมิการเก็บรักษา / ระยะเวลา"
                  className="flex-1 text-caption text-ink px-3 py-1.5 rounded-lg border border-separator focus:outline-none focus:ring-2 focus:ring-accent min-h-11"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveVariable('controlled', idx)}
                  className="p-2 text-ink-3 hover:text-risk min-h-11 min-w-[40px] flex items-center justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 5. วิธีทำ / ขั้นตอนดำเนินงาน (methodology) */}
      <div className="bg-surface rounded-3xl border border-separator p-5 sm:p-6 shadow-e1 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-ink text-callout sm:text-body flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-accent-tint text-accent-text text-caption flex items-center justify-center font-semibold">
              5
            </span>
            <span>วิธีดำเนินการ / ขั้นตอนการทดลอง</span>
          </h3>
          <span className="text-caption text-ink-3">
            {proposal.methodology.length} ตัวอักษร
          </span>
        </div>
        <textarea
          rows={6}
          value={proposal.methodology}
          onChange={(e) => handleMethodologyChange(e.target.value)}
          placeholder="ระบุขั้นตอนดำเนินการเป็นลำดับ เช่น 1. การเตรียมสารสกัด 2. การสร้างชุดทดสอบ 3. การเก็บข้อมูล..."
          className="w-full text-caption sm:text-callout text-ink p-3.5 rounded-2xl border border-separator focus:outline-none focus:ring-2 focus:ring-accent leading-relaxed font-mono text-[13px]"
        />
      </div>

      {/* Bottom Action Bar */}
      <div className="sticky bottom-[92px] md:bottom-6 z-10 p-3 bg-surface/95 backdrop-blur-xl rounded-2xl shadow-e2 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="text-caption font-semibold text-good flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>บันทึกการแก้ไขเรียบร้อย</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setShowReassembleConfirm(true)}
            disabled={isQuotaExhausted}
            className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-caption font-bold transition min-h-[44px] ${
              isQuotaExhausted
                ? 'bg-surface-2 text-ink-3 cursor-not-allowed'
                : 'bg-surface-2 hover:bg-separator text-ink-2'
            }`}
            title={
              isQuotaExhausted
                ? quotaStatus?.messageTh
                : 'สร้างข้อเสนอใหม่จากคำตอบสัมภาษณ์และไอเดีย (ใช้โควตา 1 ครั้ง)'
            }
          >
            <RefreshCw className="w-4 h-4" />
            <span>สร้างใหม่จากคำตอบ</span>
          </button>

          <button
            type="button"
            onClick={handleSaveClick}
            disabled={isSaving}
            className="flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-press text-white text-caption font-bold shadow-e2 transition min-h-[44px]"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}</span>
          </button>
        </div>
      </div>

      {/* Reassemble Confirmation Modal */}
      {showReassembleConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
          <div className="bg-surface rounded-3xl border border-separator p-6 max-w-sm w-full shadow-e3 animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-2xl bg-accent-tint text-accent-text flex items-center justify-center mb-3">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-ink text-body mb-1.5">
              สร้างข้อเสนอใหม่จากคำตอบเดิม?
            </h3>
            <p className="text-caption text-ink-2 mb-4 leading-relaxed">
              การสร้างใหม่จะนำข้อมูลจากคำตอบสัมภาษณ์และไอเดียมาจัดเรียงใหม่ และจะใช้โควตาสร้างข้อเสนอ 1
              ครั้ง (เหลือ {quotaStatus?.remaining ?? 2} ครั้งในวันนี้)
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReassembleConfirm(false)}
                className="px-4 py-2.5 rounded-xl text-caption font-semibold text-ink-2 hover:bg-surface-2 transition min-h-11"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReassembleConfirm(false);
                  onReassemble();
                }}
                className="px-5 py-2.5 rounded-xl bg-accent text-white text-caption font-bold hover:bg-accent-press shadow-e1 transition min-h-11"
              >
                ยืนยันสร้างใหม่
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
