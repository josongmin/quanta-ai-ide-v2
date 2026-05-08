import { useEffect, useMemo, useState } from 'react';
import {
  Search, ChevronDown, ChevronRight, Check, Clock, MessageSquare, X,
  ArrowUpDown, type LucideIcon,
} from 'lucide-react';
import {
  summariseChecks, type CiSummary, type PrStatus, type PullRequest,
  type ReviewerState,
} from '@entities/pr';
import { useTranslation } from '@shared/i18n';
import { ResizeHandle } from '@shared/ui';
import { riskTierForPr, tierAccent } from './lib/risk-shared';
import { timeAgo } from './lib/format';

export const PR_RAIL_DEFAULT_WIDTH = 260;
export const PR_RAIL_MIN_WIDTH = 220;
export const PR_RAIL_MAX_WIDTH = 460;

// Left rail mirroring CodingStage.TaskRail. Adds review-specific affordances:
// a 3-way author/reviewer scope filter, a sort menu (risk / updated / size),
// and per-row signals (CI, risk dot, reviewer states).

export type PrScope = 'mine-to-review' | 'my-prs' | 'team';
export type PrSortKey = 'risk' | 'updated' | 'size';

type Props = {
  prs: PullRequest[];
  activeNumber: number | null;
  onSelect: (n: number) => void;
  scope: PrScope;
  onScopeChange: (s: PrScope) => void;
  query: string;
  onQueryChange: (q: string) => void;
  sortKey: PrSortKey;
  onSortChange: (s: PrSortKey) => void;
  viewerLogin: string;
  /** Static-analysis side, for risk-tier sorting. */
  repoForRisk: Parameters<typeof riskTierForPr>[1];
  isDark: boolean;
  /** Hook so the parent widget can know the post-filter, post-sort order
      (used for `j/k` keyboard navigation). Called once per render. */
  onVisibleChange?: (numbers: number[]) => void;
  width: number;
  onWidthChange: (next: number) => void;
};

