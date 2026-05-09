import type { CSSProperties } from 'react';
import type { Confidence } from '@entities/investigation';

type Props = {
  confidence: Confidence;
  size?: number;
  title?: string;
};

function colorFor(c: Confidence): string {
  switch (c) {
    case 'high':
      return 'var(--intent-success-vivid)';
    case 'medium':
      return 'var(--intent-warning-vivid)';
    case 'low':
      return 'var(--intent-danger-vivid)';
    case 'unknown':
    default:
      return 'var(--fg-subtle)';
  }
}

// A tiny circle conveying confidence. Lives next to evidence chrome —
// confidence must NEVER be a left stripe (memory rule); a dot is the
// approved signal.
export function ConfidenceDot({ confidence, size = 6, title }: Props) {
  const style: CSSProperties = {
    width: size,
    height: size,
    background: colorFor(confidence),
    borderRadius: '999px',
    display: 'inline-block',
    flexShrink: 0,
  };
  return (
    <span
      role="img"
      aria-label={title ?? `confidence: ${confidence}`}
      title={title ?? `confidence: ${confidence}`}
      style={style}
    />
  );
}
