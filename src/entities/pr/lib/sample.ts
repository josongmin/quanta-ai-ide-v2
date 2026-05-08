import type {
  CheckRun, ConversationItem, DiffHunk, FileDiff, LineThread, PullRequest,
} from '../model';

// Synthetic PR fixtures — handcrafted so the diff viewer / risk panel /
// conversation thread all have something coherent to render. Realistic
// enough that screenshots feel like a real review queue.

const NOW = Date.parse('2026-05-06T10:30:00Z');
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const iso = (offsetMs: number): string => new Date(NOW - offsetMs).toISOString();

function hunk(header: string, oldStart: number, newStart: number, body: string): DiffHunk {
  // body is a multiline string where each line begins with " ", "+", or "-".
  const lines = body.split('\n').filter((l) => l.length > 0).map((raw, i) => {
    const sign = raw[0] ?? ' ';
    const text = raw.slice(1);
    if (sign === '+') {
      // newNo advances on every line consuming a new-file slot — context AND add.
      return { kind: 'add' as const, newNo: newStart + countNewBefore(body, i), oldNo: null, text };
    }
    if (sign === '-') {
      // oldNo advances on every line consuming an old-file slot — context AND del.
      return { kind: 'del' as const, newNo: null, oldNo: oldStart + countOldBefore(body, i), text };
    }
    return {
      kind: 'context' as const,
      newNo: newStart + countNewBefore(body, i),
      oldNo: oldStart + countOldBefore(body, i),
      text,
    };
  });
  return { header, oldStart, newStart, lines };
}

function countNewBefore(body: string, untilIdx: number): number {
  // new = context + add
  let n = 0;
  const lines = body.split('\n').filter((l) => l.length > 0);
  for (let i = 0; i < untilIdx; i++) {
    const s = lines[i]?.[0];
    if (s === ' ' || s === '+') n++;
  }
  return n;
}
function countOldBefore(body: string, untilIdx: number): number {
  // old = context + del
  let n = 0;
  const lines = body.split('\n').filter((l) => l.length > 0);
  for (let i = 0; i < untilIdx; i++) {
    const s = lines[i]?.[0];
    if (s === ' ' || s === '-') n++;
  }
  return n;
}

// ─── PR #214 — auth token rotation ────────────────────────────────────────

const PR_214_FILES: FileDiff[] = [
  {
    path: 'src/core/auth/middleware.ts',
    oldPath: null,
    kind: 'modified',
    added: 18,
    removed: 9,
    viewed: false,
    fileId: 12,
    hunks: [
      hunk(
        '@@ -42,12 +42,21 @@ export async function authMiddleware(req, res, next)',
        42, 42,
` export async function authMiddleware(req, res, next) {
   const token = req.cookies.session;
-  if (!token) return next(new Unauthorized());
-  const decoded = await verify(token, SECRET);
-  if (decoded.exp < Date.now()) {
-    return next(new SessionExpired());
+  if (!token) {
+    return next(new Unauthorized());
   }
+  let decoded: SessionToken;
+  try {
+    decoded = await verify(token, await getRotatingSecret());
+  } catch (err) {
+    metrics.increment('auth.verify_failed', { reason: err.code });
+    return next(new Unauthorized());
+  }
+  if (isExpired(decoded)) {
+    res.clearCookie('session');
+    return next(new SessionExpired());
+  }
+  req.user = decoded.user;
   return next();
 }`,
      ),
    ],
  },
  {
    path: 'src/core/auth/rotating-secret.ts',
    oldPath: null,
    kind: 'added',
    added: 34,
    removed: 0,
    viewed: false,
    fileId: 15,
    hunks: [
      hunk(
        '@@ -0,0 +1,34 @@',
        0, 1,
`+import { kvStore } from '@infra/kv';
+
+const SECRET_KEY = 'auth.rotating-secret';
+const ROTATION_INTERVAL_MS = 1000 * 60 * 60 * 24; // 24h
+
+let cached: { secret: string; rotatedAt: number } | null = null;
+
+export async function getRotatingSecret(): Promise<string> {
+  if (cached && Date.now() - cached.rotatedAt < ROTATION_INTERVAL_MS) {
+    return cached.secret;
+  }
+  const fresh = await kvStore.get(SECRET_KEY);
+  if (!fresh) {
+    throw new Error('rotating secret not configured');
+  }
+  cached = { secret: fresh.value, rotatedAt: fresh.rotatedAt };
+  return cached.secret;
+}
+
+export function invalidateSecretCache(): void {
+  cached = null;
+}`,
      ),
    ],
  },
  {
    path: 'src/core/auth/__tests__/middleware.test.ts',
    oldPath: null,
    kind: 'modified',
    added: 41,
    removed: 8,
    viewed: false,
    fileId: 18,
    hunks: [
      hunk(
        '@@ -1,15 +1,28 @@',
        1, 1,
` import { describe, it, expect, vi } from 'vitest';
 import { authMiddleware } from '../middleware';
+import { invalidateSecretCache } from '../rotating-secret';
+
+vi.mock('../rotating-secret', () => ({
+  getRotatingSecret: vi.fn(async () => 'test-secret'),
+  invalidateSecretCache: vi.fn(),
+}));

 describe('authMiddleware', () => {
+  beforeEach(() => { invalidateSecretCache(); });
+
   it('rejects requests without a session cookie', async () => {
     const next = vi.fn();
     await authMiddleware({ cookies: {} } as any, {} as any, next);
     expect(next).toHaveBeenCalledWith(expect.any(Unauthorized));
   });
+
+  it('rejects expired tokens and clears the cookie', async () => {
+    const res = { clearCookie: vi.fn() } as any;
+    const next = vi.fn();
+    await authMiddleware({ cookies: { session: stale() } } as any, res, next);
+    expect(res.clearCookie).toHaveBeenCalledWith('session');
+    expect(next).toHaveBeenCalledWith(expect.any(SessionExpired));
+  });
 });`,
      ),
    ],
  },
];

