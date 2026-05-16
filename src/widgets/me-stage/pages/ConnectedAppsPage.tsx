import { useState } from 'react';
import {
  Mail, Plus, Check, X, ExternalLink, ChevronDown, ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import { GithubIcon, SlackIcon } from '@shared/ui/brand-icons';
import { MeShell } from '../parts/MeShell';
import { Section, Button } from '@shared/ui/forms';

// Inline brand glyphs (kept simple for the demo). Defined up-top so the
// const arrays below can reference them without TDZ issues.
type MarkProps = { className?: string };
const baseMark = (label: string) => function Mark({ className }: MarkProps) {
  return (
    <span
      className={`rounded-sm inline-flex items-center justify-center text-[7px] font-black ${className ?? 'w-3.5 h-3.5'}`}
      style={{ background: 'var(--fg-default)', color: 'var(--bg-canvas)' }}
    >
      {label}
    </span>
  );
};
const LinearMark    = baseMark('LN');
const JiraMark      = baseMark('JR');
const GitLabMark    = baseMark('GL');
const PagerDutyMark = baseMark('PD');
const DatadogMark   = baseMark('DD');
const DiscordMark   = baseMark('DC');
const NotionMark    = baseMark('NT');

type Connection = {
  id: string;
  provider: string;
  account: string;
  scopes: { id: string; label: string; required: boolean }[];
  connectedAt: string;
  lastUsed: string;
  primary?: boolean;
  warning?: string;
  category: 'identity' | 'integration';
  iconBg?: string;
  icon: React.ComponentType<{ className?: string }>;
};

const INITIAL_CONNECTIONS: Connection[] = [
  {
    id: 'github',
    provider: 'GitHub',
    account: '@sora · Personal',
    scopes: [
      { id: 'read:user',   label: 'Read your profile',                   required: true },
      { id: 'user:email',  label: 'Access your email addresses',         required: true },
      { id: 'repo',        label: 'Read repositories',                   required: true },
      { id: 'read:org',    label: 'Read team and member lists',          required: false },
    ],
    connectedAt: '2025-08-12',
    lastUsed: 'Active now',
    primary: true,
    category: 'identity',
    icon: GithubIcon,
  },
  {
    id: 'google',
    provider: 'Google',
    account: 'sora@acme.com',
    scopes: [
      { id: 'openid',  label: 'Identify you',         required: true },
      { id: 'email',   label: 'Read your email',      required: true },
      { id: 'profile', label: 'Read profile photo',   required: false },
    ],
    connectedAt: '2025-08-12',
    lastUsed: '2 days ago',
    category: 'identity',
    icon: Mail,
  },
  {
    id: 'slack',
    provider: 'Slack',
    account: 'acme · #review-bot',
    scopes: [
      { id: 'chat:write', label: 'Post messages on your behalf in #review-bot', required: true },
      { id: 'channels:read', label: 'See public channel list',                  required: false },
    ],
    connectedAt: '2025-09-01',
    lastUsed: '14 minutes ago',
    category: 'integration',
    icon: SlackIcon,
  },
  {
    id: 'linear',
    provider: 'Linear',
    account: 'ACME workspace',
    scopes: [
      { id: 'read', label: 'Read issues and projects', required: true },
      { id: 'write', label: 'Create and update issues', required: false },
    ],
    connectedAt: '2025-11-04',
    lastUsed: '1 hour ago',
    warning: 'Token expires in 7 days. Re-connect to extend.',
    category: 'integration',
    icon: LinearMark,
  },
  {
    id: 'jira',
    provider: 'Jira',
    account: 'acme.atlassian.net',
    scopes: [
      { id: 'read:jira-work', label: 'Read issues and JQL', required: true },
    ],
    connectedAt: '2025-12-19',
    lastUsed: '6 days ago',
    category: 'integration',
    icon: JiraMark,
  },
];

const AVAILABLE_INTEGRATIONS = [
  { id: 'gitlab',     name: 'GitLab',       blurb: 'Sign in with GitLab + sync repos',          icon: GitLabMark },
  { id: 'pagerduty',  name: 'PagerDuty',    blurb: 'Surface incident context in investigations', icon: PagerDutyMark },
  { id: 'datadog',    name: 'Datadog',      blurb: 'Pipe metrics into the dot field',           icon: DatadogMark },
  { id: 'discord',    name: 'Discord',      blurb: 'Notify channels on review events',          icon: DiscordMark },
  { id: 'notion',     name: 'Notion',       blurb: 'Link investigations to Notion pages',       icon: NotionMark },
];

export default function ConnectedAppsPage() {
  const [connections, setConnections] = useState<Connection[]>(INITIAL_CONNECTIONS);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<Connection | null>(null);

  const identity    = connections.filter((c) => c.category === 'identity');
  const integrations = connections.filter((c) => c.category === 'integration');

  return (
    <MeShell
      title="Connected apps"
      subtitle="Sign-in providers and third-party integrations linked to your account."
    >
      <Section
        title="Sign-in providers"
        hint="Use any of these to sign in. Your primary provider is what we'll surface first on the login screen."
      >
        <ConnectionList
          items={identity}
          expanded={expanded}
          onToggle={(id) => { setExpanded(expanded === id ? null : id); }}
          onMakePrimary={(id) => { setConnections((c) => c.map((x) => ({ ...x, primary: x.id === id || (x.category === 'integration' ? x.primary : false) }))); }}
          onRemove={(c) => { setConfirmRemove(c); }}
        />
      </Section>

      <Section
        title="Integrations"
        hint="Third-party tools that act on your behalf. Removing one stops all related notifications and actions."
      >
        <ConnectionList
          items={integrations}
          expanded={expanded}
          onToggle={(id) => { setExpanded(expanded === id ? null : id); }}
          onMakePrimary={null}
          onRemove={(c) => { setConfirmRemove(c); }}
        />
      </Section>

      <Section
        title="Available to add"
        hint="Connect another app. You'll be redirected to authorize the scopes — we never see your password."
      >
        <div className="grid grid-cols-1 gap-1.5">
          {AVAILABLE_INTEGRATIONS.map((it) => (
            <AvailableRow key={it.id} item={it} />
          ))}
        </div>
      </Section>

      {confirmRemove && (
        <RemoveModal
          connection={confirmRemove}
          onClose={() => { setConfirmRemove(null); }}
          onConfirm={() => {
            setConnections((c) => c.filter((x) => x.id !== confirmRemove.id));
            setConfirmRemove(null);
          }}
        />
      )}
    </MeShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Connection list with expand-to-show-scopes

function ConnectionList({
  items, expanded, onToggle, onMakePrimary, onRemove,
}: {
  items: Connection[];
  expanded: string | null;
  onToggle: (id: string) => void;
  onMakePrimary: ((id: string) => void) | null;
  onRemove: (c: Connection) => void;
}) {
  if (items.length === 0) {
    return (
      <div
        className="text-center py-6 text-[11px] rounded-md"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px dashed var(--border-default)',
          color: 'var(--fg-subtle)',
        }}
      >
        Nothing connected yet.
      </div>
    );
  }
  return (
    <div className="flex flex-col rounded-md overflow-hidden"
      style={{ border: '1px solid var(--border-muted)' }}
    >
      {items.map((c, i) => (
        <ConnectionRow
          key={c.id}
          conn={c}
          top={i === 0}
          expanded={expanded === c.id}
          onToggle={() => { onToggle(c.id); }}
          onMakePrimary={onMakePrimary ? () => { onMakePrimary(c.id); } : null}
          onRemove={() => { onRemove(c); }}
        />
      ))}
    </div>
  );
}

function ConnectionRow({
  conn, top, expanded, onToggle, onMakePrimary, onRemove,
}: {
  conn: Connection;
  top: boolean;
  expanded: boolean;
  onToggle: () => void;
  onMakePrimary: (() => void) | null;
  onRemove: () => void;
}) {
  const Icon = conn.icon;
  return (
    <div
      style={{
        background: 'var(--bg-canvas)',
        borderTop: top ? 'none' : '1px solid var(--border-muted)',
      }}
    >
      <div className="flex items-center gap-3 px-3 py-3">
        <span
          className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
          style={{
            background: conn.primary ? 'var(--brand-bg)' : 'var(--bg-surface-muted)',
            border: `1px solid ${conn.primary ? 'var(--brand-vivid)' : 'var(--border-muted)'}`,
          }}
        >
          <Icon className="w-4 h-4" />
        </span>
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
              {conn.provider}
            </span>
            {conn.primary && (
              <span
                className="text-[9px] uppercase tracking-[0.14em] font-semibold px-1.5 py-0.5 rounded"
                style={{ color: 'var(--brand-fg)', background: 'var(--brand-bg)', border: '1px solid var(--brand-vivid)' }}
              >
                Primary
              </span>
            )}
          </div>
          <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
            {conn.account} · Connected {conn.connectedAt} · {conn.lastUsed}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {onMakePrimary && !conn.primary && <Button onClick={onMakePrimary}>Make primary</Button>}
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors"
            style={{
              background: expanded ? 'var(--bg-active)' : 'var(--bg-surface-muted)',
              color: 'var(--fg-default)',
              border: '1px solid var(--border-default)',
            }}
          >
            {conn.scopes.length} scope{conn.scopes.length === 1 ? '' : 's'}
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <Button variant="ghost" onClick={onRemove}>
            <X className="w-3 h-3" />
            Disconnect
          </Button>
        </div>
      </div>

      {conn.warning && (
        <div
          className="flex items-start gap-2 mx-3 mb-2 px-2.5 py-1.5 rounded text-[10px]"
          style={{
            background: 'var(--intent-warn-bg)',
            border: '1px solid var(--intent-warn-fg)',
            color: 'var(--fg-strong)',
          }}
        >
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" style={{ color: 'var(--intent-warn-fg)' }} />
          {conn.warning}
        </div>
      )}

      {expanded && (
        <div
          className="px-3 pb-3 onb-stagger"
          style={{ borderTop: '1px dashed var(--border-muted)' }}
        >
          <div
            className="text-[9px] uppercase tracking-[0.14em] font-semibold pt-2.5 pb-1.5"
            style={{ color: 'var(--fg-subtle)' }}
          >
            Authorized scopes
          </div>
          <ul className="grid grid-cols-1 gap-1">
            {conn.scopes.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-[11px]">
                <Check className="w-3 h-3" style={{ color: s.required ? 'var(--intent-success-fg)' : 'var(--fg-subtle)' }} />
                <span style={{ color: 'var(--fg-default)' }}>{s.label}</span>
                <code className="font-mono text-[10px]" style={{ color: 'var(--fg-subtle)' }}>{s.id}</code>
                {s.required && (
                  <span
                    className="text-[8px] uppercase tracking-[0.14em] font-semibold ml-auto"
                    style={{ color: 'var(--fg-subtle)' }}
                  >
                    Required
                  </span>
                )}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3 mt-3 text-[11px]">
            <button type="button" className="inline-flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer" style={{ color: 'var(--fg-link)', font: 'inherit' }}>
              View on {conn.provider}
              <ExternalLink className="w-2.5 h-2.5" />
            </button>
            <button type="button" className="inline-flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer" style={{ color: 'var(--fg-link)', font: 'inherit' }}>
              Re-authorize for new scopes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Available integrations

function AvailableRow({ item }: { item: typeof AVAILABLE_INTEGRATIONS[number] }) {
  const Icon = item.icon;
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-muted)',
      }}
    >
      <span
        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
        style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-muted)' }}
      >
        <Icon className="w-3.5 h-3.5" />
      </span>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
          {item.name}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
          {item.blurb}
        </span>
      </div>
      <Button leading={<Plus className="w-3 h-3" />}>
        Connect
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Remove confirmation

function RemoveModal({
  connection, onClose, onConfirm,
}: { connection: Connection; onClose: () => void; onConfirm: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 popover-backdrop-in"
      style={{ background: 'var(--bg-scrim)' }}
    >
      <div
        className="w-full max-w-[420px] rounded-md p-5 popover-panel-in flex flex-col gap-4"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'var(--intent-danger-bg)' }}
          >
            <X className="w-4 h-4" style={{ color: 'var(--intent-danger-fg)' }} />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-[14px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
              Disconnect {connection.provider}?
            </h3>
            <p className="text-[12px] leading-snug" style={{ color: 'var(--fg-muted)' }}>
              {connection.category === 'identity'
                ? `You won't be able to sign in with ${connection.provider} after this. Make sure you have another sign-in method first.`
                : `Stops all ${connection.provider} actions and notifications. Anything queued will be canceled.`}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" size="md" onClick={onClose}>Cancel</Button>
          <Button variant="danger" size="md" onClick={onConfirm}>
            Disconnect
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Inline brand glyphs (kept simple for the demo)

