import { RefreshCw } from 'lucide-react';
import type {
  ActionRecommendation,
  BundleStatus,
  ContextBundle,
  InvestigationAnswer,
  UnknownTag,
} from '@entities/investigation';
import { AnswerView } from '../../evidence/AnswerView';
import { GatheringIndicator } from '../../evidence/GatheringIndicator';
import { SimilarStrip } from '../../similarity';
import { FollowUpStrip, type FollowUp } from '../../followup';
import { PlannerLauncher, PlannerTrace } from '../../planner-ui';
import type { PlannerStep, PlannerTrace as PlannerTraceData } from '../../planner/runPlanner';
import { AllEvidenceSection } from './AllEvidenceSection';
import { SkeletonBlock } from './SkeletonBlock';

export type AnswerBodyProps = {
  status: BundleStatus;
  bundle: ContextBundle | null;
  wiredAnswer: InvestigationAnswer | null;
  pickedEvidenceId: string | null;
  followups: FollowUp[];
  plannerRunning: boolean;
  plannerSteps: PlannerStep[];
  plannerTrace: PlannerTraceData | null;
  onAction: (action: ActionRecommendation) => void;
  onPickEvidence: (id: string | null) => void;
  onFollowUp: (f: FollowUp) => void;
  onResolveUnknown: (tag: UnknownTag) => void;
  onRunPlanner: () => void;
  onRegenerate: () => void;
};

export function AnswerBody({
  status,
  bundle,
  wiredAnswer,
  pickedEvidenceId,
  followups,
  plannerRunning,
  plannerSteps,
  plannerTrace,
  onAction,
  onPickEvidence,
  onFollowUp,
  onResolveUnknown,
  onRunPlanner,
  onRegenerate,
}: AnswerBodyProps) {
  const evidenceCount = bundle?.evidence.length ?? 0;

  if (status === 'gathering' || status === 'partial') {
    return (
      <>
        <GatheringIndicator
          status={status}
          count={evidenceCount}
          recentEvidence={bundle?.evidence ?? []}
        />
        <SkeletonBlock />
        <SkeletonBlock />
        <SkeletonBlock />
      </>
    );
  }

  if (status === 'complete' && wiredAnswer && bundle) {
    return (
      <>
        <section role="region" aria-label="Answer">
          <AnswerView
            answer={wiredAnswer}
            bundle={bundle}
            onAction={onAction}
            onPickEvidence={onPickEvidence}
            pickedEvidenceId={pickedEvidenceId}
            onResolveUnknown={onResolveUnknown}
          />
        </section>
        <AllEvidenceSection
          evidence={bundle.evidence}
          pickedId={pickedEvidenceId}
          onPick={onPickEvidence}
        />
        <div
          className="py-3"
          role="region"
          aria-label="Similar cases"
          style={{ borderTop: '1px solid var(--border-default)' }}
        >
          <SimilarStrip bundle={bundle} />
        </div>
        <div
          className="py-3"
          role="region"
          aria-label="Follow-up questions"
          style={{ borderTop: '1px solid var(--border-default)' }}
        >
          <FollowUpStrip followups={followups} onPick={onFollowUp} />
        </div>
        <div
          className="py-3 flex flex-col gap-2"
          role="region"
          aria-label="Reflection trace"
          style={{ borderTop: '1px solid var(--border-default)' }}
        >
          <PlannerLauncher onRun={onRunPlanner} running={plannerRunning} />
          <PlannerTrace
            trace={plannerTrace}
            streamingSteps={plannerSteps}
            bundle={bundle}
          />
        </div>
      </>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-start gap-2">
        <div
          className="text-[11px]"
          style={{ color: 'var(--intent-danger-vivid)' }}
        >
          Investigation failed.
        </div>
        <button
          type="button"
          onClick={onRegenerate}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-[0.16em] border transition-colors hover:[background:var(--bg-hover)]"
          style={{
            background: 'var(--bg-surface-muted)',
            color: 'var(--fg-default)',
            borderColor: 'var(--border-muted)',
            cursor: 'pointer',
          }}
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      </div>
    );
  }

  return null;
}
