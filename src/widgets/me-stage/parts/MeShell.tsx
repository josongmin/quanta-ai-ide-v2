import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import {
  User, AtSign, Lock, Plug, Key, Bell, Palette, SlidersHorizontal,
  Keyboard, Sparkles, Inbox, ChevronRight,
} from 'lucide-react';
import { SideNavShell, type SideNavGroup } from '@shared/ui';
import { env } from '@shared/config/env';
import { useSession } from '@entities/session';

export type MePath =
  | '/me/profile' | '/me/account' | '/me/security' | '/me/connected-apps'
  | '/me/api-tokens' | '/me/notifications' | '/me/appearance' | '/me/preferences'
  | '/me/keyboard' | '/me/ai' | '/me/inbox';

function useNav(): SideNavGroup<MePath>[] {
  const { t } = useTranslation('me');
  return [
    {
      id: 'identity',
      title: t('shell.nav.identity'),
      items: [
        { key: '/me/profile',  label: t('shell.nav.profile'),  icon: User },
        { key: '/me/account',  label: t('shell.nav.account'),  icon: AtSign },
        { key: '/me/security', label: t('shell.nav.security'), icon: Lock },
      ],
    },
    {
      id: 'access',
      title: t('shell.nav.access'),
      items: [
        { key: '/me/connected-apps', label: t('shell.nav.connectedApps'), icon: Plug },
        { key: '/me/api-tokens',     label: t('shell.nav.apiTokens'),     icon: Key },
      ],
    },
    {
      id: 'experience',
      title: t('shell.nav.experience'),
      items: [
        { key: '/me/notifications', label: t('shell.nav.notifications'), icon: Bell },
        { key: '/me/appearance',    label: t('shell.nav.appearance'),    icon: Palette },
        { key: '/me/preferences',   label: t('shell.nav.preferences'),   icon: SlidersHorizontal },
        { key: '/me/keyboard',      label: t('shell.nav.keyboard'),      icon: Keyboard },
        { key: '/me/ai',            label: t('shell.nav.ai'),            icon: Sparkles },
      ],
    },
    {
      id: 'streams',
      title: t('shell.nav.streams'),
      items: [
        { key: '/me/inbox', label: t('shell.nav.inbox'), icon: Inbox },
      ],
    },
  ];
}

type Props = {
  title: string;
  subtitle?: string;
  topRight?: ReactNode;
  children: ReactNode;
};

// MeShell renders inside the AppShell chrome (the GNB tabs at top stay
// visible). Uses the generic SideNavShell with /me/*-specific nav data
// and a "Sora Kim" identity card in the sidebar header.
export function MeShell({ title, subtitle, topRight, children }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname }) as MePath;
  const navigate = useNavigate();
  const nav = useNav();

  return (
    <SideNavShell<MePath>
      groups={nav}
      selectedKey={pathname}
      onSelect={(path) => { void navigate({ to: path as never }); }}
      title={title}
      {...(subtitle ? { subtitle } : {})}
      {...(topRight ? { topRight } : {})}
      sidebarHeader={<UserCard />}
      breadcrumb={<Breadcrumb pageTitle={title} />}
      scrollKey="me"
    >
      {children}
    </SideNavShell>
  );
}

// Real auth → the signed-in user; standalone demo → the seeded "Sora Kim".
function UserCard() {
  return env.useRealAuth ? <SessionUserCard /> : <StaticUserCard initials="SK" name="Sora Kim" email="sora@acme.com" />;
}

function SessionUserCard() {
  const { t } = useTranslation('me');
  const { user } = useSession();
  // Empty name → fall back to email, then a generic label (name may be '').
  const name = user?.name && user.name.trim().length > 0 ? user.name : (user?.email ?? t('shell.fallbackName'));
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = (parts.length >= 2 && parts[0] && parts[1])
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
  return <StaticUserCard initials={initials} name={name} email={user?.email ?? ''} />;
}

function StaticUserCard({ initials, name, email }: { initials: string; name: string; email: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
        style={{
          backgroundImage: 'linear-gradient(to bottom right, var(--fg-accent), var(--fg-link))',
          color: 'var(--bg-canvas)',
        }}
      >
        {initials}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-base font-semibold truncate" style={{ color: 'var(--fg-strong)' }}>
          {name}
        </span>
        <span className="text-xs truncate" style={{ color: 'var(--fg-subtle)' }}>
          {email}
        </span>
      </div>
    </div>
  );
}

function Breadcrumb({ pageTitle }: { pageTitle: string }) {
  const { t } = useTranslation('me');
  return (
    <nav
      aria-label={t('shell.breadcrumbAria')}
      className="flex items-center gap-1 text-sm"
      style={{ color: 'var(--fg-subtle)' }}
    >
      <span>{t('shell.breadcrumbRoot')}</span>
      <ChevronRight className="w-3 h-3 opacity-60" />
      <span style={{ color: 'var(--fg-default)' }}>{pageTitle}</span>
    </nav>
  );
}
