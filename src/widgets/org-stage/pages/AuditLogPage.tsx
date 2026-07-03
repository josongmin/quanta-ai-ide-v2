import { useState } from 'react';
import { Search, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { OrgShell } from '../parts/OrgShell';
import { Button } from '@shared/ui/forms';

type Result = 'success' | 'failure';

type LogEntry = {
  id: string;
  ts: string;
  actor: string;
  initials: string;
  action: string;
  target: string;
  ip: string;
  result: Result;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
};

const ACTORS = ['All actors', 'Sora Kim', 'Diego Ramos', 'Lee Junho', 'Mei Wang', 'Jorge Calderón', 'system'];
const ACTIONS = [
  'All actions',
  'auth.login',
  'auth.login.failed',
  'members.invite',
  'members.remove',
  'admission.rule.changed',
  'secrets.rotate',
  'sso.test',
  'webhook.created',
  'agent.run',
];

const SEED: LogEntry[] = [
  { id: 'e1',  ts: '2026-05-11 10:42:18', actor: 'Sora Kim',       initials: 'SK', action: 'admission.rule.changed', target: 'rule:rule_block_secrets',  ip: '203.0.113.42',  result: 'success', before: { severity: 'warn',  enabled: true }, after: { severity: 'block', enabled: true } },
  { id: 'e2',  ts: '2026-05-11 10:31:02', actor: 'Diego Ramos',    initials: 'DR', action: 'members.invite',         target: 'haruto@acme.com',          ip: '198.51.100.7',  result: 'success', after: { role: 'member', team: 'Engineering' } },
  { id: 'e3',  ts: '2026-05-11 10:14:02', actor: 'system',         initials: 'SY', action: 'scim.user.created',      target: 'haruto.suzuki@acme.com',    ip: '10.0.0.4',      result: 'success' },
  { id: 'e4',  ts: '2026-05-11 09:58:44', actor: 'Lee Junho',      initials: 'LJ', action: 'secrets.rotate',         target: 'pat:sef_pat_8a31',          ip: '203.0.113.42',  result: 'success' },
  { id: 'e5',  ts: '2026-05-11 09:42:11', actor: 'Sora Kim',       initials: 'SK', action: 'sso.test',               target: 'idp:okta',                  ip: '203.0.113.42',  result: 'success' },
  { id: 'e6',  ts: '2026-05-11 09:18:55', actor: 'Mei Wang',       initials: 'MW', action: 'webhook.created',        target: 'wh_2f9c · push.events',     ip: '198.51.100.21', result: 'success', after: { url: 'https://hooks.acme.com/se', events: ['admission.violation'] } },
  { id: 'e7',  ts: '2026-05-11 08:51:30', actor: 'Jorge Calderón', initials: 'JC', action: 'auth.login.failed',      target: 'jorge@acme.com',            ip: '192.0.2.99',    result: 'failure' },
  { id: 'e8',  ts: '2026-05-11 08:51:15', actor: 'Jorge Calderón', initials: 'JC', action: 'auth.login.failed',      target: 'jorge@acme.com',            ip: '192.0.2.99',    result: 'failure' },
  { id: 'e9',  ts: '2026-05-11 08:50:58', actor: 'Jorge Calderón', initials: 'JC', action: 'auth.login',             target: 'jorge@acme.com',            ip: '192.0.2.99',    result: 'success' },
  { id: 'e10', ts: '2026-05-11 07:33:12', actor: 'system',         initials: 'SY', action: 'agent.run',              target: 'agent:nightly_review',      ip: '10.0.0.12',     result: 'success' },
  { id: 'e11', ts: '2026-05-11 06:14:00', actor: 'Sora Kim',       initials: 'SK', action: 'members.remove',         target: 'oldcontrib@acme.com',       ip: '203.0.113.42',  result: 'success', before: { role: 'viewer', status: 'active' } },
  { id: 'e12', ts: '2026-05-10 22:48:09', actor: 'Diego Ramos',    initials: 'DR', action: 'admission.rule.changed', target: 'rule:require_review',       ip: '198.51.100.7',  result: 'success', before: { enabled: false }, after: { enabled: true } },
  { id: 'e13', ts: '2026-05-10 21:11:23', actor: 'Lee Junho',      initials: 'LJ', action: 'auth.login',             target: 'lee.junho@acme.com',        ip: '203.0.113.99',  result: 'success' },
  { id: 'e14', ts: '2026-05-10 18:02:51', actor: 'Mei Wang',       initials: 'MW', action: 'webhook.created',        target: 'wh_44b1 · audit.export',    ip: '198.51.100.21', result: 'success' },
  { id: 'e15', ts: '2026-05-10 16:30:44', actor: 'Sora Kim',       initials: 'SK', action: 'auth.login',             target: 'sora.kim@acme.com',         ip: '203.0.113.42',  result: 'success' },
];

export default function AuditLogPage() {
  const [q, setQ] = useState('');
  const [actor, setActor] = useState(ACTORS[0]);
  const [action, setAction] = useState(ACTIONS[0]);
  const [from, setFrom] = useState('2026-05-04');
  const [to, setTo] = useState('2026-05-11');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = SEED.filter((e) => {
    if (actor !== ACTORS[0] && e.actor !== actor) return false;
    if (action !== ACTIONS[0] && e.action !== action) return false;
    if (q && !`${e.actor} ${e.action} ${e.target} ${e.ip}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <OrgShell
      orgName="ACME, Inc."
      orgSlug="acme"
      title="Audit log"
      subtitle="Every privileged action across the org. Retained per the Retention policy."
      topRight={
        <Button variant="primary" size="md" leading={<Download className="w-3.5 h-3.5" />}>
          Export CSV
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div
          className="flex items-center gap-2 h-9 px-3 rounded-md flex-1 min-w-[220px]"
          style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)' }}
        >
          <Search className="w-3.5 h-3.5" style={{ color: 'var(--fg-subtle)' }} />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); }}
            placeholder="Search actor, target, IP…"
            className="flex-1 bg-transparent outline-none text-base"
            style={{ color: 'var(--fg-strong)' }}
          />
        </div>
        <select
          value={actor}
          onChange={(e) => { setActor(e.target.value); }}
          className="h-9 rounded-md px-2.5 text-base outline-none cursor-pointer"
          style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)', minWidth: 140 }}
        >
          {ACTORS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          value={action}
          onChange={(e) => { setAction(e.target.value); }}
          className="h-9 rounded-md px-2.5 text-base outline-none cursor-pointer"
          style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)', minWidth: 180 }}
        >
          {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => { setFrom(e.target.value); }}
          className="h-9 rounded-md px-2.5 text-base outline-none cursor-pointer"
          style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-default)' }}
        />
        <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>→</span>
        <input
          type="date"
          value={to}
          onChange={(e) => { setTo(e.target.value); }}
          className="h-9 rounded-md px-2.5 text-base outline-none cursor-pointer"
          style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-default)' }}
        />
      </div>

      <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border-muted)' }}>
        <div
          className="grid items-center px-3 h-9 text-xs uppercase tracking-eyebrow font-semibold"
          style={{
            gridTemplateColumns: '20px 160px 160px 200px 1fr 130px 80px',
            gap: 12,
            background: 'var(--bg-surface-muted)',
            color: 'var(--fg-subtle)',
            borderBottom: '1px solid var(--border-muted)',
          }}
        >
          <span />
          <span>When</span>
          <span>Actor</span>
          <span>Action</span>
          <span>Target</span>
          <span>IP</span>
          <span>Result</span>
        </div>
        {filtered.map((e) => {
          const open = expanded === e.id;
          return (
            <div key={e.id} className="[&:not(:first-child)]:border-t" style={{ borderColor: 'var(--border-muted)' }}>
              <button
                type="button"
                onClick={() => { setExpanded(open ? null : e.id); }}
                className="grid items-center px-3 h-12 text-base w-full text-left transition-colors"
                style={{
                  gridTemplateColumns: '20px 160px 160px 200px 1fr 130px 80px',
                  gap: 12,
                }}
                onMouseEnter={(ev) => { ev.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(ev) => { ev.currentTarget.style.background = 'transparent'; }}
              >
                {open
                  ? <ChevronDown className="w-3 h-3" style={{ color: 'var(--fg-subtle)' }} />
                  : <ChevronRight className="w-3 h-3" style={{ color: 'var(--fg-subtle)' }} />
                }
                <span className="font-mono text-sm" style={{ color: 'var(--fg-muted)' }}>{e.ts}</span>
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-2xs font-bold shrink-0"
                    style={{
                      backgroundImage: 'linear-gradient(135deg, var(--fg-accent), var(--fg-link))',
                      color: 'var(--bg-canvas)',
                    }}
                  >
                    {e.initials}
                  </div>
                  <span className="truncate" style={{ color: 'var(--fg-strong)' }}>{e.actor}</span>
                </div>
                <span className="font-mono text-sm truncate" style={{ color: 'var(--fg-default)' }}>{e.action}</span>
                <span className="font-mono text-sm truncate" style={{ color: 'var(--fg-strong)' }}>{e.target}</span>
                <span className="font-mono text-sm" style={{ color: 'var(--fg-muted)' }}>{e.ip}</span>
                <span
                  className="text-xs uppercase tracking-eyebrow font-semibold px-1.5 py-0.5 rounded w-fit"
                  style={{
                    background: e.result === 'success' ? 'var(--intent-success-bg)' : 'var(--intent-danger-bg)',
                    color: e.result === 'success' ? 'var(--intent-success-fg)' : 'var(--intent-danger-fg)',
                    border: `1px solid ${e.result === 'success' ? 'var(--intent-success-fg)' : 'var(--intent-danger-fg)'}`,
                  }}
                >
                  {e.result}
                </span>
              </button>
              {open && (
                <div className="px-10 pb-3 pt-1" style={{ background: 'var(--bg-surface-muted)' }}>
                  <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <DiffBlock label="before" data={e.before} />
                    <DiffBlock label="after"  data={e.after}  />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-3 px-1">
        <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>
          Showing 1–15 of 8,421 events
        </span>
        <div className="flex items-center gap-2">
          <Button disabled>Previous</Button>
          <Button>Next</Button>
        </div>
      </div>
    </OrgShell>
  );
}

function DiffBlock({ label, data }: { label: string; data?: Record<string, unknown> }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-eyebrow font-semibold" style={{ color: 'var(--fg-subtle)' }}>
        {label}
      </span>
      <pre
        className="font-mono text-sm p-2.5 rounded-md overflow-x-auto whitespace-pre-wrap"
        style={{
          background: 'var(--bg-canvas)',
          border: '1px solid var(--border-muted)',
          color: 'var(--fg-strong)',
          minHeight: 56,
        }}
      >
{data ? JSON.stringify(data, null, 2) : '— no payload —'}
      </pre>
    </div>
  );
}
