import { useMemo, useState } from 'react';
import {
  UserPlus, Filter, X, UserMinus,
} from 'lucide-react';
import { OrgShell } from '../parts/OrgShell';
import { Button } from '@shared/ui/forms';
import {
  ConfirmDialog, SearchInput, EmptyState,
} from '@shared/ui';
import { Row, BulkCheckbox } from './parts/members/MemberRow';
import { InviteModal } from './parts/members/InviteModal';
import type { Member, Role } from './parts/members/types';

const SEED: Member[] = [
  { id: 'u1',  name: 'Sora Kim',     email: 'sora@acme.com',     role: 'owner',   status: 'active',     team: 'Platform',    lastActive: '2m ago',   avatar: 'SK', twoFA: true  },
  { id: 'u2',  name: 'Lee Junho',    email: 'junho@acme.com',    role: 'admin',   status: 'active',     team: 'Platform',    lastActive: '14m ago',  avatar: 'LJ', twoFA: true  },
  { id: 'u3',  name: 'Mei Wang',     email: 'mei@acme.com',      role: 'admin',   status: 'active',     team: 'Security',    lastActive: '1h ago',   avatar: 'MW', twoFA: true  },
  { id: 'u4',  name: 'Brad Lee',     email: 'brad@acme.com',     role: 'member',  status: 'active',     team: 'Frontend',    lastActive: '3h ago',   avatar: 'BL', twoFA: true  },
  { id: 'u5',  name: 'Hana Park',    email: 'hana@acme.com',     role: 'member',  status: 'active',     team: 'Frontend',    lastActive: '5h ago',   avatar: 'HP', twoFA: false },
  { id: 'u6',  name: 'Diego Ramos',  email: 'diego@acme.com',    role: 'member',  status: 'active',     team: 'Backend',     lastActive: '8h ago',   avatar: 'DR', twoFA: true  },
  { id: 'u7',  name: 'Aoi Tanaka',   email: 'aoi@acme.com',      role: 'member',  status: 'active',     team: 'Backend',     lastActive: '1d ago',   avatar: 'AT', twoFA: true  },
  { id: 'u8',  name: 'Kofi Mensah',  email: 'kofi@acme.com',     role: 'member',  status: 'active',     team: 'Data',        lastActive: '1d ago',   avatar: 'KM', twoFA: false },
  { id: 'u9',  name: 'Priya Singh',  email: 'priya@acme.com',    role: 'billing', status: 'active',     team: 'Finance',     lastActive: '2d ago',   avatar: 'PS', twoFA: true  },
  { id: 'u10', name: 'Noa Cohen',    email: 'noa@acme.com',      role: 'member',  status: 'invited',    team: '—',           lastActive: 'invited',  avatar: 'NC', twoFA: false },
  { id: 'u11', name: 'James Park',   email: 'james@partner.io',  role: 'guest',   status: 'invited',    team: 'Partner',     lastActive: 'invited',  avatar: 'JP', twoFA: false },
  { id: 'u12', name: 'Yuki Sato',    email: 'yuki@acme.com',     role: 'member',  status: 'deactivated',team: 'Frontend',    lastActive: '12d ago',  avatar: 'YS', twoFA: true  },
];

