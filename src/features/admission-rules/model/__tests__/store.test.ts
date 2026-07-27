import { beforeEach, describe, it, expect } from 'vitest';
import { useAdmissionStore } from '../store';
import { SAMPLE_RULES } from '@entities/admission';
import { serializeRules } from '../../lib/rulesIo';

// The admission store owns security-policy semantics: rule versioning, pack
// all-on/all-off toggling, rollout dedup+severity, and the untrusted-JSON
// import boundary. All synchronous — no timers, no storage.

const s = () => useAdmissionStore.getState();
const PACK_ID = 'pack.owasp-top10';
const PACK_RULE_IDS = ['semgrep.hardcoded-secret', 'codeql.sql-injection', 'native.taint-env-fs'];

beforeEach(() => {
  // No reset action — restore the seed slices we mutate.
  useAdmissionStore.setState({ rules: [...SAMPLE_RULES], versions: {}, rollouts: [] });
});

describe('admission store — versioning', () => {
  it('records "initial revision" on first upsert, then bumps the version', () => {
    const base = { ...SAMPLE_RULES[0], id: 'custom.v-test' };
    s().upsert(base);
    let versions = s().versions['custom.v-test'];
    expect(versions).toHaveLength(1);
    expect(versions[0].version).toBe(1);
    expect(versions[0].summary).toBe('initial revision');

    s().upsert({ ...base, severity: base.severity === 'block' ? 'warn' : 'block' });
    versions = s().versions['custom.v-test'];
    expect(versions).toHaveLength(2);
    expect(versions[1].version).toBe(2);
  });
});

describe('admission store — packs', () => {
  it('togglePack turns a partially/all-off pack fully on, then fully off', () => {
    // Force all pack rules off for a deterministic starting point.
    useAdmissionStore.setState((st) => ({
      rules: st.rules.map((r) => (PACK_RULE_IDS.includes(r.id) ? { ...r, enabled: false } : r)),
    }));
    expect(s().packIsActive(PACK_ID)).toBe(false);

    s().togglePack(PACK_ID);
    expect(s().packIsActive(PACK_ID)).toBe(true); // all-off → all-on

    s().togglePack(PACK_ID);
    expect(s().packIsActive(PACK_ID)).toBe(false); // all-on → all-off
  });
});

describe('admission store — rollouts', () => {
  it('startRollout sets severity to warn and dedups by ruleId', () => {
    const id = SAMPLE_RULES[0].id;
    s().startRollout(id, 7);
    expect(s().rules.find((r) => r.id === id)!.severity).toBe('warn');
    expect(s().rollouts.filter((r) => r.ruleId === id)).toHaveLength(1);

    s().startRollout(id, 14);
    expect(s().rollouts.filter((r) => r.ruleId === id)).toHaveLength(1); // replaced, not duplicated
  });
});

describe('admission store — importRules (untrusted JSON boundary)', () => {
  it('accepts an empty rules array', () => {
    expect(s().importRules('{"rules":[]}')).toEqual({ ok: true, count: 0 });
  });

  it('rejects a payload missing the rules array', () => {
    expect(s().importRules('{}').ok).toBe(false);
  });

  it('rejects a rule missing required fields (id/name/signal)', () => {
    expect(s().importRules('{"rules":[{"id":"x"}]}').ok).toBe(false);
  });

  it('rejects malformed JSON without throwing', () => {
    expect(s().importRules('{not json').ok).toBe(false);
  });

  it('merges a valid rule by id (append new, replace existing)', () => {
    // A COMPLETE rule (full shape incl. discriminated signal) — the import
    // boundary now validates every field, so a spot-check fixture would be
    // rejected. See rulesIo.ts ruleSchema.
    const imported = { ...SAMPLE_RULES[0], id: 'imp.1', name: 'Imported' };
    const before = s().rules.length;
    const res = s().importRules(serializeRules([imported]));
    expect(res).toEqual({ ok: true, count: 1 });
    expect(s().rules).toHaveLength(before + 1);
    // re-import same id → replaced, not duplicated
    s().importRules(serializeRules([{ ...imported, name: 'Imported v2' }]));
    const hit = s().rules.filter((r) => r.id === 'imp.1');
    expect(hit).toHaveLength(1);
    expect(hit[0].name).toBe('Imported v2');
  });
});
