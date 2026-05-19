import { type ReactNode } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import {
  User, AtSign, Lock, Plug, Key, Bell, Palette, SlidersHorizontal,
  Keyboard, Sparkles, Inbox, ChevronRight,
} from 'lucide-react';
import { SideNavShell, type SideNavGroup } from '@shared/ui';

export type MePath =
  | '/me/profile' | '/me/account' | '/me/security' | '/me/connected-apps'
  | '/me/api-tokens' | '/me/notifications' | '/me/appearance' | '/me/preferences'
  | '/me/keyboard' | '/me/ai' | '/me/inbox';

const NAV: SideNavGroup<MePath>[] = [
  {
    id: 'identity',
    title: 'Identity',
    items: [
      { key: '/me/profile',  label: 'Profile',  icon: User },
      { key: '/me/account',  label: 'Account',  icon: AtSign },
      { key: '/me/security', label: 'Security', icon: Lock },
    ],
  },
  {
    id: 'access',
    title: 'Access & integrations',
    items: [
      { key: '/me/connected-apps', label: 'Connected apps', icon: Plug },
      { key: '/me/api-tokens',     label: 'API tokens',     icon: Key },
    ],
  },
  {
    id: 'experience',
    title: 'Experience',
    items: [
      { key: '/me/notifications', label: 'Notifications', icon: Bell },
      { key: '/me/appearance',    label: 'Appearance',    icon: Palette },
      { key: '/me/preferences',   label: 'Preferences',   icon: SlidersHorizontal },
      { key: '/me/keyboard',      label: 'Keyboard',      icon: Keyboard },
      { key: '/me/ai',            label: 'AI',            icon: Sparkles },
    ],
  },
  {
    id: 'streams',
    title: 'Streams',
    items: [
      { key: '/me/inbox', label: 'Inbox', icon: Inbox },
    ],
  },
];

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

  return (
    <SideNavShell<MePath>
      groups={NAV}
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

function UserCard() {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black"
        style={{
          backgroundImage: 'linear-gradient(to bottom right, var(--fg-accent), var(--fg-link))',
          color: 'var(--bg-canvas)',
        }}
      >
        SK
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[12px] font-semibold truncate" style={{ color: 'var(--fg-strong)' }}>
          Sora Kim
        </span>
        <span className="text-[10px] truncate" style={{ color: 'var(--fg-subtle)' }}>
          sora@acme.com
        </span>
      </div>
    </div>
  );
}

function Breadcrumb({ pageTitle }: { pageTitle: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 text-[11px]"
      style={{ color: 'var(--fg-subtle)' }}
    >
      <span>Personal</span>
      <ChevronRight className="w-3 h-3 opacity-60" />
      <span style={{ color: 'var(--fg-default)' }}>{pageTitle}</span>
    </nav>
  );
}
