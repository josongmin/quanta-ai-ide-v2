import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  Activity, AlertTriangle, ArrowUpRight, Bot, Check, CheckCircle2,
  ChevronRight, Clock, Eye, FileCode, FileMinus, FilePlus, FileSymlink,
  GitBranch, GitMerge, GitPullRequest, Inbox, KeyRound, Loader2, MessageSquare,
  MinusCircle, Play, RefreshCw, Repeat, Search, Send, ShieldAlert,
  ShieldCheck, ShieldX, Sparkles, Squircle, User, Users, Wand2, X,
  type LucideIcon,
} from 'lucide-react';
import { useFilterStore } from '@features/filter-files';
import { useTheme } from '@shared/theme/ThemeContext';
import { useTranslation } from '@shared/i18n';
import { useDialogA11y } from '@shared/ui';
import {
  computePrRisk, coverageDeltas, displayName, engineFindings, engineSummary,
  failedTestsRow, findPerson, summariseChecks, summariseConversation,
  suggestReviewers,
  type CheckRun, type CheckStatus, type ChangeKind, type EngineFinding,
  type EngineSeverity, type FileDiff, type PrStatus,
  type PullRequest, type ReviewerState, type RiskTier,
} from '@entities/pr';
import type { RepoData } from '@entities/repo';
import {
  Avatar, useActivePr, useReviewStore, viewerLogin,
} from '@features/review-pr';
import { useReviewKeyboard } from './lib/keyboard';

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

