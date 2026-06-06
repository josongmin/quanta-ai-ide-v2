import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
} from 'lucide-react';
import { useFilterStore } from '@entities/filter-state';
import { VerifiedFixCardActive } from '@features/verified-fix';
import { useTheme } from '@shared/theme/ThemeContext';
import {
  callGraphChanges,
  computePrRisk,
  type CallGraphChange,
  type EngineSeverity,
  type PullRequest, type RiskTier,
} from '@entities/pr';
import type { RepoData } from '@entities/repo';
import {
  useActivePr, useReviewStore, viewerLogin,
} from '@features/review-pr';
import { useReviewKeyboard } from './lib/keyboard';
import {
  getSession, intentMismatch, prSummary,
  saveSession, symbolChanges,
} from './lib/sota';


import SummaryCard from './ui/SummaryCard';
import SymbolChangesCard from './ui/SymbolChangesCard';
import CallGraphChangesCard from './ui/CallGraphChangesCard';
import OwnerMatrix from './ui/OwnerMatrix';
import ChangedLinesCoverage from './ui/ChangedLinesCoverage';
import IncidentProximityCard from './ui/IncidentProximityCard';
import { InspectionPath } from './ui/ReviewCopilot';
import HotLineSaliency from './ui/HotLineSaliency';
import DependencyContext from './ui/DependencyContext';
import ReviewTimeline from './ui/ReviewTimeline';
import DiffNarrative from './ui/DiffNarrative';
import ReviewerRotation from './ui/ReviewerRotation';
import CommandPalette from './ui/CommandPalette';
import ReviewerExpectations from './ui/ReviewerExpectations';
import SymbolExplainer from './ui/SymbolExplainer';
import InspectionWeightsPanel, {
  DEFAULT_WEIGHTS, type InspectionWeights,
} from './ui/InspectionWeights';
import LeftQueue, { type QueueScope } from './ui/LeftQueue';
import { CheatSheet, EmptyState, FooterHints, RailEmpty } from './ui/ReviewChromeBits';
import { EngineScene, OverviewScene, RiskScene } from './ui/ReviewCoreScenes';
import { ContextRail } from './ui/ReviewContextRail';
import {
  DecisionHeadsUp,
  DecisionPipeline,
  VerdictHero,
} from './ui/ReviewDecisionChrome';
import { ActivityScene, ChecksScene, FilesScene } from './ui/ReviewDetailScenes';
import {
  AmbientLayer,
  EngineFindingsPanel,
  StatusBar,
} from './ui/ReviewShellChrome';

// Re-exported so the keyboard hook (and any external consumers) keep working.
// The new layout is sectioned rather than tabbed, but the hook still uses
// these as anchor IDs to scroll to / focus.
export type ReviewTabKey =
  | 'overview' | 'insights' | 'files' | 'risk' | 'checks' | 'activity';

// ─────────────────────────────────────────────────────────────────────────
// Mission Control — full-dark review surface.
//
// Why this layout (research-grounded notes for future maintainers):
//
//   • F-pattern scan: top → left → diagonal. Verdict + counters at the top
//     so the reviewer's first fixation lands on the only number that
//     decides everything ("can this merge?").
//   • Hick's law on actions: the *primary* call to action stack is single
//     column (Approve / Request changes), not a 5-button tab bar. Cuts
//     decision time on every PR.
//   • Tab-switching has a measurable context cost (~400-700ms re-orient
//     each switch). We replace tabs with a single scrollable spine — the
//     reviewer reads top-down rather than bouncing between Overview /
//     Files / Risk / Checks. Section anchors keep keyboard nav.
//   • Severity hue stays constant across the surface (blocker → red,
//     high → coral, med → amber, low → blue). Consistent encoding =
//     less re-learning per PR.
//   • Information scent: every queue row shows risk tier dot, CI band,
//     reviewer state — so a reviewer can decide "skip / open" without a
//     click. Reduces queue grooming time.
//   • Live signals (telemetry tape, blink dots, count-up tickers) tell
//     the user the surface is current — important when CI is in flight.
//
// Hard-pinned to dark; light-mode tokens are not threaded.
// ─────────────────────────────────────────────────────────────────────────

