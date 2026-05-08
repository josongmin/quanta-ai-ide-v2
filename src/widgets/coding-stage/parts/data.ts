import type { Task, Project } from './types';

// Hand-authored project + task fixtures. Tasks now reference a project by
// id so the rail can group them. Each project gets an accent + initial
// for the rail chip; nothing is loaded from a real backend.
//
// All human-readable strings (task titles, chat turns, plan items, and
// thinking/intent prose) live in coding.json under `demo.*` so the demo
// data follows the user's chosen language. Code-like values (file paths,
// branch names, diff lines, command output) stay inline because they
// reflect what an agent would actually emit.

type T = (key: string, opts?: Record<string, unknown>) => string;

export const SAMPLE_PROJECTS: Project[] = [
  {
    id: 'p-acme',
    name: 'acme-monorepo',
    slug: 'github.com/acme/monorepo',
    initial: 'A',
    accent: 'emerald',
    pinned: true,
    defaultModel: 'claude-opus-4-7',
    budget: { alertUsd: 1.50, softCapUsd: 3.50, hardCapUsd: 5.00 },
    integrations: [
      { kind: 'github', label: 'acme/monorepo',     connected: true  },
      { kind: 'slack',  label: '#eng-reviews',      connected: true  },
      { kind: 'linear', label: 'PLATFORM cycle',    connected: true  },
      { kind: 'sentry', label: 'acme-prod',         connected: false },
    ],
  },
  {
    id: 'p-quanta',
    name: 'quanta-v2',
    slug: 'github.com/songmin/quanta-v2',
    initial: 'Q',
    accent: 'violet',
    pinned: true,
    defaultModel: 'claude-sonnet-4-6',
    budget: { alertUsd: 0.80, softCapUsd: 1.80, hardCapUsd: 2.50 },
    integrations: [
      { kind: 'github', label: 'songmin/quanta-v2', connected: true  },
      { kind: 'linear', label: 'QNT-cycle-42',      connected: true  },
    ],
  },
  {
    id: 'p-edge',
    name: 'edge-runtime',
    slug: 'github.com/songmin/edge-runtime',
    initial: 'E',
    accent: 'sky',
    defaultModel: 'claude-haiku-4-5',
    integrations: [
      { kind: 'github', label: 'songmin/edge-runtime', connected: true  },
      { kind: 'sentry', label: 'edge-runtime-prod',    connected: true  },
    ],
  },
  {
    id: 'p-pulse',
    name: 'pulse-dashboard',
    slug: 'github.com/songmin/pulse',
    initial: 'P',
    accent: 'amber',
    integrations: [
      { kind: 'github', label: 'songmin/pulse',     connected: true  },
      { kind: 'figma',  label: 'pulse-design-v2',   connected: true  },
      { kind: 'jira',   label: 'PULSE-board',       connected: false },
    ],
  },
];

export function getSampleProjects(): Project[] {
  return SAMPLE_PROJECTS;
}

