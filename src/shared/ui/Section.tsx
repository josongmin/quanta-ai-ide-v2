import type { ReactNode } from 'react';

// Titled section block — eyebrow label + optional subtitle, sitting above
// a softly-tinted card body. The body fill is what gives each section a
// visible boundary in the panel; the header sits *outside* the card so the
// label still reads as a grouping eyebrow rather than a chrome bar.
//
// Tokens only — no `isDark` branching. Body uses a translucent surface tint
// that sits between the panel's glass face and the elevated chips inside,
// so sections read as their own surface without competing with the panel.
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
          className="text-[9px] font-black uppercase tracking-[0.18em]"
          style={{ color: 'var(--fg-muted)' }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            className="text-[9px] font-mono truncate"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {subtitle}
          </div>
        )}
      </div>
      <div
        className="rounded-lg border px-3 py-2.5 space-y-1"
        style={{
          background: 'var(--bg-surface-muted)',
          borderColor: 'var(--border-muted)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
