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
// approved signal. The 1px ring in surface colour keeps it readable
// regardless of which background it lands on.
export function ConfidenceDot({ confidence, size = 8, title }: Props) {
  const aria = title ?? `confidence: ${confidence}`;

  if (confidence === 'unknown') {
    const glyphStyle: CSSProperties = {
      width: size + 2,
      height: size + 2,
      color: 'var(--fg-subtle)',
      fontSize: Math.max(8, size),
      lineHeight: 1,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      fontWeight: 700,
    };
    return (
      <span
        role="img"
        aria-label={aria}
        title={aria}
        style={glyphStyle}
      >
        ?
      </span>
    );
  }

  const style: CSSProperties = {
    width: size,
    height: size,
    background: colorFor(confidence),
    borderRadius: '999px',
    display: 'inline-block',
    flexShrink: 0,
    boxShadow: '0 0 0 1px var(--bg-surface)',
  };
  return (
    <span
      role="img"
      aria-label={aria}
      title={aria}
      style={style}
    />
  );
}
