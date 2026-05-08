import { describe, it, expect } from 'vitest';
import {
  estimateCost,
  estimateSignalCost,
  canPreviewInline,
  COST_LABEL,
  COST_HINT,
  COST_COLOR,
  PREVIEW_MATCH_CAP,
} from '../cost';
import type { AdmissionRule, RuleSignal, CostClass } from '../../model';

// Tiny rule helper — only `signal` is read by `estimateCost`, but we fill in
// the rest to keep TS happy.
function mkRule(signal: RuleSignal): AdmissionRule {
  return {
    id: 'r',
    name: 'r',
    description: '',
    source: 'native',
    severity: 'warn',
    enabled: true,
    signal,
    scope: { pathIncludes: [], pathExcludes: [], labels: [] },
    override: { allowAuthor: false, requiresApproverRole: null },
    evidence: 'exact',
  };
}

describe('estimateSignalCost', () => {
  it('classifies metric signals as instant', () => {
    expect(
      estimateSignalCost({ kind: 'metric', field: 'blastRadius', op: '>', value: 50 }),
    ).toBe('instant');
  });

  it('classifies external signals as fast', () => {
    expect(
      estimateSignalCost({ kind: 'external', tool: 'eslint', ruleId: 'no-eval' }),
    ).toBe('fast');
  });

  it('classifies common 1-hop graph patterns as fast', () => {
    const fastPatterns = [
      'import-cycle',
      'public-api-touched',
      'public-api-without-test',
      'orphan-edit',
      'layer-violation',
      'unknown-region-creep',
    ] as const;
    for (const pattern of fastPatterns) {
      expect(estimateSignalCost({ kind: 'graph', pattern })).toBe('fast');
    }
  });

  it('classifies blast-radius-spike as instant (precomputed)', () => {
    expect(
      estimateSignalCost({ kind: 'graph', pattern: 'blast-radius-spike', value: 100 }),
    ).toBe('instant');
  });

  it('classifies taint as slow without sanitizer requirement', () => {
    expect(
      estimateSignalCost({
        kind: 'taint', source: 'env', sink: 'fs.write', requireSanitizer: false,
      }),
    ).toBe('slow');
  });

  it('classifies taint with sanitizer requirement as background', () => {
    expect(
      estimateSignalCost({
        kind: 'taint', source: 'env', sink: 'fs.write', requireSanitizer: true,
      }),
    ).toBe('background');
  });

  it('classifies plain DSL (only flags / metric facets) as instant', () => {
    expect(estimateSignalCost({ kind: 'dsl', expr: '+deprecated' })).toBe('instant');
    expect(estimateSignalCost({ kind: 'dsl', expr: 'coverage:<50' })).toBe('instant');
  });

  it('classifies graph-implying DSL as fast', () => {
    expect(estimateSignalCost({ kind: 'dsl', expr: 'blastRadius:>20' })).toBe('fast');
    expect(estimateSignalCost({ kind: 'dsl', expr: 'fanOut:>5' })).toBe('fast');
    expect(estimateSignalCost({ kind: 'dsl', expr: '+cyclic' })).toBe('fast');
  });
});

describe('estimateCost', () => {
  it('delegates to estimateSignalCost on the rule.signal', () => {
    const r = mkRule({ kind: 'metric', field: 'loc', op: '>', value: 100 });
    expect(estimateCost(r)).toBe(estimateSignalCost(r.signal));
  });
});

describe('canPreviewInline', () => {
  it('returns true for instant / fast / medium', () => {
    expect(canPreviewInline('instant')).toBe(true);
    expect(canPreviewInline('fast')).toBe(true);
    expect(canPreviewInline('medium')).toBe(true);
  });

  it('returns false for slow / background', () => {
    expect(canPreviewInline('slow')).toBe(false);
    expect(canPreviewInline('background')).toBe(false);
  });
});

describe('cost display constants', () => {
  it('declare a label, hint, and color for every CostClass', () => {
    const classes: CostClass[] = ['instant', 'fast', 'medium', 'slow', 'background'];
    for (const c of classes) {
      expect(COST_LABEL[c]).toBeTruthy();
      expect(COST_HINT[c]).toBeTruthy();
      expect(COST_COLOR[c]).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('PREVIEW_MATCH_CAP is a positive integer', () => {
    expect(Number.isInteger(PREVIEW_MATCH_CAP)).toBe(true);
    expect(PREVIEW_MATCH_CAP).toBeGreaterThan(0);
  });
});
