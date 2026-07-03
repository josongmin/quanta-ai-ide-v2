// ─────────────────────────────────────────────────────────────────────────
// SymbolChangesCard — Sourcegraph/Cody-style "what symbols changed".
//
// Why a separate card: a 600-line PR may touch only 4 functions, but
// the reviewer doesn't know that until they've scrolled. Surfacing
// symbols up-front lets a reviewer pick "which function should I read
// first?" without committing to a full pass.
//
// Bands:
//   • modified  — neutral colour, highest review interest
//   • added     — emerald
//   • removed   — rose
//
// Empty-state suppression: when no symbols matched (e.g. JSON-only
// PRs) we don't render the card at all; an empty card is worse than
// a missing one because it implies a feature is broken.
// ─────────────────────────────────────────────────────────────────────────

import { Code2 } from 'lucide-react';
import type { SymbolChange } from '../lib/sota';
import V2Card from './V2Card';

const KIND_ICON: Record<SymbolChange['kind'], string> = {
  function: 'fn',
  class:    'cls',
  type:     'ty',
  const:    'C',
  export:   'ex',
};

const CHANGE_TONE: Record<SymbolChange['change'], string> = {
  modified: 'var(--fg-link)',
  added:    'var(--intent-success-fg)',
  removed:  'var(--intent-danger-fg)',
};

const CHANGE_LABEL: Record<SymbolChange['change'], string> = {
  modified: 'mod',
  added:    'new',
  removed:  'del',
};

export default function SymbolChangesCard({
  symbols, onJump,
}: {
  symbols: SymbolChange[];
  onJump?: (filePath: string) => void;
}) {
  if (symbols.length === 0) return null;

  // Cap at 12 — past that, the card stops being a "fast scan" and
  // becomes a list view. The Files section already covers the long tail.
  const visible = symbols.slice(0, 12);
  const overflow = symbols.length - visible.length;

  return (
    <V2Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Code2 className="w-3.5 h-3.5 text-[var(--fg-muted)]" strokeWidth={2} />
        <span className="text-sm font-bold uppercase tracking-eyebrow text-[var(--fg-muted)]">
          Symbol changes
        </span>
        <span className="text-xs font-mono text-[var(--fg-subtle)]">
          {symbols.length} {symbols.length === 1 ? 'symbol' : 'symbols'}
          {overflow > 0 ? ` · top ${String(visible.length)}` : ''}
        </span>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {visible.map((s, i) => {
          const tone = CHANGE_TONE[s.change];
          const Tag = onJump ? 'button' : 'div';
          return (
            <li key={`${s.filePath}::${s.name}::${String(i)}`}>
              <Tag
                {...(onJump ? { type: 'button' as const, onClick: () => { onJump(s.filePath); } } : {})}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${onJump ? 'hover:bg-[var(--bg-hover)]' : ''}`}
                style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--bg-elevated)' }}
              >
                <span
                  className="shrink-0 inline-flex items-center justify-center px-1.5 h-4 rounded-sm text-2xs font-mono font-bold uppercase tracking-eyebrow"
                  style={{ background: `color-mix(in srgb, ${tone} 13%, transparent)`, color: tone }}
                >
                  {CHANGE_LABEL[s.change]}
                </span>
                <span className="shrink-0 text-2xs font-mono text-[var(--fg-subtle)] uppercase">
                  {KIND_ICON[s.kind]}
                </span>
                <span className="flex-1 min-w-0 text-base font-mono truncate text-[var(--fg-default)]">
                  {s.name}
                </span>
                <span className="shrink-0 text-xs font-mono text-[var(--fg-subtle)] truncate max-w-[160px]" title={s.filePath}>
                  {trimMid(s.filePath, 24)}
                </span>
              </Tag>
            </li>
          );
        })}
      </ul>
      {overflow > 0 && (
        <div className="mt-2 text-xs font-mono text-[var(--fg-subtle)]">
          +{String(overflow)} more — open the Files section for the full list.
        </div>
      )}
    </V2Card>
  );
}

function trimMid(s: string, max: number): string {
  if (s.length <= max) return s;
  return `…${s.slice(-(max - 1))}`;
}
