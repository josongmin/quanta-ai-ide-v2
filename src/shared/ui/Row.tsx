import type { CSSProperties, ReactNode } from 'react';

type Props = {
  leading?: ReactNode;
  children: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  selected?: boolean;
  dense?: boolean;
};

export function Row({
  leading,
  children,
  trailing,
  onClick,
  selected,
  dense,
}: Props) {
  const interactive = Boolean(onClick);
  const px = dense ? 'var(--space-1)' : 'var(--space-2)';
  const py = dense ? 'var(--space-0-5)' : 'var(--space-1)';

  const baseStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: `${py} ${px}`,
    borderRadius: 'var(--radius-md)',
    background: selected ? 'var(--bg-selected)' : 'transparent',
    color: 'var(--fg-default)',
    width: '100%',
    textAlign: 'left',
    border: 'none',
    transition: 'background-color 120ms ease',
  };

  const content = (
    <>
      {leading != null && <span className="shrink-0 inline-flex items-center">{leading}</span>}
      <span style={{ flex: 1, minWidth: 0 }}>{children}</span>
      {trailing != null && <span className="shrink-0 inline-flex items-center">{trailing}</span>}
    </>
  );

  if (interactive) {
    const buttonStyle: CSSProperties = { ...baseStyle, cursor: 'pointer' };
    return (
      <button
        type="button"
        onClick={onClick}
        style={buttonStyle}
        className={selected ? '' : 'hover:[background:var(--bg-hover)]'}
      >
        {content}
      </button>
    );
  }
  return <div style={baseStyle}>{content}</div>;
}