// Build the demo task fixtures using the i18n `t()` so prose is localised.
// Stable timestamps / diff stats / branch names stay locale-agnostic.
export function getSampleTasks(t: T): Task[] {
  return [
    {
      id: 't-001',
      projectId: 'p-acme',
      title: t('demo.t001.title'),
      branch: 'feat/auth-token-rotation',
      baseBranch: 'main',
      status: 'review',
      pinned: true,
      labels: ['security', 'auth'],
      timeAgo: '12m',
      diffStats: { added: 184, removed: 92, files: 7 },
      branchState: { ahead: 12, behind: 0, mergeable: 'clean', lastPushAtMs: Date.now() - 4 * 60 * 1000 },
      prState: {
        number: 847,
        url: 'https://github.com/acme/monorepo/pull/847',
        status: 'open',
        reviewers: [
          { handle: '@reviewer-a', state: 'pending' },
          { handle: '@reviewer-b', state: 'approved' },
        ],
        checks: [
          { name: 'build',  status: 'success', durationMs: 72000 },
          { name: 'test',   status: 'success', durationMs: 124000 },
          { name: 'e2e',    status: 'running' },
          { name: 'lint',   status: 'failure', durationMs: 8000 },
        ],
        conflicts: 0,
        baseAhead: 0,
      },
      execution: { surface: 'cloud', notify: 'browser', lastSyncAtMs: Date.now() - 2000 },
      thread: [
        {
          id: 'u1', role: 'user', at: t('demo.t001.t12m'),
          text: t('demo.t001.u1'),
          mentions: [
            { kind: 'file', label: 'src/auth/middleware.ts' },
            { kind: 'symbol', label: 'withSession' },
          ],
        },
        {
          id: 'a1', role: 'agent', at: t('demo.t001.t12m'), tokens: { in: 4280, out: 1240 }, elapsed: '6.4s',
          blocks: [
            {
              kind: 'thinking', durationMs: 4200,
              text: t('demo.t001.a1.thinking'),
            },
            { kind: 'text', text: t('demo.t001.a1.text1') },
            {
              kind: 'tool', tool: 'search', label: 'rg "withSession\\(" --type ts',
              detail: '23 results · 14 files', status: 'ok',
              output: 'src/auth/middleware.ts:42:export function withSession<T>(handler: T) {\nsrc/auth/middleware.ts:88:  return withSession(async (req) => {\nsrc/api/users.ts:12:export const GET = withSession(async () => {\nsrc/api/billing.ts:8:export const POST = withSession(async (req) => {\nsrc/api/sessions.ts:14:return withSession(async (req, ctx) => {\n...18 more',
            },
            {
              kind: 'tool', tool: 'read', label: 'src/auth/middleware.ts', detail: 'L1-142', status: 'ok',
              output: '  1│ import { cookies } from "next/headers";\n  2│ import { verifyJWT } from "./jwt";\n  3│ \n 42│ export function withSession<T>(handler: T) {\n 43│   return async (req: Request) => {\n 44│     const token = sessionStorage.getItem("auth")\n 45│       ?? req.headers.get("authorization");\n ...',
            },
            {
              kind: 'plan', title: t('demo.t001.a1.planTitle'),
              items: [
                { id: 'p1', text: t('demo.t001.a1.plan1'), done: true },
                { id: 'p2', text: t('demo.t001.a1.plan2'), done: true },
                { id: 'p3', text: t('demo.t001.a1.plan3'), done: true },
                { id: 'p4', text: t('demo.t001.a1.plan4'), done: false },
              ],
            },
          ],
        },
        {
          id: 'u2', role: 'user', at: t('demo.t001.t8m'),
          text: t('demo.t001.u2'),
        },
        {
          id: 'a2', role: 'agent', at: t('demo.t001.t6m'), tokens: { in: 6190, out: 2840 }, elapsed: '24.1s',
          blocks: [
            { kind: 'text', text: t('demo.t001.a2.text1') },
            { kind: 'tool', tool: 'edit', label: 'src/auth/session.ts', detail: '+88 −24', status: 'ok' },
            { kind: 'tool', tool: 'edit', label: 'src/auth/__tests__/middleware.test.ts', detail: '+54 −0', status: 'ok' },
            {
              kind: 'tool', tool: 'run', label: 'pnpm test auth', detail: '6 passed · 1.2s', status: 'ok',
              output: '$ vitest run auth\n\n ✓ src/auth/__tests__/middleware.test.ts (6)\n   ✓ withSession reads from cookie when present\n   ✓ withSession falls back to legacy header\n   ✓ rotation refreshes token after 15 minutes\n   ✓ httpOnly flag set on response\n   ✓ malformed token returns 401\n   ✓ adapter preserves request context\n\n Test Files  1 passed (1)\n      Tests  6 passed (6)\n   Duration  1.21s',
            },
            {
              kind: 'diff', added: 184, removed: 92,
              files: [
                {
                  path: 'src/auth/middleware.ts', added: 42, removed: 18,
                  // Demo drift: same file edited again 4m ago in the
                  // working tree → overlap on hunk 0. Triggers the
                  // hatch overlay + amber drift badge.
                  drift: {
                    state: 'overlap',
                    driftedHunkIdx: [0],
                    workingShaLastTouchedAtMs: Date.now() - 4 * 60 * 1000,
                    conflictRanges: [[47, 53]],
                  },
                  hunks: [{
                    id: 'h-mw-1',
                    header: '@@ -42,18 +42,42 @@ export function withSession',
                    lines: [
                      { kind: 'ctx', text: 'export function withSession<T>(handler: T) {' },
                      { kind: 'ctx', text: '  return async (req: Request) => {' },
                      { kind: 'del', text: '    const token = sessionStorage.getItem("auth")' },
                      { kind: 'del', text: '      ?? req.headers.get("authorization");' },
                      { kind: 'add', text: '    const token = await SessionAdapter.read(req);' },
                      { kind: 'add', text: '    if (SessionAdapter.shouldRotate(token)) {' },
                      { kind: 'add', text: '      await SessionAdapter.rotate(token);' },
                      { kind: 'add', text: '    }' },
                      { kind: 'ctx', text: '    if (!token) return new Response("unauthorized", { status: 401 });' },
                    ],
                  }],
                },
                {
                  path: 'src/auth/session.ts', added: 88, removed: 24,
                  hunks: [{
                    header: '@@ -1,0 +1,88 @@ // SessionAdapter',
                    lines: [
                      { kind: 'add', text: 'export const SessionAdapter = {' },
                      { kind: 'add', text: '  async read(req: Request): Promise<string | null> {' },
                      { kind: 'add', text: '    const cookieStore = await cookies();' },
                      { kind: 'add', text: '    return cookieStore.get("session")?.value ?? null;' },
                      { kind: 'add', text: '  },' },
                      { kind: 'add', text: '  shouldRotate(token: string): boolean {' },
                      { kind: 'add', text: '    return Date.now() - decode(token).iat > FIFTEEN_MIN;' },
                      { kind: 'add', text: '  },' },
                    ],
                  }],
                },
                { path: 'src/auth/__tests__/middleware.test.ts', added: 54, removed: 0, hunks: [] },
              ],
            },
            { kind: 'text', text: t('demo.t001.a2.text2') },
          ],
        },
      ],
    },
    {
      id: 't-002',
      projectId: 'p-acme',
      title: t('demo.t002.title'),
      branch: 'docs/catalog-listing',
      baseBranch: 'main',
      status: 'running',
      labels: ['copy', 'i18n'],
      timeAgo: '2m',
      diffStats: { added: 41, removed: 18, files: 2 },
      execution: { surface: 'cloud', notify: 'browser', lastSyncAtMs: Date.now() - 1500 },
      thread: [
        {
          id: 'u1', role: 'user', at: t('demo.t002.t2m'),
          text: t('demo.t002.u1'),
          mentions: [{ kind: 'file', label: 'src/pages/catalog/listing.ko.json' }],
        },
        {
          id: 'a1', role: 'agent', at: t('demo.t002.tNow'), streaming: true,
          blocks: [
            { kind: 'thinking', durationMs: 1800, text: t('demo.t002.a1.thinking') },
            { kind: 'tool', tool: 'read', label: 'src/pages/catalog/listing.ko.json', status: 'ok' },
            { kind: 'text', text: t('demo.t002.a1.text1') },
          ],
        },
      ],
    },
    {
      id: 't-006',
      projectId: 'p-acme',
      title: t('demo.t006.title'),
      branch: 'fix/webhook-jitter',
      baseBranch: 'main',
      status: 'failed',
      labels: ['infra'],
      timeAgo: '2h',
      diffStats: { added: 24, removed: 6, files: 1 },
      thread: [
        {
          id: 'u1', role: 'user', at: t('demo.t006.t2h'),
          text: t('demo.t006.u1'),
        },
        {
          id: 'a1', role: 'agent', at: t('demo.t006.t1h'),
          blocks: [
            { kind: 'text', text: t('demo.t006.a1.text1') },
            {
              kind: 'tool', tool: 'run', label: 'pnpm test webhook', detail: '1 failed', status: 'fail',
              output: '$ vitest run webhook\n\n ✗ webhook retries with jitter (timing-sensitive)\n   Expected: < 1500ms\n   Received: 1820ms\n\n 1 failed',
              testResults: {
                passed: 4,
                failed: 1,
                durationMs: 5840,
                failures: [{
                  name: 'webhook retries with jitter (timing-sensitive)',
                  file: 'src/server/webhook/__tests__/retry.test.ts',
                  message: 'expected < 1500ms · got 1820ms',
                  stackHits: [
                    { file: 'src/server/webhook/retry.ts', line: 42, hunkId: 'h-retry-1' },
                    { file: 'src/server/webhook/__tests__/retry.test.ts', line: 18 },
                  ],
                  attributedHunkIds: ['h-retry-1'],
                }],
              },
            },
          ],
        },
      ],
    },
    {
      id: 't-003',
      projectId: 'p-quanta',
      title: t('demo.t003.title'),
      branch: 'fix/session-receipt-regression',
      baseBranch: 'main',
      status: 'open',
      labels: ['test', 'regression'],
      timeAgo: '1h',
      diffStats: { added: 117, removed: 54, files: 2 },
      thread: [
        {
          id: 'u1', role: 'user', at: t('demo.t003.t1h'),
          text: t('demo.t003.u1'),
        },
        {
          id: 'a1', role: 'agent', at: t('demo.t003.t58m'),
          blocks: [
            { kind: 'text', text: t('demo.t003.a1.text1') },
            {
              kind: 'plan', title: t('demo.t003.a1.planTitle'),
              items: [
                { id: 'p1', text: t('demo.t003.a1.plan1'), done: false },
                { id: 'p2', text: t('demo.t003.a1.plan2'), done: false },
                { id: 'p3', text: t('demo.t003.a1.plan3'), done: false },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 't-004',
      projectId: 'p-quanta',
      title: t('demo.t004.title'),
      branch: 'test/gqlang-e2e-fixtures',
      baseBranch: 'main',
      status: 'merged',
      timeAgo: '4h',
      diffStats: { added: 312, removed: 88, files: 11 },
      thread: [],
    },
    {
      id: 't-005',
      projectId: 'p-quanta',
      title: t('demo.t005.title'),
      branch: 'fix/vector-authority-join',
      baseBranch: 'main',
      status: 'merged',
      timeAgo: '1d',
      diffStats: { added: 472, removed: 275, files: 51 },
      thread: [],
    },
    {
      id: 't-007',
      projectId: 'p-edge',
      title: t('demo.t007.title'),
      branch: 'fix/cold-start-labels',
      baseBranch: 'main',
      status: 'open',
      labels: ['observability'],
      timeAgo: '3h',
      diffStats: { added: 12, removed: 4, files: 1 },
      thread: [],
    },
    {
      id: 't-008',
      projectId: 'p-pulse',
      title: t('demo.t008.title'),
      branch: 'feat/admin-onboarding',
      baseBranch: 'main',
      status: 'review',
      labels: ['ui'],
      timeAgo: '5h',
      diffStats: { added: 211, removed: 34, files: 9 },
      thread: [],
    },
  ];
}

// SAMPLE_TASKS used to be a top-level array of fixtures with hard-coded
// Korean strings. Callers must now use `getSampleTasks(t)` so the prose
// follows the user's chosen locale. We deliberately do not re-export an
// empty stub — anything still importing the old name should fail loudly
// at build time so the migration is unmissable.

// ─── Mention picker fixtures ──────────────────────────────────────────────
// Sample data used by `MentionPicker.tsx` for the `#file` and `@symbol`
// triggers. Production wires this to the project's actual file/symbol
// index; the demo stays static.

export const SAMPLE_MENTION_FILES: { path: string }[] = [
  { path: 'src/auth/middleware.ts' },
  { path: 'src/auth/withSession.ts' },
  { path: 'src/api/users.ts' },
  { path: 'src/api/billing.ts' },
  { path: 'src/api/sessions.ts' },
  { path: 'src/lib/cookies.ts' },
  { path: 'src/lib/jwt.ts' },
  { path: 'docs/auth.md' },
];

export const SAMPLE_MENTION_SYMBOLS: { name: string; path: string }[] = [
  { name: 'withSession', path: 'src/auth/middleware.ts' },
  { name: 'rotateToken', path: 'src/auth/withSession.ts' },
  { name: 'issueCookie', path: 'src/lib/cookies.ts' },
  { name: 'verifyJwt', path: 'src/lib/jwt.ts' },
  { name: 'getSession', path: 'src/api/sessions.ts' },
];
