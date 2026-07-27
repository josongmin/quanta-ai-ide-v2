import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
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

// Nav skeleton with i18n keys; labels/titles are resolved per-render so the
// side nav re-localizes when the language changes.
type NavGroupDef = {
  id: string;
  titleKey: string;
  items: { key: OrgPath; labelKey: string; icon: SideNavGroup<OrgPath>['items'][number]['icon'] }[];
};

const NAV_DEF: NavGroupDef[] = [
  {
    id: 'org',
    titleKey: 'shell.nav.groupOrg',
    items: [
      { key: '/org/$org/general',          labelKey: 'shell.nav.general',         icon: Building2 },
      { key: '/org/$org/members',          labelKey: 'shell.nav.members',         icon: Users },
      { key: '/org/$org/invitations',      labelKey: 'shell.nav.invitations',     icon: Mail },
      { key: '/org/$org/teams',            labelKey: 'shell.nav.teams',           icon: UsersRound },
      { key: '/org/$org/roles',            labelKey: 'shell.nav.roles',           icon: Shield },
      { key: '/org/$org/service-accounts', labelKey: 'shell.nav.serviceAccounts', icon: Bot },
      { key: '/org/$org/domains',          labelKey: 'shell.nav.domains',         icon: AtSign },
      { key: '/org/$org/usage',            labelKey: 'shell.nav.usage',           icon: BarChart3 },
    ],
  },
  {
    id: 'access',
    titleKey: 'shell.nav.groupAccess',
    items: [
      { key: '/org/$org/security',     labelKey: 'shell.nav.security',     icon: Lock },
      { key: '/org/$org/integrations', labelKey: 'shell.nav.integrations', icon: Plug },
      { key: '/org/$org/webhooks',     labelKey: 'shell.nav.webhooks',     icon: Webhook },
      { key: '/org/$org/api',          labelKey: 'shell.nav.api',          icon: KeySquare },
      { key: '/org/$org/policies',     labelKey: 'shell.nav.policies',     icon: ScrollText },
      { key: '/org/$org/ai-policies',  labelKey: 'shell.nav.aiPolicies',   icon: Sparkles },
    ],
  },
  {
    id: 'compliance',
    titleKey: 'shell.nav.groupCompliance',
    items: [
      { key: '/org/$org/sso',            labelKey: 'shell.nav.sso',           icon: KeyRound },
      { key: '/org/$org/scim',           labelKey: 'shell.nav.scim',          icon: UserCog },
      { key: '/org/$org/audit',          labelKey: 'shell.nav.audit',         icon: ClipboardList },
      { key: '/org/$org/data-residency', labelKey: 'shell.nav.dataResidency', icon: Globe },
      { key: '/org/$org/retention',      labelKey: 'shell.nav.retention',     icon: Archive },
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
  const { t } = useTranslation('org');
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const visible = useTabVisibility();

  // The current route as a $org template, so it matches a NAV key.
  const selectedKey = pathname.replace(`/org/${orgSlug}`, '/org/$org') as OrgPath;

  const groups: SideNavGroup<OrgPath>[] = NAV_DEF.map((g) => ({
    id: g.id,
    title: t(g.titleKey),
    items: g.items.map((it) => ({ key: it.key, label: t(it.labelKey), icon: it.icon })),
  }));

  return (
    <SideNavShell<OrgPath>
      groups={groups}
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
  const { t } = useTranslation('org');
  return (
    <nav
      aria-label={t('shell.breadcrumbAria')}
      className="flex items-center gap-1 text-sm"
      style={{ color: 'var(--fg-subtle)' }}
    >
      <span>{orgName}</span>
      <ChevronRight className="w-3 h-3 opacity-60" />
      <span>{t('shell.settings')}</span>
      <ChevronRight className="w-3 h-3 opacity-60" />
      <span style={{ color: 'var(--fg-default)' }}>{pageTitle}</span>
    </nav>
  );
}
