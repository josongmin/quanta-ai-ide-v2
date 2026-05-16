import { useMemo, useState } from 'react';
import {
  Search, MoreHorizontal, AlertTriangle, ShieldAlert,
  Database, Download, RefreshCw, Terminal, ExternalLink,
  Activity, CheckCircle2, XCircle, Clock, Play,
} from 'lucide-react';
import { AdminShell } from '../parts/AdminShell';
import { Button, Toggle } from '@shared/ui/forms';
import { formatNumber } from '@shared/i18n';

// ─────────────────────────────────────────────────────────────────────────
// Seed data

type Plan = 'free' | 'team' | 'business' | 'enterprise';
type Org = {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  members: number;
  spend: number;
  signedUp: string;
};

const ORGS: Org[] = [
  { id: 'o1',  name: 'ACME, Inc.',       slug: 'acme',         plan: 'enterprise', members: 412, spend: 18420, signedUp: '2023-04-12' },
  { id: 'o2',  name: 'Northwind Labs',   slug: 'northwind',    plan: 'business',   members: 86,  spend: 4280,  signedUp: '2024-01-08' },
  { id: 'o3',  name: 'Globex Corp',      slug: 'globex',       plan: 'enterprise', members: 248, spend: 12990, signedUp: '2023-09-21' },
  { id: 'o4',  name: 'Initech',          slug: 'initech',      plan: 'team',       members: 22,  spend: 612,   signedUp: '2025-02-14' },
  { id: 'o5',  name: 'Soylent',          slug: 'soylent',      plan: 'business',   members: 54,  spend: 2150,  signedUp: '2024-06-30' },
  { id: 'o6',  name: 'Hooli',            slug: 'hooli',        plan: 'enterprise', members: 612, spend: 28100, signedUp: '2022-11-04' },
  { id: 'o7',  name: 'Pied Piper',       slug: 'pied-piper',   plan: 'team',       members: 14,  spend: 380,   signedUp: '2025-03-22' },
  { id: 'o8',  name: 'Dunder Mifflin',   slug: 'dunder',       plan: 'free',       members: 6,   spend: 0,     signedUp: '2026-04-19' },
  { id: 'o9',  name: 'Stark Industries', slug: 'stark',        plan: 'business',   members: 92,  spend: 5210,  signedUp: '2024-03-11' },
  { id: 'o10', name: 'Wayne Enterprises',slug: 'wayne',        plan: 'enterprise', members: 318, spend: 14800, signedUp: '2023-07-29' },
];

type UserStatus = 'active' | 'invited' | 'suspended';
type AdminUser = {
  id: string;
  name: string;
  email: string;
  org: string;
  lastSignIn: string;
  status: UserStatus;
};

const USERS: AdminUser[] = [
  { id: 'u1', name: 'Sora Kim',     email: 'sora@acme.com',         org: 'acme',      lastSignIn: '2m ago',  status: 'active' },
  { id: 'u2', name: 'Mei Wang',     email: 'mei@northwind.io',      org: 'northwind', lastSignIn: '38m ago', status: 'active' },
  { id: 'u3', name: 'Brad Lee',     email: 'brad@hooli.com',        org: 'hooli',     lastSignIn: '3h ago',  status: 'active' },
  { id: 'u4', name: 'Yuki Sato',    email: 'yuki@globex.co',        org: 'globex',    lastSignIn: '1d ago',  status: 'suspended' },
  { id: 'u5', name: 'Priya Singh',  email: 'priya@stark.io',        org: 'stark',     lastSignIn: 'invited', status: 'invited' },
];

type JobState = 'running' | 'queued' | 'failed' | 'completed';
type Job = {
  id: string;
  type: string;
  state: JobState;
  runtime: string;
  retries: number;
  payload: string;
};

