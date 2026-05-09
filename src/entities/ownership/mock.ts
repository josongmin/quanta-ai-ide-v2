import type {
  ApprovalPath,
  AutoDraftSuggestion,
  CrossTeamHotspot,
  Person,
  PersonId,
  OwnershipZone,
  RefactorStack,
} from './model';

export const MOCK_PEOPLE: Person[] = [
  {
    id: 'p_jihoon',
    name: 'Jihoon Park',
    team: 'payments',
    initials: 'JP',
    avatarHue: 12,
    active: true,
    lastActiveDays: 1,
  },
  {
    id: 'p_minseo',
    name: 'Minseo Kang',
    team: 'payments',
    initials: 'MK',
    avatarHue: 28,
    active: true,
    lastActiveDays: 4,
  },
  {
    id: 'p_yuna',
    name: 'Yuna Lee',
    team: 'platform',
    initials: 'YL',
    avatarHue: 196,
    active: true,
    lastActiveDays: 2,
  },
  {
    id: 'p_hojin',
    name: 'Hojin Seo',
    team: 'platform',
    initials: 'HS',
    avatarHue: 220,
    active: true,
    lastActiveDays: 9,
  },
  {
    id: 'p_daniel',
    name: 'Daniel Cho',
    team: 'infra',
    initials: 'DC',
    avatarHue: 264,
    active: true,
    lastActiveDays: 3,
  },
  {
    id: 'p_eunji',
    name: 'Eunji Han',
    team: 'infra',
    initials: 'EH',
    avatarHue: 290,
    active: false,
    lastActiveDays: 167,
  },
  {
    id: 'p_sora',
    name: 'Sora Kim',
    team: 'frontend',
    initials: 'SK',
    avatarHue: 142,
    active: true,
    lastActiveDays: 1,
  },
  {
    id: 'p_taeyong',
    name: 'Taeyong Bae',
    team: 'frontend',
    initials: 'TB',
    avatarHue: 168,
    active: true,
    lastActiveDays: 6,
  },
  {
    id: 'p_haerin',
    name: 'Haerin Yoo',
    team: 'security',
    initials: 'HY',
    avatarHue: 348,
    active: true,
    lastActiveDays: 5,
  },
  {
    id: 'p_marcus',
    name: 'Marcus Reilly',
    team: 'security',
    initials: 'MR',
    avatarHue: 8,
    active: false,
    lastActiveDays: 213,
  },
];

