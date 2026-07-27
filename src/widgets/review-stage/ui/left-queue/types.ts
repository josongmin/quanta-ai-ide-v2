import type {
  computePrRisk, engineSummary, summariseChecks,
  PullRequest,
} from '@entities/pr';

// Queue scope filter. Lives on this leaf types module (not LeftQueue.tsx) so the
// lib helpers and sibling parts import it without a cycle back through LeftQueue.
export type QueueScope = 'all' | 'mine' | 'archived';

// ── Annotated PR — pre-computed signals consumed by sort + render ────────
export type Annotated = {
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
export type TriageTier = 0 | 1 | 2 | 3 | 4 | 5;
