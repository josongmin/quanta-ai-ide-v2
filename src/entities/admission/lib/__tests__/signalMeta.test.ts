import { describe, it, expect } from 'vitest';
import type { RuleSignal } from '../../model';
import { signalDescribe, signalUsesHint } from '../signalMeta';

// SIGNAL_META is the OCP registry for per-kind describe/uses metadata. (Cost is
// covered transitively by cost.test.ts.) These lock the describe/usesHint
// strings + the lookup-map fallbacks per signal kind.

const metric = (field: string): RuleSignal =>
  ({ kind: 'metric', field, op: '>', value: 10 } as RuleSignal);
const graph = (pattern: string, value?: number): RuleSignal =>
  ({ kind: 'graph', pattern, value } as RuleSignal);
const taint: RuleSignal = { kind: 'taint', source: 'env', sink: 'sql', requireSanitizer: true };
const dsl: RuleSignal = { kind: 'dsl', expr: 'blast > 5' };
const external: RuleSignal = { kind: 'external', tool: 'semgrep', ruleId: 'rule-1' };

describe('signalDescribe', () => {
  it('describes each kind', () => {
    expect(signalDescribe(metric('blastRadius'))).toBe('blastRadius > 10');
    expect(signalDescribe(graph('import-cycle'))).toBe('import-cycle');
    expect(signalDescribe(graph('blast-radius-spike', 3))).toBe('blast-radius-spike >3');
    expect(signalDescribe(taint)).toBe('env → sql · sanitizer');
    expect(signalDescribe(dsl)).toBe('blast > 5');
    expect(signalDescribe(external)).toBe('semgrep:rule-1');
  });
});

describe('signalUsesHint', () => {
  it('looks up known metric/graph hints', () => {
    expect(signalUsesHint(metric('blastRadius'))).toBe('graph · transitive deps');
    expect(signalUsesHint(graph('import-cycle'))).toBe('dependency graph · cycle');
  });

  it('falls back for unknown fields/patterns', () => {
    expect(signalUsesHint(metric('someNewField'))).toBe('someNewField');
    expect(signalUsesHint(graph('some-new-pattern'))).toBe('graph predicate');
  });

  it('describes taint/dsl/external hints', () => {
    expect(signalUsesHint(taint)).toBe('dataflow · env → sql');
    expect(signalUsesHint(dsl)).toBe('facet DSL on metric index');
    expect(signalUsesHint(external)).toBe('imported · semgrep');
  });
});
