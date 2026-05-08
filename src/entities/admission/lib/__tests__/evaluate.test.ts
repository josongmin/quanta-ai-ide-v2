import { describe, it, expect } from 'vitest';
import { buildRepo, type PRDiff, type RepoData } from '@entities/repo';
import {
  evaluateAdmission,
  previewRule,
  BLAST_SPIKE_PER_FILE_DEFAULT,
  BLAST_SPIKE_SUM_DEFAULT,
} from '../evaluate';
import type { AdmissionRule } from '../../model';

// Pick a deterministic seed; buildRepo is seedable so the file metrics are
// stable across runs.
const SEED = 7;

function makeRule(overrides: Partial<AdmissionRule> = {}): AdmissionRule {
  return {
    id: 'test.blast-spike',
    name: 'blast spike',
    description: 'test rule',
    source: 'native',
    severity: 'block',
    enabled: true,
    signal: { kind: 'graph', pattern: 'blast-radius-spike' },
    scope: { pathIncludes: [], pathExcludes: [], labels: [] },
    override: { allowAuthor: false, requiresApproverRole: null },
    evidence: 'overapprox',
    ...overrides,
  };
}

function pickFilesAround(
  repo: RepoData,
  targetBlast: number,
  count: number,
): number[] {
  // Sort files by closeness to target blast radius and return their ids.
  const sorted = [...repo.files]
    .sort(
      (a, b) =>
        Math.abs(a.metrics.blastRadius - targetBlast) -
        Math.abs(b.metrics.blastRadius - targetBlast),
    )
    .slice(0, count);
  return sorted.map((f) => f.id);
}

function diffFromIds(ids: number[]): PRDiff {
  return {
    changes: ids.map((id) => ({ id, kind: 'modified' as const })),
    affected: [],
    seed: 1,
  };
}

describe('blast-radius-spike defaults', () => {
  const repo = buildRepo(SEED);

  it('exposes per-file and sum defaults as named constants with the documented values', () => {
    // The two thresholds are intentionally different: per-file 25 is a low
    // filter to keep the live preview informative while the rule is being
    // authored; sum 100 is the actual "spike" trigger. If either of these
    // changes the asymmetry is part of the rule's user-visible policy.
    expect(BLAST_SPIKE_PER_FILE_DEFAULT).toBe(25);
    expect(BLAST_SPIKE_SUM_DEFAULT).toBe(100);
    expect(BLAST_SPIKE_SUM_DEFAULT).toBeGreaterThan(BLAST_SPIKE_PER_FILE_DEFAULT);
  });

  it('per-file preview without signal.value uses the per-file default (25)', () => {
    const rule = makeRule();
    // previewRule has no PR context; per-file predicate guards on
    // pr.changedIds.has, so without a diff it never matches. Seed a diff
    // that includes every file so we exercise the threshold itself.
    const allIds = repo.files.map((f) => f.id);
    const preview = previewRule(rule, repo, diffFromIds(allIds));
    // Every match must have blastRadius >= 25.
    for (const m of preview.matches) {
      const f = repo.files[m.fileId];
      expect(f).toBeDefined();
      if (f) expect(f.metrics.blastRadius).toBeGreaterThanOrEqual(BLAST_SPIKE_PER_FILE_DEFAULT);
    }
    // And there should be at least some matches, otherwise the assertion
    // above is vacuous.
    expect(preview.matches.length).toBeGreaterThan(0);
  });

  it('explicit signal.value overrides the default on both sites consistently', () => {
    const rule = makeRule({ signal: { kind: 'graph', pattern: 'blast-radius-spike', value: 5 } });
    const ids = pickFilesAround(repo, 6, 1);
    const decision = evaluateAdmission([rule], repo, diffFromIds(ids));
    // With threshold 5 and a single-file PR whose blastRadius >= 5, the rule
    // should fire (per-file matches AND sum >= 5).
    expect(decision.outcome).toBe('block');
  });

  it('cross-PR sum default (100) clears hits when the change set sum falls below it', () => {
    // Build a small PR whose total blast radius is below the sum default but
    // whose individual files are above the per-file default.
    const candidates = repo.files
      .filter(
        (f) =>
          f.metrics.blastRadius >= BLAST_SPIKE_PER_FILE_DEFAULT &&
          f.metrics.blastRadius < BLAST_SPIKE_SUM_DEFAULT / 4,
      )
      .slice(0, 1);
    if (candidates.length === 0) return; // nothing to assert against on this seed
    const sum = candidates.reduce((s, f) => s + f.metrics.blastRadius, 0);
    expect(sum).toBeLessThan(BLAST_SPIKE_SUM_DEFAULT);

    const rule = makeRule();
    const decision = evaluateAdmission(
      [rule],
      repo,
      diffFromIds(candidates.map((f) => f.id)),
    );
    // Per-file matched, but the sum check zeros it out → rule passes.
    expect(decision.ruleResults).toHaveLength(1);
    expect(decision.ruleResults[0]?.status).toBe('pass');
    expect(decision.ruleResults[0]?.hits).toEqual([]);
  });

  it('cross-PR sum default (100) keeps the rule firing when the change set sum exceeds it', () => {
    // Stack enough high-blast files so the sum clears the default.
    const sorted = [...repo.files].sort((a, b) => b.metrics.blastRadius - a.metrics.blastRadius);
    const picked: typeof sorted = [];
    let sum = 0;
    for (const f of sorted) {
      picked.push(f);
      sum += f.metrics.blastRadius;
      if (sum >= BLAST_SPIKE_SUM_DEFAULT && picked.length >= 2) break;
    }
    expect(sum).toBeGreaterThanOrEqual(BLAST_SPIKE_SUM_DEFAULT);

    const rule = makeRule();
    const decision = evaluateAdmission([rule], repo, diffFromIds(picked.map((f) => f.id)));
    expect(decision.ruleResults[0]?.status).toBe('block');
    expect(decision.ruleResults[0]?.hits.length).toBeGreaterThan(0);
  });
});

describe('blast-radius-spike change-set scoping', () => {
  const repo = buildRepo(SEED);

  it('does not match files outside the PR change set even if they exceed the threshold', () => {
    const rule = makeRule({ signal: { kind: 'graph', pattern: 'blast-radius-spike', value: 1 } });
    // Empty change set → no hits at all.
    const decision = evaluateAdmission([rule], repo, diffFromIds([]));
    expect(decision.ruleResults[0]?.hits).toEqual([]);
  });

  it('only flags files that are actually in the change set', () => {
    const rule = makeRule({ signal: { kind: 'graph', pattern: 'blast-radius-spike', value: 1 } });
    const ids = pickFilesAround(repo, 200, 3);
    const decision = evaluateAdmission([rule], repo, diffFromIds(ids));
    const idSet = new Set(ids);
    for (const hit of decision.ruleResults[0]?.hits ?? []) {
      expect(idSet.has(hit.fileId)).toBe(true);
    }
  });
});