export default function PrTicketRail({
  prs, activeNumber, onSelect, scope, onScopeChange,
  query, onQueryChange, sortKey, onSortChange,
  viewerLogin, repoForRisk, isDark, onVisibleChange,
  width, onWidthChange,
}: Props) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return prs.filter((pr) => {
      if (scope === 'mine-to-review') {
        const isReviewer = pr.reviewers.some(
          (r) => r.login === viewerLogin && r.state === 'pending',
        );
        if (!isReviewer) return false;
      } else if (scope === 'my-prs') {
        if (pr.author !== viewerLogin) return false;
      }
      if (q.length === 0) return true;
      return pr.title.toLowerCase().includes(q)
        || pr.headBranch.toLowerCase().includes(q)
        || pr.baseBranch.toLowerCase().includes(q);
    });
  }, [prs, query, scope, viewerLogin]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sortKey === 'risk') {
      // critical → attention → safe; ties broken by recency.
      const tierRank: Record<ReturnType<typeof riskTierForPr>, number> = {
        critical: 0,
        attention: 1,
        safe: 2,
      };
      arr.sort((a, b) => {
        const ta = tierRank[riskTierForPr(a, repoForRisk)];
        const tb = tierRank[riskTierForPr(b, repoForRisk)];
        if (ta !== tb) return ta - tb;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
    } else if (sortKey === 'updated') {
      arr.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } else {
      arr.sort((a, b) => (b.added + b.removed) - (a.added + a.removed));
    }
    return arr;
  }, [filtered, sortKey, repoForRisk]);

  const grouped = useMemo(() => ({
    open: sorted.filter((pr) =>
      pr.status === 'open'
      || pr.status === 'changes-requested'
      || pr.status === 'approved'),
    drafts: sorted.filter((pr) => pr.status === 'draft'),
    merged: sorted.filter((pr) =>
      pr.status === 'merged' || pr.status === 'closed'),
  }), [sorted]);

  // Surface visible order for keyboard nav. Effect-based so we don't write
  // during render. The parent receives a fresh array reference whenever the
  // sort/filter changes; otherwise the dependency is stable.
  const visibleNumbers = useMemo(() => sorted.map((p) => p.number), [sorted]);
  useEffect(() => {
    if (onVisibleChange) onVisibleChange(visibleNumbers);
  }, [onVisibleChange, visibleNumbers]);

  const { t } = useTranslation('review');
  const border = 'border-[color:var(--border-muted)]';
  const textMuted = 'text-[color:var(--fg-muted)]';
  const textFaint = 'text-[color:var(--fg-subtle)]';
  const inputBg = isDark ? 'bg-white/[0.04]' : 'bg-black/[0.03]';

  return (
    <aside
      className="relative shrink-0 flex flex-col"
      style={{
        width,
        backgroundColor: isDark ? 'rgba(8, 12, 20, 0.55)' : 'rgba(255, 255, 255, 0.55)',
        backdropFilter: 'blur(22px) saturate(160%)',
        WebkitBackdropFilter: 'blur(22px) saturate(160%)',
      }}
    >
      <ResizeHandle
        side="right"
        width={width}
        min={PR_RAIL_MIN_WIDTH}
        max={PR_RAIL_MAX_WIDTH}
        defaultWidth={PR_RAIL_DEFAULT_WIDTH}
        onChange={onWidthChange}
        isDark={isDark}
        ariaLabel={t('rail.resize')}
        offset={-5}
      />
      <ScopeStrip scope={scope} onChange={onScopeChange} isDark={isDark} />

      <div className={`shrink-0 px-3 py-2 border-b ${border} flex items-center gap-2`}>
        <div className={`flex-1 flex items-center gap-2 px-2 h-7 rounded-md ${inputBg}`}>
          <Search className={`w-3 h-3 ${textFaint}`} />
          <input
            value={query}
            onChange={(e) => { onQueryChange(e.target.value); }}
            placeholder={t('search.prsPlaceholder')}
            className={`flex-1 bg-transparent outline-none text-[11px] ${
              isDark ? 'text-white/70 placeholder:text-white/30' : 'text-black/70 placeholder:text-black/30'
            }`}
          />
        </div>
        <SortMenu sortKey={sortKey} onChange={onSortChange} isDark={isDark} />
      </div>

      <div className="flex-1 min-h-0 overflow-auto px-2 py-2">
        <RailGroup label="Open" count={grouped.open.length} isDark={isDark}>
          {grouped.open.map((pr) => (
            <PrRow
              key={pr.number}
              pr={pr}
              active={pr.number === activeNumber}
              onClick={() => { onSelect(pr.number); }}
              viewerLogin={viewerLogin}
              repoForRisk={repoForRisk}
              isDark={isDark}
            />
          ))}
        </RailGroup>
        <RailGroup label="Drafts" count={grouped.drafts.length} isDark={isDark}>
          {grouped.drafts.map((pr) => (
            <PrRow
              key={pr.number}
              pr={pr}
              active={pr.number === activeNumber}
              onClick={() => { onSelect(pr.number); }}
              viewerLogin={viewerLogin}
              repoForRisk={repoForRisk}
              isDark={isDark}
            />
          ))}
        </RailGroup>
        <RailGroup label="Merged" count={grouped.merged.length} isDark={isDark} startCollapsed>
          {grouped.merged.map((pr) => (
            <PrRow
              key={pr.number}
              pr={pr}
              active={pr.number === activeNumber}
              onClick={() => { onSelect(pr.number); }}
              viewerLogin={viewerLogin}
              repoForRisk={repoForRisk}
              isDark={isDark}
            />
          ))}
        </RailGroup>
        {sorted.length === 0 && (
          <div className={`px-2 py-6 text-center text-[11px] ${textMuted}`}>
            No PRs match this view.
          </div>
        )}
      </div>
    </aside>
  );
}

// ─── Header strip — author/reviewer scope ────────────────────────────────

