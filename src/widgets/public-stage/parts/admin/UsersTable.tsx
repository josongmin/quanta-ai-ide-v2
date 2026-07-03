import { useRef } from 'react';
import { Search } from 'lucide-react';
import { useHoverStyle } from '@shared/lib';
import { Button } from '@shared/ui/forms';
import type { AdminUser, UserStatus } from './types';

export function UserSearchInput({ q, onChange }: { q: string; onChange: (v: string) => void }) {
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
        className="flex-1 bg-transparent outline-none text-base"
        style={{ color: 'var(--fg-strong)' }}
      />
    </div>
  );
}

export function UsersTable({ users }: { users: AdminUser[] }) {
  return (
    <div
      className="rounded-md overflow-hidden"
      style={{ border: '1px solid var(--border-muted)' }}
    >
      <div
        className="grid items-center px-3 h-9 text-xs uppercase tracking-eyebrow font-semibold"
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
        <div className="py-8 text-center text-base" style={{ color: 'var(--fg-subtle)' }}>
          No users matched.
        </div>
      ) : (
        users.map((u) => <UserRow key={u.id} user={u} />)
      )}
    </div>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  const ref = useRef<HTMLDivElement>(null);
  useHoverStyle(ref, { background: 'var(--bg-hover)' }, { background: 'transparent' });
  return (
    <div
      ref={ref}
      className="grid items-center px-3 h-11 text-base transition-colors"
      style={{
        gridTemplateColumns: '1.4fr 1.4fr 110px 110px 100px 110px',
        gap: 12,
        borderTop: '1px solid var(--border-muted)',
        opacity: user.status === 'suspended' ? 0.6 : 1,
      }}
    >
      <span className="font-medium truncate" style={{ color: 'var(--fg-strong)' }}>
        {user.name}
      </span>
      <span className="truncate" style={{ color: 'var(--fg-default)' }}>
        {user.email}
      </span>
      <span className="font-mono text-sm truncate" style={{ color: 'var(--fg-muted)' }}>
        {user.org}
      </span>
      <span className="tabular-nums text-sm" style={{ color: 'var(--fg-muted)' }}>
        {user.lastSignIn}
      </span>
      <UserStatusPill status={user.status} />
      <div className="flex justify-end">
        <Button>Impersonate</Button>
      </div>
    </div>
  );
}

const USER_STATUS_TONES: Record<UserStatus, { bg: string; fg: string }> = {
  active:    { bg: 'var(--intent-success-bg)', fg: 'var(--intent-success-fg)' },
  invited:   { bg: 'var(--intent-warn-bg)',    fg: 'var(--intent-warn-fg)' },
  suspended: { bg: 'var(--intent-danger-bg)',  fg: 'var(--intent-danger-fg)' },
};

function UserStatusPill({ status }: { status: UserStatus }) {
  const tone = USER_STATUS_TONES[status];
  return (
    <span
      className="inline-flex items-center gap-1 text-xs uppercase tracking-eyebrow font-semibold px-1.5 py-0.5 rounded"
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
