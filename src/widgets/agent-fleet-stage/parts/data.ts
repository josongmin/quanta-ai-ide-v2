import type {
  FleetHealth, HitlItem, Routine, Run,
} from './types';

const NOW = Date.parse('2026-05-10T11:30:00Z');
const M = 60_000;
const H = 3600_000;
const D = 86400_000;

// ─── Routines ─────────────────────────────────────────────────────────────

export const SAMPLE_ROUTINES: Routine[] = [
  {
    id: 'r-quality',
    kind: 'quality-sweeper',
    name: 'Quality Sweeper',
    description: 'Picks low-risk lint, type-only, and dead-import fixes — one PR per finding, capped at 30 LOC.',
    status: 'active',
    trigger: { kind: 'cron', spec: '0 3 * * *', humanLabel: 'Every day at 03:00 UTC' },
    nextFireAtMs: NOW + 9 * H + 30 * M,
    trustLevel: 4,
    scope: { repos: ['acme/monorepo'] },
    guardrails: {
      maxLocPerPr: 30,
      forbiddenPaths: ['**/migrations/**', '**/*.generated.ts'],
      confidenceFloor: 0.8,
      requireGreenCi: true,
      hitlCheckpoints: [],
    },
    budget: { dailyUsd: 5, weeklyUsd: 25, perRunUsd: 0.6 },
    outputKind: 'pr',
    memoryItemCount: 12,
    metrics: {
      runs30d: 187, prsMerged30d: 142, prsRejected30d: 9, issuesOpened30d: 4,
      successRate: 0.94, avgLocPerPr: 11, reviewerTouches: 0.3,
      spentUsd: 18.42, netLocDelta: -2186, reviewHoursSaved: 18.4,
    },
  },
  {
    id: 'r-deadcode',
    kind: 'dead-code',
    name: 'Dead Code Excavator',
    description: 'Static-reachability + LLM use-case reasoning + test coverage triangulation. PRs only above 0.85 confidence.',
    status: 'active',
    trigger: { kind: 'cron', spec: '0 4 * * 1', humanLabel: 'Every Monday at 04:00 UTC' },
    nextFireAtMs: NOW + 4 * D + 16 * H,
    trustLevel: 3,
    scope: { repos: ['acme/monorepo'], pathGlobs: ['src/**', 'packages/**'] },
    guardrails: {
      maxLocPerPr: 200,
      forbiddenPaths: ['**/api/**', '**/*.d.ts'],
      confidenceFloor: 0.85,
      requireGreenCi: true,
      hitlCheckpoints: ['plan-approval'],
    },
    budget: { dailyUsd: 10, weeklyUsd: 40, perRunUsd: 4 },
    outputKind: 'pr',
    memoryItemCount: 8,
    metrics: {
      runs30d: 4, prsMerged30d: 3, prsRejected30d: 1, issuesOpened30d: 2,
      successRate: 0.75, avgLocPerPr: 142, reviewerTouches: 1.2,
      spentUsd: 12.06, netLocDelta: -612, reviewHoursSaved: 5.1,
    },
  },
  {
    id: 'r-flaky',
    kind: 'flaky-tests',
    name: 'Flaky Test Investigator',
    description: 'On CI failure: K-of-N retry pattern + git-blame causal hypothesis. Files an issue with reproduction script.',
    status: 'active',
    trigger: { kind: 'event', event: 'ci.failed' },
    trustLevel: 2,
    scope: { repos: ['acme/monorepo'] },
    guardrails: {
      maxLocPerPr: 60,
      forbiddenPaths: [],
      confidenceFloor: 0.6,
      requireGreenCi: false,
      hitlCheckpoints: ['pre-push'],
    },
    budget: { dailyUsd: 8, weeklyUsd: 35, perRunUsd: 1.2 },
    outputKind: 'issue',
    memoryItemCount: 21,
    metrics: {
      runs30d: 36, prsMerged30d: 4, prsRejected30d: 2, issuesOpened30d: 28,
      successRate: 0.67, avgLocPerPr: 38, reviewerTouches: 2.4,
      spentUsd: 9.85, netLocDelta: 84, reviewHoursSaved: 7.2,
    },
  },
  {
    id: 'r-deps',
    kind: 'dep-caretaker',
    name: 'Dependency Caretaker',
    description: 'Watches upstream releases. Safe minor/patch → auto-PR. Breaking changes → upgrade-plan PR with impact map.',
    status: 'active',
    trigger: { kind: 'event', event: 'dep.released' },
    trustLevel: 3,
    scope: { repos: ['acme/monorepo'] },
    guardrails: {
      maxLocPerPr: 400,
      forbiddenPaths: [],
      confidenceFloor: 0.7,
      requireGreenCi: true,
      hitlCheckpoints: ['pre-push'],
    },
    budget: { dailyUsd: 6, weeklyUsd: 24, perRunUsd: 2 },
    outputKind: 'pr',
    memoryItemCount: 31,
    metrics: {
      runs30d: 41, prsMerged30d: 33, prsRejected30d: 3, issuesOpened30d: 5,
      successRate: 0.85, avgLocPerPr: 88, reviewerTouches: 0.9,
      spentUsd: 14.6, netLocDelta: 412, reviewHoursSaved: 9.8,
    },
  },
  {
    id: 'r-perf',
    kind: 'perf-hunter',
    name: 'Performance Regression Hunter',
    description: 'Picks up Codspeed regressions, captures flame graphs, drafts a hypothesis + experiment PR behind a feature flag.',
    status: 'paused',
    trigger: { kind: 'event', event: 'bench.regressed' },
    trustLevel: 2,
    scope: { repos: ['acme/monorepo'], pathGlobs: ['packages/runtime/**'] },
    guardrails: {
      maxLocPerPr: 80,
      forbiddenPaths: [],
      confidenceFloor: 0.75,
      requireGreenCi: true,
      hitlCheckpoints: ['plan-approval', 'pre-push'],
    },
    budget: { dailyUsd: 4, weeklyUsd: 18, perRunUsd: 1.5 },
    outputKind: 'pr',
    memoryItemCount: 4,
    metrics: {
      runs30d: 3, prsMerged30d: 1, prsRejected30d: 0, issuesOpened30d: 1,
      successRate: 0.5, avgLocPerPr: 64, reviewerTouches: 3.0,
      spentUsd: 2.45, netLocDelta: -18, reviewHoursSaved: 1.4,
    },
  },
  {
    id: 'r-docs',
    kind: 'docs-drift',
    name: 'Docs Drift Patcher',
    description: 'On PR merge: detects signature changes via AST diff and updates the corresponding docstrings + README sections.',
    status: 'draft',
    trigger: { kind: 'event', event: 'pr.merged' },
    trustLevel: 4,
    scope: { repos: ['acme/monorepo'] },
    guardrails: {
      maxLocPerPr: 120,
      forbiddenPaths: [],
      confidenceFloor: 0.8,
      requireGreenCi: false,
      hitlCheckpoints: [],
    },
    budget: { dailyUsd: 3, weeklyUsd: 12, perRunUsd: 0.4 },
    outputKind: 'pr',
    memoryItemCount: 0,
    metrics: {
      runs30d: 0, prsMerged30d: 0, prsRejected30d: 0, issuesOpened30d: 0,
      successRate: 0, avgLocPerPr: 0, reviewerTouches: 0,
      spentUsd: 0, netLocDelta: 0, reviewHoursSaved: 0,
    },
  },
];