const PR_214_CHECKS: CheckRun[] = [
  { id: 'c-214-1', name: 'build',     status: 'success', required: true,  durationMs: 41_000, summary: 'tsc + bundler clean' },
  { id: 'c-214-2', name: 'test',      status: 'success', required: true,  durationMs: 92_000, summary: '184 / 184 passed' },
  { id: 'c-214-3', name: 'lint',      status: 'success', required: true,  durationMs: 12_000, summary: '0 errors, 0 warnings' },
  { id: 'c-214-4', name: 'security',  status: 'failure', required: true,  durationMs: 28_000, summary: 'secret-scan: 1 high finding in fixture' },
  { id: 'c-214-5', name: 'preview',   status: 'success', required: false, durationMs: 65_000, summary: 'preview env up at acme-pr-214.preview.sh' },
];

const PR_214_THREADS: LineThread[] = [
  {
    id: 'lt-214-1',
    filePath: 'src/core/auth/middleware.ts',
    line: 49,
    resolved: false,
    comments: [
      { id: 'cm-1', authorLogin: 'haeun',   body: 'Should we tag this counter with `route:` so we can spot which endpoints are misbehaving?', createdAt: iso(2 * HOUR), resolved: false },
      { id: 'cm-2', authorLogin: 'songmin', body: 'Good call — pushing a follow-up commit.', createdAt: iso(1 * HOUR + 30 * 60_000), resolved: false },
    ],
  },
  {
    id: 'lt-214-2',
    filePath: 'src/core/auth/rotating-secret.ts',
    line: 9,
    resolved: false,
    comments: [
      { id: 'cm-3', authorLogin: 'jiho', body: 'Race window: two concurrent requests after expiry both fetch a fresh secret. Probably fine but worth a TODO.', createdAt: iso(45 * 60_000), resolved: false },
    ],
  },
];

const PR_214_CONVERSATION: ConversationItem[] = [
  { kind: 'event',   id: 'ev-1', eventType: 'commit',           actorLogin: 'songmin', detail: 'feat(auth): rotate session secret on schedule', createdAt: iso(6 * HOUR) },
  { kind: 'event',   id: 'ev-2', eventType: 'review-requested', actorLogin: 'songmin', detail: 'requested review from haeun, jiho',              createdAt: iso(5 * HOUR) },
  { kind: 'review',  id: 'rv-1', authorLogin: 'haeun', verdict: 'comment',         body: 'Reads well overall — left two questions on the middleware.', createdAt: iso(2 * HOUR) },
  { kind: 'event',   id: 'ev-3', eventType: 'status-change',    actorLogin: 'agent',   detail: 'security check failed (1 high finding in fixture)',     createdAt: iso(1 * HOUR + 50 * 60_000) },
  { kind: 'comment', id: 'cm-pr-1', authorLogin: 'songmin', body: 'The security finding is a planted secret in a fixture — adding it to `.secret-baseline`.', createdAt: iso(1 * HOUR + 10 * 60_000) },
];