export const MOCK_ZONES: OwnershipZone[] = [
  {
    id: 'z_payments_checkout',
    label: 'src/payments/checkout/',
    kind: 'folder',
    state: 'overloaded',
    scores: [
      {
        personId: 'p_jihoon',
        layer: 'declared',
        weight: 0.95,
        reason: 'CODEOWNERS lists @jihoon for src/payments/**',
      },
      {
        personId: 'p_jihoon',
        layer: 'historical',
        weight: 0.88,
        reason: 'authored 41 of last 60 commits in this folder',
      },
      {
        personId: 'p_jihoon',
        layer: 'expertise',
        weight: 0.82,
        reason: 'wrote the original 3DS adapter and PSP router',
      },
      {
        personId: 'p_jihoon',
        layer: 'impact',
        weight: 0.91,
        reason: 'resolved 5 P1 incidents tagged "checkout" in 90d',
      },
      {
        personId: 'p_minseo',
        layer: 'historical',
        weight: 0.34,
        reason: 'authored 7 commits, mostly tests',
      },
    ],
    primary: 'p_jihoon',
    backup: 'p_minseo',
    recommendedReviewer: 'p_minseo',
    escalation: 'p_yuna',
    routingConfidence: 0.78,
    reviewerRationale: {
      touchedAreaFamiliarity: 0.62,
      recentReviewer: 0.81,
      incidentResolver: 0.34,
      codeOwner: 0.4,
    },
    implementationOwner: 'p_minseo',
    approvalOwner: 'p_jihoon',
    impactNarrative: {
      declaredTeam: 'payments',
      blastTeams: ['platform', 'security'],
      summary: 'Owned by payments, but blast extends to platform (PSP router) and security (3DS adapter).',
    },
  },
  {
    id: 'z_infra_ratelimit',
    label: 'hotspot: rate-limit middleware',
    kind: 'hotspot',
    state: 'siloed',
    scores: [
      {
        personId: 'p_eunji',
        layer: 'declared',
        weight: 0.9,
        reason: 'CODEOWNERS lists @eunji for infra/rate-limit/',
      },
      {
        personId: 'p_eunji',
        layer: 'historical',
        weight: 0.97,
        reason: 'authored 28 of last 30 commits — single contributor',
      },
      {
        personId: 'p_eunji',
        layer: 'expertise',
        weight: 0.86,
        reason: 'designed the token-bucket sharding scheme',
      },
      {
        personId: 'p_daniel',
        layer: 'impact',
        weight: 0.41,
        reason: 'paged for 2 incidents while @eunji was OOO',
      },
    ],
    primary: 'p_eunji',
    backup: null,
    recommendedReviewer: 'p_daniel',
    escalation: 'p_daniel',
    routingConfidence: 0.46,
    reviewerRationale: {
      touchedAreaFamiliarity: 0.38,
      recentReviewer: 0.22,
      incidentResolver: 0.55,
      codeOwner: 0.18,
    },
    implementationOwner: 'p_daniel',
    approvalOwner: 'p_daniel',
    impactNarrative: {
      declaredTeam: 'infra',
      blastTeams: ['payments', 'platform'],
      summary: 'Single-owner infra module — every payment + platform request flows through it. Bus factor 1.',
    },
  },
  {
    id: 'z_legacy_reports',
    label: 'src/legacy/reports/',
    kind: 'folder',
    state: 'orphan',
    scores: [
      {
        personId: 'p_marcus',
        layer: 'declared',
        weight: 0.7,
        reason: 'last CODEOWNERS entry — author left active rotation',
      },
      {
        personId: 'p_marcus',
        layer: 'historical',
        weight: 0.65,
        reason: 'authored 14 of last 20 commits, all > 6 months old',
      },
      {
        personId: 'p_hojin',
        layer: 'impact',
        weight: 0.28,
        reason: 'touched 1 file fixing a CSV escape bug',
      },
      {
        personId: 'p_yuna',
        layer: 'expertise',
        weight: 0.21,
        reason: 'reviewed the original spec doc, no code contribution',
      },
    ],
    primary: 'p_marcus',
    backup: null,
    recommendedReviewer: 'p_hojin',
    escalation: 'p_yuna',
    routingConfidence: 0.31,
    reviewerRationale: {
      touchedAreaFamiliarity: 0.18,
      recentReviewer: 0.12,
      incidentResolver: 0.2,
      codeOwner: 0.05,
    },
    implementationOwner: 'p_hojin',
    approvalOwner: 'p_yuna',
    impactNarrative: {
      declaredTeam: 'security (legacy)',
      blastTeams: ['platform'],
      summary: 'Declared owner left rotation. No active maintainer; recent fixes by platform on a best-effort basis.',
    },
  },
  {
    id: 'z_frontend_design_tokens',
    label: 'src/ui/tokens/',
    kind: 'folder',
    state: 'fragmented',
    scores: [
      {
        personId: 'p_sora',
        layer: 'historical',
        weight: 0.32,
        reason: 'authored 6 commits (color tokens)',
      },
      {
        personId: 'p_taeyong',
        layer: 'historical',
        weight: 0.28,
        reason: 'authored 5 commits (typography tokens)',
      },
      {
        personId: 'p_yuna',
        layer: 'historical',
        weight: 0.22,
        reason: 'authored 4 commits (spacing tokens)',
      },
      {
        personId: 'p_hojin',
        layer: 'declared',
        weight: 0.4,
        reason: 'CODEOWNERS lists @platform-ui — 9 members, none primary',
      },
      {
        personId: 'p_sora',
        layer: 'expertise',
        weight: 0.45,
        reason: 'authored the design-tokens RFC',
      },
    ],
    primary: 'p_sora',
    backup: 'p_taeyong',
    recommendedReviewer: 'p_taeyong',
    escalation: 'p_hojin',
    routingConfidence: 0.52,
    reviewerRationale: {
      touchedAreaFamiliarity: 0.44,
      recentReviewer: 0.51,
      incidentResolver: 0.08,
      codeOwner: 0.3,
    },
    implementationOwner: 'p_sora',
    approvalOwner: 'p_taeyong',
    impactNarrative: {
      declaredTeam: 'platform-ui (group)',
      blastTeams: ['frontend', 'platform'],
      summary: '9 declared owners, none primary. Token changes spread across 3 contributors with no clear lead.',
    },
  },
  {
    id: 'z_billing_invoice',
    label: 'src/billing/invoice/',
    kind: 'folder',
    state: 'cross-team',
    scores: [
      {
        personId: 'p_jihoon',
        layer: 'declared',
        weight: 0.6,
        reason: 'CODEOWNERS lists @payments for src/billing/**',
      },
      {
        personId: 'p_haerin',
        layer: 'declared',
        weight: 0.55,
        reason: 'CODEOWNERS also lists @security for tax/PII fields',
      },
      {
        personId: 'p_yuna',
        layer: 'historical',
        weight: 0.48,
        reason: 'authored 12 commits — platform glue layer',
      },
      {
        personId: 'p_jihoon',
        layer: 'impact',
        weight: 0.72,
        reason: 'this change touches PSP-side invoice numbering',
      },
      {
        personId: 'p_haerin',
        layer: 'impact',
        weight: 0.69,
        reason: 'this change touches tax-id PII serialization',
      },
    ],
    primary: 'p_jihoon',
    backup: 'p_haerin',
    recommendedReviewer: 'p_haerin',
    escalation: 'p_yuna',
    routingConfidence: 0.58,
    reviewerRationale: {
      touchedAreaFamiliarity: 0.55,
      recentReviewer: 0.42,
      incidentResolver: 0.71,
      codeOwner: 0.6,
    },
    implementationOwner: 'p_jihoon',
    approvalOwner: 'p_haerin',
    impactNarrative: {
      declaredTeam: 'payments',
      blastTeams: ['security', 'platform'],
      summary: 'Cross-team boundary: payments owns the file, but tax + PII fields require security approval.',
    },
  },
  {
    id: 'z_auth_session',
    label: 'src/auth/session/',
    kind: 'folder',
    state: 'healthy',
    scores: [
      {
        personId: 'p_haerin',
        layer: 'declared',
        weight: 0.92,
        reason: 'CODEOWNERS lists @security for auth/**',
      },
      {
        personId: 'p_haerin',
        layer: 'historical',
        weight: 0.71,
        reason: 'authored 18 of last 40 commits',
      },
      {
        personId: 'p_haerin',
        layer: 'expertise',
        weight: 0.84,
        reason: 'authored the session-rotation design doc',
      },
      {
        personId: 'p_yuna',
        layer: 'historical',
        weight: 0.55,
        reason: 'authored 14 commits, mostly platform glue',
      },
      {
        personId: 'p_yuna',
        layer: 'impact',
        weight: 0.6,
        reason: 'resolved 2 cross-team session-leak incidents',
      },
      {
        personId: 'p_hojin',
        layer: 'historical',
        weight: 0.35,
        reason: 'authored 6 commits over 60d',
      },
    ],
    primary: 'p_haerin',
    backup: 'p_yuna',
    recommendedReviewer: 'p_yuna',
    escalation: 'p_haerin',
    routingConfidence: 0.89,
    reviewerRationale: {
      touchedAreaFamiliarity: 0.78,
      recentReviewer: 0.74,
      incidentResolver: 0.66,
      codeOwner: 0.6,
    },
    implementationOwner: 'p_haerin',
    approvalOwner: 'p_yuna',
    impactNarrative: {
      declaredTeam: 'security',
      blastTeams: ['platform'],
      summary: 'Owned by security with healthy platform participation. Approver and implementer naturally split.',
    },
  },
];

