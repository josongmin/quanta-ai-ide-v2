// ─────────────────────────────────────────────────────────────────────────
// authorVelocity — derive per-author velocity stats from the PR set.
//
// "Velocity" here is *not* a productivity metric (those measure poorly
// and demoralise teams — DeMarco & Lister, "Peopleware", 1987). It's
// a *queue-readiness* signal: how fast does this author's typical PR
// move through review? A reviewer about to open a fresh PR can use
// the author's velocity to set expectations:
//
//   • "median 4h to merge" → author is responsive, expect quick turns
//   • "median 3 days, p95 12 days" → author often stalls; budget more
//   • mean LOC delta → "this author writes small PRs / huge PRs"
//
// Why surface these (objective grounding):
//
//   • Sadowski et al. (Google ICSE 2018) — reviewer expectations
//     mismatch with author rhythm is a top-5 friction. Surfacing
//     "this author's median is X" pre-aligns expectations.
//   • Bird & Nagappan (MS, 2014) — review cycle time variance
//     correlates with team morale; visible feedback loops let
//     authors self-regulate.
//
// Returns null when the author has fewer than 2 PRs in the sample —
// median over 1 datapoint is meaningless.
// ─────────────────────────────────────────────────────────────────────────

import type { PullRequest } from '@entities/pr';

export type AuthorStats = {
  login: string;
  prCount: number;
  /** Median PR-cycle hours (createdAt → updatedAt). */
  medianHours: number;
  /** P95 cycle hours — worst-case tail. */
  p95Hours: number;
  /** Mean LOC delta (added + removed). */
  meanLoc: number;
  /** Z-score of *this* PR's LOC vs author's distribution. */
  thisLocZ: number | null;
};

export function authorStatsFor(login: string, allPrs: PullRequest[]): AuthorStats | null {
  const own = allPrs.filter((p) => p.author === login);
  if (own.length < 2) return null;
  const cycleHours = own.map((p) => {
    const start = new Date(p.createdAt).getTime();
    const end = new Date(p.updatedAt).getTime();
    return Math.max(0, (end - start) / 3_600_000);
  });
  const locs = own.map((p) => p.added + p.removed);
  const median = quantile(cycleHours, 0.5);
  const p95 = quantile(cycleHours, 0.95);
  const meanLoc = locs.reduce((a, b) => a + b, 0) / locs.length;
  return {
    login,
    prCount: own.length,
    medianHours: median,
    p95Hours: p95,
    meanLoc,
    thisLocZ: null,
  };
}

export function thisVsAuthorZ(pr: PullRequest, allPrs: PullRequest[]): number | null {
  const own = allPrs.filter((p) => p.author === pr.author);
  if (own.length < 3) return null;
  const locs = own.map((p) => p.added + p.removed);
  const mean = locs.reduce((a, b) => a + b, 0) / locs.length;
  const variance = locs.reduce((acc, v) => acc + (v - mean) ** 2, 0) / locs.length;
  const std = Math.sqrt(variance);
  if (std === 0) return null;
  return ((pr.added + pr.removed) - mean) / std;
}

function quantile(arr: number[], q: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * q;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function formatHoursCompact(h: number): string {
  if (h < 1) return `${String(Math.max(1, Math.round(h * 60)))}m`;
  if (h < 24) return `${String(Math.round(h))}h`;
  return `${String(Math.round(h / 24))}d`;
}
