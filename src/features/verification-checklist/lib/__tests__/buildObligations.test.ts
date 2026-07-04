import { describe, it, expect } from 'vitest';
import type { FixSeed, OpenPrConflict, ProofObligation } from '@entities/fix-pipeline';
import { buildCandidate } from '@entities/fix-pipeline/__tests__/_fixtures';
import {
  buildObligations,
  simulateRunValidation,
  summariseObligations,
} from '../buildObligations';

// buildObligations gates which proof obligations a fix must clear, plus the
// honesty fallback (dynamic-unreachable). These tests pin the exact obligation
// ids/categories/statuses so a reordering or threshold drift is caught.

// Hand-built seeds: a minimal valid FixSeed baseline + a security variant.
function buildSeed(constraints?: FixSeed['constraints']): FixSeed {
  return {
    id: 'seed-1',
    kind: 'incident',
    symptom: 'null deref in session refresh',
    evidenceRefs: [{ kind: 'file', label: 'src/auth/session.ts:42' }],
    ...(constraints ? { constraints } : {}),
  };
}

// Look up an obligation by its id *suffix* (candidate id is prefixed).
function byId(obs: ProofObligation[], suffix: string): ProofObligation | undefined {
  return obs.find((o) => o.id.endsWith(suffix));
}

describe('buildObligations — static / security', () => {
  it('securityPath seed adds BOTH a taint (static) and a policy-compliance obligation', () => {
    const obs = buildObligations(buildSeed({ securityPath: true }), buildCandidate());

    const taint = byId(obs, '::ob-taint');
    expect(taint).toBeDefined();
    expect(taint?.category).toBe('static');
    expect(taint?.status).toBe('pass');

    const policy = byId(obs, '::ob-policy-compliance');
    expect(policy).toBeDefined();
    expect(policy?.category).toBe('policy');
    expect(policy?.status).toBe('pass');
  });

  it('a non-security seed adds neither taint nor policy-compliance', () => {
    const obs = buildObligations(buildSeed(), buildCandidate());
    expect(byId(obs, '::ob-taint')).toBeUndefined();
    expect(byId(obs, '::ob-policy-compliance')).toBeUndefined();
  });

  it('non-security seed still carries the always-on static obligations', () => {
    const obs = buildObligations(buildSeed(), buildCandidate());
    expect(byId(obs, '::ob-blast')?.category).toBe('static');
    expect(byId(obs, '::ob-types')?.status).toBe('pass');
  });
});

describe('buildObligations — blast radius boundary', () => {
  it('modulesAffected <= 5 → pass (boundary: exactly 5)', () => {
    const obs = buildObligations(
      buildSeed(),
      buildCandidate({ metrics: { modulesAffected: 5 } }),
    );
    const blast = byId(obs, '::ob-blast');
    expect(blast?.status).toBe('pass');
    expect(blast?.detail).toBe('영향 모듈 5개');
  });

  it('modulesAffected > 5 → fail (boundary: 6)', () => {
    const obs = buildObligations(
      buildSeed(),
      buildCandidate({ metrics: { modulesAffected: 6 } }),
    );
    const blast = byId(obs, '::ob-blast');
    expect(blast?.status).toBe('fail');
    expect(blast?.detail).toBe('영향 모듈 6개');
  });
});

