// Domain types for the coding stage. Kept separate so the demo data
// fixture and the view can both import without a cycle.

export type TaskStatus = 'running' | 'review' | 'merged' | 'open' | 'failed';

// Renamed from `DiffHunk`/`FileChange` to avoid clashing with the PR
// entity's `DiffHunk`/`FileDiff` (different shape, different purpose: this
// pair models the agent's tool-call output, not a real PR diff).
export type CodingDiffHunk = {
  // unified-diff style hunk for the inline expander. Lines marked
  // 'add' / 'del' / 'ctx' for context. Nothing is parsed — just rendered.
  // `id` lets the per-hunk accept/reject state survive re-renders without
  // relying on array index.
  id?: string;
  header: string;
  lines: { kind: 'add' | 'del' | 'ctx'; text: string }[];
  // Per-hunk reviewer decision. `undefined` = pending, like a code review
  // comment that hasn't been resolved yet. 2026 expectation: agents land
  // bigger diffs and reviewers want to greenlight pieces independently.
  decision?: 'accepted' | 'rejected';
};

// Inline comment on a hunk. `kind` distinguishes a question that should
// route back to the agent ("ask agent") from a plain note for the reviewer
// to come back to. Real impl would persist these and surface them in PR.
// `replies` lets a comment grow a small thread — the agent's answer to
// an "ask" lands as a reply, mirroring GitHub PR review threads.
export type HunkComment = {
  id: string;
  text: string;
  kind: 'note' | 'ask';
  at: string;
  // `author` distinguishes the user from the agent in a reply chain.
  // Top-level comments are always 'user'; agent answers come as replies.
  author?: 'user' | 'agent';
  replies?: HunkComment[];
  resolved?: boolean;
};

// Lightweight reaction on an AgentTurn. The set is fixed (👍 / 👎 / ❤️ / 🎯)
// so it can't grow into emoji-soup; counts are aggregated locally and a
// real impl would feed back as a quality signal for fine-tuning.
export type ReactionKind = 'thumbsUp' | 'thumbsDown' | 'heart' | 'target';

// Block emitted when the user runs `/diff <ref>` in the composer.
// Renders a small preview card pointing at a branch/ref so the user can
// orient before sending follow-up questions about it.
export type DiffPreviewBlock = {
  kind: 'diff-preview';
  ref: string;
  base: string;
  added: number;
  removed: number;
  files: number;
  // 1-line summary the agent generates from the diff.
  summary: string;
};

export type CodingFileChange = {
  path: string;
  added: number;
  removed: number;
  hunks: CodingDiffHunk[];
  // Working-tree drift detection — see FileDrift below. Computed at
  // apply-time by comparing the diff's draft snapshot against the
  // current working tree. Pattern: 3-way merge from RCS (1980s).
  drift?: FileDrift;
};

export type FileDrift = {
  // 'clean'    → working tree unchanged since draft (apply is safe)
  // 'shifted'  → working tree changed but lines this diff touches are
  //              untouched. Apply is still safe; line numbers will be
  //              remapped automatically. This is the most common case
  //              after a few minutes.
  // 'overlap'  → working tree edited the *same* lines this diff
  //              touches. Apply will conflict → 3-way merge UI.
  // 'gone'     → file deleted in working tree since draft.
  state: 'clean' | 'shifted' | 'overlap' | 'gone';
  driftedHunkIdx?: number[];
  workingShaLastTouchedAtMs?: number;
  // Line ranges in the *new* file where conflicts will land. Lets the
  // FileRow draw amber stripes on the affected hunk lines.
  conflictRanges?: [number, number][];
};

export type ToolBlock = {
  kind: 'tool';
  // Each tool maps to a small icon + colour family in the renderer.
  tool: 'read' | 'edit' | 'run' | 'search' | 'plan' | 'web';
  label: string;
  detail?: string;
  // Optional terminal-style output that the user can expand.
  output?: string;
  status?: 'ok' | 'fail' | 'running';
  // For tool === 'run' (test runners), parsed test results so the UI
  // can link failures back to the hunks they cover. Pattern: Wallaby /
  // VS Code Test Explorer attribution scoring.
  testResults?: TestRun;
};

export type TestRun = {
  passed: number;
  failed: number;
  durationMs: number;
  failures: TestFailure[];
};

export type TestFailure = {
  name: string;
  file: string;
  message: string;
  // Stack frames pointing into changed files. The UI draws a line
  // from this failure card down to the hunk that owns that line.
  stackHits: { file: string; line: number; hunkId?: string }[];
  // Hunk ids attributed to this failure. Real impl runs coverage
  // before + diff overlay; the demo seeds these manually.
  attributedHunkIds: string[];
};

