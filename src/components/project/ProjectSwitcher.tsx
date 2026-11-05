'use client';

import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  ChevronDown,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { Project, Idea } from '@/types/domain';

interface ProjectSwitcherProps {
  projects: Project[];
  activeProject: Project | null;
  ideas?: Idea[];
  onSelectProject: (projectId: string) => void;
  onCreateProject: (title: string, ideaId?: string) => void;
  onRenameProject: (projectId: string, newTitle: string) => void;
  onDeleteProject: (projectId: string) => void;
}

export function ProjectSwitcher({
  projects,
  activeProject,
  ideas = [],
  onSelectProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
}: ProjectSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedIdeaId, setSelectedIdeaId] = useState<string>('');

  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setNewTitle(`โครงงานที่ ${projects.length + 1}`);
    setSelectedIdeaId(ideas[0]?.id || '');
    setShowNewModal(true);
  };

  const handleConfirmCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTitle.trim();
    if (!clean) return;
    onCreateProject(clean, selectedIdeaId || undefined);
    setShowNewModal(false);
    setNewTitle('');
    setIsOpen(false);
  };

  const handleStartRename = (project: Project) => {
    setEditingProjectId(project.id);
    setEditingTitle(project.title);
  };

  const handleSaveRename = (projectId: string) => {
    const clean = editingTitle.trim();
    if (clean) {
      onRenameProject(projectId, clean);
    }
    setEditingProjectId(null);
  };

  return (
    <div className="relative w-full">
      {/* Current Active Project Bar / Trigger */}
      <div className="bg-white border border-indigo-100 rounded-2xl p-3 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <FolderKanban className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
              โครงงานปัจจุบัน
            </div>
            <div className="font-bold text-slate-800 text-sm truncate font-prompt">
              {activeProject?.title || 'ยังไม่มีโครงงาน (สร้างโครงงานแรก)'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition min-h-[40px]"
            aria-expanded={isOpen}
            aria-label="สลับหรือจัดการโครงงาน"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>สลับโครงงาน ({projects.length})</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs"
            aria-label="สร้างโครงงานใหม่"
            title="สร้างโครงงานใหม่"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Dropdown / Drawer for switching and managing projects */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 md:absolute md:inset-auto md:top-full md:left-0 md:right-0 md:mt-2 bg-white rounded-t-3xl md:rounded-2xl border border-slate-200/80 shadow-xl max-h-[80vh] md:max-h-96 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-sm font-prompt">
                  พื้นที่ทำงานโครงงาน (Multi-Project Workspace)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 min-h-[40px] min-w-[40px]"
                aria-label="ปิดหน้าต่างสลับโครงงาน"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Project List */}
            <div className="p-3 overflow-y-auto space-y-2 flex-1">
              {projects.length === 0 ? (
                <div className="text-center py-6 px-4">
                  <p className="text-sm text-slate-500 mb-3">ยังไม่มีโครงงานในระบบ</p>
                  <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition min-h-[40px]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>สร้างโครงงานแรก</span>
                  </button>
                </div>
              ) : (
                projects.map((project) => {
                  const isActive = project.id === activeProject?.id;
                  const isEditing = editingProjectId === project.id;

                  return (
                    <div
                      key={project.id}
                      className={`p-3 rounded-xl border transition ${
                        isActive
                          ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-200'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(project.id);
                              if (e.key === 'Escape') setEditingProjectId(null);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRename(project.id)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center"
                            title="บันทึกชื่อ"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingProjectId(null)}
                            className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center"
                            title="ยกเลิก"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectProject(project.id);
                              setIsOpen(false);
                            }}
                            className="flex items-center gap-2.5 min-w-0 flex-1 text-left min-h-[40px]"
                          >
                            <div
                              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
                                isActive
                                  ? 'bg-indigo-600 border-indigo-600'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-slate-800 truncate font-prompt">
                                {project.title}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {project.plan?.totalWeeks || 8} สัปดาห์ •{' '}
                                {project.status === 'completed'
                                  ? 'เสร็จสมบูรณ์'
                                  : 'กำลังพัฒนา'}
                              </div>
                            </div>
                          </button>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartRename(project)}
                              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center"
                              title="เปลี่ยนชื่อ"
                              aria-label={`เปลี่ยนชื่อ ${project.title}`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(project.id)}
                              className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center"
                              title="ลบโครงงาน"
                              aria-label={`ลบโครงงาน ${project.title}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/70 flex justify-between items-center">
              <button
                type="button"
                onClick={handleOpenCreate}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition min-h-[40px]"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มโครงงานใหม่ (+ Project)</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Create New Project Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-indigo-600">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-bold text-slate-800 text-base font-prompt">สร้างโครงงานใหม่</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ชื่อโครงงาน (Project Title)
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="เช่น การพัฒนาสารเคลือบชีวภาพจากเปลือกส้มโอ..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  required
                  autoFocus
                />
              </div>

              {ideas.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    เชื่อมต่อจากไอเดียที่มีอยู่ (ไม่บังคับ)
                  </label>
                  <select
                    value={selectedIdeaId}
                    onChange={(e) => setSelectedIdeaId(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium min-h-[40px]"
                  >
                    <option value="">-- เริ่มต้นเป็นโครงงานว่าง --</option>
                    {ideas.map((idea) => (
                      <option key={idea.id} value={idea.id}>
                        💡 {idea.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition min-h-[40px]"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-sm transition min-h-[40px]"
                >
                  ยืนยันสร้างโครงงาน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1.5 font-prompt">ยืนยันการลบโครงงาน?</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              โครงงานนี้และเอกสาร Proposal / แผนงานจะถูกลบออกจากพื้นที่ทำงานในเบราว์เซอร์นี้
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition min-h-[40px]"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteProject(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-sm transition min-h-[40px]"
              >
                ลบโครงงาน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
