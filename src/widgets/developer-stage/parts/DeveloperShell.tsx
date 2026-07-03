import { type ReactNode } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import {
  BookOpen, PlayCircle, KeyRound, Webhook, Terminal, Package,
  ChevronRight, Sparkles,
} from 'lucide-react';
import { SideNavShell, type SideNavGroup } from '@shared/ui';
import { useTabVisibility } from '@features/workspace-tabs';

export type DevPath =
  | '/developers'
  | '/developers/api'
  | '/developers/playground'
  | '/developers/oauth-apps'
  | '/developers/webhooks'
  | '/developers/cli'
  | '/developers/sdks';

// Trailing hint rendered as the shared SideNavShell `badge` slot.
function hint(text: string) {
  return (
    <span
      className="text-xs truncate opacity-60"
      style={{ color: 'var(--fg-subtle)' }}
    >
      {text}
    </span>
  );
}

const NAV: SideNavGroup<DevPath>[] = [
  {
    id: 'reference',
    title: 'Reference',
    items: [
      { key: '/developers',            label: 'Overview',      icon: Sparkles,   badge: hint('Get started') },
      { key: '/developers/api',        label: 'API reference', icon: BookOpen,   badge: hint('REST + GraphQL') },
      { key: '/developers/playground', label: 'Playground',    icon: PlayCircle, badge: hint('Try requests live') },
    ],
  },
  {
    id: 'apps',
    title: 'Apps & delivery',
    items: [
      { key: '/developers/oauth-apps', label: 'OAuth apps', icon: KeyRound, badge: hint('Client IDs · secrets') },
      { key: '/developers/webhooks',   label: 'Webhooks',   icon: Webhook,  badge: hint('Delivery log · replay') },
    ],
  },
  {
    id: 'tooling',
    title: 'Tooling',
    items: [
      { key: '/developers/cli',  label: 'CLI',  icon: Terminal, badge: hint('Install · auth') },
      { key: '/developers/sdks', label: 'SDKs', icon: Package,  badge: hint('TS · Go · Python') },
    ],
  },
];

type Props = {
  title: string;
  subtitle?: string;
  topRight?: ReactNode;
  children: ReactNode;
};

// Developer platform surface. Adopts the shared SideNavShell with the
// inset-ring active treatment (navVariant='ring') and a slightly wider
// 232px rail. Renders inside the AppShell chrome (GNB tabs stay visible).
export function DeveloperShell({ title, subtitle, topRight, children }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname }) as DevPath;
  const navigate = useNavigate();
  const visible = useTabVisibility();

  return (
    <SideNavShell<DevPath>
      groups={NAV}
      selectedKey={pathname}
      onSelect={(key) => { void navigate({ to: key as never }); }}
      title={title}
      {...(subtitle ? { subtitle } : {})}
      {...(topRight ? { topRight } : {})}
      sidebarHeader={<PlatformCard />}
      breadcrumb={<Breadcrumb pageTitle={title} />}
      scrollKey="developers"
      visible={visible}
      contentMaxWidth={960}
      railWidth={232}
      navVariant="ring"
    >
      {children}
    </SideNavShell>
  );
}

function PlatformCard() {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center"
        style={{
          backgroundImage: 'linear-gradient(135deg, var(--fg-accent), var(--fg-link))',
          color: 'var(--bg-canvas)',
        }}
      >
        <Terminal className="w-4 h-4" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>
          Developer platform
        </span>
        <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
          API · CLI · SDKs
        </span>
      </div>
    </div>
  );
}

function Breadcrumb({ pageTitle }: { pageTitle: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 text-sm"
      style={{ color: 'var(--fg-subtle)' }}
    >
      <span>Developers</span>
      <ChevronRight className="w-3 h-3 opacity-60" />
      <span style={{ color: 'var(--fg-default)' }}>{pageTitle}</span>
    </nav>
  );
}
