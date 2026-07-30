import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shared/theme';
import { StatusDot } from '@shared/ui';
import { Building2, Users, CreditCard, Activity, Database, Settings, ArrowUpRight } from 'lucide-react';

type Props = {
  active?: 'overview' | 'orgs' | 'users' | 'billing' | 'jobs' | 'data' | 'flags';
  children: ReactNode;
};

const NAV = [
  { id: 'overview' as const, labelKey: 'shell.nav.overview', to: '/_admin',          icon: Activity   },
  { id: 'orgs'     as const, labelKey: 'shell.nav.orgs',     to: '/_admin#orgs',     icon: Building2  },
  { id: 'users'    as const, labelKey: 'shell.nav.users',    to: '/_admin#users',    icon: Users      },
  { id: 'billing'  as const, labelKey: 'shell.nav.billing',  to: '/_admin#billing',  icon: CreditCard },
  { id: 'jobs'     as const, labelKey: 'shell.nav.jobs',     to: '/_admin#jobs',     icon: Activity   },
  { id: 'data'     as const, labelKey: 'shell.nav.data',     to: '/_admin#data',     icon: Database   },
  { id: 'flags'    as const, labelKey: 'shell.nav.flags',    to: '/_admin#flags',    icon: Settings   },
];

// Super-admin internal chrome. Distinct from AppShell so it never gets
// confused with a customer-facing surface — red-tinged top strip + own
// sidebar make the "you are operating on real data" affordance impossible
// to miss.
export function AdminShell({ active = 'overview', children }: Props) {
  const { t } = useTranslation('admin');
  const { isDark } = useTheme();
  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{ background: isDark ? 'var(--bg-canvas)' : 'var(--bg-surface)' }}
    >
      {/* Admin context strip — quiet, monochrome bar with a single pulsing
          dot as the only chromatic affordance. Still full-width so the
          "you are operating on real data" signal stays unmissable, but
          shed the loud danger-red fill + caps treatment. */}
      <div
        className="flex items-center justify-between gap-3 px-5 h-9 text-sm tabular-nums"
        style={{
          background: 'var(--bg-elevated)',
          color: 'var(--fg-muted)',
          borderBottom: '1px solid var(--border-muted)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <StatusDot intent="danger" size="xs" ping />
          <span style={{ color: 'var(--fg-strong)' }}>{t('shell.adminMode')}</span>
          <span style={{ color: 'var(--border-strong)' }}>·</span>
          <span>{t('shell.actingAs')} <span style={{ color: 'var(--fg-default)' }}>{t('shell.actorName')}</span></span>
          <span style={{ color: 'var(--border-strong)' }}>·</span>
          <span className="font-mono text-xs">{t('shell.session')}</span>
        </div>
        <Link
          to="/intelligence"
          className="inline-flex items-center gap-1 px-2 h-6 rounded-md transition-colors hover-surface"
          style={{ color: 'var(--fg-default)' }}
        >
          {t('shell.exit')}
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
              className="px-2 mb-2 text-2xs uppercase tracking-eyebrow font-semibold"
              style={{ color: 'var(--fg-subtle)' }}
            >
              {t('shell.group')}
            </span>
            {NAV.map(({ id, labelKey, to, icon: Icon }) => {
              const isActive = active === id;
              return (
                <Link
                  key={id}
                  to={to as never}
                  className="flex items-center gap-2 px-2 h-7 rounded-md text-base font-medium transition-colors"
                  style={{
                    background: isActive ? 'var(--bg-active)' : 'transparent',
                    color: isActive ? 'var(--fg-strong)' : 'var(--fg-muted)',
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{t(labelKey)}</span>
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