describe('buildObligations — public API', () => {
  it('publicApiChanged metric adds public-api (fail) AND an owner (human) obligation', () => {
    const obs = buildObligations(
      buildSeed(),
      buildCandidate({ metrics: { publicApiChanged: true } }),
    );

    const api = byId(obs, '::ob-public-api');
    expect(api).toBeDefined();
    expect(api?.category).toBe('static');
    expect(api?.status).toBe('fail');

    const owner = byId(obs, '::ob-owner');
    expect(owner).toBeDefined();
    expect(owner?.category).toBe('human');
    expect(owner?.status).toBe('pending');
    expect(owner?.detail).toBe('@platform-team');
  });

  it('no publicApiChanged metric → no public-api obligation and no owner', () => {
    const obs = buildObligations(buildSeed(), buildCandidate());
    expect(byId(obs, '::ob-public-api')).toBeUndefined();
    expect(byId(obs, '::ob-owner')).toBeUndefined();
  });

  it('constraints.publicApi alone triggers the owner obligation without the public-api static one', () => {
    const obs = buildObligations(buildSeed({ publicApi: true }), buildCandidate());
    // The static public-API obligation is gated on the *metric*, not the constraint.
    expect(byId(obs, '::ob-public-api')).toBeUndefined();
    // The human owner obligation fires on metric OR constraint.
    expect(byId(obs, '::ob-owner')).toBeDefined();
    expect(byId(obs, '::ob-owner')?.category).toBe('human');
  });
});

describe('buildObligations — style-reuse', () => {
  it('filesChanged > 1 → unknown with a detail', () => {
    const obs = buildObligations(
      buildSeed(),
      buildCandidate({ metrics: { filesChanged: 2 } }),
    );
    const reuse = byId(obs, '::ob-style-reuse');
    expect(reuse?.category).toBe('stylistic');
    expect(reuse?.status).toBe('unknown');
    expect(reuse?.detail).toBe('신규 helper 가능성 — 검토 필요');
  });

  it('filesChanged <= 1 → pass with no detail', () => {
    const obs = buildObligations(
      buildSeed(),
      buildCandidate({ metrics: { filesChanged: 1 } }),
    );
    const reuse = byId(obs, '::ob-style-reuse');
    expect(reuse?.status).toBe('pass');
    expect(reuse?.detail).toBeUndefined();
  });
});

describe('buildObligations — secret-scan is universal', () => {
  it('present on a non-security candidate', () => {
    const obs = buildObligations(buildSeed(), buildCandidate());
    const scan = byId(obs, '::ob-secret-scan');
    expect(scan).toBeDefined();
    expect(scan?.category).toBe('policy');
    expect(scan?.status).toBe('pass');
    expect(scan?.detail).toBe('0 findings');
  });

  it('present on a security candidate too', () => {
    const obs = buildObligations(buildSeed({ securityPath: true }), buildCandidate());
    expect(byId(obs, '::ob-secret-scan')).toBeDefined();
  });
});

describe('buildObligations — open-PR conflicts', () => {
  it('conflicts.length > 0 → exactly ONE open-prs obligation, fail, formatted detail', () => {
    const conflicts: OpenPrConflict[] = [
      {
        prNumber: 128,
        title: 'refactor session store',
        overlappingFiles: ['src/auth/session.ts', 'src/auth/token.ts'],
        author: '@hyejin',
      },
      {
        prNumber: 131,
        title: 'add retry',
        overlappingFiles: ['src/auth/session.ts'],
        author: '@min',
      },
    ];
    const obs = buildObligations(buildSeed(), buildCandidate(), conflicts);

    const openPrs = obs.filter((o) => o.id.endsWith('::ob-open-prs'));
    expect(openPrs).toHaveLength(1);
    expect(openPrs[0].category).toBe('dynamic');
    expect(openPrs[0].status).toBe('fail');
    expect(openPrs[0].detail).toBe(
      '#128 (@hyejin) — src/auth/session.ts, src/auth/token.ts · #131 (@min) — src/auth/session.ts',
    );
  });

  it('empty conflicts → single open-prs obligation, pass, "0 conflicts"', () => {
    const obs = buildObligations(buildSeed(), buildCandidate(), []);
    const openPrs = obs.filter((o) => o.id.endsWith('::ob-open-prs'));
    expect(openPrs).toHaveLength(1);
    expect(openPrs[0].status).toBe('pass');
    expect(openPrs[0].detail).toBe('0 conflicts');
  });

  it('conflicts default to empty when omitted', () => {
    const obs = buildObligations(buildSeed(), buildCandidate());
    expect(byId(obs, '::ob-open-prs')?.status).toBe('pass');
  });
});

