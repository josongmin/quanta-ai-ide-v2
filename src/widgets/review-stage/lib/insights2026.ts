// ─────────────────────────────────────────────────────────────────────────
// 2026 review-surface insights — derived signals layered on top of the
// existing PR model without changing it.
//
// Why each signal exists (research-grounded):
//
//   • slaForPr — DORA/State-of-DevOps surveys put p50 PR-review latency
//     around 4h for elite teams, 24h for high, 7d for low. We bucket
//     against those thresholds so a single chip on the queue row tells
//     reviewers "this is aging" before they have to read the timestamp.
//
//   • stackInfoForPr — stacked PRs (Graphite/Sapling pattern) are now
//     standard. We approximate the stack by branch-name prefix
//     ("feat/x/01-…", "feat/x/02-…") since the model doesn't carry an
//     explicit `parent` link.
//
//   • effortForPr — SmartBear "11 Best Practices" reports defect-finding
//     drops sharply past ~400 LOC and past ~60 minutes of single-sitting
//     review. We estimate minutes from added+removed (Cohen 2006: ~5
//     LOC/minute careful, ~12 LOC/minute skim) and surface a band so the
//     reviewer can self-pace.
//
//   • gateExplainer — Hick's law + recognition-over-recall: each merge
//     gate gets a one-line "why this matters" so a reviewer doesn't have
//     to recall what "SAST" or "Coverage 70%" gate-cuts at.
// ─────────────────────────────────────────────────────────────────────────

import type { PullRequest } from '@entities/pr';

// ─── SLA / aging ─────────────────────────────────────────────────────────

export type SlaBucket = 'fresh' | 'warming' | 'aging' | 'stale';

export type SlaInfo = {
  /** Hours since the PR was last updated. */
  ageHours: number;
  bucket: SlaBucket;
  /** Short label suitable for a chip ("4h", "1d", "3d"). */
  label: string;
  /** Tone hint — color comes from the call site. */
  tone: 'ok' | 'warn' | 'block';
};

const HOUR_MS = 3_600_000;

/** Bucket thresholds derived from DORA elite/high/low cohorts. */
export function slaForPr(pr: PullRequest, now: number = Date.now()): SlaInfo {
  // We anchor on `updatedAt` so a freshly-updated PR resets the clock —
  // matches GitHub's "needs review" inbox behaviour.
  const t = new Date(pr.updatedAt).getTime();
  const ageMs = Number.isNaN(t) ? 0 : Math.max(0, now - t);
  const hours = ageMs / HOUR_MS;

  // Drafts and merged/closed PRs don't accrue review SLA.
  const exempt = pr.status === 'draft' || pr.status === 'merged' || pr.status === 'closed';

  let bucket: SlaBucket;
  if (exempt)            bucket = 'fresh';
  else if (hours < 4)    bucket = 'fresh';
  else if (hours < 24)   bucket = 'warming';
  else if (hours < 72)   bucket = 'aging';
  else                   bucket = 'stale';

  const tone: SlaInfo['tone'] =
    bucket === 'stale' ? 'block'
    : bucket === 'aging' ? 'warn'
    : 'ok';

  return { ageHours: hours, bucket, label: shortAge(hours), tone };
}

function shortAge(h: number): string {
  if (h < 1)  return `${String(Math.max(1, Math.round(h * 60)))}m`;
  if (h < 24) return `${String(Math.round(h))}h`;
  const d = h / 24;
  if (d < 30) return `${String(Math.round(d))}d`;
  return `${String(Math.round(d / 30))}mo`;
}

// ─── Stacked-PR detection ────────────────────────────────────────────────

export type StackInfo = {
  /** Stack key shared by sibling PRs. Null if the PR isn't part of a stack. */
  stackKey: string | null;
  /** This PR's position in the stack (1-based), or null if not stacked. */
  position: number | null;
  /** Total PRs in the stack. */
  total: number;
  /** Sibling PR numbers in stack order — useful for tooltip / hover detail. */
  siblings: { number: number; title: string; merged: boolean; position: number }[];
};

/**
 * Detect Graphite-style stacks by branch prefix. A branch like
 * "feat/auth/01-rename" stacks with "feat/auth/02-handler" via the
 * "feat/auth" key. We only count it as a stack when ≥2 PRs share the key.
 */
export function stackInfoForPr(pr: PullRequest, all: PullRequest[]): StackInfo {
  const key = stackKeyFromBranch(pr.headBranch);
  if (key === null) {
    return { stackKey: null, position: null, total: 0, siblings: [] };
  }
  const siblings = all
    .filter((p) => stackKeyFromBranch(p.headBranch) === key)
    .map((p) => ({
      number: p.number,
      title: p.title,
      merged: p.status === 'merged',
      position: stackPositionFromBranch(p.headBranch),
    }))
    .sort((a, b) => a.position - b.position);
  if (siblings.length < 2) {
    return { stackKey: null, position: null, total: 0, siblings: [] };
  }
  const me = siblings.find((s) => s.number === pr.number);
  return {
    stackKey: key,
    position: me?.position ?? null,
    total: siblings.length,
    siblings,
  };
}

/**
 * Extract the prefix ("feat/auth") from "feat/auth/01-rename". Returns
 * null when the branch doesn't have a numeric leaf segment — we only
 * treat numerically-suffixed branches as stack candidates so unrelated
 * "feat/auth/main" doesn't accidentally cluster.
 */
