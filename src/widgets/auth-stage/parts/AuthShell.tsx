import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useTheme } from '@shared/theme';

type Props = {
  // Tight headline above the form. Sentence-case, no period.
  title: string;
  // One-line context under the title. Optional.
  subtitle?: string;
  // Footer affordance (e.g. "Already have an account? Sign in").
  footer?: ReactNode;
  // Top-right meta strip (e.g. "ACME, Inc." workspace hint on SSO redirect).
  topRight?: ReactNode;
  // Form / body. AuthShell handles the surrounding card, padding, and
  // brand chrome — the page only fills this slot.
  children: ReactNode;
};

// Single shared chrome for every /auth/* page. Centred narrow card on a
// neutral page background, brand wordmark top-left, optional meta top-right,
// footer below the card. Same tokens as the rest of the app so themes stay
// in sync, but with a tighter container — auth pages must read at a glance.
export function AuthShell({ title, subtitle, footer, topRight, children }: Props) {
  const { isDark } = useTheme();
  const pageBg = isDark ? 'var(--bg-canvas)' : 'var(--bg-surface)';

  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{ background: pageBg, color: 'var(--fg-default)' }}
    >
      <header className="flex items-center justify-between px-8 h-14 shrink-0">
        <BrandMark />
        {topRight && (
          <div className="text-sm" style={{ color: 'var(--fg-subtle)' }}>
            {topRight}
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
        <div className="w-full max-w-[380px] flex flex-col gap-7">
          <header className="flex flex-col gap-2">
            <h1
              className="text-3xl font-semibold tracking-tight leading-tight"
              style={{ color: 'var(--fg-strong)' }}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="text-base leading-snug" style={{ color: 'var(--fg-muted)' }}>
                {subtitle}
              </p>
            )}
          </header>

          {children}

          {footer && (
            <div
              className="pt-5 text-base flex items-center justify-center gap-1"
              style={{
                color: 'var(--fg-subtle)',
                borderTop: '1px solid var(--border-muted)',
              }}
            >
              {footer}
            </div>
          )}
        </div>
      </main>

      <footer
        className="px-8 h-12 shrink-0 flex items-center justify-between text-xs uppercase tracking-eyebrow"
        style={{ color: 'var(--fg-subtle)' }}
      >
        <span>© ACME, Inc.</span>
        <div className="flex items-center gap-5">
          <Link to={'/legal/terms' as never} className="hover:opacity-100" style={{ opacity: 0.85, color: 'inherit', letterSpacing: 'inherit' }}>Terms</Link>
          <Link to={'/legal/privacy' as never} className="hover:opacity-100" style={{ opacity: 0.85, color: 'inherit', letterSpacing: 'inherit' }}>Privacy</Link>
          <Link to={'/status' as never} className="hover:opacity-100" style={{ opacity: 0.85, color: 'inherit', letterSpacing: 'inherit' }}>Status</Link>
        </div>
      </footer>
    </div>
  );
}

function BrandMark() {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-black"
        style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
      >
        SE
      </div>
      <span
        className="text-base font-semibold tracking-tight"
        style={{ color: 'var(--fg-strong)' }}
      >
        se · field
      </span>
    </div>
  );
}