type StatusFilter = 'all' | 'active' | 'invited' | 'deactivated';
type RoleFilter   = 'all' | Role;

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>(SEED);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter]     = useState<RoleFilter>('all');
  const [bulk, setBulk] = useState<Set<string>>(new Set());
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<Member | null>(null);

  const counts = useMemo(() => ({
    all:         members.length,
    active:      members.filter((m) => m.status === 'active').length,
    invited:     members.filter((m) => m.status === 'invited').length,
    deactivated: members.filter((m) => m.status === 'deactivated').length,
  }), [members]);

  const filtered = useMemo(() => {
    let out = members;
    if (statusFilter !== 'all') out = out.filter((m) => m.status === statusFilter);
    if (roleFilter !== 'all')   out = out.filter((m) => m.role === roleFilter);
    if (q.trim()) {
      const needle = q.toLowerCase();
      out = out.filter((m) =>
        m.name.toLowerCase().includes(needle)
        || m.email.toLowerCase().includes(needle)
        || m.team.toLowerCase().includes(needle));
    }
    return out;
  }, [members, statusFilter, roleFilter, q]);

  const toggleBulk = (id: string) => {
    setBulk((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleBulkAll = () => {
    if (bulk.size === filtered.length) setBulk(new Set());
    else setBulk(new Set(filtered.map((m) => m.id)));
  };

  const updateRole = (id: string, role: Role) => {
    setMembers((all) => all.map((m) => (m.id === id ? { ...m, role } : m)));
  };
  const deactivate = (id: string) => {
    setMembers((all) => all.map((m) => (m.id === id ? { ...m, status: 'deactivated' as const } : m)));
  };
  const reactivate = (id: string) => {
    setMembers((all) => all.map((m) => (m.id === id ? { ...m, status: 'active' as const } : m)));
  };
  const remove = (id: string) => {
    setMembers((all) => all.filter((m) => m.id !== id));
    setBulk((prev) => { const n = new Set(prev); n.delete(id); return n; });
  };
  const resendInvite = (_id: string) => { /* demo no-op */ };

  return (
    <OrgShell
      orgName="ACME, Inc."
      orgSlug="acme"
      title="Members"
      subtitle="People who can access this organization. Invite by email, change roles, or deactivate access."
      topRight={
        <div className="flex items-center gap-1.5">
          {bulk.size > 0 && (
            <>
              <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                {bulk.size} selected
              </span>
              <Button
                leading={<UserMinus className="w-3 h-3" />}
                onClick={() => {
                  setMembers((all) => all.map((m) => (bulk.has(m.id) ? { ...m, status: 'deactivated' as const } : m)));
                  setBulk(new Set());
                }}
              >
                Deactivate
              </Button>
              <Button variant="ghost" onClick={() => { setBulk(new Set()); }}>
                <X className="w-3 h-3" />
              </Button>
            </>
          )}
          <Button
            variant="primary"
            size="md"
            leading={<UserPlus className="w-3.5 h-3.5" />}
            onClick={() => { setInviteOpen(true); }}
          >
            Invite people
          </Button>
        </div>
      }
    >
      {/* Toolbar: status pills + role filter + search */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-1">
          {(['all', 'active', 'invited', 'deactivated'] as StatusFilter[]).map((id) => {
            const active = statusFilter === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => { setStatusFilter(id); }}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-sm font-medium transition-colors"
                style={{
                  background: active ? 'var(--bg-active)' : 'transparent',
                  color: active ? 'var(--fg-strong)' : 'var(--fg-muted)',
                  border: `1px solid ${active ? 'var(--border-default)' : 'transparent'}`,
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <span className="capitalize">{id}</span>
                <span
                  className="text-xs tabular-nums px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--bg-surface-muted)', color: 'var(--fg-subtle)' }}
                >
                  {counts[id]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <RoleFilterMenu value={roleFilter} onChange={setRoleFilter} />
          <SearchInput value={q} onChange={setQ} placeholder="Search name, email, team…" minWidth={220} />
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-md overflow-hidden"
        style={{ border: '1px solid var(--border-muted)' }}
      >
        <div
          className="grid items-center px-3 h-9 text-xs uppercase tracking-eyebrow font-semibold"
          style={{
            gridTemplateColumns: '24px 1fr 140px 130px 110px 32px',
            gap: 12,
            background: 'var(--bg-surface-muted)',
            color: 'var(--fg-subtle)',
            borderBottom: '1px solid var(--border-muted)',
          }}
        >
          <BulkCheckbox
            checked={filtered.length > 0 && bulk.size === filtered.length}
            indeterminate={bulk.size > 0 && bulk.size < filtered.length}
            onChange={toggleBulkAll}
          />
          <span>Member</span>
          <span>Role</span>
          <span>Team</span>
          <span>Last active</span>
          <span />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title={q ? `No matches for "${q}"` : 'No people match this filter'}
            subtitle="Try a different keyword or clear the filter."
          />
        ) : (
          filtered.map((m) => (
            <Row
              key={m.id}
              member={m}
              bulkOn={bulk.has(m.id)}
              onToggleBulk={() => { toggleBulk(m.id); }}
              onRoleChange={(r) => { updateRole(m.id, r); }}
              onDeactivate={() => { deactivate(m.id); }}
              onReactivate={() => { reactivate(m.id); }}
              onRemove={() => { setConfirmRemove(m); }}
              onResend={() => { resendInvite(m.id); }}
            />
          ))
        )}
      </div>

      <p className="text-sm mt-3 px-1" style={{ color: 'var(--fg-subtle)' }}>
        {filtered.length} of {members.length} {members.length === 1 ? 'person' : 'people'} ·
        {' '}Owner cannot be removed without first transferring ownership.
      </p>

      {inviteOpen && <InviteModal onClose={() => { setInviteOpen(false); }} />}
      {confirmRemove && (
        <ConfirmDialog
          open
          onCancel={() => { setConfirmRemove(null); }}
          onConfirm={() => { remove(confirmRemove.id); setConfirmRemove(null); }}
          title={`Remove ${confirmRemove.name}?`}
          confirmLabel="Remove"
          description="Their access to this organization will end immediately. Their authored work stays attributed to them. This action can't be undone."
        />
      )}
    </OrgShell>
  );
}

function RoleFilterMenu({
  value, onChange,
}: { value: RoleFilter; onChange: (v: RoleFilter) => void }) {
  return (
    <div className="relative inline-flex items-center">
      <Filter
        className="w-3.5 h-3.5 absolute left-2 pointer-events-none"
        style={{ color: 'var(--fg-subtle)' }}
      />
      <select
        value={value}
        onChange={(e) => { onChange(e.target.value as RoleFilter); }}
        className="h-8 pl-7 pr-2 rounded-md text-base outline-none cursor-pointer"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-default)',
          color: 'var(--fg-strong)',
          minWidth: 130,
        }}
      >
        <option value="all">All roles</option>
        <option value="owner">Owner</option>
        <option value="admin">Admin</option>
        <option value="member">Member</option>
        <option value="billing">Billing</option>
        <option value="guest">Guest</option>
      </select>
    </div>
  );
}