// `applied` distinguishes a *suggested* change (preview only, working
// tree is untouched) from an *applied* change (files have been written).
// 2026 agentic UX requires this to be unambiguous so the user knows
// whether reverting needs git or not.
export type DiffApplyState = 'suggested' | 'applied';

export type DiffBlock = {
  kind: 'diff';
  added: number;
  removed: number;
  files: CodingFileChange[];
  applied?: DiffApplyState;
};

export type TextBlock = { kind: 'text'; text: string };

export type ThinkingBlock = {
  kind: 'thinking';
  // Collapsed by default; lets us show the agent's "reasoning" without
  // dominating the thread.
  text: string;
  durationMs: number;
};

export type PlanItem = {
  id: string;
  text: string;
  done: boolean;
  // Agent's pre-execution self-estimate. 2026 plan UX (Devin/OpenHands)
  // expects each step to carry its own confidence + cost forecast so the
  // user can decide whether to autonomous-run or babysit. Both optional
  // — older fixtures and one-shot plans skip them.
  confidence?: number;       // 0..1
  estTokens?: number;        // total in+out estimate
  estSeconds?: number;       // wall-clock estimate
};
export type PlanBlock = {
  kind: 'plan';
  title: string;
  items: PlanItem[];
};

export type AgentBlock = ToolBlock | DiffBlock | TextBlock | ThinkingBlock | PlanBlock | DiffPreviewBlock;

export type UserTurn = {
  id: string;
  role: 'user';
  text: string;
  at: string;
  // Optional file/symbol mentions resolved at submit time.
  mentions?: { kind: 'file' | 'symbol'; label: string }[];
  // Auto-redacted secret/PII tokens. The original is *never* persisted
  // — `revealable` carries a one-shot decryption key so a Reveal-once
  // click can show the value briefly. Pattern: Bitwarden one-shot reveal.
  redactions?: { kind: string; placeholder: string; revealable?: string; range: [number, number] }[];
};

// What part of the agent loop is active right now. Surfaces in the
// streaming progress strip so the user knows *why* the spinner is
// spinning ("reading 3 files…" beats a generic "thinking…").
export type AgentPhase = 'thinking' | 'reading' | 'searching' | 'editing' | 'running' | 'planning' | 'writing';

// Citation: which file/region the agent leaned on for this turn. Lets
// the user verify claims without trusting the agent blindly. 2026 trust
// calibration baseline.
//
// `staleAfterTurn` is set when a *later* turn modifies the cited file
// — the citation is still attached to the agent's reasoning at the time,
// but the user should treat it as out-of-date for current decisions.
// Computed by the parent (CodingStage), not by the agent.
export type Citation = {
  path: string;
  // Optional inclusive line range. `[start, end]`.
  lines?: [number, number];
  // Short human-readable why ("definition of withSession", "test fixture").
  note?: string;
  staleAfterTurn?: number;
};

export type AgentTurn = {
  id: string;
  role: 'agent';
  at: string;
  blocks: AgentBlock[];
  streaming?: boolean;
  // Token usage exposed under the turn for SOTA "I used X tokens" feel.
  tokens?: { in: number; out: number };
  elapsed?: string;
  // Which model produced this turn. Needed so the user can sanity-check
  // cost / quality tradeoffs after the fact when they switch models.
  model?: string;
  // Current loop phase while `streaming` is true.
  phase?: AgentPhase;
  // Files/regions the agent referenced. Rendered as compact chips under
  // the turn header.
  citations?: Citation[];
  // User reactions to this turn. Local-only in the demo, but kept on the
  // turn so they survive task switches.
  reactions?: Partial<Record<ReactionKind, boolean>>;
  // Set when this turn is the inverse of an *earlier* turn (recovery
  // engine). Lets the timeline scrubber draw an arrow back to the
  // target so the audit trail is visually anchored.
  inverseOf?: string;
  // Per-phase wall-clock breakdown. Lets the LatencyCard render a tiny
  // stacked bar showing where the turn spent its time. Sums roughly to
  // `elapsed` (sums may diverge slightly because phases overlap).
  phaseDurationsMs?: Partial<Record<AgentPhase, number>>;
  // Agent's self-eval confidence on this turn's whole answer (0..1).
  // Distinct from PlanItem.confidence which is per-step. Real impl
  // would route the model's calibration probability through here; the
  // demo seeds plausible numbers.
  confidence?: number;
  // Optional rationale string that pairs with `confidence` — surfaces
  // in the hover tooltip so the user can see *why* the model thinks
  // it's likely right or wrong.
  confidenceRationale?: string;
  // Side-by-side companion turn id. When set, this turn ran the same
  // prompt on a different model in parallel; the renderer pairs them
  // visually so the user can compare outputs.
  sideBySideOf?: string;
};

