import type { LucideIcon } from 'lucide-react';
import {
  Compass, Feather, FlaskConical, Hammer, Scale, Shield, Wand2,
} from 'lucide-react';
import type { AgentMode, AgentRule, Task } from '../types';

export type TranslateFn = (k: string, opts?: Record<string, unknown>) => string;
export type Tab = 'modes' | 'rules' | 'workflows' | 'painpoints' | 'marketplace';

// ─── Pain-point harvesting ───────────────────────────────────────────────
// Walk every task's thread and collect agent turns that received a
// thumbs-down. The user already has these via toggleReaction; we just
// surface them in one place so they can be turned into rules.
export type PainPoint = {
  taskId: string;
  taskTitle: string;
  turnId: string;
  preview: string;        // first ~120 chars of agent text
  filesTouched: string[]; // edit/diff paths in the turn
  at: string;
};

export function collectPainPoints(tasks: Task[]): PainPoint[] {
  const out: PainPoint[] = [];
  for (const task of tasks) {
    for (const turn of task.thread) {
      if (turn.role !== 'agent') continue;
      const downvoted = turn.reactions?.thumbsDown === true;
      if (!downvoted) continue;
      const firstText = turn.blocks.find((b) => b.kind === 'text');
      const rawText = firstText?.kind === 'text' ? firstText.text : '(no text in turn)';
      const preview = rawText.length > 120
        ? `${rawText.slice(0, 120).trimEnd()}…`
        : rawText;
      const files = new Set<string>();
      for (const b of turn.blocks) {
        if (b.kind === 'tool' && (b.tool === 'edit' || b.tool === 'read')) files.add(b.label);
        if (b.kind === 'diff') for (const f of b.files) files.add(f.path);
      }
      out.push({
        taskId: task.id,
        taskTitle: task.title,
        turnId: turn.id,
        preview,
        filesTouched: [...files],
        at: turn.at,
      });
    }
  }
  return out;
}

export const MODE_ICON: Record<AgentMode['icon'], LucideIcon> = {
  wand: Wand2,
  shield: Shield,
  scale: Scale,
  flask: FlaskConical,
  compass: Compass,
  hammer: Hammer,
  feather: Feather,
};

export const ALL_TOOLS: AgentMode['allowedTools'] = ['read', 'edit', 'run', 'search', 'plan', 'web'];

export const ACCENT_HEX: Record<AgentMode['accent'], string> = {
  emerald: '#34d399',
  sky: '#38bdf8',
  violet: '#a78bfa',
  amber: '#fbbf24',
  rose: '#fb7185',
  cyan: '#22d3ee',
};

export const SOURCE_BADGE: Record<AgentRule['source'], { label: string; tone: 'neutral' | 'amber' | 'violet' | 'sky' }> = {
  'authored':     { label: 'authored',     tone: 'neutral' },
  'pain-point':   { label: 'pain-point',   tone: 'amber' },
  'diff-pattern': { label: 'diff',         tone: 'violet' },
  'marketplace':  { label: 'market',       tone: 'sky' },
};
