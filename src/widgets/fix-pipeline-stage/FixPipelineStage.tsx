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

// Top-level UI composition for feature 06.
//
// Layout (3 columns):
//   left  — seed rail + candidate rail (recommended + rejected alternatives)
//   centre — root cause + rationale, then rejected-alternatives summary,
//            then diff (proof-first ordering on purpose)
//   right — proof obligations, delivery gate, trust signal, PR package
//
// The widget is render-only. Every state mutation goes through the store
// in features/fix-pipeline-state, which delegates to the candidate
// generator / verification / gate / trust-signal feature modules. None of
// those imports cross layer boundaries the wrong way.

export default function FixPipelineStage() {
  const { t } = useTranslation('fix-pipeline');

  const seeds = useFixPipelineStore((s) => s.seeds);
  const selectedSeedId = useFixPipelineStore((s) => s.selectedSeedId);
  const candidatesBySeed = useFixPipelineStore((s) => s.candidatesBySeed);
  const selectedCandidateId = useFixPipelineStore((s) => s.selectedCandidateId);
  const validationByCandidate = useFixPipelineStore((s) => s.validationByCandidate);
  const confidenceByCandidate = useFixPipelineStore((s) => s.confidenceByCandidate);
  const decisionByCandidate = useFixPipelineStore((s) => s.decisionByCandidate);
  const dismissals = useFixPipelineStore((s) => s.dismissals);
  const generationStatus = useFixPipelineStore((s) => s.generationStatus);
  const generationError = useFixPipelineStore((s) => s.generationError);
  const validationStatus = useFixPipelineStore((s) => s.validationStatus);

  const selectSeed = useFixPipelineStore((s) => s.selectSeed);
  const selectCandidate = useFixPipelineStore((s) => s.selectCandidate);
  const runValidation = useFixPipelineStore((s) => s.runValidation);
  const dismissCandidate = useFixPipelineStore((s) => s.dismissCandidate);

  // Auto-select the first seed on mount so the page lands on a populated
  // surface instead of an empty rail. Without this the user always has
  // to click first — fine for production, hostile for a demo screen.
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
  const dismissal = useMemo(() => {
    if (!candidate) return null;
    return dismissals.find((d) => d.candidateId === candidate.id) ?? null;
  }, [candidate, dismissals]);

  return (
    <div
      className="absolute inset-0 flex"
      style={{ background: 'var(--bg-canvas)' }}
    >
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
            <RejectedAlternatives rejected={rejected} t={t} />
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
            <TrustSignalPanel
              candidateId={candidate.id}
              confidence={confidence}
              dismissal={dismissal}
              onDismiss={(reason, note) => { dismissCandidate(candidate.id, reason, note); }}
              t={t}
            />
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
  );
}