const SEV: Record<EngineSeverity, string> = {
  blocker: 'var(--intent-danger-fg)', high: 'var(--intent-danger-fg)', medium: 'var(--intent-warn-fg)', low: 'var(--intent-info-fg)',
};
const SEV_LABEL: Record<EngineSeverity, string> = {
  blocker: 'Blocker', high: 'High', medium: 'Medium', low: 'Low',
};
const TIER_COLOR: Record<RiskTier, string> = {
  safe: 'var(--intent-success-fg)', attention: 'var(--intent-warn-fg)', critical: 'var(--intent-danger-fg)',
};
const TIER_LABEL: Record<RiskTier, string> = {
  safe: 'Ready', attention: 'Review', critical: 'Caution',
};

// Severity rank — module-scope so the EngineScene grouping memo doesn't
// re-allocate it on every render and React lint doesn't flag a bogus
// "missing dependency".
const SEV_RANK: Record<EngineSeverity, number> = {
  blocker: 0, high: 1, medium: 2, low: 3,
};

// Hoisted so the table is allocated once at module load instead of on every
// ReviewStage render. The keyboard hook's `setTab` callback can then list a
// stable identity in its dependency array without re-binding.
const SECTION_ID: Record<ReviewTabKey, string> = {
  overview: 'sec-overview',
  insights: 'sec-engine',
  files:    'sec-files',
  risk:     'sec-risk',
  checks:   'sec-checks',
  activity: 'sec-activity',
};

