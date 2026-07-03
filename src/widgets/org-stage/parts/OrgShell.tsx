import { type ReactNode } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { SideNavShell, type SideNavGroup } from '@shared/ui';
import { useTabVisibility } from '@features/workspace-tabs';
import {
  Building2, Users, UsersRound, Shield, Lock, Plug, Webhook,
  KeySquare, ScrollText, Sparkles, ChevronRight,
  KeyRound, UserCog, ClipboardList, Globe, Archive,
  Mail, AtSign, Bot, BarChart3,
} from 'lucide-react';

export type OrgPath =
  | '/org/$org/general' | '/org/$org/members' | '/org/$org/teams'
  | '/org/$org/roles' | '/org/$org/security' | '/org/$org/integrations'
  | '/org/$org/webhooks' | '/org/$org/api' | '/org/$org/policies'
  | '/org/$org/ai-policies'
  | '/org/$org/sso' | '/org/$org/scim' | '/org/$org/audit'
  | '/org/$org/data-residency' | '/org/$org/retention'
  | '/org/$org/invitations' | '/org/$org/domains'
  | '/org/$org/service-accounts' | '/org/$org/usage';

const NAV: SideNavGroup<OrgPath>[] = [
  {
    id: 'org',
    title: 'Organization',
    items: [
      { key: '/org/$org/general',          label: 'General',          icon: Building2 },
      { key: '/org/$org/members',          label: 'Members',          icon: Users },
      { key: '/org/$org/invitations',      label: 'Invitations',      icon: Mail },
      { key: '/org/$org/teams',            label: 'Teams',            icon: UsersRound },
      { key: '/org/$org/roles',            label: 'Roles',            icon: Shield },
      { key: '/org/$org/service-accounts', label: 'Service accounts', icon: Bot },
      { key: '/org/$org/domains',          label: 'Domains',          icon: AtSign },
      { key: '/org/$org/usage',            label: 'Usage',            icon: BarChart3 },
    ],
  },
  {
    id: 'access',
    title: 'Access & policy',
    items: [
      { key: '/org/$org/security',     label: 'Security',     icon: Lock },
      { key: '/org/$org/integrations', label: 'Integrations', icon: Plug },
      { key: '/org/$org/webhooks',     label: 'Webhooks',     icon: Webhook },
      { key: '/org/$org/api',          label: 'API & OAuth',  icon: KeySquare },
      { key: '/org/$org/policies',     label: 'Policies',     icon: ScrollText },
      { key: '/org/$org/ai-policies',  label: 'AI policies',  icon: Sparkles },
    ],
  },
  {
    id: 'compliance',
    title: 'Compliance',
    items: [
      { key: '/org/$org/sso',            label: 'SAML SSO',       icon: KeyRound },
      { key: '/org/$org/scim',           label: 'SCIM',           icon: UserCog },
      { key: '/org/$org/audit',          label: 'Audit log',      icon: ClipboardList },
      { key: '/org/$org/data-residency', label: 'Data residency', icon: Globe },
      { key: '/org/$org/retention',      label: 'Retention',      icon: Archive },
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
// visible). Adopts the shared SideNavShell with Organization-scoped nav
// data. Nav keys are $org route templates; onSelect resolves the slug and
// navigates. Selection matches the resolved current path.
export function OrgShell({ orgName, orgSlug, title, subtitle, topRight, children }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const visible = useTabVisibility();

  // The current route as a $org template, so it matches a NAV key.
  const selectedKey = pathname.replace(`/org/${orgSlug}`, '/org/$org') as OrgPath;

  return (
    <SideNavShell<OrgPath>
      groups={NAV}
      selectedKey={selectedKey}
      onSelect={(key) => {
        void navigate({ to: key as never, params: { org: orgSlug } as never });
      }}
      title={title}
      {...(subtitle ? { subtitle } : {})}
      {...(topRight ? { topRight } : {})}
      sidebarHeader={<OrgCard orgName={orgName} orgSlug={orgSlug} />}
      breadcrumb={<Breadcrumb orgName={orgName} pageTitle={title} />}
      scrollKey="org"
      visible={visible}
      contentMaxWidth={920}
    >
      {children}
    </SideNavShell>
  );
}

function OrgCard({ orgName, orgSlug }: { orgName: string; orgSlug: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-black"
        style={{
          backgroundImage: 'linear-gradient(to bottom right, var(--fg-accent), var(--fg-link))',
          color: 'var(--bg-canvas)',
        }}
      >
        {orgName.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-base font-semibold truncate" style={{ color: 'var(--fg-strong)' }}>
          {orgName}
        </span>
        <span className="text-xs truncate" style={{ color: 'var(--fg-subtle)' }}>
          {orgSlug}
        </span>
      </div>
    </div>
  );
}

function Breadcrumb({ orgName, pageTitle }: { orgName: string; pageTitle: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 text-sm"
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
