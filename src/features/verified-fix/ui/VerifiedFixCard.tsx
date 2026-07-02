// ─────────────────────────────────────────────────────────────────────────
// VerifiedFixCard — primary surface for the AI Verified Fix Pipeline.
//
// Reads as one card with five stacked panes:
//   1. Root cause + seed evidence
//   2. Candidates (max 3, primary pre-selected)
//   3. Proof obligations + counter-evidence (rendered side-by-side
//      with equal weight — this is the differentiator)
//   4. Validation timeline (attempt 1 → optional critique → attempt 2)
//   5. Delivery gate + draft PR package
//
// We deliberately do *not* show the diff at the top. The plan doc is
// explicit: root cause → proof → blast first, diff last. Diff lives in
// the candidate panel, opt-in.
//
// The panes are pure presentational components in card/; this file is the
// thin container that does the store-read-once + props-down (DIP) wiring.
// Token helpers + status lookups live in card/tokens + card/shared.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useVerifiedFixStore } from '../model/store';
import {
  ACCENT, mix,
  Header, RootCausePane, CandidatesPane, ProofPane, LoopTimelinePane, DeliveryPane,
} from './card';

type Props = { caseId: string };

export function VerifiedFixCard({ caseId }: Props) {
  // DIP: this is the *only* component in the card tree that touches the
  // store. It resolves the case/seed/selected-candidate once and hands
  // concrete data + bound callbacks down to the panes, which are pure
  // presentational components decoupled from the store shape.
  const fixCase = useVerifiedFixStore((s) => s.cases[caseId]);
  const seed = useVerifiedFixStore((s) =>
    fixCase ? s.seeds[fixCase.seedId] : undefined,
  );
  const selectCandidate = useVerifiedFixStore((s) => s.selectCandidate);
  const startValidation = useVerifiedFixStore((s) => s.startValidation);

  if (!fixCase || !seed) return null;
  const candidate = fixCase.candidates.find((c) => c.id === fixCase.selectedCandidateId)
    ?? fixCase.candidates[0];
  if (!candidate) return null;

  const onSelectCandidate = (id: string) => { selectCandidate(caseId, id); };
  const onValidate = () => { startValidation(caseId); };

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        borderColor: mix(ACCENT, 30),
        background: `linear-gradient(180deg, ${mix(ACCENT, 7)} 0%, ${mix(ACCENT, 3)} 100%)`,
      }}
    >
      <Header stage={fixCase.loop.currentStage} />
      <RootCausePane seed={seed} rootCause={fixCase.rootCause} />
      <CandidatesPane
        candidates={fixCase.candidates}
        selectedCandidateId={fixCase.selectedCandidateId}
        onSelectCandidate={onSelectCandidate}
      />
      <ProofPane candidate={candidate} validations={fixCase.validations} />
      <LoopTimelinePane iterations={fixCase.loop.iterations} />
      <DeliveryPane
        draft={fixCase.draft}
        stage={fixCase.loop.currentStage}
        candidate={candidate}
        onValidate={onValidate}
      />
    </div>
  );
}

// Convenience: render the active case from the store. Lets review-stage
// drop a single component without juggling caseId.
export function VerifiedFixCardActive() {
  const activeCaseId = useVerifiedFixStore((s) => s.activeCaseId);
  // Memo the empty-fallback so we don't allocate per render.
  return useMemo(
    () => (activeCaseId !== null ? <VerifiedFixCard caseId={activeCaseId} /> : null),
    [activeCaseId],
  );
}
