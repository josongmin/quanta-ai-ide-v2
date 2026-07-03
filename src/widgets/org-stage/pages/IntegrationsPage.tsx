import { useMemo, useRef, useState } from 'react';
import { Check, ExternalLink, Settings2, X, Link2, AlertCircle } from 'lucide-react';
import { useHoverStyle } from '@shared/lib';
import { OrgShell } from '../parts/OrgShell';
import { Button, Toggle } from '@shared/ui/forms';
import { ModalBackdrop, SearchInput, useDialogA11y } from '@shared/ui';

type Category = 'chat' | 'tracker' | 'pager' | 'observability' | 'sourcecontrol' | 'docs';

type Integration = {
  id: string;
  name: string;
  category: Category;
  blurb: string;
  installed: boolean;
  installedBy?: string;
  installedAt?: string;
  status?: 'healthy' | 'degraded' | 'error';
  account?: string;
  events?: string[];
  // Visual mark — gradient + initials
  markFrom: string;
  markTo: string;
};

const SEED: Integration[] = [
  { id: 'slack',      name: 'Slack',      category: 'chat',         blurb: 'Post review requests, agent updates, and incident signal to channels.',
    installed: true,  installedBy: 'Sora Kim', installedAt: '2026-04-08', status: 'healthy',  account: 'acme.slack.com',         events: ['review.requested', 'admission.failed', 'agent.completed'],
    markFrom: '#4A154B', markTo: '#ECB22E' },
  { id: 'jira',       name: 'Jira',       category: 'tracker',      blurb: 'Two-way sync between admission gates and Jira tickets.',
    installed: true,  installedBy: 'Mei Wang', installedAt: '2026-04-12', status: 'degraded', account: 'acme.atlassian.net',     events: ['issue.linked', 'gate.linked'],
    markFrom: '#0052CC', markTo: '#2684FF' },
  { id: 'linear',     name: 'Linear',     category: 'tracker',      blurb: 'Open Linear issues from review threads. Link PRs back to issues.',
    installed: false,
    markFrom: '#5E6AD2', markTo: '#A4ABF4' },
  { id: 'pagerduty',  name: 'PagerDuty',  category: 'pager',        blurb: 'Page on-call when admission rules block a deploy or an agent crashes.',
    installed: true,  installedBy: 'Sora Kim', installedAt: '2026-04-15', status: 'healthy',  account: 'acme',                   events: ['admission.failed', 'agent.killed'],
    markFrom: '#06AC38', markTo: '#0E7C2C' },
  { id: 'datadog',    name: 'Datadog',    category: 'observability',blurb: 'Send agent + admission metrics to Datadog. Scrape errors back into incidents.',
    installed: true,  installedBy: 'Diego Ramos', installedAt: '2026-04-18', status: 'error', account: 'us3.datadoghq.com',     events: ['metrics.push', 'incident.read'],
    markFrom: '#632CA6', markTo: '#9D6EE8' },
  { id: 'github',     name: 'GitHub',     category: 'sourcecontrol',blurb: 'Pull repos, post check runs, and apply CODEOWNERS routing.',
    installed: true,  installedBy: 'Sora Kim', installedAt: '2026-04-08', status: 'healthy', account: 'github.com/acme',         events: ['push', 'pr.opened', 'check.requested'],
    markFrom: '#24292F', markTo: '#586069' },
  { id: 'gitlab',     name: 'GitLab',     category: 'sourcecontrol',blurb: 'Same as GitHub, for GitLab-hosted projects.',
    installed: false,
    markFrom: '#FC6D26', markTo: '#E24329' },
  { id: 'bitbucket',  name: 'Bitbucket',  category: 'sourcecontrol',blurb: 'Atlassian-hosted Git source.',
    installed: false,
    markFrom: '#0052CC', markTo: '#2684FF' },
  { id: 'notion',     name: 'Notion',     category: 'docs',         blurb: 'Surface investigation summaries and runbooks inside Notion docs.',
    installed: false,
    markFrom: '#000000', markTo: '#787878' },
  { id: 'sentry',     name: 'Sentry',     category: 'observability',blurb: 'Cross-link errors with admission failures and post-mortems.',
    installed: false,
    markFrom: '#362D59', markTo: '#FA7268' },
  { id: 'opsgenie',   name: 'Opsgenie',   category: 'pager',        blurb: 'Alternative to PagerDuty for paging.',
    installed: false,
    markFrom: '#172B4D', markTo: '#2684FF' },
  { id: 'discord',    name: 'Discord',    category: 'chat',         blurb: 'Drop notifications into a Discord server channel.',
    installed: false,
    markFrom: '#5865F2', markTo: '#3D45B8' },
];

