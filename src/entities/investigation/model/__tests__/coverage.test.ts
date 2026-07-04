import { describe, it, expect } from 'vitest';
import type { Confidence, EvidenceItem, Hypothesis, Staleness, WhyPartial } from '../types';
import { computeBundleCoverage, computeHypothesisConfidence } from '../types';

// Deterministic Phase-4 scoring. computeBundleCoverage rewards fresh,
// non-partial evidence; computeHypothesisConfidence weighs supporting vs
// refuting evidence with a fixed refuting penalty factor.

let seq = 0;
function ev(overrides: Partial<EvidenceItem> = {}): EvidenceItem {
  seq += 1;
  return {
    id: `ev-${seq.toString()}`,
    kind: 'symbol',
    sourceTool: 'lexical_search',
    confidence: 'high',
    staleness: 'fresh',
    whyPartial: null,
    summary: 'evidence',
    ...overrides,
  };
}

function freshEv(id: string): EvidenceItem {
  return ev({ id, staleness: 'fresh', whyPartial: null });
}

describe('computeBundleCoverage', () => {
  it('whyPartial != null counts as partial and short-circuits even when fresh', () => {
    const cov = computeBundleCoverage([
      // whyPartial set but staleness fresh — must count partial, NOT fresh.
      ev({ id: 'p1', staleness: 'fresh', whyPartial: 'dispatch_overapprox' }),
    ]);
    expect(cov.partial).toBe(1);
    expect(cov.fresh).toBe(0);
    expect(cov.stale).toBe(0);
    // denom = max(1, 1) = 1, fresh = 0 → score 0.
    expect(cov.score).toBe(0);
    expect(cov.partialReasons).toEqual(['dispatch_overapprox']);
  });

  it('score = fresh / denom over mixed evidence', () => {
    const cov = computeBundleCoverage([
      freshEv('f1'),
      freshEv('f2'),
      ev({ id: 's1', staleness: 'stale', whyPartial: null }),
      ev({ id: 'p1', staleness: 'unknown', whyPartial: 'runtime_missing' }),
    ]);
    expect(cov.fresh).toBe(2);
    expect(cov.stale).toBe(1);
    expect(cov.partial).toBe(1);
    // denom = 4, fresh 2 → 0.5
    expect(cov.score).toBe(0.5);
  });

  it('staleness "unknown" with no partial reason counts as neither fresh nor stale', () => {
    const cov = computeBundleCoverage([
      ev({ id: 'u1', staleness: 'unknown', whyPartial: null }),
    ]);
    expect(cov.fresh).toBe(0);
    expect(cov.stale).toBe(0);
    expect(cov.partial).toBe(0);
    expect(cov.score).toBe(0);
  });

  it('empty evidence → denom 1, score 0', () => {
    const cov = computeBundleCoverage([]);
    expect(cov.fresh).toBe(0);
    expect(cov.stale).toBe(0);
    expect(cov.partial).toBe(0);
    expect(cov.score).toBe(0);
    expect(cov.partialReasons).toEqual([]);
  });

  it('partialReasons are deduped via Set', () => {
    const cov = computeBundleCoverage([
      ev({ id: 'p1', whyPartial: 'index_stale' }),
      ev({ id: 'p2', whyPartial: 'index_stale' }),
      ev({ id: 'p3', whyPartial: 'runtime_missing' }),
    ]);
    expect(cov.partial).toBe(3);
    expect(cov.partialReasons).toEqual(['index_stale', 'runtime_missing']);
  });

  it('partialReasons capped at 3 distinct reasons', () => {
    const reasons: NonNullable<WhyPartial>[] = [
      'dispatch_overapprox',
      'runtime_missing',
      'index_stale',
      'analysis_truncated',
    ];
    const cov = computeBundleCoverage(
      reasons.map((r, i) => ev({ id: `p${i.toString()}`, whyPartial: r })),
    );
    expect(cov.partial).toBe(4);
    expect(cov.partialReasons).toHaveLength(3);
    // Insertion order preserved; first three distinct reasons.
    expect(cov.partialReasons).toEqual([
      'dispatch_overapprox',
      'runtime_missing',
      'index_stale',
    ]);
  });
});

function makeHypothesis(o: Partial<Hypothesis> = {}): Hypothesis {
  return {
    id: 'h-1',
    statement: 'root cause is stale token',
    supporting: [],
    refuting: [],
    ...o,
  };
}

function byId(items: EvidenceItem[]): Record<string, EvidenceItem> {
  return Object.fromEntries(items.map((e) => [e.id, e]));
}