const JOBS: Job[] = [
  { id: 'job_8f3a-2c91', type: 'agent.run',             state: 'failed',    runtime: '00:02:14', retries: 3, payload: '14.2 KB' },
  { id: 'job_44b1-7e09', type: 'billing.invoice.send',  state: 'running',   runtime: '00:00:48', retries: 0, payload: '3.8 KB'  },
  { id: 'job_91c0-5d72', type: 'search.reindex',        state: 'completed', runtime: '00:08:31', retries: 0, payload: '128 MB'  },
  { id: 'job_72fe-9a18', type: 'agent.run',             state: 'failed',    runtime: '00:01:02', retries: 5, payload: '22.1 KB' },
  { id: 'job_05a9-3411', type: 'webhook.deliver',       state: 'queued',    runtime: '—',        retries: 1, payload: '1.4 KB'  },
  { id: 'job_60e2-8b7d', type: 'org.export',            state: 'completed', runtime: '00:14:22', retries: 0, payload: '512 MB'  },
  { id: 'job_18c7-4a55', type: 'agent.run',             state: 'completed', runtime: '00:03:09', retries: 0, payload: '9.6 KB'  },
  { id: 'job_a3d4-6f10', type: 'billing.usage.rollup',  state: 'queued',    runtime: '—',        retries: 0, payload: '4.0 KB'  },
];

type Flag = {
  id: string;
  description: string;
  rollout: number;
  enabled: boolean;
  acmeForced: boolean;
};

const FLAGS_SEED: Flag[] = [
  { id: 'agents-v2',           description: 'Next-gen agent runtime with streaming tools.',          rollout: 42,  enabled: true,  acmeForced: true  },
  { id: 'chat-multimodel',     description: 'Allow switching models mid-conversation.',              rollout: 100, enabled: true,  acmeForced: false },
  { id: 'inline-fix-pipeline', description: 'Render fix pipeline status inline in PR conversations.',rollout: 75,  enabled: true,  acmeForced: true  },
  { id: 'billing-portal-v3',   description: 'Updated billing UI with annual prepay flow.',           rollout: 18,  enabled: true,  acmeForced: false },
  { id: 'sso-okta-scim',       description: 'SCIM provisioning for Okta SSO tenants.',               rollout: 60,  enabled: true,  acmeForced: false },
  { id: 'ai-policy-overrides', description: 'Per-workspace overrides on org-level AI policies.',     rollout: 25,  enabled: false, acmeForced: false },
  { id: 'data-export-async',   description: 'Move org export to async background job.',              rollout: 100, enabled: true,  acmeForced: false },
  { id: 'autoscaler-v2',       description: 'New scheduler for background job pool.',                rollout: 8,   enabled: false, acmeForced: false },
];

// ─────────────────────────────────────────────────────────────────────────
// Page

