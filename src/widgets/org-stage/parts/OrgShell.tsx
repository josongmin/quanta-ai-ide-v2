import { useRef, type ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { useScrollRestoration } from '@shared/lib';
import {
  Building2, Users, UsersRound, Shield, Lock, Plug, Webhook,
  KeySquare, ScrollText, Sparkles, ChevronRight,
  KeyRound, UserCog, ClipboardList, Globe, Archive,
  Mail, AtSign, Bot, BarChart3,
} from 'lucide-react';
import { useTheme } from '@shared/theme';

export type OrgPath =
  | '/org/$org/general' | '/org/$org/members' | '/org/$org/teams'
  | '/org/$org/roles' | '/org/$org/security' | '/org/$org/integrations'
  | '/org/$org/webhooks' | '/org/$org/api' | '/org/$org/policies'
  | '/org/$org/ai-policies'
  | '/org/$org/sso' | '/org/$org/scim' | '/org/$org/audit'
  | '/org/$org/data-residency' | '/org/$org/retention'
  | '/org/$org/invitations' | '/org/$org/domains'
  | '/org/$org/service-accounts' | '/org/$org/usage';

type NavItem = {
  path: OrgPath;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  planned?: boolean;
};
type NavGroup = { id: string; title: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    id: 'org',
    title: 'Organization',
    items: [
      { path: '/org/$org/general',          label: 'General',          icon: Building2 },
      { path: '/org/$org/members',          label: 'Members',          icon: Users },
      { path: '/org/$org/invitations',      label: 'Invitations',      icon: Mail },
      { path: '/org/$org/teams',            label: 'Teams',            icon: UsersRound },
      { path: '/org/$org/roles',            label: 'Roles',            icon: Shield },
      { path: '/org/$org/service-accounts', label: 'Service accounts', icon: Bot },
      { path: '/org/$org/domains',          label: 'Domains',          icon: AtSign },
      { path: '/org/$org/usage',            label: 'Usage',            icon: BarChart3 },
    ],
  },
  {
    id: 'access',
    title: 'Access & policy',
    items: [
      { path: '/org/$org/security',     label: 'Security',     icon: Lock },
      { path: '/org/$org/integrations', label: 'Integrations', icon: Plug },
      { path: '/org/$org/webhooks',     label: 'Webhooks',     icon: Webhook },
      { path: '/org/$org/api',          label: 'API & OAuth',  icon: KeySquare },
      { path: '/org/$org/policies',     label: 'Policies',     icon: ScrollText },
      { path: '/org/$org/ai-policies',  label: 'AI policies',  icon: Sparkles },
    ],
  },
  {
    id: 'compliance',
    title: 'Compliance',
    items: [
      { path: '/org/$org/sso',            label: 'SAML SSO',          icon: KeyRound },
      { path: '/org/$org/scim',           label: 'SCIM',              icon: UserCog },
      { path: '/org/$org/audit',          label: 'Audit log',         icon: ClipboardList },
      { path: '/org/$org/data-residency', label: 'Data residency',    icon: Globe },
      { path: '/org/$org/retention',      label: 'Retention',         icon: Archive },
    ],
  },
];

type Props = {
  orgName: string;
  orgSlug: string;
  title: string;
  subtitle?: string;
  topRight?: ReactNode;
  children: ReactNode;
};

// Mirrors MeShell. Renders inside the AppShell chrome (GNB tabs stay
// visible). 220px sticky sidebar + scrollable body. The sidebar lists
// every Organization-scoped surface; planned ones render as disabled.
export function OrgShell({ orgName, orgSlug, title, subtitle, topRight, children }: Props) {
  const { isDark } = useTheme();
  const scrollerRef = useRef<HTMLDivElement>(null);
  useScrollRestoration('org', scrollerRef);

  return (
    <div
      className="absolute inset-0 flex"
      style={{ background: isDark ? 'var(--bg-canvas)' : '#ffffff' }}
    >
      <Sidebar orgName={orgName} orgSlug={orgSlug} />

      <div ref={scrollerRef} className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-[920px] mx-auto px-10 pt-10 pb-32">
          <header className="flex items-end justify-between gap-4 mb-8">
            <div className="flex flex-col gap-1.5 min-w-0">
              <Breadcrumb orgName={orgName} pageTitle={title} />
              <h1
                className="text-[22px] font-semibold tracking-tight leading-tight"
                style={{ color: 'var(--fg-strong)' }}
              >
                {title}
              </h1>
              {subtitle && (
                <p className="text-[12px] leading-snug" style={{ color: 'var(--fg-muted)' }}>
                  {subtitle}
                </p>
              )}
            </div>
            {topRight && <div className="shrink-0">{topRight}</div>}
          </header>

          {children}
        </div>
      </div>
    </div>
  );
}

function Sidebar({ orgName, orgSlug }: { orgName: string; orgSlug: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside
      className="shrink-0 w-[220px] border-r overflow-y-auto"
      style={{ borderColor: 'var(--border-muted)' }}
    >
      <div className="px-4 py-6 flex flex-col gap-1">
        <div className="px-2 mb-3 flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-black"
            style={{
              backgroundImage: 'linear-gradient(to bottom right, var(--brand-vivid), var(--fg-link))',
              color: 'var(--bg-canvas)',
            }}
          >
            {orgName.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[12px] font-semibold truncate" style={{ color: 'var(--fg-strong)' }}>
              {orgName}
            </span>
            <span className="text-[10px] truncate" style={{ color: 'var(--fg-subtle)' }}>
              {orgSlug}
            </span>
          </div>
        </div>

        {NAV.map((group) => (
          <div key={group.id} className="flex flex-col gap-0.5 mb-3">
            <span
              className="px-2 mb-1 text-[9px] uppercase tracking-[0.14em] font-semibold"
              style={{ color: 'var(--fg-subtle)' }}
            >
              {group.title}
            </span>
            {group.items.map(({ path, label, icon: Icon, planned }) => {
              const active = pathname === resolvePath(path, orgSlug);
              if (planned) {
                return (
                  <div
                    key={path}
                    aria-disabled="true"
                    title="Planned"
                    className="flex items-center gap-2 px-2 h-7 rounded-md text-[12px] font-medium"
                    style={{ color: 'var(--fg-subtle)', opacity: 0.55, cursor: 'not-allowed' }}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate flex-1">{label}</span>
                    <span
                      className="text-[8px] uppercase tracking-[0.14em] font-semibold px-1 rounded"
                      style={{ background: 'var(--bg-surface-muted)', color: 'var(--fg-subtle)' }}
                    >
                      Soon
                    </span>
                  </div>
                );
              }
              return (
                <Link
                  key={path}
                  to={path as never}
                  params={{ org: orgSlug } as never}
                  className="flex items-center gap-2 px-2 h-7 rounded-md text-[12px] font-medium transition-colors"
                  style={{
                    background: active ? 'var(--bg-active)' : 'transparent',
                    color: active ? 'var(--fg-strong)' : 'var(--fg-muted)',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}

function resolvePath(template: string, orgSlug: string) {
  return template.replace('$org', orgSlug);
}

function Breadcrumb({ orgName, pageTitle }: { orgName: string; pageTitle: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 text-[11px]"
      style={{ color: 'var(--fg-subtle)' }}
    >
      <span>{orgName}</span>
      <ChevronRight className="w-3 h-3 opacity-60" />
      <span>Settings</span>
      <ChevronRight className="w-3 h-3 opacity-60" />
      <span style={{ color: 'var(--fg-default)' }}>{pageTitle}</span>
    </nav>
  );
}
