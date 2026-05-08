import { describe, it, expect } from 'vitest';
import { computePrRisk, summariseChecks } from '../risk';
import {
  makeCheck, makeFile, makeFileRecord, makePr, makeRepo,
} from '../../__tests__/_fixtures';

describe('computePrRisk', () => {
  it('returns the safe tier with empty change set', () => {
    const profile = computePrRisk(makePr(), makeRepo([]));
    expect(profile.tier).toBe('safe');
    expect(profile.blastSum).toBe(0);
    expect(profile.publicApiCount).toBe(0);
    expect(profile.lowSafetyCount).toBe(0);
    expect(profile.cyclicCount).toBe(0);
    expect(profile.sastFindings).toBe(0);
    expect(profile.secretsRisk).toBe(false);
    expect(profile.avgCoverage).toBeNull();
    expect(profile.unknownConfidenceCount).toBe(0);
    expect(profile.reasons).toEqual([]);
  });

  it('safe tier — clean change set with exact-confidence files', () => {
    const repo = makeRepo([
      makeFileRecord(0, { lineCoverage: 90 }),
      makeFileRecord(1, { lineCoverage: 80 }),
    ]);
    const pr = makePr({
      files: [makeFile({ fileId: 0 }), makeFile({ fileId: 1 })],
    });
    const profile = computePrRisk(pr, repo);
    expect(profile.tier).toBe('safe');
    expect(profile.reasons).toEqual([]);
    expect(profile.avgCoverage).toBeCloseTo(0.85, 5);
  });

  it('attention tier — single public-API touch (soft signal)', () => {
    const repo = makeRepo([makeFileRecord(0, { publicApi: true })]);
    const pr = makePr({ files: [makeFile({ fileId: 0 })] });
    const profile = computePrRisk(pr, repo);
    // 1 public API alone is soft (not severe — severe needs >= 3).
    expect(profile.tier).toBe('attention');
    expect(profile.publicApiCount).toBe(1);
    expect(profile.reasons).toContain('1 public-API file touched');
  });

  it('attention tier — blast-radius sum reaches the soft threshold', () => {
    const repo = makeRepo([
      makeFileRecord(0, { blastRadius: 13 }),
      makeFileRecord(1, { blastRadius: 12 }),
    ]);
    const pr = makePr({ files: [makeFile({ fileId: 0 }), makeFile({ fileId: 1 })] });
    const profile = computePrRisk(pr, repo);
    expect(profile.blastSum).toBe(25);
    expect(profile.tier).toBe('attention');
    expect(profile.reasons).toEqual(expect.arrayContaining(['blast-radius sum ≈ 25']));
  });

  it('attention tier — 2 non-exact-confidence files', () => {
    const repo = makeRepo([
      makeFileRecord(0, { confidence: 'overapprox' }),
      makeFileRecord(1, { confidence: 'stale' }),
    ]);
    const pr = makePr({ files: [makeFile({ fileId: 0 }), makeFile({ fileId: 1 })] });
    const profile = computePrRisk(pr, repo);
    expect(profile.unknownConfidenceCount).toBe(2);
    expect(profile.tier).toBe('attention');
  });

  it('critical tier — secrets-likely match', () => {
    const repo = makeRepo([makeFileRecord(0, { secretsLikely: true })]);
    const pr = makePr({ files: [makeFile({ fileId: 0 })] });
    const profile = computePrRisk(pr, repo);
    expect(profile.tier).toBe('critical');
    expect(profile.secretsRisk).toBe(true);
    expect(profile.reasons).toContain('secrets-likely match in change set');
  });

  it('critical tier — at least 1 SAST finding', () => {
    const repo = makeRepo([makeFileRecord(0, { sastFindings: 1 })]);
    const pr = makePr({ files: [makeFile({ fileId: 0 })] });
    const profile = computePrRisk(pr, repo);
    expect(profile.tier).toBe('critical');
    expect(profile.sastFindings).toBe(1);
  });

  it('critical tier — 3 public-API files', () => {
    const repo = makeRepo([
      makeFileRecord(0, { publicApi: true }),
      makeFileRecord(1, { publicApi: true }),
      makeFileRecord(2, { publicApi: true }),
    ]);
    const pr = makePr({
      files: [makeFile({ fileId: 0 }), makeFile({ fileId: 1 }), makeFile({ fileId: 2 })],
    });
    const profile = computePrRisk(pr, repo);
    expect(profile.tier).toBe('critical');
    expect(profile.publicApiCount).toBe(3);
  });

  it('critical tier — merge conflicts alone', () => {
    const repo = makeRepo([makeFileRecord(0)]);
    const pr = makePr({ hasConflicts: true, files: [makeFile({ fileId: 0 })] });
    const profile = computePrRisk(pr, repo);
    expect(profile.tier).toBe('critical');
    expect(profile.reasons).toContain('merge conflicts present');
  });

  it('critical tier — 2 low-edit-safety files', () => {
    const repo = makeRepo([
      makeFileRecord(0, { editSafety: 25 }),
      makeFileRecord(1, { editSafety: 39 }),
    ]);
    const pr = makePr({ files: [makeFile({ fileId: 0 }), makeFile({ fileId: 1 })] });
    const profile = computePrRisk(pr, repo);
    expect(profile.tier).toBe('critical');
    expect(profile.lowSafetyCount).toBe(2);
  });

  it('boundary — editSafety exactly 40 is NOT counted as low', () => {
    const repo = makeRepo([makeFileRecord(0, { editSafety: 40 })]);
    const pr = makePr({ files: [makeFile({ fileId: 0 })] });
    const profile = computePrRisk(pr, repo);
    expect(profile.lowSafetyCount).toBe(0);
  });

  it('boundary — blast-radius sum below 25 omits the reason', () => {
    const repo = makeRepo([makeFileRecord(0, { blastRadius: 24 })]);
    const pr = makePr({ files: [makeFile({ fileId: 0 })] });
    const profile = computePrRisk(pr, repo);
    expect(profile.blastSum).toBe(24);
    expect(profile.reasons).not.toContain('blast-radius sum ≈ 24');
  });

  it('caps blastSum at 999 for display', () => {
    const repo = makeRepo([
      makeFileRecord(0, { blastRadius: 600 }),
      makeFileRecord(1, { blastRadius: 600 }),
    ]);
    const pr = makePr({ files: [makeFile({ fileId: 0 }), makeFile({ fileId: 1 })] });
    const profile = computePrRisk(pr, repo);
    expect(profile.blastSum).toBe(999);
  });

  it('skips files whose fileId is null or out-of-range', () => {
    const repo = makeRepo([makeFileRecord(0, { sastFindings: 1 })]);
    const pr = makePr({
      files: [
        makeFile({ fileId: null }),
        makeFile({ fileId: 99 }), // out of range
        makeFile({ fileId: 0 }),
      ],
    });
    const profile = computePrRisk(pr, repo);
    // Only the in-range file contributes.
    expect(profile.sastFindings).toBe(1);
    expect(profile.tier).toBe('critical');
  });

  it('avgCoverage ignores files reporting 0 coverage', () => {
    const repo = makeRepo([
      makeFileRecord(0, { lineCoverage: 0 }), // skipped
      makeFileRecord(1, { lineCoverage: 60 }),
      makeFileRecord(2, { lineCoverage: 80 }),
    ]);
    const pr = makePr({
      files: [makeFile({ fileId: 0 }), makeFile({ fileId: 1 }), makeFile({ fileId: 2 })],
    });
    const profile = computePrRisk(pr, repo);
    expect(profile.avgCoverage).toBeCloseTo(0.7, 5);
  });

  it('reasons pluralise correctly', () => {
    const repo = makeRepo([
      makeFileRecord(0, { publicApi: true }),
      makeFileRecord(1, { publicApi: true }),
    ]);
    const pr = makePr({ files: [makeFile({ fileId: 0 }), makeFile({ fileId: 1 })] });
    const profile = computePrRisk(pr, repo);
    expect(profile.reasons).toContain('2 public-API files touched');
  });
});

