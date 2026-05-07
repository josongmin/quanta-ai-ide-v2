// Insight derivations that combine PR data with the static-analysis side
// of the app. Pure — no React, no zustand. Each function returns a small,
// renderable shape so widgets/review-stage tabs stay close to JSX and
// don't carry analysis logic.
//
// "Engine-powered" is the deliberate framing here: the demo data isn't
// produced by an LLM — it falls out of metrics already in `RepoData`. The
// review tab calls these "p0 engine" findings so the UX language matches
// the static-analysis brand the rest of the app uses (the same engine
// powers DotField overlays, Blast Radius, Risk Lens, etc.).

import type { FileRecord, RepoData } from '@entities/repo';
import type {
  CheckRun, ConversationItem, FileDiff, LineThread, PullRequest,
} from '../model';
import { findPerson } from './people';

// ─────────────────────────────────────────────────────────────────────────
// Reviewer routing — "who should review this?"
// ─────────────────────────────────────────────────────────────────────────

export type ReviewerSuggestion = {
  login: string;
  /** 0..1 confidence; higher = stronger match. */
  score: number;
  /** Short reasons surfaced in the UI ("3 commits in payments/"). */
  reasons: string[];
};

const SAMPLE_TEAM_LOGINS = ['haeun', 'jiho', 'sora', 'yuna', 'minjun', 'leo'];

/**
 * Pseudo-routing based on what we *can* infer without a real git history:
 *   - file owner string → expertise weight
 *   - layer/folder match → topical weight
 *   - already-requested or author → exclude
 *
 * The result reads as if it came from a "blame-aware" router; the seed
 * (PR number) keeps it deterministic so screenshots don't flicker.
 */
export function suggestReviewers(
  pr: PullRequest,
  repo: RepoData,
  max = 3,
): ReviewerSuggestion[] {
  const exclude = new Set<string>([pr.author, ...pr.reviewers.map((r) => r.login)]);

  // Tally per-login signals from the changed files.
  const tallies = new Map<string, { score: number; reasons: string[] }>();
  const bump = (login: string, weight: number, reason: string) => {
    if (exclude.has(login)) return;
    const cur = tallies.get(login) ?? { score: 0, reasons: [] };
    cur.score += weight;
    if (cur.reasons.length < 2 && !cur.reasons.includes(reason)) cur.reasons.push(reason);
    tallies.set(login, cur);
  };

  let payments = 0;
  let auth = 0;
  let billing = 0;
  let tests = 0;
  let publicApiHits = 0;
  for (const f of pr.files) {
    if (f.path.includes('payments')) payments++;
    if (f.path.includes('auth')) auth++;
    if (f.path.includes('billing')) billing++;
    if (f.path.includes('test')) tests++;
    if (f.fileId === null) continue;
    const file = repo.files[f.fileId];
    if (!file) continue;
    if (file.metrics.publicApi) publicApiHits++;
    // Owner string lives on the file record; the demo populates it with a
    // team handle (`@team-core` etc.). Use it as the strongest signal.
    const owner = file.owner.replace(/^@team-/, '');
    if (owner) bump(owner, 0.6, `owner of ${trimPath(f.path)}`);
  }

  // Topical seeding — fictional cast specialised by area.
  if (auth > 0) {
    bump('haeun', 0.45, `${auth} auth file${auth > 1 ? 's' : ''} changed`);
    bump('jiho',  0.30, 'reviewed last 3 auth PRs');
  }
  if (payments > 0) {
    bump('yuna',  0.50, `top contributor to payments/`);
    bump('minjun', 0.40, 'last 3 payments incidents');
  }
  if (billing > 0) {
    bump('jiho',  0.45, 'owns billing module');
    bump('sora',  0.30, 'wrote billing test fixtures');
  }
  if (tests > 0) {
    bump('sora', 0.20, 'reviews most test-only PRs');
  }
  if (publicApiHits > 0) {
    bump('leo', 0.40, `${publicApiHits} public-API touch${publicApiHits > 1 ? 'es' : ''}`);
  }

  // Always include a deterministic fallback so a generic PR still lists
  // someone — keeps the suggestion card from going empty.
  const seed = pr.number;
  for (let i = 0; i < SAMPLE_TEAM_LOGINS.length; i++) {
    const login = SAMPLE_TEAM_LOGINS[(seed + i) % SAMPLE_TEAM_LOGINS.length];
    bump(login, 0.05, 'recent overlap');
  }

  return [...tallies.entries()]
    .map(([login, t]) => ({ login, score: Math.min(1, t.score), reasons: t.reasons }))
    .sort((a, b) => b.score - a.score)
    .slice(0, max);
}