function stackKeyFromBranch(branch: string): string | null {
  const segs = branch.split('/');
  if (segs.length < 2) return null;
  const leaf = segs[segs.length - 1];
  if (leaf === undefined) return null;
  if (!/^\d+(?:[-_].*)?$/.test(leaf)) return null;
  return segs.slice(0, -1).join('/');
}

function stackPositionFromBranch(branch: string): number {
  const segs = branch.split('/');
  const leaf = segs[segs.length - 1] ?? '';
  const m = /^(\d+)/.exec(leaf);
  return m === null ? 0 : Number(m[1]);
}

// ─── Reviewer Effort estimate ────────────────────────────────────────────

export type EffortInfo = {
  /** Estimated minutes for a careful first-pass review. */
  minutes: number;
  /** Bucketed for chip rendering. */
  band: 'sip' | 'cup' | 'pot' | 'kettle';
  /** Human label ("~6m", "~25m", "~1h+"). */
  label: string;
  /** Whether the PR exceeds the SmartBear ~400-LOC defect-finding threshold. */
  oversized: boolean;
};

const LOC_PER_MIN_CAREFUL = 5;       // SmartBear / Cohen baseline.
const REVIEW_FATIGUE_LOC  = 400;     // Defect-find rate falls past this.
const COMPLEX_FILE_PENALTY_MIN = 2;  // Per file marked low-safety / public-API.

/**
 * Estimate review minutes from change size + per-file complexity. Returns
 * a banded label so the chip stays glanceable; the raw minutes feed the
 * tooltip.
 */
export function effortForPr(pr: PullRequest): EffortInfo {
  const loc = pr.added + pr.removed;
  const baseMin = loc / LOC_PER_MIN_CAREFUL;

  // Complex / high-impact files cost more than their LOC suggests. We
  // proxy "complex" with the file kind + whether the diff touches many
  // hunks (a single large hunk reads faster than ten scattered ones).
  const scatteredFiles = pr.files.filter((f) => f.hunks.length >= 3).length;
  const renames        = pr.files.filter((f) => f.kind === 'renamed').length;
  const penalty = scatteredFiles * COMPLEX_FILE_PENALTY_MIN + renames * 1;

  const minutes = Math.max(1, Math.round(baseMin + penalty));

  const band: EffortInfo['band'] =
    minutes <= 10 ? 'sip'
    : minutes <= 30 ? 'cup'
    : minutes <= 60 ? 'pot'
    : 'kettle';

  const label =
    minutes <= 1 ? '~1m'
    : minutes < 60 ? `~${String(minutes)}m`
    : `~${(minutes / 60).toFixed(1)}h`;

  return { minutes, band, label, oversized: loc > REVIEW_FATIGUE_LOC };
}

export const EFFORT_BAND_LABEL: Record<EffortInfo['band'], string> = {
  sip:    'Quick',
  cup:    'Focused',
  pot:    'Deep',
  kettle: 'Heavy',
};

// ─── Gate explainers (for DecisionPipeline tooltips) ─────────────────────

export type GateKey = 'lint' | 'sast' | 'risk' | 'cov' | 'review' | 'merge';

/**
 * Plain-English "why this gate exists" copy. Kept short so the tooltip
 * doesn't wrap awkwardly at 240px. Source of the thresholds is in the
 * pipeline file itself; we only describe them here.
 */
export const GATE_EXPLAINER: Record<GateKey, string> = {
  lint:   'Required CI must pass. Failures here block merge regardless of approvals.',
  sast:   'Static-analysis blockers (auth, secrets, unsafe casts) gate merge; high findings warn.',
  risk:   'Composite of blast radius, public-API touches, low-safety files, SAST hits.',
  cov:    'Average diff-coverage across changed files. ≥70% pass · ≥50% warn · <50% fail.',
  review: 'At least one human approval required; reviewers in pending state hold the gate.',
  merge:  'Branch must be conflict-free against base before merging.',
};

// ─── Auto-merge "when green" affordance ──────────────────────────────────

export type AutoMergeReadiness = {
  /** True when only CI-pending stands between this PR and a clean merge. */
  eligible: boolean;
  reason: string | null;
};

/**
 * Decide whether the "auto-merge when green" affordance should be active.
 * Eligible iff: not already merged/closed/conflict, no failures, but at
 * least one required check is still pending. That's the exact moment when
 * an "auto-merge" toggle saves the reviewer a context switch.
 */
export function autoMergeReadiness(pr: PullRequest): AutoMergeReadiness {
  if (pr.status === 'merged') return { eligible: false, reason: 'already merged' };
  if (pr.status === 'closed') return { eligible: false, reason: 'closed' };
  if (pr.hasConflicts)        return { eligible: false, reason: 'has conflicts' };
  const required = pr.checks.filter((c) => c.required);
  const failed   = required.some((c) => c.status === 'failure' || c.status === 'cancelled');
  if (failed) return { eligible: false, reason: 'required check failed' };
  const pending  = required.filter((c) => c.status === 'pending' || c.status === 'running').length;
  if (pending === 0) return { eligible: false, reason: 'CI already green' };
  return { eligible: true, reason: null };
}