// ─── Runs ─────────────────────────────────────────────────────────────────

export const SAMPLE_RUNS: Run[] = [
  // Live: Quality Sweeper running right now
  {
    id: 'run-q-1042',
    routineId: 'r-quality',
    startedAtMs: NOW - 4 * M,
    status: 'running',
    triggeredBy: 'cron · 03:00 UTC',
    effectiveTrust: 4,
    blastRadius: 'safe',
    costUsd: 0.18,
    selfConfidence: 0.91,
    steps: [
      { id: 's1', phase: 'plan',     label: 'Build candidate list', state: 'ok',      durationMs: 12_400, note: '14 lint findings, 6 dead imports' },
      { id: 's2', phase: 'reading',  label: 'Read 6 files',         state: 'ok',      durationMs: 8_900 },
      { id: 's3', phase: 'editing',  label: 'Apply fixes',          state: 'running', startedAtMs: NOW - 90_000 },
      { id: 's4', phase: 'running',  label: 'pnpm test --changed',  state: 'pending' },
      { id: 's5', phase: 'reviewing',label: 'Self-review diff',     state: 'pending' },
      { id: 's6', phase: 'pr',       label: 'Open PR',              state: 'pending' },
    ],
  },
  // Awaiting human: Dead-code excavator hit plan-approval gate
  {
    id: 'run-d-204',
    routineId: 'r-deadcode',
    startedAtMs: NOW - 18 * M,
    status: 'awaiting-human',
    triggeredBy: 'cron · Mon 04:00',
    effectiveTrust: 3,
    blastRadius: 'review',
    costUsd: 1.42,
    selfConfidence: 0.78,
    steps: [
      { id: 's1', phase: 'plan',     label: 'Reachability scan',    state: 'ok',     durationMs: 142_000, note: '38 candidates, 12 high-confidence' },
      { id: 's2', phase: 'searching',label: 'Triangulate evidence', state: 'ok',     durationMs: 88_000, note: 'static + tests + LLM trace' },
      { id: 's3', phase: 'reviewing',label: 'Plan approval',        state: 'gated',  hitlGate: 'plan-approval' },
      { id: 's4', phase: 'editing',  label: 'Apply removals',       state: 'pending' },
      { id: 's5', phase: 'running',  label: 'Run full test suite',  state: 'pending' },
      { id: 's6', phase: 'pr',       label: 'Open PR',              state: 'pending' },
    ],
    candidates: [
      { id: 'c1', model: 'opus 4.7',   selfEval: 0.86, costUsd: 0.62, selected: true,  approach: 'Conservative — drop only zero-import symbols' },
      { id: 'c2', model: 'opus 4.7',   selfEval: 0.78, costUsd: 0.51, selected: false, approach: 'Aggressive — fold reachable-but-unused branches too' },
      { id: 'c3', model: 'sonnet 4.6', selfEval: 0.71, costUsd: 0.29, selected: false, approach: 'Cheap pass — only deletes whole files' },
    ],
  },
  // Recent merge: Quality Sweeper, ~25m ago
  {
    id: 'run-q-1041',
    routineId: 'r-quality',
    startedAtMs: NOW - 28 * M,
    endedAtMs: NOW - 23 * M,
    status: 'merged',
    triggeredBy: 'cron · 03:00 UTC',
    effectiveTrust: 4,
    blastRadius: 'safe',
    costUsd: 0.42,
    selfConfidence: 0.93,
    output: { kind: 'pr', number: 8412, title: 'chore: prune unused imports across packages/*', added: 0, removed: 24, files: 7, url: 'https://github.com/acme/monorepo/pull/8412' },
    steps: [
      { id: 's1', phase: 'plan',     label: 'Build candidate list', state: 'ok', durationMs: 9_200 },
      { id: 's2', phase: 'reading',  label: 'Read 7 files',         state: 'ok', durationMs: 6_400 },
      { id: 's3', phase: 'editing',  label: 'Apply fixes',          state: 'ok', durationMs: 14_800 },
      { id: 's4', phase: 'running',  label: 'pnpm test --changed',  state: 'ok', durationMs: 38_400, note: '142 passed' },
      { id: 's5', phase: 'reviewing',label: 'Self-review diff',     state: 'ok', durationMs: 4_200 },
      { id: 's6', phase: 'pr',       label: 'Open PR #8412',        state: 'ok', durationMs: 2_100 },
    ],
  },
  // Failed: Flaky investigator gave up
  {
    id: 'run-f-77',
    routineId: 'r-flaky',
    startedAtMs: NOW - 2 * H - 14 * M,
    endedAtMs: NOW - 2 * H - 5 * M,
    status: 'failed',
    triggeredBy: 'event · ci.failed (workflow #19284)',
    effectiveTrust: 2,
    costUsd: 0.84,
    selfConfidence: 0.32,
    steps: [
      { id: 's1', phase: 'plan',     label: 'Form hypothesis',     state: 'ok',   durationMs: 24_000, note: 'race · concurrent rotation' },
      { id: 's2', phase: 'running',  label: 'Replay 30× in matrix', state: 'ok',  durationMs: 412_000, note: 'flake confirmed at 11/30' },
      { id: 's3', phase: 'reviewing',label: 'Pick fix candidate',  state: 'fail', durationMs: 18_000, note: 'no candidate ≥ confidence floor' },
    ],
    output: { kind: 'issue', number: 5119, title: 'flaky: receipt session race confirmed (11/30)', url: 'https://github.com/acme/monorepo/issues/5119' },
  },
  // Merged Caretaker run
  {
    id: 'run-x-540',
    routineId: 'r-deps',
    startedAtMs: NOW - 5 * H,
    endedAtMs: NOW - 4 * H - 47 * M,
    status: 'merged',
    triggeredBy: 'event · @vitejs/plugin-react@4.4.0',
    effectiveTrust: 3,
    blastRadius: 'safe',
    costUsd: 0.92,
    selfConfidence: 0.88,
    output: { kind: 'pr', number: 8407, title: 'deps: bump @vitejs/plugin-react 4.3.1 → 4.4.0', added: 8, removed: 8, files: 2, url: 'https://github.com/acme/monorepo/pull/8407' },
    steps: [
      { id: 's1', phase: 'plan',     label: 'Read changelog',         state: 'ok', durationMs: 11_000 },
      { id: 's2', phase: 'searching',label: 'Map breaking surface',   state: 'ok', durationMs: 22_000, note: '0 affected callsites' },
      { id: 's3', phase: 'editing',  label: 'Bump + lockfile refresh',state: 'ok', durationMs: 18_000 },
      { id: 's4', phase: 'running',  label: 'pnpm test',              state: 'ok', durationMs: 92_000, note: 'green' },
      { id: 's5', phase: 'pr',       label: 'Open PR #8407',          state: 'ok', durationMs: 2_400 },
    ],
  },
  // Cancelled by cost governor
  {
    id: 'run-q-1040',
    routineId: 'r-quality',
    startedAtMs: NOW - 6 * H - 20 * M,
    endedAtMs: NOW - 6 * H - 12 * M,
    status: 'cancelled',
    triggeredBy: 'cron · 03:00 UTC',
    effectiveTrust: 4,
    costUsd: 0.6,
    steps: [
      { id: 's1', phase: 'plan',     label: 'Build candidate list', state: 'ok',     durationMs: 10_000 },
      { id: 's2', phase: 'reading',  label: 'Read 41 files',        state: 'ok',     durationMs: 64_000 },
      { id: 's3', phase: 'editing',  label: 'Apply fixes',          state: 'skipped', note: 'per-run budget hit ($0.60)' },
    ],
  },
];

