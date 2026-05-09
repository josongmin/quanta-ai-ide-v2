import type { CSSProperties } from 'react';
import type { UnknownTag as UnknownTagType } from '@entities/investigation';

type Props = {
  tag: UnknownTagType;
};

// An honest "we don't know" marker. Warning-toned text on a neutral
// chrome background — never a stripe, never a banner.
export function UnknownTag({ tag }: Props) {
  const style: CSSProperties = {
    background: 'var(--bg-surface-muted)',
    color: 'var(--intent-warning-vivid)',
    border: '1px solid var(--border-default)',
    fontSize: '10px',
    lineHeight: 1.1,
  };
  return (
    <span
      title={tag.reason}
      style={style}
      className="inline-flex items-center px-1.5 py-0.5 rounded font-mono"
    >
      {tag.label}
    </span>
  );
}
