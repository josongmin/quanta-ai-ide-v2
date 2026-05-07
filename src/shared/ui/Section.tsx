import type { ReactNode } from 'react';

// Titled section block — eyebrow label + optional subtitle + thin separator.
// Theme-agnostic: leans on semantic tokens (`var(--fg-muted)` etc.) so it
// reads correctly in both dark and light without an `isDark` prop.
export function Section({
  title, subtitle, children,
  // `isDark` retained for call-site compatibility; styling is now token-driven.
  isDark: _isDark,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  isDark?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <div
          className="text-[9px] font-black uppercase tracking-[0.18em]"
          style={{ color: 'var(--fg-muted)' }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            className="text-[9px] font-mono"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {subtitle}
          </div>
        )}
        <div
          className="flex-1 h-px"
          style={{ background: 'var(--border-muted)' }}
        />
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