describe('computeHypothesisConfidence', () => {
  it('supporting-only high-confidence fresh evidence → high (1)', () => {
    const items = [
      ev({ id: 's1', confidence: 'high', staleness: 'fresh' }),
      ev({ id: 's2', confidence: 'high', staleness: 'fresh' }),
    ];
    const conf = computeHypothesisConfidence(
      makeHypothesis({ supporting: ['s1', 's2'] }),
      byId(items),
    );
    // sum = 2, refuting 0 → (2-0)/max(1,2) = 1.
    expect(conf).toBe(1);
  });

  it('refuting evidence applies the 0.6 penalty factor', () => {
    // one supporting high/fresh (weight 1), one refuting high/fresh (weight 1).
    const items = [
      ev({ id: 's1', confidence: 'high', staleness: 'fresh' }),
      ev({ id: 'r1', confidence: 'high', staleness: 'fresh' }),
    ];
    const conf = computeHypothesisConfidence(
      makeHypothesis({ supporting: ['s1'], refuting: ['r1'] }),
      byId(items),
    );
    // sum = 1, penalty = 1 * 0.6 = 0.6, denom = max(1, 1.6) = 1.6.
    // raw = (1 - 0.6) / 1.6 = 0.25.
    expect(conf).toBeCloseTo(0.25, 10);
  });

  it('clamps to 0 when refuting overwhelms supporting', () => {
    const items = [
      ev({ id: 's1', confidence: 'low', staleness: 'stale' }),
      ev({ id: 'r1', confidence: 'high', staleness: 'fresh' }),
      ev({ id: 'r2', confidence: 'high', staleness: 'fresh' }),
    ];
    // sum = 0.33 * 0.5 = 0.165; penalty = (1 + 1) * 0.6 = 1.2.
    // raw = (0.165 - 1.2)/denom < 0 → clamped to 0.
    const conf = computeHypothesisConfidence(
      makeHypothesis({ supporting: ['s1'], refuting: ['r1', 'r2'] }),
      byId(items),
    );
    expect(conf).toBe(0);
  });

  it('raw never exceeds 1 (supporting-only always <= 1 via denom)', () => {
    const items = Array.from({ length: 5 }, (_, i) =>
      ev({ id: `s${i.toString()}`, confidence: 'high', staleness: 'fresh' }),
    );
    const conf = computeHypothesisConfidence(
      makeHypothesis({ supporting: items.map((e) => e.id) }),
      byId(items),
    );
    expect(conf).toBeLessThanOrEqual(1);
    expect(conf).toBe(1);
  });

  it('missing evidence ids are skipped', () => {
    const items = [ev({ id: 's1', confidence: 'high', staleness: 'fresh' })];
    const conf = computeHypothesisConfidence(
      // 'ghost' has no entry in the map → skipped, only s1 counts.
      makeHypothesis({ supporting: ['s1', 'ghost'], refuting: ['also-missing'] }),
      byId(items),
    );
    // sum = 1, penalty = 0 → 1.
    expect(conf).toBe(1);
  });

  it('empty supporting → 0', () => {
    const conf = computeHypothesisConfidence(makeHypothesis({ supporting: [] }), {});
    // sum = 0, penalty = 0, denom = max(1, 0) = 1 → raw = 0.
    expect(conf).toBe(0);
  });

  it('empty supporting with refuting present → 0 (clamped)', () => {
    const items = [ev({ id: 'r1', confidence: 'high', staleness: 'fresh' })];
    const conf = computeHypothesisConfidence(
      makeHypothesis({ supporting: [], refuting: ['r1'] }),
      byId(items),
    );
    // sum 0, penalty 0.6, raw = (0 - 0.6)/1 < 0 → 0.
    expect(conf).toBe(0);
  });

  it('confidence/freshness weights compose (medium + stale)', () => {
    const items = [ev({ id: 's1', confidence: 'medium', staleness: 'stale' })];
    const conf = computeHypothesisConfidence(
      makeHypothesis({ supporting: ['s1'] }),
      byId(items),
    );
    // weight = 0.66 * 0.5 = 0.33; sum = 0.33, denom = max(1, 0.33) = 1.
    // raw = 0.33 / 1 = 0.33.
    expect(conf).toBeCloseTo(0.33, 10);
  });
});

// Type-only touch so unused imports of Confidence/Staleness never linger.
const _touch: [Confidence, Staleness] = ['high', 'fresh'];
void _touch;