function ScopeStrip({
  scope, onChange, isDark,
}: {
  scope: PrScope;
  onChange: (s: PrScope) => void;
  isDark: boolean;
}) {
  const border = 'border-[color:var(--border-muted)]';
  const items: { key: PrScope; label: string }[] = [
    { key: 'mine-to-review', label: 'To review' },
    { key: 'my-prs',         label: 'Mine' },
    { key: 'team',           label: 'Team' },
  ];
  return (
    <div className={`shrink-0 h-11 px-2 flex items-center gap-1 border-b ${border}`}>
      {items.map((it) => {
        const active = scope === it.key;
        const cls = active
          ? (isDark ? 'bg-[#4f9a5c] text-black' : 'bg-[#1f883d] text-white')
          : (isDark ? 'text-white/55 hover:bg-white/5' : 'text-black/55 hover:bg-black/5');
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => { onChange(it.key); }}
            className={`flex-1 h-7 rounded-md text-[11px] font-bold transition-colors ${cls}`}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function SortMenu({
  sortKey, onChange, isDark,
}: {
  sortKey: PrSortKey;
  onChange: (s: PrSortKey) => void;
  isDark: boolean;
}) {
  const [open, setOpen] = useState(false);
  const trigger = isDark
    ? 'text-white/55 hover:text-white/85 hover:bg-white/5'
    : 'text-black/55 hover:text-black/85 hover:bg-black/5';
  const panel = isDark
    ? 'bg-[#0d1117] border-white/10 text-white/85'
    : 'bg-white border-black/10 text-black/85';
  const items: { key: PrSortKey; label: string }[] = [
    { key: 'risk',    label: 'Risk tier' },
    { key: 'updated', label: 'Last updated' },
    { key: 'size',    label: 'Diff size' },
  ];
  return (
    <div className="relative">
      <button
        type="button"
        title="Sort"
        onClick={() => { setOpen((v) => !v); }}
        className={`h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors ${trigger}`}
      >
        <ArrowUpDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- popover dismisses on mouse-leave; keyboard users dismiss via the trigger button (Enter toggles closed) and Esc
        <div
          className={`absolute right-0 top-8 z-10 w-44 rounded-md border shadow-lg ${panel}`}
          onMouseLeave={() => { setOpen(false); }}
        >
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              onClick={() => { onChange(it.key); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-[11px] flex items-center gap-2 hover:bg-[color:var(--bg-hover)]"
            >
              <span className="flex-1">{it.label}</span>
              {sortKey === it.key && <Check className="w-3 h-3" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Group block (collapsible) ───────────────────────────────────────────

function RailGroup({
  label, count, isDark, children, startCollapsed = false,
}: {
  label: string;
  count: number;
  isDark: boolean;
  children: React.ReactNode;
  startCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(startCollapsed);
  if (count === 0) return null;
  // Theme-agnostic via CSS var, but keep `isDark` lookup so the prop is read.
  const textFaint = isDark ? 'text-[color:var(--fg-subtle)]' : 'text-[color:var(--fg-subtle)]';
  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => { setCollapsed((v) => !v); }}
        className={`w-full px-2 py-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] ${textFaint} hover:opacity-80`}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        <span>{label}</span>
        <span className="ml-auto font-mono">{count}</span>
      </button>
      {!collapsed && <div className="flex flex-col gap-0.5">{children}</div>}
    </div>
  );
}

// ─── Single row ──────────────────────────────────────────────────────────

function PrRow({
  pr, active, onClick, viewerLogin, repoForRisk, isDark,
}: {
  pr: PullRequest;
  active: boolean;
  onClick: () => void;
  viewerLogin: string;
  repoForRisk: Parameters<typeof riskTierForPr>[1];
  isDark: boolean;
}) {
  const baseBg = active
    ? (isDark ? 'bg-white/[0.06]' : 'bg-black/[0.05]')
    : (isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-black/[0.03]');
  const titleColor = active
    ? 'text-[color:var(--fg-strong)]'
    : 'text-[color:var(--fg-default)]';
  const subColor = 'text-[color:var(--fg-subtle)]';

  const tier = riskTierForPr(pr, repoForRisk);
  const ci = summariseChecks(pr.checks);
  const myReviewer = pr.reviewers.find((r) => r.login === viewerLogin);

  return (
    <button type="button"
      onClick={onClick}
      className={`w-full text-left rounded-md px-2 py-1.5 transition-colors ${baseBg}`}
    >
      <div className="flex items-start gap-2">
        <PrStatusDot status={pr.status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className={`flex-1 min-w-0 text-[12px] leading-tight truncate ${titleColor}`}>
              {pr.title}
            </div>
            <span className={`text-[10px] font-mono shrink-0 ${subColor}`}>
              #{pr.number}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] font-mono ${subColor}`}>{timeAgo(pr.updatedAt)}</span>
            <span className="text-emerald-500/85 text-[10px] font-mono">+{pr.added}</span>
            <span className="text-rose-500/85 text-[10px] font-mono">−{pr.removed}</span>
            <RiskBadgeDot tier={tier} />
            <CiStripe ci={ci} />
            {myReviewer && <ReviewerStateGlyph state={myReviewer.state} mine />}
            {pr.reviewers
              .filter((r) => r.login !== viewerLogin)
              .slice(0, 2)
              .map((r) => (
                <ReviewerStateGlyph key={r.login} state={r.state} />
              ))}
          </div>
        </div>
      </div>
    </button>
  );
}

function PrStatusDot({ status }: { status: PrStatus }) {
  const cls = STATUS_DOT_BG[status];
  return <span className={`mt-1.5 inline-block w-1.5 h-1.5 rounded-full shrink-0 ${cls}`} />;
}

const STATUS_DOT_BG: Record<PrStatus, string> = {
  draft: 'bg-zinc-400',
  open: 'bg-emerald-500',
  'changes-requested': 'bg-rose-400',
  approved: 'bg-emerald-400',
  merged: 'bg-violet-500',
  closed: 'bg-zinc-500',
};

function RiskBadgeDot({ tier }: { tier: 'safe' | 'attention' | 'critical' }) {
  if (tier === 'safe') return null;
  const c = tierAccent(tier);
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full"
      style={{ background: c }}
      title={`Risk: ${tier}`}
    />
  );
}

// 3-stripe CI summary. We collapse the per-check statuses into a tri-band
// (passed/pending/failed) tinted bar so the rail row stays at one line.
function CiStripe({ ci }: { ci: CiSummary }) {
  const total = ci.required.passed + ci.required.failed + ci.required.pending;
  if (total === 0) return null;
  const segs: { key: string; w: number; bg: string }[] = [
    { key: 'p', w: ci.required.passed,  bg: '#5fa86c' },
    { key: 'r', w: ci.required.pending, bg: '#a8893a' },
    { key: 'f', w: ci.required.failed,  bg: '#c25a55' },
  ].filter((s) => s.w > 0);
  return (
    <span
      title={`CI: ${String(ci.required.passed)}✓ ${String(ci.required.pending)}⏱ ${String(ci.required.failed)}✕`}
      className="inline-flex h-1.5 w-8 rounded-sm overflow-hidden bg-black/10"
    >
      {segs.map((s) => (
        <span
          key={s.key}
          style={{ background: s.bg, flexGrow: s.w }}
          className="h-full"
        />
      ))}
    </span>
  );
}

function ReviewerStateGlyph({ state, mine = false }: { state: ReviewerState; mine?: boolean }) {
  const meta: { Icon: LucideIcon; color: string; title: string } = REVIEWER_GLYPH[state];
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

const REVIEWER_GLYPH: Record<ReviewerState, { Icon: LucideIcon; color: string; title: string }> = {
  pending:             { Icon: Clock,         color: '#8b949e', title: 'Pending' },
  approved:            { Icon: Check,         color: '#5fa86c', title: 'Approved' },
  'changes-requested': { Icon: X,             color: '#c25a55', title: 'Changes requested' },
  commented:           { Icon: MessageSquare, color: '#8b949e', title: 'Commented' },
};

// ─── Time formatting — see ./lib/format.ts ──────────────────────────────
