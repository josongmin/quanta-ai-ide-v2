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
  modified: '#7aa7d4',
  added:    '#5fa86c',
  removed:  '#c25a55',
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
        <Code2 className="w-3.5 h-3.5 text-white/55" strokeWidth={2} />
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
          Symbol changes
        </span>
        <span className="text-[10px] font-mono text-white/40">
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
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${onJump ? 'hover:bg-white/[0.04]' : ''}`}
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span
                  className="shrink-0 inline-flex items-center justify-center px-1.5 h-4 rounded-sm text-[9px] font-mono font-bold uppercase tracking-[0.10em]"
                  style={{ background: `${tone}22`, color: tone }}
                >
                  {CHANGE_LABEL[s.change]}
                </span>
                <span className="shrink-0 text-[9px] font-mono text-white/40 uppercase">
                  {KIND_ICON[s.kind]}
                </span>
                <span className="flex-1 min-w-0 text-[12px] font-mono truncate text-white/85">
                  {s.name}
                </span>
                <span className="shrink-0 text-[10px] font-mono text-white/35 truncate max-w-[160px]" title={s.filePath}>
                  {trimMid(s.filePath, 24)}
                </span>
              </Tag>
            </li>
          );
        })}
      </ul>
      {overflow > 0 && (
        <div className="mt-2 text-[10px] font-mono text-white/40">
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
