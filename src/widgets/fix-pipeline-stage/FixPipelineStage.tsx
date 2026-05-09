import { useEffect, useMemo } from 'react';
import { useTranslation } from '@shared/i18n';
import { useFixPipelineStore } from '@features/fix-pipeline-state';
import { SeedRail } from './parts/SeedRail';
import { RootCausePane } from './parts/RootCausePane';
import { DiffPane } from './parts/DiffPane';
import { RejectedAlternatives } from './parts/RejectedAlternatives';
import { ProofPanel } from './parts/ProofPanel';
import { DeliveryGatePanel } from './parts/DeliveryGatePanel';
import { TrustSignalPanel } from './parts/TrustSignalPanel';
import { PrPackagePreview } from './parts/PrPackagePreview';
import { CostPanel } from './parts/CostPanel';
import { LoopPanel } from './parts/LoopPanel';
import { ReanalysisPanel } from './parts/ReanalysisPanel';
import { PermissionsPanel } from './parts/PermissionsPanel';
import { ConflictsPanel } from './parts/ConflictsPanel';
import { FreshnessBanner } from './parts/FreshnessBanner';
import { SelfCritiquePanel } from './parts/SelfCritiquePanel';
import { RoutingPanel } from './parts/RoutingPanel';
import { RollbackPanel } from './parts/RollbackPanel';
import { SubmitBar } from './parts/SubmitBar';
import { PartialAcceptControls } from './parts/PartialAcceptControls';

// Top-level UI composition for feature 06.
//
// Layout:
//   top    — freshness banner (always honest about index age)
//   left   — seed rail + candidate rail (recommended + rejected alts)
//   centre — root cause + rationale, conflicts (if any), rejected alts,
//            self-critique iterations, re-analysis, partial-accept,
//            rollback, diff (proof-first ordering — diff is last)
//   right  — proof, delivery gate, trust signal, submit bar, loop, cost,
//            routing, permissions, PR package
//
// Render-only widget. Every mutation goes through the store; the store
// delegates to the feature modules. None of those imports cross layer
// boundaries the wrong way.

