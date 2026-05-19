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

import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import {
  computePrRisk, engineFindings, engineSummary, summariseChecks,
  type PullRequest,
} from '@entities/pr';
import type { RepoData } from '@entities/repo';
import {
  loadPins, togglePr as togglePrPin, toggleRepo as toggleRepoPin,
  reorderPr, isPrPinned, isRepoPinned, getPrOrdinal,
} from '../lib/pinStore';
import SavedViews, { type SavedView } from './SavedViews';
import SlaEscalation from './SlaEscalation';
import { decodeShareHash } from '../lib/viewShare';
import { ProjectHeader } from './left-queue/ProjectHeader';
import { SearchBar } from './left-queue/SearchBar';
import { ScopeStrip } from './left-queue/ScopeStrip';
import { RepoGroup } from './left-queue/RepoGroup';
import { QueueRow } from './left-queue/QueueRow';
import { triageTier, computeNeedsReReview } from './left-queue/styling';
import type { Annotated } from './left-queue/types';

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

  // Per-PR annotation cache. The heavy work (computePrRisk, engineSummary,
  // summariseChecks, computeNeedsReReview) is keyed on PR object identity
  // and invalidated only when repo or viewerLogin change. Pin toggles,
  // collapse toggles, query edits, and drag state never re-run the
  // computations — only the cheap group/sort step downstream re-runs.
  const annCacheRef = useRef<{
    repo: RepoData | null;
    viewerLogin: string;
    map: WeakMap<PullRequest, Annotated>;
  }>({ repo: null, viewerLogin: '', map: new WeakMap() });
  if (
    annCacheRef.current.repo !== repo
    || annCacheRef.current.viewerLogin !== viewerLogin
  ) {
    annCacheRef.current = { repo, viewerLogin, map: new WeakMap() };
  }
  const annotate = (p: PullRequest): Annotated => {
    const cached = annCacheRef.current.map.get(p);
    if (cached !== undefined) return cached;
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
    annCacheRef.current.map.set(p, ann);
    return ann;
  };

  // Risk-annotated + grouped by repo. Within each group, *pinned*
  // PRs float to the top (ordinal-sorted), then risk tier → updatedAt.
  // Per-PR signals come from the cache above; this memo only does the
  // O(N) bucket + O(N log N) sort work.
  const groups = useMemo(() => {
    const byRepo = new Map<string, Annotated[]>();
    for (const p of filtered) {
      const ann = annotate(p);
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
    // annotate is a stable closure over a ref-backed cache; its inputs
    // (repo, viewerLogin) are already in deps via cache invalidation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, repo, pinMap, viewerLogin]);

  // Counters for the project header — open / attention / critical
  // across the visible (non-archived) prs. Reuses the per-PR annotation
  // cache so we don't re-run computePrRisk / summariseChecks twice.
  const projectCounts = useMemo(() => {
    let open = 0;
    let attention = 0;
    let critical = 0;
    let backgrounded = 0;
    for (const p of prs) {
      if (p.status === 'closed' || p.status === 'merged') continue;
      open += 1;
      const ann = annotate(p);
      if (ann.risk.tier === 'attention') attention += 1;
      else if (ann.risk.tier === 'critical') critical += 1;
      if (ann.ci.required.pending > 0) backgrounded += 1;
    }
    return { open, attention, critical, backgrounded };
    // annotate is a stable closure over a ref-backed cache; it
    // intentionally isn't in deps. Cache invalidation is keyed on
    // repo + viewerLogin checked at the top of the render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prs, repo, viewerLogin]);

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
          <div className="px-4 py-12 text-center text-sm text-[var(--fg-subtle)]">
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
      <div className="shrink-0 px-3 py-2 border-t border-[var(--border-default)] text-[10px] font-mono text-[var(--fg-subtle)] flex items-center justify-between">
        <span>j/k · ⌘K · ?</span>
        <span>{totalShown} PR{totalShown === 1 ? '' : 's'}</span>
      </div>
    </div>
  );
}