export const MOCK_STACKS: RefactorStack[] = [
  {
    id: 's_payments_checkout',
    zoneId: 'z_payments_checkout',
    rationale:
      'This change touches a hot auth path; adapter-first lets callers migrate independently before the old shape is removed. Splitting the migration from the cleanup keeps each PR under a reviewable size and preserves a clean rollback boundary.',
    mergeStrategy: 'land-bottom-up',
    mergeStrategyAdvice: {
      strategy: 'land-bottom-up',
      reason: 'Each step is a strict precondition for the next — adapter must exist before migration, canary before cleanup. No parallel safe path.',
      alternative: {
        strategy: 'split-now',
        reason: 'If you must parallelize, only steps 1 and 2 are safe in parallel. Steps 3–5 are serial.',
      },
    },
    totalEstimatedDays: 6,
    splitConfidence: 0.74,
    splitConfidenceBasis: [
      'Coupling cluster has clean adapter seam',
      'Blast radius traces match step boundaries',
      'No proof obligation crosses step lines',
    ],
    proofObligations: [
      { id: 'po_1', label: 'No public API breakage', status: 'pending', detail: 'External SDK contract must remain on v1 shape until v3 release' },
      { id: 'po_2', label: 'PSP success rate ≥ baseline', status: 'pending', detail: 'Canary observation window: 24h minimum' },
      { id: 'po_3', label: 'PCI scope unchanged', status: 'satisfied', detail: 'Verified via security review (2026-05-02)' },
      { id: 'po_4', label: 'No new taint paths', status: 'unknown', detail: 'Run taint_flow analysis after migration step' },
      { id: 'po_5', label: 'Refund flow regression coverage', status: 'placeholder' },
    ],
    safeSeams: [
      { id: 'ss_1', module: 'src/payments/checkout/psp-adapter.ts', reason: 'Pure module · no side-effects · single import boundary', status: 'detected' },
      { id: 'ss_2', module: 'src/payments/checkout/types.ts', reason: 'Type-only changes can be co-located with adapter', status: 'detected' },
      { id: 'ss_3', module: 'src/payments/checkout/router.ts', reason: 'Heavy callsite — split per-route may be safer than monolithic switch', status: 'placeholder' },
    ],
    steps: [
      {
        id: 'st_1',
        kind: 'prep',
        title: 'Extract checkout fee calculator into a pure module',
        goal: 'Isolate the math so the migration step has no behavioural risk.',
        exitCriteria: [
          'Unit tests cover all fee tiers',
          'No callers import from old location',
          'Bundle size delta < 1 KB',
        ],
        touchedModules: [
          'src/payments/checkout/fees.ts',
          'src/payments/checkout/index.ts',
        ],
        blastRadius: 'low',
        requiredChecks: ['type', 'unit-tests'],
        suggestedReviewerId: 'p_minseo',
        estimatedDiffLines: 180,
      },
      {
        id: 'st_2',
        kind: 'adapter',
        title: 'Add adapter for v2 PSP token shape',
        goal: 'Allow v1 and v2 callers to coexist behind a stable boundary.',
        exitCriteria: [
          'v1 + v2 paths both green in integration suite',
          'Adapter has no behavioural diff vs v1 baseline',
          'Feature flag default = v1',
        ],
        touchedModules: [
          'src/payments/checkout/psp-adapter.ts',
          'src/payments/checkout/types.ts',
        ],
        blastRadius: 'medium',
        requiredChecks: ['type', 'integration-tests'],
        suggestedReviewerId: 'p_jihoon',
        estimatedDiffLines: 320,
      },
      {
        id: 'st_3',
        kind: 'migration',
        title: 'Switch internal callers to v2 token shape',
        goal: 'Move all in-repo callers onto the adapter; external SDKs unchanged.',
        exitCriteria: [
          'All in-repo callers on v2',
          'External SDK contract unchanged',
          'Canary error rate within budget for 4h',
        ],
        touchedModules: [
          'src/payments/checkout/router.ts',
          'src/payments/refunds/index.ts',
          'src/payments/webhooks/handler.ts',
        ],
        blastRadius: 'high',
        requiredChecks: ['type', 'security-scan', 'integration-tests', 'canary'],
        suggestedReviewerId: 'p_jihoon',
        estimatedDiffLines: 540,
      },
      {
        id: 'st_4',
        kind: 'gate',
        title: 'Enable kill-switch and run 24h canary',
        goal: 'Verify error budget and PSP success rate before committing further.',
        exitCriteria: [
          'Canary green for 24h',
          'PSP success rate ≥ baseline',
          'On-call sign-off recorded',
        ],
        touchedModules: [
          'src/payments/flags.ts',
          'config/canary.yaml',
        ],
        blastRadius: 'medium',
        requiredChecks: ['canary', 'on-call-ack'],
        suggestedReviewerId: 'p_yuna',
        estimatedDiffLines: 60,
      },
      {
        id: 'st_5',
        kind: 'cleanup',
        title: 'Remove v1 token branch and dead adapters',
        goal: 'Delete legacy code paths once the canary is green for 7 days.',
        exitCriteria: [
          'No references to v1 types in repo',
          'Dead-code scanner clean',
          'Legacy module deleted from build graph',
        ],
        touchedModules: [
          'src/payments/checkout/psp-adapter.ts',
          'src/payments/checkout/types.ts',
          'src/payments/legacy/v1-token.ts',
        ],
        blastRadius: 'low',
        requiredChecks: ['type', 'unit-tests'],
        suggestedReviewerId: 'p_minseo',
        estimatedDiffLines: 240,
      },
    ],
  },
  {
    id: 's_auth_session',
    zoneId: 'z_auth_session',
    rationale:
      'Session rotation is well-tested but the storage layer is shared with other auth flows; the adapter step keeps blast radius contained while the migration is parallelizable across the four call sites.',
    mergeStrategy: 'parallelizable',
    mergeStrategyAdvice: {
      strategy: 'parallelizable',
      reason: 'Web and mobile callers share no state once the adapter is in place. Steps 3a/3b can land in any order behind the adapter.',
      alternative: {
        strategy: 'land-bottom-up',
        reason: 'If review bandwidth is tight, sequencing web → mobile keeps each PR small and avoids merge conflicts on shared types.',
      },
    },
    totalEstimatedDays: 4,
    splitConfidence: 0.86,
    splitConfidenceBasis: [
      'Web + mobile share no state once adapter lands',
      'Storage interface already centralized',
      'Property tests already cover rotation correctness',
    ],
    proofObligations: [
      { id: 'pos_1', label: 'Session token rotation correctness', status: 'satisfied', detail: 'Property tests cover all rotation transitions' },
      { id: 'pos_2', label: 'No auth bypass on adapter swap', status: 'pending', detail: 'Security scan must pass on adapter step' },
      { id: 'pos_3', label: 'Mobile parity with web', status: 'pending' },
      { id: 'pos_4', label: 'No new PII surface', status: 'satisfied' },
    ],
    safeSeams: [
      { id: 'sss_1', module: 'src/auth/session/storage.ts', reason: 'Interface-first refactor seam', status: 'detected' },
      { id: 'sss_2', module: 'src/auth/session/rotating-adapter.ts', reason: 'Adapter pattern isolates legacy store', status: 'detected' },
    ],
    steps: [
      {
        id: 'st_a1',
        kind: 'prep',
        title: 'Centralise session-storage interface',
        goal: 'Single import path for downstream call sites.',
        exitCriteria: [
          'All callers import from one path',
          'No type narrowing at call sites',
        ],
        touchedModules: [
          'src/auth/session/storage.ts',
          'src/auth/session/index.ts',
        ],
        blastRadius: 'low',
        requiredChecks: ['type', 'unit-tests'],
        suggestedReviewerId: 'p_yuna',
        estimatedDiffLines: 140,
      },
      {
        id: 'st_a2',
        kind: 'adapter',
        title: 'Introduce rotating-session adapter',
        goal: 'Wrap the legacy store so callers see a stable API.',
        exitCriteria: [
          'Adapter passes the legacy contract test suite',
          'Security scan clean on token-rotation paths',
        ],
        touchedModules: [
          'src/auth/session/rotating-adapter.ts',
        ],
        blastRadius: 'medium',
        requiredChecks: ['type', 'security-scan'],
        suggestedReviewerId: 'p_haerin',
        estimatedDiffLines: 260,
      },
      {
        id: 'st_a3',
        kind: 'migration',
        title: 'Migrate web + mobile session callers',
        goal: 'Two parallel PRs land independently behind the adapter.',
        exitCriteria: [
          'Both clients on the adapter',
          'No regressions in session-leak metrics for 7d',
        ],
        touchedModules: [
          'src/auth/web/session-client.ts',
          'src/auth/mobile/session-client.ts',
        ],
        blastRadius: 'medium',
        requiredChecks: ['integration-tests', 'security-scan'],
        suggestedReviewerId: 'p_haerin',
        estimatedDiffLines: 380,
      },
      {
        id: 'st_a4',
        kind: 'cleanup',
        title: 'Drop legacy session-store helpers',
        goal: 'Remove dead code once both clients are migrated.',
        exitCriteria: [
          'No imports of legacy-store.ts remain',
          'Build size shrinks (verified via bundle report)',
        ],
        touchedModules: [
          'src/auth/session/legacy-store.ts',
        ],
        blastRadius: 'low',
        requiredChecks: ['type'],
        suggestedReviewerId: 'p_yuna',
        estimatedDiffLines: 110,
      },
    ],
  },
];

