import { describe, it, expect } from 'vitest';
import { SAMPLE_RULES, type RuleSignal } from '@entities/admission';
import {
  serializeRules,
  parseRulesImport,
  mergeRules,
  diffRuleSummary,
} from '../rulesIo';

const base = SAMPLE_RULES[0];
const metricSignal = (value: number): RuleSignal => ({
  kind: 'metric', field: 'blastRadius', op: '>', value,
});

describe('rulesIo — serialize/parse round-trip', () => {
  it('serializeRules → parseRulesImport preserves the rules', () => {
    const json = serializeRules([base]);
    const res = parseRulesImport(json);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.rules).toEqual([base]);
  });

  it('rejects a payload without a rules array', () => {
    expect(parseRulesImport('{}').ok).toBe(false);
    expect(parseRulesImport('{not json').ok).toBe(false);
  });

  it('rejects a rule missing id/name/signal', () => {
    expect(parseRulesImport('{"rules":[{"id":"x"}]}').ok).toBe(false);
  });
});

describe('rulesIo — mergeRules', () => {
  it('appends new ids and replaces existing ones (no duplicates)', () => {
    const a = { ...base, id: 'a' };
    const b = { ...base, id: 'b' };
    const bUpdated = { ...base, id: 'b', name: 'B v2' };
    const merged = mergeRules([a, b], [bUpdated, { ...base, id: 'c' }]);
    expect(merged.map((r) => r.id)).toEqual(['a', 'b', 'c']);
    expect(merged.find((r) => r.id === 'b')!.name).toBe('B v2');
  });
});

describe('rulesIo — diffRuleSummary', () => {
  it('reports a metric threshold change compactly', () => {
    const prev = { ...base, signal: metricSignal(25) };
    const next = { ...base, signal: metricSignal(50) };
    expect(diffRuleSummary(prev, next)).toContain('threshold 25→50');
  });

  it('reports severity/enabled changes and no-op', () => {
    expect(diffRuleSummary(base, base)).toBe('no-op');
    expect(diffRuleSummary(base, { ...base, enabled: !base.enabled })).toMatch(/enabled|disabled/);
  });
});