// ─── HITL queue ───────────────────────────────────────────────────────────

export const SAMPLE_HITL_QUEUE: HitlItem[] = [
  {
    id: 'h-1',
    runId: 'run-d-204',
    routineId: 'r-deadcode',
    checkpoint: 'plan-approval',
    reason: 'Plan ready: 12 high-confidence removals across 6 packages',
    waitingMs: 9 * M,
    suggestedAction: 'Approve plan',
  },
  {
    id: 'h-2',
    runId: 'run-x-553',
    routineId: 'r-deps',
    checkpoint: 'pre-push',
    reason: 'react-router 6.30 → 7.0 (breaking) · upgrade-plan PR draft ready',
    waitingMs: 42 * M,
    suggestedAction: 'Open draft PR',
  },
  {
    id: 'h-3',
    runId: 'run-f-92',
    routineId: 'r-flaky',
    checkpoint: 'pre-push',
    reason: 'Reproducible 11/30 race · proposed retry-with-jitter fix',
    waitingMs: 2 * H + 18 * M,
    suggestedAction: 'Send fix as PR',
  },
];

// ─── Fleet health ─────────────────────────────────────────────────────────

export const SAMPLE_FLEET_HEALTH: FleetHealth = {
  running: 1,
  maxConcurrency: 4,
  queued: 2,
  spendLastHourUsd: 0.62,
  projectedDailyUsd: 14.88,
  weekRoi: {
    prsMerged: 184,
    locDeleted: 2818,
    reviewHoursSaved: 41.9,
    totalSpentUsd: 57.38,
  },
  conflicts: [
    { routineIdA: 'r-quality', routineIdB: 'r-deadcode', path: 'packages/runtime/src/index.ts' },
  ],
  attention: { spentHours: 6.2, budgetHours: 10 },
  alerts: [
    {
      id: 'a-1',
      kind: 'pr-storm',
      severity: 'warn',
      routineId: 'r-quality',
      message: '7 PRs in the last hour — close to reviewer rate-limit (8/hr).',
      atMs: NOW - 12 * M,
    },
    {
      id: 'a-2',
      kind: 'guardrail-hit',
      severity: 'info',
      routineId: 'r-quality',
      message: 'Skipped 41-file edit at per-run budget cap ($0.60).',
      atMs: NOW - 6 * H - 12 * M,
    },
    {
      id: 'a-3',
      kind: 'silent-failure',
      severity: 'crit',
      routineId: 'r-flaky',
      message: 'No candidate cleared 0.6 confidence floor — opened issue #5119 instead.',
      atMs: NOW - 2 * H - 5 * M,
    },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────

export function getRoutine(id: string): Routine | undefined {
  return SAMPLE_ROUTINES.find((r) => r.id === id);
}

export function runsForRoutine(routineId: string): Run[] {
  return SAMPLE_RUNS
    .filter((r) => r.routineId === routineId)
    .sort((a, b) => b.startedAtMs - a.startedAtMs);
}

export function relativeFromMs(ms: number, now = NOW): string {
  const dt = now - ms;
  if (dt < 60_000) return 'just now';
  if (dt < H) return `${Math.round(dt / M)}m ago`;
  if (dt < D) return `${Math.round(dt / H)}h ago`;
  return `${Math.round(dt / D)}d ago`;
}

export function relativeUntilMs(ms: number, now = NOW): string {
  const dt = ms - now;
  if (dt <= 0) return 'now';
  if (dt < H) return `in ${Math.round(dt / M)}m`;
  if (dt < D) return `in ${Math.round(dt / H)}h`;
  return `in ${Math.round(dt / D)}d`;
}