// ─── PR #218 — catalog listing copy ───────────────────────────────────────

const PR_218_FILES: FileDiff[] = [
  {
    path: 'docs/catalog-algorithms-listing.md',
    oldPath: null,
    kind: 'modified',
    added: 28,
    removed: 14,
    viewed: false,
    fileId: 31,
    hunks: [
      hunk(
        '@@ -3,10 +3,12 @@',
        3, 3,
` # SOTA 알고리즘 카탈로그 (Listing)

-**Last updated**: 2026-05-04
+**마지막 업데이트**: 2026-05-06
+
+이 문서는 자동 생성됩니다. 카테고리별 capability 표는 \`tools/catalog/\`에서 빌드합니다.

 ## Overview
-The catalog enumerates analysis capabilities by category.
+카탈로그는 분석 capability를 카테고리별로 나열합니다.`,
      ),
    ],
  },
];

const PR_218_CHECKS: CheckRun[] = [
  { id: 'c-218-1', name: 'build', status: 'success', required: true,  durationMs: 38_000, summary: 'docs build passed' },
  { id: 'c-218-2', name: 'lint',  status: 'success', required: true,  durationMs: 4_000,  summary: 'markdownlint clean' },
];

// ─── PR #221 — receipt regression test ────────────────────────────────────

const PR_221_FILES: FileDiff[] = [
  {
    path: 'src/billing/__tests__/receipt-regression.test.ts',
    oldPath: null,
    kind: 'added',
    added: 87,
    removed: 0,
    viewed: false,
    fileId: 47,
    hunks: [
      hunk(
        '@@ -0,0 +1,40 @@',
        0, 1,
`+import { describe, it, expect } from 'vitest';
+import { readReceipt } from '../receipt';
+import { withSession } from '@test/session';
+
+describe('readReceipt — session-scoped (regression)', () => {
+  it('does not leak receipt across sessions', async () => {
+    const a = await withSession('user-a', () => readReceipt('r-1'));
+    const b = await withSession('user-b', () => readReceipt('r-1'));
+    expect(a.id).toBe('r-1');
+    expect(b).toBeNull();
+  });
+});`,
      ),
    ],
  },
  {
    path: 'src/billing/receipt.ts',
    oldPath: null,
    kind: 'modified',
    added: 30,
    removed: 54,
    viewed: false,
    fileId: 48,
    hunks: [
      hunk(
        '@@ -10,30 +10,12 @@',
        10, 10,
` export async function readReceipt(id: string): Promise<Receipt | null> {
-  const cached = globalCache.get(id);
-  if (cached) return cached;
-  const row = await db.receipts.findOne({ id });
-  if (!row) return null;
-  globalCache.set(id, row);
-  return row;
+  const session = currentSession();
+  if (!session) return null;
+  return db.receipts.findOne({ id, sessionId: session.id });
 }`,
      ),
    ],
  },
];

const PR_221_CHECKS: CheckRun[] = [
  { id: 'c-221-1', name: 'build',    status: 'success', required: true,  durationMs: 39_000, summary: null },
  { id: 'c-221-2', name: 'test',     status: 'running', required: true,  durationMs: null,   summary: 'running 412 / 1100' },
  { id: 'c-221-3', name: 'lint',     status: 'success', required: true,  durationMs: 9_000,  summary: null },
  { id: 'c-221-4', name: 'security', status: 'pending', required: false, durationMs: null,   summary: 'queued' },
];

// ─── PR #205 — gqlang e2e fixtures (merged) ──────────────────────────────

const PR_205_FILES: FileDiff[] = [
  {
    path: 'test/gqlang/fixtures/users.json',
    oldPath: null,
    kind: 'added',
    added: 142,
    removed: 0,
    viewed: false,
    fileId: 78,
    hunks: [hunk('@@ -0,0 +1,5 @@', 0, 1, `+{
+  "users": [],
+  "_seedAt": "2026-05-01T00:00:00Z"
+}`)],
  },
];

