// Domain types for the coding stage. Kept separate so the demo data
// fixture and the view can both import without a cycle.

export type TaskStatus = 'running' | 'review' | 'merged' | 'open' | 'failed';

// Renamed from `DiffHunk`/`FileChange` to avoid clashing with the PR
// entity's `DiffHunk`/`FileDiff` (different shape, different purpose: this
// pair models the agent's tool-call output, not a real PR diff).
export type CodingDiffHunk = {
  // unified-diff style hunk for the inline expander. Lines marked
  // 'add' / 'del' / 'ctx' for context. Nothing is parsed — just rendered.
  header: string;
  lines: { kind: 'add' | 'del' | 'ctx'; text: string }[];
};

export type CodingFileChange = {
  path: string;
  added: number;
  removed: number;
  hunks: CodingDiffHunk[];
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
};

export type DiffBlock = {
  kind: 'diff';
  added: number;
  removed: number;
  files: CodingFileChange[];
};

export type TextBlock = { kind: 'text'; text: string };

export type ThinkingBlock = {
  kind: 'thinking';
  // Collapsed by default; lets us show the agent's "reasoning" without
  // dominating the thread.
  text: string;
  durationMs: number;
};

export type PlanItem = { id: string; text: string; done: boolean };
export type PlanBlock = {
  kind: 'plan';
  title: string;
  items: PlanItem[];
};

export type AgentBlock = ToolBlock | DiffBlock | TextBlock | ThinkingBlock | PlanBlock;

export type UserTurn = {
  id: string;
  role: 'user';
  text: string;
  at: string;
  // Optional file/symbol mentions resolved at submit time.
  mentions?: { kind: 'file' | 'symbol'; label: string }[];
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
};

export type Project = {
  id: string;
  name: string;
  // Path label shown muted under the name. Could be "github.com/acme/foo" etc.
  slug: string;
  // Single-letter glyph for the project chip when no logo is available.
  initial: string;
  // Branded accent — used for the chip background and the rail strip on hover.
  accent: 'emerald' | 'sky' | 'violet' | 'amber' | 'rose' | 'cyan';
  pinned?: boolean;
};
