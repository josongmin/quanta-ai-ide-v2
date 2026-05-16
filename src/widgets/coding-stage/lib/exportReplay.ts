// Pure serializers for the "Replay as script" export. The modal calls
// these to produce a markdown transcript or a runnable bash script of
// `claude` CLI calls.  No React or DOM here on purpose — the goal is to
// keep the rendering decisions trivially diffable and unit-testable.
//
// We snapshot final state: streaming animation, partial blocks, and
// per-hunk decisions are flattened into a static record. The CLI script
// only emits *user* turns because agent turns are regenerated on replay.

import type {
  AgentBlock,
  AgentTurn,
  Project,
  Task,
  Turn,
  UserTurn,
} from '../parts/types';

const TODAY_ISO = '2026-05-09';

// Pretty model id like `claude-opus-4-7` → `opus 4.7`. Mirrors the helper
// inside BudgetSoftCapModal so the two surfaces read consistently.
function prettyModel(id: string | undefined): string {
  if (id == null || id.length === 0) return 'opus 4.7';
  return id.replace(/^claude-/, '').replace(/-(\d)/, ' $1').replace(/-/g, '.');
}

// Aggregate which models contributed to this thread, picking the most
// frequent for the header. If multiple models appear we say "mixed".
function summarizeModels(thread: Turn[]): string {
  const counts = new Map<string, number>();
  for (const tn of thread) {
    if (tn.role !== 'agent') continue;
    const m = prettyModel(tn.model);
    counts.set(m, (counts.get(m) ?? 0) + 1);
  }
  if (counts.size === 0) return 'opus 4.7';
  if (counts.size > 1) return 'mixed';
  // single entry
  return [...counts.keys()][0];
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function turnHeaderForAgent(turn: AgentTurn, idx: number): string {
  const model = prettyModel(turn.model);
  const elapsed = turn.elapsed ?? '?s';
  const tin = turn.tokens?.in ?? 0;
  const tout = turn.tokens?.out ?? 0;
  return `## Turn ${idx} — Agent (${model}, ${elapsed}, ${formatTokens(tin)} in / ${formatTokens(tout)} out)`;
}

function turnHeaderForUser(_turn: UserTurn, idx: number): string {
  return `## Turn ${idx} — You`;
}

function renderBlockMarkdown(block: AgentBlock): string {
  switch (block.kind) {
    case 'thinking': {
      // Italic blockquote so the reasoning visually recedes.
      const txt = block.text.trim().replace(/\n/g, '\n> ');
      return `> _${txt}_`;
    }
    case 'text':
      return block.text.trim();
    case 'tool': {
      const detail = block.detail != null && block.detail.length > 0 ? ` — ${block.detail}` : '';
      return `[${block.tool}] ${block.label}${detail}`;
    }
    case 'diff': {
      // Summary line + bullet list of files. Per-hunk content is omitted
      // — the markdown export is a transcript, not a patch file.
      const head = `[diff] ${block.added}+ / ${block.removed}-`;
      const files = block.files.map(
        (f) => `  - ${f.path} (+${f.added} / -${f.removed})`,
      );
      return [head, ...files].join('\n');
    }
    case 'plan': {
      const title = `[plan] ${block.title}`;
      const items = block.items.map(
        (it) => `  - [${it.done ? 'x' : ' '}] ${it.text}`,
      );
      return [title, ...items].join('\n');
    }
    case 'diff-preview':
      return `[diff-preview] ${block.ref} ← ${block.base} · ${block.added}+/${block.removed}- · ${block.summary}`;
    default: {
      // Exhaustiveness check; never executed at runtime if AgentBlock
      // remains a closed union.
      const _exhaustive: never = block;
      void _exhaustive;
      return '';
    }
  }
}

// Render one full turn (user or agent) as markdown.
function renderTurnMarkdown(turn: Turn, idx: number): string {
  if (turn.role === 'user') {
    const head = turnHeaderForUser(turn, idx);
    const body = turn.text
      .split('\n')
      .map((l) => `> ${l}`)
      .join('\n');
    return `${head}\n${body}`;
  }
  const head = turnHeaderForAgent(turn, idx);
  const body = turn.blocks
    .map((b) => renderBlockMarkdown(b))
    .filter((s) => s.length > 0)
    .join('\n\n');
  return `${head}\n\n${body}`;
}

export function toMarkdown(task: Task, project: Project): string {
  const model = summarizeModels(task.thread);
  const lines: string[] = [];
  lines.push(`# ${task.title}`);
  lines.push('');
  lines.push(`**Project**: ${project.name} (${project.slug})`);
  lines.push(`**Branch**: ${task.branch} ← ${task.baseBranch}`);
  lines.push(`**Model**: ${model}`);
  lines.push(`**Generated**: ${TODAY_ISO}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  task.thread.forEach((turn, i) => {
    lines.push(renderTurnMarkdown(turn, i + 1));
    lines.push('');
  });
  return lines.join('\n').replace(/\n+$/, '\n');
}

// Escape a user prompt for safe interpolation inside a double-quoted
// bash string. We swap " for \" and \ for \\ — sufficient for the demo,
// matches what `printf %q` would do for the common cases.
function bashQuote(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// Best-effort total cost: the demo tracks per-turn tokens but not USD,
// so we approximate using the rough opus blended rate ($15/M in,
// $75/M out). Good enough for a header comment.
function approxCost(thread: Turn[]): number {
  let inTok = 0;
  let outTok = 0;
  for (const tn of thread) {
    if (tn.role !== 'agent' || tn.tokens == null) continue;
    inTok += tn.tokens.in;
    outTok += tn.tokens.out;
  }
  return (inTok / 1_000_000) * 15 + (outTok / 1_000_000) * 75;
}

function modelIdForCli(turn: AgentTurn | undefined): string {
  // Default to opus when the demo turn doesn't carry a model id.
  return turn?.model ?? 'claude-opus-4-7';
}

export function toClaudeScript(task: Task, project: Project): string {
  const lines: string[] = [];
  const agentTurns = task.thread.filter((t): t is AgentTurn => t.role === 'agent');
  const model = summarizeModels(task.thread);
  const totalCost = approxCost(task.thread);
  lines.push('#!/usr/bin/env bash');
  lines.push(`# Replay of: ${task.title}`);
  lines.push(`# Project: ${project.name} (${project.slug})`);
  lines.push(`# Original branch: ${task.branch} ← ${task.baseBranch}`);
  lines.push(
    `# Generated ${TODAY_ISO}. ${model} used ${agentTurns.length} turns, $${totalCost.toFixed(2)} total.`,
  );
  lines.push('set -euo pipefail');
  lines.push('');
  // Walk the thread in order: emit a `claude` invocation for each user
  // turn, and a comment summarising the agent turn that immediately
  // followed (if any).
  let userIdx = 0;
  for (let i = 0; i < task.thread.length; i++) {
    const turn = task.thread[i];
    if (turn.role === 'user') {
      const next = task.thread[i + 1];
      const nextAgent = next?.role === 'agent' ? next : undefined;
      const cliModel = modelIdForCli(nextAgent);
      const prompt = bashQuote(turn.text.replace(/\n+/g, ' ').trim());
      lines.push(`claude --model ${cliModel} --print "${prompt}"`);
      userIdx += 1;
      if (nextAgent != null) {
        const tin = nextAgent.tokens?.in ?? 0;
        const tout = nextAgent.tokens?.out ?? 0;
        const turnCost
          = (tin / 1_000_000) * 15 + (tout / 1_000_000) * 75;
        lines.push(
          `# (agent reply ~${formatTokens(tin)} in / ${formatTokens(tout)} out, $${turnCost.toFixed(3)})`,
        );
      }
      lines.push('');
    }
  }
  // If we never saw a user turn (unlikely in the demo), still emit
  // something so the script isn't empty.
  if (userIdx === 0) {
    lines.push('# (no user turns in this task — nothing to replay)');
    lines.push('');
  }
  return lines.join('\n').replace(/\n+$/, '\n');
}
