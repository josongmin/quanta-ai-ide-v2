import type { ReactNode } from 'react';

import { useTheme } from '../theme';

type Tone = 'neutral' | 'success' | 'warn' | 'danger' | 'info' | 'muted';

type Props = {
  children: ReactNode;
  tone?: Tone;
  mono?: boolean;
  active?: boolean;
  onClick?: () => void;
  title?: string;
};

const TONE_VAR: Record<Tone, { fg: string; bg: string }> = {
  neutral: { fg: 'var(--fg-default)',       bg: 'var(--bg-surface-muted)' },
  success: { fg: 'var(--intent-success-fg)', bg: 'var(--intent-success-bg)' },
  warn:    { fg: 'var(--intent-warn-fg)',    bg: 'var(--intent-warn-bg)' },
  danger:  { fg: 'var(--intent-danger-fg)',  bg: 'var(--intent-danger-bg)' },
  info:    { fg: 'var(--intent-info-fg)',    bg: 'var(--intent-info-bg)' },
  muted:   { fg: 'var(--fg-subtle)',         bg: 'var(--bg-surface-muted)' },
};

export function Chip({ children, tone = 'neutral', mono, active, onClick, title }: Props) {
  const { isDark } = useTheme();
  const palette = TONE_VAR[tone];
  const isInteractive = Boolean(onClick);
  const Cmp: 'button' | 'span' = isInteractive ? 'button' : 'span';
  return (
    <Cmp
      type={isInteractive ? 'button' : undefined}
      title={title}
      onClick={onClick}
      style={{ color: palette.fg, background: palette.bg }}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] ${
        mono ? 'font-mono' : 'font-bold'
      } ${active ? (isDark ? 'ring-1 ring-white/40' : 'ring-1 ring-black/40') : ''} ${
        isInteractive ? 'cursor-pointer hover:opacity-90' : ''
      }`}
    >
      {children}
    </Cmp>
  );
}
