// PR domain model. Strings-as-unions, never enums (project rule).
//
// The shape is intentionally close to GitHub's REST schema so future
// real-API wiring is a 1:1 mapping. Synthetic data (sample.ts) seeds the
// store; the rest of the surface treats it as if it came off the wire.

export type PrStatus =
  | 'draft'
  | 'open'
  | 'changes-requested'
  | 'approved'
  | 'merged'
  | 'closed';

export type CheckStatus = 'pending' | 'running' | 'success' | 'failure' | 'cancelled' | 'skipped';

export type ReviewerState = 'pending' | 'approved' | 'changes-requested' | 'commented';

export type ChangeKind = 'added' | 'modified' | 'deleted' | 'renamed';

export type ReviewVerdict = 'approve' | 'request-changes' | 'comment';

export type Person = {
  login: string;       // unique handle
  display: string;     // shown name
  initials: string;    // 1–2 chars for the avatar
  hue: number;         // 0..360 for the avatar background
};

export type CheckRun = {
  id: string;
  name: string;
  status: CheckStatus;
  required: boolean;
  durationMs: number | null;
  /** Short summary visible in the row; full log lives elsewhere. */
  summary: string | null;
};

export type Comment = {
  id: string;
  authorLogin: string;
  body: string;
  createdAt: string;        // ISO
  resolved: boolean;
};

/** Anchored conversation on a specific (file, line) pair. */
export type LineThread = {
  id: string;
  filePath: string;
  /** 1-based line number on the *new* side of the diff. */
  line: number;
  comments: Comment[];
  resolved: boolean;
};

/** PR-level conversation (general comments, review summaries). */
export type ConversationItem =
  | { kind: 'comment'; id: string; authorLogin: string; body: string; createdAt: string }
  | { kind: 'review';  id: string; authorLogin: string; verdict: ReviewVerdict; body: string; createdAt: string }
  | { kind: 'event';   id: string; eventType: 'commit' | 'review-requested' | 'status-change' | 'merged' | 'closed'; actorLogin: string; detail: string; createdAt: string };

/**
 * One file in a PR. We intentionally do NOT store the raw before/after
 * blob — it's synthesised on demand from a small `hunks` array so the
 * sample fixtures stay readable. Real wiring would replace `hunks` with
 * unified-diff text.
 */
export type DiffLine = {
  /** 'context' | 'add' | 'del'. */
  kind: 'context' | 'add' | 'del';
  /** New-side line number (null for deletions). */
  newNo: number | null;
  /** Old-side line number (null for additions). */
  oldNo: number | null;
  text: string;
};

export type DiffHunk = {
  oldStart: number;
  newStart: number;
  /** Header text shown above the hunk, e.g. "@@ -12,7 +12,9 @@ function foo()". */
  header: string;
  lines: DiffLine[];
};

export type FileDiff = {
  path: string;
  /** Pre-rename path when `kind === 'renamed'`. */
  oldPath: string | null;
  kind: ChangeKind;
  /** Convenience counters; redundant with `hunks` but expensive to recompute. */
  added: number;
  removed: number;
  /** True once the reviewer has marked the file as viewed. */
  viewed: boolean;
  /** Optional link back into the repo entity so static-analysis chips can
      render inline (cognitive complexity, edit safety, public API, etc.). */
  fileId: number | null;
  hunks: DiffHunk[];
};

export type PullRequest = {
  number: number;
  title: string;
  description: string;          // markdown-ish
  status: PrStatus;
  author: string;               // login
  reviewers: { login: string; state: ReviewerState }[];
  baseBranch: string;
  headBranch: string;
  repo: string;
  labels: string[];
  /** "Closes #123" style links. */
  linkedIssues: number[];
  createdAt: string;
  updatedAt: string;
  /** PR-level totals — derived from files but kept on the record for the rail. */
  added: number;
  removed: number;
  filesChangedCount: number;
  files: FileDiff[];
  checks: CheckRun[];
  /** PR-level conversation. Per-line threads live separately. */
  conversation: ConversationItem[];
  threads: LineThread[];
  /** Branch ahead/behind base. */
  ahead: number;
  behind: number;
  /** Pre-computed conflict flag. False = mergeable. */
  hasConflicts: boolean;
};
