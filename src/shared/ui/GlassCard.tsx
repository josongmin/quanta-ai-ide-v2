import type { CSSProperties, ReactNode } from 'react';
import { useTheme } from '../theme/ThemeContext';

export function GlassCard({
  children, className = '', style, tone = 'default',
}: { children: ReactNode; className?: string; style?: CSSProperties; tone?: 'default' | 'inner' }) {
  // The `glass-dark` / `glass-light` CSS classes carry the theme-specific
  // blur + alpha — keep that classed selection. Text colour, border and
  // shadow now flow through semantic tokens so they auto-flip.
  const { isDark } = useTheme();
  const toneStyle: CSSProperties = tone === 'inner'
    ? {
        ['--glass-alpha-dark' as string]: '0.01',
        ['--glass-alpha-light' as string]: '1',
        ['--glass-border-dark' as string]: '0.045',
        ['--glass-border-light' as string]: '0.14',
      }
    : {};
  return (
    <div
      className={`border transition-colors duration-300 ${isDark ? 'glass-dark' : 'glass-light'} ${className}`}
      style={{
        ...toneStyle,
        color: 'var(--fg-default)',
        borderColor: 'var(--border-default)',
        boxShadow: tone === 'inner' ? 'none' : 'var(--shadow-lg)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  title, badge,
}: {
  title: string;
  badge?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-1.5 px-0.5">
      <h3
        className="text-[10px] font-black uppercase tracking-[0.18em]"
        style={{ color: 'var(--fg-muted)' }}
      >
        {title}
      </h3>
      {badge && (
        <span
          className="text-[8px] font-bold px-1.5 py-0.5 rounded-md border uppercase"
          style={{
            background: 'var(--bg-surface-muted)',
            color: 'var(--fg-subtle)',
            borderColor: 'var(--border-muted)',
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}