export function findPerson(id: PersonId): Person | undefined {
  return MOCK_PEOPLE.find((p) => p.id === id);
}

export function findZone(id: string): OwnershipZone | undefined {
  return MOCK_ZONES.find((z) => z.id === id);
}

export function findStack(zoneId: string): RefactorStack | undefined {
  return MOCK_STACKS.find((s) => s.zoneId === zoneId);
}

// ─── Phase 2: Cross-team Hotspot Detection ──────────────────────────

export const MOCK_CROSS_TEAM_HOTSPOTS: CrossTeamHotspot[] = [
  {
    id: 'cth_1',
    zoneId: 'z_billing_invoice',
    label: 'src/billing/invoice/',
    teams: ['payments', 'security', 'platform'],
    reason: 'PSP-side numbering and tax-id PII serialization touched in same file. 3 teams approving sequentially.',
    severity: 'high',
    weeklyCommits: 7,
  },
  {
    id: 'cth_2',
    zoneId: 'z_payments_checkout',
    label: 'src/payments/checkout/',
    teams: ['payments', 'platform'],
    reason: 'PSP router shares retry policy with platform rate-limiter — coupling drifts on every change.',
    severity: 'medium',
    weeklyCommits: 4,
  },
  {
    id: 'cth_3',
    zoneId: 'z_auth_session',
    label: 'src/auth/session/',
    teams: ['security', 'platform'],
    reason: 'Stable cross-team area with healthy approver / implementer split.',
    severity: 'low',
    weeklyCommits: 2,
  },
];

