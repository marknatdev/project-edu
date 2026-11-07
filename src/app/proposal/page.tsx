'use client';

import React, { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
  getProjects,
  getProject,
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
  getDefaultStorage,
  getWipeGeneration,
} from '@/lib/storage/store';
import { useWipeInvalidation } from '@/lib/storage/use-wipe-invalidation';
import type { Project, Proposal, Plan, Idea, Interview } from '@/types/domain';
import { assembleProposal } from '@/lib/proposal/assemble';
import { generateWeeklyPlan } from '@/lib/plan/weekly-plan';
import { checkProposalQuota, consumeProposalQuota, type ProposalQuotaStatus } from '@/lib/proposal/quota-client';
import { ProjectSwitcher } from '@/components/project/ProjectSwitcher';
import { ProjectToolLinks } from '@/components/project/ProjectToolLinks';
import { ProposalEditor } from '@/components/proposal/ProposalEditor';
import { WeeklyPlanEditor } from '@/components/proposal/WeeklyPlanEditor';
import { ProjectDeliverables } from '@/components/presentation/ProjectDeliverables';
import '@/components/export/document.css';

type ActiveTab = 'proposal' | 'plan' | 'tcas' | 'pitch' | 'advisor';
const documentTabs: { id: ActiveTab; label: string }[] = [
  { id: 'proposal', label: '📑 Proposal' }, { id: 'plan', label: '🗓️ Plan รายสัปดาห์' },
  { id: 'tcas', label: '🎓 พอร์ต TCAS' }, { id: 'pitch', label: '🎙️ Abstract & Pitch' }, { id: 'advisor', label: '✍️ ครูตรวจ' },
];

