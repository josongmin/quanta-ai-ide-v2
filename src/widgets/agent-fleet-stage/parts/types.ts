// Domain types for the /agents fleet console. Mirrors the
// Routine → Run → Step model from CI/CD pipelines (Pipeline → Run → Job)
// because the mental model is already familiar to engineers.

// Narrow translator signature shared across the fleet-stage view layer.
export type TranslateFn = (k: string, opts?: Record<string, unknown>) => string;

export type RoutineStatus = 'active' | 'paused' | 'draft';

export type RoutineKind =
  | 'quality-sweeper'
  | 'dead-code'
  | 'flaky-tests'
  | 'dep-caretaker'
  | 'perf-hunter'
  | 'docs-drift';

// 5-tuple definition: trigger + mode + guardrails + outputs + metrics.
export type Routine = {
  id: string;
  kind: RoutineKind;
  name: string;
  description: string;
  status: RoutineStatus;
  // ───────── trigger
  trigger: RoutineTrigger;
  nextFireAtMs?: number;
  // ───────── trust + scope
  trustLevel: 1 | 2 | 3 | 4 | 5;
  // Repos / paths the routine is scoped to. Pure metadata in the demo.
  scope: { repos: string[]; pathGlobs?: string[] };
  // ───────── guardrails
  guardrails: RoutineGuardrails;
  // ───────── budget
  budget: { dailyUsd: number; weeklyUsd: number; perRunUsd: number };
  // ───────── outputs / signal
  outputKind: 'pr' | 'issue' | 'report';
  // ───────── carryover memory (Reflexion / Voyager pattern)
  memoryItemCount: number;
  // ───────── rolling metrics over the last 30d
  metrics: RoutineMetrics;
};

export type RoutineTrigger =
  | { kind: 'cron'; spec: string; humanLabel: string }
  | { kind: 'event'; event: 'pr.merged' | 'ci.failed' | 'dep.released' | 'bench.regressed' }
  | { kind: 'manual' };

export type RoutineGuardrails = {
  maxLocPerPr: number;
  // Files the routine MUST NOT touch. Demo carries one or two glob strings.
  forbiddenPaths: string[];
  // Confidence floor for unattended PR creation. Below this, the routine
  // opens an issue instead — same surface, lower blast.
  confidenceFloor: number;
  requireGreenCi: boolean;
  // HITL = human-in-the-loop checkpoints inside the run. Pattern from
  // 2025 SWE-agent eval data: 1–2 checkpoints adds +20-30%p accuracy.
  hitlCheckpoints: HitlCheckpoint[];
};

export type HitlCheckpoint = 'plan-approval' | 'pre-push' | 'risky-tier-only';

export type RoutineMetrics = {
  runs30d: number;
  prsMerged30d: number;
  prsRejected30d: number;
  issuesOpened30d: number;
  // 0..1 success rate (PRs merged / PRs opened that reached review).
  successRate: number;
  // Mean lines-of-code touched per merged PR.
  avgLocPerPr: number;
  // Reviewer-touches: edits the human made on the agent's PR before merge.
  // Target = 0 (one-shot land). Lower is better.
  reviewerTouches: number;
  // Aggregate spend in the window.
  spentUsd: number;
  // Net LOC delta — positive = lines added, negative = lines deleted.
  // Useful for routines like Dead Code Excavator where -LOC is the goal.
  netLocDelta: number;
  // Saved human review hours (estimate). Drives the ROI ribbon.
  reviewHoursSaved: number;
};

// ─── Run ──────────────────────────────────────────────────────────────────

export type RunStatus =
  | 'queued'
  | 'running'
  | 'awaiting-human'
  | 'merged'
  | 'closed'
  | 'failed'
  | 'cancelled';

export type Run = {
  id: string;
  routineId: string;
  startedAtMs: number;
  endedAtMs?: number;
  status: RunStatus;
  // Human-readable triggered-by string.
  triggeredBy: string;
  // Trust dial snapshot at run start (might be lower than routine's
  // ceiling if a guardrail forced a downgrade).
  effectiveTrust: 1 | 2 | 3 | 4 | 5;
  // Risk tier of the diff this run produced. Mirrors the coding-stage
  // chip taxonomy so the symbol is shared across the product.
  blastRadius?: 'safe' | 'review' | 'blast-radius';
  steps: RunStep[];
  // Best-of-N candidates. When > 1, the run forked into N sandboxes and
  // the winner is the one whose `selected === true`.
  candidates?: RunCandidate[];
  // Final output, if any.
  output?: RunOutput;
  // Cumulative cost so far / final.
  costUsd: number;
  // Confidence the agent reports about its own answer (0..1).
  selfConfidence?: number;
};

export type RunStep = {
  id: string;
  // Phase taxonomy is intentionally a SUPERSET of the coding-stage's so
  // turns and steps share a colour palette in the renderer.
  phase: 'plan' | 'reading' | 'searching' | 'editing' | 'running' | 'reviewing' | 'pr';
  label: string;
  // Lifecycle for the step itself.
  state: 'pending' | 'running' | 'ok' | 'fail' | 'skipped' | 'gated';
  startedAtMs?: number;
  durationMs?: number;
  // Optional 1-line note ("12 files searched", "3 hunks rejected").
  note?: string;
  // If the step is gated on a human, this tells the UI which checkpoint.
  hitlGate?: HitlCheckpoint;
};

export type RunCandidate = {
  id: string;
  model: string;
  selfEval: number; // 0..1
  costUsd: number;
  selected: boolean;
  // 1-line summary of the candidate's approach.
  approach: string;
};

export type RunOutput =
  | { kind: 'pr'; number: number; title: string; added: number; removed: number; files: number; url: string }
  | { kind: 'issue'; number: number; title: string; url: string }
  | { kind: 'report'; title: string; lineCount: number };

// ─── HITL queue ───────────────────────────────────────────────────────────

export type HitlItem = {
  id: string;
  runId: string;
  routineId: string;
  checkpoint: HitlCheckpoint;
  // Short reason string ("plan ready for approval", "diff exceeds 50 LOC").
  reason: string;
  // How long it has been waiting. Used to colour-rank attention.
  waitingMs: number;
  // Suggested action that 1-click approves.
  suggestedAction: string;
};

// ─── Fleet-level ──────────────────────────────────────────────────────────

export type FleetHealth = {
  // Active concurrent runs vs max concurrency.
  running: number;
  maxConcurrency: number;
  queued: number;
  // Token spend over the past hour and projected daily run-rate.
  spendLastHourUsd: number;
  projectedDailyUsd: number;
  // Anomalies the loop-detector / cost-governor flagged.
  alerts: FleetAlert[];
  // Rolling 7d totals — feeds the ROI ribbon.
  weekRoi: {
    prsMerged: number;
    locDeleted: number;
    reviewHoursSaved: number;
    totalSpentUsd: number;
  };
  // Cross-routine file-conflict detector. Pairs of routines that touched
  // the same file in flight; surfaces in the fleet rail to suggest
  // serialising one of them.
  conflicts: { routineIdA: string; routineIdB: string; path: string }[];
  // Attention budget — Google SRE-style toil cap. If projected reviewer
  // hours this week exceed `budgetHours`, the fleet auto-throttles
  // routines marked `low-priority`.
  attention: {
    spentHours: number;
    budgetHours: number;
  };
};

export type FleetAlert = {
  id: string;
  kind: 'loop' | 'cost-spike' | 'pr-storm' | 'silent-failure' | 'guardrail-hit';
  severity: 'info' | 'warn' | 'crit';
  routineId?: string;
  message: string;
  atMs: number;
};
