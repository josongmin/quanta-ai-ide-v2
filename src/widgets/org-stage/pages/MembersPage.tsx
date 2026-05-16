import { useMemo, useRef, useState } from 'react';
import {
  Search, UserPlus, MoreHorizontal, Mail, Shield, Trash2,
  UserMinus, ArrowRightLeft, Check, X, Copy, AlertTriangle, Filter,
} from 'lucide-react';
import { OrgShell } from '../parts/OrgShell';
import { Button } from '@shared/ui/forms';

type Role = 'owner' | 'admin' | 'member' | 'billing' | 'guest';
type Status = 'active' | 'invited' | 'deactivated';

type Member = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: Status;
  team: string;
  lastActive: string;
  avatar: string;
  twoFA: boolean;
};

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
              <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
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
                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors"
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
                  className="text-[10px] tabular-nums px-1.5 py-0.5 rounded"
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
          <SearchInput q={q} onChange={setQ} />
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-md overflow-hidden"
        style={{ border: '1px solid var(--border-muted)' }}
      >
        <div
          className="grid items-center px-3 h-9 text-[10px] uppercase tracking-[0.14em] font-semibold"
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
          <EmptyRow q={q} />
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

      <p className="text-[11px] mt-3 px-1" style={{ color: 'var(--fg-subtle)' }}>
        {filtered.length} of {members.length} {members.length === 1 ? 'person' : 'people'} ·
        {' '}Owner cannot be removed without first transferring ownership.
      </p>

      {inviteOpen && <InviteModal onClose={() => { setInviteOpen(false); }} />}
      {confirmRemove && (
        <ConfirmRemove
          member={confirmRemove}
          onCancel={() => { setConfirmRemove(null); }}
          onConfirm={() => { remove(confirmRemove.id); setConfirmRemove(null); }}
        />
      )}
    </OrgShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Row

