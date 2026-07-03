import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useTheme } from '@shared/theme';

type Props = {
  // Highlight in the top nav so the active page reads as "you are here"
  active?: 'changelog' | 'help' | 'status' | 'pricing' | 'legal';
  // Width preset — most public pages cap content at 920–1100px; legal goes
  // narrower for readability. `bleed` lets the page own its own width
  // (heroes, full-width status sparkbars).
  width?: 'narrow' | 'wide' | 'bleed';
  children: ReactNode;
};

const NAV: { id: NonNullable<Props['active']>; label: string; to: string }[] = [
  { id: 'pricing',   label: 'Pricing',   to: '/pricing'    },
  { id: 'changelog', label: 'Changelog', to: '/changelog'  },
  { id: 'help',      label: 'Help',      to: '/help'       },
  { id: 'status',    label: 'Status',    to: '/status'     },
  { id: 'legal',     label: 'Legal',     to: '/legal/terms'},
];

// Marketing / public-doc chrome. No AppShell — these pages are linkable from
// outside the product, so they own the full viewport. Top nav + content +
// footer. No GNB tabs, no left sidebar.
export function PublicShell({ active, width = 'wide', children }: Props) {
  return (
    <div
      className="absolute inset-0 overflow-y-auto"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <TopNav active={active} />
      {width === 'bleed' ? (
        <main>{children}</main>
      ) : (
        <main className={`${width === 'narrow' ? 'max-w-[720px]' : 'max-w-[1080px]'} mx-auto px-8 pt-12 pb-24`}>
          {children}
        </main>
      )}
      <Footer />
    </div>
  );
}

function TopNav({ active }: { active?: Props['active'] }) {
  const { isDark } = useTheme();
  return (
    <header
      className={`sticky top-0 z-10 ${isDark ? 'backdrop-blur' : ''}`}
      style={{
        background: 'color-mix(in srgb, var(--bg-canvas) 78%, transparent)',
        borderBottom: '1px solid var(--border-muted)',
      }}
    >
      <div className="max-w-[1080px] mx-auto px-8 h-14 flex items-center justify-between">
        <Link
          to="/intelligence"
          className="flex items-center gap-2 font-semibold tracking-tight"
          style={{ color: 'var(--fg-strong)' }}
        >
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-black"
            style={{
              backgroundImage: 'linear-gradient(to bottom right, var(--fg-accent), var(--fg-link))',
              color: 'var(--bg-canvas)',
            }}
          >
            SE
          </div>
          <span className="text-lg">se.field</span>
        </Link>
        <nav className="flex items-center gap-1">
          {NAV.map((n) => {
            const isActive = active === n.id;
            return (
              <Link
                key={n.id}
                to={n.to as never}
                params={{} as never}
                className="h-8 px-3 rounded-md text-base font-medium transition-colors inline-flex items-center"
                style={{
                  color: isActive ? 'var(--fg-strong)' : 'var(--fg-muted)',
                  background: isActive ? 'var(--bg-active)' : 'transparent',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                {n.label}
              </Link>
            );
          })}
          <div className="w-px h-5 mx-2" style={{ background: 'var(--border-muted)' }} />
          <Link
            to={'/auth/login' as never}
            className="h-8 px-3 rounded-md text-base font-medium inline-flex items-center"
            style={{ color: 'var(--fg-default)' }}
          >
            Sign in
          </Link>
          <Link
            to={'/auth/signup' as never}
            className="h-8 px-3 rounded-md text-base font-semibold inline-flex items-center"
            style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
          >
            Get started
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer
      className="mt-auto"
      style={{ borderTop: '1px solid var(--border-muted)' }}
    >
      <div className="max-w-[1080px] mx-auto px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm"
        style={{ color: 'var(--fg-subtle)' }}
      >
        <span>© 2026 ACME, Inc. · Engineered in Seoul · San Francisco · Berlin</span>
        <div className="flex items-center gap-4">
          <Link to={'/legal/terms' as never} className="hover:underline" style={{ color: 'var(--fg-muted)' }}>Terms</Link>
          <Link to={'/legal/privacy' as never} className="hover:underline" style={{ color: 'var(--fg-muted)' }}>Privacy</Link>
          <Link to={'/legal/dpa' as never} className="hover:underline" style={{ color: 'var(--fg-muted)' }}>DPA</Link>
          <Link to={'/legal/subprocessors' as never} className="hover:underline" style={{ color: 'var(--fg-muted)' }}>Subprocessors</Link>
          <Link to={'/status' as never} className="hover:underline" style={{ color: 'var(--fg-muted)' }}>Status</Link>
        </div>
      </div>
    </footer>
  );
}
