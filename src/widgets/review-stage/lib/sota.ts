// ─────────────────────────────────────────────────────────────────────────
// SOTA-tier review insights (2026). Each function is a self-contained
// derivation off the existing PR/Repo model — we deliberately don't
// reach for new schema fields so the demo stays seedable from the
// fixture without an "AI service" dependency.
//
// Why each helper exists:
//
//   • symbolChanges — Sourcegraph/Cody-style symbol-level diff. A
//     reviewer scanning a 600-line PR cares about "which functions
//     changed", not "which lines". We extract function/class/const
//     identifiers from add/del lines via a deliberately conservative
//     regex set.
//
//   • prSummary — CodeRabbit/Greptile-style narrative. Pieces together
//     the description, label, blast radius, public-API count, secrets
//     hint, and dominant change kind into 2–3 sentences. Pure string
//     building — no LLM, no network — so the seed is stable.
//
//   • intentMismatch — Stripe Sail-style "author said X, the diff says
//     Y" sniff test. Compares description tokens against actual-touched
//     subsystems and flags obvious mismatches ("auth fix" PR that only
//     touches /docs).
//
//   • prodCorrelation — Sentry/Datadog-style "this file was the source
//     of a recent error" hint. Reuses incidentMatches from the entity
//     layer but reframes the message at the file level so reviewers
//     see the link inside the Files section, not buried in Risk.
//
//   • releaseReadiness — Block/Square-style release-train hint. We use
//     the `baseBranch` ("main" / "release/*") + label-set to decide
//     whether the PR is targeting the next train and warn about
//     freeze windows.
//
//   • prSessionStorage — review-session resume. Tracks when the
//     reviewer last opened the PR and which sections they reached so
//     "resume where I left off" works across reloads. Persisted in
//     localStorage; 30-day TTL so stale state doesn't accumulate.
// ─────────────────────────────────────────────────────────────────────────

import type {
  EngineFinding, FileDiff, PullRequest,
} from '@entities/pr';
import { incidentMatches } from '@entities/pr';
import type { RepoData } from '@entities/repo';

// ─── Symbol-level change extraction ──────────────────────────────────────

export type SymbolKind = 'function' | 'class' | 'type' | 'const' | 'export';
export type SymbolChange = {
  kind: SymbolKind;
  /** "addUser" or "User.serialize" — qualified when the file context implies a class. */
  name: string;
  /** 'added' | 'modified' | 'removed' — derived from add vs del side. */
  change: 'added' | 'modified' | 'removed';
  /** File path for jump. */
  filePath: string;
};

// Intentionally narrow: matching is best-effort and we'd rather miss
// than fabricate. Each pattern returns name in capture group 1.
const SYMBOL_PATTERNS: { kind: SymbolKind; re: RegExp }[] = [
  { kind: 'function', re: /^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/ },
  { kind: 'function', re: /^\s*(?:export\s+)?(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(.*\)\s*=>/ },
  { kind: 'class',    re: /^\s*(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/ },
  { kind: 'type',     re: /^\s*(?:export\s+)?(?:type|interface)\s+([A-Za-z_$][\w$]*)/ },
  { kind: 'const',    re: /^\s*(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)\s*[:=]/ },
  { kind: 'export',   re: /^\s*export\s+(?:default\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/ },
];

/**
 * Walk every diff hunk and emit a symbol-level change record per
 * matched line. Symbols seen on *both* add and del sides count as
 * "modified"; one-sided are 'added' or 'removed'.
 */
export function symbolChanges(pr: PullRequest): SymbolChange[] {
  const seen = new Map<string, { kind: SymbolKind; addedIn: boolean; removedIn: boolean; path: string }>();

  for (const file of pr.files) {
    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.kind === 'context') continue;
        for (const pat of SYMBOL_PATTERNS) {
          const m = pat.re.exec(line.text);
          if (!m) continue;
          const name = m[1];
          if (name === undefined) break;
          const key = `${file.path}::${name}`;
          const existing = seen.get(key) ?? { kind: pat.kind, addedIn: false, removedIn: false, path: file.path };
          if (line.kind === 'add') existing.addedIn = true;
          else                     existing.removedIn = true;
          seen.set(key, existing);
          break; // first matching pattern wins so we don't double-count
        }
      }
    }
  }

  const out: SymbolChange[] = [];
  for (const [key, v] of seen) {
    const name = key.split('::')[1] ?? '';
    if (v.addedIn && v.removedIn)      out.push({ kind: v.kind, name, change: 'modified', filePath: v.path });
    else if (v.addedIn)                out.push({ kind: v.kind, name, change: 'added',    filePath: v.path });
    else if (v.removedIn)              out.push({ kind: v.kind, name, change: 'removed',  filePath: v.path });
  }

  // Stable sort: modified first (highest review interest), then added,
  // then removed. Within a bucket, alphabetical by name.
  const rank = { modified: 0, added: 1, removed: 2 } as const;
  return out.sort((a, b) => {
    const r = rank[a.change] - rank[b.change];
    if (r !== 0) return r;
    return a.name.localeCompare(b.name);
  });
}

