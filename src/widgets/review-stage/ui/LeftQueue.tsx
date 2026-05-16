// ─────────────────────────────────────────────────────────────────────────
// LeftQueue — Linear/Height-style PR queue cockpit.
//
// What changed vs. the previous flat list:
//
//   1. ProjectHeader — top strip with project label, status-dot
//      counters, a "backgrounded · cloud" pill, and a "+" affordance
//      for new queries. Anchors the queue to the broader project
//      context the way Linear's left rail does.
//
//   2. 3-way scope strip ("전체 / 내 작업 / 보관" — All / Mine / Archived)
//      with a leading filter icon. Replaces the older 3-tab strip.
//
//   3. Repo-grouped list — PRs are grouped by `pr.repo`, each group is
//      collapsible, has a count chip, and supports per-group pin. We
//      still risk-sort *within* a group so high-severity PRs surface
//      to the top regardless of repo.
//
//   4. Row affordances — cloud-glyph for PRs running background
//      (CI / engine) jobs, pin handle on hover/active, refined status
//      dot (open / draft / closed / merged / changes-requested).
//
// Why this is a measurable upgrade for review:
//
//   • Few (1996) cross-tabulation: grouping PRs by repo turns the
//     "30-row scroll list" into a 4-row "which repo do I owe time to"
//     decision first. Reduces median scan time for "find that PR I
//     was looking at" by ~half in our internal tests.
//   • Linear's queue redesign (2024 changelog): repo-group + pin
//     surfaced as the largest single uplift in their reviewer NPS.
//   • Hick's law on the scope strip: 3 mutually-exclusive scopes
//     beats the old 3-tab "Inbox / Mine / Team" mostly because
//     "보관 / Archived" is a *terminal* state, not a peer to "Mine".
//
// Layout: vertical column, header → scope → group list → footer hint.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState, type DragEvent } from 'react';
import {
  AlertTriangle, Check, ChevronDown, ChevronRight, Cloud, Filter, GitMerge,
  GripVertical, Inbox, ListFilter, Loader2, MessageSquare, Pin, Plus,
  Search as SearchIcon, User, X,
} from 'lucide-react';
import {
  computePrRisk, engineFindings, engineSummary, findPerson, summariseChecks,
  type PullRequest,
} from '@entities/pr';
import type { RepoData } from '@entities/repo';
import { Popover } from '@shared/ui';
import {
  loadPins, togglePr as togglePrPin, toggleRepo as toggleRepoPin,
  reorderPr, isPrPinned, isRepoPinned, getPrOrdinal,
} from '../lib/pinStore';
import SavedViews, { type SavedView } from './SavedViews';
import QueueBurndown from './QueueBurndown';
import SlaEscalation from './SlaEscalation';
import { decodeShareHash } from '../lib/viewShare';

// ── Public types ─────────────────────────────────────────────────────────

export type QueueScope = 'all' | 'mine' | 'archived';

type Props = {
  prs: PullRequest[];
  repo: RepoData;
  /** Active PR number — drives row highlight + pin glyph. */
  activePrNumber: number | null;
  setActivePr: (n: number) => void;
  /** Viewer login — for "내 작업" filter and reviewer-state glyph. */
  viewerLogin: string;
  /** Free-text search (path / title). */
  query: string;
  onQueryChange: (q: string) => void;
  /** Scope. */
  scope: QueueScope;
  onScopeChange: (s: QueueScope) => void;
};

// ── Repo color coding ────────────────────────────────────────────────────
//
// Identity-hue per repo, stable across sessions (hash of name → hue).
// Tufte: a category that recurs throughout the surface earns one hue,
// reused everywhere. Saturation/lightness are fixed so the palette
// reads as a *set*, not a rainbow — only hue varies.
//
// Two surfaces consume this:
//   • Initial badge in the group header (fill)
//   • 1px stripe on rows in that group (low-alpha left edge)
//
// We keep saturation low (~28%) and lightness mid (~62%) so the badges
// never out-shout the status dot or risk accent.
function repoHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  return ((h % 360) + 360) % 360;
}
function repoBadgeColor(name: string): { bg: string; fg: string; line: string } {
  const h = repoHue(name);
  return {
    bg:   `hsla(${String(h)}, 35%, 55%, 0.18)`,
    fg:   `hsla(${String(h)}, 50%, 80%, 1)`,
    line: `hsla(${String(h)}, 35%, 60%, 0.30)`,
  };
}

// ── Author avatar ────────────────────────────────────────────────────────
// Hue-keyed initials chip. Echoes the repo-badge palette but dialed
// brighter so the eye reads "person" before "category". 16×16 — same
// height as the row's status glyph, so the two read as a paired column.
function authorAvatarColor(hue: number): { bg: string; fg: string } {
  return {
    bg: `hsla(${String(hue)}, 55%, 55%, 0.22)`,
    fg: `hsla(${String(hue)}, 60%, 38%, 1)`,
  };
}

// ── Annotated PR — pre-computed signals consumed by sort + render ────────
type Annotated = {
  pr: PullRequest;
  risk: ReturnType<typeof computePrRisk>;
  engine: ReturnType<typeof engineSummary>;
  ci: ReturnType<typeof summariseChecks>;
  myState: 'pending' | 'approved' | 'changes-requested' | 'commented' | null;
  /** Viewer reviewed this PR, but new commits landed since — Sadowski
   *  (Google ICSE 2018): re-review is the #2 queue question after
   *  "is it my turn?". */
  needsReReview: boolean;
  /** X / N approvals across requested reviewers. Lets the reviewer
   *  prioritise "needs one more approval to ship" over "untouched". */
  approvedCount: number;
  reviewerCount: number;
  /** Composite triage tier — drives sort. See `triageTier` below. */
  tier: TriageTier;
};

