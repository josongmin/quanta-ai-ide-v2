import type { CSSProperties } from 'react';
import type { Staleness } from '@entities/investigation';

type Props = {
  staleness: Staleness;
};

// Tiny inline staleness label. Background uses surface-muted so the pill
// reads as chrome rather than a state banner; foreground colour carries
// the signal.
export function StalenessPill({ staleness }: Props) {
  let label: string;
  let color: string;
  switch (staleness) {
    case 'fresh':
      label = 'fresh';
      color = 'var(--intent-success-vivid)';
      break;
    case 'stale':
      label = 'stale';
      color = 'var(--intent-warning-vivid)';
      break;
    case 'unknown':
    default:
      label = '?';
      color = 'var(--fg-subtle)';
      break;
  }
  const style: CSSProperties = {
    background: 'var(--bg-surface-muted)',
    color,
    fontSize: '9px',
    lineHeight: 1,
  };
  return (
    <span
      style={style}
      className="inline-flex items-center px-1.5 py-0.5 rounded font-mono uppercase tracking-wider"
    >
      {label}
    </span>
  );
}