// ─── Phase 3: Approval paths ────────────────────────────────────────

export const MOCK_APPROVAL_PATHS: ApprovalPath[] = [
  {
    zoneId: 'z_billing_invoice',
    estimatedDurationHours: 14,
    parallelizable: false,
    steps: [
      { personId: 'p_minseo', role: 'Implementation', reason: 'Implements the PSP-side change', required: true },
      { personId: 'p_jihoon', role: 'Code owner', reason: 'CODEOWNERS for src/billing/**', required: true },
      { personId: 'p_haerin', role: 'Security review', reason: 'PII / tax-id field touched', required: true },
      { personId: 'p_yuna', role: 'Platform escalation', reason: 'Cross-team ambiguity tiebreaker', required: false },
    ],
  },
  {
    zoneId: 'z_payments_checkout',
    estimatedDurationHours: 8,
    parallelizable: true,
    steps: [
      { personId: 'p_minseo', role: 'Implementation', reason: 'Implementer (payments backup)', required: true },
      { personId: 'p_jihoon', role: 'Approver', reason: 'Primary owner + recent incident resolver', required: true },
      { personId: 'p_yuna', role: 'Platform reviewer', reason: 'Adapter step touches platform PSP boundary', required: true },
    ],
  },
  {
    zoneId: 'z_auth_session',
    estimatedDurationHours: 6,
    parallelizable: true,
    steps: [
      { personId: 'p_haerin', role: 'Implementation', reason: 'Owner + expertise', required: true },
      { personId: 'p_yuna', role: 'Approver', reason: 'Recent reviewer · cross-team familiarity', required: true },
    ],
  },
];