export default function FixPipelineStage() {
  const { t } = useTranslation('fix-pipeline');

  const seeds = useFixPipelineStore((s) => s.seeds);
  const selectedSeedId = useFixPipelineStore((s) => s.selectedSeedId);
  const candidatesBySeed = useFixPipelineStore((s) => s.candidatesBySeed);
  const selectedCandidateId = useFixPipelineStore((s) => s.selectedCandidateId);
  const validationByCandidate = useFixPipelineStore((s) => s.validationByCandidate);
  const confidenceByCandidate = useFixPipelineStore((s) => s.confidenceByCandidate);
  const decisionByCandidate = useFixPipelineStore((s) => s.decisionByCandidate);
  const conflictsByCandidate = useFixPipelineStore((s) => s.conflictsByCandidate);
  const reanalysisByCandidate = useFixPipelineStore((s) => s.reanalysisByCandidate);
  const reviewersByCandidate = useFixPipelineStore((s) => s.reviewersByCandidate);
  const rollbackByCandidate = useFixPipelineStore((s) => s.rollbackByCandidate);
  const submissions = useFixPipelineStore((s) => s.submissions);
  const critiqueHistory = useFixPipelineStore((s) => s.critiqueHistory);
  const partialAcceptByCandidate = useFixPipelineStore((s) => s.partialAcceptByCandidate);
  const dismissals = useFixPipelineStore((s) => s.dismissals);
  const generationStatus = useFixPipelineStore((s) => s.generationStatus);
  const generationError = useFixPipelineStore((s) => s.generationError);
  const validationStatus = useFixPipelineStore((s) => s.validationStatus);
  const cost = useFixPipelineStore((s) => s.cost);
  const loop = useFixPipelineStore((s) => s.loop);
  const freshness = useFixPipelineStore((s) => s.freshness);
  const permissions = useFixPipelineStore((s) => s.permissions);

  const selectSeed = useFixPipelineStore((s) => s.selectSeed);
  const selectCandidate = useFixPipelineStore((s) => s.selectCandidate);
  const runValidation = useFixPipelineStore((s) => s.runValidation);
  const dismissCandidate = useFixPipelineStore((s) => s.dismissCandidate);
  const submitCandidate = useFixPipelineStore((s) => s.submitCandidate);
  const toggleHunkAccept = useFixPipelineStore((s) => s.toggleHunkAccept);

  useEffect(() => {
    if (selectedSeedId === null && seeds.length > 0) {
      void selectSeed(seeds[0].id);
    }
  }, [selectedSeedId, seeds, selectSeed]);

  const seed = useMemo(
    () => seeds.find((s) => s.id === selectedSeedId) ?? null,
    [seeds, selectedSeedId],
  );
  const candidates = selectedSeedId !== null ? candidatesBySeed[selectedSeedId] ?? [] : [];
  const candidate = useMemo(
    () => candidates.find((c) => c.id === selectedCandidateId) ?? null,
    [candidates, selectedCandidateId],
  );
  const rejected = candidates.filter((c) => !c.isRecommended);
  const validation = candidate ? validationByCandidate[candidate.id] ?? null : null;
  const confidence = candidate ? confidenceByCandidate[candidate.id] ?? null : null;
  const decision = candidate ? decisionByCandidate[candidate.id] ?? null : null;
  const conflicts = candidate ? conflictsByCandidate[candidate.id] ?? [] : [];
  const reanalysis = candidate ? reanalysisByCandidate[candidate.id] ?? null : null;
  const routing = candidate ? reviewersByCandidate[candidate.id] ?? null : null;
  const rollback = candidate ? rollbackByCandidate[candidate.id] ?? null : null;
  const submission = candidate ? submissions[candidate.id] ?? null : null;
  const partialAccept = candidate ? partialAcceptByCandidate[candidate.id] ?? null : null;
  const candidateCost = candidate ? cost.byCandidate[candidate.id] ?? null : null;
  const dismissal = useMemo(() => {
    if (!candidate) return null;
    return dismissals.find((d) => d.candidateId === candidate.id) ?? null;
  }, [candidate, dismissals]);

  // Critique iterations relevant to the current candidate's lineage —
  // entries that produced this candidate or earlier ones in its chain.
  // For MVP we just show all history entries on the seed; user filters
  // mentally if needed.
  const relevantCritique = candidate
    ? critiqueHistory.filter((h) =>
        h.candidateIdAfter === candidate.id || h.candidateIdBefore === candidate.id,
      )
    : [];

  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <FreshnessBanner freshness={freshness} t={t} />

      <div className="flex-1 min-h-0 flex">
        <SeedRail
          seeds={seeds}
          selectedSeedId={selectedSeedId}
          onSelectSeed={(id) => { void selectSeed(id); }}
          candidates={candidates}
          selectedCandidateId={selectedCandidateId}
          onSelectCandidate={selectCandidate}
          dismissals={dismissals}
          generationStatus={generationStatus}
          generationError={generationError}
          t={t}
        />

        <main className="flex-1 min-w-0 overflow-auto p-4">
          {seed && candidate ? (
            <div className="flex flex-col gap-3 max-w-[920px]">
              <RootCausePane seed={seed} candidate={candidate} t={t} />
              <ConflictsPanel conflicts={conflicts} t={t} />
              <RejectedAlternatives rejected={rejected} t={t} />
              <SelfCritiquePanel history={relevantCritique} t={t} />
              {reanalysis && <ReanalysisPanel snapshot={reanalysis} t={t} />}
              <PartialAcceptControls
                diff={candidate.diff}
                acceptance={partialAccept}
                onToggle={(i) => { toggleHunkAccept(candidate.id, i); }}
                t={t}
              />
              {rollback && <RollbackPanel rollback={rollback} t={t} />}
              <DiffPane diff={candidate.diff} t={t} />
            </div>
          ) : (
            <div
              className="h-full flex items-center justify-center text-[12px]"
              style={{ color: 'var(--fg-subtle)' }}
            >
              {t('empty')}
            </div>
          )}
        </main>

        <aside
          className="shrink-0 h-full overflow-auto p-3 flex flex-col gap-3 border-l"
          style={{ width: 340, borderColor: 'var(--border-muted)', background: 'var(--bg-canvas)' }}
        >
          {candidate && validation && decision && confidence && (
            <>
              <ProofPanel
                validation={validation}
                t={t}
                validationStatus={validationStatus}
                onRunValidation={() => { runValidation(candidate.id); }}
              />
              <DeliveryGatePanel decision={decision} t={t} />
              <SubmitBar
                candidateId={candidate.id}
                decision={decision}
                permissions={permissions}
                submission={submission}
                onSubmit={() => { submitCandidate(candidate.id); }}
                t={t}
              />
              <TrustSignalPanel
                candidateId={candidate.id}
                confidence={confidence}
                dismissal={dismissal}
                onDismiss={(reason, note) => { dismissCandidate(candidate.id, reason, note); }}
                t={t}
              />
              <LoopPanel loop={loop} t={t} />
              <CostPanel cost={cost} candidateCost={candidateCost} t={t} />
              {routing && <RoutingPanel routing={routing} t={t} />}
              <PermissionsPanel permissions={permissions} t={t} />
              <PrPackagePreview
                candidate={candidate}
                validation={validation}
                decision={decision}
                confidence={confidence}
                t={t}
              />
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
