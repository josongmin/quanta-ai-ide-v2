import type { CSSProperties } from 'react';
import type { BundleStatus } from '@entities/investigation';

type Props = {
  status: BundleStatus;
  count: number;
};

// Pulsing dot + text. We deliberately avoid spinners because rotation
// animations on glass parents kill backdrop-filter (memory rule).
// `animate-pulse` only animates opacity, which is safe.
export function GatheringIndicator({ status, count }: Props) {
  if (status !== 'gathering' && status !== 'partial') return null;

  const text =
    status === 'gathering'
      ? 'Gathering evidence…'
      : `Partial: ${count} evidence found, still gathering…`;

  const dotStyle: CSSProperties = {
    width: 6,
    height: 6,
    background: 'var(--intent-success-vivid)',
    borderRadius: '999px',
    display: 'inline-block',
    flexShrink: 0,
  };

  return (
    <div
      className="flex items-center gap-2"
      style={{ color: 'var(--fg-muted)', fontSize: '11px' }}
      role="status"
      aria-live="polite"
    >
      <span className="animate-pulse" style={dotStyle} aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}