export function findApprovalPath(zoneId: string): ApprovalPath | undefined {
  return MOCK_APPROVAL_PATHS.find((p) => p.zoneId === zoneId);
}

// ─── Phase 3: Auto-draft suggestions (no user trigger) ──────────────

export const MOCK_AUTO_DRAFTS: AutoDraftSuggestion[] = [
  {
    id: 'ad_1',
    zoneId: 'z_billing_invoice',
    hook: 'Cross-team change detected — 3 approvers needed',
    why: 'Single PR mixes payments + security + platform concerns. Splitting into adapter + tax-field PR cuts review time by ~60%.',
    proposedAction: 'split-pr',
    confidence: 0.81,
    detectedAt: '2026-05-09T08:14:00Z',
  },
  {
    id: 'ad_2',
    zoneId: 'z_infra_ratelimit',
    hook: 'Stale primary owner — rerouting to backup',
    why: 'Eunji Han last active 167 days ago. Daniel Cho is the natural fallback (paged 2 incidents in this area while primary was OOO).',
    proposedAction: 'reroute-reviewer',
    confidence: 0.74,
    detectedAt: '2026-05-09T07:42:00Z',
  },
  {
    id: 'ad_3',
    zoneId: 'z_payments_checkout',
    hook: 'Refactor opportunity — 5-step stack ready',
    why: 'PSP token migration has clean adapter seam. Stack plan available with land-bottom-up sequencing.',
    proposedAction: 'open-stack-plan',
    confidence: 0.69,
    detectedAt: '2026-05-09T06:18:00Z',
  },
];