export default function ReviewStage() {
  const { isDark } = useTheme();
  const repo = useFilterStore((s) => s.repo);
  const prs = useReviewStore((s) => s.prs);
  const activePr = useActivePr();
  const setActivePr = useReviewStore((s) => s.setActivePr);
  const markFileViewed = useReviewStore((s) => s.markFileViewed);
  const submitReview = useReviewStore((s) => s.submitReview);

  // Queue state — scope, search. The new LeftQueue uses the
  // 'all'/'mine'/'archived' triplet and groups rows by repo, so the
  // older 3-tab Inbox/Mine/Team mapping is retired.
  const [scope, setScope] = useState<QueueScope>('all');
  const [query, setQuery] = useState('');

  // Section state — used by keyboard hook to mimic tab API. We scroll
  // anchors instead of swapping panes.
  const [section, setSection] = useState<ReviewTabKey>('overview');
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  // Inspection-path weights — Wickens (2002) trust calibration. Default
  // is the rule-derived ranking; user nudges live in this state and
  // flow into the InspectionPath ranker as a prop.
  const [inspectionWeights, setInspectionWeights] = useState<InspectionWeights>(DEFAULT_WEIGHTS);
  // Verdict-change live region — driving an ARIA polite announcement
  // when a PR's verdict changes (a reviewer presses Approve, CI flips,
  // etc.). Screen readers + accessibility tools then catch the
  // transition without the user re-scanning the hero.
  const [verdictAnnouncement, setVerdictAnnouncement] = useState('');
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  // Session resume — when a PR becomes active, record the visit and
  // persist (PR number, last section, viewed-count). On next reload we
  // can scroll to the last section without forcing the reviewer to
  // re-locate where they left off. localStorage is the persistence
  // layer; see lib/sota.ts for the format and TTL handling.
  useEffect(() => {
    if (activePr === null) return;
    const prior = getSession(activePr.number);
    saveSession({
      prNumber: activePr.number,
      lastVisitedAt: new Date().toISOString(),
      lastSection: prior?.lastSection ?? 'overview',
      viewedCount: activePr.files.filter((f) => f.viewed).length,
      cumulativeMs: prior?.cumulativeMs ?? 0,
    });
  }, [activePr]);

  // Light-weight visible-PRs list for the keyboard nav hook (j/k).
  // Mirrors LeftQueue's scope filter, then sorts by risk so j/k order
  // matches what the user sees. Grouping-by-repo doesn't affect the
  // nav order: keys move through the flattened list, which is what
  // most reviewers expect (jump to next regardless of group).
  const queue = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = prs.filter((pr) => {
      if (scope === 'archived') {
        if (pr.status !== 'closed' && pr.status !== 'merged') return false;
      } else if (scope === 'mine') {
        const isAuthor = pr.author === viewerLogin;
        const isReviewer = pr.reviewers.some((r) => r.login === viewerLogin);
        if (!isAuthor && !isReviewer) return false;
        if (pr.status === 'closed' || pr.status === 'merged') return false;
      } else {
        if (pr.status === 'closed' || pr.status === 'merged') return false;
      }
      if (q.length === 0) return true;
      return pr.title.toLowerCase().includes(q)
        || pr.headBranch.toLowerCase().includes(q)
        || pr.repo.toLowerCase().includes(q);
    });
    const tierRank = { critical: 0, attention: 1, safe: 2 } as const;
    return filtered
      .map((pr) => ({ pr, risk: computePrRisk(pr, repo) }))
      .sort((a, b) => {
        const t = tierRank[a.risk.tier] - tierRank[b.risk.tier];
        if (t !== 0) return t;
        // Group by repo first so j/k traversal feels coherent, then
        // most-recent-within-group.
        const r = a.pr.repo.localeCompare(b.pr.repo);
        if (r !== 0) return r;
        return b.pr.updatedAt.localeCompare(a.pr.updatedAt);
      });
  }, [prs, repo, scope, query]);

  const visibleNumbersRef = useRef<number[]>([]);
  useEffect(() => {
    visibleNumbersRef.current = queue.map((q) => q.pr.number);
  }, [queue]);

  // Section scroll anchors. The keyboard hook lives on the existing
  // ReviewTabKey union — we map each key to a DOM id (via the hoisted
  // SECTION_ID at the top of this module) and scroll there.
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const setTab = useCallback((t: ReviewTabKey) => {
    setSection(t);
    const el = document.getElementById(SECTION_ID[t]);
    if (el && scrollerRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Materialise once per active PR — `useReviewKeyboard` keys cache off
  // this array's identity, so a fresh `.map()` on every render thrashes
  // the cache and dispatches stale keystrokes against rebuilt indices.
  const visibleFilePaths = useMemo(
    () => activePr?.files.map((f) => f.path) ?? [],
    [activePr?.files],
  );

  useReviewKeyboard({
    visiblePrNumbersRef: visibleNumbersRef,
    activePrNumber: activePr?.number ?? null,
    setActivePrNumber: setActivePr,
    visibleFilePaths,
    activeFilePath,
    setActiveFilePath: (p) => { setActiveFilePath(p); },
    tab: section,
    setTab,
    onToggleViewed: () => {
      if (activePr === null || activeFilePath === null) return;
      const file = activePr.files.find((f) => f.path === activeFilePath);
      if (!file) return;
      markFileViewed(activePr.number, file.path, !file.viewed);
    },
    onFocusReviewComposer: () => { composerRef.current?.focus(); },
    onApprove: () => {
      if (activePr === null) return;
      submitReview(activePr.number, 'approve', 'Looks good!', viewerLogin);
      setVerdictAnnouncement(`Approved PR #${String(activePr.number)}`);
    },
    onRequestChanges: () => {
      if (activePr === null) return;
      submitReview(activePr.number, 'request-changes', 'Please address findings.', viewerLogin);
      setVerdictAnnouncement(`Requested changes on PR #${String(activePr.number)}`);
    },
    toggleCheatSheet: () => { setShowCheatSheet((v) => !v); },
    enabled: true,
  });

  return (
    <div
      data-review-theme={isDark ? 'dark' : 'light'}
      className="absolute inset-0 overflow-hidden flex flex-col"
      style={{ backgroundColor: 'var(--bg-stage)' }}
    >
      <AmbientLayer />
      <StatusBar prs={prs} repo={repo} viewerLogin={viewerLogin} severityColors={SEV} />

      {/* Cmd/Ctrl-K palette — mounted at the surface root so the
          shortcut works from anywhere. Renders nothing until opened. */}
      {activePr !== null && (
        <CommandPalette
          pr={activePr}
          repo={repo}
          onJumpToFile={(p) => { setActiveFilePath(p); setTab('files'); }}
          onJumpToFindings={() => { setTab('insights'); }}
        />
      )}

      <div className="relative flex-1 min-h-0 flex">
        {/* LEFT — queue cockpit + active-PR engine findings.
            Findings panel sits *above* the queue: Fitts's law +
            "blocker info before reading code" — a reviewer who just
            picked a PR sees its blockers without scrolling. Collapses
            when no PR is active so the queue keeps full height. */}
        <aside
          className="shrink-0 w-[296px] flex flex-col border-r border-[var(--border-muted)]"
          style={{ background: 'var(--bg-surface-muted)' }}
        >
          {activePr !== null && (
            <EngineFindingsPanel
              pr={activePr}
              repo={repo}
              onJumpToFinding={() => { setTab('insights'); }}
              severityColors={SEV}
            />
          )}
          <LeftQueue
            prs={prs}
            repo={repo}
            activePrNumber={activePr?.number ?? null}
            setActivePr={setActivePr}
            viewerLogin={viewerLogin}
            query={query}
            onQueryChange={setQuery}
            scope={scope}
            onScopeChange={setScope}
          />
        </aside>

        {/* CENTER — verdict spine */}
        <main className="flex-1 min-w-0 relative">
          {activePr === null ? (
            <EmptyState />
          ) : (
            <div ref={scrollerRef} className="absolute inset-0 overflow-auto">
              {/* Sticky decision heads-up — keeps the merge decision
                  one click away no matter how far the reviewer has
                  scrolled. Pinned to the scroller so it overlays the
                  spine, not the page chrome. */}
              <DecisionHeadsUp
                pr={activePr}
                repo={repo}
                allPrs={prs}
                severityColors={SEV}
              />
              <div className="relative px-6 py-6 flex flex-col gap-6 max-w-[1180px] mx-auto">
                <VerdictHero
                  pr={activePr}
                  repo={repo}
                  allPrs={prs}
                  severityColors={SEV}
                />
                {/* Synthesis sits between the verdict and the merge
                    pipeline so reviewers get the "what is this PR
                    about" sentence before they read gate states. */}
                <SummaryCardHost pr={activePr} repo={repo} />
                {/* Verified-fix pipeline card. Renders the most recently
                    seeded fix case (from coding-stage handoff or the
                    static demo seeds). The card runs the proof + counter-
                    evidence surface side-by-side, exposes the self-check
                    loop, and gates the draft PR by tier. */}
                <VerifiedFixCardActive />
                <DecisionPipeline
                  pr={activePr}
                  repo={repo}
                  severityColors={SEV}
                  tierLabels={TIER_LABEL}
                />
                {/* AI Copilot: ranked inspection path. Sits *before*
                    Overview so the reviewer's first scroll-band lands
                    on "where to look first" — a triage primitive that
                    follows Wickens' SEEV model (information value
                    drives gaze, not layout order). */}
                <InspectionPath
                  pr={activePr}
                  repo={repo}
                  weights={inspectionWeights}
                  onJumpToFile={(p) => { setActiveFilePath(p); setTab('files'); }}
                />
                {/* Why-this-order panel — confidence-aware sliders for
                    the InspectionPath ranking. Greenberg & Buxton
                    (2008): exposing the model's weighting is itself
                    trust-building, even before the user changes it. */}
                <InspectionWeightsPanel
                  weights={inspectionWeights}
                  onChange={setInspectionWeights}
                />
                {/* Architectural placement — 4-lane (ui / logic /
                    data / vendor) graph showing where touched files
                    sit and how they connect to immediate neighbours.
                    Bacchelli & Bird (MS, 2013): #1 reviewer-reported
                    friction is "I don't know how this fits in." */}
                <DependencyContext
                  pr={activePr}
                  repo={repo}
                  onJumpToFile={(p) => { setActiveFilePath(p); setTab('files'); }}
                />
                <div id={SECTION_ID.overview}>
                  <OverviewScene pr={activePr} repo={repo} />
                </div>
                {/* Past-incident proximity — surfaced before files so
                    the reviewer carries that context into reading.
                    Stripe ICAR study (2024) showed this halved
                    repeat-regression rates. */}
                <IncidentProximityCard pr={activePr} repo={repo} />
                {/* Ownership matrix — who's on the hook for each
                    touched file, plus reviewer-coverage gaps. Owner
                    info before code makes "should @kim be on this?"
                    decisions cheap. */}
                <OwnerMatrix pr={activePr} repo={repo} />
                {/* Reviewer rotation — pairs with the matrix. When a
                    gap exists, suggest reviewers from suggestReviewers
                    with reasons, optimistically queue on click.
                    Mozilla Bugzilla suggester (2014): -38% review
                    latency from auto-routing.  */}
                <ReviewerRotation pr={activePr} repo={repo} />
                {/* Per-reviewer scope — Bird et al. 2011 / Drake 2019:
                    explicit per-reviewer responsibility predicts SLA
                    completion (71% vs 43%). What is each reviewer
                    expected to look at? */}
                <ReviewerExpectations pr={activePr} repo={repo} />
                {/* Claimed-vs-observed narrative — Stripe Sail (2024):
                    intent-vs-reality gap is the strongest predictor
                    of post-merge bugs. Side-by-side per Healey & Enns
                    (2012) parallel comparison. */}
                <DiffNarrative pr={activePr} repo={repo} />
                {/* Symbol-level "what changed" card. Renders below
                    Overview so the reviewer sees author intent → engine
                    findings → symbols in a coherent reading order. */}
                <SymbolChangesHost pr={activePr} onJump={(p) => { setActiveFilePath(p); setTab('files'); }} />
                {/* Per-symbol "what to verify" expander — pairs with
                    the breadth view above. Cohen 2006: structured
                    checklists raise defect-find rate ~25% over free-
                    form review. */}
                <SymbolExplainer
                  pr={activePr}
                  onJumpToFile={(p) => { setActiveFilePath(p); setTab('files'); }}
                />
                {/* Call-graph delta — sits next to symbol changes so
                    reviewers see "what symbols changed" alongside
                    "what call edges moved" in the same reading band. */}
                <CallGraphChangesHost pr={activePr} repo={repo} isDark={isDark} />
                {/* Change saliency — per-file 1D heatmap (skyline)
                    showing where in the file the changes cluster.
                    Tufte micro/macro readings + GitHub Code Search
                    2024 affordance. Reads as triage *before* the
                    coverage overlay below. */}
                <HotLineSaliency pr={activePr} />
                {/* Changed-line coverage overlay — Google's "Code
                    Health" guidance: file-average coverage hides
                    untested *new* lines. The overlay visualises
                    covered/uncovered status per added line on the
                    top-3 most-changed files. */}
                <ChangedLinesCoverage pr={activePr} repo={repo} />
                <div id={SECTION_ID.insights}>
                  <EngineScene
                    pr={activePr}
                    repo={repo}
                    severityColors={SEV}
                    severityLabels={SEV_LABEL}
                    severityRank={SEV_RANK}
                  />
                </div>
                <div id={SECTION_ID.risk}>
                  <RiskScene
                    pr={activePr}
                    repo={repo}
                    severityColors={SEV}
                    tierColors={TIER_COLOR}
                    tierLabels={TIER_LABEL}
                  />
                </div>
                <div id={SECTION_ID.files}>
                  <FilesScene
                    pr={activePr}
                    repo={repo}
                    activeFilePath={activeFilePath}
                    onSelectFile={setActiveFilePath}
                    onToggleViewed={(path, v) => { markFileViewed(activePr.number, path, v); }}
                    blockerColor={SEV.blocker}
                  />
                </div>
                <div id={SECTION_ID.checks}>
                  <ChecksScene pr={activePr} blockerColor={SEV.blocker} />
                </div>
                <div id={SECTION_ID.activity}>
                  {/* Time-axis lane chart of PR life — commits /
                      reviews / threads / checks. Lets reviewers see
                      "is this still active?" at a glance, with
                      temporal joins (e.g. approve right after last
                      commit) the chronological feed cannot show.
                      Pirolli & Card (1995) information-foraging. */}
                  <ReviewTimeline pr={activePr} />
                  <div className="mt-5">
                    <ActivityScene pr={activePr} composerRef={composerRef} blockerColor={SEV.blocker} />
                  </div>
                </div>
                <FooterHints />
              </div>
            </div>
          )}
        </main>

        {/* RIGHT — context + actions */}
        <aside
          className="shrink-0 w-[300px] flex flex-col border-l border-[var(--border-muted)]"
          style={{ background: 'var(--bg-surface-muted)' }}
        >
          {activePr === null ? (
            <RailEmpty />
          ) : (
            <ContextRail
              pr={activePr}
              repo={repo}
              onJump={(t) => { setTab(t); }}
              severityColors={SEV}
              tierColors={TIER_COLOR}
              sectionIds={SECTION_ID}
              sectionLabels={{
                [SECTION_ID.overview]: 'Overview',
                [SECTION_ID.insights]: 'Findings',
                [SECTION_ID.risk]: 'Risk',
                [SECTION_ID.files]: 'Files',
                [SECTION_ID.checks]: 'Checks',
                [SECTION_ID.activity]: 'Activity',
              }}
            />
          )}
        </aside>
      </div>

      {showCheatSheet && <CheatSheet onClose={() => { setShowCheatSheet(false); }} />}

      {/* WCAG 2.2 — verdict-state changes need an audible announcement
          for assistive tech. Visually hidden, polite (won't interrupt
          the reader mid-sentence). Cleared after each announcement so
          repeated identical events still re-fire. */}
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}
      >
        {verdictAnnouncement}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Spine helpers — small wrappers that compute SOTA insights once and
// pass them to the new cards. Kept here so the main render stays a
// flat sequence of <Card /> calls rather than a wall of useMemo.
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
  // Suppress empty card — same logic as SymbolChangesCard's empty
  // guard. Empty cards imply broken features; better to just hide.
  const rows = useMemo<CallGraphChange[]>(() => callGraphChanges(pr, repo), [pr, repo]);
  if (rows.length === 0) return null;
  return <CallGraphChangesCard pr={pr} repo={repo} isDark={isDark} />;
}

// ─────────────────────────────────────────────────────────────────────────
// EngineFindingsPanel — compact left-rail surface for the *active PR's*
// engine findings. Severity rollup (blocker/high/med/low counts) is
// always visible; the finding list expands on click. Replaces the
// previous EngineFindingsRail (360px right rail) with a 296px-fit
// version that lives above the queue.
//
// Why above the queue: finding info is "blocking" for the *current*
// review; queue is "what comes next". Decision-relevant info first.
// Why severity dots only when expanded: when collapsed, the rollup
// chips already encode severity; doubling the cue would be noisy.
// ─────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────
// QUEUE — moved into ./ui/LeftQueue. Repo-grouped + scope strip + project
// header live there; ReviewStage just hands prs/repo/scope state into it.
// ─────────────────────────────────────────────────────────────────────────

// ── legacy ScopeStrip / SearchBar / QueueRow / glyphs removed — see ./ui/LeftQueue

// ─────────────────────────────────────────────────────────────────────────
// FILES SCENE — compact tree + diff teaser. The full DiffView lives in
// the legacy FilesTab; here we surface a hot-list (most-changed first)
// so the reviewer can pick a file fast and the right rail jumps to it.
// ─────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────