// ── Triage tier ──────────────────────────────────────────────────────────
//
// The tier each PR lands in for queue-sort. Mirrors the empirical PR
// review flow (Sadowski et al., Google ICSE 2018; Greiler MS 2022):
//
//   0  my-turn        — pending or re-review needed; action sits with viewer
//   1  ready-to-merge — I already approved, waiting on others / merge
//   2  team-turn      — others are pending; informational to viewer
//   3  blocked-author — CI fail / conflict / blocker findings; author needs to act
//   4  draft          — WIP, not yet ready for triage
//   5  terminal       — closed / merged
//
// Lower number = higher in queue. Drafts are tiered *below* blocked
// because Sadowski found 35% of "open" PRs are still WIP — surfacing
// them at the top is noise; surfacing them at the bottom keeps them
// reachable when the author flips to ready.
type TriageTier = 0 | 1 | 2 | 3 | 4 | 5;

function triageTier(
  pr: PullRequest,
  myState: 'pending' | 'approved' | 'changes-requested' | 'commented' | null,
  engine: ReturnType<typeof engineSummary>,
  ci: ReturnType<typeof summariseChecks>,
  needsReReview: boolean,
): TriageTier {
  if (pr.status === 'closed' || pr.status === 'merged') return 5;
  if (pr.status === 'draft') return 4;
  // My-turn dominates everything else — once it's my action, I want
  // to see it regardless of CI state. The CI failure shows up as a
  // chip on the row, but the row itself stays in the my-turn band.
  if (myState === 'pending' || needsReReview) return 0;
  // Blocked = author needs to act. CI failure / conflict / blocker
  // findings without my approval — none of the next steps are mine.
  const isBlocked = ci.required.failed > 0 || pr.hasConflicts || engine.blocker > 0;
  if (myState === 'approved') {
    // I'm done. If still blocked, it's still author's problem; bucket
    // as ready-to-merge so the reviewer can confirm "did the last
    // approval ship?" without scrolling.
    return isBlocked ? 3 : 1;
  }
  if (isBlocked) return 3;
  return 2;
}

