import { useState } from 'react';
import { useTheme } from '@shared/theme';
import { useTranslation } from '@shared/i18n';
import { useVerifiedFixStore } from '../model/store';
import type { FixCase, Seed } from '../model/types';
import { AmbientLayer } from './parts/AmbientLayer';
import { Sidebar } from './parts/Sidebar';
import { LoopTape } from './parts/LoopTape';
import { ProofBoard } from './parts/ProofBoard';
import { CandidateCards } from './parts/CandidateCards';
import { TrustPanel } from './parts/TrustPanel';
import { DiffExpander } from './parts/DiffExpander';
import { DraftPackageCard } from './parts/DraftPackageCard';
import { DismissModal } from './parts/DismissModal';
import { PhaseTabs } from './parts/PhaseTabs';
import { CostTelemetry } from './parts/CostTelemetry';
import { PostPatchReanalysis } from './parts/PostPatchReanalysis';
import { ReviewerRouting } from './parts/ReviewerRouting';
import { ConventionPanel } from './parts/ConventionPanel';
import { PolicyThresholds } from './parts/PolicyThresholds';
import { RollbackPlan } from './parts/RollbackPlan';
import { DismissFeedback } from './parts/DismissFeedback';
import { vfxTokens } from './parts/tokens';

// Verified Fix Pipeline — proof-first surface.
//
// Layout:
//
//   ┌── SIDEBAR ──┬── MAIN (scrollable) ─────────────────────┬── TRUST ──┐
//   │  seed list  │  LoopTape (iteration progress)           │  conf     │
//   │  by kind    │  ProofBoard (root cause | obligations)   │  weakest  │
//   │             │  CandidateCards (1–3, tier-tagged)       │  counter  │
//   │             │  DiffExpander (collapsed)                │  gate     │
//   └─────────────┴───────────────────────────────────────────┴───────────┘
//
// Diff is intentionally *not* the first thing on screen — root cause +
// proofs come first per the plan's UX rule.

export default function VerifiedFixRoot() {
  const { isDark } = useTheme();
  const t = vfxTokens(isDark);

  const casesMap = useVerifiedFixStore((s) => s.cases);
  const seeds    = useVerifiedFixStore((s) => s.seeds);
  const activeId = useVerifiedFixStore((s) => s.activeCaseId);
  const setActive        = useVerifiedFixStore((s) => s.setActive);
  const selectCandidate  = useVerifiedFixStore((s) => s.selectCandidate);
  const dismissCandidate = useVerifiedFixStore((s) => s.dismissCandidate);
  const diffExpanded     = useVerifiedFixStore((s) => s.diffExpanded);
  const toggleDiff       = useVerifiedFixStore((s) => s.toggleDiff);

  const phase    = useVerifiedFixStore((s) => s.phase);
  const setPhase = useVerifiedFixStore((s) => s.setPhase);

  const cases = Object.values(casesMap);
  const fixCase: FixCase | undefined = activeId ? casesMap[activeId] : undefined;
  const seed:    Seed    | undefined = fixCase ? seeds[fixCase.seedId] : undefined;
  const candidate = fixCase?.selectedCandidateId
    ? fixCase.candidates.find((c) => c.id === fixCase.selectedCandidateId)
    : undefined;

  const [dismissTarget, setDismissTarget] = useState<string | null>(null);
  const dismissCandidateObj = dismissTarget && fixCase
    ? fixCase.candidates.find((c) => c.id === dismissTarget) ?? null
    : null;

  return (
    <div
      className="absolute inset-0 overflow-hidden flex"
      style={{ background: t.page, color: t.textBody }}
    >
      <AmbientLayer />

      <Sidebar
        cases={cases}
        seeds={seeds}
        activeCaseId={activeId}
        onSelect={setActive}
      />

      <main className="flex-1 min-w-0 relative overflow-auto">
        <div className="px-6 py-5 space-y-4 max-w-[1280px] mx-auto">
          {fixCase && seed ? (
            <>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <Header fixCase={fixCase} seed={seed} />
                <PhaseTabs active={phase} onChange={setPhase} />
              </div>

              {/* Phase 1 — always visible (the proof-first surface itself). */}
              {phase === 1 && (
                <>
                  <CostTelemetry fixCase={fixCase} />
                  <LoopTape fixCase={fixCase} />
                  <ProofBoard fixCase={fixCase} seed={seed} candidate={candidate} />
                  <CandidateCards
                    candidates={fixCase.candidates}
                    selectedId={fixCase.selectedCandidateId}
                    dismissedIds={fixCase.dismissedCandidateIds}
                    onSelect={(id) => { selectCandidate(fixCase.id, id); }}
                  />
                  <DiffExpander
                    candidate={candidate}
                    expanded={diffExpanded}
                    onToggle={toggleDiff}
                  />
                  <DraftPackageCard fixCase={fixCase} />
                </>
              )}

              {/* Phase 2 — dynamic validation, post-patch re-analysis, routing. */}
              {phase === 2 && (
                <>
                  <PhaseIntro titleKey="phase.p2Title" bodyKey="phase.p2Body" />
                  <PostPatchReanalysis caseId={fixCase.id} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <ReviewerRouting caseId={fixCase.id} />
                    {candidate && <ConventionPanel candidate={candidate} />}
                  </div>
                  {/* keep proof + draft visible so you don't lose context */}
                  <ProofBoard fixCase={fixCase} seed={seed} candidate={candidate} />
                  <DraftPackageCard fixCase={fixCase} />
                </>
              )}

              {/* Phase 3 — auto-submit policy, rollback, feedback loop. */}
              {phase === 3 && (
                <>
                  <PhaseIntro titleKey="phase.p3Title" bodyKey="phase.p3Body" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <PolicyThresholds />
                    <RollbackPlan caseId={fixCase.id} />
                  </div>
                  <DismissFeedback />
                </>
              )}
            </>
          ) : (
            <EmptyState />
          )}
        </div>
      </main>

      {fixCase ? (
        <TrustPanel
          candidate={candidate}
          fixCase={fixCase}
          onDismiss={(cid) => { setDismissTarget(cid); }}
        />
      ) : (
        <TrustPanelEmpty />
      )}

      <DismissModal
        candidate={dismissCandidateObj}
        open={dismissTarget !== null}
        onCancel={() => { setDismissTarget(null); }}
        onConfirm={(_reason, _note) => {
          if (fixCase && dismissTarget) {
            dismissCandidate(fixCase.id, dismissTarget);
          }
          setDismissTarget(null);
        }}
      />
    </div>
  );
}

