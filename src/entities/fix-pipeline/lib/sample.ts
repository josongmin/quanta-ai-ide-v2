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
];