function Row({
  member, bulkOn, onToggleBulk, onRoleChange, onDeactivate, onReactivate, onRemove, onResend,
}: {
  member: Member;
  bulkOn: boolean;
  onToggleBulk: () => void;
  onRoleChange: (r: Role) => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onRemove: () => void;
  onResend: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isOwner = member.role === 'owner';
  const isInvited = member.status === 'invited';
  const isDeactivated = member.status === 'deactivated';

  return (
    <div
      role="row"
      className="grid items-center px-3 h-12 text-[12px] transition-colors"
      style={{
        gridTemplateColumns: '24px 1fr 140px 130px 110px 32px',
        gap: 12,
        borderTop: '1px solid var(--border-muted)',
        opacity: isDeactivated ? 0.55 : 1,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <BulkCheckbox checked={bulkOn} onChange={onToggleBulk} disabled={isOwner} />

      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
          style={{
            background: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-muted)',
            color: 'var(--fg-default)',
          }}
        >
          {member.avatar}
        </div>
        <div className="flex flex-col min-w-0 gap-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-medium truncate" style={{ color: 'var(--fg-strong)' }}>
              {member.name}
            </span>
            <StatusBadge status={member.status} />
            {member.twoFA && (
              <span title="2FA enabled">
                <Shield className="w-3 h-3" style={{ color: 'var(--intent-success-fg)' }} />
              </span>
            )}
          </div>
          <span className="text-[11px] truncate" style={{ color: 'var(--fg-muted)' }}>
            {member.email}
          </span>
        </div>
      </div>

      <RoleSelect value={member.role} onChange={onRoleChange} disabled={isOwner || isDeactivated} />

      <span className="truncate" style={{ color: 'var(--fg-default)' }}>{member.team}</span>

      <span className="tabular-nums text-[11px]" style={{ color: 'var(--fg-muted)' }}>
        {member.lastActive}
      </span>

      <div className="relative flex justify-end">
        <button
          type="button"
          onClick={() => { setMenuOpen((v) => !v); }}
          className="w-7 h-7 rounded-md inline-flex items-center justify-center transition-colors"
          style={{ color: 'var(--fg-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-active)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          aria-label="Row actions"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
        {menuOpen && (
          <RowMenu
            onClose={() => { setMenuOpen(false); }}
            isOwner={isOwner}
            isInvited={isInvited}
            isDeactivated={isDeactivated}
            onDeactivate={() => { onDeactivate(); setMenuOpen(false); }}
            onReactivate={() => { onReactivate(); setMenuOpen(false); }}
            onRemove={() => { onRemove(); setMenuOpen(false); }}
            onResend={() => { onResend(); setMenuOpen(false); }}
          />
        )}
      </div>
    </div>
  );
}

function RowMenu({
  onClose, isOwner, isInvited, isDeactivated, onDeactivate, onReactivate, onRemove, onResend,
}: {
  onClose: () => void;
  isOwner: boolean;
  isInvited: boolean;
  isDeactivated: boolean;
  onDeactivate: () => void;
  onReactivate: () => void;
  onRemove: () => void;
  onResend: () => void;
}) {
  // Outside-click closer: render a fixed dismiss layer behind the menu.
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div
        className="absolute right-0 top-full mt-1 z-40 min-w-[180px] py-1 rounded-md"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {isInvited && (
          <MenuItem icon={Mail} label="Resend invite" onClick={onResend} />
        )}
        {!isOwner && !isDeactivated && (
          <MenuItem icon={UserMinus} label="Deactivate" onClick={onDeactivate} />
        )}
        {isDeactivated && (
          <MenuItem icon={Check} label="Reactivate" onClick={onReactivate} />
        )}
        {isOwner ? (
          <MenuItem icon={ArrowRightLeft} label="Transfer ownership" disabled />
        ) : (
          <MenuItem icon={Trash2} label="Remove from org" onClick={onRemove} danger />
        )}
      </div>
    </>
  );
}

function MenuItem({
  icon: Icon, label, onClick, danger = false, disabled = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-2 px-2.5 h-8 text-[12px] text-left transition-colors"
      style={{
        color: disabled
          ? 'var(--fg-subtle)'
          : danger ? 'var(--intent-danger-fg)' : 'var(--fg-default)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Cells

function StatusBadge({ status }: { status: Status }) {
  if (status === 'active') return null;
  const tone = status === 'invited' ? 'warn' : 'neutral';
  return (
    <span
      className="text-[9px] uppercase tracking-[0.14em] font-semibold px-1.5 py-0.5 rounded"
      style={{
        background: tone === 'warn' ? 'var(--intent-warn-bg)' : 'var(--bg-surface-muted)',
        color: tone === 'warn' ? 'var(--intent-warn-fg)' : 'var(--fg-muted)',
        border: `1px solid ${tone === 'warn' ? 'var(--intent-warn-fg)' : 'var(--border-muted)'}`,
      }}
    >
      {status}
    </span>
  );
}

function RoleSelect({
  value, onChange, disabled,
}: { value: Role; onChange: (v: Role) => void; disabled: boolean }) {
  return (
    <select
      value={value}
      onChange={(e) => { onChange(e.target.value as Role); }}
      disabled={disabled}
      className="h-7 rounded-md px-2 text-[12px] outline-none cursor-pointer w-full"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-default)',
        color: 'var(--fg-strong)',
        opacity: disabled ? 0.7 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <option value="owner">Owner</option>
      <option value="admin">Admin</option>
      <option value="member">Member</option>
      <option value="billing">Billing</option>
      <option value="guest">Guest</option>
    </select>
  );
}

function BulkCheckbox({
  checked, onChange, disabled = false, indeterminate = false,
}: { checked: boolean; onChange: () => void; disabled?: boolean; indeterminate?: boolean }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className="w-4 h-4 rounded shrink-0 inline-flex items-center justify-center transition-colors"
      style={{
        background: checked || indeterminate ? 'var(--brand-vivid)' : 'transparent',
        border: `1.5px solid ${checked || indeterminate ? 'var(--brand-vivid)' : 'var(--border-strong)'}`,
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {indeterminate && !checked && (
        <span className="w-2 h-[1.5px]" style={{ background: 'var(--bg-canvas)' }} />
      )}
      {checked && <Check className="w-2.5 h-2.5" style={{ color: 'var(--bg-canvas)' }} />}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Toolbar bits

function SearchInput({ q, onChange }: { q: string; onChange: (v: string) => void }) {
  return (
    <div
      className="flex items-center gap-2 h-8 px-2.5 rounded-md"
      style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', minWidth: 220 }}
    >
      <Search className="w-3.5 h-3.5" style={{ color: 'var(--fg-subtle)' }} />
      <input
        value={q}
        onChange={(e) => { onChange(e.target.value); }}
        placeholder="Search name, email, team…"
        className="flex-1 bg-transparent outline-none text-[12px]"
        style={{ color: 'var(--fg-strong)' }}
      />
      {q && (
        <button
          type="button"
          onClick={() => { onChange(''); }}
          className="text-[10px]"
          style={{ color: 'var(--fg-subtle)' }}
          aria-label="Clear search"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
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
        className="h-8 pl-7 pr-2 rounded-md text-[12px] outline-none cursor-pointer"
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

function EmptyRow({ q }: { q: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center">
      <Search className="w-5 h-5" style={{ color: 'var(--fg-subtle)' }} />
      <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
        {q ? `No matches for "${q}"` : 'No people match this filter'}
      </span>
      <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
        Try a different keyword or clear the filter.
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Invite modal

function InviteModal({ onClose }: { onClose: () => void }) {
  const [emails, setEmails] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [team, setTeam] = useState('Frontend');
  const linkRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  const parsed = emails
    .split(/[\s,;\n]+/)
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
  const valid = parsed.filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  const invalid = parsed.filter((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

  const inviteLink = 'https://acme.app/join/inv_8f3a-2c91';

  const copyLink = () => {
    if (linkRef.current) {
      linkRef.current.select();
      try { void navigator.clipboard.writeText(inviteLink); } catch { /* noop */ }
      setCopied(true);
      setTimeout(() => { setCopied(false); }, 1500);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.45)' }}
        onClick={onClose}
      />
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[480px] rounded-lg overflow-hidden"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--border-muted)' }}
        >
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" style={{ color: 'var(--fg-default)' }} />
            <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
              Invite people
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-md inline-flex items-center justify-center"
            style={{ color: 'var(--fg-muted)' }}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span
              className="text-[10px] uppercase tracking-[0.14em] font-medium flex items-center justify-between"
              style={{ color: 'var(--fg-subtle)' }}
            >
              <span>Emails</span>
              {parsed.length > 0 && (
                <span className="lowercase tracking-normal tabular-nums">
                  {valid.length} valid{invalid.length > 0 && ` · ${invalid.length} invalid`}
                </span>
              )}
            </span>
            <textarea
              value={emails}
              onChange={(e) => { setEmails(e.target.value); }}
              placeholder="alice@acme.com, bob@acme.com…"
              rows={3}
              className="w-full rounded-md p-2.5 text-[12px] outline-none resize-none"
              style={{
                background: 'var(--bg-surface-muted)',
                border: '1px solid var(--border-default)',
                color: 'var(--fg-strong)',
                fontFamily: 'inherit',
              }}
            />
            {invalid.length > 0 && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--intent-warn-fg)' }}>
                <AlertTriangle className="w-3 h-3" />
                Skipping {invalid.length}: {invalid.slice(0, 2).join(', ')}{invalid.length > 2 && '…'}
              </span>
            )}
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
                Role
              </span>
              <select
                value={role}
                onChange={(e) => { setRole(e.target.value as Role); }}
                className="h-9 rounded-md px-2.5 text-[12px] outline-none cursor-pointer"
                style={{
                  background: 'var(--bg-surface-muted)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--fg-strong)',
                }}
              >
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="billing">Billing</option>
                <option value="guest">Guest</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
                Team
              </span>
              <select
                value={team}
                onChange={(e) => { setTeam(e.target.value); }}
                className="h-9 rounded-md px-2.5 text-[12px] outline-none cursor-pointer"
                style={{
                  background: 'var(--bg-surface-muted)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--fg-strong)',
                }}
              >
                <option>Platform</option>
                <option>Frontend</option>
                <option>Backend</option>
                <option>Security</option>
                <option>Data</option>
                <option>Finance</option>
                <option>Partner</option>
              </select>
            </label>
          </div>

          <div
            className="flex flex-col gap-2 pt-3"
            style={{ borderTop: '1px solid var(--border-muted)' }}
          >
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
              Or share an invite link
            </span>
            <div className="flex items-center gap-2">
              <input
                ref={linkRef}
                readOnly
                value={inviteLink}
                className="flex-1 h-8 px-2.5 rounded-md text-[11px] font-mono outline-none"
                style={{
                  background: 'var(--bg-surface-muted)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--fg-default)',
                }}
              />
              <Button leading={copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} onClick={copyLink}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
        </div>

        <div
          className="flex items-center justify-end gap-2 px-4 py-3"
          style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}
        >
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            size="md"
            disabled={valid.length === 0}
            onClick={onClose}
          >
            Send {valid.length > 0 ? `${valid.length} invite${valid.length === 1 ? '' : 's'}` : 'invites'}
          </Button>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Confirm remove

function ConfirmRemove({
  member, onCancel, onConfirm,
}: { member: Member; onCancel: () => void; onConfirm: () => void }) {
  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.45)' }}
        onClick={onCancel}
      />
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] rounded-lg overflow-hidden"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--intent-danger-fg)' }} />
            <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
              Remove {member.name}?
            </span>
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
            Their access to this organization will end immediately. Their authored work
            stays attributed to them. This action can&apos;t be undone.
          </p>
        </div>
        <div
          className="flex items-center justify-end gap-2 px-4 py-3"
          style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}
        >
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" size="md" onClick={onConfirm}>Remove</Button>
        </div>
      </div>
    </>
  );
}
