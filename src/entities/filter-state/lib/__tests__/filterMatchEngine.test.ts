import { describe, it, expect } from 'vitest';
import { makeMaskCache, computeDerived } from '../filterMatchEngine';
import { buildRepo } from '@entities/repo';
import { defaultState } from '../../model/filterState';
import type { FilterState } from '@entities/repo';

// The filter match engine gates every user-visible file list: facet masks are
// AND-composed, ranges at their default are no-ops, invalid regex fails safe,
// and the sort produces per-file ranks. A silent regression here shows the
// wrong files with no error — the worst kind.

const repo = buildRepo(42);
const N = repo.files.length;
const base = (): FilterState => defaultState(repo);

describe('computeDerived', () => {
  it('matches every file when no facets are active', () => {
    const d = computeDerived(makeMaskCache(repo), base());
    expect(d.matchedCount).toBe(N);
    expect(d.searchError).toBeNull();
  });

  it('fails safe on an invalid regex: error set, nothing matched', () => {
    const d = computeDerived(makeMaskCache(repo), { ...base(), searchMode: 'regex', search: '([' });
    expect(d.searchError).toBeTruthy();
    expect(d.matchedCount).toBe(0);
  });

  it('narrows (never widens) when a language facet is active', () => {
    const lang = repo.files[0].language;
    const d = computeDerived(makeMaskCache(repo), { ...base(), languages: new Set([lang]) });
    expect(d.matchedCount).toBeGreaterThan(0);
    expect(d.matchedCount).toBeLessThanOrEqual(N);
    expect(d.searchError).toBeNull();
  });

  it('AND-composes facets: two filters match at most the smaller of each', () => {
    const cache = makeMaskCache(repo);
    const lang = repo.files[0].language;
    const byLang = computeDerived(cache, { ...base(), languages: new Set([lang]) }).matchedCount;
    const both = computeDerived(cache, {
      ...base(),
      languages: new Set([lang]),
      search: 'a',
      searchMode: 'text',
    }).matchedCount;
    expect(both).toBeLessThanOrEqual(byLang);
  });

  it("assigns no ranks when sort is 'none', and a 0..k ranking when sorted", () => {
    const none = computeDerived(makeMaskCache(repo), { ...base(), sort: 'none' });
    expect(Array.from(none.rankByFileId).every((r) => r === -1)).toBe(true);

    const sorted = computeDerived(makeMaskCache(repo), { ...base(), sort: 'loc-desc' });
    const ranks = Array.from(sorted.rankByFileId).filter((r) => r >= 0);
    expect(ranks).toContain(0);
    expect(Math.max(...ranks)).toBe(sorted.matchedCount - 1);
  });

  it('rejects a catastrophic-backtracking regex instead of hanging (ReDoS guard)', () => {
    const d = computeDerived(makeMaskCache(repo), { ...base(), searchMode: 'regex', search: '(a+)+$' });
    expect(d.searchError).toBe('Pattern too complex');
    expect(d.matchedCount).toBe(0);
  });

  it('rejects an over-long regex pattern', () => {
    const d = computeDerived(makeMaskCache(repo), { ...base(), searchMode: 'regex', search: 'a'.repeat(300) });
    expect(d.searchError).toBe('Pattern too long');
  });
});