const PR_205_CHECKS: CheckRun[] = [
  { id: 'c-205-1', name: 'build',    status: 'success', required: true,  durationMs: 33_000, summary: null },
  { id: 'c-205-2', name: 'test',     status: 'success', required: true,  durationMs: 71_000, summary: '1100 / 1100 passed' },
  { id: 'c-205-3', name: 'lint',     status: 'success', required: true,  durationMs: 8_000,  summary: null },
];

// ─── PR #198 — vector authority join (merged) ────────────────────────────

const PR_198_FILES: FileDiff[] = [
  {
    path: 'src/quanta/planner/vector-authority.ts',
    oldPath: null,
    kind: 'modified',
    added: 92,
    removed: 67,
    viewed: false,
    fileId: 92,
    hunks: [hunk('@@ -22,8 +22,10 @@', 22, 22, ` const plan = buildPlan(spec);
-plan.joins.push({ kind: 'cross', authority: 'vector' });
+plan.joins.push({ kind: 'cross', authority: 'vector', verified: true });
+plan.witnesses.push(witnessFor(spec.id));`)],
  },
];

const PR_198_CHECKS: CheckRun[] = [
  { id: 'c-198-1', name: 'build', status: 'success', required: true,  durationMs: 34_000, summary: null },
  { id: 'c-198-2', name: 'test',  status: 'success', required: true,  durationMs: 88_000, summary: null },
  { id: 'c-198-3', name: 'lint',  status: 'success', required: true,  durationMs: 9_000,  summary: null },
];

// ─── Final list ──────────────────────────────────────────────────────────

