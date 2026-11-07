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
      <div className="bg-surface border border-accent/30 rounded-2xl p-3 shadow-e1 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-accent-tint border border-accent/30 flex items-center justify-center text-accent-text shrink-0">
            <FolderKanban className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-caption font-medium text-ink-3 uppercase tracking-wide">
              โครงงานปัจจุบัน
            </div>
            <div className="font-bold text-ink text-callout truncate">
              {activeProject?.title || 'ยังไม่มีโครงงาน (สร้างโครงงานแรก)'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 px-3 py-2 text-caption font-semibold text-accent-text bg-accent-tint hover:bg-accent-tint rounded-xl transition min-h-[40px]"
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
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent text-white hover:bg-accent-press transition shadow-e1"
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
            className="fixed inset-0 z-40 bg-ink backdrop-blur-xs md:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 md:absolute md:inset-auto md:top-full md:left-0 md:right-0 md:mt-2 bg-surface rounded-t-3xl md:rounded-2xl border border-separator shadow-e3 max-h-[80vh] md:max-h-96 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-separator flex items-center justify-between bg-surface-2">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-accent-text" />
                <h3 className="font-bold text-ink text-callout">
                  พื้นที่ทำงานโครงงาน (Multi-Project Workspace)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-3 hover:text-ink-2 hover:bg-surface-2 min-h-[40px] min-w-[40px]"
                aria-label="ปิดหน้าต่างสลับโครงงาน"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Project List */}
            <div className="p-3 overflow-y-auto space-y-2 flex-1">
              {projects.length === 0 ? (
                <div className="text-center py-6 px-4">
                  <p className="text-callout text-ink-3 mb-3">ยังไม่มีโครงงานในระบบ</p>
                  <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-caption font-semibold hover:bg-accent-press transition min-h-[40px]"
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
                          ? 'bg-accent-tint border-accent/30 ring-1 ring-accent'
                          : 'bg-surface border-separator hover:border-control'
                      }`}
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-caption rounded-lg border border-accent/30 focus:outline-none focus:ring-2 focus:ring-accent font-medium"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(project.id);
                              if (e.key === 'Escape') setEditingProjectId(null);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRename(project.id)}
                            className="p-2 text-good hover:bg-good-tint rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center"
                            title="บันทึกชื่อ"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingProjectId(null)}
                            className="p-2 text-ink-3 hover:bg-surface-2 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center"
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
                                  ? 'bg-accent border-accent'
                                  : 'border-control bg-surface'
                              }`}
                            >
                              {isActive && <div className="w-1.5 h-1.5 rounded-full bg-surface" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-caption font-bold text-ink truncate">
                                {project.title}
                              </div>
                              <div className="text-caption text-ink-3">
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
                              className="p-2 text-ink-3 hover:text-ink-2 hover:bg-surface-2 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center"
                              title="เปลี่ยนชื่อ"
                              aria-label={`เปลี่ยนชื่อ ${project.title}`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(project.id)}
                              className="p-2 text-risk hover:text-risk hover:bg-risk-tint rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center"
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
            <div className="p-3 border-t border-separator bg-surface-2 flex justify-between items-center">
              <button
                type="button"
                onClick={handleOpenCreate}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-accent text-white font-bold text-caption hover:bg-accent-press transition min-h-[40px]"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink backdrop-blur-xs">
          <div className="bg-surface rounded-3xl border border-separator p-6 max-w-md w-full shadow-e3 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-separator mb-4">
              <div className="flex items-center gap-2 text-accent-text">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-bold text-ink text-base">สร้างโครงงานใหม่</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="text-ink-3 hover:text-ink-2 p-1 min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCreate} className="space-y-4">
              <div>
                <label className="block text-caption font-semibold text-ink-2 mb-1.5">
                  ชื่อโครงงาน (Project Title)
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="เช่น การพัฒนาสารเคลือบชีวภาพจากเปลือกส้มโอ..."
                  className="w-full px-3.5 py-2.5 text-callout rounded-xl border border-separator focus:outline-none focus:ring-2 focus:ring-accent font-medium"
                  required
                  autoFocus
                />
              </div>

              {ideas.length > 0 && (
                <div>
                  <label className="block text-caption font-semibold text-ink-2 mb-1.5">
                    เชื่อมต่อจากไอเดียที่มีอยู่ (ไม่บังคับ)
                  </label>
                  <select
                    value={selectedIdeaId}
                    onChange={(e) => setSelectedIdeaId(e.target.value)}
                    className="w-full px-3.5 py-2 text-caption rounded-xl border border-separator focus:outline-none focus:ring-2 focus:ring-accent bg-surface font-medium min-h-[40px]"
                  >
                    <option value="">-- เริ่มต้นเป็นโครงงานว่าง --</option>
                    {ideas.map((idea) => (
                      <option key={idea.id} value={idea.id}>
                        {idea.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2.5 rounded-xl text-caption font-semibold text-ink-2 hover:bg-surface-2 transition min-h-[40px]"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-accent text-white text-caption font-bold hover:bg-accent-press shadow-e1 transition min-h-[40px]"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink backdrop-blur-xs">
          <div className="bg-surface rounded-3xl border border-separator p-6 max-w-sm w-full shadow-e3 animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-2xl bg-risk-tint text-risk flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-ink text-base mb-1.5">ยืนยันการลบโครงงาน?</h3>
            <p className="text-caption text-ink-2 mb-4 leading-relaxed">
              โครงงานนี้และเอกสาร Proposal / แผนงานจะถูกลบออกจากพื้นที่ทำงานในเบราว์เซอร์นี้
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2.5 rounded-xl text-caption font-semibold text-ink-2 hover:bg-surface-2 transition min-h-[40px]"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteProject(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-risk text-white text-caption font-bold hover:bg-risk shadow-e1 transition min-h-[40px]"
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