describe('summariseChecks', () => {
  it('returns success worst with no checks', () => {
    const out = summariseChecks([]);
    expect(out.worst).toBe('success');
    expect(out.required).toEqual({ passed: 0, failed: 0, pending: 0 });
    expect(out.optional).toEqual({ passed: 0, failed: 0, pending: 0 });
  });

  it('all-passing required checks summarise to success', () => {
    const out = summariseChecks([
      makeCheck({ name: 'build', status: 'success', required: true }),
      makeCheck({ name: 'test',  status: 'success', required: true }),
    ]);
    expect(out.required.passed).toBe(2);
    expect(out.worst).toBe('success');
  });

  it('failing required check pushes worst to failure', () => {
    const out = summariseChecks([
      makeCheck({ status: 'success', required: true }),
      makeCheck({ status: 'failure', required: true }),
    ]);
    expect(out.required.failed).toBe(1);
    expect(out.worst).toBe('failure');
  });

  it('cancelled is treated as failed with worst === cancelled', () => {
    const out = summariseChecks([makeCheck({ status: 'cancelled', required: true })]);
    expect(out.required.failed).toBe(1);
    expect(out.worst).toBe('cancelled');
  });

  it('running ranks above success but below failure', () => {
    const out = summariseChecks([
      makeCheck({ status: 'success', required: true }),
      makeCheck({ status: 'running', required: true }),
    ]);
    expect(out.required.passed).toBe(1);
    expect(out.required.pending).toBe(1);
    expect(out.worst).toBe('running');
  });

  it('separates required vs optional buckets', () => {
    const out = summariseChecks([
      makeCheck({ status: 'success', required: true }),
      makeCheck({ status: 'failure', required: false }),
    ]);
    expect(out.required.passed).toBe(1);
    expect(out.optional.failed).toBe(1);
    // Optional failure still bumps the global worst.
    expect(out.worst).toBe('failure');
  });

  it('skipped checks contribute to neither passed/failed/pending counters', () => {
    const out = summariseChecks([makeCheck({ status: 'skipped', required: true })]);
    expect(out.required).toEqual({ passed: 0, failed: 0, pending: 0 });
    expect(out.worst).toBe('skipped');
  });
});
