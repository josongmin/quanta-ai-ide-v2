import { useCallback, useEffect, useMemo, useState } from 'react';
import { GlassCard } from '@shared/ui';
import {
  FIXTURE_TARGETS,
  type ActionRecommendation,
  type InvestigationAnswer,
  type QuestionType,
  type UnknownTag,
} from '@entities/investigation';
import { useInvestigation } from '../model/InvestigationContext';
import { useStack } from '@features/inspect-target';
import { useJobs } from '../jobs';
import { useFixHandoff } from '../handoff';
import { buildFollowUps, type FollowUp } from '../followup';
import { PanelHeader } from './parts/PanelHeader';
import { PanelTabs } from './parts/PanelTabs';
import { PanelFooter } from './parts/PanelFooter';
import { OwnerBanner } from './parts/OwnerBanner';
import { EmptyBody } from './parts/EmptyBody';
import { AnswerBody } from './parts/AnswerBody';
import { NotebookBody } from './parts/NotebookBody';
import { usePanelKeyboardNav } from './lib/usePanelKeyboardNav';
import { usePlannerRunner } from './lib/usePlannerRunner';

type ViewMode = 'answer' | 'notebook';

const WIRED_ACTION_KINDS = new Set<ActionRecommendation['kind']>([
  'open_focus',
  'run_deep_scan',
  'create_fix_task',
  'assign_owner',
]);

