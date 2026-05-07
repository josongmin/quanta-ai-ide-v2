import type { CSSProperties, ReactNode } from 'react';

type Props = {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
};

export function Pill({ children, selected, onClick, size = 'md' }: Props) {
  const padding = size === 'sm' ? 'var(--pill-padding-compact)' : 'var(--pill-padding)';
  const fs = size === 'sm' ? 'var(--fs-2xs)' : 'var(--fs-xs)';

  const baseStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-1)',
    padding,
    borderRadius: 'var(--radius-pill)',
    fontSize: fs,
    fontWeight: 'var(--fw-bold)',
    background: selected ? 'var(--fg-strong)' : 'var(--bg-surface-muted)',
    color: selected ? 'var(--fg-on-accent)' : 'var(--fg-default)',
    transition: 'background-color 120ms ease, color 120ms ease',
    border: 'none',
  };

  if (onClick) {
    const interactiveStyle: CSSProperties = { ...baseStyle, cursor: 'pointer' };
    return (
      <button
        type="button"
        onClick={onClick}
        style={interactiveStyle}
        className={selected ? '' : 'hover:[background:var(--bg-hover)]'}
      >
        {children}
      </button>
    );
  }
  return <span style={baseStyle}>{children}</span>;
}
