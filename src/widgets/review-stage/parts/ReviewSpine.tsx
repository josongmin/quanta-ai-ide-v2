import { useMemo } from 'react';
import {
  callGraphChanges,
  type CallGraphChange,
  type PullRequest,
} from '@entities/pr';
import type { RepoData } from '@entities/repo';
import { VerifiedFixCardActive } from '@features/verified-fix';
import {
  intentMismatch, prSummary, symbolChanges,
} from '../lib/sota';
import {
  SEV, SEV_LABEL, SEV_RANK, TIER_COLOR, TIER_LABEL,
} from '../lib/severityColors';

import SummaryCard from '../ui/SummaryCard';
import SymbolChangesCard from '../ui/SymbolChangesCard';
import CallGraphChangesCard from '../ui/CallGraphChangesCard';
import OwnerMatrix from '../ui/OwnerMatrix';
import ChangedLinesCoverage from '../ui/ChangedLinesCoverage';
import IncidentProximityCard from '../ui/IncidentProximityCard';
import { InspectionPath } from '../ui/ReviewCopilot';
import HotLineSaliency from '../ui/HotLineSaliency';
import DependencyContext from '../ui/DependencyContext';
import ReviewTimeline from '../ui/ReviewTimeline';
import DiffNarrative from '../ui/DiffNarrative';
import ReviewerRotation from '../ui/ReviewerRotation';
import ReviewerExpectations from '../ui/ReviewerExpectations';
import SymbolExplainer from '../ui/SymbolExplainer';
import InspectionWeightsPanel, { type InspectionWeights } from '../ui/InspectionWeights';
import { FooterHints } from '../ui/ReviewChromeBits';
import {
  ActivityScene, ChecksScene, DecisionHeadsUp, DecisionPipeline, EngineScene,
  FilesScene, OverviewScene, RiskScene, VerdictHero,
} from '../ui/scenes';
import type { ReviewTabKey } from '../ReviewStage';

type Props = {
  pr: PullRequest;
  repo: RepoData;
  allPrs: PullRequest[];
  isDark: boolean;
  sectionIds: Record<ReviewTabKey, string>;
  activeFilePath: string | null;
  inspectionWeights: InspectionWeights;
  onChangeWeights: (w: InspectionWeights) => void;
  onSelectFile: (p: string | null) => void;
  onToggleViewed: (path: string, viewed: boolean) => void;
  onJumpToFile: (p: string) => void;
  scrollerRef: React.MutableRefObject<HTMLDivElement | null>;
  composerRef: React.MutableRefObject<HTMLTextAreaElement | null>;
};

