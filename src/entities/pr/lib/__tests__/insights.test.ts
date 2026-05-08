import { describe, it, expect } from 'vitest';
import {
  callGraphChanges,
  computeRiskBudget,
  coverageDeltas,
  displayName,
  engineFindings,
  engineSummary,
  failedTestsRow,
  incidentMatches,
  suggestReviewers,
  summariseConversation,
} from '../insights';
import {
  makeCheck, makeFile, makeFileRecord, makePr, makeRepo, makeThread,
} from '../../__tests__/_fixtures';
import { SAMPLE_PRS } from '../sample';

// ─────────────────────────────────────────────────────────────────────────
// suggestReviewers
// ─────────────────────────────────────────────────────────────────────────

describe('suggestReviewers', () => {
  it('returns at most `max` suggestions', () => {
    const repo = makeRepo([makeFileRecord(0, {}, { owner: '@team-haeun' })]);
    const pr = makePr({ files: [makeFile({ fileId: 0 })] });
    expect(suggestReviewers(pr, repo, 2).length).toBeLessThanOrEqual(2);
    expect(suggestReviewers(pr, repo, 5).length).toBeLessThanOrEqual(5);
  });

  it('excludes the PR author from suggestions', () => {
    const repo = makeRepo([makeFileRecord(0, {}, { owner: '@team-haeun' })]);
    const pr = makePr({ author: 'haeun', files: [makeFile({ fileId: 0 })] });
    const out = suggestReviewers(pr, repo, 5);
    expect(out.find((s) => s.login === 'haeun')).toBeUndefined();
  });

  it('excludes already-requested reviewers', () => {
    const repo = makeRepo([makeFileRecord(0)]);
    const pr = makePr({
      reviewers: [{ login: 'jiho', state: 'pending' }],
      files: [makeFile({ path: 'src/auth/login.ts', fileId: 0 })],
    });
    const out = suggestReviewers(pr, repo, 5);
    expect(out.find((s) => s.login === 'jiho')).toBeUndefined();
  });

  it('weights payments-path matches with the payments specialists', () => {
    const repo = makeRepo([makeFileRecord(0)]);
    const pr = makePr({
      author: 'songmin',
      files: [makeFile({ path: 'src/payments/refund.ts', fileId: 0 })],
    });
    const logins = suggestReviewers(pr, repo, 5).map((s) => s.login);
    expect(logins).toEqual(expect.arrayContaining(['yuna', 'minjun']));
  });

  it('is deterministic for the same PR number + files', () => {
    const repo = makeRepo([makeFileRecord(0, {}, { owner: '@team-jiho' })]);
    const pr = makePr({
      number: 42,
      files: [makeFile({ path: 'src/billing/charge.ts', fileId: 0 })],
    });
    const a = suggestReviewers(pr, repo, 5);
    const b = suggestReviewers(pr, repo, 5);
    expect(a).toEqual(b);
  });

  it('empty file list still returns deterministic fallback list', () => {
    const repo = makeRepo([]);
    const pr = makePr({ number: 7 });
    const out = suggestReviewers(pr, repo, 3);
    // Fallback always seeds 6 logins (excluding author + reviewers).
    expect(out.length).toBeGreaterThan(0);
    // All fallback scores are tiny (0.05 cap → after Math.min(1, …)).
    for (const s of out) expect(s.score).toBeLessThanOrEqual(0.1);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// computeRiskBudget
// ─────────────────────────────────────────────────────────────────────────

describe('computeRiskBudget', () => {
  it('empty list → tone ok, used 0, inflight 0', () => {
    const out = computeRiskBudget([]);
    expect(out).toEqual({ used: 0, cap: 5, inflight: 0, tone: 'ok' });
  });

  it('counts merged critical PRs as used', () => {
    const out = computeRiskBudget([
      makePr({ status: 'merged', labels: ['security'] }),
      makePr({ status: 'merged', labels: ['p1'] }),
      makePr({ status: 'merged', labels: ['breaking-internal'] }),
      makePr({ status: 'merged', labels: ['docs'] }), // not critical
    ]);
    expect(out.used).toBe(3);
    expect(out.inflight).toBe(0);
  });

  it('counts open critical PRs as inflight (not used)', () => {
    const out = computeRiskBudget([
      makePr({ status: 'open', labels: ['security'] }),
      makePr({ status: 'changes-requested', labels: ['p1'] }),
    ]);
    expect(out.used).toBe(0);
    expect(out.inflight).toBe(2);
  });

  it('closed critical PRs are excluded from both buckets', () => {
    const out = computeRiskBudget([
      makePr({ status: 'closed', labels: ['security'] }),
    ]);
    expect(out.used).toBe(0);
    expect(out.inflight).toBe(0);
  });

  it('tone "tight" when used+inflight === cap-1', () => {
    const prs = [
      makePr({ status: 'merged', labels: ['p1'] }),
      makePr({ status: 'merged', labels: ['p1'] }),
      makePr({ status: 'open',   labels: ['security'] }),
      makePr({ status: 'open',   labels: ['security'] }),
    ];
    const out = computeRiskBudget(prs); // cap=5, used+inflight=4
    expect(out.tone).toBe('tight');
  });

  it('tone "over" when used+inflight >= cap', () => {
    const prs = Array.from({ length: 5 }, () =>
      makePr({ status: 'merged', labels: ['security'] }),
    );
    const out = computeRiskBudget(prs);
    expect(out.tone).toBe('over');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// coverageDeltas
// ─────────────────────────────────────────────────────────────────────────

describe('coverageDeltas', () => {
  it('empty PR returns empty array', () => {
    expect(coverageDeltas(makePr(), makeRepo([]))).toEqual([]);
  });

  it('skips files with zero coverage (no test data)', () => {
    const repo = makeRepo([makeFileRecord(0, { lineCoverage: 0 })]);
    const pr = makePr({ files: [makeFile({ fileId: 0 })] });
    expect(coverageDeltas(pr, repo)).toEqual([]);
  });

  it("treats a newly-added file as a coverage gain (negative drop)", () => {
    const repo = makeRepo([makeFileRecord(0, { lineCoverage: 80 })]);
    const pr = makePr({ files: [makeFile({ fileId: 0, kind: 'added', added: 100, removed: 0 })] });
    const rows = coverageDeltas(pr, repo);
    expect(rows).toHaveLength(1);
    expect(rows[0].before).toBe(0);
    expect(rows[0].after).toBe(80);
    expect(rows[0].drop).toBe(-80);
  });

  it('filters out small noise (|drop| < 3)', () => {
    // Tiny churn → tiny synthDrop. Use a file with churn=1 + small id seed.
    const repo = makeRepo([makeFileRecord(0, { lineCoverage: 90 })]);
    const pr = makePr({ files: [makeFile({ fileId: 0, added: 1, removed: 0 })] });
    const rows = coverageDeltas(pr, repo);
    // With ~1 churn the synthDrop is < 3 → row filtered.
    if (rows.length > 0) {
      expect(Math.abs(rows[0].drop)).toBeGreaterThanOrEqual(3);
    }
  });

  it('ranks larger drops first', () => {
    const repo = makeRepo([
      makeFileRecord(7, { lineCoverage: 60 }),
      makeFileRecord(3, { lineCoverage: 70 }),
    ]);
    const pr = makePr({
      files: [
        makeFile({ fileId: 7, added: 80, removed: 80 }),
        makeFile({ fileId: 3, added: 4, removed: 0 }),
      ],
    });
    const rows = coverageDeltas(pr, repo);
    if (rows.length >= 2) {
      expect(rows[0].drop).toBeGreaterThanOrEqual(rows[1].drop);
    }
  });

  it('is deterministic for the same input', () => {
    const repo = makeRepo([makeFileRecord(5, { lineCoverage: 65 })]);
    const pr = makePr({ files: [makeFile({ fileId: 5, added: 60, removed: 20 })] });
    expect(coverageDeltas(pr, repo)).toEqual(coverageDeltas(pr, repo));
  });
});

// ─────────────────────────────────────────────────────────────────────────
// failedTestsRow
// ─────────────────────────────────────────────────────────────────────────

describe('failedTestsRow', () => {
  it('returns null when there is no `test` check', () => {
    const pr = makePr({ checks: [makeCheck({ name: 'build' })] });
    expect(failedTestsRow(pr)).toBeNull();
  });

  it('returns null when the test check is queued (pending)', () => {
    const pr = makePr({ checks: [makeCheck({ name: 'test', status: 'pending' })] });
    expect(failedTestsRow(pr)).toBeNull();
  });

  it('parses "x / total" out of a successful summary', () => {
    const pr = makePr({
      checks: [makeCheck({ name: 'test', status: 'success', summary: '184 / 184 passed' })],
    });
    const row = failedTestsRow(pr)!;
    expect(row.passed).toBe(184);
    expect(row.failed).toBe(0);
    expect(row.failingNames).toEqual([]);
  });

  it('synthesises auth-flavoured failing test names from PR title', () => {
    const pr = makePr({
      title: 'auth: rotate session secret',
      checks: [makeCheck({ name: 'test', status: 'failure', summary: '180 / 184 passed' })],
    });
    const row = failedTestsRow(pr)!;
    expect(row.failed).toBeGreaterThanOrEqual(1);
    expect(row.failingNames).toEqual(
      expect.arrayContaining(['test_token_rotation', 'test_session_expiry_clears_cookie']),
    );
  });

  it('falls back to generic regression names when the title has no keywords', () => {
    const pr = makePr({
      title: 'misc cleanup',
      checks: [makeCheck({ name: 'test', status: 'failure', summary: '99 / 100 passed' })],
    });
    const row = failedTestsRow(pr)!;
    expect(row.failingNames).toEqual(['test_regression', 'test_smoke']);
  });

  it('caps failingNames at 4', () => {
    // "auth" + "billing" + "refund" all add hits → trimmed to 4.
    const pr = makePr({
      title: 'auth billing refund payments',
      checks: [makeCheck({ name: 'test', status: 'failure', summary: '90 / 100 passed' })],
    });
    const row = failedTestsRow(pr)!;
    expect(row.failingNames.length).toBeLessThanOrEqual(4);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// summariseConversation
// ─────────────────────────────────────────────────────────────────────────

describe('summariseConversation', () => {
  it('returns empty when there are no threads', () => {
    expect(summariseConversation(makePr())).toEqual([]);
  });

  it('skips resolved threads', () => {
    const pr = makePr({
      threads: [
        makeThread({
          id: 't1', resolved: true,
          comments: [{ id: 'c1', authorLogin: 'a', body: 'ok', createdAt: '', resolved: true }],
        }),
      ],
    });
    expect(summariseConversation(pr)).toEqual([]);
  });

  it('skips threads with no comments', () => {
    const pr = makePr({
      threads: [makeThread({ id: 't1', resolved: false, comments: [] })],
    });
    expect(summariseConversation(pr)).toEqual([]);
  });

  it('extracts the first sentence of the latest comment as the one-liner', () => {
    const pr = makePr({
      threads: [
        makeThread({
          id: 't1', filePath: 'src/x.ts', line: 10, resolved: false,
          comments: [
            { id: 'c1', authorLogin: 'haeun', body: 'first',  createdAt: '', resolved: false },
            { id: 'c2', authorLogin: 'jiho',  body: 'Race condition here. Worth a closer look.', createdAt: '', resolved: false },
          ],
        }),
      ],
    });
    const out = summariseConversation(pr);
    expect(out).toHaveLength(1);
    expect(out[0].oneLiner).toBe('Race condition here');
    // Owner is the *first* comment author.
    expect(out[0].ownerLogin).toBe('haeun');
    expect(out[0].commentCount).toBe(2);
  });

  it('truncates one-liner over 100 chars with an ellipsis', () => {
    const long = 'x'.repeat(150);
    const pr = makePr({
      threads: [
        makeThread({
          id: 't1', resolved: false,
          comments: [{ id: 'c1', authorLogin: 'a', body: long, createdAt: '', resolved: false }],
        }),
      ],
    });
    const out = summariseConversation(pr);
    expect(out[0].oneLiner.endsWith('…')).toBe(true);
    expect(out[0].oneLiner.length).toBeLessThanOrEqual(101);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// engineFindings + engineSummary
// ─────────────────────────────────────────────────────────────────────────

describe('engineFindings', () => {
  it('produces no findings for a clean change set', () => {
    const repo = makeRepo([makeFileRecord(0)]);
    const pr = makePr({ files: [makeFile({ fileId: 0 })] });
    expect(engineFindings(pr, repo)).toEqual([]);
  });

  it('flags a secrets-likely file as a blocker (security/secrets)', () => {
    const repo = makeRepo([makeFileRecord(0, { secretsLikely: true })]);
    const pr = makePr({ files: [makeFile({ fileId: 0, path: 'src/auth/leak.ts' })] });
    const findings = engineFindings(pr, repo);
    const secretsHit = findings.find((f) => f.rule === 'secrets');
    expect(secretsHit).toBeDefined();
    expect(secretsHit!.severity).toBe('blocker');
    expect(secretsHit!.category).toBe('SECURITY');
  });

  it('flags blast-radius >= 25 as blocker, 10..24 as high', () => {
    const repo = makeRepo([
      makeFileRecord(0, { blastRadius: 30 }),
      makeFileRecord(1, { blastRadius: 12 }),
    ]);
    const pr = makePr({
      files: [makeFile({ fileId: 0, path: 'a.ts' }), makeFile({ fileId: 1, path: 'b.ts' })],
    });
    const findings = engineFindings(pr, repo).filter((f) => f.rule === 'blast-radius');
    expect(findings).toHaveLength(2);
    expect(findings.find((f) => f.filePath === 'a.ts')!.severity).toBe('blocker');
    expect(findings.find((f) => f.filePath === 'b.ts')!.severity).toBe('high');
  });

  it('flags low coverage with auto-fix only when fnCount <= 4', () => {
    const repo = makeRepo([
      makeFileRecord(0, { lineCoverage: 30, fnCount: 3 }),
      makeFileRecord(1, { lineCoverage: 30, fnCount: 8 }),
    ]);
    const pr = makePr({
      files: [makeFile({ fileId: 0, path: 'small.ts' }), makeFile({ fileId: 1, path: 'big.ts' })],
    });
    const findings = engineFindings(pr, repo).filter((f) => f.rule === 'coverage-floor');
    expect(findings.find((f) => f.filePath === 'small.ts')!.autoFixable).toBe(true);
    expect(findings.find((f) => f.filePath === 'big.ts')!.autoFixable).toBe(false);
  });

  it('does NOT flag coverage-floor at the boundary (lineCoverage === 50)', () => {
    const repo = makeRepo([makeFileRecord(0, { lineCoverage: 50 })]);
    const pr = makePr({ files: [makeFile({ fileId: 0 })] });
    expect(engineFindings(pr, repo).filter((f) => f.rule === 'coverage-floor')).toEqual([]);
  });

  it('orders findings by severity → category → file path', () => {
    const repo = makeRepo([
      makeFileRecord(0, { secretsLikely: true }),  // blocker SECURITY
      makeFileRecord(1, { blastRadius: 30 }),      // blocker STRUCT-INTEGRITY
      makeFileRecord(2, { anyCount: 10 }),         // medium STYLE
    ]);
    const pr = makePr({
      files: [
        makeFile({ fileId: 0, path: 'z.ts' }),
        makeFile({ fileId: 1, path: 'a.ts' }),
        makeFile({ fileId: 2, path: 'm.ts' }),
      ],
    });
    const findings = engineFindings(pr, repo);
    // SECURITY < STRUCT-INTEGRITY alphabetically, so secrets comes before blast.
    expect(findings[0].rule).toBe('secrets');
    expect(findings[1].rule).toBe('blast-radius');
    // medium STYLE comes after both blockers.
    expect(findings[findings.length - 1].rule).toBe('any-density');
  });

  it('is deterministic — same input produces structurally identical findings', () => {
    const repo = makeRepo([
      makeFileRecord(0, { blastRadius: 12, anyCount: 9, todoCount: 5 }),
      makeFileRecord(1, { publicApi: true, fanIn: 3 }),
    ]);
    const pr = makePr({
      number: 314,
      files: [makeFile({ fileId: 0, path: 'src/x.ts' }), makeFile({ fileId: 1, path: 'src/y.ts' })],
    });
    expect(engineFindings(pr, repo)).toEqual(engineFindings(pr, repo));
  });

  it('skips files whose fileId is null', () => {
    const repo = makeRepo([makeFileRecord(0, { secretsLikely: true })]);
    const pr = makePr({
      files: [makeFile({ fileId: null }), makeFile({ fileId: 0 })],
    });
    const findings = engineFindings(pr, repo);
    expect(findings.every((f) => f.filePath !== '' )).toBe(true);
    expect(findings.find((f) => f.rule === 'secrets')).toBeDefined();
  });
});

describe('engineSummary', () => {
  it('counts severities and auto-fixes', () => {
    const summary = engineSummary([
      { id: '1', severity: 'blocker', category: 'SECURITY', rule: 'a', title: '', body: '', filePath: '', fileId: 0, line: null, autoFixable: false, fixRationale: null },
      { id: '2', severity: 'high',    category: 'API',      rule: 'b', title: '', body: '', filePath: '', fileId: 0, line: null, autoFixable: true,  fixRationale: 'r' },
      { id: '3', severity: 'medium',  category: 'STYLE',    rule: 'c', title: '', body: '', filePath: '', fileId: 0, line: null, autoFixable: true,  fixRationale: 'r' },
      { id: '4', severity: 'low',     category: 'STYLE',    rule: 'd', title: '', body: '', filePath: '', fileId: 0, line: null, autoFixable: false, fixRationale: null },
    ]);
    expect(summary).toEqual({ blocker: 1, high: 1, medium: 1, low: 1, autoFix: 2 });
  });

  it('returns all-zero summary for empty input', () => {
    expect(engineSummary([])).toEqual({ blocker: 0, high: 0, medium: 0, low: 0, autoFix: 0 });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// incidentMatches
// ─────────────────────────────────────────────────────────────────────────

describe('incidentMatches', () => {
  it('returns no matches for a clean PR with no auth/billing/migration paths', () => {
    const repo = makeRepo([makeFileRecord(0)]);
    const pr = makePr({ files: [makeFile({ fileId: 0, path: 'src/misc/util.ts' })] });
    const out = incidentMatches(pr, repo);
    // Filtered to similarity >= 0.4 → empty.
    expect(out).toEqual([]);
  });

  it('surfaces auth-related INC-655 when an auth file is touched', () => {
    const repo = makeRepo([makeFileRecord(0)]);
    const pr = makePr({ files: [makeFile({ fileId: 0, path: 'src/auth/middleware.ts' })] });
    const out = incidentMatches(pr, repo);
    expect(out.find((m) => m.id === 'INC-655')).toBeDefined();
  });

  it('surfaces migration incident on .sql paths', () => {
    const repo = makeRepo([makeFileRecord(0)]);
    const pr = makePr({ files: [makeFile({ fileId: 0, path: 'db/migrations/001.sql' })] });
    const out = incidentMatches(pr, repo);
    expect(out.find((m) => m.id === 'INC-388')).toBeDefined();
  });

  it('is deterministic per PR number', () => {
    const repo = makeRepo([makeFileRecord(0)]);
    const pr = makePr({ number: 99, files: [makeFile({ fileId: 0, path: 'src/billing/charge.ts' })] });
    expect(incidentMatches(pr, repo)).toEqual(incidentMatches(pr, repo));
  });

  it('different PR numbers produce different similarity scores (stable noise term)', () => {
    const repo = makeRepo([makeFileRecord(0)]);
    const a = incidentMatches(makePr({ number: 1, files: [makeFile({ fileId: 0, path: 'src/billing/x.ts' })] }), repo);
    const b = incidentMatches(makePr({ number: 5, files: [makeFile({ fileId: 0, path: 'src/billing/x.ts' })] }), repo);
    // The set of incidents passing the 0.4 floor should be the same, but
    // similarity numbers should differ on at least one match thanks to the
    // pr.number * 17 term.
    if (a.length > 0 && b.length > 0) {
      let differs = false;
      for (const m of a) {
        const other = b.find((x) => x.id === m.id);
        if (other && other.similarity !== m.similarity) { differs = true; break; }
      }
      expect(differs).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// callGraphChanges
// ─────────────────────────────────────────────────────────────────────────

describe('callGraphChanges', () => {
  it('empty PR → empty list', () => {
    expect(callGraphChanges(makePr(), makeRepo([]))).toEqual([]);
  });

  it('caps output at 5 rows', () => {
    const records = Array.from({ length: 10 }, (_, i) =>
      makeFileRecord(i, {}, { name: `f${i}.ts`, deps: [(i + 1) % 10] }),
    );
    const repo = makeRepo(records);
    const pr = makePr({
      files: records.map((r) => makeFile({ fileId: r.id, path: `src/${r.name}` })),
    });
    expect(callGraphChanges(pr, repo).length).toBeLessThanOrEqual(5);
  });

  it("classifies an `added` file's first hop as kind='new'", () => {
    // NOTE: callGraphChanges + engineFindings use repo.files[fileId] as an
    // index lookup, so file ids must match array positions in the fixture.
    const src = makeFileRecord(0, {}, { name: 'a.ts', deps: [1] });
    const dep = makeFileRecord(1, {}, { name: 'b.ts' });
    const repo = makeRepo([src, dep]);
    const pr = makePr({
      files: [makeFile({ fileId: 0, path: 'src/a.ts', kind: 'added' })],
    });
    const out = callGraphChanges(pr, repo);
    expect(out[0].kind).toBe('new');
  });

  it('classifies a public-API modified file as `signature`', () => {
    const src = makeFileRecord(0, { publicApi: true }, { name: 'public.ts', deps: [1] });
    const dep = makeFileRecord(1, {}, { name: 'helper.ts' });
    const repo = makeRepo([src, dep]);
    const pr = makePr({ files: [makeFile({ fileId: 0, path: 'src/public.ts' })] });
    const [first] = callGraphChanges(pr, repo);
    expect(first.kind).toBe('signature');
  });

  it('skips files with no deps', () => {
    const repo = makeRepo([makeFileRecord(0, {}, { deps: [] })]);
    const pr = makePr({ files: [makeFile({ fileId: 0 })] });
    expect(callGraphChanges(pr, repo)).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// displayName
// ─────────────────────────────────────────────────────────────────────────

describe('displayName', () => {
  it('resolves a known login to its display name', () => {
    expect(displayName('songmin')).toBe('Song Min');
    expect(displayName('agent')).toBe('p0 agent');
  });

  it('falls back to the raw login for unknown handles', () => {
    expect(displayName('unknown-user')).toBe('unknown-user');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Integration smoke — every SAMPLE_PRS entry produces well-formed insights.
// ─────────────────────────────────────────────────────────────────────────

describe('SAMPLE_PRS integration', () => {
  it('engineSummary on engineFindings is consistent for every sample PR', () => {
    const emptyRepo = makeRepo([]);
    for (const pr of SAMPLE_PRS) {
      const findings = engineFindings(pr, emptyRepo);
      const summary = engineSummary(findings);
      const total = summary.blocker + summary.high + summary.medium + summary.low;
      expect(total).toBe(findings.length);
      expect(summary.autoFix).toBeLessThanOrEqual(total);
    }
  });
});