function Header({ fixCase, seed }: { fixCase: FixCase; seed: Seed }) {
  const { isDark } = useTheme();
  const t = vfxTokens(isDark);
  const { t: tr } = useTranslation('verified-fix');
  return (
    <div className="flex items-center gap-3">
      <span
        className="text-[10px] font-black uppercase tracking-[0.18em] px-2 py-0.5 rounded font-mono"
        style={{ background: t.badgeBg, color: t.textMuted }}
      >
        {tr(`header.kind.${seed.kind}`)}
      </span>
      <h1 className="text-[15px] font-bold" style={{ color: t.textHi }}>
        {seed.title}
      </h1>
      <span className="ml-auto text-[10px] font-mono" style={{ color: t.textFaint }}>
        {tr('header.case', { id: fixCase.id })}
      </span>
    </div>
  );
}

function PhaseIntro({ titleKey, bodyKey }: { titleKey: string; bodyKey: string }) {
  const { isDark } = useTheme();
  const t = vfxTokens(isDark);
  const { t: tr } = useTranslation('verified-fix');
  return (
    <div
      className="rounded-lg border px-4 py-2.5"
      style={{ background: t.inset, borderColor: t.borderSoft }}
    >
      <div
        className="text-[10px] font-black uppercase tracking-[0.18em]"
        style={{ color: t.textMuted }}
      >
        {tr(titleKey)}
      </div>
      <div className="text-[11px] mt-0.5 leading-snug" style={{ color: t.textBody }}>
        {tr(bodyKey)}
      </div>
    </div>
  );
}

function EmptyState() {
  const { isDark } = useTheme();
  const t = vfxTokens(isDark);
  const { t: tr } = useTranslation('verified-fix');
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>
          {tr('empty.noCaseTitle')}
        </div>
        <div className="text-[11px] mt-1" style={{ color: t.textFaint }}>
          {tr('empty.noCaseBody')}
        </div>
      </div>
    </div>
  );
}

function TrustPanelEmpty() {
  const { isDark } = useTheme();
  const t = vfxTokens(isDark);
  const { t: tr } = useTranslation('verified-fix');
  return (
    <aside
      className="shrink-0 w-[320px] h-full overflow-auto border-l p-4"
      style={{ background: t.sidebar, backdropFilter: t.sidebarBlur, borderColor: t.border }}
    >
      <div className="text-[10px] font-black uppercase tracking-[0.18em] mb-2" style={{ color: t.textMuted }}>
        {tr('trust.signal')}
      </div>
      <div className="text-[11px]" style={{ color: t.textFaint }}>
        {tr('empty.trustEmpty')}
      </div>
    </aside>
  );
}
