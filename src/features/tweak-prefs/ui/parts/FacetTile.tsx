import { Eye, EyeOff, Lock } from 'lucide-react';
import type { Facet } from '@entities/facet';

// A single facet toggle tile. Three visual states:
//   • locked     — disabled, plan badge on the right
//   • visible    — filled background, eye icon
//   • hidden     — outline only, eye-off icon
//
// The whole tile is the click target; mouse enters get a subtle lift via
// `transform: translateY(-1px)`. Source-of-truth tag (e.g. "tsc") parks
// in the right-side gutter so labels can truncate without colliding.

type Props = {
  facet: Facet;
  unlocked: boolean;
  hidden: boolean;
  onToggle: () => void;
  delayMs?: number;
};

export function FacetTile({ facet, unlocked, hidden, onToggle, delayMs = 0 }: Props) {
  const Icon = !unlocked ? Lock : hidden ? EyeOff : Eye;

  const stateBg = !unlocked
    ? 'rgba(0,0,0,0)'
    : hidden
      ? 'var(--bg-surface, rgba(0,0,0,0.02))'
      : 'var(--bg-surface-muted, rgba(0,0,0,0.06))';

  const stateBorder = !unlocked
    ? 'var(--border-muted, rgba(0,0,0,0.06))'
    : hidden
      ? 'var(--border-muted, rgba(0,0,0,0.08))'
      : 'var(--border-default, rgba(0,0,0,0.14))';

  const stateColor = !unlocked
    ? 'var(--fg-subtle)'
    : hidden
      ? 'var(--fg-muted)'
      : 'var(--fg-default)';

  return (
    <button
      type="button"
      disabled={!unlocked}
      onClick={onToggle}
      aria-pressed={!hidden}
      className="group facet-tile flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs border text-left outline-none disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[var(--fg-accent)]"
      style={{
        background: stateBg,
        borderColor: stateBorder,
        color: stateColor,
        animation: 'facet-tile-in 320ms cubic-bezier(0.22, 1, 0.36, 1) both',
        animationDelay: `${delayMs}ms`,
        transition: 'background 160ms ease-out, border-color 160ms ease-out, color 160ms ease-out, transform 160ms ease-out',
      }}
    >
      <Icon className="w-3 h-3 shrink-0 transition-transform group-hover:scale-110" />
      <span className="font-bold truncate flex-1 min-w-0">{facet.label}</span>
      {!unlocked ? (
        <span
          className="shrink-0 text-2xs uppercase font-black px-1.5 py-px rounded-md"
          style={{
            color: 'var(--fg-subtle)',
            background: 'var(--bg-surface-muted, rgba(0,0,0,0.04))',
          }}
        >
          {facet.requiredPlan}
        </span>
      ) : facet.source ? (
        <span
          className="shrink-0 text-2xs font-mono"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {facet.source}
        </span>
      ) : null}
    </button>
  );
}
