// Phase 2 + 3 demo data, keyed by FixCase.id. Kept separate from
// mockData.ts so the Phase 1 surface stays focused.

import type {
  ReanalysisDelta, ReviewerCandidate, PolicyThreshold, RollbackPlan, DismissedRecord,
} from './types';

export const REANALYSIS: Record<string, ReanalysisDelta[]> = {
  'case-payments-redirect': [
    { metric: 'taint paths',   before: 3, after: 0 },
    { metric: 'blast modules', before: 2, after: 1 },
    { metric: 'policy hits',   before: 1, after: 0 },
    { metric: 'unknown zone',  before: 2, after: 0, unit: 'callers' },
    { metric: 'hotspot score', before: 84, after: 21 },
  ],
  'case-stale-cache': [
    { metric: 'hotspot score', before: 71, after: 28 },
    { metric: 'blast modules', before: 1, after: 1 },
    { metric: 'unknown zone',  before: 1, after: 0, unit: 'callers' },
    { metric: 'taint paths',   before: 0, after: 0 },
  ],
  'case-typo-deprecated': [
    { metric: 'policy hits',   before: 1, after: 0 },
    { metric: 'blast modules', before: 1, after: 1 },
    { metric: 'taint paths',   before: 0, after: 0 },
    { metric: 'hotspot score', before: 31, after: 12 },
  ],
  'case-flaky-checkout': [],
};

export const REVIEWERS: Record<string, ReviewerCandidate[]> = {
  'case-payments-redirect': [
    { handle: '@payments-oncall', role: 'codeowner', loadPct: 42, matchScore: 0.94, rationale: 'CODEOWNER for src/server/payments; primary contact for return-flow refactor.' },
    { handle: '@sec-review',      role: 'security',  loadPct: 71, matchScore: 0.88, rationale: 'redirect taint baseline must be signed off by security on incident-grade fixes.' },
    { handle: '@sandra-k',        role: 'domain',    loadPct: 22, matchScore: 0.71, rationale: 'authored the v3.4 isAllowedReturn gate; fastest review on intent.' },
  ],
  'case-stale-cache': [
    { handle: '@platform-cache', role: 'codeowner', loadPct: 38, matchScore: 0.91, rationale: 'CODEOWNER for src/server/cache; aware of #4112 simplification context.' },
    { handle: '@ops-warmup',     role: 'oncall',    loadPct: 60, matchScore: 0.66, rationale: 'rollout window touches warm-cache memory profile; oncall heads-up advised.' },
  ],
  'case-typo-deprecated': [
    { handle: '@auth-oncall',  role: 'codeowner', loadPct: 31, matchScore: 0.95, rationale: 'token format owner; dual-path decrypt landing date their call.' },
  ],
  'case-flaky-checkout': [
    { handle: '@checkout-team', role: 'domain', loadPct: 55, matchScore: 0.62, rationale: 'flake belongs to checkout fixture; engine could not isolate without team input.' },
  ],
};

// Phase 3 — global, not per-case. Simulates a "policy bundle" admin would tune.
export const POLICY_THRESHOLDS: PolicyThreshold[] = [
  { id: 'lines',  label: 'safe-mechanical max lines',   value: 20, unit: 'lines',   min: 5,  max: 80,  description: 'patches above this never qualify for one-click submit.' },
  { id: 'files',  label: 'safe-mechanical max files',   value: 2,  unit: 'files',   min: 1,  max: 10,  description: 'changing more than this many files always requires human review.' },
  { id: 'blast',  label: 'guarded max blast modules',   value: 5,  unit: 'modules', min: 1,  max: 20,  description: 'beyond this, the candidate is routed to human-required.' },
  { id: 'unknown', label: 'auto-submit unknown zone',   value: 0,  unit: 'items',   min: 0,  max: 10,  description: 'unknowns above this block auto-submit.' },
  { id: 'maxIter', label: 'self-loop max iterations',   value: 2,  unit: 'iter',    min: 1,  max: 5,   description: 'past this iteration count, escalate to human checkpoint.' },
];

export const ROLLBACK: Record<string, RollbackPlan> = {
  'case-payments-redirect': {
    trigger: 'redirect-error-rate > baseline + 1σ for 5 min, OR sec-monitor flags new taint path',
    window:  'first 60 min after rollout',
    action:  'auto-revert + reopen incident PR-2641; runbook: payments/return-rollback.md',
    owner:   '@payments-oncall',
  },
  'case-stale-cache': {
    trigger: 'cache-hit-rate < 75% for 10 min, OR p99 read latency > 200ms',
    window:  'first 30 min',
    action:  'auto-revert + flush warm pool; ops on standby for cold-start spike',
    owner:   '@platform-cache',
  },
  'case-typo-deprecated': {
    trigger: 'decrypt failure rate > 0.1% for any tenant',
    window:  'first 24h (covers the v1 → v2 prefix transition)',
    action:  'revert encrypt path only; v2 ciphertext remains decryptable post-revert',
    owner:   '@auth-oncall',
  },
  'case-flaky-checkout': {
    trigger: 'n/a — case did not produce a deliverable',
    window:  'n/a',
    action:  'n/a',
    owner:   'n/a',
  },
};

const DAY = 1000 * 60 * 60 * 24;
export const DISMISSED_FEEDBACK: DismissedRecord[] = [
  { candidateId: 'cand-prev-1', candidateTitle: 'middleware-level allowlist for all redirect routes', reasonTag: 'too-broad-blast',     note: 'class-fix during incident — wrong cadence',                  at: Date.now() - DAY * 0.4 },
  { candidateId: 'cand-prev-2', candidateTitle: 'reject return_url entirely; force server-side resolved targets', reasonTag: 'breaks-convention',  note: 'breaks integrators without a deprecation window',           at: Date.now() - DAY * 1.1 },
  { candidateId: 'cand-prev-3', candidateTitle: 'tenant-scoped cache namespace per region', reasonTag: 'unsafe-during-rollout', note: 'cold start unacceptable for the 2pm rollout slot',           at: Date.now() - DAY * 2.6 },
  { candidateId: 'cand-prev-4', candidateTitle: 'NaN clamp at reduceLineItems',           reasonTag: 'wrong-root-cause',     note: 'clamp masks the fixture race; need fixture isolation first', at: Date.now() - DAY * 4.2 },
];