const CATEGORIES: { id: Category | 'all'; label: string }[] = [
  { id: 'all',           label: 'All' },
  { id: 'chat',          label: 'Chat' },
  { id: 'tracker',       label: 'Issue tracker' },
  { id: 'pager',         label: 'Paging' },
  { id: 'observability', label: 'Observability' },
  { id: 'sourcecontrol', label: 'Source control' },
  { id: 'docs',          label: 'Docs' },
];

export default function IntegrationsPage() {
  const [items, setItems] = useState<Integration[]>(SEED);
  const [filter, setFilter] = useState<Category | 'all'>('all');
  const [installedOnly, setInstalledOnly] = useState(false);
  const [q, setQ] = useState('');
  const [drawer, setDrawer] = useState<Integration | null>(null);

  const filtered = useMemo(() => {
    let out = items;
    if (filter !== 'all') out = out.filter((i) => i.category === filter);
    if (installedOnly)    out = out.filter((i) => i.installed);
    if (q.trim()) {
      const n = q.toLowerCase();
      out = out.filter((i) => i.name.toLowerCase().includes(n) || i.blurb.toLowerCase().includes(n));
    }
    return out;
  }, [items, filter, installedOnly, q]);

  const installCount = items.filter((i) => i.installed).length;

  const install = (id: string) => {
    setItems((all) => all.map((i) => (i.id === id ? { ...i, installed: true, installedBy: 'Sora Kim', installedAt: '2026-05-11', status: 'healthy', account: '—', events: [] } : i)));
  };
  const uninstall = (id: string) => {
    setItems((all) => all.map((i) => (i.id === id ? { ...i, installed: false, status: undefined, account: undefined, events: undefined, installedBy: undefined, installedAt: undefined } : i)));
    setDrawer(null);
  };

  return (
    <OrgShell
      orgName="ACME, Inc."
      orgSlug="acme"
      title="Integrations"
      subtitle={`${installCount} of ${items.length} apps installed.`}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-1 flex-wrap">
          {CATEGORIES.map((c) => {
            const active = filter === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => { setFilter(c.id); }}
                className="h-7 px-2.5 rounded-md text-sm font-medium transition-colors"
                style={{
                  background: active ? 'var(--bg-active)' : 'transparent',
                  color: active ? 'var(--fg-strong)' : 'var(--fg-muted)',
                  border: `1px solid ${active ? 'var(--border-default)' : 'transparent'}`,
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                {c.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: 'var(--fg-muted)' }}>
            <Toggle checked={installedOnly} onChange={setInstalledOnly} label="Installed only" />
            Installed only
          </label>
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Search apps…"
            minWidth={220}
            clearable={false}
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--fg-subtle)' }}>
          <p className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>No apps match.</p>
          <p className="text-sm mt-1">Try a different category or clear the search.</p>
        </div>
      ) : (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
        >
          {filtered.map((i) => (
            <IntegrationCard
              key={i.id}
              item={i}
              onInstall={() => { install(i.id); }}
              onConfigure={() => { setDrawer(i); }}
            />
          ))}
        </div>
      )}

      {drawer && (
        <ConfigDrawer
          item={drawer}
          onClose={() => { setDrawer(null); }}
          onUninstall={() => { uninstall(drawer.id); }}
        />
      )}
    </OrgShell>
  );
}

