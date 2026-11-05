'use client';

import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Check,
  X,
  Target,
  Sparkles,
} from 'lucide-react';
import type { Plan, PlanMilestone } from '@/types/domain';
import {
  togglePlanMilestone,
  updatePlanMilestone,
  addPlanMilestone,
  removePlanMilestone,
  calculatePlanProgress,
  generateWeeklyPlan,
} from '@/lib/plan/weekly-plan';

interface WeeklyPlanEditorProps {
  plan: Plan;
  methodology?: string;
  isSaving?: boolean;
  onSave: (updatedPlan: Plan) => void;
}

export function WeeklyPlanEditor({
  plan: initialPlan,
  methodology = '',
  isSaving = false,
  onSave,
}: WeeklyPlanEditorProps) {
  const [plan, setPlan] = useState<Plan>(initialPlan);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDeliverable, setEditDeliverable] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDeliverable, setNewDeliverable] = useState('');
  const [newWeek, setNewWeek] = useState<number>(plan.totalWeeks + 1);

  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [targetWeeks, setTargetWeeks] = useState<number>(plan.totalWeeks || 8);

  React.useEffect(() => {
    setPlan(initialPlan);
    setTargetWeeks(initialPlan.totalWeeks || 8);
  }, [initialPlan]);

  const progress = calculatePlanProgress(plan);

  const handleToggle = (index: number) => {
    const updated = togglePlanMilestone(plan, index);
    setPlan(updated);
    onSave(updated);
  };

  const handleStartEdit = (index: number, m: PlanMilestone) => {
    setEditingIndex(index);
    setEditTitle(m.title);
    setEditDescription(m.description);
    setEditDeliverable(m.deliverable);
  };

  const handleSaveEdit = (index: number) => {
    const cleanTitle = editTitle.trim();
    if (!cleanTitle) return;

    const updated = updatePlanMilestone(plan, index, {
      title: cleanTitle,
      description: editDescription.trim(),
      deliverable: editDeliverable.trim(),
    });
    setPlan(updated);
    onSave(updated);
    setEditingIndex(null);
  };

  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTitle.trim();
    if (!clean) return;

    const updated = addPlanMilestone(plan, {
      week: newWeek,
      title: clean,
      description: newDescription.trim(),
      deliverable: newDeliverable.trim(),
      completed: false,
    });
    setPlan(updated);
    onSave(updated);
    setShowAddModal(false);
    setNewTitle('');
    setNewDescription('');
    setNewDeliverable('');
  };

  const handleRemove = (index: number) => {
    const updated = removePlanMilestone(plan, index);
    setPlan(updated);
    onSave(updated);
  };

  const handleRegenerate = () => {
    const generated = generateWeeklyPlan({
      totalWeeks: targetWeeks,
      methodology,
    });
    setPlan(generated);
    onSave(generated);
    setShowRegenerateConfirm(false);
  };

  const formattedDeadline = React.useMemo(() => {
    try {
      const d = new Date(plan.targetDeadline);
      return d.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'ตามกำหนด';
    }
  }, [plan.targetDeadline]);

  return (
    <div className="space-y-6">
      {/* Header Card: Progress & Deadline */}
      <div className="bg-white rounded-3xl border border-indigo-100 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <Calendar className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wide">
                ปฏิทินและแผนงานรายสัปดาห์
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 font-prompt flex items-center gap-2">
              <span>แผนงาน {plan.totalWeeks} สัปดาห์</span>
              {isSaving && (
                <span className="text-[11px] text-indigo-600 font-semibold animate-pulse">
                  (กำลังบันทึก...)
                </span>
              )}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowRegenerateConfirm(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition min-h-[40px]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>ปรับสัปดาห์ / สร้างแผนใหม่</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setNewWeek(plan.milestones.length + 1);
                setShowAddModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition min-h-[40px]"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มขั้นตอน</span>
            </button>
          </div>
        </div>

        {/* Target Deadline Badge */}
        <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
          <span>
            เป้าหมายส่งงานโดยประมาณ: <b className="text-slate-800">{formattedDeadline}</b>
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">ความคืบหน้างาน</span>
            <span className="font-bold text-indigo-700 font-mono">
              {progress.completedCount} / {progress.totalCount} งาน ({progress.percentage}%)
            </span>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Milestones Checklist */}
      <div className="space-y-3">
        {plan.milestones.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center space-y-3">
            <p className="text-sm text-slate-500">ยังไม่มีรายการขั้นตอนในแผนงาน</p>
            <button
              type="button"
              onClick={() => setShowRegenerateConfirm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition min-h-[40px]"
            >
              <Sparkles className="w-4 h-4" />
              <span>สร้างแผนงานอัตโนมัติตามสัปดาห์</span>
            </button>
          </div>
        ) : (
          plan.milestones.map((milestone, idx) => {
            const isEditing = editingIndex === idx;

            return (
              <div
                key={idx}
                className={`p-4 sm:p-5 rounded-3xl border transition shadow-xs ${
                  milestone.completed
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-white border-slate-200/80 hover:border-slate-300'
                }`}
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        ชื่อขั้นตอน
                      </label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full text-xs sm:text-sm font-bold text-slate-800 px-3 py-2 rounded-xl border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[40px]"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        คำอธิบายรายละเอียด
                      </label>
                      <textarea
                        rows={2}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full text-xs text-slate-800 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        สิ่งที่จะส่งมอบ (Deliverable)
                      </label>
                      <input
                        type="text"
                        value={editDeliverable}
                        onChange={(e) => setEditDeliverable(e.target.value)}
                        className="w-full text-xs text-slate-800 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[40px]"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingIndex(null)}
                        className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 min-h-[40px]"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(idx)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 min-h-[40px]"
                      >
                        บันทึก
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3.5">
                    {/* Checkbox Target */}
                    <button
                      type="button"
                      onClick={() => handleToggle(idx)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition min-h-[40px] min-w-[40px] ${
                        milestone.completed
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 border border-slate-300 text-transparent hover:border-indigo-400'
                      }`}
                      aria-label={
                        milestone.completed
                          ? `ทำเครื่องหมายว่ายังไม่เสร็จ: ${milestone.title}`
                          : `ทำเครื่องหมายว่าเสร็จแล้ว: ${milestone.title}`
                      }
                    >
                      <Check className="w-5 h-5 stroke-[2.5]" />
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4
                          className={`text-xs sm:text-sm font-bold font-prompt transition ${
                            milestone.completed
                              ? 'line-through text-slate-400'
                              : 'text-slate-800'
                          }`}
                        >
                          {milestone.title}
                        </h4>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(idx, milestone)}
                            className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center"
                            title="แก้ไขขั้นตอน"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemove(idx)}
                            className="p-2 text-slate-400 hover:text-rose-600 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center"
                            title="ลบขั้นตอนนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {milestone.description && (
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {milestone.description}
                        </p>
                      )}

                      {milestone.deliverable && (
                        <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-700">
                          <Target className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>
                            <b>ส่งมอบ:</b> {milestone.deliverable}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Milestone Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-800 text-base font-prompt">
                เพิ่มขั้นตอนในแผนงาน
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMilestone} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  สัปดาห์ที่
                </label>
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={newWeek}
                  onChange={(e) => setNewWeek(parseInt(e.target.value) || 1)}
                  className="w-24 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[40px]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หัวข้อขั้นตอน
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="เช่น สัปดาห์ 5: วิเคราะห์ผลและทำซ้ำ"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[40px]"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  คำอธิบาย
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="รายละเอียดสิ่งที่ทีมต้องทำ..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  สิ่งที่จะส่งมอบ (Deliverable)
                </label>
                <input
                  type="text"
                  value={newDeliverable}
                  onChange={(e) => setNewDeliverable(e.target.value)}
                  placeholder="เช่น ตารางบันทึกค่าสถิติ n=3"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[40px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 min-h-[40px]"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-sm min-h-[40px]"
                >
                  เพิ่มขั้นตอน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Regenerate Plan Modal */}
      {showRegenerateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1.5 font-prompt">
              ปรับปรุงแผนงานตามสัปดาห์
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              ระบบจะจัดหมวดหมู่ขั้นตอนตามกระบวนการวิทยาศาสตร์ 4 ระยะ โดยกระจายตามจำนวนสัปดาห์ที่คุณระบุ
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                จำนวนสัปดาห์ที่มี (1 - 52 สัปดาห์)
              </label>
              <input
                type="number"
                min={1}
                max={52}
                value={targetWeeks}
                onChange={(e) => setTargetWeeks(parseInt(e.target.value) || 1)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold min-h-[44px]"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRegenerateConfirm(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 min-h-[40px]"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleRegenerate}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-sm min-h-[40px]"
              >
                ยืนยันสร้างแผนใหม่
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