function trimPath(p: string): string {
  const parts = p.split('/');
  if (parts.length <= 2) return p;
  return parts.slice(-2).join('/');
}

// ─────────────────────────────────────────────────────────────────────────
// Risk budget — sprint-level rolled-up risk so a single PR is read in
// context. The numbers come from `SAMPLE_PRS` plus the active PR; in a
// real app they'd be a backend rollup.
// ─────────────────────────────────────────────────────────────────────────

export type RiskBudget = {
  /** Critical PRs merged this sprint. */
  used: number;
  /** Soft cap before an admission policy kicks in. */
  cap: number;
  /** Critical PRs currently open (active inflow). */
  inflight: number;
  tone: 'ok' | 'tight' | 'over';
};

export function computeRiskBudget(prs: PullRequest[], cap = 5): RiskBudget {
  let used = 0;
  let inflight = 0;
  for (const pr of prs) {
    // We treat any merged PR labelled `security`, `breaking-internal`, or
    // `p1` as a critical merge. Active critical inflow is anything still
    // open with the same labels.
    const critical = pr.labels.some((l) => l === 'security' || l === 'breaking-internal' || l === 'p1');
    if (!critical) continue;
    if (pr.status === 'merged') used++;
    else if (pr.status !== 'closed') inflight++;
  }
  let tone: RiskBudget['tone'] = 'ok';
  if (used + inflight >= cap) tone = 'over';
  else if (used + inflight >= cap - 1) tone = 'tight';
  return { used, cap, inflight, tone };
}

// ─────────────────────────────────────────────────────────────────────────
// Per-file coverage delta — turns a single rolled-up coverage number into
// a list of files that actually moved. The model doesn't carry "before"
// coverage, so we synthesise a plausible drop proportional to the file's
// add/remove ratio + current coverage. Deterministic per file id.
// ─────────────────────────────────────────────────────────────────────────

export type CoverageDeltaRow = {
  filePath: string;
  fileId: number | null;
  before: number;
  after: number;
  /** before - after; positive means coverage *dropped*. */
  drop: number;
};

export function coverageDeltas(pr: PullRequest, repo: RepoData): CoverageDeltaRow[] {
  const rows: CoverageDeltaRow[] = [];
  for (const f of pr.files) {
    if (f.fileId === null) continue;
    const file = repo.files[f.fileId];
    if (!file) continue;
    const after = file.metrics.lineCoverage;
    if (after === 0) continue; // generated file or no test data; skip
    // A file that grows a lot is more likely to have lost coverage.
    const churn = f.added + f.removed;
    const stress = Math.min(1, churn / 80);
    const seed = ((file.id * 9301 + 49297) % 233280) / 233280;
    const synthDrop = Math.round(stress * 25 + seed * 12);
    if (f.kind === 'added') {
      // New file — coverage is "before 0 → after". Show it as a "+".
      rows.push({ filePath: f.path, fileId: file.id, before: 0, after, drop: -after });
    } else {
      const before = Math.min(100, after + synthDrop);
      rows.push({ filePath: f.path, fileId: file.id, before, after, drop: before - after });
    }
  }
  // Surface the biggest drops first; small noise (<3pp) is filtered out.
  return rows.filter((r) => Math.abs(r.drop) >= 3).sort((a, b) => b.drop - a.drop);
}

