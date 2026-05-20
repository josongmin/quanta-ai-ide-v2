import { type ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import {
  BookOpen, PlayCircle, KeyRound, Webhook, Terminal, Package,
  ChevronRight, Sparkles,
} from 'lucide-react';
import { useTheme } from '@shared/theme';
import { ScrollPane } from '@shared/ui';
import { useTabVisibility } from '@features/workspace-tabs';

export type DevPath =
  | '/developers'
  | '/developers/api'
  | '/developers/playground'
  | '/developers/oauth-apps'
  | '/developers/webhooks'
  | '/developers/cli'
  | '/developers/sdks';

type NavItem = { path: DevPath; label: string; icon: React.ComponentType<{ className?: string }>; hint?: string };
type NavGroup = { id: string; title: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    id: 'reference',
    title: 'Reference',
    items: [
      { path: '/developers',           label: 'Overview',     icon: Sparkles,  hint: 'Get started' },
      { path: '/developers/api',       label: 'API reference', icon: BookOpen, hint: 'REST + GraphQL' },
      { path: '/developers/playground',label: 'Playground',    icon: PlayCircle, hint: 'Try requests live' },
    ],
  },
  {
    id: 'apps',
    title: 'Apps & delivery',
    items: [
      { path: '/developers/oauth-apps', label: 'OAuth apps', icon: KeyRound, hint: 'Client IDs · secrets' },
      { path: '/developers/webhooks',   label: 'Webhooks',   icon: Webhook,  hint: 'Delivery log · replay' },
    ],
  },
  {
    id: 'tooling',
    title: 'Tooling',
    items: [
      { path: '/developers/cli',  label: 'CLI',  icon: Terminal, hint: 'Install · auth' },
      { path: '/developers/sdks', label: 'SDKs', icon: Package,  hint: 'TS · Go · Python' },
    ],
  },
];

type Props = {
  title: string;
  subtitle?: string;
  topRight?: ReactNode;
  children: ReactNode;
  // bleed = no body padding (for code-heavy pages like Playground)
  bleed?: boolean;
};

export function DeveloperShell({ title, subtitle, topRight, children, bleed }: Props) {
  const { isDark } = useTheme();
  const visible = useTabVisibility();

  return (
    <div
      className="absolute inset-0 flex"
      style={{ background: isDark ? 'var(--bg-canvas)' : 'var(--bg-surface)' }}
    >
      <Sidebar />

      <ScrollPane scope="developers" visible={visible} className="flex-1 min-w-0 overflow-y-auto">
        <div className={bleed ? 'px-0' : 'max-w-[960px] mx-auto px-10 pt-10 pb-32'}>
          {!bleed && (
            <header className="flex items-end justify-between gap-4 mb-8">
              <div className="flex flex-col gap-1.5 min-w-0">
                <Breadcrumb pageTitle={title} />
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
          )}

          {children}
        </div>
      </ScrollPane>
    </div>
  );
}

function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside
      className="shrink-0 w-[232px] border-r overflow-y-auto"
      style={{ borderColor: 'var(--border-muted)' }}
    >
      <div className="px-4 py-6 flex flex-col gap-1">
        <div className="px-2 mb-4 flex items-center gap-2">
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
            <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
              Developer platform
            </span>
            <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
              API · CLI · SDKs
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
            {group.items.map(({ path, label, icon: Icon, hint }) => {
              const active = pathname === path;
              return (
                <Link
                  key={path}
                  to={path as never}
                  className="flex items-center gap-2 px-2 h-8 rounded-md text-[12px] font-medium transition-colors group"
                  style={{
                    background: 'transparent',
                    color: active ? 'var(--fg-strong)' : 'var(--fg-muted)',
                    boxShadow: active
                      ? 'inset 0 0 0 1px var(--fg-accent)'
                      : 'none',
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
                  {hint && (
                    <span
                      className="ml-auto text-[10px] truncate opacity-60 group-hover:opacity-90 transition-opacity"
                      style={{ color: 'var(--fg-subtle)' }}
                    >
                      {hint}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}

function Breadcrumb({ pageTitle }: { pageTitle: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 text-[11px]"
      style={{ color: 'var(--fg-subtle)' }}
    >
      <span>Developers</span>
      <ChevronRight className="w-3 h-3 opacity-60" />
      <span style={{ color: 'var(--fg-default)' }}>{pageTitle}</span>
    </nav>
  );
}
