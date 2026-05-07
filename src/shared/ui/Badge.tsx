import type { ReactNode } from 'react';

type Tone = 'neutral' | 'success' | 'warn' | 'danger' | 'info';

type Props = {
  children: ReactNode;
  tone?: Tone;
};

const TONE: Record<Tone, { fg: string; bg: string }> = {
  neutral: { fg: 'var(--fg-muted)',           bg: 'var(--bg-surface-muted)' },
  success: { fg: 'var(--intent-success-fg)', bg: 'var(--intent-success-bg)' },
  warn:    { fg: 'var(--intent-warn-fg)',    bg: 'var(--intent-warn-bg)' },
  danger:  { fg: 'var(--intent-danger-fg)',  bg: 'var(--intent-danger-bg)' },
  info:    { fg: 'var(--intent-info-fg)',    bg: 'var(--intent-info-bg)' },
};

export function Badge({ children, tone = 'neutral' }: Props) {
  const c = TONE[tone];
  return (
    <span
      style={{ color: c.fg, background: c.bg }}
      className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-[0.18em]"
    >
      {children}
    </span>
  );
}