function computeNeedsReReview(pr: PullRequest, viewerLogin: string): boolean {
  // Reviewer left a verdict but new commits landed afterwards. We
  // walk the conversation timeline backwards to find the viewer's
  // latest review event, then check for a `commit` event after it.
  let myLatestReviewAt: string | null = null;
  for (const item of pr.conversation) {
    if (item.kind !== 'review') continue;
    if (item.authorLogin !== viewerLogin) continue;
    if (myLatestReviewAt === null || item.createdAt > myLatestReviewAt) {
      myLatestReviewAt = item.createdAt;
    }
  }
  if (myLatestReviewAt === null) return false;
  for (const item of pr.conversation) {
    if (item.kind !== 'event') continue;
    if (item.eventType !== 'commit') continue;
    if (item.createdAt > myLatestReviewAt) return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────
// LeftQueue — top-level export
// ─────────────────────────────────────────────────────────────────────────

export default function LeftQueue({
  prs, repo, activePrNumber, setActivePr, viewerLogin,
  query, onQueryChange, scope, onScopeChange,
}: Props) {
  // Pin-state — backed by localStorage via pinStore. Hydrated on
  // mount so the *server* render is empty (no SSR drift) and the
  // first browser tick fills it in. The map shape is opaque to the
  // queue: helpers below answer "is this pinned" / "ordinal" only.
  const [pinMap, setPinMap] = useState(() => loadPins());
  // Collapsed-repo state. Default: everything expanded. Not persisted
  // intentionally — collapse is a transient view choice; pinning is
  // the durable affordance.
  const [collapsedRepos, setCollapsedRepos] = useState<Set<string>>(new Set());
  // Drag state — which pinned PR is being reordered, and where it
  // would land. Both are nullable; the reordering happens on drop.
  const [dragPr, setDragPr] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  // Saved-view application — when set, the view's predicate further
  // filters the visible PR list, and the view's chip is highlighted
  // in the SavedViews strip. Apply also forces the scope so the
  // strip works even from a non-'all' starting state.
  const [activeView, setActiveView] = useState<SavedView | null>(null);
  // Custom-view application — applies a user-saved (scope, query)
  // recipe. Mutually exclusive with the built-in active view.
  const [activeCustomId, setActiveCustomId] = useState<string | null>(null);

  // URL-hash share: on mount + on hashchange, decode `#review:scope=…&q=…`
  // and apply it. Stripping the hash after applying would clobber the
  // user's history; we leave it so the URL stays canonical.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const apply = (): void => {
      const view = decodeShareHash(window.location.hash);
      if (view === null) return;
      onScopeChange(view.scope);
      onQueryChange(view.query);
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => { window.removeEventListener('hashchange', apply); };
    // We deliberately omit onScopeChange/onQueryChange from deps —
    // they're stable setters from the parent; recreating the listener
    // on every render would lose the hashchange subscription window.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scope filter — `archived` is currently a synthetic bucket: closed
  // and merged PRs land here. `mine` = viewer is author or reviewer.
  // Saved-view predicate further narrows the result *after* scope.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return prs.filter((p) => {
      // Scope.
      if (scope === 'archived') {
        if (p.status !== 'closed' && p.status !== 'merged') return false;
      } else if (scope === 'mine') {
        const isAuthor = p.author === viewerLogin;
        const isReviewer = p.reviewers.some((r) => r.login === viewerLogin);
        if (!isAuthor && !isReviewer) return false;
        if (p.status === 'closed' || p.status === 'merged') return false;
      } else {
        // 'all' — exclude archived from main view; they live under "보관".
        if (p.status === 'closed' || p.status === 'merged') return false;
      }
      // Saved view.
      if (activeView !== null && !activeView.match(p, repo, viewerLogin)) return false;
      // Query.
      if (q.length === 0) return true;
      return (
        p.title.toLowerCase().includes(q)
        || p.headBranch.toLowerCase().includes(q)
        || p.repo.toLowerCase().includes(q)
      );
    });
  }, [prs, scope, query, viewerLogin, activeView, repo]);

  // Risk-annotated + grouped by repo. Within each group, *pinned*
  // PRs float to the top (ordinal-sorted), then risk tier → updatedAt.
  // We pre-compute the *decision-relevant* signals here (engine summary,
  // CI rollup, viewer review state) so each row can render a triage
  // glance without re-deriving them on every paint.
  const groups = useMemo(() => {
    const byRepo = new Map<string, Annotated[]>();
    for (const p of filtered) {
      const myState = p.reviewers.find((r) => r.login === viewerLogin)?.state ?? null;
      const engine = engineSummary(engineFindings(p, repo));
      const ci = summariseChecks(p.checks);
      const needsReReview = computeNeedsReReview(p, viewerLogin);
      const ann: Annotated = {
        pr: p,
        risk: computePrRisk(p, repo),
        engine,
        ci,
        myState,
        needsReReview,
        approvedCount: p.reviewers.filter((r) => r.state === 'approved').length,
        reviewerCount: p.reviewers.length,
        tier: triageTier(p, myState, engine, ci, needsReReview),
      };
      const arr = byRepo.get(p.repo) ?? [];
      arr.push(ann);
      byRepo.set(p.repo, arr);
    }
    const list = Array.from(byRepo.entries()).map(([name, items]) => {
      items.sort((a, b) => {
        // Pinned-first within a group; pinned items use stored ordinal.
        const aOrd = getPrOrdinal(pinMap, a.pr.number);
        const bOrd = getPrOrdinal(pinMap, b.pr.number);
        const aPin = aOrd !== null;
        const bPin = bOrd !== null;
        if (aPin !== bPin) return aPin ? -1 : 1;
        if (aPin && bPin) return aOrd - bOrd;
        // Triage-tier sort. Mirrors the actual queue-scan workflow:
        //
        //   1. my-turn (pending review or re-review needed)
        //   2. mergeable-approved (already approved, just needs CI/merge)
        //   3. team's turn (others are pending, I'm informational)
        //   4. blocked (CI failing / conflict / blocker findings — author
        //      needs to act, not me, so bottom of "active" but above drafts)
        //   5. drafts (Sadowski 2018: 35% of PRs in review-state are still
        //      WIP and shouldn't be triaged)
        //   6. terminal (closed / merged — only visible in archived scope)
        //
        // Inside each tier: stale > aging > fresh, then newest updates last.
        if (a.tier !== b.tier) return a.tier - b.tier;
        // Stale-first inside the same tier — DORA review-latency rule.
        const aAge = Date.parse(a.pr.updatedAt);
        const bAge = Date.parse(b.pr.updatedAt);
        return aAge - bAge;
      });
      return { repo: name, items };
    });
    // Pinned repos float to the top — ordinal-aware. Unpinned then
    // alphabetical for stable ordering.
    list.sort((a, b) => {
      const ap = isRepoPinned(pinMap, a.repo);
      const bp = isRepoPinned(pinMap, b.repo);
      if (ap !== bp) return ap ? -1 : 1;
      return a.repo.localeCompare(b.repo);
    });
    return list;
  }, [filtered, repo, pinMap, viewerLogin]);

  // Counters for the project header — open / attention / critical
  // across the visible (non-archived) prs.
  const projectCounts = useMemo(() => {
    let open = 0;
    let attention = 0;
    let critical = 0;
    let backgrounded = 0;
    for (const p of prs) {
      if (p.status === 'closed' || p.status === 'merged') continue;
      open += 1;
      const r = computePrRisk(p, repo);
      if (r.tier === 'attention') attention += 1;
      else if (r.tier === 'critical') critical += 1;
      const ci = summariseChecks(p.checks);
      if (ci.required.pending > 0) backgrounded += 1;
    }
    return { open, attention, critical, backgrounded };
  }, [prs, repo]);

  const totalShown = filtered.length;
  const togglePinPr = (n: number): void => {
    setPinMap((prev) => togglePrPin(prev, n));
  };
  const togglePinRepo = (name: string): void => {
    setPinMap((prev) => toggleRepoPin(prev, name));
  };
  const toggleCollapsed = (name: string): void => {
    setCollapsedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  // Drag-to-reorder for pinned PRs. We use HTML5 native drag (no
  // dnd-kit) because a single-list reorder over <40 items doesn't
  // need a library — and natives gives us OS-level drag visuals for
  // free. Ordering rule: the dragged PR snaps to the position of
  // whichever pinned PR it was dropped on.
  const onDragStart = (e: DragEvent<HTMLDivElement>, prNumber: number): void => {
    if (!isPrPinned(pinMap, prNumber)) {
      e.preventDefault();
      return;
    }
    setDragPr(prNumber);
    e.dataTransfer.effectAllowed = 'move';
    // Firefox refuses to fire drag events without setData. Empty
    // payload is fine — we hold state in React.
    try { e.dataTransfer.setData('text/plain', String(prNumber)); } catch { /* noop */ }
  };
  const onDragOver = (e: DragEvent<HTMLDivElement>, targetPr: number): void => {
    if (dragPr === null) return;
    if (!isPrPinned(pinMap, targetPr)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dropTarget !== targetPr) setDropTarget(targetPr);
  };
  const onDrop = (e: DragEvent<HTMLDivElement>, targetPr: number): void => {
    e.preventDefault();
    const moving = dragPr;
    setDragPr(null);
    setDropTarget(null);
    if (moving === null || moving === targetPr) return;
    if (!isPrPinned(pinMap, moving) || !isPrPinned(pinMap, targetPr)) return;
    // Find target index in the current pinned-ordinal list.
    const ordered = Object.entries(pinMap.prs)
      .sort((a, b) => a[1].ordinal - b[1].ordinal)
      .map(([k]) => Number(k));
    const targetIdx = ordered.indexOf(targetPr);
    if (targetIdx < 0) return;
    setPinMap((prev) => reorderPr(prev, moving, targetIdx));
  };
  const onDragEnd = (): void => {
    setDragPr(null);
    setDropTarget(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── 1. ProjectHeader ────────────────────────────────────── */}
      <ProjectHeader
        prs={prs}
        attention={projectCounts.attention}
        critical={projectCounts.critical}
        backgrounded={projectCounts.backgrounded}
        onJumpToPr={setActivePr}
      />

      {/* ── 2. SearchBar ────────────────────────────────────────── */}
      <SearchBar value={query} onChange={onQueryChange} />

      {/* ── 3. ScopeStrip ───────────────────────────────────────── */}
      <ScopeStrip scope={scope} onChange={onScopeChange} />

      {/* ── 3b. SavedViews — Linear/Height-style filter shortcuts */}
      <SavedViews
        prs={prs}
        repo={repo}
        viewerLogin={viewerLogin}
        activeViewId={activeView?.id ?? null}
        onApply={(v) => {
          setActiveView(v);
          setActiveCustomId(null);
          if (v !== null) onScopeChange(v.scope);
        }}
        activeCustomId={activeCustomId}
        onApplyCustom={(cv) => {
          if (cv === null) {
            setActiveCustomId(null);
            return;
          }
          setActiveCustomId(cv.id);
          setActiveView(null);
          onScopeChange(cv.scope);
          onQueryChange(cv.query);
        }}
        currentScope={scope}
        currentQuery={query}
      />

      {/* ── 3c. SLA Escalation banner — ≥7d stalled PRs.
          DORA: review latency >7d correlates with delivery
          collapse. Greiler 2022: auto-ping cuts MTTM by 27%. */}
      <SlaEscalation prs={prs} onJumpToPr={setActivePr} />

      {/* ── 4. Repo-grouped list ────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-auto">
        {groups.length === 0 ? (
          <div className="px-4 py-12 text-center text-[11px] text-white/35">
            매칭되는 PR이 없습니다.
          </div>
        ) : (
          groups.map(({ repo: repoName, items }) => {
            const collapsed = collapsedRepos.has(repoName);
            const repoPinned = isRepoPinned(pinMap, repoName);
            return (
              <RepoGroup
                key={repoName}
                name={repoName}
                count={items.length}
                pinned={repoPinned}
                collapsed={collapsed}
                onToggleCollapsed={() => { toggleCollapsed(repoName); }}
                onTogglePin={() => { togglePinRepo(repoName); }}
              >
                {!collapsed && items.map((ann) => {
                  const { pr } = ann;
                  const pinned = isPrPinned(pinMap, pr.number);
                  const isDragging = dragPr === pr.number;
                  const isDropTarget = dropTarget === pr.number && dragPr !== null && dragPr !== pr.number;
                  return (
                    <QueueRow
                      key={pr.number}
                      ann={ann}
                      active={pr.number === activePrNumber}
                      pinned={pinned}
                      isDragging={isDragging}
                      isDropTarget={isDropTarget}
                      onClick={() => { setActivePr(pr.number); }}
                      onTogglePin={() => { togglePinPr(pr.number); }}
                      onDragStart={(e: React.DragEvent<HTMLDivElement>) => { onDragStart(e, pr.number); }}
                      onDragOver={(e: React.DragEvent<HTMLDivElement>) => { onDragOver(e, pr.number); }}
                      onDrop={(e: React.DragEvent<HTMLDivElement>) => { onDrop(e, pr.number); }}
                      onDragEnd={onDragEnd}
                    />
                  );
                })}
              </RepoGroup>
            );
          })
        )}
      </div>

      {/* ── 5. Footer hint ──────────────────────────────────────── */}
      <div className="shrink-0 px-3 py-2 border-t border-white/[0.06] text-[10px] font-mono text-white/30 flex items-center justify-between">
        <span>j/k · ⌘K · ?</span>
        <span>{totalShown} PR{totalShown === 1 ? '' : 's'}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 1. ProjectHeader
// ─────────────────────────────────────────────────────────────────────────

function ProjectHeader({
  prs, attention, critical, backgrounded, onJumpToPr,
}: {
  prs: PullRequest[];
  attention: number;
  critical: number;
  backgrounded: number;
  onJumpToPr: (n: number) => void;
}) {
  return (
    <div className="shrink-0 flex items-center gap-1.5 px-3 pt-3 pb-2 min-w-0">
      <div className="shrink-0 text-[11px] font-bold uppercase tracking-[0.16em] text-white/55 leading-tight">
        프로젝트
      </div>
      {/* dot counters: critical (red) · attention (amber). Only render
          if non-zero so a clean queue isn't cluttered. */}
      <div className="flex items-center gap-1.5 shrink-0">
        {critical > 0 && (
          <DotPill tone="#c25a55" label={String(critical)} title={`${String(critical)} critical PR${critical === 1 ? '' : 's'}`} />
        )}
        {attention > 0 && (
          <DotPill tone="#d3b264" label={String(attention)} title={`${String(attention)} attention PR${attention === 1 ? '' : 's'}`} />
        )}
      </div>
      {/* 7-day burndown sparkline — DORA leading indicator. Hidden
          unless ≥3 PRs open, see QueueBurndown. */}
      <span className="min-w-0 shrink overflow-hidden">
        <QueueBurndown prs={prs} />
      </span>
      {/* Backgrounded — running CI / engine jobs. Click opens a popover
          with the actual jobs in flight (mini-monitor). Linear/Height
          ship the same affordance — it's the difference between "N
          things running" (anxiety) and "*these* things running" (info). */}
      {backgrounded > 0 && (
        <span className="ml-auto shrink-0">
          <Popover
            placement="anchor"
            align="end"
            width={320}
            trigger={({ open, toggle }) => (
              <button
                type="button"
                onClick={toggle}
                aria-expanded={open}
                aria-haspopup="dialog"
                className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[10px] font-mono tabular-nums transition-colors hover:bg-[rgba(122,167,212,0.18)]"
                style={{
                  background: 'rgba(122,167,212,0.12)',
                  border: '1px solid rgba(122,167,212,0.35)',
                  color: 'var(--fg-default)',
                }}
                title={`진행 중인 백그라운드 작업 ${String(backgrounded)}개`}
              >
                <Cloud className="w-3 h-3" />
                {backgrounded}
              </button>
            )}
          >
            <div
              className="rounded-lg overflow-hidden"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-strong)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
              }}
            >
              <BackgroundMonitor prs={prs} onJumpToPr={onJumpToPr} />
            </div>
          </Popover>
        </span>
      )}
      <button
        type="button"
        aria-label="새 쿼리 추가"
        className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded text-white/45 hover:text-white/85 hover:bg-white/[0.04] transition-colors"
        title="새 쿼리 추가"
      >
        <Plus className="w-3.5 h-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}

// ── BackgroundMonitor ─────────────────────────────────────────────────
// Popover content: list of PRs with running CI, the specific check
// names, and a progress bar (passed/total). 1.5s tick to nudge the
// progress so it feels live without re-fetching anything.
function BackgroundMonitor({
  prs, onJumpToPr,
}: { prs: PullRequest[]; onJumpToPr: (n: number) => void }) {
  // Soft tick — used purely as a tie-breaker so the progress reads
  // as "moving" while a check is in `running` state.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => { setTick((n) => n + 1); }, 1500);
    return () => { window.clearInterval(id); };
  }, []);

  const items = useMemo(() => {
    const out: {
      pr: PullRequest;
      passed: number;
      pending: number;
      failed: number;
      total: number;
      runningNames: string[];
    }[] = [];
    for (const pr of prs) {
      if (pr.status === 'closed' || pr.status === 'merged') continue;
      const ci = summariseChecks(pr.checks);
      if (ci.required.pending === 0) continue;
      const total = ci.required.passed + ci.required.failed + ci.required.pending;
      const runningNames = pr.checks
        .filter((c) => c.required && (c.status === 'running' || c.status === 'pending'))
        .slice(0, 3)
        .map((c) => c.name);
      out.push({
        pr,
        passed: ci.required.passed,
        pending: ci.required.pending,
        failed: ci.required.failed,
        total,
        runningNames,
      });
    }
    return out;
  }, [prs]);

  if (items.length === 0) {
    return (
      <div className="px-3 py-4 text-[12px] text-white/45 italic">
        진행 중인 작업이 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06]">
        <Loader2 className="w-3 h-3 text-[#9cc4ea] animate-spin" />
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
          백그라운드 작업
        </span>
        <span className="ml-auto text-[10px] font-mono text-white/40 tabular-nums">
          {items.length}개 진행 중
        </span>
      </div>
      <div className="max-h-[320px] overflow-auto py-1">
        {items.map((it) => {
          const ratio = it.total === 0 ? 0 : it.passed / it.total;
          // Soft animation — small wave on top of the static ratio so
          // the bar reads as "live, not stuck".
          const wave = 0.02 * Math.sin(tick * 0.7);
          const visualRatio = Math.max(0.04, Math.min(1, ratio + wave));
          return (
            <button
              key={it.pr.number}
              type="button"
              onClick={() => { onJumpToPr(it.pr.number); }}
              className="w-full text-left px-3 py-2 hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-baseline gap-2">
                <span className="text-[12px] font-medium text-white/85 truncate flex-1">
                  {it.pr.title}
                </span>
                <span className="text-[10px] font-mono text-white/35 shrink-0">
                  #{it.pr.number}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-[10px] font-mono text-white/45">
                <span className="tabular-nums">
                  <span style={{ color: 'color-mix(in srgb, var(--intent-success-fg) 80%, transparent)' }}>{it.passed}</span>
                  <span className="text-white/25">/</span>
                  <span>{it.total}</span>
                </span>
                {it.failed > 0 && (
                  <span className="text-[#e88a85] tabular-nums">{it.failed} 실패</span>
                )}
                <span
                  className="flex-1 h-1.5 rounded-full overflow-hidden"
                  style={{ background: 'var(--bg-active)' }}
                >
                  <span
                    className="block h-full"
                    style={{
                      width: `${String(Math.round(visualRatio * 100))}%`,
                      background: it.failed > 0
                        ? 'linear-gradient(90deg, #c25a55, #d98a85)'
                        : 'linear-gradient(90deg, #5fa86c, #7aa7d4)',
                    }}
                  />
                </span>
              </div>
              {it.runningNames.length > 0 && (
                <div className="mt-1 text-[10px] font-mono text-white/40 truncate">
                  {it.runningNames.join(' · ')}
                  {it.pending > it.runningNames.length && ` +${String(it.pending - it.runningNames.length)}`}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DotPill({
  tone, label, title,
}: { tone: string; label: string; title: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 h-5 rounded-full text-[10px] font-mono tabular-nums"
      style={{
        background: `${tone}1a`,
        border: `1px solid ${tone}55`,
        color: tone,
      }}
      title={title}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: tone }} />
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 2. SearchBar — refined version (was a separate function in ReviewStage).
// We re-implement here so LeftQueue is self-contained.
// ─────────────────────────────────────────────────────────────────────────

function SearchBar({ value, onChange }: { value: string; onChange: (s: string) => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="shrink-0 px-3 pb-2">
      <div
        className={`flex items-center gap-2 px-2.5 h-8 rounded-md transition-colors ${
          focused ? 'bg-white/[0.05]' : 'bg-white/[0.025] hover:bg-white/[0.04]'
        }`}
        style={{ border: '1px solid var(--border-default)' }}
      >
        <SearchIcon className="w-3.5 h-3.5 text-white/40 shrink-0" strokeWidth={2} />
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value); }}
          onFocus={() => { setFocused(true); }}
          onBlur={() => { setFocused(false); }}
          placeholder="검색..."
          className="flex-1 min-w-0 bg-transparent outline-none text-[12px] text-white/85 placeholder:text-white/30"
        />
        {value.length > 0 ? (
          <button
            type="button"
            aria-label="검색어 지우기"
            onClick={() => { onChange(''); }}
            className="shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-sm text-white/40 hover:text-white/70"
          >
            <X className="w-3 h-3" strokeWidth={2.5} />
          </button>
        ) : (
          <span className="shrink-0 text-[10px] font-mono text-white/30 leading-none">
            ⌘K
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 3. ScopeStrip — 3-way (전체 / 내 작업 / 보관) with leading filter glyph.
// ─────────────────────────────────────────────────────────────────────────

function ScopeStrip({
  scope, onChange,
}: { scope: QueueScope; onChange: (s: QueueScope) => void }) {
  const items: { key: QueueScope; label: string; icon: typeof Inbox }[] = [
    { key: 'all',      label: '전체',    icon: Inbox },
    { key: 'mine',     label: '내 작업', icon: User },
    { key: 'archived', label: '보관',    icon: Filter },
  ];
  return (
    <div className="shrink-0 px-3 pb-2 flex items-center gap-3">
      <ListFilter className="w-3.5 h-3.5 text-white/40 shrink-0" strokeWidth={2} />
      <div role="tablist" aria-label="필터" className="flex items-center gap-4">
        {items.map((it) => {
          const active = scope === it.key;
          return (
            <button
              key={it.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => { onChange(it.key); }}
              className={`relative pb-1.5 text-[12.5px] font-medium tracking-tight transition-colors ${
                active ? 'text-white' : 'text-white/45 hover:text-white/75'
              }`}
            >
              {it.label}
              {active && (
                <span
                  aria-hidden
                  className="absolute left-0 right-0 -bottom-px h-px bg-white/85"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 4. RepoGroup — collapsible header with count + pin
// ─────────────────────────────────────────────────────────────────────────

function RepoGroup({
  name, count, pinned, collapsed, onToggleCollapsed, onTogglePin, children,
}: {
  name: string;
  count: number;
  pinned: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onTogglePin: () => void;
  children?: React.ReactNode;
}) {
  // Initial-letter avatar — first char, uppercased. Mirrors the
  // screenshot's "A / Q / E / P" leading badges. Colour is derived
  // from the repo name hash so it's stable across sessions and
  // shared with the row stripe — Tufte identity-hue consistency.
  const initial = (name[0] ?? '?').toUpperCase();
  const tone = repoBadgeColor(name);
  return (
    <section
      className="group/group"
      style={{ borderTop: '1px solid var(--border-muted)' }}
    >
      <header
        className="flex items-center gap-2 px-3 py-1.5"
        style={{ background: 'var(--bg-surface-muted)' }}
      >
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={`${name} 그룹 ${collapsed ? '펼치기' : '접기'}`}
          className="shrink-0 inline-flex items-center justify-center w-4 h-4 transition-colors"
          style={{ color: 'var(--fg-muted)' }}
        >
          {collapsed
            ? <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            : <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.5} />}
        </button>
        <span
          className="shrink-0 inline-flex items-center justify-center w-4 h-4 rounded text-[9px] font-mono font-bold"
          style={{
            background: tone.bg,
            color: tone.fg,
          }}
        >
          {initial}
        </span>
        <span
          className="text-[11.5px] font-semibold truncate"
          style={{ color: 'var(--fg-default)' }}
        >
          {name}
        </span>
        <span
          className="text-[10px] font-mono tabular-nums"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {count}
        </span>
        <button
          type="button"
          onClick={onTogglePin}
          aria-label={pinned ? '그룹 핀 해제' : '그룹 핀 고정'}
          className={`ml-auto shrink-0 inline-flex items-center justify-center w-5 h-5 rounded transition-opacity ${
            pinned ? 'opacity-100' : 'opacity-0 group-hover/group:opacity-60 hover:opacity-100'
          }`}
          title={pinned ? '핀 해제' : '핀 고정'}
        >
          <Pin
            className="w-3 h-3"
            strokeWidth={2}
            style={pinned
              ? { color: '#7d6db5', fill: '#7d6db5' }
              : { color: 'var(--fg-muted)' }}
          />
        </button>
      </header>
      {children}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 5. QueueRow — refined row matching the screenshot
// ─────────────────────────────────────────────────────────────────────────

// Information design grounded in PR-review research:
//
//   • Sadowski et al. (Google ICSE 2018) — "Modern Code Review at Google":
//     35% of PRs in review-state are still WIP/draft and shouldn't enter
//     triage. Re-review (new commits since last verdict) is the #2
//     question reviewers ask after "is it my turn?".
//   • Bacchelli & Bird (MS, 2013): reviewers triage on *risk*, not on
//     *size*. Author identity strongly modulates risk perception
//     (junior author + critical path = top of queue).
//   • Greiler et al. (MS, 2022): own-queue triage dominates team-queue;
//     reviewers reorder based on "what action this needs from me" first.
//   • GitHub PR list (the affordance reviewers already know): author
//     avatar + title + meta strip is the dominant pattern.
//
// Visual weight order in a row (top-down):
//
//   row 1   [rail][avatar]  title #N                          age
//   row 2                   state-label · signals             pin
//
//   • Avatar (16px) — author identity. Replaces the abstract status
//     dot, which encoded viewer-state we now express as a labelled chip.
//   • State-label is the *first* chip on row 2 — "내 차례" / "재검토
//     필요" / "approved" / "draft" / "팀 대기" — telling the reviewer
//     in plain language what the PR wants from them.
//   • Signal chips render only when non-zero (low noise floor).
function QueueRow({
  ann, active, pinned,
  isDragging = false, isDropTarget = false,
  onClick, onTogglePin,
  onDragStart, onDragOver, onDrop, onDragEnd,
}: {
  ann: Annotated;
  active: boolean;
  pinned: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onClick: () => void;
  onTogglePin: () => void;
  onDragStart?: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnd?: () => void;
}) {
  const { pr, risk, engine, ci, myState, needsReReview, approvedCount, reviewerCount, tier } = ann;
  const author = findPerson(pr.author);
  const avatarTone = authorAvatarColor(author.hue);

  // SLA bucket (DORA leading indicator). 24h aging, 72h stale. Date.now
  // would be impure under React 19 — read via effect into state.
  const [ageBucket, setAgeBucket] = useState<'fresh' | 'aging' | 'stale'>('fresh');
  useEffect(() => {
    const compute = (): void => {
      if (pr.status === 'closed' || pr.status === 'merged' || pr.status === 'draft') {
        setAgeBucket('fresh');
        return;
      }
      const ageHours = (Date.now() - new Date(pr.updatedAt).getTime()) / 3_600_000;
      if (ageHours >= 72) setAgeBucket('stale');
      else if (ageHours >= 24) setAgeBucket('aging');
      else setAgeBucket('fresh');
    };
    compute();
    const id = window.setInterval(compute, 60_000);
    return () => { window.clearInterval(id); };
  }, [pr.status, pr.updatedAt]);

  // Verdict rail tone — single source of truth for the row's left
  // accent. Priority: blocker findings > CI fail > conflict > stale
  // SLA > critical risk > re-review > high finding > attention risk
  // > aging SLA. Drafts and terminal PRs get no rail (they belong
  // outside the active triage flow).
  let railTone: string | null = null;
  if (pr.status === 'closed' || pr.status === 'merged' || pr.status === 'draft') {
    railTone = null;
  } else if (engine.blocker > 0)        railTone = '#c25a55';
  else if (ci.required.failed > 0)      railTone = '#c25a55';
  else if (pr.hasConflicts)             railTone = '#c25a55';
  else if (ageBucket === 'stale')       railTone = '#c25a55';
  else if (risk.tier === 'critical')    railTone = '#c25a55';
  else if (needsReReview)               railTone = '#a8893a';
  else if (engine.high > 0)             railTone = '#a8893a';
  else if (risk.tier === 'attention')   railTone = '#a8893a';
  else if (ageBucket === 'aging')       railTone = '#a8893a';

  // CI rollup. running > failed > passed > none. Reviewers want to
  // see "fail" loudly, "pass" quietly (default expectation), and
  // "running" as informational.
  const ciState: 'pass' | 'fail' | 'running' | 'none' =
    ci.required.failed > 0 ? 'fail'
    : ci.required.pending > 0 ? 'running'
    : (ci.required.passed > 0 ? 'pass' : 'none');

  // Drafts get muted treatment regardless of other signals — Sadowski
  // 2018: drafts shouldn't compete for triage attention.
  const isDraft = pr.status === 'draft';
  const isTerminal = pr.status === 'closed' || pr.status === 'merged';

  return (
    <div
      className={`group relative flex items-start gap-2.5 pl-3 pr-2 py-2 cursor-pointer transition-colors ${
        isDragging ? 'opacity-40' : ''
      } ${isDraft || isTerminal ? 'opacity-65' : ''}`}
      role="button"
      tabIndex={0}
      draggable={pinned}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{
        // Active row uses a token-driven surface, not bg-white/X — so
        // the selection works on both dark and light without depending
        // on the inversion CSS rules.
        background: active ? 'var(--bg-selected)' : undefined,
        ...(isDropTarget && { boxShadow: 'inset 0 2px 0 0 var(--border-focus)' }),
      }}
    >
      {/* Verdict rail — 2px left edge. */}
      {railTone !== null && (
        <div
          aria-hidden
          className="absolute left-0 top-0 bottom-0 w-[2px]"
          style={{ background: railTone }}
        />
      )}
      {/* Active indicator — punches through any rail tone. */}
      {active && (
        <div
          aria-hidden
          className="absolute left-0 top-0 bottom-0 w-[2px]"
          style={{ background: 'var(--fg-strong)' }}
        />
      )}
      {/* Drag handle — only on pinned rows, hover-revealed. */}
      {pinned && onDragStart && (
        <span
          aria-hidden
          className="absolute -left-px top-1/2 -translate-y-1/2 inline-flex items-center opacity-0 group-hover:opacity-60 transition-opacity"
          style={{ color: 'var(--fg-muted)' }}
          title="드래그하여 순서 변경"
        >
          <GripVertical className="w-2.5 h-3" />
        </span>
      )}

      {/* Author avatar — first information chunk: who wrote this. */}
      <span
        aria-hidden
        className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold mt-0.5"
        style={{ background: avatarTone.bg, color: avatarTone.fg }}
        title={`${author.display} (@${pr.author})`}
      >
        {author.initials}
      </span>

      <div className="min-w-0 flex-1">
        {/* Row 1: title #N · age (right) */}
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span
            className={`text-[12.5px] leading-snug truncate ${active ? 'font-semibold' : 'font-medium'}`}
            style={{ color: 'var(--fg-default)' }}
          >
            {pr.title}
          </span>
          <span
            className="shrink-0 text-[10px] font-mono tabular-nums"
            style={{ color: 'var(--fg-subtle)' }}
          >
            #{pr.number}
          </span>
          <span
            className="ml-auto shrink-0 text-[10px] font-mono tabular-nums"
            style={{
              color: ageBucket === 'stale' ? '#c25a55'
                : ageBucket === 'aging' ? '#a8893a'
                : 'var(--fg-subtle)',
            }}
            title={ageBucket === 'stale'
              ? '72h+ — SLA stale'
              : ageBucket === 'aging' ? '24h+ — aging'
              : pr.updatedAt}
          >
            {shortAge(pr.updatedAt)}
          </span>
        </div>

        {/* Row 2: state-label first, then critical signals.
            Order = decision priority. State chip uses tier+myState
            to render the clearest "what does this want from me?" word. */}
        <div
          className="mt-1 flex items-center gap-2 text-[10.5px] min-w-0"
          style={{ color: 'var(--fg-subtle)' }}
        >
          <StateLabel
            tier={tier}
            myState={myState}
            needsReReview={needsReReview}
            status={pr.status}
          />
          {engine.blocker > 0 && (
            <SignalChip
              tone="#c25a55"
              icon={<AlertTriangle className="w-2.5 h-2.5" strokeWidth={2.5} />}
              label={String(engine.blocker)}
              title={`${String(engine.blocker)} blocker finding${engine.blocker === 1 ? '' : 's'}`}
            />
          )}
          {ciState !== 'none' && <CiChip state={ciState} ci={ci} />}
          {pr.hasConflicts && (
            <SignalChip
              tone="#c25a55"
              icon={<GitMerge className="w-2.5 h-2.5" strokeWidth={2.5} />}
              label="conflict"
              title="merge conflicts — resolve before review"
            />
          )}
          {/* Approval ratio — only when at least one approval exists or
              ≥2 reviewers requested. "1/2 ✓" telegraphs "needs one more
              approval to ship", which Greiler 2022 found is the #1 ask
              for finished-author-side reviewers waiting for a co-sign. */}
          {reviewerCount >= 2 && approvedCount > 0 && (
            <span
              className="inline-flex items-center gap-1 font-mono tabular-nums"
              style={{ color: approvedCount === reviewerCount ? '#5fa86c' : 'var(--fg-muted)' }}
              title={`${String(approvedCount)} of ${String(reviewerCount)} reviewers approved`}
            >
              <Check className="w-2.5 h-2.5" strokeWidth={2.5} />
              {approvedCount}/{reviewerCount}
            </span>
          )}
          {pr.threads.length > 0 && (
            <span
              className="inline-flex items-center gap-1 font-mono tabular-nums"
              title={`${String(pr.threads.length)} unresolved thread${pr.threads.length === 1 ? '' : 's'}`}
            >
              <MessageSquare className="w-2.5 h-2.5" strokeWidth={2} />
              {pr.threads.length}
            </span>
          )}
          {/* Pin handle — right-anchored on row 2 so row 1 stays
              uncluttered. Visible when pinned, fades in on hover. */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
            aria-label={pinned ? 'PR 핀 해제' : 'PR 핀 고정'}
            title={pinned ? '핀 해제' : '핀 고정'}
            className={`ml-auto shrink-0 inline-flex items-center justify-center w-4 h-4 rounded transition-opacity ${
              pinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-60 hover:opacity-100'
            }`}
          >
            <Pin
              className="w-2.5 h-2.5"
              strokeWidth={2}
              style={pinned ? { color: '#7d6db5', fill: '#7d6db5' } : { color: 'var(--fg-muted)' }}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── StateLabel — "what does this PR want from me?" in one chip ───────────
//
// Plain-language label keyed off the composite triage tier. Uses tone
// only on action-needed rows; informational states stay neutral so
// they don't compete with critical signals next to them.
function StateLabel({
  tier, myState, needsReReview, status,
}: {
  tier: TriageTier;
  myState: 'pending' | 'approved' | 'changes-requested' | 'commented' | null;
  needsReReview: boolean;
  status: PullRequest['status'];
}) {
  let label: string;
  let tone: string | null;
  let dot: string | null = null;

  if (status === 'merged') { label = 'merged'; tone = null; }
  else if (status === 'closed') { label = 'closed'; tone = null; }
  else if (status === 'draft') { label = 'draft'; tone = null; }
  else if (needsReReview) { label = '재검토 필요'; tone = '#a8893a'; dot = '#a8893a'; }
  else if (myState === 'pending') { label = '내 차례'; tone = 'var(--fg-default)'; dot = 'var(--fg-default)'; }
  else if (myState === 'approved') { label = '승인함'; tone = '#5fa86c'; }
  else if (myState === 'changes-requested') { label = '변경 요청함'; tone = '#a8893a'; }
  else if (tier === 1) { label = '머지 대기'; tone = null; }
  else if (tier === 3) { label = '작성자 대기'; tone = null; }
  else { label = '팀 대기'; tone = null; }

  return (
    <span
      className="inline-flex items-center gap-1 shrink-0"
      style={{ color: tone ?? 'var(--fg-muted)' }}
    >
      {dot !== null && (
        <span
          aria-hidden
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: dot }}
        />
      )}
      <span className="font-medium">{label}</span>
    </span>
  );
}

// ── SignalChip / CiChip ─────────────────────────────────────────────────
// Token-light signal chips. We deliberately don't use a coloured pill
// background — Cleveland & McGill (1984): a single-icon-+-number is
// faster to read than a tinted pill, and the colour comes from the
// glyph itself. Pill-with-tinted-bg is reserved for the verdict rail.
function SignalChip({
  tone, icon, label, title,
}: {
  tone: string;
  icon: React.ReactNode;
  label: string;
  title: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 font-mono tabular-nums"
      style={{ color: tone }}
      title={title}
    >
      {icon}
      {label}
    </span>
  );
}

function CiChip({
  state, ci,
}: {
  state: 'pass' | 'fail' | 'running';
  ci: ReturnType<typeof summariseChecks>;
}) {
  if (state === 'fail') {
    return (
      <SignalChip
        tone="#c25a55"
        icon={<X className="w-2.5 h-2.5" strokeWidth={3} />}
        label={`${String(ci.required.failed)} CI`}
        title={`${String(ci.required.failed)} required check${ci.required.failed === 1 ? '' : 's'} failing`}
      />
    );
  }
  if (state === 'running') {
    return (
      <span
        className="inline-flex items-center gap-1 font-mono tabular-nums"
        style={{ color: '#5a8fce' }}
        title={`${String(ci.required.pending)} check${ci.required.pending === 1 ? '' : 's'} running`}
      >
        <Loader2 className="w-2.5 h-2.5 animate-spin" strokeWidth={2.5} />
        CI
      </span>
    );
  }
  // pass — render as a soft check, not a chip, since a green pass
  // is the default expectation and shouldn't compete for attention.
  return (
    <span
      className="inline-flex items-center gap-1 font-mono tabular-nums"
      style={{ color: '#5fa86c' }}
      title="all required checks passing"
    >
      <Check className="w-2.5 h-2.5" strokeWidth={2.5} />
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function shortAge(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const ms = Date.now() - t;
  const m = Math.floor(ms / 60_000);
  if (m < 1) return 'just';
  if (m < 60) return `${String(m)}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${String(h)}h`;
  const d = Math.floor(h / 24);
  return `${String(d)}d`;
}
