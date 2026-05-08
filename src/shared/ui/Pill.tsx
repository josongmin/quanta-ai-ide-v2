import type { CSSProperties, ReactNode } from 'react';

type Tone = 'neutral' | 'accent';
type Size = 'sm' | 'md';

type Props = {
  children: ReactNode;
  selected?: boolean;
  onClick: () => void;
  tone?: Tone;
  size?: Size;
  disabled?: boolean;
};

// Interactive selectable. Toggleable / radio-like. For non-interactive labels
// reach for <Badge> instead.
export function Pill({
  children,
  selected = false,
  onClick,
  tone = 'neutral',
  size = 'md',
  disabled = false,
}: Props) {
  const fontSize = size === 'sm' ? '9px' : '10px';

  // Selected always wins regardless of tone — selection is the dominant signal.
  // Idle "accent" hints at the primary action without committing to selected look.
  const bg = selected
    ? 'var(--bg-active)'
    : tone === 'accent'
      ? 'var(--bg-surface-muted)'
      : 'var(--bg-surface-muted)';
  const fg = selected
    ? 'var(--fg-strong)'
    : tone === 'accent'
      ? 'var(--fg-default)'
      : 'var(--fg-muted)';

  const style: CSSProperties = {
    background: bg,
    color: fg,
    fontSize,
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={style}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-[0.18em] transition-colors ${
        selected || disabled ? '' : 'hover:[background:var(--bg-hover)]'
      }`}
    >
      {children}
    </button>
  );
}
