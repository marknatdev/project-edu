'use client';

import React, { useState } from 'react';
import {
  Save,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import type { Proposal, ProposalVariables } from '@/types/domain';
import { updateProposalSection } from '@/lib/proposal/assemble';
import type { ProposalQuotaStatus } from '@/lib/proposal/quota-client';
import { OptionalLoginOffer } from '@/components/auth/AccountAccess';

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
      {/* ADR 0002 Provenance Banner */}
      <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-start gap-2.5 shadow-xs">
        <Sparkles className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
        <div className="text-xs text-emerald-900 leading-relaxed">
          <span className="font-bold font-prompt">
            ข้อเสนอโครงงานฉบับร่วมสร้าง (Co-created 1-Page Proposal):
          </span>{' '}
          เนื้อหาทุกส่วนรวบรวมจากคำตอบและความคิดของคุณเอง 100% โดยไม่มีข้อความแต่งเติมจาก AI
          (ตามหลักการ ADR 0002) และคุณสามารถแก้ไขปรับปรุงได้อย่างอิสระ
        </div>
      </div>

      {/* Quota Tracker Bar */}
      {quotaStatus && (
        <div className="p-3 rounded-2xl bg-white border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">โควตาสร้างข้อเสนอวันนี้:</span>
            <span
              className={`px-2 py-0.5 rounded-full font-bold ${
                quotaStatus.remaining > 0
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
              เหลือ {quotaStatus.remaining} / {quotaStatus.limit} ครั้ง
            </span>
          </div>
          <div className="text-slate-500 text-[11px]">
            (การบันทึกแก้ไขด้วยตนเองทำได้ไม่จำกัดและไม่เสียโควตา)
          </div>
        </div>
      )}

      {/* Quota Exceeded Alert if exhausted */}
      {isQuotaExhausted && quotaStatus?.messageTh && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <div className="font-bold mb-0.5">{quotaStatus.unavailable ? 'ยังตรวจสิทธิ์สร้างข้อเสนอไม่ได้' : 'โควตาสร้างข้อเสนอสำหรับวันนี้ครบแล้ว'}</div>
            <div>{quotaStatus.messageTh} คุณยังคงสามารถพิมพ์แก้ไขและบันทึกข้อความได้ตลอดเวลา</div>
          </div>
        </div>
      )}

      {/* Project Title Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-2">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
          ชื่อโครงงาน (Project Title)
        </label>
        <input
          type="text"
          value={proposal.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="ระบุชื่อโครงงานฉบับสมบูรณ์..."
          className="w-full text-base sm:text-lg font-bold text-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-prompt min-h-[44px]"
        />
      </div>

      {/* 1. ที่มาและความสำคัญ (problemStatement) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2 font-prompt">
            <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-extrabold">
              1
            </span>
            <span>ที่มาและความสำคัญของโครงงาน</span>
          </h3>
          <span className="text-[11px] text-slate-400">
            {proposal.problemStatement.length} ตัวอักษร
          </span>
        </div>
        <textarea
          rows={5}
          value={proposal.problemStatement}
          onChange={(e) => handleProblemChange(e.target.value)}
          placeholder="อธิบายปัญหาที่พบ ช่องว่างความรู้ หรือแรงบันดาลใจที่ทำให้เริ่มทำโครงงานนี้..."
          className="w-full text-xs sm:text-sm text-slate-800 p-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
        />
      </div>

      {/* 2. วัตถุประสงค์ (objectives) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2 font-prompt">
            <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-extrabold">
              2
            </span>
            <span>วัตถุประสงค์ (Objectives)</span>
          </h3>
          <button
            type="button"
            onClick={handleAddObjective}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition min-h-[40px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>เพิ่มข้อ</span>
          </button>
        </div>

        <div className="space-y-2">
          {proposal.objectives.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">
              ยังไม่มีข้อความวัตถุประสงค์ กดปุ่ม &quot;เพิ่มข้อ&quot; เพื่อระบุ
            </p>
          ) : (
            proposal.objectives.map((obj, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 w-5 text-right shrink-0">
                  {idx + 1}.
                </span>
                <input
                  type="text"
                  value={obj}
                  onChange={(e) => handleObjectiveChange(idx, e.target.value)}
                  placeholder={`เช่น เพื่อศึกษาประสิทธิภาพของ...`}
                  className="flex-1 text-xs sm:text-sm text-slate-800 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[40px]"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveObjective(idx)}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center"
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
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2 font-prompt">
            <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-extrabold">
              3
            </span>
            <span>สมมติฐานการทดลอง/การศึกษา (Hypothesis)</span>
          </h3>
        </div>
        <textarea
          rows={3}
          value={proposal.hypothesis}
          onChange={(e) => handleHypothesisChange(e.target.value)}
          placeholder="ถ้า... ดังนี้แล้ว... (เช่น หากเพิ่มความเข้มข้นสารสกัด จะลดการเจริญเติบโตของแบคทีเรียได้อย่างมีนัยสำคัญ)..."
          className="w-full text-xs sm:text-sm text-slate-800 p-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
        />
      </div>

      {/* 4. ตัวแปร (variables) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2 font-prompt">
          <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-extrabold">
            4
          </span>
          <span>ตัวแปรในการทดลอง/การพัฒนา (Variables)</span>
        </h3>

        {/* 4.1 ตัวแปรต้น */}
        <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              🌱 ตัวแปรต้น (Independent Variables)
            </span>
            <button
              type="button"
              onClick={() => handleAddVariable('independent')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 min-h-[40px] px-2"
            >
              <Plus className="w-3 h-3" />
              <span>เพิ่ม</span>
            </button>
          </div>
          {proposal.variables.independent.length === 0 ? (
            <p className="text-xs text-slate-400 italic">ยังไม่มีตัวแปรต้น</p>
          ) : (
            proposal.variables.independent.map((val, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={val}
                  onChange={(e) => handleVariableChange('independent', idx, e.target.value)}
                  placeholder="เช่น ชนิดของสารเคลือบ / ความเข้มข้น"
                  className="flex-1 text-xs text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[40px]"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveVariable('independent', idx)}
                  className="p-2 text-slate-400 hover:text-rose-600 min-h-[40px] min-w-[40px] flex items-center justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* 4.2 ตัวแปรตาม */}
        <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              📈 ตัวแปรตาม (Dependent Variables)
            </span>
            <button
              type="button"
              onClick={() => handleAddVariable('dependent')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 min-h-[40px] px-2"
            >
              <Plus className="w-3 h-3" />
              <span>เพิ่ม</span>
            </button>
          </div>
          {proposal.variables.dependent.length === 0 ? (
            <p className="text-xs text-slate-400 italic">ยังไม่มีตัวแปรตาม</p>
          ) : (
            proposal.variables.dependent.map((val, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={val}
                  onChange={(e) => handleVariableChange('dependent', idx, e.target.value)}
                  placeholder="เช่น อัตราการสูญเสียน้ำหนัก / ความแน่นเนื้อ"
                  className="flex-1 text-xs text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[40px]"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveVariable('dependent', idx)}
                  className="p-2 text-slate-400 hover:text-rose-600 min-h-[40px] min-w-[40px] flex items-center justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* 4.3 ตัวแปรควบคุม */}
        <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              🔒 ตัวแปรควบคุม (Controlled Variables)
            </span>
            <button
              type="button"
              onClick={() => handleAddVariable('controlled')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 min-h-[40px] px-2"
            >
              <Plus className="w-3 h-3" />
              <span>เพิ่ม</span>
            </button>
          </div>
          {proposal.variables.controlled.length === 0 ? (
            <p className="text-xs text-slate-400 italic">ยังไม่มีตัวแปรควบคุม</p>
          ) : (
            proposal.variables.controlled.map((val, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={val}
                  onChange={(e) => handleVariableChange('controlled', idx, e.target.value)}
                  placeholder="เช่น อุณหภูมิการเก็บรักษา / ระยะเวลา"
                  className="flex-1 text-xs text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[40px]"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveVariable('controlled', idx)}
                  className="p-2 text-slate-400 hover:text-rose-600 min-h-[40px] min-w-[40px] flex items-center justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 5. วิธีทำ / ขั้นตอนดำเนินงาน (methodology) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2 font-prompt">
            <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-extrabold">
              5
            </span>
            <span>วิธีดำเนินการ / ขั้นตอนการทดลอง (Methodology)</span>
          </h3>
          <span className="text-[11px] text-slate-400">
            {proposal.methodology.length} ตัวอักษร
          </span>
        </div>
        <textarea
          rows={6}
          value={proposal.methodology}
          onChange={(e) => handleMethodologyChange(e.target.value)}
          placeholder="ระบุขั้นตอนดำเนินการเป็นลำดับ เช่น 1. การเตรียมสารสกัด 2. การสร้างชุดทดสอบ 3. การเก็บข้อมูล..."
          className="w-full text-xs sm:text-sm text-slate-800 p-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed font-mono text-[13px]"
        />
      </div>

      {/* Bottom Action Bar */}
      <div className="sticky bottom-20 z-10 p-3 bg-white/95 backdrop-blur-md rounded-2xl border border-indigo-100 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 animate-in fade-in">
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
            className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition min-h-[44px] ${
              isQuotaExhausted
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title={
              isQuotaExhausted
                ? quotaStatus?.messageTh
                : 'สร้างข้อเสนอใหม่จากคำตอบสัมภาษณ์และไอเดีย (ใช้โควตา 1 ครั้ง)'
            }
          >
            <RefreshCw className="w-4 h-4" />
            <span>สร้างใหม่จากคำตอบสัมภาษณ์</span>
          </button>

          <button
            type="button"
            onClick={handleSaveClick}
            disabled={isSaving}
            className="flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100 transition min-h-[44px]"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}</span>
          </button>
        </div>
      </div>

      <OptionalLoginOffer />
      {/* Reassemble Confirmation Modal */}
      {showReassembleConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1.5 font-prompt">
              สร้างข้อเสนอใหม่จากคำตอบเดิม?
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              การสร้างใหม่จะนำข้อมูลจากคำตอบสัมภาษณ์และไอเดียมาจัดเรียงใหม่ และจะใช้โควตาสร้างข้อเสนอ 1
              ครั้ง (เหลือ {quotaStatus?.remaining ?? 2} ครั้งในวันนี้)
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReassembleConfirm(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition min-h-[40px]"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReassembleConfirm(false);
                  onReassemble();
                }}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-sm transition min-h-[40px]"
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
