import type { CSSProperties, ReactNode } from 'react';

type Variant = 'glass' | 'panel' | 'inset' | 'tile';
type Padding = 'none' | 'sm' | 'md' | 'lg';

type Props = {
  variant?: Variant;
  padding?: Padding;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

const PADDING_MAP: Record<Padding, string> = {
  none: '0',
  sm: 'var(--space-2)',
  md: 'var(--space-3)',
  lg: 'var(--space-4)',
};

function variantStyle(variant: Variant): CSSProperties {
  switch (variant) {
    case 'glass':
      return {
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-md)',
        backdropFilter: 'blur(var(--glass-blur, 12px))',
        WebkitBackdropFilter: 'blur(var(--glass-blur, 12px))',
        borderRadius: 'var(--radius-lg)',
      };
    case 'panel':
      return {
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-md)',
        borderRadius: 'var(--radius-lg)',
      };
    case 'inset':
      return {
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-muted)',
        borderRadius: 'var(--radius-md)',
      };
    case 'tile':
    default:
      return {
        border: '1px solid var(--border-muted)',
        borderRadius: 'var(--radius-md)',
      };
  }
}

export function Surface({
  variant = 'glass',
  padding = 'md',
  children,
  className,
  style,
}: Props) {
  const merged: CSSProperties = {
    ...variantStyle(variant),
    padding: PADDING_MAP[padding],
    ...style,
  };
  return (
    <div className={className} style={merged}>
      {children}
    </div>
  );
}
