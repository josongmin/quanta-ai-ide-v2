import { describe, it, expect } from 'vitest';
import { makeRng } from '@shared/lib';
import { buildRepo } from '@entities/repo';
import { computeHotspots } from '../compute';

// Hotspot ranking must be DETERMINISTIC (seeded PRNG) — otherwise the UI order
// flickers and downstream expectations go flaky. These lock the rng + the
// computeHotspots determinism/cache/percentile invariants.

describe('makeRng (mulberry32)', () => {
  it('is deterministic per seed and different across seeds', () => {
    const a = makeRng(42);
    const b = makeRng(42);
    const seq = (rng: () => number) => Array.from({ length: 5 }, () => rng());
    expect(seq(a)).toEqual(seq(b));
    expect(seq(makeRng(42))).not.toEqual(seq(makeRng(43)));
  });

  it('emits values in [0, 1)', () => {
    const rng = makeRng(7);
    for (let i = 0; i < 200; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('computeHotspots', () => {
  it('caches by repo instance (same Map on re-call)', () => {
    const repo = buildRepo(7);
    expect(computeHotspots(repo)).toBe(computeHotspots(repo));
  });

  it('is deterministic across independently-built repos with the same seed', () => {
    const pcts = (repo: ReturnType<typeof buildRepo>) =>
      [...computeHotspots(repo).values()].map((h) => h.percentile);
    expect(pcts(buildRepo(7))).toEqual(pcts(buildRepo(7)));
  });

  it('assigns percentiles in [0, 1] with a full range', () => {
    const entries = [...computeHotspots(buildRepo(7)).values()];
    expect(entries.length).toBeGreaterThan(0);
    for (const h of entries) {
      expect(h.percentile).toBeGreaterThanOrEqual(0);
      expect(h.percentile).toBeLessThanOrEqual(1);
    }
    const max = Math.max(...entries.map((h) => h.percentile));
    expect(max).toBeCloseTo(1, 5); // the top hotspot sits at the 100th percentile
  });
});