export default function AdminPage() {
  const [flags, setFlags] = useState<Flag[]>(FLAGS_SEED);
  const [userQ, setUserQ] = useState('');

  const filteredUsers = useMemo(() => {
    if (!userQ.trim()) return USERS;
    const needle = userQ.toLowerCase();
    return USERS.filter((u) =>
      u.name.toLowerCase().includes(needle)
      || u.email.toLowerCase().includes(needle)
      || u.org.toLowerCase().includes(needle));
  }, [userQ]);

  const toggleFlag = (id: string, patch: Partial<Flag>) => {
    setFlags((all) => all.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  return (
    <AdminShell active="overview">
      {/* Header */}
      <header className="flex flex-col gap-1 mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
          Super-admin
        </h1>
        <p className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>
          Internal operator dashboard
        </p>
      </header>

      {/* Stats band */}
      <div
        className="grid mb-8 rounded-md overflow-hidden"
        style={{
          gridTemplateColumns: 'repeat(4, 1fr)',
          background: 'var(--bg-canvas)',
          border: '1px solid var(--border-default)',
        }}
      >
        <Stat label="Active orgs" value="1,284" />
        <Stat label="Active users" value="42,392" />
        <Stat label="Failed jobs · last hour" value="3" tone="warn" />
        <Stat label="Monthly revenue" value="$1.4M" last />
      </div>

      <SectionDivider />

      {/* Recent organizations */}
      <SectionHeader
        eyebrow="Organizations"
        title="Recent organizations"
        hint="The 10 most recently active tenants. Use Impersonate to enter their workspace as a read-only operator."
      />
      <OrgsTable />

      <SectionDivider />

      {/* Users search */}
      <SectionHeader
        eyebrow="Users"
        title="User search"
        hint="Find any user across all orgs. Impersonation always opens a logged session."
      />
      <div className="mb-3">
        <UserSearchInput q={userQ} onChange={setUserQ} />
      </div>
      <UsersTable users={filteredUsers} />

      <SectionDivider />

      {/* Background jobs */}
      <SectionHeader
        eyebrow="Jobs"
        title="Background jobs"
        hint="Live worker activity across the cluster. Killed jobs do not auto-retry."
      />
      <JobsTable />

      <SectionDivider />

      {/* Feature flags */}
      <SectionHeader
        eyebrow="Flags"
        title="Feature flags"
        hint="Toggle global rollout, force-on for ACME (the design-partner tenant), or edit cohorts."
      />
      <FlagsList flags={flags} onChange={toggleFlag} />

      <SectionDivider />

      {/* Data tools */}
      <SectionHeader
        eyebrow="Data"
        title="Data tools"
        hint="Privileged operations. Each opens an interstitial with a typed-confirmation step."
      />
      <DataToolsGrid />

      <SectionDivider />

      {/* Danger band */}
      <DangerBand />
    </AdminShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Shared section chrome

function SectionDivider() {
  return (
    <div
      aria-hidden
      className="my-10 h-px w-full"
      style={{ background: 'var(--border-muted)' }}
    />
  );
}

function SectionHeader({
  eyebrow, title, hint,
}: { eyebrow: string; title: string; hint: string }) {
  return (
    <header className="flex flex-col gap-1 mb-4">
      <span
        className="text-[10px] uppercase tracking-[0.14em] font-semibold"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {eyebrow}
      </span>
      <h2 className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
        {title}
      </h2>
      <p className="text-[12px] leading-snug max-w-[640px]" style={{ color: 'var(--fg-muted)' }}>
        {hint}
      </p>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Stat band

function Stat({
  label, value, tone, last = false,
}: { label: string; value: string; tone?: 'warn'; last?: boolean }) {
  const valueColor = tone === 'warn' ? 'var(--intent-warn-fg)' : 'var(--fg-strong)';
  return (
    <div
      className="flex flex-col gap-1 px-4 py-3"
      style={{ borderRight: last ? 'none' : '1px solid var(--border-muted)' }}
    >
      <span
        className="text-[10px] uppercase tracking-[0.14em] font-semibold"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {label}
      </span>
      <span className="text-[20px] font-semibold tabular-nums" style={{ color: valueColor }}>
        {value}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Orgs table

function OrgsTable() {
  return (
    <div
      className="rounded-md overflow-hidden"
      style={{ border: '1px solid var(--border-muted)' }}
    >
      <div
        className="grid items-center px-3 h-9 text-[10px] uppercase tracking-[0.14em] font-semibold"
        style={{
          gridTemplateColumns: '1.6fr 90px 80px 110px 110px 32px',
          gap: 12,
          background: 'var(--bg-surface-muted)',
          color: 'var(--fg-subtle)',
          borderBottom: '1px solid var(--border-muted)',
        }}
      >
        <span>Organization</span>
        <span>Plan</span>
        <span className="text-right">Members</span>
        <span className="text-right">Monthly</span>
        <span>Signed up</span>
        <span />
      </div>
      {ORGS.map((o) => <OrgRow key={o.id} org={o} />)}
    </div>
  );
}

function OrgRow({ org }: { org: Org }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div
      className="grid items-center px-3 h-12 text-[12px] transition-colors"
      style={{
        gridTemplateColumns: '1.6fr 90px 80px 110px 110px 32px',
        gap: 12,
        borderTop: '1px solid var(--border-muted)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0"
          style={{
            background: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-muted)',
            color: 'var(--fg-default)',
          }}
        >
          {org.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex flex-col min-w-0 gap-0.5">
          <span className="font-medium truncate" style={{ color: 'var(--fg-strong)' }}>
            {org.name}
          </span>
          <span className="text-[11px] font-mono truncate" style={{ color: 'var(--fg-muted)' }}>
            {org.slug}
          </span>
        </div>
      </div>

      <PlanBadge plan={org.plan} />

      <span className="tabular-nums text-right" style={{ color: 'var(--fg-default)' }}>
        {formatNumber(org.members)}
      </span>

      <span className="tabular-nums text-right" style={{ color: 'var(--fg-default)' }}>
        ${formatNumber(org.spend)}
      </span>

      <span className="tabular-nums text-[11px]" style={{ color: 'var(--fg-muted)' }}>
        {org.signedUp}
      </span>

      <div className="relative flex justify-end">
        <button
          type="button"
          onClick={() => { setMenuOpen((v) => !v); }}
          className="w-7 h-7 rounded-md inline-flex items-center justify-center transition-colors"
          style={{ color: 'var(--fg-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-active)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          aria-label="Org actions"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
        {menuOpen && (
          <RowMenu onClose={() => { setMenuOpen(false); }}>
            <RowMenuItem label="Impersonate" onClick={() => { setMenuOpen(false); }} />
            <RowMenuItem label="Suspend" onClick={() => { setMenuOpen(false); }} />
            <RowMenuItem label="Delete" onClick={() => { setMenuOpen(false); }} danger />
          </RowMenu>
        )}
      </div>
    </div>
  );
}

function PlanBadge({ plan }: { plan: Plan }) {
  const labels: Record<Plan, string> = {
    free: 'Free', team: 'Team', business: 'Business', enterprise: 'Enterprise',
  };
  // Neutral, full-perimeter pill — no left stripe.
  const tone = (() => {
    switch (plan) {
      case 'enterprise': return { bg: 'var(--intent-info-bg)',    fg: 'var(--intent-info-fg)' };
      case 'business':   return { bg: 'var(--intent-success-bg)', fg: 'var(--intent-success-fg)' };
      case 'team':       return { bg: 'var(--bg-surface-muted)',  fg: 'var(--fg-default)' };
      default:           return { bg: 'var(--bg-surface-muted)',  fg: 'var(--fg-muted)' };
    }
  })();
  return (
    <span
      className="inline-flex items-center text-[10px] uppercase tracking-[0.14em] font-semibold px-1.5 py-0.5 rounded"
      style={{
        background: tone.bg,
        color: tone.fg,
        border: `1px solid ${tone.fg}`,
        width: 'fit-content',
      }}
    >
      {labels[plan]}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Users table

function UserSearchInput({ q, onChange }: { q: string; onChange: (v: string) => void }) {
  return (
    <div
      className="flex items-center gap-2 h-9 px-2.5 rounded-md"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-default)',
        maxWidth: 360,
      }}
    >
      <Search className="w-3.5 h-3.5" style={{ color: 'var(--fg-subtle)' }} />
      <input
        value={q}
        onChange={(e) => { onChange(e.target.value); }}
        placeholder="Search by name, email, org slug…"
        className="flex-1 bg-transparent outline-none text-[12px]"
        style={{ color: 'var(--fg-strong)' }}
      />
    </div>
  );
}

function UsersTable({ users }: { users: AdminUser[] }) {
  return (
    <div
      className="rounded-md overflow-hidden"
      style={{ border: '1px solid var(--border-muted)' }}
    >
      <div
        className="grid items-center px-3 h-9 text-[10px] uppercase tracking-[0.14em] font-semibold"
        style={{
          gridTemplateColumns: '1.4fr 1.4fr 110px 110px 100px 110px',
          gap: 12,
          background: 'var(--bg-surface-muted)',
          color: 'var(--fg-subtle)',
          borderBottom: '1px solid var(--border-muted)',
        }}
      >
        <span>Name</span>
        <span>Email</span>
        <span>Org</span>
        <span>Last sign-in</span>
        <span>Status</span>
        <span />
      </div>
      {users.length === 0 ? (
        <div className="py-8 text-center text-[12px]" style={{ color: 'var(--fg-subtle)' }}>
          No users matched.
        </div>
      ) : (
        users.map((u) => <UserRow key={u.id} user={u} />)
      )}
    </div>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  return (
    <div
      className="grid items-center px-3 h-11 text-[12px] transition-colors"
      style={{
        gridTemplateColumns: '1.4fr 1.4fr 110px 110px 100px 110px',
        gap: 12,
        borderTop: '1px solid var(--border-muted)',
        opacity: user.status === 'suspended' ? 0.6 : 1,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <span className="font-medium truncate" style={{ color: 'var(--fg-strong)' }}>
        {user.name}
      </span>
      <span className="truncate" style={{ color: 'var(--fg-default)' }}>
        {user.email}
      </span>
      <span className="font-mono text-[11px] truncate" style={{ color: 'var(--fg-muted)' }}>
        {user.org}
      </span>
      <span className="tabular-nums text-[11px]" style={{ color: 'var(--fg-muted)' }}>
        {user.lastSignIn}
      </span>
      <UserStatusPill status={user.status} />
      <div className="flex justify-end">
        <Button>Impersonate</Button>
      </div>
    </div>
  );
}

function UserStatusPill({ status }: { status: UserStatus }) {
  const tone = (() => {
    switch (status) {
      case 'active':    return { bg: 'var(--intent-success-bg)', fg: 'var(--intent-success-fg)' };
      case 'invited':   return { bg: 'var(--intent-warn-bg)',    fg: 'var(--intent-warn-fg)' };
      case 'suspended': return { bg: 'var(--intent-danger-bg)',  fg: 'var(--intent-danger-fg)' };
    }
  })();
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] font-semibold px-1.5 py-0.5 rounded"
      style={{
        background: tone.bg,
        color: tone.fg,
        border: `1px solid ${tone.fg}`,
        width: 'fit-content',
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: tone.fg }}
      />
      {status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Jobs table

function JobsTable() {
  return (
    <div
      className="rounded-md overflow-hidden"
      style={{ border: '1px solid var(--border-muted)' }}
    >
      <div
        className="grid items-center px-3 h-9 text-[10px] uppercase tracking-[0.14em] font-semibold"
        style={{
          gridTemplateColumns: '160px 1.2fr 110px 90px 70px 80px 130px',
          gap: 12,
          background: 'var(--bg-surface-muted)',
          color: 'var(--fg-subtle)',
          borderBottom: '1px solid var(--border-muted)',
        }}
      >
        <span>Job ID</span>
        <span>Type</span>
        <span>State</span>
        <span>Runtime</span>
        <span className="text-right">Retries</span>
        <span className="text-right">Payload</span>
        <span />
      </div>
      {JOBS.map((j) => <JobRow key={j.id} job={j} />)}
    </div>
  );
}

function JobRow({ job }: { job: Job }) {
  const isFailed = job.state === 'failed';
  return (
    <div
      className="grid items-center px-3 h-11 text-[12px] transition-colors"
      style={{
        gridTemplateColumns: '160px 1.2fr 110px 90px 70px 80px 130px',
        gap: 12,
        borderTop: '1px solid var(--border-muted)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <span className="font-mono text-[11px] truncate" style={{ color: 'var(--fg-default)' }}>
        {job.id}
      </span>
      <span className="font-mono text-[11px] truncate" style={{ color: 'var(--fg-muted)' }}>
        {job.type}
      </span>
      <JobStatePill state={job.state} />
      <span className="tabular-nums text-[11px]" style={{ color: 'var(--fg-muted)' }}>
        {job.runtime}
      </span>
      <span
        className="tabular-nums text-right text-[11px]"
        style={{ color: job.retries > 0 ? 'var(--intent-warn-fg)' : 'var(--fg-muted)' }}
      >
        {job.retries}
      </span>
      <span className="tabular-nums text-right text-[11px]" style={{ color: 'var(--fg-muted)' }}>
        {job.payload}
      </span>
      <div className="flex items-center justify-end gap-1.5">
        {isFailed ? (
          <Button leading={<RefreshCw className="w-3 h-3" />}>Re-run</Button>
        ) : (
          <Button leading={<RefreshCw className="w-3 h-3" />} disabled={job.state === 'completed'}>
            Re-run
          </Button>
        )}
        <Button variant="ghost">Kill</Button>
      </div>
    </div>
  );
}

function JobStatePill({ state }: { state: JobState }) {
  const cfg = (() => {
    switch (state) {
      case 'running':   return { bg: 'var(--intent-info-bg)',    fg: 'var(--intent-info-fg)',    Icon: Activity };
      case 'queued':    return { bg: 'var(--intent-warn-bg)',    fg: 'var(--intent-warn-fg)',    Icon: Clock };
      case 'failed':    return { bg: 'var(--intent-danger-bg)',  fg: 'var(--intent-danger-fg)',  Icon: XCircle };
      case 'completed': return { bg: 'var(--intent-success-bg)', fg: 'var(--intent-success-fg)', Icon: CheckCircle2 };
    }
  })();
  const Icon = cfg.Icon;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] font-semibold px-1.5 py-0.5 rounded"
      style={{
        background: cfg.bg,
        color: cfg.fg,
        border: `1px solid ${cfg.fg}`,
        width: 'fit-content',
      }}
    >
      <Icon className="w-2.5 h-2.5" />
      {state}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Feature flags

function FlagsList({
  flags, onChange,
}: { flags: Flag[]; onChange: (id: string, patch: Partial<Flag>) => void }) {
  return (
    <div
      className="rounded-md overflow-hidden"
      style={{ border: '1px solid var(--border-muted)' }}
    >
      {flags.map((f, i) => (
        <div
          key={f.id}
          className="grid items-center px-3 py-3 text-[12px] transition-colors"
          style={{
            gridTemplateColumns: '1.6fr 130px 100px 80px',
            gap: 16,
            borderTop: i === 0 ? 'none' : '1px solid var(--border-muted)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <div className="flex flex-col min-w-0 gap-0.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
                {f.id}
              </span>
              {f.enabled ? null : (
                <span
                  className="text-[9px] uppercase tracking-[0.14em] font-semibold px-1.5 py-0.5 rounded"
                  style={{
                    background: 'var(--bg-surface-muted)',
                    color: 'var(--fg-muted)',
                    border: '1px solid var(--border-muted)',
                  }}
                >
                  off
                </span>
              )}
            </div>
            <span className="text-[11px] truncate" style={{ color: 'var(--fg-muted)' }}>
              {f.description}
            </span>
          </div>

          <RolloutBar pct={f.rollout} dim={!f.enabled} />

          <div className="flex items-center gap-2 justify-start">
            <Toggle
              checked={f.acmeForced}
              onChange={(v) => { onChange(f.id, { acmeForced: v }); }}
              label={`Force on for ACME ${f.id}`}
            />
            <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
              ACME
            </span>
          </div>

          <button
            type="button"
            className="text-[11px] font-medium inline-flex items-center gap-1 justify-end"
            style={{ color: 'var(--fg-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--fg-strong)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fg-muted)'; }}
          >
            Edit cohort
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

function RolloutBar({ pct, dim }: { pct: number; dim: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 h-1.5 rounded-full overflow-hidden"
        style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}
      >
        <div
          className="h-full"
          style={{
            width: `${pct}%`,
            background: pct >= 75 ? 'var(--intent-success-fg)'
              : pct >= 25 ? 'var(--brand-vivid)'
              :             'var(--fg-subtle)',
            opacity: dim ? 0.4 : 0.9,
          }}
        />
      </div>
      <span
        className="tabular-nums text-[11px] font-medium w-8 text-right"
        style={{ color: 'var(--fg-muted)' }}
      >
        {pct}%
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Data tools

function DataToolsGrid() {
  const tools = [
    { id: 't1', icon: Terminal, title: 'Run SQL query',       desc: 'Read-only access to the analytics replica.' },
    { id: 't2', icon: Download, title: 'Export org data',     desc: 'Generate a signed URL with full tenant export.' },
    { id: 't3', icon: RefreshCw, title: 'Re-index search',    desc: 'Rebuild the search index for one or all tenants.' },
    { id: 't4', icon: Play,     title: 'Replay event stream', desc: 'Re-emit events in a time window for one tenant.' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {tools.map((t) => {
        const Icon = t.icon;
        return (
          <div
            key={t.id}
            className="flex flex-col gap-3 p-4 rounded-md"
            style={{
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-default)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-canvas)'; }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
                style={{
                  background: 'var(--bg-surface-muted)',
                  border: '1px solid var(--border-muted)',
                  color: 'var(--fg-default)',
                }}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0 gap-0.5">
                <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
                  {t.title}
                </span>
                <span className="text-[11px] leading-snug" style={{ color: 'var(--fg-muted)' }}>
                  {t.desc}
                </span>
              </div>
            </div>
            <div className="flex justify-end">
              <Button leading={<Database className="w-3 h-3" />}>Open</Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Danger band

function DangerBand() {
  return (
    <div
      className="flex items-start gap-3 p-4 rounded-md"
      style={{
        background: 'var(--intent-danger-bg)',
        border: '1px solid var(--intent-danger-fg)',
        color: 'var(--intent-danger-fg)',
      }}
    >
      <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-[12px] font-semibold uppercase tracking-[0.14em]">
          Audit logging is mandatory
        </span>
        <p className="text-[12px] leading-snug" style={{ opacity: 0.9 }}>
          Every action here is logged with operator identity, IP, and timestamp.
          Impersonation sessions are visible to the target organization&apos;s owners
          and security contacts. Treat this surface as a recorded environment.
        </p>
      </div>
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 opacity-60" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Reusable row menu

function RowMenu({
  onClose, children,
}: { onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div
        className="absolute right-0 top-full mt-1 z-40 min-w-[160px] py-1 rounded-md"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {children}
      </div>
    </>
  );
}

function RowMenuItem({
  label, onClick, danger = false,
}: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center px-2.5 h-8 text-[12px] text-left transition-colors"
      style={{ color: danger ? 'var(--intent-danger-fg)' : 'var(--fg-default)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {label}
    </button>
  );
}
