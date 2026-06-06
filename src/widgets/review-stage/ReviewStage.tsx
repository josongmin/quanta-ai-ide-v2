import { useTheme } from '@shared/theme/ThemeContext';
import { useReviewPageState } from './model/useReviewPageState';
import { SEV } from './lib/severityColors';
import CommandPalette from './ui/CommandPalette';
import { CheatSheet, EmptyState } from './ui/ReviewChromeBits';
import { AmbientLayer, StatusBar } from './ui/ReviewShellChrome';
import QueuePanel from './parts/QueuePanel';
import ContextPanel from './parts/ContextPanel';
import ReviewSpine from './parts/ReviewSpine';

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
//
// This component is a thin layout/composition container: every store
// read/write, local state, derived value and keyboard binding lives in
// `useReviewPageState`; the three columns are composed from `parts/`.
// ─────────────────────────────────────────────────────────────────────────

export default function ReviewStage() {
  const { isDark } = useTheme();
  const s = useReviewPageState();

  return (
    <div
      data-review-theme={isDark ? 'dark' : 'light'}
      className="absolute inset-0 overflow-hidden flex flex-col"
      style={{ backgroundColor: 'var(--bg-stage)' }}
    >
      <AmbientLayer />
      <StatusBar prs={s.prs} repo={s.repo} viewerLogin={s.viewerLogin} severityColors={SEV} />

      {/* Cmd/Ctrl-K palette — mounted at the surface root so the
          shortcut works from anywhere. Renders nothing until opened. */}
      {s.activePr !== null && (
        <CommandPalette
          pr={s.activePr}
          repo={s.repo}
          onJumpToFile={s.jumpToFile}
          onJumpToFindings={() => { s.setTab('insights'); }}
        />
      )}

      <div className="relative flex-1 min-h-0 flex">
        <QueuePanel
          prs={s.prs}
          repo={s.repo}
          activePr={s.activePr}
          setActivePr={s.setActivePr}
          viewerLogin={s.viewerLogin}
          query={s.query}
          onQueryChange={s.setQuery}
          scope={s.scope}
          onScopeChange={s.setScope}
          onJumpToFindings={() => { s.setTab('insights'); }}
        />

        <main className="flex-1 min-w-0 relative">
          {s.activePr === null ? (
            <EmptyState />
          ) : (
            <ReviewSpine
              pr={s.activePr}
              repo={s.repo}
              allPrs={s.prs}
              isDark={isDark}
              sectionIds={s.sectionIds}
              activeFilePath={s.activeFilePath}
              inspectionWeights={s.inspectionWeights}
              onChangeWeights={s.setInspectionWeights}
              onSelectFile={s.setActiveFilePath}
              onToggleViewed={(path, v) => { s.markFileViewed(s.activePr!.number, path, v); }}
              onJumpToFile={s.jumpToFile}
              scrollerRef={s.scrollerRef}
              composerRef={s.composerRef}
            />
          )}
        </main>

        <ContextPanel
          pr={s.activePr}
          repo={s.repo}
          sectionIds={s.sectionIds}
          onJump={s.setTab}
        />
      </div>

      {s.showCheatSheet && <CheatSheet onClose={s.closeCheatSheet} />}

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
        {s.verdictAnnouncement}
      </span>
    </div>
  );
}