function IntegrationCard({
  item, onInstall, onConfigure,
}: { item: Integration; onInstall: () => void; onConfigure: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useHoverStyle(
    ref,
    { borderColor: 'var(--border-default)' },
    { borderColor: 'var(--border-muted)' },
  );
  return (
    <div
      ref={ref}
      className="p-4 rounded-md flex flex-col gap-3 transition-colors"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-muted)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-md flex items-center justify-center text-base font-black shrink-0"
          style={{
            backgroundImage: `linear-gradient(135deg, ${item.markFrom}, ${item.markTo})`,
            color: '#fff',
          }}
        >
          {item.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex flex-col flex-1 min-w-0 gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-semibold truncate" style={{ color: 'var(--fg-strong)' }}>
              {item.name}
            </span>
            {item.installed && <StatusDot status={item.status ?? 'healthy'} />}
          </div>
          <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>
            {labelFor(item.category)}
          </span>
        </div>
      </div>

      <p className="text-sm leading-snug" style={{ color: 'var(--fg-muted)' }}>
        {item.blurb}
      </p>

      <div className="flex items-center justify-between mt-auto pt-1">
        {item.installed ? (
          <span className="text-xs tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
            {item.account}
          </span>
        ) : (
          <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
            Not installed
          </span>
        )}
        {item.installed ? (
          <Button leading={<Settings2 className="w-3 h-3" />} onClick={onConfigure}>Configure</Button>
        ) : (
          <Button variant="primary" leading={<Link2 className="w-3 h-3" />} onClick={onInstall}>Install</Button>
        )}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: 'healthy' | 'degraded' | 'error' }) {
  const color =
    status === 'healthy' ? 'var(--intent-success-fg)'
    : status === 'degraded' ? 'var(--intent-warn-fg)'
    : 'var(--intent-danger-fg)';
  return (
    <span
      className="w-2 h-2 rounded-full"
      style={{ background: color, boxShadow: `0 0 6px ${color}` }}
      title={status}
    />
  );
}

function labelFor(c: Category): string {
  return c === 'chat' ? 'Chat'
    : c === 'tracker' ? 'Issue tracker'
    : c === 'pager' ? 'Paging'
    : c === 'observability' ? 'Observability'
    : c === 'sourcecontrol' ? 'Source control'
    : 'Docs';
}

function ConfigDrawer({
  item, onClose, onUninstall,
}: { item: Integration; onClose: () => void; onUninstall: () => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  useDialogA11y(dialogRef, true, onClose);
  return (
    <>
      <ModalBackdrop onClick={onClose} z="z-40" alpha={0.45} label="Close drawer" />
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${item.name} configuration`}
        tabIndex={-1}
        className="fixed right-0 top-0 bottom-0 z-50 w-[440px] flex flex-col outline-none"
        style={{ background: 'var(--bg-elevated)', borderLeft: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-muted)' }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-black shrink-0"
              style={{ backgroundImage: `linear-gradient(135deg, ${item.markFrom}, ${item.markTo})`, color: '#fff' }}
            >
              {item.name.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-base font-semibold truncate" style={{ color: 'var(--fg-strong)' }}>
              {item.name}
            </span>
            {item.status && <StatusDot status={item.status} />}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-7 h-7 inline-flex items-center justify-center" style={{ color: 'var(--fg-muted)' }}>
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-eyebrow font-semibold" style={{ color: 'var(--fg-subtle)' }}>Account</span>
            <span className="text-base font-mono" style={{ color: 'var(--fg-default)' }}>{item.account}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-eyebrow font-semibold" style={{ color: 'var(--fg-subtle)' }}>Installed by</span>
            <span className="text-base" style={{ color: 'var(--fg-default)' }}>
              {item.installedBy} · <span className="font-mono">{item.installedAt}</span>
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-eyebrow font-semibold" style={{ color: 'var(--fg-subtle)' }}>Subscribed events</span>
            <ul className="flex flex-col rounded-md overflow-hidden" style={{ border: '1px solid var(--border-muted)' }}>
              {(item.events ?? []).length === 0 ? (
                <li className="px-3 py-3 text-sm text-center" style={{ color: 'var(--fg-subtle)' }}>
                  No events configured.
                </li>
              ) : (item.events ?? []).map((e) => (
                <li
                  key={e}
                  className="flex items-center gap-2 px-3 py-2 [&:not(:first-child)]:border-t"
                  style={{ borderColor: 'var(--border-muted)' }}
                >
                  <Check className="w-3 h-3 shrink-0" style={{ color: 'var(--intent-success-fg)' }} />
                  <span className="font-mono text-sm" style={{ color: 'var(--fg-default)' }}>{e}</span>
                </li>
              ))}
            </ul>
          </div>

          {item.status === 'error' && (
            <div
              className="flex items-start gap-2 px-3 py-2.5 rounded-md text-sm"
              style={{ background: 'var(--intent-danger-bg)', color: 'var(--intent-danger-fg)', border: '1px solid var(--intent-danger-fg)' }}
            >
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>API key returned 401 on last poll. Reconnect to refresh credentials.</span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-eyebrow font-semibold" style={{ color: 'var(--fg-subtle)' }}>Documentation</span>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-base font-medium bg-transparent border-0 p-0 cursor-pointer self-start"
              style={{ color: 'var(--fg-link)' }}
            >
              Open {item.name} docs
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}
        >
          <Button variant="ghost" onClick={onUninstall}>Uninstall</Button>
          <Button variant="primary" size="md" onClick={onClose}>Done</Button>
        </div>
      </aside>
    </>
  );
}
