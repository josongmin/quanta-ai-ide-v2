import type { CSSProperties, ReactNode } from 'react';

// Generic non-interactive status/label chip. For an interactive (toggleable /
// radio-like) chip reach for <Pill> instead.
//
// `variant` maps to the semantic intent token family so the chip auto-flips
// between themes. Two visual fills:
//   • 'outline' (default) — solid intent text on a transparent body with a
//     1px currentColor border. Reads as a label against the surface.
//   • 'soft'              — intent text on the low-contrast intent-*-bg fill.
//
// No coloured left stripes, no dark-grey "selected" fills — colour alone
// encodes the kind/severity, consistent with the rest of shared/ui.
type Variant = 'neutral' | 'success' | 'danger' | 'warn' | 'info';
export type BadgeVariant = Variant;
type Fill = 'outline' | 'soft';
type Size = 'sm' | 'md';

type Props = {
  children: ReactNode;
  variant?: Variant;
  fill?: Fill;
  size?: Size;
  className?: string;
  style?: CSSProperties;
};

const FG: Record<Variant, string> = {
  neutral: 'var(--fg-muted)',
  success: 'var(--intent-success-fg)',
  danger: 'var(--intent-danger-vivid)',
  warn: 'var(--intent-warn-vivid)',
  info: 'var(--intent-info-fg)',
};

const SOFT_BG: Record<Variant, string> = {
  neutral: 'var(--bg-surface-muted)',
  success: 'var(--intent-success-bg)',
  danger: 'var(--intent-danger-bg)',
  warn: 'var(--intent-warn-bg)',
  info: 'var(--intent-info-bg)',
};

export function Badge({
  children,
  variant = 'neutral',
  fill = 'outline',
  size = 'md',
  className = '',
  style,
}: Props) {
  const fg = FG[variant];
  const fontSize = size === 'sm' ? '8px' : '9px';

  const visual: CSSProperties =
    fill === 'soft'
      ? { color: fg, background: SOFT_BG[variant], borderColor: 'transparent' }
      : { color: fg, background: 'transparent', borderColor: 'currentColor' };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full border font-black uppercase tracking-eyebrow ${className}`}
      style={{ fontSize, ...visual, ...style }}
    >
      {children}
    </span>
  );
}
