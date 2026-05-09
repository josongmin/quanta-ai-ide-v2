import type { FixSeed } from '../model';

// MVP fixtures. Two security-finding seeds so the demo shows the Phase 1
// scope: a sarif-style taint flow (recommended fix has high confidence) and
// a public-API-touching variant that the delivery gate must demote to
// human-required no matter how clean the patch looks.
//
// Both seeds carry non-empty `evidenceRefs` — the pipeline's seedValidator
// rejects anything else, and writing fixtures that conform keeps the demo
// honest about the boundary.

export const SAMPLE_SEEDS: FixSeed[] = [
  {
    id: 'seed-sarif-001',
    kind: 'alert',
    symptom: 'SARIF: untrusted input flows into shell command (CWE-78)',
    evidenceRefs: [
      { kind: 'sarif', label: 'rules/cmd-injection.sarif#3' },
      { kind: 'taint-path', label: 'req.body.cmd → execSync(cmd)' },
      { kind: 'file', label: 'src/server/routes/admin.ts:88' },
    ],
    suspectedRootCause: '`execSync` 인자를 sanitize 없이 그대로 사용. allowlist 또는 spawn(args)로 분리 필요.',
    blastHint: ['server/routes/admin', 'server/audit'],
    constraints: {
      publicApi: false,
      securityPath: true,
    },
  },
  {
    id: 'seed-sarif-002',
    kind: 'alert',
    symptom: 'SARIF: prototype pollution in deep-merge utility (CWE-1321)',
    evidenceRefs: [
      { kind: 'sarif', label: 'rules/proto-pollution.sarif#1' },
      { kind: 'symbol', label: 'shared/util/deepMerge' },
      { kind: 'file', label: 'src/shared/util/deepMerge.ts:14' },
    ],
    suspectedRootCause: '`__proto__` / `constructor` 키를 거르지 않음. public utility라서 callsite 다수.',
    blastHint: ['shared/util', '12+ callsites'],
    constraints: {
      publicApi: true,
      securityPath: true,
      forbidden: ['shared/util/deepMerge.ts의 export signature'],
    },
  },
  {
    id: 'seed-incident-101',
    kind: 'incident',
    symptom: 'P1 incident · 2026-05-09 02:14 · Checkout 5xx spike — JSON parse fails on legacy carts',
    evidenceRefs: [
      { kind: 'stack-frame', label: 'parseCart at src/checkout/cart.ts:42' },
      { kind: 'stack-frame', label: 'POST /api/v2/checkout (route.ts:88)' },
      { kind: 'file', label: 'src/checkout/cart.ts:42' },
    ],
    suspectedRootCause: 'cart payload에 v1 스키마(legacy) 섞임. parseCart가 strict로 throw — 호출자가 catch 안 하고 502.',
    blastHint: ['checkout', 'cart', 'order'],
    constraints: {
      publicApi: false,
      securityPath: false,
    },
  },
  {
    id: 'seed-hotspot-201',
    kind: 'hotspot',
    symptom: 'Hotspot · src/auth/session.ts — 14 changes in 30d, 3 reverts, churn score 78',
    evidenceRefs: [
      { kind: 'file', label: 'src/auth/session.ts' },
      { kind: 'symbol', label: 'auth/session#refreshToken' },
      { kind: 'symbol', label: 'auth/session#getSessionUser' },
    ],
    suspectedRootCause: 'refreshToken과 getSessionUser가 동일 파일에서 entwined. 분리 시 churn 절반으로 감소 예상.',
    blastHint: ['auth', 'auth/middleware', 'api/v2'],
    constraints: {
      publicApi: false,
      securityPath: true,
    },
  },
];
