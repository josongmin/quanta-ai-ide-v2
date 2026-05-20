import { type ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { ScrollPane } from '@shared/ui';
import { useTabVisibility } from '@features/workspace-tabs';
import {
  SlidersHorizontal, GitBranch, Users, ShieldCheck, Eye, Wrench,
  Bot, Lock, Layers, Webhook, Tag, Trash2, ChevronRight,
} from 'lucide-react';
import { useTheme } from '@shared/theme';

export type WsPath =
  | '/$org/$ws/settings/general' | '/$org/$ws/settings/source' | '/$org/$ws/settings/ownership'
  | '/$org/$ws/settings/admission' | '/$org/$ws/settings/review' | '/$org/$ws/settings/fix'
  | '/$org/$ws/settings/agents' | '/$org/$ws/settings/secrets' | '/$org/$ws/settings/environments'
  | '/$org/$ws/settings/webhooks' | '/$org/$ws/settings/labels' | '/$org/$ws/settings/danger';

type NavItem = { path: WsPath; label: string; icon: React.ComponentType<{ className?: string }> };
type NavGroup = { id: string; title: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    id: 'core',
    title: 'Workspace',
    items: [
      { path: '/$org/$ws/settings/general',  label: 'General',           icon: SlidersHorizontal },
      { path: '/$org/$ws/settings/source',   label: 'Source connection', icon: GitBranch },
      { path: '/$org/$ws/settings/ownership',label: 'Ownership',         icon: Users },
    ],
  },
  {
    id: 'pipeline',
    title: 'Pipeline',
    items: [
      { path: '/$org/$ws/settings/admission', label: 'Admission rules', icon: ShieldCheck },
      { path: '/$org/$ws/settings/review',    label: 'Review policy',   icon: Eye },
      { path: '/$org/$ws/settings/fix',       label: 'Fix pipeline',    icon: Wrench },
      { path: '/$org/$ws/settings/agents',    label: 'Agents',          icon: Bot },
    ],
  },
  {
    id: 'infra',
    title: 'Infrastructure',
    items: [
      { path: '/$org/$ws/settings/secrets',     label: 'Secrets',     icon: Lock },
      { path: '/$org/$ws/settings/environments',label: 'Environments',icon: Layers },
      { path: '/$org/$ws/settings/webhooks',    label: 'Webhooks',    icon: Webhook },
      { path: '/$org/$ws/settings/labels',      label: 'Labels',      icon: Tag },
    ],
  },
  {
    id: 'risk',
    title: 'Risk',
    items: [
      { path: '/$org/$ws/settings/danger', label: 'Danger zone', icon: Trash2 },
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
// visible). 220px sticky sidebar + scrollable body, scoped to a single
// workspace. The path template uses both $org and $ws params.
export function WsShell({ orgName, orgSlug, wsName, wsSlug, title, subtitle, topRight, children }: Props) {
  const { isDark } = useTheme();
  const visible = useTabVisibility();

  return (
    <div
      className="absolute inset-0 flex"
      style={{ background: isDark ? 'var(--bg-canvas)' : 'var(--bg-surface)' }}
    >
      <Sidebar orgSlug={orgSlug} wsName={wsName} wsSlug={wsSlug} />

      <ScrollPane scope="ws" visible={visible} className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-[920px] mx-auto px-10 pt-10 pb-32">
          <header className="flex items-end justify-between gap-4 mb-8">
            <div className="flex flex-col gap-1.5 min-w-0">
              <Breadcrumb orgName={orgName} wsName={wsName} pageTitle={title} />
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
      </ScrollPane>
    </div>
  );
}

function Sidebar({ orgSlug, wsName, wsSlug }: { orgSlug: string; wsName: string; wsSlug: string }) {
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
              backgroundImage: 'linear-gradient(to bottom right, var(--fg-accent), var(--fg-link))',
              color: 'var(--bg-canvas)',
            }}
          >
            {wsName.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[12px] font-semibold truncate" style={{ color: 'var(--fg-strong)' }}>
              {wsName}
            </span>
            <span className="text-[10px] truncate" style={{ color: 'var(--fg-subtle)' }}>
              {orgSlug}/{wsSlug}
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
            {group.items.map(({ path, label, icon: Icon }) => {
              const active = pathname === resolvePath(path, orgSlug, wsSlug);
              return (
                <Link
                  key={path}
                  to={path as never}
                  params={{ org: orgSlug, ws: wsSlug } as never}
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

function resolvePath(template: string, orgSlug: string, wsSlug: string) {
  return template.replace('$org', orgSlug).replace('$ws', wsSlug);
}

function Breadcrumb({
  orgName, wsName, pageTitle,
}: { orgName: string; wsName: string; pageTitle: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 text-[11px]"
      style={{ color: 'var(--fg-subtle)' }}
    >
      <span>{orgName}</span>
      <ChevronRight className="w-3 h-3 opacity-60" />
      <span>{wsName}</span>
      <ChevronRight className="w-3 h-3 opacity-60" />
      <span>Settings</span>
      <ChevronRight className="w-3 h-3 opacity-60" />
      <span style={{ color: 'var(--fg-default)' }}>{pageTitle}</span>
    </nav>
  );
}