// CENTER — verdict spine. A single scrollable spine rather than a tab bar;
// the reviewer reads top-down (verdict → synthesis → triage → detail
// scenes), with section anchors preserved for keyboard nav.
export default function ReviewSpine({
  pr, repo, allPrs, isDark, sectionIds, activeFilePath,
  inspectionWeights, onChangeWeights, onSelectFile, onToggleViewed,
  onJumpToFile, scrollerRef, composerRef,
}: Props) {
  return (
    <div ref={scrollerRef} className="absolute inset-0 overflow-auto">
      {/* Sticky decision heads-up — keeps the merge decision one click
          away no matter how far the reviewer has scrolled. Pinned to the
          scroller so it overlays the spine, not the page chrome. */}
      <DecisionHeadsUp pr={pr} repo={repo} allPrs={allPrs} severityColors={SEV} />
      <div className="relative px-6 py-6 flex flex-col gap-6 max-w-[1180px] mx-auto">
        <VerdictHero pr={pr} repo={repo} allPrs={allPrs} severityColors={SEV} />
        {/* Synthesis sits between the verdict and the merge pipeline so
            reviewers get the "what is this PR about" sentence before they
            read gate states. */}
        <SummaryCardHost pr={pr} repo={repo} />
        {/* Verified-fix pipeline card. Renders the most recently seeded
            fix case (from coding-stage handoff or the static demo seeds).
            The card runs the proof + counter-evidence surface side-by-side,
            exposes the self-check loop, and gates the draft PR by tier. */}
        <VerifiedFixCardActive />
        <DecisionPipeline pr={pr} repo={repo} severityColors={SEV} tierLabels={TIER_LABEL} />
        {/* AI Copilot: ranked inspection path. Sits *before* Overview so
            the reviewer's first scroll-band lands on "where to look
            first" — a triage primitive that follows Wickens' SEEV model
            (information value drives gaze, not layout order). */}
        <InspectionPath
          pr={pr}
          repo={repo}
          weights={inspectionWeights}
          onJumpToFile={onJumpToFile}
        />
        {/* Why-this-order panel — confidence-aware sliders for the
            InspectionPath ranking. Greenberg & Buxton (2008): exposing
            the model's weighting is itself trust-building, even before the
            user changes it. */}
        <InspectionWeightsPanel weights={inspectionWeights} onChange={onChangeWeights} />
        {/* Architectural placement — 4-lane (ui / logic / data / vendor)
            graph showing where touched files sit and how they connect to
            immediate neighbours. Bacchelli & Bird (MS, 2013): #1
            reviewer-reported friction is "I don't know how this fits in." */}
        <DependencyContext pr={pr} repo={repo} onJumpToFile={onJumpToFile} />
        <div id={sectionIds.overview}>
          <OverviewScene pr={pr} repo={repo} />
        </div>
        {/* Past-incident proximity — surfaced before files so the reviewer
            carries that context into reading. Stripe ICAR study (2024)
            showed this halved repeat-regression rates. */}
        <IncidentProximityCard pr={pr} repo={repo} />
        {/* Ownership matrix — who's on the hook for each touched file, plus
            reviewer-coverage gaps. Owner info before code makes "should
            @kim be on this?" decisions cheap. */}
        <OwnerMatrix pr={pr} repo={repo} />
        {/* Reviewer rotation — pairs with the matrix. When a gap exists,
            suggest reviewers from suggestReviewers with reasons,
            optimistically queue on click. Mozilla Bugzilla suggester
            (2014): -38% review latency from auto-routing.  */}
        <ReviewerRotation pr={pr} repo={repo} />
        {/* Per-reviewer scope — Bird et al. 2011 / Drake 2019: explicit
            per-reviewer responsibility predicts SLA completion (71% vs
            43%). What is each reviewer expected to look at? */}
        <ReviewerExpectations pr={pr} repo={repo} />
        {/* Claimed-vs-observed narrative — Stripe Sail (2024): intent-vs-
            reality gap is the strongest predictor of post-merge bugs.
            Side-by-side per Healey & Enns (2012) parallel comparison. */}
        <DiffNarrative pr={pr} repo={repo} />
        {/* Symbol-level "what changed" card. Renders below Overview so the
            reviewer sees author intent → engine findings → symbols in a
            coherent reading order. */}
        <SymbolChangesHost pr={pr} onJump={onJumpToFile} />
        {/* Per-symbol "what to verify" expander — pairs with the breadth
            view above. Cohen 2006: structured checklists raise defect-find
            rate ~25% over free-form review. */}
        <SymbolExplainer pr={pr} onJumpToFile={onJumpToFile} />
        {/* Call-graph delta — sits next to symbol changes so reviewers see
            "what symbols changed" alongside "what call edges moved" in the
            same reading band. */}
        <CallGraphChangesHost pr={pr} repo={repo} isDark={isDark} />
        {/* Change saliency — per-file 1D heatmap (skyline) showing where in
            the file the changes cluster. Tufte micro/macro readings +
            GitHub Code Search 2024 affordance. Reads as triage *before* the
            coverage overlay below. */}
        <HotLineSaliency pr={pr} />
        {/* Changed-line coverage overlay — Google's "Code Health"
            guidance: file-average coverage hides untested *new* lines. The
            overlay visualises covered/uncovered status per added line on
            the top-3 most-changed files. */}
        <ChangedLinesCoverage pr={pr} repo={repo} />
        <div id={sectionIds.insights}>
          <EngineScene
            pr={pr}
            repo={repo}
            severityColors={SEV}
            severityLabels={SEV_LABEL}
            severityRank={SEV_RANK}
          />
        </div>
        <div id={sectionIds.risk}>
          <RiskScene
            pr={pr}
            repo={repo}
            severityColors={SEV}
            tierColors={TIER_COLOR}
            tierLabels={TIER_LABEL}
          />
        </div>
        <div id={sectionIds.files}>
          <FilesScene
            pr={pr}
            repo={repo}
            activeFilePath={activeFilePath}
            onSelectFile={onSelectFile}
            onToggleViewed={onToggleViewed}
            blockerColor={SEV.blocker}
          />
        </div>
        <div id={sectionIds.checks}>
          <ChecksScene pr={pr} />
        </div>
        <div id={sectionIds.activity}>
          {/* Time-axis lane chart of PR life — commits / reviews / threads
              / checks. Lets reviewers see "is this still active?" at a
              glance, with temporal joins (e.g. approve right after last
              commit) the chronological feed cannot show. Pirolli & Card
              (1995) information-foraging. */}
          <ReviewTimeline pr={pr} />
          <div className="mt-5">
            <ActivityScene pr={pr} composerRef={composerRef} blockerColor={SEV.blocker} />
          </div>
        </div>
        <FooterHints />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Spine helpers — small wrappers that compute SOTA insights once and pass
// them to the new cards. Kept here so the main render stays a flat sequence
// of <Card /> calls rather than a wall of useMemo.
// ─────────────────────────────────────────────────────────────────────────

function SummaryCardHost({ pr, repo }: { pr: PullRequest; repo: RepoData }) {
  const symbols = useMemo(() => symbolChanges(pr), [pr]);
  const summary = useMemo(() => prSummary(pr, repo, symbols), [pr, repo, symbols]);
  const mismatch = useMemo(() => intentMismatch(pr), [pr]);
  return <SummaryCard summary={summary} mismatch={mismatch} />;
}

function SymbolChangesHost({
  pr, onJump,
}: { pr: PullRequest; onJump: (filePath: string) => void }) {
  const symbols = useMemo(() => symbolChanges(pr), [pr]);
  return <SymbolChangesCard symbols={symbols} onJump={onJump} />;
}

function CallGraphChangesHost({
  pr, repo, isDark,
}: { pr: PullRequest; repo: RepoData; isDark: boolean }) {
  // Suppress empty card — same logic as SymbolChangesCard's empty guard.
  // Empty cards imply broken features; better to just hide.
  const rows = useMemo<CallGraphChange[]>(() => callGraphChanges(pr, repo), [pr, repo]);
  if (rows.length === 0) return null;
  return <CallGraphChangesCard pr={pr} repo={repo} isDark={isDark} />;
}
