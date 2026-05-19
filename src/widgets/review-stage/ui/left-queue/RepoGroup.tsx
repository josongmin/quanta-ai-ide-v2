import { ChevronDown, ChevronRight, Pin } from 'lucide-react';
import { repoBadgeColor } from './styling';

// ─────────────────────────────────────────────────────────────────────────
// 4. RepoGroup — collapsible header with count + pin
// ─────────────────────────────────────────────────────────────────────────

export function RepoGroup({
  name, count, pinned, collapsed, onToggleCollapsed, onTogglePin, children,
}: {
  name: string;
  count: number;
  pinned: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onTogglePin: () => void;
  children?: React.ReactNode;
}) {
  // Initial-letter avatar — first char, uppercased. Mirrors the
  // screenshot's "A / Q / E / P" leading badges. Colour is derived
  // from the repo name hash so it's stable across sessions and
  // shared with the row stripe — Tufte identity-hue consistency.
  const initial = (name[0] ?? '?').toUpperCase();
  const tone = repoBadgeColor(name);
  return (
    <section
      className="group/group"
      style={{ borderTop: '1px solid var(--border-muted)' }}
    >
      <header
        className="flex items-center gap-2 px-3 py-1.5"
        style={{ background: 'var(--bg-surface-muted)' }}
      >
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={`${name} 그룹 ${collapsed ? '펼치기' : '접기'}`}
          className="shrink-0 inline-flex items-center justify-center w-4 h-4 transition-colors"
          style={{ color: 'var(--fg-muted)' }}
        >
          {collapsed
            ? <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            : <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.5} />}
        </button>
        <span
          className="shrink-0 inline-flex items-center justify-center w-4 h-4 rounded text-[9px] font-mono font-bold"
          style={{
            background: tone.bg,
            color: tone.fg,
          }}
        >
          {initial}
        </span>
        <span
          className="text-base font-semibold truncate"
          style={{ color: 'var(--fg-default)' }}
        >
          {name}
        </span>
        <span
          className="text-[10px] font-mono tabular-nums"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {count}
        </span>
        <button
          type="button"
          onClick={onTogglePin}
          aria-label={pinned ? '그룹 핀 해제' : '그룹 핀 고정'}
          className={`ml-auto shrink-0 inline-flex items-center justify-center w-5 h-5 rounded transition-opacity ${
            pinned ? 'opacity-100' : 'opacity-0 group-hover/group:opacity-60 hover:opacity-100'
          }`}
          title={pinned ? '핀 해제' : '핀 고정'}
        >
          <Pin
            className="w-3 h-3"
            strokeWidth={2}
            style={pinned
              ? { color: 'var(--fg-accent)', fill: 'var(--fg-accent)' }
              : { color: 'var(--fg-muted)' }}
          />
        </button>
      </header>
      {children}
    </section>
  );
}
