'use client';

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Calendar,
  ArrowLeft,
} from 'lucide-react';
import {
  getProjects,
  getActiveProject,
  setActiveProjectId,
  createProject,
  renameProject,
  deleteProject,
  updateProjectProposal,
  updateProjectPlan,
  getIdeas,
  getInterview,
  getIdea,
  getLearner,
} from '@/lib/storage/store';
import type { Project, Proposal, Plan, Idea, Interview } from '@/types/domain';
import { assembleProposal } from '@/lib/proposal/assemble';
import { generateWeeklyPlan } from '@/lib/plan/weekly-plan';
import { checkProposalQuota, consumeProposalQuota, type ProposalQuotaStatus } from '@/lib/proposal/quota-client';
import { ProjectSwitcher } from '@/components/project/ProjectSwitcher';
import { ProposalEditor } from '@/components/proposal/ProposalEditor';
import { WeeklyPlanEditor } from '@/components/proposal/WeeklyPlanEditor';

type ActiveTab = 'proposal' | 'plan';

function ProposalContent() {
  const searchParams = useSearchParams();
  const urlProjectId = searchParams.get('projectId');
  const urlIdeaId = searchParams.get('ideaId');

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('proposal');

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProj] = useState<Project | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [interview, setInterview] = useState<Interview | null>(null);

  const [quotaStatus, setQuotaStatus] = useState<ProposalQuotaStatus | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  // Reload projects & active project from store
  const refreshProjects = useCallback(() => {
    const all = getProjects();
    setProjects(all);
    const active = getActiveProject();
    setActiveProj(active);
    const storedIdeas = getIdeas();
    setIdeas(storedIdeas);
    const storedInterview = getInterview();
    setInterview(storedInterview);
  }, []);

  // Initialize on mount
  useEffect(() => {
    setMounted(true);
    const storedProjects = getProjects();
    const storedIdeas = getIdeas();
    const storedInterview = getInterview();
    const learner = getLearner();

    setProjects(storedProjects);
    setIdeas(storedIdeas);
    setInterview(storedInterview);

    // Initial Quota check
    const anonId = learner?.id || 'guest-learner';
    checkProposalQuota(anonId).then((status) => {
      setQuotaStatus(status);
    });

    // 1. If urlProjectId is provided, try to switch to it
    if (urlProjectId && storedProjects.some((p) => p.id === urlProjectId)) {
      setActiveProjectId(urlProjectId);
      refreshProjects();
      return;
    }

    // 2. If urlIdeaId is provided, check if a project exists for it or create one
    if (urlIdeaId) {
      const existingProjectForIdea = storedProjects.find((p) => p.ideaId === urlIdeaId);
      if (existingProjectForIdea) {
        setActiveProjectId(existingProjectForIdea.id);
        refreshProjects();
        return;
      }

      // Create new project for this idea
      const idea = getIdea(urlIdeaId);
      if (idea) {
        const assembledProposal = assembleProposal({
          idea,
          interview: storedInterview,
          studentAnswers: {
            problemStatement: idea.description,
            independentVar: idea.variables?.independent,
            dependentVar: idea.variables?.dependent,
            controlledVar: idea.variables?.controlled,
          },
        });

        const weeklyPlan = generateWeeklyPlan({
          totalWeeks: storedInterview?.constraints?.timeWeeks ?? 8,
          methodology: assembledProposal.methodology,
        });

        const newProj = createProject({
          title: idea.title,
          ideaId: idea.id,
          learnerId: idea.learnerId,
          proposal: assembledProposal,
          plan: weeklyPlan,
        });

        // Consume proposal quota
        consumeProposalQuota(anonId).then((status) => {
          setQuotaStatus(status);
        });

        setActiveProjectId(newProj.id);
        refreshProjects();
        return;
      }
    }

    // 3. Fallback: if no active project, set first or create a default starter project
    const current = getActiveProject();
    if (!current && storedProjects.length > 0) {
      setActiveProjectId(storedProjects[0].id);
      refreshProjects();
    } else if (!current && storedProjects.length === 0) {
      // Create initial project from first idea if exists, or blank
      const firstIdea = storedIdeas[0];
      const initialProposal = assembleProposal({
        idea: firstIdea ?? null,
        interview: storedInterview,
        studentAnswers: firstIdea
          ? {
              problemStatement: firstIdea.description,
              independentVar: firstIdea.variables?.independent,
              dependentVar: firstIdea.variables?.dependent,
              controlledVar: firstIdea.variables?.controlled,
            }
          : undefined,
      });

      const initialPlan = generateWeeklyPlan({
        totalWeeks: storedInterview?.constraints?.timeWeeks ?? 8,
        methodology: initialProposal.methodology,
      });

      const starter = createProject({
        title: firstIdea?.title || 'โครงงานของฉัน',
        ideaId: firstIdea?.id,
        learnerId: firstIdea?.learnerId || learner?.id,
        proposal: initialProposal,
        plan: initialPlan,
      });

      setActiveProjectId(starter.id);
      refreshProjects();
    }
  }, [urlProjectId, urlIdeaId, refreshProjects]);

  // Project Switcher handlers
  const handleSelectProject = (projectId: string) => {
    setActiveProjectId(projectId);
    refreshProjects();
  };

  const handleCreateProject = (title: string, ideaId?: string) => {
    const linkedIdea = ideaId ? getIdea(ideaId) : null;
    const learner = getLearner();

    const proposal = assembleProposal({
      idea: linkedIdea,
      interview,
      studentAnswers: linkedIdea
        ? {
            problemStatement: linkedIdea.description,
            independentVar: linkedIdea.variables?.independent,
            dependentVar: linkedIdea.variables?.dependent,
            controlledVar: linkedIdea.variables?.controlled,
          }
        : undefined,
    });

    const plan = generateWeeklyPlan({
      totalWeeks: interview?.constraints?.timeWeeks ?? 8,
      methodology: proposal.methodology,
    });

    const newProj = createProject({
      title,
      ideaId,
      learnerId: learner?.id,
      proposal,
      plan,
    });

    setActiveProjectId(newProj.id);
    refreshProjects();
  };

  const handleRenameProject = (projectId: string, newTitle: string) => {
    renameProject(projectId, newTitle);
    refreshProjects();
  };

  const handleDeleteProject = (projectId: string) => {
    deleteProject(projectId);
    refreshProjects();
  };

  // Proposal Editor save & reassemble
  const handleSaveProposal = (updatedProposal: Proposal) => {
    if (!activeProject) return;
    setIsSaving(true);
    updateProjectProposal(activeProject.id, updatedProposal);
    refreshProjects();
    setTimeout(() => setIsSaving(false), 300);
  };

  const handleReassembleProposal = async () => {
    if (!activeProject) return;
    const learner = getLearner();
    const anonId = learner?.id || 'guest-learner';

    // Consume proposal quota
    const status = await consumeProposalQuota(anonId);
    setQuotaStatus(status);
    if (!status.allowed) return;

    const linkedIdea = activeProject.ideaId ? getIdea(activeProject.ideaId) : null;

    const reassembled = assembleProposal({
      idea: linkedIdea,
      interview,
      existingProposal: activeProject.proposal,
      preserveEdits: false, // Explicit re-assembly requested
      studentAnswers: linkedIdea
        ? {
            problemStatement: linkedIdea.description,
            independentVar: linkedIdea.variables?.independent,
            dependentVar: linkedIdea.variables?.dependent,
            controlledVar: linkedIdea.variables?.controlled,
          }
        : undefined,
    });

    updateProjectProposal(activeProject.id, reassembled);
    refreshProjects();
  };

  // Weekly Plan Editor save
  const handleSavePlan = (updatedPlan: Plan) => {
    if (!activeProject) return;
    setIsSaving(true);
    updateProjectPlan(activeProject.id, updatedPlan);
    refreshProjects();
    setTimeout(() => setIsSaving(false), 300);
  };

  if (!mounted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium font-prompt">
          กำลังโหลดพื้นที่ทำงานโครงงาน...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href={activeProject?.ideaId ? `/evaluation?ideaId=${activeProject.ideaId}` : '/idea'}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition min-h-[40px] px-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับไปหน้าประเมิน / ไอเดีย</span>
        </Link>

        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
          ม.ต้น & ม.ปลาย • Guest Mode
        </span>
      </div>

      {/* Page Title & Mission */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-prompt">
          ข้อเสนอโครงงาน & แผนงาน
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
          สร้าง Proposal 1 หน้าจากคำตอบจริงของผู้เรียน และบริหารจัดการแผนงานรายสัปดาห์
        </p>
      </div>

      {/* Multi-Project Workspace Switcher */}
      <ProjectSwitcher
        projects={projects}
        activeProject={activeProject}
        ideas={ideas}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        onRenameProject={handleRenameProject}
        onDeleteProject={handleDeleteProject}
      />

      {/* View Tabs: Proposal vs Weekly Plan */}
      <div className="flex items-center p-1.5 bg-slate-100 rounded-2xl gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('proposal')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition min-h-[44px] ${
            activeTab === 'proposal'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          role="tab"
          aria-selected={activeTab === 'proposal'}
        >
          <FileText className="w-4 h-4" />
          <span>📑 1-Page Proposal</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('plan')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition min-h-[44px] ${
            activeTab === 'plan'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          role="tab"
          aria-selected={activeTab === 'plan'}
        >
          <Calendar className="w-4 h-4" />
          <span>🗓️ แผนงานรายสัปดาห์</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeProject ? (
        activeTab === 'proposal' ? (
          <ProposalEditor
            proposal={activeProject.proposal}
            quotaStatus={quotaStatus}
            isSaving={isSaving}
            onSave={handleSaveProposal}
            onReassemble={handleReassembleProposal}
          />
        ) : (
          <WeeklyPlanEditor
            plan={activeProject.plan}
            methodology={activeProject.proposal?.methodology}
            isSaving={isSaving}
            onSave={handleSavePlan}
          />
        )
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center space-y-3">
          <p className="text-sm text-slate-500">ยังไม่ได้เลือกโครงงาน</p>
        </div>
      )}
    </div>
  );
}

export default function ProposalPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium font-prompt">
            กำลังโหลดข้อมูลข้อเสนอโครงงาน...
          </p>
        </div>
      }
    >
      <ProposalContent />
    </Suspense>
  );
}
