import type { CSSProperties, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useTheme } from '@shared/theme';

export function V2Card({
  className = '',
  children,
  style,
}: {
  className?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const { isDark } = useTheme();
  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${className}`}
      style={{
        backgroundColor: 'var(--bg-overlay)',
        border: '1px solid var(--border-default)',
        ...(isDark ? {
          backdropFilter: 'blur(22px) saturate(160%)',
          WebkitBackdropFilter: 'blur(22px) saturate(160%)',
        } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SceneHeader({
  icon: Icon,
  title,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-[var(--fg-muted)]" />
      <span className="text-[11px] font-bold uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-muted)]">
        {title}
      </span>
      {hint !== undefined && (
        <span className="text-[10px] font-mono text-[var(--fg-subtle)] ml-auto">{hint}</span>
      )}
    </div>
  );
}
