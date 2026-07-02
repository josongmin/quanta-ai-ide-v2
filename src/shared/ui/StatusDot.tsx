import type { CSSProperties } from 'react';

// Shared status-dot primitive. Consolidates the hand-rolled `rounded-full`
// status spans scattered across status pages, live feeds, channel cards, etc.
//
// A small filled circle that can optionally:
//   • `pulse`  → animate-pulse the core (soft breathing)
//   • `ping`   → render an animate-ping ring behind the core (radar sweep)
//
// Color comes from either an `intent` (maps to `--intent-*-fg` tokens) or a
// raw `color` escape hatch (for STATUS_FG-style custom values).

type Intent = 'success' | 'warn' | 'danger' | 'neutral' | 'info';

const INTENT_COLOR: Record<Intent, string> = {
  success: 'var(--intent-success-fg)',
  warn: 'var(--intent-warn-fg)',
  danger: 'var(--intent-danger-fg)',
  info: 'var(--intent-info-fg)',
  neutral: 'var(--fg-subtle)',
};

const SIZE: Record<'xs' | 'sm', string> = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
};

type Props = {
  /** Maps to an `--intent-*-fg` token. */
  intent?: Intent;
  /** Escape hatch for a custom color (e.g. STATUS_FG). Overrides `intent`. */
  color?: string;
  /** xs = 1.5, sm = 2. Defaults to xs. */
  size?: 'xs' | 'sm';
  /** Breathe the core via animate-pulse. */
  pulse?: boolean;
  /** Render an animate-ping ring behind the core. */
  ping?: boolean;
  className?: string;
};

export function StatusDot({
  intent = 'neutral', color, size = 'xs', pulse = false, ping = false, className = '',
}: Props) {
  const fill = color ?? INTENT_COLOR[intent];
  const dim = SIZE[size];
  const coreStyle: CSSProperties = { background: fill };

  if (ping) {
    return (
      <span className={`relative inline-flex ${dim} ${className}`}>
        <span
          aria-hidden
          className="absolute inset-0 rounded-full opacity-60 animate-ping"
          style={coreStyle}
        />
        <span
          className={`relative inline-flex ${dim} rounded-full ${pulse ? 'animate-pulse' : ''}`}
          style={coreStyle}
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-block ${dim} rounded-full shrink-0 ${pulse ? 'animate-pulse' : ''} ${className}`}
      style={coreStyle}
    />
  );
}