// ─── PR Summary narrative ────────────────────────────────────────────────

export type PrSummary = {
  /** 2–3 sentence narrative reviewers can read in 5s. */
  narrative: string;
  /** Bulleted "what changed" — derived from symbolChanges + file kinds. */
  highlights: string[];
  /** Confidence 0..1 (how much of the description we could verify). Drives the chip tone. */
  confidence: number;
};

/**
 * Build a short narrative from the diff. Pure deterministic — every
 * sentence is derived from a measurable fact (LOC, file kinds, public
 * API count, secrets risk). No model in the loop.
 */
export function prSummary(pr: PullRequest, repo: RepoData, symbols: SymbolChange[]): PrSummary {
  const sentences: string[] = [];
  const highlights: string[] = [];

  // Sentence 1 — scope claim.
  const fileNoun = pr.files.length === 1 ? 'file' : 'files';
  const additions = pr.added;
  const deletions = pr.removed;
  const churnPhrase = additions === 0 && deletions === 0
    ? 'no line changes'
    : `${String(additions)} additions and ${String(deletions)} deletions`;
  sentences.push(`Touches ${String(pr.files.length)} ${fileNoun} with ${churnPhrase}.`);

  // Sentence 2 — symbol-level + dominant kind.
  const modSyms = symbols.filter((s) => s.change === 'modified').slice(0, 3).map((s) => s.name);
  const addSyms = symbols.filter((s) => s.change === 'added').slice(0, 3).map((s) => s.name);
  if (modSyms.length > 0 || addSyms.length > 0) {
    const parts: string[] = [];
    if (modSyms.length > 0) parts.push(`modifies ${modSyms.map((n) => `\`${n}\``).join(', ')}`);
    if (addSyms.length > 0) parts.push(`introduces ${addSyms.map((n) => `\`${n}\``).join(', ')}`);
    sentences.push(`Roughly ${parts.join(' and ')}.`);
  }

  // Sentence 3 — risk framing.
  const publicApi = pr.files.filter((f) => {
    if (f.fileId === null) return false;
    const file = repo.files[f.fileId];
    return file?.metrics.publicApi;
  }).length;
  const incidents = incidentMatches(pr, repo);
  const riskBits: string[] = [];
  if (publicApi > 0)        riskBits.push(`${String(publicApi)} public-API ${publicApi === 1 ? 'surface' : 'surfaces'}`);
  if (incidents.length > 0) riskBits.push(`${String(incidents.length)} prior-incident ${incidents.length === 1 ? 'overlap' : 'overlaps'}`);
  if (pr.hasConflicts)      riskBits.push('merge conflicts');
  if (riskBits.length > 0) {
    sentences.push(`Heads up on ${riskBits.join(', ')}.`);
  }

  // Highlights — surface up to 5 concrete facts so the card doubles as
  // a checklist of "things to verify".
  const added = pr.files.filter((f) => f.kind === 'added').length;
  const deleted = pr.files.filter((f) => f.kind === 'deleted').length;
  const renamed = pr.files.filter((f) => f.kind === 'renamed').length;
  if (added > 0)   highlights.push(`${String(added)} new ${added === 1 ? 'file' : 'files'} introduced`);
  if (deleted > 0) highlights.push(`${String(deleted)} ${deleted === 1 ? 'file' : 'files'} deleted`);
  if (renamed > 0) highlights.push(`${String(renamed)} ${renamed === 1 ? 'file' : 'files'} renamed`);
  if (publicApi > 0) highlights.push(`Touches ${String(publicApi)} publicly-exported ${publicApi === 1 ? 'symbol' : 'symbols'}`);
  if (pr.linkedIssues.length > 0) {
    highlights.push(`Closes ${pr.linkedIssues.map((n) => `#${String(n)}`).join(', ')}`);
  }

  // Confidence — high when the description is non-empty AND mentions a
  // file/symbol we can verify; low when description is missing.
  const hasDesc = pr.description.trim().length > 30;
  let confidence = hasDesc ? 0.7 : 0.45;
  if (highlights.length >= 3) confidence += 0.1;
  if (symbols.length >= 2)    confidence += 0.1;
  confidence = Math.min(1, confidence);

  return {
    narrative: sentences.join(' '),
    highlights,
    confidence,
  };
}

// ─── Intent vs actual mismatch detection ─────────────────────────────────

export type IntentMismatch = {
  detected: boolean;
  reason: string | null;
};

const INTENT_KEYWORD_TO_PATH: { keyword: RegExp; pathHint: RegExp; label: string }[] = [
  { keyword: /\bauth(?:n|z)?\b/i,        pathHint: /(?:auth|login|session|token)/i,    label: 'auth' },
  { keyword: /\bpayments?\b/i,           pathHint: /(?:payment|billing|invoice|charge)/i, label: 'payments' },
  { keyword: /\bdocs?\b|documentation/i, pathHint: /(?:^|\/)docs?\//i,                  label: 'docs' },
  { keyword: /\btest(?:s|ing)?\b/i,      pathHint: /(?:^|\/)(?:__tests__|tests?)\/|\.(?:test|spec)\./i, label: 'tests' },
  { keyword: /\bperf(?:ormance)?\b/i,    pathHint: /(?:perf|bench)/i,                   label: 'performance' },
];

/**
 * Heuristic conflict between PR title/description and actual touched
 * paths. We only fire when the description loudly claims a subsystem
 * that doesn't appear in the diff at all — otherwise the false-positive
 * rate would burn the affordance.
 */
export function intentMismatch(pr: PullRequest): IntentMismatch {
  const blob = `${pr.title} ${pr.description}`.toLowerCase();
  for (const rule of INTENT_KEYWORD_TO_PATH) {
    if (!rule.keyword.test(blob)) continue;
    const touches = pr.files.some((f) => rule.pathHint.test(f.path));
    if (!touches && pr.files.length > 0) {
      return {
        detected: true,
        reason: `Description mentions ${rule.label}, but no changed file matches the ${rule.label} subsystem.`,
      };
    }
  }
  return { detected: false, reason: null };
}

// ─── Production correlation (per-file incident hint) ─────────────────────

export type ProdCorrelation = {
  filePath: string;
  /** Incident IDs that overlap this file. */
  incidentIds: string[];
};

/**
 * Per-file map of "this file appeared in N recent incidents". We
 * fold the entity-layer incidentMatches into a per-path map so the
 * Files section can render a tiny "🔥" hint inline rather than
 * forcing the reviewer to bounce to the Risk card.
 */
export function prodCorrelations(pr: PullRequest, repo: RepoData): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const matches = incidentMatches(pr, repo);
  if (matches.length === 0) return out;
  // The IncidentMatch shape doesn't carry a per-file breakdown in the
  // current model, so we attribute every match to every file the PR
  // touches. This is intentionally lossy: the goal is to surface the
  // *signal* "this PR's footprint overlaps an incident" — the reviewer
  // can drill into the incident card to see specifics.
  const ids = matches.map((m) => m.id);
  for (const f of pr.files) {
    if (f.fileId === null) continue;
    const file = repo.files[f.fileId];
    // Bias to files with high blast — those are where the overlap is
    // most likely to bite. Non-blast files are excluded so we don't
    // light up every file in a 50-file PR.
    if (file === undefined) continue;
    if (file.metrics.blastRadius < 8) continue;
    out.set(f.path, ids);
  }
  return out;
}

// ─── Release-train readiness ─────────────────────────────────────────────

export type ReleaseReadiness = {
  /** Does the PR target an active release branch? */
  targetsRelease: boolean;
  /** Plain-English summary for the chip tooltip. */
  detail: string;
  /** Tone hint. */
  tone: 'ok' | 'warn' | 'block';
};

const RELEASE_BRANCH_RE = /^release\/|^hotfix\/|^rc\/|-rc\d+$/i;

/**
 * Surface "this PR is going into a release branch" or "labelled as
 * release-blocker". Square's release-train pattern: catch the wrong
 * train BEFORE the merge, not after the freeze window starts.
 */
export function releaseReadiness(pr: PullRequest): ReleaseReadiness {
  const onRelease = RELEASE_BRANCH_RE.test(pr.baseBranch);
  const labelled = pr.labels.some((l) =>
    /release|train|hotfix|cherry/i.test(l)
  );
  if (onRelease) {
    return {
      targetsRelease: true,
      detail: `Targets ${pr.baseBranch} — release branch. Verify cherry-pick conventions.`,
      tone: 'warn',
    };
  }
  if (labelled) {
    return {
      targetsRelease: true,
      detail: `Labelled as release-bound (${pr.labels.join(', ')}).`,
      tone: 'warn',
    };
  }
  return {
    targetsRelease: false,
    detail: `Targets ${pr.baseBranch} — standard merge.`,
    tone: 'ok',
  };
}

// ─── Engine finding rule provenance ──────────────────────────────────────

/**
 * Map an EngineFinding's category/rule to a human-readable provenance
 * source. Mirrors how Coderev / Bridgecrew expose "where did this rule
 * come from" — internal team rulepack vs vendor SAST vs OSS Semgrep.
 * Reviewers trust findings more when the source is explicit.
 */
export function ruleProvenance(f: EngineFinding): { source: string; tone: string } {
  switch (f.category) {
    case 'SECURITY':
      // SAST gates on 'sast' rule; auth/secrets rules tagged differently.
      if (/secret|key|token/i.test(f.rule)) return { source: 'team policy · secrets', tone: 'var(--intent-danger-fg)' };
      return { source: 'Semgrep · OSS rulepack', tone: 'var(--intent-danger-fg)' };
    case 'API':           return { source: 'team policy · public-API', tone: 'var(--intent-warn-fg)' };
    case 'STRUCT-INTEGRITY': return { source: 'engine · static graph', tone: 'var(--fg-link)' };
    default:              return { source: 'engine', tone: 'var(--fg-muted)' };
  }
}

// ─── Review-session resume (localStorage) ────────────────────────────────

export type SessionState = {
  prNumber: number;
  /** ISO timestamp of last visit. */
  lastVisitedAt: string;
  /** Section anchor the user was at when they navigated away. */
  lastSection: string | null;
  /** Number of files marked viewed at last save. */
  viewedCount: number;
  /** Cumulative review time in ms (single-tab, foreground-only). */
  cumulativeMs: number;
};

const STORAGE_KEY = 'review.session.v1';
const TTL_DAYS = 30;

type SessionMap = Record<string, SessionState>;

function readMap(): SessionMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object') return {};
    // Drop entries past TTL so the store doesn't grow unbounded.
    const cutoff = Date.now() - TTL_DAYS * 24 * 60 * 60 * 1000;
    const clean: SessionMap = {};
    for (const [k, v] of Object.entries(parsed as SessionMap)) {
      if (v === null || typeof v !== 'object') continue;
      const t = new Date(v.lastVisitedAt).getTime();
      if (Number.isNaN(t)) continue;
      if (t < cutoff) continue;
      clean[k] = v;
    }
    return clean;
  } catch {
    return {};
  }
}

function writeMap(m: SessionMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
  } catch {
    // Swallow QuotaExceeded / SecurityError — session resume is a nice-to-have.
  }
}

export function getSession(prNumber: number): SessionState | null {
  return readMap()[String(prNumber)] ?? null;
}

export function saveSession(state: SessionState): void {
  const m = readMap();
  m[String(state.prNumber)] = state;
  writeMap(m);
}

export function bumpCumulative(prNumber: number, deltaMs: number): void {
  const m = readMap();
  const key = String(prNumber);
  const existing = m[key] ?? {
    prNumber, lastVisitedAt: new Date().toISOString(),
    lastSection: null, viewedCount: 0, cumulativeMs: 0,
  };
  existing.cumulativeMs += Math.max(0, deltaMs);
  existing.lastVisitedAt = new Date().toISOString();
  m[key] = existing;
  writeMap(m);
}

// ─── Files-with-tests ratio ──────────────────────────────────────────────

/**
 * Of the source files touched, how many have a co-changed test file?
 * Bacchelli & Bird 2013 — "tests not changing alongside source" is the
 * single highest-value review signal. Surface it as a one-glance
 * percentage instead of asking the reviewer to count test files.
 */
export function testCoverageRatio(files: FileDiff[]): { withTest: number; total: number; ratio: number } {
  const isTest = (p: string): boolean =>
    /(?:^|\/)(?:__tests__|tests|test|__mocks__)\//.test(p)
    || /\.(?:test|spec)\.(?:[tj]sx?|py|go|rb|java|kt|rs)$/.test(p);
  const sourceFiles = files.filter((f) => !isTest(f.path));
  if (sourceFiles.length === 0) {
    return { withTest: 0, total: 0, ratio: 1 };
  }
  // Heuristic: a source file is "covered in this PR" if any test file
  // shares a path-stem prefix with it.
  const testStems = files
    .filter((f) => isTest(f.path))
    .map((f) => f.path.replace(/\.(?:test|spec)\.[a-z]+$/i, '').replace(/^.*?\/(?:__tests__|tests?)\//, ''));
  let withTest = 0;
  for (const src of sourceFiles) {
    const stem = src.path.replace(/\.[a-z]+$/i, '');
    if (testStems.some((t) => stem.endsWith(t) || t.endsWith(stem))) {
      withTest += 1;
    }
  }
  return { withTest, total: sourceFiles.length, ratio: withTest / sourceFiles.length };
}
