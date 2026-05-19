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

// SectionHeader now lives in its own module — re-exported here so existing
// `import { SectionHeader } from '@shared/ui/GlassCard'` call sites keep
// working against the single shared implementation.
export { SectionHeader } from './SectionHeader';
