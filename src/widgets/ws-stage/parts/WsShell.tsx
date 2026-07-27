import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { SideNavShell, type SideNavGroup } from '@shared/ui';
import { useTabVisibility } from '@features/workspace-tabs';
import {
  SlidersHorizontal, GitBranch, Users, ShieldCheck, Eye, Wrench,
  Bot, Lock, Layers, Webhook, Tag, Trash2, ChevronRight,
} from 'lucide-react';

export type WsPath =
  | '/$org/$ws/settings/general' | '/$org/$ws/settings/source' | '/$org/$ws/settings/ownership'
  | '/$org/$ws/settings/admission' | '/$org/$ws/settings/review' | '/$org/$ws/settings/fix'
  | '/$org/$ws/settings/agents' | '/$org/$ws/settings/secrets' | '/$org/$ws/settings/environments'
  | '/$org/$ws/settings/webhooks' | '/$org/$ws/settings/labels' | '/$org/$ws/settings/danger';

type TFn = (key: string) => string;

const buildNav = (t: TFn): SideNavGroup<WsPath>[] => [
  {
    id: 'core',
    title: t('nav.core'),
    items: [
      { key: '/$org/$ws/settings/general',  label: t('nav.general'),   icon: SlidersHorizontal },
      { key: '/$org/$ws/settings/source',   label: t('nav.source'),    icon: GitBranch },
      { key: '/$org/$ws/settings/ownership',label: t('nav.ownership'), icon: Users },
    ],
  },
  {
    id: 'pipeline',
    title: t('nav.pipeline'),
    items: [
      { key: '/$org/$ws/settings/admission', label: t('nav.admission'), icon: ShieldCheck },
      { key: '/$org/$ws/settings/review',    label: t('nav.review'),    icon: Eye },
      { key: '/$org/$ws/settings/fix',       label: t('nav.fix'),       icon: Wrench },
      { key: '/$org/$ws/settings/agents',    label: t('nav.agents'),    icon: Bot },
    ],
  },
  {
    id: 'infra',
    title: t('nav.infra'),
    items: [
      { key: '/$org/$ws/settings/secrets',     label: t('nav.secrets'),      icon: Lock },
      { key: '/$org/$ws/settings/environments',label: t('nav.environments'), icon: Layers },
      { key: '/$org/$ws/settings/webhooks',    label: t('nav.webhooks'),     icon: Webhook },
      { key: '/$org/$ws/settings/labels',      label: t('nav.labels'),       icon: Tag },
    ],
  },
  {
    id: 'risk',
    title: t('nav.risk'),
    items: [
      { key: '/$org/$ws/settings/danger', label: t('nav.danger'), icon: Trash2 },
    ],
  },
];

type Props = {
  orgName: string;
  orgSlug: string;
  wsName: string;
  wsSlug: string;
  title: string;
  subtitle?: string;
  topRight?: ReactNode;
  children: ReactNode;
};

// Mirrors OrgShell. Renders inside the AppShell chrome (GNB tabs stay
// visible). Adopts the shared SideNavShell with Workspace-scoped nav data.
// Nav keys are $org/$ws route templates; onSelect resolves both slugs and
// navigates. Selection matches the resolved current path.
export function WsShell({ orgName, orgSlug, wsName, wsSlug, title, subtitle, topRight, children }: Props) {
  const { t } = useTranslation('ws');
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const visible = useTabVisibility();

  // The current route as a $org/$ws template, so it matches a NAV key.
  const selectedKey = pathname
    .replace(`/${orgSlug}/${wsSlug}/`, '/$org/$ws/') as WsPath;

  return (
    <SideNavShell<WsPath>
      groups={buildNav(t)}
      selectedKey={selectedKey}
      onSelect={(key) => {
        void navigate({ to: key as never, params: { org: orgSlug, ws: wsSlug } as never });
      }}
      title={title}
      {...(subtitle ? { subtitle } : {})}
      {...(topRight ? { topRight } : {})}
      sidebarHeader={<WsCard orgSlug={orgSlug} wsName={wsName} wsSlug={wsSlug} />}
      breadcrumb={<Breadcrumb orgName={orgName} wsName={wsName} pageTitle={title} />}
      scrollKey="ws"
      visible={visible}
      contentMaxWidth={920}
    >
      {children}
    </SideNavShell>
  );
}

function WsCard({ orgSlug, wsName, wsSlug }: { orgSlug: string; wsName: string; wsSlug: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-black"
        style={{
          backgroundImage: 'linear-gradient(to bottom right, var(--fg-accent), var(--fg-link))',
          color: 'var(--bg-canvas)',
        }}
      >
        {wsName.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-base font-semibold truncate" style={{ color: 'var(--fg-strong)' }}>
          {wsName}
        </span>
        <span className="text-xs truncate" style={{ color: 'var(--fg-subtle)' }}>
          {orgSlug}/{wsSlug}
        </span>
      </div>
    </div>
  );
}

function Breadcrumb({
  orgName, wsName, pageTitle,
}: { orgName: string; wsName: string; pageTitle: string }) {
  const { t } = useTranslation('ws');
  return (
    <nav
      aria-label={t('shell.breadcrumbAria')}
      className="flex items-center gap-1 text-sm"
      style={{ color: 'var(--fg-subtle)' }}
    >
      <span>{orgName}</span>
      <ChevronRight className="w-3 h-3 opacity-60" />
      <span>{wsName}</span>
      <ChevronRight className="w-3 h-3 opacity-60" />
      <span>{t('shell.settings')}</span>
      <ChevronRight className="w-3 h-3 opacity-60" />
      <span style={{ color: 'var(--fg-default)' }}>{pageTitle}</span>
    </nav>
  );
}
