import type { ReactNode } from 'react';
import { GlassCard } from './GlassCard';

// Titled section block — eyebrow label + optional subtitle, sitting above
// a GlassCard body. Same shared GlassCard the FilterBar uses, so a section
// inside InspectPanel/FocusScanPanel reads as the same surface as a
// FilterBar facet card. Header sits *outside* the card so the label still
// reads as a grouping eyebrow rather than a chrome bar.
export function Section({
  title, subtitle, children,
  isDark: _isDark,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  isDark?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2 px-0.5">
        <div
          className="text-2xs font-black uppercase tracking-eyebrow"
          style={{ color: 'var(--fg-muted)' }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            className="text-2xs font-mono truncate"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {subtitle}
          </div>
        )}
      </div>
      <GlassCard tone="inner" className="px-3 py-2.5 space-y-1">
        {children}
      </GlassCard>
    </div>
  );
}
