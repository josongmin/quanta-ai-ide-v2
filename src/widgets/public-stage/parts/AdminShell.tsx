import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useTheme } from '@shared/theme';
import { Building2, Users, CreditCard, Activity, Database, Settings, ArrowUpRight } from 'lucide-react';

type Props = {
  active?: 'overview' | 'orgs' | 'users' | 'billing' | 'jobs' | 'data' | 'flags';
  children: ReactNode;
};

const NAV = [
  { id: 'overview' as const, label: 'Overview',         to: '/_admin',          icon: Activity   },
  { id: 'orgs'     as const, label: 'Organizations',   to: '/_admin#orgs',     icon: Building2  },
  { id: 'users'    as const, label: 'Users',           to: '/_admin#users',    icon: Users      },
  { id: 'billing'  as const, label: 'Billing ops',     to: '/_admin#billing',  icon: CreditCard },
  { id: 'jobs'     as const, label: 'Background jobs', to: '/_admin#jobs',     icon: Activity   },
  { id: 'data'     as const, label: 'Data tools',      to: '/_admin#data',     icon: Database   },
  { id: 'flags'    as const, label: 'Feature flags',   to: '/_admin#flags',    icon: Settings   },
];

// Super-admin internal chrome. Distinct from AppShell so it never gets
// confused with a customer-facing surface — red-tinged top strip + own
// sidebar make the "you are operating on real data" affordance impossible
// to miss.
export function AdminShell({ active = 'overview', children }: Props) {
  const { isDark } = useTheme();
  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{ background: isDark ? 'var(--bg-canvas)' : '#ffffff' }}
    >
      {/* Admin context strip — quiet, monochrome bar with a single pulsing
          dot as the only chromatic affordance. Still full-width so the
          "you are operating on real data" signal stays unmissable, but
          shed the loud danger-red fill + caps treatment. */}
      <div
        className="flex items-center justify-between gap-3 px-5 h-9 text-[11px] tabular-nums"
        style={{
          background: 'var(--bg-elevated)',
          color: 'var(--fg-muted)',
          borderBottom: '1px solid var(--border-muted)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <span className="relative inline-flex w-1.5 h-1.5">
            <span
              className="absolute inset-0 rounded-full opacity-60 animate-ping"
              style={{ background: 'var(--intent-danger-fg)' }}
            />
            <span
              className="relative w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--intent-danger-fg)' }}
            />
          </span>
          <span style={{ color: 'var(--fg-strong)' }}>Admin mode</span>
          <span style={{ color: 'var(--border-strong)' }}>·</span>
          <span>Acting as <span style={{ color: 'var(--fg-default)' }}>Sora Kim</span></span>
          <span style={{ color: 'var(--border-strong)' }}>·</span>
          <span className="font-mono text-[10px]">8m session</span>
        </div>
        <Link
          to="/intelligence"
          className="inline-flex items-center gap-1 px-2 h-6 rounded-md transition-colors hover-surface"
          style={{ color: 'var(--fg-default)' }}
        >
          Exit
          <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside
          className="shrink-0 w-[200px] overflow-y-auto"
          style={{ borderRight: '1px solid var(--border-muted)' }}
        >
          <div className="px-3 py-4 flex flex-col gap-0.5">
            <span
              className="px-2 mb-2 text-[9px] uppercase tracking-[0.14em] font-semibold"
              style={{ color: 'var(--fg-subtle)' }}
            >
              Admin
            </span>
            {NAV.map(({ id, label, to, icon: Icon }) => {
              const isActive = active === id;
              return (
                <Link
                  key={id}
                  to={to as never}
                  className="flex items-center gap-2 px-2 h-7 rounded-md text-[12px] font-medium transition-colors"
                  style={{
                    background: isActive ? 'var(--bg-active)' : 'transparent',
                    color: isActive ? 'var(--fg-strong)' : 'var(--fg-muted)',
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{label}</span>
                </Link>
              );
            })}
          </div>
        </aside>

        {/* Body */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-[1100px] mx-auto px-8 pt-8 pb-24">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
