import type { CSSProperties } from 'react';

type Tone = 'muted' | 'accent' | 'danger';

type Props = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  size?: 'sm' | 'md';
  tone?: Tone;
  disabled?: boolean;
};

const TONE_COLOR: Record<Tone, string> = {
  muted: 'var(--fg-muted)',
  accent: 'var(--fg-accent)',
  danger: 'var(--intent-danger-vivid)',
};

export function IconButton({
  icon: Icon,
  label,
  onClick,
  size = 'md',
  tone = 'muted',
  disabled,
}: Props) {
  const dim = size === 'sm' ? 28 : 32;
  const iconClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  const style: CSSProperties = {
    width: dim,
    height: dim,
    color: TONE_COLOR[tone],
    borderRadius: 'var(--radius-md)',
    background: 'transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'background-color 120ms ease, color 120ms ease',
  };

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      style={style}
      className="inline-flex items-center justify-center shrink-0 outline-none focus-visible:ring-2 hover:[background:var(--bg-hover)]"
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = `0 0 0 2px var(--border-focus)`;
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <Icon className={iconClass} />
    </button>
  );
}
