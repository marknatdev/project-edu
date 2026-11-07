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
  /** True when the stored plan no longer matches the one this editor loaded. */
  changedElsewhere?: () => boolean;
}

export function WeeklyPlanEditor({
  plan: initialPlan,
  methodology = '',
  isSaving = false,
  onSave,
  changedElsewhere,
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

  React.useEffect(() => {
    const preserve = (event: Event) => {
      // Incomplete modal fields are not yet a valid milestone. Ask the learner
      // to finish/save or cancel instead of silently discarding them on OAuth.
      if (editingIndex !== null || showAddModal) { event.preventDefault(); return; }
      // Unedited: nothing to flush (a stale snapshot would overwrite newer saves from other tabs).
      if (JSON.stringify(plan) === JSON.stringify(initialPlan)) return;
      // Edited but the stored copy changed since load: veto so the learner decides.
      if (changedElsewhere?.()) { event.preventDefault(); return; }
      try { onSave(plan); } catch { event.preventDefault(); }
    };
    window.addEventListener('edtech:before-account-navigation', preserve);
    return () => window.removeEventListener('edtech:before-account-navigation', preserve);
  }, [plan, initialPlan, onSave, changedElsewhere, editingIndex, showAddModal]);

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
      <div className="bg-surface rounded-3xl border border-accent/30 p-5 sm:p-6 shadow-e1 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-accent-text mb-1">
              <Calendar className="w-5 h-5" />
              <span className="text-caption font-bold uppercase tracking-wide">
                ปฏิทินและแผนงานรายสัปดาห์
              </span>
            </div>
            <h2 className="text-headline sm:text-headline font-bold text-ink flex items-center gap-2">
              <span>แผนงาน {plan.totalWeeks} สัปดาห์</span>
              {isSaving && (
                <span className="text-caption text-accent-text font-semibold animate-pulse">
                  (กำลังบันทึก...)
                </span>
              )}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowRegenerateConfirm(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-2 hover:bg-separator text-ink-2 text-caption font-semibold transition min-h-11"
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
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent hover:bg-accent-press text-white text-caption font-semibold shadow-e1 transition min-h-11"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มขั้นตอน</span>
            </button>
          </div>
        </div>

        {/* Target Deadline Badge */}
        <div className="flex items-center gap-2 text-caption text-ink-2 bg-surface-2 p-2.5 rounded-xl border border-separator">
          <Clock className="w-4 h-4 text-accent-text shrink-0" />
          <span>
            เป้าหมายส่งงานโดยประมาณ: <b className="text-ink">{formattedDeadline}</b>
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-caption">
            <span className="font-semibold text-ink-2">ความคืบหน้างาน</span>
            <span className="font-bold text-accent-text font-mono">
              {progress.completedCount} / {progress.totalCount} งาน ({progress.percentage}%)
            </span>
          </div>
          <div className="h-3 w-full bg-surface-2 rounded-full overflow-hidden border border-separator">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Milestones Checklist */}
      <div className="space-y-3">
        {plan.milestones.length === 0 ? (
          <div className="bg-surface rounded-3xl border border-separator p-8 text-center space-y-3">
            <p className="text-callout text-ink-3">ยังไม่มีรายการขั้นตอนในแผนงาน</p>
            <button
              type="button"
              onClick={() => setShowRegenerateConfirm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-caption font-bold hover:bg-accent-press transition min-h-11"
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
                className={`p-4 sm:p-5 rounded-3xl border transition shadow-e1 ${
                  milestone.completed
                    ? 'bg-good-tint border-good/30'
                    : 'bg-surface border-separator hover:border-control'
                }`}
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-caption font-bold text-ink-3 mb-1">
                        ชื่อขั้นตอน
                      </label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full text-caption sm:text-callout font-bold text-ink px-3 py-2 rounded-xl border border-accent/30 focus:outline-none focus:ring-2 focus:ring-accent min-h-11"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-caption font-bold text-ink-3 mb-1">
                        คำอธิบายรายละเอียด
                      </label>
                      <textarea
                        rows={2}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full text-caption text-ink px-3 py-2 rounded-xl border border-separator focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-caption font-bold text-ink-3 mb-1">
                        สิ่งที่จะส่งมอบ (Deliverable)
                      </label>
                      <input
                        type="text"
                        value={editDeliverable}
                        onChange={(e) => setEditDeliverable(e.target.value)}
                        className="w-full text-caption text-ink px-3 py-2 rounded-xl border border-separator focus:outline-none focus:ring-2 focus:ring-accent min-h-11"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingIndex(null)}
                        className="px-3 py-2 rounded-xl text-caption font-semibold text-ink-2 hover:bg-surface-2 min-h-11"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(idx)}
                        className="px-4 py-2 rounded-xl bg-accent text-white text-caption font-bold hover:bg-accent-press min-h-11"
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
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition min-h-11 min-w-[40px] ${
                        milestone.completed
                          ? 'bg-good text-white shadow-e1'
                          : 'bg-surface-2 border border-control text-transparent hover:border-accent/30'
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
                          className={`text-caption sm:text-callout font-bold  transition ${
                            milestone.completed
                              ? 'line-through text-ink-3'
                              : 'text-ink'
                          }`}
                        >
                          {milestone.title}
                        </h4>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(idx, milestone)}
                            className="p-2 text-ink-3 hover:text-accent-text rounded-lg min-h-11 min-w-[40px] flex items-center justify-center"
                            title="แก้ไขขั้นตอน"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemove(idx)}
                            className="p-2 text-ink-3 hover:text-risk rounded-lg min-h-11 min-w-[40px] flex items-center justify-center"
                            title="ลบขั้นตอนนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {milestone.description && (
                        <p className="text-caption text-ink-2 mt-1 leading-relaxed">
                          {milestone.description}
                        </p>
                      )}

                      {milestone.deliverable && (
                        <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface-2 border border-separator text-caption text-ink-2">
                          <Target className="w-3.5 h-3.5 text-accent-text shrink-0" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
          <div className="bg-surface rounded-3xl border border-separator p-6 max-w-md w-full shadow-e3 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-separator mb-4">
              <h3 className="font-bold text-ink text-body">
                เพิ่มขั้นตอนในแผนงาน
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-ink-3 hover:text-ink-2 min-h-11 min-w-[40px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMilestone} className="space-y-4">
              <div>
                <label className="block text-caption font-semibold text-ink-2 mb-1">
                  สัปดาห์ที่
                </label>
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={newWeek}
                  onChange={(e) => setNewWeek(parseInt(e.target.value) || 1)}
                  className="w-24 px-3 py-2 text-caption rounded-xl border border-separator focus:outline-none focus:ring-2 focus:ring-accent min-h-11"
                  required
                />
              </div>

              <div>
                <label className="block text-caption font-semibold text-ink-2 mb-1">
                  หัวข้อขั้นตอน
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="เช่น สัปดาห์ 5: วิเคราะห์ผลและทำซ้ำ"
                  className="w-full px-3 py-2 text-caption rounded-xl border border-separator focus:outline-none focus:ring-2 focus:ring-accent min-h-11"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-caption font-semibold text-ink-2 mb-1">
                  คำอธิบาย
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="รายละเอียดสิ่งที่ทีมต้องทำ..."
                  className="w-full px-3 py-2 text-caption rounded-xl border border-separator focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-caption font-semibold text-ink-2 mb-1">
                  สิ่งที่จะส่งมอบ (Deliverable)
                </label>
                <input
                  type="text"
                  value={newDeliverable}
                  onChange={(e) => setNewDeliverable(e.target.value)}
                  placeholder="เช่น ตารางบันทึกค่าสถิติ n=3"
                  className="w-full px-3 py-2 text-caption rounded-xl border border-separator focus:outline-none focus:ring-2 focus:ring-accent min-h-11"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-caption font-semibold text-ink-2 hover:bg-surface-2 min-h-11"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-accent text-white text-caption font-bold hover:bg-accent-press shadow-e1 min-h-11"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
          <div className="bg-surface rounded-3xl border border-separator p-6 max-w-sm w-full shadow-e3 animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-2xl bg-accent-tint text-accent-text flex items-center justify-center mb-3">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-ink text-body mb-1.5">
              ปรับปรุงแผนงานตามสัปดาห์
            </h3>
            <p className="text-caption text-ink-2 mb-4 leading-relaxed">
              ระบบจะจัดหมวดหมู่ขั้นตอนตามกระบวนการวิทยาศาสตร์ 4 ระยะ โดยกระจายตามจำนวนสัปดาห์ที่คุณระบุ
            </p>

            <div className="mb-4">
              <label className="block text-caption font-bold text-ink-2 mb-1.5">
                จำนวนสัปดาห์ที่มี (1 - 52 สัปดาห์)
              </label>
              <input
                type="number"
                min={1}
                max={52}
                value={targetWeeks}
                onChange={(e) => setTargetWeeks(parseInt(e.target.value) || 1)}
                className="w-full px-3.5 py-2.5 text-callout rounded-xl border border-separator focus:outline-none focus:ring-2 focus:ring-accent font-bold min-h-[44px]"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRegenerateConfirm(false)}
                className="px-4 py-2.5 rounded-xl text-caption font-semibold text-ink-2 hover:bg-surface-2 min-h-11"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleRegenerate}
                className="px-5 py-2.5 rounded-xl bg-accent text-white text-caption font-bold hover:bg-accent-press shadow-e1 min-h-11"
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