// ─────────────────────────────────────────────────────────────────────────
// Failed tests inline — tap the existing `CheckRun.summary` for any check
// that ran the test suite, plus a synthesised list of failing test names
// so the Insights card can show *what* broke without leaving the tab.
// ─────────────────────────────────────────────────────────────────────────

export type FailedTestsRow = {
  checkId: string;
  passed: number;
  failed: number;
  failingNames: string[];
};

export function failedTestsRow(pr: PullRequest): FailedTestsRow | null {
  const test = pr.checks.find((c) => c.name === 'test');
  if (!test) return null;
  if (test.status !== 'failure' && test.status !== 'success' && test.status !== 'running') return null;
  // Parse "184 / 184 passed" or "running 412 / 1100".
  const m = /(\d+)\s*\/\s*(\d+)/.exec((test.summary ?? ''));
  const total = m ? Number.parseInt(m[2], 10) : 0;
  const seen = m ? Number.parseInt(m[1], 10) : 0;
  const passed = test.status === 'success' ? total : seen;
  const failed = test.status === 'failure' ? Math.max(1, total - passed) : 0;
  // Synthesise failing names from PR title keywords so the readout is
  // plausible. Real wiring replaces this with backend test-report data.
  const failingNames: string[] = [];
  if (failed > 0) {
    const keys = pr.title.toLowerCase();
    if (keys.includes('auth')) failingNames.push('test_token_rotation', 'test_session_expiry_clears_cookie');
    if (keys.includes('billing') || keys.includes('receipt')) failingNames.push('test_concurrent_receipt_read', 'test_session_scope');
    if (keys.includes('refund') || keys.includes('payments')) failingNames.push('test_concurrent_refund', 'test_jitter_distribution');
    if (failingNames.length === 0) failingNames.push('test_regression', 'test_smoke');
  }
  return {
    checkId: test.id,
    passed,
    failed,
    failingNames: failingNames.slice(0, 4),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Conversation summary — pull a "what's still blocking the merge" line
// out of the threads. Pure heuristic: unresolved threads, latest comment
// per thread, author handle as the "owner" of the question.
// ─────────────────────────────────────────────────────────────────────────

export type UnresolvedThreadDigest = {
  threadId: string;
  filePath: string;
  line: number;
  /** First sentence of the latest comment, trimmed. */
  oneLiner: string;
  ownerLogin: string;
  commentCount: number;
};

export function summariseConversation(pr: PullRequest): UnresolvedThreadDigest[] {
  const out: UnresolvedThreadDigest[] = [];
  for (const t of pr.threads) {
    if (t.resolved) continue;
    const last = t.comments[t.comments.length - 1];
    if (!last) continue;
    const sentence = last.body.split(/[.!?\n]/)[0]?.trim() ?? last.body;
    out.push({
      threadId: t.id,
      filePath: t.filePath,
      line: t.line,
      oneLiner: sentence.length > 100 ? `${sentence.slice(0, 100)}…` : sentence,
      ownerLogin: t.comments[0]?.authorLogin ?? last.authorLogin,
      commentCount: t.comments.length,
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// Engine findings — the right-rail "p0 engine auto-review" data. This is
// the centerpiece of the AI-engine-flavoured surface: each finding is a
// concrete, deterministic projection of the static-analysis layer onto
// the PR's changed files.
// ─────────────────────────────────────────────────────────────────────────

export type EngineSeverity = 'blocker' | 'high' | 'medium' | 'low';

export type EngineCategory =
  | 'STRUCT-INTEGRITY'
  | 'TESTS'
  | 'OBSERV'
  | 'STYLE'
  | 'SECURITY'
  | 'PERF'
  | 'API';

export type EngineFinding = {
  id: string;
  severity: EngineSeverity;
  category: EngineCategory;
  /** Short rule key shown after the category, e.g. "blast-radius". */
  rule: string;
  title: string;
  body: string;
  /** Most-relevant file the finding points at. */
  filePath: string;
  fileId: number | null;
  /** Best-effort line number; null if the rule is file-level. */
  line: number | null;
  /** Whether the rule has a one-click auto-fix the engine can apply. */
  autoFixable: boolean;
  /** Why the engine thinks the fix is safe. */
  fixRationale: string | null;
};

export function engineFindings(pr: PullRequest, repo: RepoData): EngineFinding[] {
  const findings: EngineFinding[] = [];
  let seq = 0;
  const next = () => `ef-${pr.number}-${seq++}`;

  for (const f of pr.files) {
    if (f.fileId === null) continue;
    const file = repo.files[f.fileId];
    if (!file) continue;
    const m = file.metrics;

    if (m.blastRadius >= 10) {
      findings.push({
        id: next(),
        severity: m.blastRadius >= 25 ? 'blocker' : 'high',
        category: 'STRUCT-INTEGRITY',
        rule: 'blast-radius',
        title: `Change affects ${m.blastRadius} callers on the ${baseName(f.path)} read path`,
        body: 'Static engine found synchronous-call assumptions in callers above the safe threshold.',
        filePath: f.path,
        fileId: file.id,
        line: firstAddLine(f),
        autoFixable: false,
        fixRationale: null,
      });
    }
    if (m.editSafety < 40) {
      findings.push({
        id: next(),
        severity: 'high',
        category: 'STRUCT-INTEGRITY',
        rule: 'edit-safety',
        title: `${baseName(f.path)} edit-safety score is ${m.editSafety} / 100`,
        body: 'Low coverage × high blast radius — agent edits flagged for manual review.',
        filePath: f.path,
        fileId: file.id,
        line: null,
        autoFixable: false,
        fixRationale: null,
      });
    }
    if (m.publicApi) {
      findings.push({
        id: next(),
        severity: 'medium',
        category: 'API',
        rule: 'public-surface',
        title: `Public surface modified in ${baseName(f.path)}`,
        body: `Re-exported by the package barrel; ${m.fanIn} external caller${m.fanIn === 1 ? '' : 's'} depend on it.`,
        filePath: f.path,
        fileId: file.id,
        line: firstAddLine(f),
        autoFixable: false,
        fixRationale: null,
      });
    }
    if (m.cyclic) {
      findings.push({
        id: next(),
        severity: 'medium',
        category: 'STRUCT-INTEGRITY',
        rule: 'import-cycle',
        title: `${baseName(f.path)} sits inside an import cycle`,
        body: 'Tarjan SCC includes this file; new edges may extend the cycle.',
        filePath: f.path,
        fileId: file.id,
        line: null,
        autoFixable: false,
        fixRationale: null,
      });
    }
    if (m.sastFindings >= 1) {
      findings.push({
        id: next(),
        severity: 'high',
        category: 'SECURITY',
        rule: 'sast',
        title: `${m.sastFindings} SAST finding${m.sastFindings > 1 ? 's' : ''} touching ${baseName(f.path)}`,
        body: 'Static security analyser flagged patterns above the gate threshold.',
        filePath: f.path,
        fileId: file.id,
        line: null,
        autoFixable: false,
        fixRationale: null,
      });
    }
    if (m.secretsLikely) {
      findings.push({
        id: next(),
        severity: 'blocker',
        category: 'SECURITY',
        rule: 'secrets',
        title: `Likely secret in ${baseName(f.path)}`,
        body: 'String entropy + regex match crossed the secret-scan threshold.',
        filePath: f.path,
        fileId: file.id,
        line: firstAddLine(f),
        autoFixable: false,
        fixRationale: null,
      });
    }
    if (m.anyCount >= 8) {
      findings.push({
        id: next(),
        severity: 'medium',
        category: 'STYLE',
        rule: 'any-density',
        title: `${m.anyCount} \`any\` usages in ${baseName(f.path)}`,
        body: 'Several can be tightened to known unions; engine has a draft patch.',
        filePath: f.path,
        fileId: file.id,
        line: null,
        autoFixable: true,
        fixRationale: 'Replace with `unknown` + narrow at the boundary; tests cover all callsites.',
      });
    }
    if (m.consoleCount >= 3) {
      findings.push({
        id: next(),
        severity: 'low',
        category: 'STYLE',
        rule: 'console-usage',
        title: `${m.consoleCount} console.* calls in ${baseName(f.path)}`,
        body: 'Replace with the logger so they survive the production bundler.',
        filePath: f.path,
        fileId: file.id,
        line: null,
        autoFixable: true,
        fixRationale: 'Mechanical rewrite to `logger.info` / `logger.warn`.',
      });
    }
    if (m.todoCount >= 4) {
      findings.push({
        id: next(),
        severity: 'low',
        category: 'STYLE',
        rule: 'todo-density',
        title: `${m.todoCount} TODO/FIXME comments in ${baseName(f.path)}`,
        body: 'Convert to tracked issues so the agent doesn\'t lose context across runs.',
        filePath: f.path,
        fileId: file.id,
        line: null,
        autoFixable: false,
        fixRationale: null,
      });
    }
    if (m.lineCoverage > 0 && m.lineCoverage < 50) {
      findings.push({
        id: next(),
        severity: 'medium',
        category: 'TESTS',
        rule: 'coverage-floor',
        title: `Line coverage on ${baseName(f.path)} is ${m.lineCoverage}%`,
        body: 'Below the 50% admission floor for files with non-zero blast radius.',
        filePath: f.path,
        fileId: file.id,
        line: null,
        autoFixable: m.fnCount <= 4,
        fixRationale: m.fnCount <= 4 ? 'Engine can scaffold table-driven tests for the public functions.' : null,
      });
    }
  }

  // Stable order: severity, then category, then file path. Same PR always
  // produces the same list regardless of file iteration order.
  const sevRank: Record<EngineSeverity, number> = { blocker: 0, high: 1, medium: 2, low: 3 };
  findings.sort((a, b) => {
    if (sevRank[a.severity] !== sevRank[b.severity]) return sevRank[a.severity] - sevRank[b.severity];
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.filePath.localeCompare(b.filePath);
  });
  return findings;
}

function baseName(p: string): string {
  const idx = p.lastIndexOf('/');
  return idx === -1 ? p : p.slice(idx + 1);
}

function firstAddLine(f: FileDiff): number | null {
  for (const h of f.hunks) {
    for (const l of h.lines) {
      if (l.kind === 'add' && l.newNo !== null) return l.newNo;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────
// Engine summary — the headline counts shown in the right-rail header
// ("3 Blocker · 7 High · 4 Medium · 9 Low · 5 auto-fix").
// ─────────────────────────────────────────────────────────────────────────

export type EngineSummary = {
  blocker: number;
  high: number;
  medium: number;
  low: number;
  autoFix: number;
};

export function engineSummary(findings: EngineFinding[]): EngineSummary {
  const out: EngineSummary = { blocker: 0, high: 0, medium: 0, low: 0, autoFix: 0 };
  for (const f of findings) {
    out[f.severity]++;
    if (f.autoFixable) out.autoFix++;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// Past-incident similarity — the engine surfaces previously-resolved
// incidents whose fingerprints overlap with the current PR's changed
// files (cyclic? secrets? api-shape?). Deterministic per PR.
// ─────────────────────────────────────────────────────────────────────────

export type IncidentMatch = {
  id: string;
  title: string;
  date: string;
  similarity: number; // 0..1
};

const INCIDENT_BANK: IncidentMatch[] = [
  { id: 'INC-842', title: 'ledger double-write on refund retry',  date: '2025-11', similarity: 0 },
  { id: 'INC-701', title: 'jitterless backoff storm on webhooks', date: '2025-08', similarity: 0 },
  { id: 'INC-655', title: 'guard leak in auth rotation',          date: '2025-06', similarity: 0 },
  { id: 'INC-512', title: 'session-scoped cache bleed',           date: '2025-04', similarity: 0 },
  { id: 'INC-388', title: 'schema migration order regression',    date: '2024-12', similarity: 0 },
];

export function incidentMatches(pr: PullRequest, repo: RepoData): IncidentMatch[] {
  // Score each incident by overlap with PR file metrics — a tiny synthetic
  // model so the screenshot section has signal without a real history.
  const fileRecords: FileRecord[] = pr.files
    .map((f) => f.fileId !== null ? repo.files[f.fileId] : null)
    .filter((f): f is FileRecord => f !== null && f !== undefined);
  const cyclicHits = fileRecords.filter((f) => f.metrics.cyclic).length;
  const secretsHits = fileRecords.filter((f) => f.metrics.secretsLikely).length;
  const auth = pr.files.some((f) => f.path.includes('auth'));
  const billing = pr.files.some((f) => f.path.includes('billing') || f.path.includes('payments'));
  const migration = pr.files.some((f) => f.path.endsWith('.sql') || f.path.includes('migrations'));

  const scored: IncidentMatch[] = INCIDENT_BANK.map((inc) => {
    let s = 0;
    if (inc.id === 'INC-842' && billing) s += 0.7;
    if (inc.id === 'INC-701' && billing) s += 0.55;
    if (inc.id === 'INC-655' && auth) s += 0.65;
    if (inc.id === 'INC-512' && billing) s += 0.6;
    if (inc.id === 'INC-388' && migration) s += 0.7;
    if (cyclicHits > 0) s += 0.1;
    if (secretsHits > 0 && (inc.id === 'INC-655')) s += 0.2;
    // Stable noise so different PRs aren't all 0.7 / 0.6.
    const seed = (pr.number * 17 + inc.id.charCodeAt(4)) % 100;
    s += seed / 1000;
    return { ...inc, similarity: Math.min(1, s) };
  });
  return scored
    .filter((i) => i.similarity >= 0.4)
    .sort((a, b) => b.similarity - a.similarity);
}

// ─────────────────────────────────────────────────────────────────────────
// Call-graph diff — for the "impact paths tracked by the static engine"
// table seen in the screenshot. Synthesised from the file owner's
// adjacency: pick the changed files and walk one or two hops outward.
// ─────────────────────────────────────────────────────────────────────────

export type CallGraphChange = {
  kind: 'modified' | 'signature' | 'concurrency' | 'new';
  from: string;
  to: string;
  hops: number;
};

export function callGraphChanges(pr: PullRequest, repo: RepoData): CallGraphChange[] {
  const out: CallGraphChange[] = [];
  for (const f of pr.files.slice(0, 4)) {
    if (f.fileId === null) continue;
    const file = repo.files[f.fileId];
    if (!file) continue;
    const baseSym = symbolOf(f.path);
    if (file.deps.length === 0) continue;
    // First hop: direct callee.
    const firstDepId = file.deps[0];
    const firstDep = repo.files[firstDepId];
    if (!firstDep) continue;
    const firstSym = symbolOf(firstDep.name);
    out.push({
      kind: f.kind === 'added' ? 'new' : (file.metrics.publicApi ? 'signature' : 'modified'),
      from: baseSym,
      to: firstSym,
      hops: 1,
    });
    // Optional second hop for the longer paths we want the rail to show.
    const secondDepId = firstDep.deps[0];
    if (secondDepId !== undefined) {
      const secondDep = repo.files[secondDepId];
      if (secondDep) {
        out.push({
          kind: 'concurrency',
          from: firstSym,
          to: symbolOf(secondDep.name),
          hops: 2,
        });
      }
    }
  }
  return out.slice(0, 5);
}

function symbolOf(p: string): string {
  const base = p.split('/').pop() ?? p;
  return base.replace(/\.(ts|tsx|js|jsx|py|go|rs)$/i, '');
}

// ─────────────────────────────────────────────────────────────────────────
// Person-display helper for components that don't otherwise import the
// people file directly.
// ─────────────────────────────────────────────────────────────────────────

export function displayName(login: string): string {
  return findPerson(login).display;
}

// Small helpers re-exported so widget code can stay generic.
export type { CheckRun, ConversationItem, FileDiff, LineThread };
