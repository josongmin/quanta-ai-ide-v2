import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useFilterStore } from '@entities/filter-state';
import { computePrRisk, type PullRequest } from '@entities/pr';
import type { RepoData } from '@entities/repo';
import {
  useActivePr, useReviewStore, viewerLogin,
} from '@features/review-pr';
import { useReviewKeyboard } from '../lib/keyboard';
import { getSession, saveSession } from '../lib/sota';
import { DEFAULT_WEIGHTS, type InspectionWeights } from '../ui/InspectionWeights';
import { type QueueScope } from '../ui/LeftQueue';
import type { ReviewTabKey } from './types';

// Hoisted so the table is allocated once at module load instead of on every
// hook call. `setTab` can then list a stable identity in its dependency
// array without re-binding.
const SECTION_ID: Record<ReviewTabKey, string> = {
  overview: 'sec-overview',
  insights: 'sec-engine',
  files:    'sec-files',
  risk:     'sec-risk',
  checks:   'sec-checks',
  activity: 'sec-activity',
};

/** Cohesive domain object the review page renders from. Decouples
    ReviewStage from store internals (DIP) so a store shape change is
    absorbed here rather than rippling through the layout. */
export type ReviewPageState = {
  // Data the layout reads.
  prs: PullRequest[];
  repo: RepoData;
  activePr: PullRequest | null;
  viewerLogin: string;
  sectionIds: Record<ReviewTabKey, string>;

  // Queue scope / search.
  scope: QueueScope;
  setScope: (s: QueueScope) => void;
  query: string;
  setQuery: (q: string) => void;

  // Active file selection.
  activeFilePath: string | null;
  setActiveFilePath: (p: string | null) => void;

  // Inspection-path weights.
  inspectionWeights: InspectionWeights;
  setInspectionWeights: (w: InspectionWeights) => void;

  // Cheat-sheet overlay.
  showCheatSheet: boolean;
  closeCheatSheet: () => void;

  // ARIA verdict live-region text.
  verdictAnnouncement: string;

  // Refs threaded into the layout.
  scrollerRef: React.MutableRefObject<HTMLDivElement | null>;
  composerRef: React.MutableRefObject<HTMLTextAreaElement | null>;

  // Actions.
  setActivePr: (n: number) => void;
  markFileViewed: (prNumber: number, path: string, viewed: boolean) => void;
  setTab: (t: ReviewTabKey) => void;
  jumpToFile: (p: string) => void;
};

/**
 * Encapsulates every store read/write, all local state, the derived queue,
 * the session-resume + visible-numbers effects, and the keyboard wiring for
 * the review surface. ReviewStage consumes only the returned object, so the
 * store selectors stay narrow and centralised here (no widened
 * subscriptions, preserving the perf branch's re-render budget).
 */
export function useReviewPageState(): ReviewPageState {
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

  // Jump-to-file used by several cards: select the file + scroll Files.
  const jumpToFile = useCallback((p: string) => {
    setActiveFilePath(p);
    setTab('files');
  }, [setTab]);

  const closeCheatSheet = useCallback(() => { setShowCheatSheet(false); }, []);

  return {
    prs,
    repo,
    activePr,
    viewerLogin,
    sectionIds: SECTION_ID,
    scope,
    setScope,
    query,
    setQuery,
    activeFilePath,
    setActiveFilePath,
    inspectionWeights,
    setInspectionWeights,
    showCheatSheet,
    closeCheatSheet,
    verdictAnnouncement,
    scrollerRef,
    composerRef,
    setActivePr,
    markFileViewed,
    setTab,
    jumpToFile,
  };
}
