import type { Turn, AgentTurn, AgentBlock } from '../types';

// Per-turn metadata used by the enriched scrubber. The bare scrubber
// only had {role, id} to work with; this module distils the heavier
// AgentTurn payload into the small set of facts the dot/tooltip layer
// actually renders.
//
// Kept as a pure function so the dot layout is deterministic and the
// hover card can re-derive the same view without duplicating logic.

export type TurnStatus =
  | 'user'        // user prompt, no diff
  | 'planned'     // agent has a plan but no diffs yet
  | 'thinking'    // agent only emitted thinking/text/tool, no diffs
  | 'suggested'   // diffs proposed but not applied
  | 'applied'     // diffs were applied
  | 'rejected'    // any hunk in the turn was explicitly rejected
  | 'failed'      // tool block reports `status: 'fail'`
  | 'streaming';  // turn is still streaming

export type TurnMeta = {
  index: number;
  role: 'user' | 'agent';
  status: TurnStatus;
  // Aggregate diff impact for the turn (sum across all diff blocks).
  added: number;
  removed: number;
  files: string[];        // unique file paths touched
  // Cost surface — null when not applicable (e.g. user turns).
  tokensIn: number | null;
  tokensOut: number | null;
  elapsedMs: number | null;
  model: string | null;
  // For the "plan checkpoint" rendering — non-empty if the agent emitted
  // a Plan block in this turn.
  planTitle: string | null;
  // Short label used in the hover card title.
  shortTitle: string;
  // For inverse-op turns: the id of the *target* turn the inverse
  // refers to. The scrubber resolves this to a target index and draws
  // a curved arrow back so the audit trail is visually anchored.
  inverseOfId: string | null;
  // Per-turn self-eval confidence (0..1). Surfaces in the hover card
  // and as a subtle chip in the AgentTurnView header.
  confidence: number | null;
  // Per-phase wall-clock breakdown so the LatencyBar and baseline
  // comparison can reuse the same source of truth as the scrubber.
  phaseDurationsMs: Partial<Record<string, number>> | null;
};

export function turnMeta(turn: Turn, index: number): TurnMeta {
  if (turn.role === 'user') {
    return {
      index,
      role: 'user',
      status: 'user',
      added: 0,
      removed: 0,
      files: [],
      tokensIn: null,
      tokensOut: null,
      elapsedMs: null,
      model: null,
      planTitle: null,
      shortTitle: turn.text.length > 36 ? `${turn.text.slice(0, 35)}…` : turn.text,
      inverseOfId: null,
      confidence: null,
      phaseDurationsMs: null,
    };
  }

  const a = turn;
  const status = agentStatus(a);
  const { added, removed, files } = aggregateDiffs(a.blocks);
  const planTitle = findPlanTitle(a.blocks);
  const shortTitle = summarize(a, files, planTitle);

  return {
    index,
    role: 'agent',
    status,
    added,
    removed,
    files,
    tokensIn: a.tokens?.in ?? null,
    tokensOut: a.tokens?.out ?? null,
    elapsedMs: parseElapsed(a.elapsed),
    model: a.model ?? null,
    planTitle,
    shortTitle,
    inverseOfId: a.inverseOf ?? null,
    confidence: a.confidence ?? null,
    phaseDurationsMs: a.phaseDurationsMs ?? null,
  };
}

function agentStatus(a: AgentTurn): TurnStatus {
  if (a.streaming) return 'streaming';

  const hasFailure = a.blocks.some(
    (b): b is Extract<AgentBlock, { kind: 'tool' }> =>
      b.kind === 'tool' && b.status === 'fail',
  );
  if (hasFailure) return 'failed';

  let anyApplied = false;
  let anySuggested = false;
  let anyRejected = false;
  for (const block of a.blocks) {
    if (block.kind !== 'diff') continue;
    if (block.applied === 'applied') anyApplied = true;
    else anySuggested = true;
    for (const file of block.files) {
      for (const hunk of file.hunks) {
        if (hunk.decision === 'rejected') anyRejected = true;
      }
    }
  }
  if (anyRejected && !anyApplied) return 'rejected';
  if (anyApplied) return 'applied';
  if (anySuggested) return 'suggested';

  if (a.blocks.some((b) => b.kind === 'plan')) return 'planned';
  return 'thinking';
}

function aggregateDiffs(blocks: AgentBlock[]): {
  added: number; removed: number; files: string[];
} {
  let added = 0;
  let removed = 0;
  const set = new Set<string>();
  for (const b of blocks) {
    if (b.kind !== 'diff') continue;
    added += b.added;
    removed += b.removed;
    for (const f of b.files) set.add(f.path);
  }
  return { added, removed, files: Array.from(set) };
}

function findPlanTitle(blocks: AgentBlock[]): string | null {
  const plan = blocks.find((b) => b.kind === 'plan');
  if (plan?.kind !== 'plan') return null;
  return plan.title;
}

function summarize(a: AgentTurn, files: string[], planTitle: string | null): string {
  if (planTitle) return planTitle;
  if (files.length === 1) return files[0];
  if (files.length > 1) return `${files.length} files`;
  const text = a.blocks.find((b) => b.kind === 'text');
  if (text?.kind === 'text') {
    return text.text.length > 36 ? `${text.text.slice(0, 35)}…` : text.text;
  }
  return 'Agent turn';
}

// "7.4s" → 7400  ·  "120ms" → 120
function parseElapsed(s: string | undefined): number | null {
  if (!s) return null;
  const m = /^([\d.]+)\s*(ms|s)?$/.exec(s.trim());
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  return m[2] === 'ms' ? n : n * 1000;
}

// Costs (per million tokens, USD-ish) → cents for the turn.
// We don't have real billing in the demo; this just maps tokens to a
// monotonic "cost-ish" number so dot sizing stays meaningful.
const COST_IN_PER_MTOK = 3;
const COST_OUT_PER_MTOK = 15;

export function approxCost(meta: TurnMeta): number {
  if (meta.tokensIn === null && meta.tokensOut === null) return 0;
  const inCost = ((meta.tokensIn ?? 0) / 1_000_000) * COST_IN_PER_MTOK;
  const outCost = ((meta.tokensOut ?? 0) / 1_000_000) * COST_OUT_PER_MTOK;
  return inCost + outCost; // dollars
}

// ─── Inverse-op risk analysis ───────────────────────────────────────
// The Recovery-Engine model: clicking "Apply inverse" on turn N must
// not delete the timeline future. Instead it queues a *new* operation
// at the head that undoes the changes turn N introduced.
//
// Whether that's safe depends on whether any later turn touched the
// same files. If yes, the future change overlaps with what we want to
// remove — the inverse can't be applied cleanly without a review. We
// surface that as `risky`. Same-file overlap is conservative on purpose
// (real impl would compare hunk ranges); the demo benefits from the
// bias toward "ask before destroying."

export type InverseRisk = 'safe' | 'risky' | 'noop';

export function classifyInverse(
  metas: TurnMeta[],
  targetIdx: number,
): { risk: InverseRisk; overlappedFiles: string[] } {
  const target = metas[targetIdx];
  if (target?.role !== 'agent' || target.files.length === 0) {
    return { risk: 'noop', overlappedFiles: [] };
  }
  const overlapped = new Set<string>();
  for (let i = targetIdx + 1; i < metas.length; i++) {
    const later = metas[i];
    for (const f of later.files) {
      if (target.files.includes(f)) overlapped.add(f);
    }
  }
  if (overlapped.size === 0) return { risk: 'safe', overlappedFiles: [] };
  return { risk: 'risky', overlappedFiles: Array.from(overlapped) };
}