export type Turn = UserTurn | AgentTurn;

export type Task = {
  id: string;
  projectId: string;
  title: string;
  branch: string;
  baseBranch: string;
  status: TaskStatus;
  pinned?: boolean;
  labels?: string[];
  timeAgo: string;
  diffStats: { added: number; removed: number; files: number };
  thread: Turn[];
  // Background execution surface. 'local' = browser-tab-tied (current);
  // 'cloud' = backend-tied, survives tab close. Pattern: GitHub Actions
  // / Vercel Build queue server-side run + WS reattach.
  execution?: TaskExecution;
  // GitHub-style PR + CI state, synced via polling/WebSocket. null
  // until the first sync resolves.
  branchState?: BranchState;
  prState?: PrState;
};

export type TaskExecution = {
  surface: 'local' | 'cloud';
  runId?: string;
  lastSyncAtMs?: number;
  notify?: 'browser' | 'email' | 'mobile' | 'silent';
};

export type BranchState = {
  ahead: number;
  behind: number;
  mergeable: 'clean' | 'dirty' | 'blocked' | 'unknown';
  lastPushAtMs?: number;
};

export type PrState = {
  number: number;
  url: string;
  status: 'draft' | 'open' | 'merged' | 'closed';
  reviewers: { handle: string; state: 'pending' | 'approved' | 'changes_requested' }[];
  checks: CiCheck[];
  conflicts: number;
  baseAhead: number;
};

export type CiCheck = {
  name: string;
  status: 'queued' | 'running' | 'success' | 'failure' | 'cancelled';
  durationMs?: number;
  url?: string;
};

// 3-tier budget — pattern from AWS Budget + K8s ResourceQuota.
//
//   alertUsd   ≈ 70%  — amber chip + inline banner, recommend downgrade
//   softCapUsd ≈ 95%  — block submit, force user choice (downgrade /
//                       override / stop). Like an ATM warning before
//                       overdraft.
//   hardCapUsd ≈ 130% — auto-stop in-flight stream gracefully (don't
//                       waste tokens already paid for; just block next
//                       turn). Drives a permanent "task locked" state
//                       until the user raises the cap.
//
// `policy` lets a real impl auto-downgrade the model at each tier; the
// demo just surfaces the choice via UI.
export type CostBudget = {
  alertUsd?: number;
  softCapUsd?: number;
  hardCapUsd?: number;
  policy?: {
    onAlert?:   'notify' | 'autodowngrade';
    onSoftCap?: 'block' | 'autodowngrade' | 'autoStop';
    onHardCap?: 'autoStop';
  };
};

export type Project = {
  id: string;
  name: string;
  budget?: CostBudget;
  // Path label shown muted under the name. Could be "github.com/acme/foo" etc.
  slug: string;
  // Single-letter glyph for the project chip when no logo is available.
  initial: string;
  // Branded accent — used for the chip background and the rail strip on hover.
  accent: 'emerald' | 'sky' | 'violet' | 'amber' | 'rose' | 'cyan';
  pinned?: boolean;
  // Default model the composer should pre-select when the user lands in
  // a task belonging to this project. Lets a heavyweight monorepo
  // default to opus while a copy-tweaks repo defaults to haiku.
  defaultModel?: string;
  // Connected MCP-style integrations. Surfaces in the ContextRail so
  // the user can see which external systems the agent can hand off to
  // for *this* project (Slack channel for review pings, Linear cycle
  // for tickets, etc.). Pure metadata; no calls happen in the demo.
  integrations?: Integration[];
};

export type Integration = {
  // Stable kind so the renderer can map it to an icon / colour family.
  // Adding a new integration means adding an icon in the renderer too.
  kind: 'slack' | 'linear' | 'jira' | 'github' | 'sentry' | 'figma';
  // What the integration is *bound to* in the external system. Free
  // text — `#eng-reviews`, `LIN-CYCLE-42`, `acme/billing`, etc.
  label: string;
  // True when the most recent ping/sync succeeded. Drives the dot tone.
  connected: boolean;
};
