import { describe, it, expect } from 'vitest';
import { parseDsl } from '../dsl';
import type { FileRecord } from '@entities/repo';

function mkFile(overrides: Partial<FileRecord> & { id: number }): FileRecord {
  const { id } = overrides;
  return {
    name: `f${String(id)}.ts`,
    folderPath: 'src',
    folderParts: ['src'],
    ix: 0,
    iz: 0,
    status: 'STABLE',
    language: 'ts',
    layer: 'util',
    owner: '@team-core',
    isTest: false,
    isGenerated: false,
    isDeprecated: false,
    deps: [],
    metrics: {
      complexity: 10, cyclomatic: 10, cognitive: 10, halstead: 50,
      maintainability: 80, maxNesting: 2, fnCount: 3, largestFnLoc: 10, loc: 100,
      fanIn: 0, fanOut: 0, pagerank: 0,
      churn: 0.1, daysSinceTouched: 10, authors: 2, recentPRs: 1,
      anyCount: 0, tsIgnoreCount: 0, strictOptOut: false, unsafeAssertions: 0,
      lineCoverage: 80, branchCoverage: 70, mutationScore: 60, hasTestFile: true,
      eslintErrors: 0, eslintWarnings: 0, todoCount: 0, consoleCount: 0,
      secretsLikely: false, sastFindings: 0, bundleKB: 5,
      cyclic: false, dead: false, layerViolation: false, publicApi: false,
      jsdocCoverage: 50,
      confidence: 'exact', indexState: 'fresh', unknownReasons: [],
      editSafety: 50, blastRadius: 0,
      security: false,
    },
    ...overrides,
    id,
  };
}

const safe60 = mkFile({ id: 0, metrics: { ...mkFile({ id: 0 }).metrics, editSafety: 60 } });
const safe40 = mkFile({ id: 1, metrics: { ...mkFile({ id: 1 }).metrics, editSafety: 40 } });
const cyclicFile = mkFile({ id: 2, metrics: { ...mkFile({ id: 2 }).metrics, cyclic: true } });
const cx30 = mkFile({ id: 3, metrics: { ...mkFile({ id: 3 }).metrics, complexity: 30 } });
const cx25 = mkFile({ id: 4, metrics: { ...mkFile({ id: 4 }).metrics, complexity: 25 } });
const cx45 = mkFile({ id: 5, metrics: { ...mkFile({ id: 5 }).metrics, complexity: 45 } });
const dataFile = mkFile({
  id: 6,
  owner: '@team-data',
  metrics: { ...mkFile({ id: 6 }).metrics, complexity: 35 },
});

describe('parseDsl', () => {
  it('safety:>50 matches files with editSafety > 50', () => {
    const r = parseDsl('safety:>50');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.predicate(safe60)).toBe(true);
    expect(r.predicate(safe40)).toBe(false);
  });

  it('+cyclic matches cyclic files', () => {
    const r = parseDsl('+cyclic');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.predicate(cyclicFile)).toBe(true);
    expect(r.predicate(safe60)).toBe(false);
  });

  it('!cyclic excludes cyclic files', () => {
    const r = parseDsl('!cyclic');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.predicate(cyclicFile)).toBe(false);
    expect(r.predicate(safe60)).toBe(true);
  });

  it('range-style "complexity:>=20 complexity:<=40" treats space as AND', () => {
    const r = parseDsl('complexity:>=20 complexity:<=40');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.predicate(cx30)).toBe(true);
    expect(r.predicate(cx25)).toBe(true);
    expect(r.predicate(cx45)).toBe(false);
  });

  it('returns parse error string (not throw) on unknown field', () => {
    const r = parseDsl('madeup:42');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(typeof r.error).toBe('string');
    expect(r.error.length).toBeGreaterThan(0);
  });

  it('returns parse error on non-numeric value for numeric field', () => {
    const r = parseDsl('complexity:>abc');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain('Number expected');
  });

  it('returns parse error on unknown flag', () => {
    const r = parseDsl('+nosuchflag');
    expect(r.ok).toBe(false);
  });

  it('multi-token query (implicit AND): owner:@team-data complexity:>30', () => {
    const r = parseDsl('owner:@team-data complexity:>30');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.predicate(dataFile)).toBe(true);     // owner match + cx 35
    expect(r.predicate(cx45)).toBe(false);        // owner mismatch
    expect(r.predicate(cx25)).toBe(false);        // cx fails
  });

  it('empty input matches everything', () => {
    const r = parseDsl('');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.predicate(safe60)).toBe(true);
    expect(r.predicate(safe40)).toBe(true);
  });

  it('status:vulnerable alias maps to SECURITY_ALERT', () => {
    const vuln = mkFile({ id: 99, status: 'SECURITY_ALERT' });
    const r = parseDsl('status:vulnerable');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.predicate(vuln)).toBe(true);
    expect(r.predicate(safe60)).toBe(false);
  });
});