export default function InvestigatePanel() {
  const {
    activeTarget,
    bundle,
    answer,
    status,
    questionType,
    panelOpen,
    pickedEvidenceId,
    notebook,
    activeNotebookId,
    start,
    regenerate,
    setQuestionType,
    clear,
    closePanel,
    pickEvidence,
    addQuestion,
    archiveQuestion,
  } = useInvestigation();
  const stack = useStack();
  const jobs = useJobs();
  const requestFixHandoff = useFixHandoff();

  const [mode, setMode] = useState<ViewMode>('answer');
  const [ownerBanner, setOwnerBanner] = useState<string | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);

  // Track mount for slide animation: keep mounted briefly after close so the
  // exit transition runs, then unmount. The setState during open-edge is
  // intentional — the alternative (deriving from prop) would skip the slide-
  // in transition because the element would render at its final position.
  const [mounted, setMounted] = useState(panelOpen);
  useEffect(() => {
    if (panelOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true);
      return;
    }
    const t = window.setTimeout(() => { setMounted(false); }, 220);
    return () => { window.clearTimeout(t); };
  }, [panelOpen]);

  const {
    plannerRunning,
    plannerSteps,
    plannerTrace,
    runPlanner: handleRunPlanner,
  } = usePlannerRunner({ activeTarget, bundle, questionType, panelOpen });

  const handleAction = useCallback((action: ActionRecommendation) => {
    if (action.kind === 'open_focus') {
      const folderPath = action.payload?.['folderPath'];
      const fileId = action.payload?.['fileId'];
      if (typeof folderPath === 'string') {
        stack.open({ kind: 'folder', path: folderPath });
        return;
      }
      if (typeof fileId === 'number') {
        stack.open({ kind: 'file', id: fileId });
        return;
      }
      console.warn('open_focus action missing payload:', action);
      return;
    }
    if (action.kind === 'run_deep_scan') {
      if (!activeTarget) return;
      const label = `Deep scan: ${activeTarget.label}`;
      jobs.enqueue('deep_scan', activeTarget, label);
      return;
    }
    if (action.kind === 'create_fix_task') {
      if (!activeTarget || !bundle) return;
      requestFixHandoff({
        target: activeTarget,
        evidence: bundle.evidence,
        ...(answer?.hypothesis ? { hypothesis: answer.hypothesis } : {}),
        conclusion: answer?.conclusion ?? '',
        triggeredAt: Date.now(),
      });
      return;
    }
    if (action.kind === 'assign_owner') {
      console.warn('[investigation] assign_owner queued', action);
      setOwnerBanner('Owner assignment queued');
      return;
    }
  }, [activeTarget, bundle, answer, stack, jobs, requestFixHandoff]);

  // Build a transformed answer where wired actions are forced enabled.
  const wiredAnswer = useMemo<InvestigationAnswer | null>(() => {
    if (!answer) return null;
    return {
      ...answer,
      actions: answer.actions.map((a) =>
        WIRED_ACTION_KINDS.has(a.kind) ? { ...a, enabled: true } : a,
      ),
    };
  }, [answer]);

  const followups = useMemo<FollowUp[]>(() => {
    if (!bundle || !wiredAnswer) return [];
    return buildFollowUps(bundle, wiredAnswer);
  }, [bundle, wiredAnswer]);

  const handleFollowUp = useCallback((f: FollowUp) => {
    if (!activeTarget) return;
    addQuestion(activeTarget.id, f.question, f.questionType);
    if (f.questionType !== questionType) {
      setQuestionType(f.questionType);
    }
  }, [activeTarget, addQuestion, questionType, setQuestionType]);

  const handleResolveUnknown = useCallback(
    (tag: UnknownTag) => {
      if (!activeTarget) return;
      addQuestion(activeTarget.id, `Resolve unknown: ${tag.label}`, questionType);
      setMode('notebook');
    },
    [activeTarget, addQuestion, questionType],
  );

  const handleNotebookAddQuestion = useCallback(
    (text: string, qt: QuestionType) => {
      if (!activeTarget) return;
      addQuestion(activeTarget.id, text, qt);
    },
    [activeTarget, addQuestion],
  );

  const activeEntry = useMemo(() => {
    if (!activeNotebookId) return null;
    return notebook.find((e) => e.id === activeNotebookId) ?? null;
  }, [notebook, activeNotebookId]);

  const visibleQuestionIds = useMemo<string[]>(() => {
    if (!activeEntry) return [];
    return activeEntry.questions
      .filter((q) => q.status !== 'archived')
      .map((q) => q.id);
  }, [activeEntry]);

  // Keep selection valid as the question list shifts: when the selected
  // id falls out of the visible window (or notebook mode opens with no
  // pick), snap to the first visible question. The selection is user-
  // controlled state, so deriving it would lose the user's pick the moment
  // the list reshuffles for any unrelated reason.
  useEffect(() => {
    if (selectedQuestionId && !visibleQuestionIds.includes(selectedQuestionId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedQuestionId(visibleQuestionIds[0] ?? null);
    } else if (!selectedQuestionId && visibleQuestionIds.length > 0 && mode === 'notebook') {
      setSelectedQuestionId(visibleQuestionIds[0] ?? null);
    }
  }, [visibleQuestionIds, selectedQuestionId, mode]);

  usePanelKeyboardNav({
    panelOpen,
    mode,
    visibleQuestionIds,
    selectedQuestionId,
    activeTarget,
    onClose: closePanel,
    onModeToggle: () => { setMode((cur) => (cur === 'answer' ? 'notebook' : 'answer')); },
    onSelectQuestion: setSelectedQuestionId,
    onRegenerate: regenerate,
  });

  if (!mounted && !panelOpen) return null;

  const evidenceCount = bundle?.evidence.length ?? 0;

  // Outer wrapper is plain (no transform) so backdrop-filter keeps working on
  // GlassCard. Slide-in is via `right` only.
  const outerStyle: React.CSSProperties = {
    right: panelOpen ? 0 : -480,
    transition: 'right 200ms ease-out, opacity 200ms ease-out',
    opacity: panelOpen ? 1 : 0,
  };

  return (
    <div
      className="fixed top-0 bottom-0 w-[480px] max-w-[90vw] z-40 pointer-events-auto"
      style={outerStyle}
      aria-hidden={!panelOpen}
      role="dialog"
      aria-label="Investigation workspace"
      aria-modal="false"
    >
      <GlassCard className="h-full flex flex-col rounded-l-2xl rounded-r-none">
        <PanelHeader activeTarget={activeTarget} onClear={clear} onClose={closePanel} />

        {activeTarget ? (
          <PanelTabs
            mode={mode}
            onModeChange={setMode}
            questionType={questionType}
            onQuestionTypeChange={setQuestionType}
          />
        ) : null}

        <OwnerBanner message={ownerBanner} />

        <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
          {!activeTarget && <EmptyBody onPick={(t) => { start(t); }} />}

          {activeTarget && mode === 'answer' && (
            <AnswerBody
              status={status}
              bundle={bundle}
              wiredAnswer={wiredAnswer}
              pickedEvidenceId={pickedEvidenceId}
              followups={followups}
              plannerRunning={plannerRunning}
              plannerSteps={plannerSteps}
              plannerTrace={plannerTrace}
              onAction={handleAction}
              onPickEvidence={pickEvidence}
              onFollowUp={handleFollowUp}
              onResolveUnknown={handleResolveUnknown}
              onRunPlanner={handleRunPlanner}
              onRegenerate={regenerate}
            />
          )}

          {activeTarget && mode === 'notebook' && (
            <NotebookBody
              activeEntry={activeEntry}
              bundle={bundle}
              currentQuestionType={questionType}
              onAddQuestion={handleNotebookAddQuestion}
              onArchive={archiveQuestion}
              onAction={handleAction}
            />
          )}
        </div>

        <PanelFooter
          activeTarget={activeTarget}
          evidenceCount={evidenceCount}
          status={status}
          demoTargetCount={FIXTURE_TARGETS.length}
          onRegenerate={regenerate}
        />
      </GlassCard>
    </div>
  );
}