function ProposalContent() {
  const searchParams = useSearchParams();
  const urlProjectId = searchParams.get('projectId');
  const urlIdeaId = searchParams.get('ideaId');
  const urlTab = searchParams.get('tab');

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('proposal');
  useEffect(() => {
    const selectTab = () => setActiveTab(window.location.hash.startsWith('#advisor=') ? 'advisor' : documentTabs.find(t => t.id === urlTab)?.id ?? 'proposal');
    selectTab(); window.addEventListener('hashchange', selectTab);
    return () => window.removeEventListener('hashchange', selectTab);
  }, [urlTab]);

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProj] = useState<Project | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [interview, setInterview] = useState<Interview | null>(null);

  const [quotaStatus, setQuotaStatus] = useState<ProposalQuotaStatus | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const initialQuota = useRef<Promise<ProposalQuotaStatus> | null>(null);
  const pendingCreation = useRef(new Map<string, Promise<ProposalQuotaStatus>>());
  const [wiped] = useWipeInvalidation();

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
    // Captured before any await: later writes are refused if a wipe happens meanwhile.
    const storage = getDefaultStorage();
    const generation = getWipeGeneration(storage);
    const storedProjects = getProjects();
    const storedIdeas = getIdeas();
    const storedInterview = getInterview();
    const learner = getLearner();

    setProjects(storedProjects);
    setActiveProj(getActiveProject());
    setIdeas(storedIdeas);
    setInterview(storedInterview);

    // Initial Quota check
    const quotaCheck = initialQuota.current ??= checkProposalQuota();
    quotaCheck.then((status) => {
      setQuotaStatus(status);
    });

    // 1. If urlProjectId is provided, try to switch to it
    if (urlProjectId && storedProjects.some((p) => p.id === urlProjectId)) {
      setActiveProjectId(urlProjectId);
      refreshProjects();
      return;
    }

    // 2. If urlIdeaId is provided, check if a project exists for it or create one
    const initialIdeaId = urlIdeaId ?? (!storedProjects.length ? storedIdeas[0]?.id : undefined);
    if (initialIdeaId) {
      const existingProjectForIdea = storedProjects.find((p) => p.ideaId === initialIdeaId);
      if (existingProjectForIdea) {
        setActiveProjectId(existingProjectForIdea.id);
        refreshProjects();
        return;
      }

      // Create new project for this idea
      const idea = getIdea(initialIdeaId);
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

        // Wait for the first cookie before consuming, then honor the result.
        // Re-running the mount effect reuses this action rather than charging
        // again. A failed/empty allowance still permits a blank manual draft.
        if (!pendingCreation.current.has(idea.id)) {
          const requestId = crypto.randomUUID();
          pendingCreation.current.set(idea.id, quotaCheck.then(() => consumeProposalQuota(requestId)));
        }
        let live = true;
        pendingCreation.current.get(idea.id)!.then((status) => {
          if (!live) return;
          setQuotaStatus(status);
          if (status.ownerChanged) return;
          const existing = getProjects(storage).find(p => p.ideaId === idea.id);
          const newProj = existing ?? createProject({ title: idea.title, ideaId: idea.id, learnerId: idea.learnerId,
            proposal: status.allowed ? assembledProposal : undefined, plan: status.allowed ? weeklyPlan : undefined }, storage, generation);
          if (newProj) setActiveProjectId(newProj.id, storage, generation);
          refreshProjects();
        });
        return () => { live = false; };
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

  const handleCreateProject = async (title: string, ideaId?: string) => {
    const storage = getDefaultStorage();
    const generation = getWipeGeneration(storage);
    const linkedIdea = ideaId ? getIdea(ideaId, storage) : null;
    const learner = getLearner(storage);
    // Blank projects/manual editing are free. Source-driven assembly uses the
    // same verified allowance as reassembly and never a caller-selected ID.
    const status = linkedIdea ? await consumeProposalQuota() : undefined;
    if (status) setQuotaStatus(status);
    if (status?.ownerChanged) return;

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
      proposal: status?.allowed ? proposal : undefined,
      plan: status?.allowed ? plan : undefined,
    }, storage, generation);

    if (newProj) setActiveProjectId(newProj.id, storage, generation);
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
    const storage = getDefaultStorage();
    const generation = getWipeGeneration(storage);
    // Consume proposal quota
    const status = await consumeProposalQuota();
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

    updateProjectProposal(activeProject.id, reassembled, storage, generation);
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

  if (wiped) return <p role="status" className="max-w-2xl mx-auto px-4 py-12 text-center text-sm">ลบข้อมูลแล้ว กรุณาโหลดหน้าใหม่ก่อนเริ่มโครงงาน</p>;

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
          Proposal, พอร์ต & ครูอนุมัติ
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
          จัดเอกสารจากคำตอบจริงของผู้เรียน: Proposal + Plan • พอร์ต TCAS • Abstract & Pitch • ส่งครูตรวจ
        </p>
      </div>

      {/* Multi-Project Workspace Switcher */}
      <ProjectToolLinks projectId={activeProject?.id} />
      <ProjectSwitcher
        projects={projects}
        activeProject={activeProject}
        ideas={ideas}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        onRenameProject={handleRenameProject}
        onDeleteProject={handleDeleteProject}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 p-1.5 bg-slate-100 rounded-2xl gap-1" aria-label="ประเภทเอกสาร">
        {documentTabs.map(tab => <button key={tab.id} type="button" aria-pressed={activeTab === tab.id}
          onClick={() => setActiveTab(tab.id)} className={`min-h-11 rounded-xl p-3 text-xs sm:text-sm font-bold transition ${activeTab === tab.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-white/60'}`}>{tab.label}</button>)}
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
            changedElsewhere={() => JSON.stringify(getProject(activeProject.id)?.proposal) !== JSON.stringify(activeProject.proposal)}
          />
        ) : activeTab === 'plan' ? (
          <WeeklyPlanEditor
            plan={activeProject.plan}
            methodology={activeProject.proposal?.methodology}
            isSaving={isSaving}
            onSave={handleSavePlan}
            changedElsewhere={() => JSON.stringify(getProject(activeProject.id)?.plan) !== JSON.stringify(activeProject.plan)}
          />
        ) : null
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center space-y-3">
          <p className="text-sm text-slate-500">ยังไม่ได้เลือกโครงงาน</p>
          {quotaStatus?.ownerChanged && <p role="alert" className="text-sm text-amber-900">{quotaStatus.messageTh}</p>}
        </div>
      )}
      {activeProject && <ProjectDeliverables key={`${activeProject.id}:${activeProject.updatedAt}`} project={activeProject} view={activeTab} />}
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