const PAGE_BG = '#0d1117';
const SEV: Record<EngineSeverity, string> = {
  blocker: '#c25a55', high: '#d98a85', medium: '#a8893a', low: '#5a8fce',
};
const SEV_LABEL: Record<EngineSeverity, string> = {
  blocker: 'Blocker', high: 'High', medium: 'Medium', low: 'Low',
};
const TIER_COLOR: Record<RiskTier, string> = {
  safe: '#4f9a5c', attention: '#a8893a', critical: '#c25a55',
};
const TIER_LABEL: Record<RiskTier, string> = {
  safe: 'Ready', attention: 'Review', critical: 'Caution',
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
  const { t } = useTranslation('app');
  const repo = useFilterStore((s) => s.repo);
  const prs = useReviewStore((s) => s.prs);
  const activePr = useActivePr();
  const setActivePr = useReviewStore((s) => s.setActivePr);
  const markFileViewed = useReviewStore((s) => s.markFileViewed);

  // Queue state — scope, search, sort.
  type Scope = 'mine-to-review' | 'my-prs' | 'team';
  const [scope, setScope] = useState<Scope>('mine-to-review');
  const [query, setQuery] = useState('');

  // Section state — used by keyboard hook to mimic tab API. We scroll
  // anchors instead of swapping panes.
  const [section, setSection] = useState<ReviewTabKey>('overview');
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  // Reviewer's queue (left rail order). Pre-filtered + risk-sorted.
  const queue = useMemo(() => {
    const q = query.trim().toLowerCase();
    return prs
      .filter((pr) => {
        if (scope === 'mine-to-review') {
          if (!pr.reviewers.some((r) => r.login === viewerLogin && r.state === 'pending')) return false;
        } else if (scope === 'my-prs') {
          if (pr.author !== viewerLogin) return false;
        }
        if (q.length === 0) return true;
        return pr.title.toLowerCase().includes(q)
          || pr.headBranch.toLowerCase().includes(q);
      })
      .map((pr) => ({ pr, risk: computePrRisk(pr, repo) }))
      .sort((a, b) => {
        const tierRank = { critical: 0, attention: 1, safe: 2 } as const;
        const t = tierRank[a.risk.tier] - tierRank[b.risk.tier];
        if (t !== 0) return t;
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

  useReviewKeyboard({
    visiblePrNumbersRef: visibleNumbersRef,
    activePrNumber: activePr?.number ?? null,
    setActivePrNumber: setActivePr,
    visibleFilePaths: activePr?.files.map((f) => f.path) ?? [],
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
    toggleCheatSheet: () => { setShowCheatSheet((v) => !v); },
    enabled: true,
  });

  return (
    <div
      data-review-theme={isDark ? 'dark' : 'light'}
      className="absolute inset-0 overflow-hidden flex flex-col"
      style={{ backgroundColor: isDark ? PAGE_BG : '#f4f6f9' }}
    >
      <AmbientLayer />
      <StatusBar prs={prs} repo={repo} viewerLogin={viewerLogin} />

      <div className="relative flex-1 min-h-0 flex">
        {/* LEFT — queue cockpit */}
        <aside className="shrink-0 w-[296px] flex flex-col border-r border-white/[0.06]">
          <ScopeStrip
            scope={scope}
            onScope={setScope}
            counts={{
              'mine-to-review': prs.filter((p) => p.reviewers.some((r) => r.login === viewerLogin && r.state === 'pending')).length,
              'my-prs':          prs.filter((p) => p.author === viewerLogin).length,
              'team':            prs.length,
            }}
          />
          <SearchBar value={query} onChange={setQuery} />
          <div className="flex-1 min-h-0 overflow-auto px-2 py-2 space-y-1">
            {queue.length === 0 && (
              <div className="px-2 py-8 text-center text-[11px] text-white/40">
                {t('review.empty.noMatches')}
              </div>
            )}
            {queue.map(({ pr, risk }) => (
              <QueueRow
                key={pr.number}
                pr={pr}
                risk={risk}
                active={pr.number === activePr?.number}
                onClick={() => { setActivePr(pr.number); }}
              />
            ))}
          </div>
          <div className="shrink-0 px-3 py-2 border-t border-white/[0.06] text-[10px] font-mono text-white/30 flex items-center justify-between">
            <span>{t('review.queue.hints')}</span>
            <span>{queue.length} PR{queue.length === 1 ? '' : 's'}</span>
          </div>
        </aside>

        {/* CENTER — verdict spine */}
        <main className="flex-1 min-w-0 relative">
          {activePr === null ? (
            <EmptyState />
          ) : (
            <div ref={scrollerRef} className="absolute inset-0 overflow-auto">
              <div className="relative px-6 py-5 flex flex-col gap-5 max-w-[1180px] mx-auto">
                <VerdictHero pr={activePr} repo={repo} />
                <DecisionPipeline pr={activePr} repo={repo} />
                <div id={SECTION_ID.overview}>
                  <OverviewScene pr={activePr} repo={repo} />
                </div>
                <div id={SECTION_ID.insights}>
                  <EngineScene pr={activePr} repo={repo} />
                </div>
                <div id={SECTION_ID.risk}>
                  <RiskScene pr={activePr} repo={repo} />
                </div>
                <div id={SECTION_ID.files}>
                  <FilesScene
                    pr={activePr}
                    activeFilePath={activeFilePath}
                    onSelectFile={setActiveFilePath}
                    onToggleViewed={(path, v) => { markFileViewed(activePr.number, path, v); }}
                  />
                </div>
                <div id={SECTION_ID.checks}>
                  <ChecksScene pr={activePr} />
                </div>
                <div id={SECTION_ID.activity}>
                  <ActivityScene pr={activePr} composerRef={composerRef} />
                </div>
                <FooterHints />
              </div>
            </div>
          )}
        </main>

        {/* RIGHT — context + actions */}
        <aside className="shrink-0 w-[300px] flex flex-col border-l border-white/[0.06]">
          {activePr === null ? (
            <RailEmpty />
          ) : (
            <ContextRail
              pr={activePr}
              repo={repo}
              onJump={(t) => { setTab(t); }}
            />
          )}
        </aside>
      </div>

      {showCheatSheet && <CheatSheet onClose={() => { setShowCheatSheet(false); }} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Ambient — radial aurora + scanline. Lifted from Admission v2 so the two
// surfaces feel like the same product. Anchored behind everything; very
// low alpha so cards still read as cards.
// ─────────────────────────────────────────────────────────────────────────

function AmbientLayer() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `
          radial-gradient(1200px 700px at -10% -10%, rgba(79,154,92,0.04), transparent 60%),
          radial-gradient(1100px 600px at 110% 0%, rgba(122,167,212,0.03), transparent 60%)
        `,
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Status bar — viewer-scoped queue stats as a static KPI strip. No
// scrolling tape, no blink. Just glanceable numbers in a fixed row.
// ─────────────────────────────────────────────────────────────────────────

type StatusItem = { label: string; value: string; tone?: 'block' | 'warn' | 'ok' };

function StatusBar({
  prs, repo, viewerLogin: viewer,
}: { prs: PullRequest[]; repo: RepoData; viewerLogin: string }) {
  const stats = useMemo(() => {
    const mineToReview = prs.filter((p) => p.reviewers.some(
      (r) => r.login === viewer && r.state === 'pending',
    ));
    const myPrs = prs.filter((p) => p.author === viewer);
    const myCritical = mineToReview.filter((p) => computePrRisk(p, repo).tier === 'critical').length;
    const conflicts = prs.filter((p) => p.hasConflicts).length;
    const failingCi = prs.filter((p) => summariseChecks(p.checks).required.failed > 0).length;
    return {
      mineToReview: mineToReview.length, myPrs: myPrs.length,
      myCritical, conflicts, failingCi,
    };
  }, [prs, repo, viewer]);

  const items: StatusItem[] = [
    { label: 'to review', value: String(stats.mineToReview), tone: stats.mineToReview > 0 ? 'warn' : 'ok' },
    { label: 'critical', value: String(stats.myCritical), tone: stats.myCritical > 0 ? 'block' : 'ok' },
    { label: 'failing CI', value: String(stats.failingCi), tone: stats.failingCi > 0 ? 'block' : 'ok' },
    { label: 'conflicts', value: String(stats.conflicts), tone: stats.conflicts > 0 ? 'warn' : 'ok' },
    { label: 'my PRs', value: String(stats.myPrs) },
  ];

  const toneColor = (t?: 'block' | 'warn' | 'ok'): string =>
    t === 'block' ? SEV.blocker
    : t === 'warn' ? SEV.medium
    : t === 'ok' ? '#5fa86c'
    : 'rgba(255,255,255,0.85)';

  return (
    <div
      className="shrink-0 h-7 flex items-center gap-4 px-3 border-b border-white/[0.06]"
      style={{ backgroundColor: '#0d1117' }}
    >
      <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-white/70">
        Review
      </span>
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-baseline gap-1.5">
          <span
            className="text-[11px] font-semibold tabular-nums"
            style={{ color: toneColor(it.tone) }}
          >
            {it.value}
          </span>
          <span className="text-[10px] text-white/45 lowercase">
            {it.label}
          </span>
        </span>
      ))}
      <span className="ml-auto text-[10px] font-mono text-white/35">@{viewer}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// QUEUE — left rail
// ─────────────────────────────────────────────────────────────────────────

// Scope tabs use a segmented-control pattern: a single pill track with a
// sliding indicator. Why: cuts perceived motion cost between Inbox/Mine/Team
// (one element animates, not three), and the indicator's left/width is the
// only visual cue to "where am I" — clearer than per-button outlines.
type ScopeKey = 'mine-to-review' | 'my-prs' | 'team';

function ScopeStrip({
  scope, onScope, counts,
}: {
  scope: ScopeKey;
  onScope: (s: ScopeKey) => void;
  counts: Record<ScopeKey, number>;
}) {
  const { t } = useTranslation('review');
  const items: { key: ScopeKey; label: string; icon: LucideIcon; hint: string }[] = [
    { key: 'mine-to-review', label: 'Inbox', icon: Inbox, hint: 'PRs awaiting your review' },
    { key: 'my-prs',         label: 'Mine',  icon: User,  hint: 'Pull requests you opened' },
    { key: 'team',           label: 'Team',  icon: Users, hint: 'All open PRs in this repo' },
  ];
  return (
    <div className="shrink-0 px-3 pt-3 border-b border-white/[0.06]">
      <div
        role="tablist"
        aria-label={t('search.scopeAria')}
        className="relative flex items-stretch gap-5"
      >
        {items.map((it) => {
          const active = scope === it.key;
          const Icon = it.icon;
          const n = counts[it.key];
          return (
            <button
              key={it.key}
              role="tab"
              aria-selected={active}
              aria-label={`${it.label} — ${it.hint}`}
              type="button"
              onClick={() => { onScope(it.key); }}
              className={`relative inline-flex items-center gap-1.5 pb-2 text-[12px] font-medium tracking-tight transition-colors outline-none focus-visible:text-white ${
                active ? 'text-white' : 'text-white/45 hover:text-white/70'
              }`}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={2} />
              <span>{it.label}</span>
              {n > 0 && (
                <span
                  className={`text-[10px] font-mono tabular-nums leading-none ${
                    active ? 'text-white/70' : 'text-white/35'
                  }`}
                >
                  {n}
                </span>
              )}
              {active && (
                <span
                  aria-hidden
                  className="absolute left-0 right-0 -bottom-px h-px bg-white/80"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SearchBar({ value, onChange }: { value: string; onChange: (s: string) => void }) {
  const { t } = useTranslation('review');
  const ref = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  // ⌘K / Ctrl+K to focus — standard convention (Linear, GitHub, Slack).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, []);

  return (
    <div className="shrink-0 px-3 pt-2 pb-2 border-b border-white/[0.06]">
      <div
        className={`flex items-center gap-2 px-2 h-8 border-b transition-colors ${
          focused ? 'border-white/30' : 'border-transparent hover:border-white/10'
        }`}
      >
        <Search className="w-3.5 h-3.5 text-white/40" strokeWidth={2} />
        <input
          ref={ref}
          value={value}
          onChange={(e) => { onChange(e.target.value); }}
          onFocus={() => { setFocused(true); }}
          onBlur={() => { setFocused(false); }}
          placeholder={t('search.placeholder')}
          className="flex-1 min-w-0 bg-transparent outline-none text-[12px] text-white/85 placeholder:text-white/30"
        />
        {value.length > 0 ? (
          <button
            type="button"
            aria-label={t('search.clearAria')}
            onClick={() => { onChange(''); ref.current?.focus(); }}
            className="shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-sm text-white/40 hover:text-white/70"
          >
            <X className="w-3 h-3" strokeWidth={2.5} />
          </button>
        ) : (
          <span className="shrink-0 hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono text-white/30 leading-none">
            ⌘K
          </span>
        )}
      </div>
    </div>
  );
}

function QueueRow({
  pr, risk, active, onClick,
}: {
  pr: PullRequest;
  risk: ReturnType<typeof computePrRisk>;
  active: boolean;
  onClick: () => void;
}) {
  const ci = summariseChecks(pr.checks);
  const myReviewer = pr.reviewers.find((r) => r.login === viewerLogin);
  const accent = TIER_COLOR[risk.tier];

  return (
    <button type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 transition-colors relative ${
        active ? 'bg-white/[0.05]' : 'hover:bg-white/[0.025]'
      }`}
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-0 bottom-0 w-[2px]"
          style={{ background: accent }}
        />
      )}
      <div className="flex items-start gap-2.5">
        <PrStatusDot status={pr.status} />
        <div className="flex-1 min-w-0">
          {/* Row 1: title + number — primary scan target */}
          <div className="flex items-baseline gap-2">
            <div className={`flex-1 min-w-0 text-[12.5px] font-semibold leading-snug truncate ${
              active ? 'text-white' : 'text-white/85'
            }`}>
              {pr.title}
            </div>
            <span className="text-[10px] font-mono shrink-0 text-white/35">
              #{pr.number}
            </span>
          </div>

          {/* Row 2: meta — time, diff, CI. Single muted register. */}
          <div className="mt-1 flex items-center gap-2.5 text-[10.5px] text-white/50">
            <span className="font-mono tabular-nums">{timeAgo(pr.updatedAt)}</span>
            <span className="font-mono tabular-nums">
              <span className="text-emerald-400/80">+{pr.added}</span>
              <span className="text-white/25 mx-0.5">·</span>
              <span className="text-rose-400/80">−{pr.removed}</span>
            </span>
            <CiStripe ci={ci} />
            {myReviewer && <ReviewerStateGlyph state={myReviewer.state} mine />}
          </div>

          {/* Row 3: tier + risk signals — only present when meaningful */}
          {(risk.tier !== 'safe' || risk.blastSum > 0 || risk.sastFindings > 0) && (
            <div className="mt-1.5 flex items-center gap-2 text-[10px]">
              <span
                className="inline-flex items-center gap-1 font-semibold tracking-tight"
                style={{ color: accent }}
              >
                <span className="w-1 h-1 rounded-full" style={{ background: accent }} />
                {TIER_LABEL[risk.tier]}
              </span>
              {risk.blastSum > 0 && (
                <span className="font-mono tabular-nums text-white/40">
                  blast {risk.blastSum}
                </span>
              )}
              {risk.sastFindings > 0 && (
                <span className="font-mono tabular-nums" style={{ color: SEV.blocker }}>
                  sast {risk.sastFindings}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

const STATUS_DOT_BG: Record<PrStatus, string> = {
  draft: 'bg-zinc-400',
  open: 'bg-emerald-500',
  'changes-requested': 'bg-rose-400',
  approved: 'bg-emerald-400',
  merged: 'bg-violet-500',
  closed: 'bg-zinc-500',
};

function PrStatusDot({ status }: { status: PrStatus }) {
  return <span className={`mt-1.5 inline-block w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT_BG[status]}`} />;
}

function CiStripe({ ci }: { ci: ReturnType<typeof summariseChecks> }) {
  const total = ci.required.passed + ci.required.failed + ci.required.pending;
  if (total === 0) return null;
  const segs = [
    { key: 'p', w: ci.required.passed,  bg: '#5fa86c' },
    { key: 'r', w: ci.required.pending, bg: '#a8893a' },
    { key: 'f', w: ci.required.failed,  bg: '#c25a55' },
  ].filter((s) => s.w > 0);
  return (
    <span
      title={`CI: ${String(ci.required.passed)}✓ ${String(ci.required.pending)}⏱ ${String(ci.required.failed)}✕`}
      className="inline-flex h-1.5 w-8 rounded-sm overflow-hidden bg-white/5"
    >
      {segs.map((s) => (
        <span key={s.key} style={{ background: s.bg, flexGrow: s.w }} className="h-full" />
      ))}
    </span>
  );
}

function ReviewerStateGlyph({ state, mine = false }: { state: ReviewerState; mine?: boolean }) {
  const meta = REVIEWER_GLYPH[state];
  return (
    <span
      title={mine ? `You: ${state}` : state}
      className="inline-flex items-center justify-center"
      style={{ color: meta.color }}
    >
      <meta.Icon className="w-3 h-3" />
    </span>
  );
}

const REVIEWER_GLYPH: Record<ReviewerState, { Icon: LucideIcon; color: string }> = {
  pending:             { Icon: Clock,         color: '#8b949e' },
  approved:            { Icon: Check,         color: '#5fa86c' },
  'changes-requested': { Icon: X,             color: '#c25a55' },
  commented:           { Icon: MessageSquare, color: '#8b949e' },
};

// ─────────────────────────────────────────────────────────────────────────
// HERO — verdict aurora, big tier word, action stack.
// ─────────────────────────────────────────────────────────────────────────

function VerdictHero({ pr, repo }: { pr: PullRequest; repo: RepoData }) {
  const risk = useMemo(() => computePrRisk(pr, repo), [pr, repo]);
  const findings = useMemo(() => engineFindings(pr, repo), [pr, repo]);
  const summary = useMemo(() => engineSummary(findings), [findings]);
  const ci = useMemo(() => summariseChecks(pr.checks), [pr.checks]);
  const threads = useMemo(() => summariseConversation(pr), [pr]);

  const verdict: 'ready' | 'review' | 'block' =
    summary.blocker > 0 || ci.required.failed > 0 || pr.hasConflicts
      ? 'block'
      : risk.tier === 'critical' || summary.high > 0
        ? 'review'
        : 'ready';
  const accent = verdict === 'block' ? SEV.blocker
    : verdict === 'review' ? SEV.medium
    : '#5fa86c';
  const Icon = verdict === 'ready' ? ShieldCheck
    : verdict === 'review' ? ShieldAlert : ShieldX;
  const verdictLabel = verdict === 'ready' ? 'READY'
    : verdict === 'review' ? 'NEEDS REVIEW' : 'BLOCKED';

  const submitReview = useReviewStore((s) => s.submitReview);
  const myReviewer = pr.reviewers.find((r) => r.login === viewerLogin);
  const canDecide = myReviewer !== undefined && pr.status !== 'merged' && pr.status !== 'closed';

  return (
    <V2Card className="relative overflow-hidden">
      {/* Subtle accent wash — static, no motion. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(60% 100% at 4% 50%, ${accent}24 0%, transparent 65%)`,
        }}
      />

      <div className="relative p-6 flex items-center gap-6">
        {/* Static plaque */}
        <div
          className="shrink-0 w-16 h-16 rounded-xl flex items-center justify-center"
          style={{
            background: `${accent}1a`,
            border: `1px solid ${accent}55`,
          }}
        >
          <Icon className="w-7 h-7" style={{ color: accent }} />
        </div>

        {/* Headline */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
              pull request · #{pr.number}
            </span>
            <PrStatusPill status={pr.status} />
          </div>
          <div className="flex items-baseline gap-4 flex-wrap">
            <span
              className="text-[32px] font-black uppercase tracking-tight leading-none"
              style={{ color: accent }}
            >
              {verdictLabel}
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-bold text-white/85 truncate max-w-[520px]" title={pr.title}>
                {pr.title}
              </span>
              <span className="text-[10px] font-mono text-white/40 mt-0.5 flex items-center gap-1.5">
                <GitBranch className="w-3 h-3" />
                {pr.baseBranch} ← {pr.headBranch}
                <span className="text-white/30">·</span>
                @{pr.author}
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-4 flex-wrap">
            <HeroStat label="blocker" value={summary.blocker} color={summary.blocker > 0 ? SEV.blocker : undefined} />
            <Sep />
            <HeroStat label="high"    value={summary.high}    color={summary.high > 0 ? SEV.high : undefined} />
            <Sep />
            <HeroStat label="ci fail" value={ci.required.failed} color={ci.required.failed > 0 ? SEV.blocker : undefined} />
            <Sep />
            <HeroStat label="threads" value={threads.length} color={threads.length > 0 ? SEV.medium : undefined} />
            <Sep />
            <HeroStat label="auto-fix" value={summary.autoFix} color={summary.autoFix > 0 ? '#5a8fce' : undefined} />
          </div>
        </div>

        {/* Action stack */}
        <div className="shrink-0 flex flex-col gap-2 min-w-[160px]">
          <button
            type="button"
            disabled={!canDecide}
            onClick={() => { submitReview(pr.number, 'approve', 'Looks good!', viewerLogin); }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[rgba(79,154,92,0.18)] disabled:opacity-40"
            style={{
              background: 'rgba(79,154,92,0.12)',
              border: '1px solid rgba(79,154,92,0.45)',
            }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approve
          </button>
          <button
            type="button"
            disabled={!canDecide}
            onClick={() => { submitReview(pr.number, 'request-changes', 'Please address findings.', viewerLogin); }}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.18em] text-white/85 hover:text-white transition-colors disabled:opacity-40"
            style={{
              background: 'rgba(194,90,85,0.10)',
              border: '1px solid rgba(194,90,85,0.40)',
            }}
          >
            <X className="w-3 h-3" />
            Request changes
          </button>
          <button
            type="button"
            disabled={!canDecide}
            onClick={() => { submitReview(pr.number, 'comment', 'Comment.', viewerLogin); }}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.18em] text-white/55 hover:text-white transition-colors disabled:opacity-40"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.10)',
            }}
          >
            <MessageSquare className="w-3 h-3" />
            Comment
          </button>
        </div>
      </div>
    </V2Card>
  );
}

function PrStatusPill({ status }: { status: PrStatus }) {
  const map: Record<PrStatus, { label: string; color: string }> = {
    draft:               { label: 'Draft',     color: '#8b949e' },
    open:                { label: 'Open',      color: '#5fa86c' },
    'changes-requested': { label: 'Changes',   color: '#c25a55' },
    approved:            { label: 'Approved',  color: '#5fa86c' },
    merged:              { label: 'Merged',    color: '#9583b8' },
    closed:              { label: 'Closed',    color: '#8b949e' },
  };
  const m = map[status];
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.18em]"
      style={{ background: `${m.color}22`, color: m.color }}
    >
      {m.label}
    </span>
  );
}

function HeroStat({
  label, value, color,
}: { label: string; value: number; color?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span
        className="text-[22px] font-black tabular-nums leading-none"
        style={{ color: color ?? 'rgba(255,255,255,0.85)' }}
      >
        {value}
      </span>
      <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/40">
        {label}
      </span>
    </div>
  );
}

function Sep() { return <span className="w-px h-6 bg-white/10" />; }

function V2Card({
  className = '', children, style,
}: {
  className?: string; children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${className}`}
      style={{
        backgroundColor: 'rgba(13, 17, 23, 0.78)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(22px) saturate(160%)',
        WebkitBackdropFilter: 'blur(22px) saturate(160%)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────
// DECISION PIPELINE — gates → mergeable. Inspired by the way GitLab's
// merge-request widget shows status, but as a horizontal ribbon so the
// reviewer sees *which* gate is failing without scrolling.
// ─────────────────────────────────────────────────────────────────────────

type GateState = 'pass' | 'warn' | 'fail' | 'pending' | 'idle';

function DecisionPipeline({ pr, repo }: { pr: PullRequest; repo: RepoData }) {
  const ci = summariseChecks(pr.checks);
  const findings = engineFindings(pr, repo);
  const summary = engineSummary(findings);
  const risk = computePrRisk(pr, repo);
  const reviewersDone = pr.reviewers.length > 0
    && pr.reviewers.every((r) => r.state === 'approved' || r.state === 'commented');

  const gates: { key: string; label: string; state: GateState; detail: string }[] = [
    {
      key: 'lint',
      label: 'Lint',
      state: ci.required.failed > 0 ? 'fail' : ci.required.pending > 0 ? 'pending' : 'pass',
      detail: `${String(ci.required.passed)}✓ / ${String(ci.required.failed)}✕`,
    },
    {
      key: 'sast',
      label: 'SAST',
      state: summary.blocker > 0 ? 'fail' : summary.high > 0 ? 'warn' : 'pass',
      detail: summary.blocker > 0 ? `${String(summary.blocker)} blocker` : `${String(findings.length)} finding`,
    },
    {
      key: 'risk',
      label: 'Risk',
      state: risk.tier === 'critical' ? 'fail' : risk.tier === 'attention' ? 'warn' : 'pass',
      detail: TIER_LABEL[risk.tier],
    },
    {
      key: 'cov',
      label: 'Coverage',
      state: risk.avgCoverage === null ? 'idle'
        : risk.avgCoverage >= 0.7 ? 'pass'
        : risk.avgCoverage >= 0.5 ? 'warn'
        : 'fail',
      detail: risk.avgCoverage === null ? '—' : `${String(Math.round(risk.avgCoverage * 100))}%`,
    },
    {
      key: 'review',
      label: 'Reviewers',
      state: reviewersDone ? 'pass' : pr.reviewers.length === 0 ? 'idle' : 'pending',
      detail: `${String(pr.reviewers.filter((r) => r.state === 'approved').length)}/${String(pr.reviewers.length)}`,
    },
    {
      key: 'merge',
      label: 'Mergeable',
      state: pr.hasConflicts ? 'fail' : 'pass',
      detail: pr.hasConflicts ? 'conflicts' : `${String(pr.ahead)}↑${String(pr.behind)}↓`,
    },
  ];

  const stateColor = (s: GateState): string =>
    s === 'fail' ? SEV.blocker : s === 'warn' ? SEV.medium : s === 'pass' ? '#5fa86c'
      : s === 'pending' ? '#5a8fce' : '#8b949e';

  return (
    <V2Card className="px-4 py-3">
      <div className="flex items-center gap-1.5 mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
        <Activity className="w-3 h-3" />
        Merge pipeline
        <span className="ml-auto text-[10px] font-mono text-white/40">
          {gates.filter((g) => g.state === 'pass').length}/{gates.length} gates clear
        </span>
      </div>
      <div className="flex items-stretch gap-0">
        {gates.map((g, i) => {
          const c = stateColor(g.state);
          return (
            <div key={g.key} className="flex items-center flex-1 min-w-0">
              <div
                className="flex-1 min-w-0 rounded-lg px-2.5 py-2 relative overflow-hidden"
                style={{
                  background: `linear-gradient(140deg, ${c}1a, ${c}06)`,
                  border: `1px solid ${c}40`,
                }}
              >
                <div className="flex items-center gap-1.5">
                  <GateGlyph state={g.state} color={c} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/85">
                    {g.label}
                  </span>
                </div>
                <div className="mt-0.5 text-[10px] font-mono tabular-nums truncate" style={{ color: c }}>
                  {g.detail}
                </div>
              </div>
              {i < gates.length - 1 && (
                <div className="shrink-0 w-3 flex items-center justify-center">
                  <span className="block w-2 h-px bg-white/15" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </V2Card>
  );
}

function GateGlyph({ state, color }: { state: GateState; color: string }) {
  if (state === 'pass')    return <CheckCircle2 className="w-3 h-3" style={{ color }} />;
  if (state === 'fail')    return <X            className="w-3 h-3" style={{ color }} />;
  if (state === 'warn')    return <AlertTriangle className="w-3 h-3" style={{ color }} />;
  if (state === 'pending') return <Loader2     className="w-3 h-3 animate-spin" style={{ color }} />;
  return <MinusCircle className="w-3 h-3" style={{ color }} />;
}

// ─────────────────────────────────────────────────────────────────────────
// OVERVIEW SCENE — description, labels, suggested reviewers
// ─────────────────────────────────────────────────────────────────────────

function OverviewScene({ pr, repo }: { pr: PullRequest; repo: RepoData }) {
  const { t } = useTranslation('review');
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
      <V2Card className="p-5">
        <SceneHeader icon={GitPullRequest} title="Description" hint="markdown · author intent" />
        <div className="mt-3 text-[13px] leading-relaxed text-white/85 whitespace-pre-wrap break-words font-sans">
          {pr.description.trim().length === 0
            ? <span className="italic text-white/40">{t('empty.noDescription')}</span>
            : pr.description}
        </div>
        {pr.labels.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {pr.labels.map((l) => (
              <span
                key={l}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-mono bg-white/[0.04] border-white/10 text-white/70"
              >
                #{l}
              </span>
            ))}
          </div>
        )}
      </V2Card>

      <ReviewerSuggestionsCard pr={pr} repo={repo} />
    </div>
  );
}

function ReviewerSuggestionsCard({ pr, repo }: { pr: PullRequest; repo: RepoData }) {
  const { t } = useTranslation('review');
  const suggestions = useMemo(() => suggestReviewers(pr, repo, 3), [pr, repo]);
  return (
    <V2Card className="p-5">
      <SceneHeader icon={Users} title={t('section.suggestedReviewers')} hint={t('section.suggestedReviewersHint')} />
      {suggestions.length === 0 ? (
        <div className="mt-3 text-[12px] italic text-white/40">{t('empty.noSuggestions')}</div>
      ) : (
        <ul className="mt-3 space-y-2">
          {suggestions.map((s) => {
            const person = findPerson(s.login);
            const pct = Math.round(Math.max(0, Math.min(1, s.score)) * 100);
            return (
              <li key={s.login} className="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-white/[0.025]">
                <Avatar login={s.login} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold text-white/85 truncate">{person.display}</span>
                    <span className="text-[10px] font-mono text-white/40">@{s.login}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-white/40 truncate">
                    {s.reasons.join(' · ')}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0" title={`Match ${String(pct)}%`}>
                  <div className="h-[4px] w-[60px] rounded-full overflow-hidden bg-white/[0.08]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${String(pct)}%`,
                        background: '#4f9a5c',
                        boxShadow: 'none',
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-mono tabular-nums text-white/55">{pct}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </V2Card>
  );
}

function SceneHeader({
  icon: Icon, title, hint,
}: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-white/55" />
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
        {title}
      </span>
      {hint !== undefined && (
        <span className="text-[10px] font-mono text-white/40 ml-auto">{hint}</span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ENGINE SCENE — auto-review findings with inline auto-fix
// ─────────────────────────────────────────────────────────────────────────

function EngineScene({ pr, repo }: { pr: PullRequest; repo: RepoData }) {
  const { t } = useTranslation('review');
  const findings = useMemo(() => engineFindings(pr, repo), [pr, repo]);
  const summary = useMemo(() => engineSummary(findings), [findings]);
  const [filter, setFilter] = useState<'all' | EngineSeverity>('all');
  const visible = filter === 'all' ? findings : findings.filter((f) => f.severity === filter);

  return (
    <V2Card className="p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Bot className="w-3.5 h-3.5 text-[#5a8fce]" />
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
            p0 engine · auto-review
          </span>
          <span className="text-[10px] font-mono text-white/40">
            static · deterministic · cached
          </span>
        </div>
        {summary.autoFix > 0 && (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[11px] font-bold transition-colors text-black"
            style={{
              background: 'linear-gradient(140deg, #7aa7d4, #5a8fce)',
              boxShadow: 'none',
            }}
          >
            <Wand2 className="w-3 h-3" />
            Apply {summary.autoFix} fix{summary.autoFix === 1 ? '' : 'es'} in batch
          </button>
        )}
      </div>

      {/* Severity filter chips */}
      <div className="mt-3 flex items-center gap-1 flex-wrap">
        <SevChip
          label={`All ${String(findings.length)}`}
          active={filter === 'all'}
          color="#8b949e"
          onClick={() => { setFilter('all'); }}
        />
        {(['blocker', 'high', 'medium', 'low'] as EngineSeverity[]).map((sev) => (
          <SevChip
            key={sev}
            label={`${SEV_LABEL[sev]} ${String(summary[sev])}`}
            active={filter === sev}
            color={SEV[sev]}
            onClick={() => { setFilter(sev); }}
          />
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center text-center px-4 py-10 rounded-lg border border-dashed border-white/10">
          <ShieldCheck className="w-5 h-5 mb-2 text-white/30" />
          <div className="text-[12px] font-bold text-white/40">{t('empty.noFindings')}</div>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {visible.map((f) => (
            <FindingRow key={f.id} f={f} />
          ))}
        </ul>
      )}
    </V2Card>
  );
}

function SevChip({
  label, active, color, onClick,
}: { label: string; active: boolean; color: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 h-6 rounded-md text-[10px] font-bold uppercase tracking-[0.18em] transition-colors"
      style={{
        background: active ? `${color}26` : 'rgba(255,255,255,0.04)',
        color: active ? color : 'rgba(255,255,255,0.55)',
        border: active ? `1px solid ${color}77` : '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label}
    </button>
  );
}

function FindingRow({ f }: { f: EngineFinding }) {
  const { t } = useTranslation('review');
  const c = SEV[f.severity];
  return (
    <li
      className="rounded-lg px-3 py-2.5 relative overflow-hidden transition-colors hover:bg-white/[0.02]"
      style={{
        background: `linear-gradient(140deg, ${c}10, transparent 60%)`,
        border: `1px solid ${c}30`,
      }}
    >
      <div aria-hidden className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ background: c }} />
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-[0.18em]" style={{ background: `${c}26`, color: c }}>
          {SEV_LABEL[f.severity]}
        </span>
        <span className="text-[10px] font-mono text-white/40 truncate">
          {f.category}/{f.rule}
        </span>
        <span className="ml-auto text-[10px] font-mono text-white/40 truncate" title={f.filePath}>
          {trimMid(f.filePath, 36)}{f.line !== null ? `:${String(f.line)}` : ''}
        </span>
      </div>
      <div className="text-[13px] font-bold leading-snug text-white/85">{f.title}</div>
      <div className="mt-0.5 text-[12px] leading-snug text-white/55">{f.body}</div>
      {f.autoFixable && f.fixRationale !== null && (
        <div className="mt-1 text-[11px] italic text-white/40">
          why safe — {f.fixRationale}
        </div>
      )}
      <div className="mt-2 flex items-center gap-2">
        {f.autoFixable ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 h-6 px-2.5 rounded-md text-[11px] font-bold transition-colors bg-[#5a8fce]/15 text-[#7aa7ff] hover:bg-[#5a8fce]/30"
          >
            <Wand2 className="w-2.5 h-2.5" />
            Auto-fix
          </button>
        ) : (
          <span className="text-[11px] text-white/40">{t('merge.needsManualReview')}</span>
        )}
        <button
          type="button"
          className="ml-auto inline-flex items-center gap-0.5 text-[11px] font-medium text-[#7aa7ff] hover:underline"
        >
          Jump to file
          <ArrowUpRight className="w-2.5 h-2.5" />
        </button>
      </div>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// RISK SCENE — profile + per-file table + coverage drops + failed tests
// ─────────────────────────────────────────────────────────────────────────

function RiskScene({ pr, repo }: { pr: PullRequest; repo: RepoData }) {
  const risk = useMemo(() => computePrRisk(pr, repo), [pr, repo]);
  const cov = useMemo(() => coverageDeltas(pr, repo), [pr, repo]);
  const tests = useMemo(() => failedTestsRow(pr), [pr]);
  const accent = TIER_COLOR[risk.tier];

  return (
    <V2Card className="p-5">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-3.5 h-3.5 text-white/55" />
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
          Risk profile
        </span>
        <span
          className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ background: `${accent}26`, color: accent }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
          {TIER_LABEL[risk.tier]}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <RiskStat label="Blast"      value={String(risk.blastSum)} accent={risk.blastSum >= 25 ? SEV.medium : null} />
        <RiskStat label="Public API" value={String(risk.publicApiCount)} accent={risk.publicApiCount > 0 ? SEV.medium : null} />
        <RiskStat label="Low safety" value={String(risk.lowSafetyCount)} accent={risk.lowSafetyCount > 0 ? SEV.medium : null} />
        <RiskStat label="SAST"       value={String(risk.sastFindings)}   accent={risk.sastFindings > 0 ? SEV.blocker : null} />
        <RiskStat label="Coverage"   value={risk.avgCoverage === null ? '—' : `${String(Math.round(risk.avgCoverage * 100))}%`} accent={risk.avgCoverage !== null && risk.avgCoverage < 0.5 ? SEV.medium : null} />
        <RiskStat label="Cyclic"     value={String(risk.cyclicCount)} accent={risk.cyclicCount > 0 ? SEV.medium : null} />
      </div>

      {risk.secretsRisk && (
        <div
          className="mt-3 flex items-center gap-2 px-3 py-2 rounded-md text-[12px]"
          style={{ background: `${SEV.blocker}1a`, color: SEV.blocker, border: `1px solid ${SEV.blocker}55` }}
        >
          <KeyRound className="w-3.5 h-3.5 shrink-0" />
          A changed file matched the secrets-likely heuristic. Treat with care.
        </div>
      )}

      {risk.reasons.length > 0 && (
        <div className="mt-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
            Why this score
          </div>
          <ul className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[12px] text-white/70">
            {risk.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span style={{ color: accent }}>▸</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Coverage drops */}
      {cov.length > 0 && (
        <div className="mt-5">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
            Coverage delta
          </div>
          <div className="mt-2 flex flex-col gap-1.5">
            {cov.map((r) => {
              const dropPct = Math.min(100, Math.max(0, r.drop));
              return (
                <div key={r.filePath} className="grid grid-cols-[1fr_auto] items-center gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-mono text-[11px] text-white/70">{r.filePath}</div>
                    <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: `${SEV.blocker}22` }}>
                      <div className="h-full" style={{ width: `${String(dropPct)}%`, background: SEV.blocker }} />
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2 font-mono text-[11px] tabular-nums">
                    <span className="text-white/40">{r.before}%</span>
                    <span className="text-white/30">→</span>
                    <span className="text-white/85">{r.after}%</span>
                    <span style={{ color: r.drop > 0 ? SEV.blocker : '#4f9a5c' }}>
                      {r.drop > 0 ? `-${String(r.drop)}pp` : `+${String(-r.drop)}pp`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tests !== null && (
        <div className="mt-5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
              Failed tests
            </span>
            <span
              className="ml-auto inline-flex items-center px-2 h-5 rounded-full text-[10px] font-mono tabular-nums"
              style={{ background: '#5fa86c22', color: '#5fa86c' }}
            >
              {tests.passed}/{tests.passed + tests.failed} passing
            </span>
          </div>
          {tests.failingNames.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {tests.failingNames.map((name) => (
                <li key={name} className="flex items-center justify-between gap-3 px-2 py-1 rounded-md bg-white/[0.025]">
                  <span className="font-mono text-[11px] truncate text-white/85">{name}</span>
                  <button
                    type="button"
                    className="shrink-0 inline-flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-bold bg-white/[0.06] text-white/70 hover:bg-white/[0.10]"
                  >
                    <Play className="w-3 h-3" />
                    Run
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </V2Card>
  );
}

function RiskStat({
  label, value, accent,
}: { label: string; value: string; accent: string | null }) {
  return (
    <div
      className="rounded-lg p-2.5"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid ${accent ?? 'rgba(255,255,255,0.06)'}`,
        boxShadow: 'none',
      }}
    >
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">{label}</div>
      <div
        className="mt-0.5 text-[18px] font-black tabular-nums leading-none"
        style={{ color: accent ?? 'rgba(255,255,255,0.92)' }}
      >
        {value}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// FILES SCENE — compact tree + diff teaser. The full DiffView lives in
// the legacy FilesTab; here we surface a hot-list (most-changed first)
// so the reviewer can pick a file fast and the right rail jumps to it.
// ─────────────────────────────────────────────────────────────────────────

function FilesScene({
  pr, activeFilePath, onSelectFile, onToggleViewed,
}: {
  pr: PullRequest;
  activeFilePath: string | null;
  onSelectFile: (path: string) => void;
  onToggleViewed: (path: string, viewed: boolean) => void;
}) {
  const { t } = useTranslation('review');
  const sorted = useMemo(() => [...pr.files].sort((a, b) => (b.added + b.removed) - (a.added + a.removed)), [pr.files]);
  const totalDelta = pr.added + pr.removed;
  const viewedCount = pr.files.filter((f) => f.viewed).length;

  return (
    <V2Card className="p-5">
      <div className="flex items-center gap-2">
        <FileCode className="w-3.5 h-3.5 text-white/55" />
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
          Files
        </span>
        <span className="text-[10px] font-mono text-white/40">
          {pr.files.length} files · {viewedCount} viewed · +{pr.added} / −{pr.removed}
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="mt-4 text-[12px] italic text-white/40">{t('empty.noFiles')}</div>
      ) : (
        <ul className="mt-3 space-y-1">
          {sorted.slice(0, 10).map((f) => (
            <FileScannerRow
              key={f.path}
              f={f}
              totalDelta={totalDelta}
              active={f.path === activeFilePath}
              onClick={() => { onSelectFile(f.path); }}
              onToggleViewed={() => { onToggleViewed(f.path, !f.viewed); }}
            />
          ))}
          {sorted.length > 10 && (
            <li className="px-2 py-1 text-[11px] font-mono text-white/40">
              +{String(sorted.length - 10)} more files…
            </li>
          )}
        </ul>
      )}
    </V2Card>
  );
}

function FileScannerRow({
  f, totalDelta, active, onClick, onToggleViewed,
}: {
  f: FileDiff;
  totalDelta: number;
  active: boolean;
  onClick: () => void;
  onToggleViewed: () => void;
}) {
  const total = f.added + f.removed;
  const ratio = totalDelta > 0 ? Math.min(1, total / totalDelta) : 0;
  return (
    <li
      className={`flex items-center gap-2 pl-2 pr-2 py-1.5 rounded-md transition-colors ${
        active ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
      } ${f.viewed ? 'opacity-50' : ''}`}
    >
      <button type="button" onClick={onClick} className="flex-1 min-w-0 flex items-center gap-2 text-left">
        <FileKindIcon kind={f.kind} />
        <span className="text-[12px] font-mono truncate text-white/85">{f.path}</span>
      </button>
      <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-mono tabular-nums">
        <span className="text-emerald-500/85">+{f.added}</span>
        <span className="text-rose-500/85">−{f.removed}</span>
      </span>
      <div className="shrink-0 w-[80px] h-1.5 rounded-full overflow-hidden bg-white/[0.04]">
        <div className="h-full" style={{ width: `${String(Math.round(ratio * 100))}%`, background: 'linear-gradient(90deg, #5fa86c, #7aa7d4)' }} />
      </div>
      <button
        type="button"
        onClick={onToggleViewed}
        className="shrink-0 p-1 rounded-md text-white/40 hover:text-white/85"
        title={f.viewed ? 'Mark not viewed' : 'Mark viewed'}
      >
        <Eye className="w-3 h-3" />
      </button>
    </li>
  );
}

function FileKindIcon({ kind }: { kind: ChangeKind }) {
  if (kind === 'added')   return <FilePlus    className="w-3 h-3 text-emerald-500 shrink-0" />;
  if (kind === 'deleted') return <FileMinus   className="w-3 h-3 text-rose-500    shrink-0" />;
  if (kind === 'renamed') return <FileSymlink className="w-3 h-3 text-white/40 shrink-0" />;
  return <FileCode className="w-3 h-3 text-white/40 shrink-0" />;
}

// ─────────────────────────────────────────────────────────────────────────
// CHECKS SCENE — CI dashboard (compact rows)
// ─────────────────────────────────────────────────────────────────────────

function ChecksScene({ pr }: { pr: PullRequest }) {
  const { t } = useTranslation('review');
  if (pr.checks.length === 0) {
    return (
      <V2Card className="p-5">
        <SceneHeader icon={Activity} title="CI checks" />
        <div className="mt-3 text-[12px] italic text-white/40">{t('empty.noCi')}</div>
      </V2Card>
    );
  }
  return (
    <V2Card className="p-5">
      <SceneHeader icon={Activity} title="CI checks" hint={`${String(pr.checks.length)} runs`} />
      <ul className="mt-3 divide-y divide-white/[0.04]">
        {pr.checks.map((c) => (
          <CheckRow key={c.id} c={c} />
        ))}
      </ul>
    </V2Card>
  );
}

function CheckRow({ c }: { c: CheckRun }) {
  const meta = CHECK_META[c.status];
  return (
    <li className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-x-4 py-2">
      <div className="min-w-0">
        <div className="text-[12px] font-mono truncate text-white/85">{c.name}</div>
        {c.summary !== null && c.summary.length > 0 && (
          <div className="text-[11px] truncate text-white/40">{c.summary}</div>
        )}
      </div>
      <span
        className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.18em]"
        style={{
          background: c.required ? `${SEV.blocker}1a` : 'rgba(255,255,255,0.06)',
          color: c.required ? SEV.blocker : 'rgba(255,255,255,0.55)',
        }}
      >
        {c.required ? 'Required' : 'Optional'}
      </span>
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.18em]"
        style={{ background: `${meta.color}26`, color: meta.color }}
      >
        <meta.Icon className={`w-2.5 h-2.5 ${c.status === 'running' ? 'animate-spin' : ''}`} />
        {meta.label}
      </span>
      <span className="text-right text-[11px] font-mono tabular-nums text-white/40">
        {formatDuration(c.durationMs)}
      </span>
      <button
        type="button"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-white/[0.06] text-white/70 hover:bg-white/[0.10]"
      >
        <RefreshCw className="w-3 h-3" />
        Re-run
      </button>
    </li>
  );
}

const CHECK_META: Record<CheckStatus, { label: string; color: string; Icon: LucideIcon }> = {
  pending:   { label: 'Pending',   color: '#8b949e', Icon: Clock },
  running:   { label: 'Running',   color: '#a8893a', Icon: Loader2 },
  success:   { label: 'Success',   color: '#5fa86c', Icon: Check },
  failure:   { label: 'Failure',   color: '#c25a55', Icon: X },
  cancelled: { label: 'Cancelled', color: '#8b949e', Icon: MinusCircle },
  skipped:   { label: 'Skipped',   color: '#8b949e', Icon: MinusCircle },
};

// ─────────────────────────────────────────────────────────────────────────
// ACTIVITY SCENE — conversation + composer
// ─────────────────────────────────────────────────────────────────────────

function ActivityScene({
  pr, composerRef,
}: {
  pr: PullRequest;
  composerRef: React.MutableRefObject<HTMLTextAreaElement | null>;
}) {
  const { t: tr } = useTranslation('review');
  const postPrComment = useReviewStore((s) => s.postPrComment);
  const [draft, setDraft] = useState('');
  const send = () => {
    const txt = draft.trim();
    if (txt.length === 0) return;
    postPrComment(pr.number, txt, viewerLogin);
    setDraft('');
  };

  // Compact conversation rendering — we keep the surface in this file rather
  // than reusing ConversationLog so the dark tokens stay consistent. The
  // events list is short (≤ 20 typical), so a fresh implementation reads
  // cleaner than threading isDark+styles through the legacy widget.
  return (
    <V2Card className="p-5">
      <SceneHeader icon={MessageSquare} title="Activity" hint={`${String(pr.conversation.length)} events · ${String(pr.threads.reduce((n, t) => n + t.comments.length, 0))} thread comments`} />

      <ul className="mt-3 space-y-2">
        {pr.conversation.length === 0 ? (
          <li className="text-[12px] italic text-white/40">{tr('empty.noActivity')}</li>
        ) : (
          pr.conversation.map((it) => <ActivityRow key={it.id} item={it} />)
        )}
      </ul>

      <div className="mt-4 rounded-lg border border-white/10 p-3 bg-white/[0.02]">
        <textarea
          ref={composerRef}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); }}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); send(); }
          }}
          placeholder={tr('comment.placeholder')}
          rows={3}
          className="w-full px-2 py-1.5 rounded-md text-[12px] font-mono resize-y outline-none bg-white/[0.04] text-white/85 placeholder:text-white/30 border border-white/10"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] font-mono text-white/40">⌘↵ to send · r to focus</span>
          <button
            type="button"
            onClick={send}
            disabled={draft.trim().length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold transition-colors bg-white text-black disabled:bg-white/[0.06] disabled:text-white/30 disabled:cursor-not-allowed"
          >
            <Send className="w-3 h-3" />
            Comment
          </button>
        </div>
      </div>
    </V2Card>
  );
}

function ActivityRow({ item }: { item: PullRequest['conversation'][number] }) {
  if (item.kind === 'event') {
    return (
      <li className="flex items-center gap-2 text-[11px] text-white/55">
        <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
        <span className="font-mono text-[11px] text-white/40">@{item.actorLogin}</span>
        <span className="text-white/55">{item.detail}</span>
        <span className="ml-auto text-[10px] font-mono text-white/30">{timeAgo(item.createdAt)}</span>
      </li>
    );
  }
  const isReview = item.kind === 'review';
  const verdictColor = !isReview ? 'rgba(255,255,255,0.10)'
    : item.verdict === 'approve' ? '#5fa86c'
    : item.verdict === 'request-changes' ? SEV.blocker
    : '#8b949e';
  return (
    <li
      className="flex items-start gap-2 px-3 py-2 rounded-lg bg-white/[0.025]"
      style={{ borderLeft: `2px solid ${verdictColor}` }}
    >
      <Avatar login={item.authorLogin} size={20} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold text-white/85">{displayName(item.authorLogin)}</span>
          {isReview && (
            <span
              className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.18em]"
              style={{ background: `${verdictColor}22`, color: verdictColor }}
            >
              {item.verdict}
            </span>
          )}
          <span className="ml-auto text-[10px] font-mono text-white/40">{timeAgo(item.createdAt)}</span>
        </div>
        <div className="mt-0.5 text-[12px] leading-snug text-white/70 whitespace-pre-wrap break-words">
          {item.body}
        </div>
      </div>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// RIGHT RAIL — context (participants, branch, merge actions, jumps)
// ─────────────────────────────────────────────────────────────────────────

function ContextRail({
  pr, repo, onJump,
}: {
  pr: PullRequest;
  repo: RepoData;
  onJump: (t: ReviewTabKey) => void;
}) {
  const findings = useMemo(() => engineFindings(pr, repo), [pr, repo]);
  const summary = useMemo(() => engineSummary(findings), [findings]);
  const ci = useMemo(() => summariseChecks(pr.checks), [pr.checks]);
  const threads = useMemo(() => summariseConversation(pr), [pr]);

  const jumps: { key: ReviewTabKey; label: string; count: number; tone: string; Icon: LucideIcon }[] = [
    { key: 'insights', label: 'Findings',      count: findings.length, tone: summary.blocker > 0 ? SEV.blocker : summary.high > 0 ? SEV.high : '#8b949e', Icon: Bot },
    { key: 'risk',     label: 'Risk profile',  count: 0, tone: TIER_COLOR[computePrRisk(pr, repo).tier], Icon: ShieldAlert },
    { key: 'files',    label: 'Files',         count: pr.files.length, tone: '#8b949e', Icon: FileCode },
    { key: 'checks',   label: 'CI checks',     count: ci.required.failed, tone: ci.required.failed > 0 ? SEV.blocker : '#8b949e', Icon: Activity },
    { key: 'activity', label: 'Threads',       count: threads.length, tone: threads.length > 0 ? SEV.medium : '#8b949e', Icon: MessageSquare },
  ];

  return (
    <>
      <div className="shrink-0 h-11 flex items-center px-4 border-b border-white/[0.06]">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
          PR context
        </span>
        <span className="ml-auto text-[10px] font-mono text-white/40">#{pr.number}</span>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-4 space-y-5">
        {/* Quick jumps (replaces the old tab strip) */}
        <Section label="Jump to">
          <div className="grid grid-cols-1 gap-1">
            {jumps.map((j) => (
              <button
                key={j.key}
                type="button"
                onClick={() => { onJump(j.key); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/[0.04] transition-colors text-left"
              >
                <j.Icon className="w-3.5 h-3.5 shrink-0" style={{ color: j.tone }} />
                <span className="flex-1 text-[12px] text-white/70">{j.label}</span>
                {j.count > 0 && (
                  <span
                    className="text-[10px] font-mono tabular-nums px-1.5 rounded-full"
                    style={{ background: `${j.tone}22`, color: j.tone }}
                  >
                    {j.count}
                  </span>
                )}
                <ChevronRight className="w-3 h-3 text-white/30" />
              </button>
            ))}
          </div>
        </Section>

        <ParticipantsSection pr={pr} />
        <BranchSection pr={pr} />
        <MergeActionsSection pr={pr} />
      </div>

      <div className="shrink-0 px-4 py-3 border-t border-white/[0.06] text-[10px] font-mono text-white/30">
        @{pr.author} · #{pr.number}
      </div>
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
        {label}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function ParticipantsSection({ pr }: { pr: PullRequest }) {
  const { t } = useTranslation('review');
  return (
    <Section label="Participants">
      <Participant login={pr.author} role="author" />
      {pr.reviewers.map((r) => (
        <Participant key={r.login} login={r.login} role="reviewer" state={r.state} />
      ))}
      {pr.reviewers.length === 0 && (
        <div className="text-[11px] text-white/40">{t('empty.noReviewers')}</div>
      )}
    </Section>
  );
}

function Participant({
  login, role, state,
}: { login: string; role: 'author' | 'reviewer'; state?: ReviewerState }) {
  return (
    <div className="flex items-center gap-2">
      <Avatar login={login} size={20} />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] truncate text-white/85">@{login}</div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">{role}</div>
      </div>
      {state !== undefined && (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.18em]"
          style={{
            background: `${state === 'approved' ? '#5fa86c' : state === 'changes-requested' ? SEV.blocker : '#8b949e'}22`,
            color: state === 'approved' ? '#5fa86c' : state === 'changes-requested' ? SEV.blocker : '#8b949e',
          }}
        >
          {state === 'changes-requested' ? 'Changes' : state}
        </span>
      )}
    </div>
  );
}

function BranchSection({ pr }: { pr: PullRequest }) {
  const { t } = useTranslation('review');
  return (
    <Section label="Branch">
      <div className="flex items-center gap-1.5 text-[11px] font-mono text-white/85">
        <GitBranch className="w-3 h-3 shrink-0 opacity-70" />
        <span className="truncate">{pr.baseBranch}</span>
        <span className="text-white/40">←</span>
        <span className="truncate">{pr.headBranch}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-white/40">{t('merge.aheadBehind')}</span>
        <span className="text-[11px] font-mono tabular-nums">
          <span className="text-emerald-500">+{pr.ahead}</span>
          <span className="text-white/40"> / </span>
          <span className="text-rose-500">−{pr.behind}</span>
        </span>
      </div>
      {pr.hasConflicts && (
        <div
          className="flex items-center gap-1.5 mt-1 px-2 py-1 rounded-md text-[11px]"
          style={{ background: `${SEV.blocker}1a`, color: SEV.blocker, border: `1px solid ${SEV.blocker}55` }}
        >
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span>{t('merge.conflictsPresent')}</span>
        </div>
      )}
    </Section>
  );
}

function MergeActionsSection({ pr }: { pr: PullRequest }) {
  const mergePr = useReviewStore((s) => s.mergePr);
  const block = mergeBlocker(pr);
  const enabled = block === null;
  const buttons: { key: 'merge' | 'squash' | 'rebase'; label: string; Icon: LucideIcon }[] = [
    { key: 'merge',  label: 'Merge',  Icon: GitMerge },
    { key: 'squash', label: 'Squash', Icon: Squircle },
    { key: 'rebase', label: 'Rebase', Icon: Repeat },
  ];

  return (
    <Section label="Merge">
      <div className="grid grid-cols-3 gap-1.5">
        {buttons.map((b) => (
          <button
            key={b.key}
            type="button"
            disabled={!enabled}
            onClick={() => { mergePr(pr.number, b.key); }}
            className="inline-flex items-center justify-center gap-1 h-8 rounded-md text-[11px] font-bold transition-colors disabled:cursor-not-allowed"
            style={{
              background: enabled
                ? 'linear-gradient(140deg, rgba(79,154,92,0.22), rgba(79,154,92,0.06))'
                : 'rgba(255,255,255,0.04)',
              color: enabled ? '#9ee2a4' : 'rgba(255,255,255,0.30)',
              border: enabled ? '1px solid rgba(79,154,92,0.45)' : '1px solid rgba(255,255,255,0.06)',
            }}
            title={block ?? `${b.label} into ${pr.baseBranch}`}
          >
            <b.Icon className="w-3 h-3" />
            {b.label}
          </button>
        ))}
      </div>
      {block !== null && (
        <div className="mt-1 text-[11px] text-white/55">
          Blocked because {block}.
        </div>
      )}
    </Section>
  );
}

function mergeBlocker(pr: PullRequest): string | null {
  if (pr.status === 'merged') return 'this PR is already merged';
  if (pr.status === 'closed') return 'this PR is closed';
  if (pr.hasConflicts)        return 'the branch has unresolved conflicts';
  const blockingChecks = pr.checks.filter((c) => c.required && (
    c.status === 'failure' || c.status === 'cancelled' || c.status === 'pending' || c.status === 'running'
  ));
  if (blockingChecks.length > 0) {
    const names = blockingChecks.slice(0, 2).map((c) => c.name).join(', ');
    const more = blockingChecks.length > 2 ? ` (+${String(blockingChecks.length - 2)} more)` : '';
    return `required check${blockingChecks.length > 1 ? 's' : ''} ${names}${more} not passing`;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────
// EMPTY / FALLBACK
// ─────────────────────────────────────────────────────────────────────────

function EmptyState() {
  const { t } = useTranslation('app');
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
      <GitPullRequest className="w-8 h-8 text-white/30" />
      <div className="text-[13px] font-bold text-white/70">{t('review.empty.noPrTitle')}</div>
      <div className="text-[11px] max-w-[320px] text-white/40">
        {t('review.empty.noPrSubtitle')}
      </div>
    </div>
  );
}

function RailEmpty() {
  const { t } = useTranslation('app');
  return (
    <>
      <div className="shrink-0 h-11 flex items-center px-4 border-b border-white/[0.06]">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
          {t('review.rail.prContext')}
        </span>
      </div>
      <div className="flex-1 flex items-center justify-center text-[11px] text-white/40">
        {t('review.rail.nothingSelected')}
      </div>
    </>
  );
}

function FooterHints() {
  const { t } = useTranslation('app');
  return (
    <div className="flex items-center justify-between gap-3 mt-2 px-1 py-3 text-[10px] font-mono text-white/30 border-t border-white/[0.04]">
      <span>{t('review.footer.left')}</span>
      <span className="flex items-center gap-1">
        <Sparkles className="w-3 h-3" />
        {t('review.footer.right')}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// CHEAT SHEET
// ─────────────────────────────────────────────────────────────────────────

function CheatSheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('app');
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(dialogRef, true, onClose);
  const rows: { keys: string; desc: string }[] = [
    { keys: 'j / k',  desc: t('review.cheat.jk') },
    { keys: 'n / p',  desc: t('review.cheat.np') },
    { keys: 'v',      desc: t('review.cheat.v') },
    { keys: 'r',      desc: t('review.cheat.r') },
    { keys: 'g o',    desc: t('review.cheat.go') },
    { keys: 'g f',    desc: t('review.cheat.gf') },
    { keys: 'g r',    desc: t('review.cheat.gr') },
    { keys: 'g c',    desc: t('review.cheat.gc') },
    { keys: 'g a',    desc: t('review.cheat.ga') },
    { keys: '?',      desc: t('review.cheat.q') },
  ];
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/55" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('review.cheat.title', { defaultValue: 'Keyboard shortcuts' })}
        tabIndex={-1}
        className="min-w-[380px] max-w-[480px] rounded-2xl p-5 outline-none"
        style={{
          backgroundColor: 'rgba(13, 17, 23, 0.95)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        }}
        onClick={(e) => { e.stopPropagation(); }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-white/85">
            Keyboard
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] font-mono text-white/40 hover:text-white"
          >
            esc
          </button>
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
          {rows.map((r) => (
            <ShortcutRow key={r.keys} keys={r.keys} desc={r.desc} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ShortcutRow({ keys, desc }: { keys: string; desc: string }) {
  return (
    <>
      <span className="flex items-center gap-1">
        {keys.split(' ').map((k, i) => (
          <kbd
            key={`${keys}-${String(i)}`}
            className="px-1.5 h-5 inline-flex items-center justify-center rounded-md border text-[10px] font-mono bg-white/[0.06] text-white/85 border-white/10"
          >
            {k}
          </kbd>
        ))}
      </span>
      <span className="text-[12px] text-white/70">{desc}</span>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────

function trimMid(path: string, max: number): string {
  if (path.length <= max) return path;
  const tail = path.slice(-(max - 1));
  return `…${tail}`;
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${String(ms)}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = s / 60;
  if (m < 60) return `${m.toFixed(1)}m`;
  return `${(m / 60).toFixed(1)}h`;
}

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const diffMs = Date.now() - t;
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return `${String(sec)}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${String(min)}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${String(hr)}h`;
  const days = Math.round(hr / 24);
  if (days < 30) return `${String(days)}d`;
  return `${String(Math.round(days / 30))}mo`;
}