describe('simulateRunValidation', () => {
  it('recommended candidate flips pending dynamic + lint obligations to pass', () => {
    const cand = buildCandidate({ isRecommended: true });
    const obs = buildObligations(buildSeed(), cand);
    const run = simulateRunValidation(obs, cand);

    // dynamic: tests + scan were pending
    expect(byId(run, '::ob-tests')?.status).toBe('pass');
    expect(byId(run, '::ob-tests')?.detail).toBe('24/24 affected tests pass');
    expect(byId(run, '::ob-scan')?.status).toBe('pass');
    // stylistic lint was pending
    expect(byId(run, '::ob-style-lint')?.status).toBe('pass');
    expect(byId(run, '::ob-style-lint')?.detail).toBe('lint clean · prettier ok');
  });

  it('non-recommended candidate flips pending dynamic + lint to unknown (honesty fallback)', () => {
    const cand = buildCandidate({ isRecommended: false });
    const obs = buildObligations(buildSeed(), cand);
    const run = simulateRunValidation(obs, cand);

    expect(byId(run, '::ob-tests')?.status).toBe('unknown');
    expect(byId(run, '::ob-tests')?.detail).toBe('환경 제약으로 실행 불가 — human checkpoint 강제');
    expect(byId(run, '::ob-scan')?.status).toBe('unknown');
    expect(byId(run, '::ob-style-lint')?.status).toBe('unknown');
  });

  it('leaves non-pending obligations untouched (static pass, style-convention pass)', () => {
    const cand = buildCandidate({ isRecommended: false });
    const obs = buildObligations(buildSeed(), cand);
    const run = simulateRunValidation(obs, cand);

    // These start pass and are not dynamic/lint-pending.
    expect(byId(run, '::ob-types')?.status).toBe('pass');
    expect(byId(run, '::ob-style-convention')?.status).toBe('pass');
    // open-prs pass (dynamic but NOT pending) stays pass even for non-recommended.
    expect(byId(run, '::ob-open-prs')?.status).toBe('pass');
  });
});

describe('summariseObligations', () => {
  it('dynamicUnreachable is true only when a DYNAMIC obligation is unknown', () => {
    const cand = buildCandidate({ isRecommended: false });
    const obs = buildObligations(buildSeed(), cand);
    const run = simulateRunValidation(obs, cand);
    const summary = summariseObligations(cand.id, run);
    // Non-recommended run flips ob-tests + ob-scan (dynamic) to unknown.
    expect(summary.dynamicUnreachable).toBe(true);
  });

  it('dynamicUnreachable is false when dynamics are merely pending (not unknown)', () => {
    const cand = buildCandidate();
    const obs = buildObligations(buildSeed(), cand); // dynamics still pending, never run
    const summary = summariseObligations(cand.id, obs);
    expect(summary.dynamicUnreachable).toBe(false);
  });

  it('dynamicUnreachable false when the only unknown is a stylistic obligation', () => {
    const cand = buildCandidate({ metrics: { filesChanged: 2 } }); // style-reuse → unknown
    const obs = buildObligations(buildSeed(), cand);
    const summary = summariseObligations(cand.id, obs);
    // style-reuse unknown is stylistic, not dynamic.
    expect(summary.unknowns).toBeGreaterThanOrEqual(1);
    expect(summary.dynamicUnreachable).toBe(false);
  });

  it('tallies passed / failed / unknowns consistently with the obligation list', () => {
    const cand = buildCandidate();
    const obs = buildObligations(buildSeed(), cand);
    const summary = summariseObligations(cand.id, obs);

    const passed = obs.filter((o) => o.status === 'pass').length;
    const failed = obs.filter((o) => o.status === 'fail').length;
    const unknowns = obs.filter((o) => o.status === 'unknown').length;

    expect(summary.passed).toBe(passed);
    expect(summary.failed).toBe(failed);
    expect(summary.unknowns).toBe(unknowns);
    expect(summary.candidateId).toBe(cand.id);
    expect(summary.obligations).toBe(obs);
  });
});
