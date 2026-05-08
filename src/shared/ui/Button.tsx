import type { CSSProperties, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'destructive' | 'ghost';

type Props = {
  variant: Variant;
  size?: 'sm' | 'md';
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  leftIcon?: React.ComponentType<{ className?: string }>;
};

function variantStyle(variant: Variant): CSSProperties {
  switch (variant) {
    case 'primary':
      return {
        background: 'var(--fg-accent)',
        color: '#000',
        border: '1px solid transparent',
      };
    case 'secondary':
      return {
        background: 'var(--bg-surface-muted)',
        color: 'var(--fg-default)',
        border: '1px solid var(--border-default)',
      };
    case 'destructive':
      return {
        background: 'color-mix(in srgb, var(--intent-danger-vivid) 15%, transparent)',
        color: 'var(--intent-danger-vivid)',
        border: '1px solid var(--border-default)',
      };
    case 'ghost':
    default:
      return {
        background: 'transparent',
        color: 'var(--fg-default)',
        border: '1px solid transparent',
      };
  }
}

export function Button({
  variant,
  size = 'md',
  children,
  onClick,
  type = 'button',
  disabled,
  leftIcon: LeftIcon,
}: Props) {
  const sizeStyle: CSSProperties =
    size === 'sm'
      ? { padding: `var(--space-1) var(--space-2)`, fontSize: 'var(--fs-xs)' }
      : { padding: `var(--space-1-5) var(--space-3)`, fontSize: 'var(--fs-sm)' };

  const style: CSSProperties = {
    ...variantStyle(variant),
    ...sizeStyle,
    borderRadius: 'var(--radius-md)',
    fontWeight: 'var(--fw-bold)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'background-color 120ms ease, color 120ms ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-1-5)',
  };

  // Hover: ghost & secondary use bg-hover; primary darken via opacity; destructive deeper bg.
  const hoverClass =
    variant === 'ghost' || variant === 'secondary'
      ? 'hover:[background:var(--bg-hover)]'
      : '';

  return (
    <button
      type={type === 'submit' ? 'submit' : 'button'}
      onClick={onClick}
      disabled={disabled}
      style={style}
      className={`outline-none focus-visible:ring-2 ${hoverClass}`}
    >
      {LeftIcon && <LeftIcon className="w-3.5 h-3.5" />}
      {children}
    </button>
  );
}
