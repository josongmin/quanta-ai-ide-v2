import type { CSSProperties, ReactNode } from 'react';

type Tone = 'neutral' | 'success' | 'warn' | 'danger' | 'info';
type Size = 'sm' | 'md';

type Props = {
  children: ReactNode;
  tone?: Tone;
  mono?: boolean;
  size?: Size;
};

const TONE: Record<Tone, { fg: string; bg: string }> = {
  neutral: { fg: 'var(--fg-muted)',           bg: 'var(--bg-surface-muted)' },
  success: { fg: 'var(--intent-success-fg)', bg: 'var(--intent-success-bg)' },
  warn:    { fg: 'var(--intent-warn-fg)',    bg: 'var(--intent-warn-bg)' },
  danger:  { fg: 'var(--intent-danger-fg)',  bg: 'var(--intent-danger-bg)' },
  info:    { fg: 'var(--intent-info-fg)',    bg: 'var(--intent-info-bg)' },
};

// Read-only label for state, intent, or count. Non-interactive — if you need
// click-to-toggle, reach for <Pill> instead.
export function Badge({ children, tone = 'neutral', mono = false, size = 'md' }: Props) {
  const c = TONE[tone];
  const fontSize = size === 'sm' ? '9px' : '10px';
  const style: CSSProperties = { color: c.fg, background: c.bg, fontSize };
  return (
    <span
      style={style}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md uppercase tracking-[0.18em] ${
        mono ? 'font-mono' : 'font-bold'
      }`}
    >
      {children}
    </span>
  );
}
