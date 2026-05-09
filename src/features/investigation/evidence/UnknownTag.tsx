import type { CSSProperties } from 'react';
import type { UnknownTag as UnknownTagType } from '@entities/investigation';

type Props = {
  tag: UnknownTagType;
  onClick?: (tag: UnknownTagType) => void;
};

// An honest "we don't know" marker. Warning-toned text on a neutral
// chrome background — never a stripe, never a banner. When `onClick` is
// provided the tag becomes a button so users can convert an unknown into a
// follow-up question without leaving the answer view.
export function UnknownTag({ tag, onClick }: Props) {
  const interactive = Boolean(onClick);
  const style: CSSProperties = {
    background: 'var(--bg-surface-muted)',
    color: 'var(--intent-warning-vivid)',
    border: '1px solid var(--border-default)',
    fontSize: '10px',
    lineHeight: 1.1,
    cursor: interactive ? 'pointer' : 'default',
  };
  const titleAttr = interactive
    ? `${tag.reason} — click to ask a follow-up`
    : tag.reason;

  if (interactive) {
    return (
      <button
        type="button"
        title={titleAttr}
        aria-label={`Resolve unknown: ${tag.label}`}
        style={style}
        onClick={() => onClick?.(tag)}
        className="inline-flex items-center px-1.5 py-0.5 rounded font-mono transition-colors hover:[background:var(--bg-hover)]"
      >
        {tag.label}
      </button>
    );
  }

  return (
    <span
      title={titleAttr}
      style={style}
      className="inline-flex items-center px-1.5 py-0.5 rounded font-mono"
    >
      {tag.label}
    </span>
  );
}