export const SAMPLE_PRS: PullRequest[] = [
  {
    number: 214,
    title: 'auth: rotate session secret on a 24h schedule',
    description:
`Replaces the static \`SECRET\` constant with a KV-backed value rotated daily.
Adds a guard around \`verify()\` so a malformed cookie doesn't 500. Tests
cover the new failure paths.

Closes #211. Builds on #207 (kv namespace).`,
    status: 'changes-requested',
    author: 'songmin',
    reviewers: [
      { login: 'haeun', state: 'changes-requested' },
      { login: 'jiho',  state: 'commented' },
    ],
    baseBranch: 'main',
    headBranch: 'feat/auth-token-rotation',
    repo: 'acme-monorepo',
    labels: ['security', 'breaking-internal'],
    linkedIssues: [211],
    createdAt: iso(8 * HOUR),
    updatedAt: iso(40 * 60_000),
    added: 93,
    removed: 17,
    filesChangedCount: 3,
    files: PR_214_FILES,
    checks: PR_214_CHECKS,
    conversation: PR_214_CONVERSATION,
    threads: PR_214_THREADS,
    ahead: 4,
    behind: 1,
    hasConflicts: false,
  },
  {
    number: 218,
    title: 'docs: 카탈로그 리스팅 한국어 카피 다듬기',
    description: '리스팅 페이지의 카피를 한국어로 통일합니다.',
    status: 'open',
    author: 'sora',
    reviewers: [
      { login: 'songmin', state: 'pending' },
    ],
    baseBranch: 'main',
    headBranch: 'docs/catalog-listing',
    repo: 'acme-monorepo',
    labels: ['docs'],
    linkedIssues: [],
    createdAt: iso(2 * HOUR),
    updatedAt: iso(15 * 60_000),
    added: 28,
    removed: 14,
    filesChangedCount: 1,
    files: PR_218_FILES,
    checks: PR_218_CHECKS,
    conversation: [
      { kind: 'event', id: 'ev-218-1', eventType: 'commit', actorLogin: 'sora', detail: 'docs(catalog): refresh listing copy', createdAt: iso(2 * HOUR) },
    ],
    threads: [],
    ahead: 1,
    behind: 0,
    hasConflicts: false,
  },
  {
    number: 221,
    title: 'fix(billing): scope receipt reads by session',
    description: 'Receipts could leak across sessions due to a global cache. Replaces it with session-scoped reads. Adds a regression test.',
    status: 'open',
    author: 'jiho',
    reviewers: [
      { login: 'songmin', state: 'pending' },
      { login: 'haeun',   state: 'pending' },
    ],
    baseBranch: 'main',
    headBranch: 'fix/session-receipt-regression',
    repo: 'quanta-v2',
    labels: ['bug', 'security', 'p1'],
    linkedIssues: [219],
    createdAt: iso(1 * HOUR),
    updatedAt: iso(5 * 60_000),
    added: 117,
    removed: 54,
    filesChangedCount: 2,
    files: PR_221_FILES,
    checks: PR_221_CHECKS,
    conversation: [
      { kind: 'event', id: 'ev-221-1', eventType: 'commit', actorLogin: 'jiho', detail: 'fix(billing): scope receipt reads by session', createdAt: iso(1 * HOUR) },
    ],
    threads: [],
    ahead: 2,
    behind: 0,
    hasConflicts: false,
  },
  {
    number: 205,
    title: 'test(gqlang): split e2e fixtures',
    description: 'Splits the monolithic gqlang fixture file into per-domain JSON.',
    status: 'merged',
    author: 'minjun',
    reviewers: [
      { login: 'songmin', state: 'approved' },
      { login: 'haeun',   state: 'approved' },
    ],
    baseBranch: 'main',
    headBranch: 'test/gqlang-e2e-fixtures',
    repo: 'quanta-v2',
    labels: ['tests'],
    linkedIssues: [],
    createdAt: iso(4 * HOUR),
    updatedAt: iso(3 * HOUR),
    added: 312,
    removed: 88,
    filesChangedCount: 11,
    files: PR_205_FILES,
    checks: PR_205_CHECKS,
    conversation: [
      { kind: 'event', id: 'ev-205-1', eventType: 'commit', actorLogin: 'minjun', detail: 'test(gqlang): split fixtures', createdAt: iso(4 * HOUR) },
      { kind: 'event', id: 'ev-205-2', eventType: 'merged', actorLogin: 'minjun', detail: 'merged into main',              createdAt: iso(3 * HOUR) },
    ],
    threads: [],
    ahead: 0,
    behind: 0,
    hasConflicts: false,
  },
  {
    number: 198,
    title: 'fix(quanta): pin vector authority join plan',
    description: 'Stable witness on the vector authority join. Removes a flaky overapprox path.',
    status: 'merged',
    author: 'leo',
    reviewers: [
      { login: 'songmin', state: 'approved' },
    ],
    baseBranch: 'main',
    headBranch: 'fix/vector-authority-join',
    repo: 'quanta-v2',
    labels: ['planner', 'fix'],
    linkedIssues: [195, 196],
    createdAt: iso(1 * DAY + 2 * HOUR),
    updatedAt: iso(1 * DAY),
    added: 472,
    removed: 275,
    filesChangedCount: 51,
    files: PR_198_FILES,
    checks: PR_198_CHECKS,
    conversation: [
      { kind: 'event', id: 'ev-198-1', eventType: 'commit', actorLogin: 'leo', detail: 'pin vector authority witness', createdAt: iso(1 * DAY + 2 * HOUR) },
      { kind: 'event', id: 'ev-198-2', eventType: 'merged', actorLogin: 'leo', detail: 'merged into main',              createdAt: iso(1 * DAY) },
    ],
    threads: [],
    ahead: 0,
    behind: 0,
    hasConflicts: false,
  },
  {
    number: 222,
    title: 'wip: try wasm-based search core',
    description: 'Spike on running the Tantivy search core through wasm-bindgen.',
    status: 'draft',
    author: 'yuna',
    reviewers: [],
    baseBranch: 'main',
    headBranch: 'spike/wasm-search-core',
    repo: 'quanta-v2',
    labels: ['spike', 'wasm'],
    linkedIssues: [],
    createdAt: iso(30 * 60_000),
    updatedAt: iso(20 * 60_000),
    added: 412,
    removed: 18,
    filesChangedCount: 7,
    files: [],
    checks: [
      { id: 'c-222-1', name: 'build', status: 'pending', required: true, durationMs: null, summary: 'queued' },
    ],
    conversation: [],
    threads: [],
    ahead: 1,
    behind: 3,
    hasConflicts: true,
  },
];
