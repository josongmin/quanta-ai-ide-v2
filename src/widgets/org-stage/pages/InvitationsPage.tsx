import { useParams } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { Mail, Plus, RotateCcw, X, Clock } from 'lucide-react';
import { env } from '@shared/config/env';
import { useHoverStyle } from '@shared/lib';
import { CopyableField } from '@shared/ui';
import { OrgShell } from '../parts/OrgShell';
import { InvitationsReal } from './parts/invitations/InvitationsReal';

// Real auth → live pending invites over the org plugin; otherwise the demo mock.
export default function InvitationsPage() {
  return env.useRealAuth ? <InvitationsReal /> : <InvitationsMock />;
}

type InviteStatus = 'pending' | 'accepted' | 'expired';
type Invite = {
  id: string;
  email: string;
  role: string;
  team: string;
  sentBy: string;
  sentAt: string;
  expiresIn: string;
  status: InviteStatus;
};

const INVITES: Invite[] = [
  { id: 'inv_1', email: 'dana@candidates.io',  role: 'Member', team: 'Platform',  sentBy: 's.kim',   sentAt: '2026-05-12 09:14', expiresIn: '6 days',   status: 'pending' },
  { id: 'inv_2', email: 'kim.r@candidates.io', role: 'Admin',  team: 'Security',  sentBy: 's.kim',   sentAt: '2026-05-11 14:02', expiresIn: '5 days',   status: 'pending' },
  { id: 'inv_3', email: 'po@vendor.co',         role: 'Guest',  team: '—',         sentBy: 'a.silva', sentAt: '2026-05-08 11:30', expiresIn: '2 days',   status: 'pending' },
  { id: 'inv_4', email: 'old@candidates.io',   role: 'Member', team: 'Mobile',    sentBy: 'm.kim',   sentAt: '2026-04-20 09:00', expiresIn: '—',        status: 'expired' },
  { id: 'inv_5', email: 'new@candidates.io',   role: 'Member', team: 'Platform',  sentBy: 's.kim',   sentAt: '2026-05-09 16:45', expiresIn: '—',        status: 'accepted' },
];

const STATUS_META: Record<InviteStatus, { label: string; fg: string; bg: string }> = {
  pending:  { label: 'Pending',  fg: 'var(--intent-warn-fg)',    bg: 'var(--intent-warn-bg)' },
  accepted: { label: 'Accepted', fg: 'var(--intent-success-fg)', bg: 'var(--intent-success-bg)' },
  expired:  { label: 'Expired',  fg: 'var(--intent-danger-fg)',  bg: 'var(--intent-danger-bg)' },
};

function InvitationsMock() {
  // Route is always /org/$org/* so `org` is present; default keeps the type `string`.
  const { org = '' } = useParams({ strict: false });
  const [filter, setFilter] = useState<'all' | InviteStatus>('all');
  const filtered = INVITES.filter((i) => filter === 'all' || i.status === filter);

  return (
    <OrgShell
      orgName={org}
      orgSlug={org}
      title="Invitations"
      subtitle="Pending and accepted invites for this organization. Resend, revoke, or copy share-able invite links."
      topRight={
        <button
          type="button"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-base font-semibold transition-colors"
          style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
        >
          <Plus className="w-3.5 h-3.5" />
          Invite people
        </button>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <Tile label="Pending"   value={INVITES.filter((i) => i.status === 'pending').length}  tone="warn" />
        <Tile label="Accepted"  value={INVITES.filter((i) => i.status === 'accepted').length} tone="success" />
        <Tile label="Expired"   value={INVITES.filter((i) => i.status === 'expired').length}  tone="danger" />
        <Tile label="This month" value={4} tone="default" />
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-3">
        {(['all', 'pending', 'accepted', 'expired'] as const).map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => { setFilter(f); }}
              className="h-7 px-3 rounded-full text-sm font-medium capitalize transition-colors"
              style={{
                background: active ? 'color-mix(in srgb, var(--fg-accent) 12%, transparent)' : 'transparent',
                color: active ? 'var(--fg-accent)' : 'var(--fg-muted)',
                border: `1px solid ${active ? 'color-mix(in srgb, var(--fg-accent) 40%, transparent)' : 'var(--border-default)'}`,
              }}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
      >
        <div
          className="grid items-center px-4 h-9 text-xs uppercase tracking-eyebrow font-semibold"
          style={{
            gridTemplateColumns: '2fr 0.8fr 1fr 1fr 0.8fr 0.6fr 0.8fr',
            color: 'var(--fg-subtle)',
            borderBottom: '1px solid var(--border-muted)',
          }}
        >
          <span>Email</span>
          <span>Role</span>
          <span>Team</span>
          <span>Sent by</span>
          <span>Status</span>
          <span>Expires</span>
          <span></span>
        </div>
        {filtered.map((inv, i) => (
          <Row key={inv.id} inv={inv} last={i === filtered.length - 1} />
        ))}
      </div>

      {/* Shareable link */}
      <div
        className="mt-8 rounded-xl p-5"
        style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
      >
        <h2 className="text-base font-semibold tracking-tight mb-1.5" style={{ color: 'var(--fg-strong)' }}>
          Shareable invite link
        </h2>
        <p className="text-sm mb-3" style={{ color: 'var(--fg-muted)' }}>
          Anyone with this link from a verified domain can join as a Member. Disable any time.
        </p>
        <CopyableField value={`https://acme.dev/join/${org}#aB12Cd34`} layout="row" button="text" />
      </div>
    </OrgShell>
  );
}

function Tile({ label, value, tone }: { label: string; value: number; tone: 'default' | 'success' | 'warn' | 'danger' }) {
  const color =
    tone === 'success' ? 'var(--intent-success-fg)' :
    tone === 'warn'    ? 'var(--intent-warn-fg)' :
    tone === 'danger'  ? 'var(--intent-danger-fg)' :
    'var(--fg-strong)';
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1"
      style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
    >
      <span className="text-xs uppercase tracking-eyebrow font-semibold" style={{ color: 'var(--fg-subtle)' }}>
        {label}
      </span>
      <span className="text-3xl font-semibold tabular-nums tracking-tight" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function Row({ inv, last }: { inv: Invite; last: boolean }) {
  const m = STATUS_META[inv.status];
  const ref = useRef<HTMLDivElement>(null);
  useHoverStyle(ref, { background: 'var(--bg-hover)' }, { background: 'transparent' });
  return (
    <div
      ref={ref}
      className="grid items-center px-4 h-12 transition-colors"
      style={{
        gridTemplateColumns: '2fr 0.8fr 1fr 1fr 0.8fr 0.6fr 0.8fr',
        borderBottom: last ? 'none' : '1px solid var(--border-muted)',
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--fg-muted)' }} />
        <span className="text-base truncate" style={{ color: 'var(--fg-strong)' }}>{inv.email}</span>
      </div>
      <span className="text-sm" style={{ color: 'var(--fg-default)' }}>{inv.role}</span>
      <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>{inv.team}</span>
      <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>{inv.sentBy}</span>
      <span
        className="inline-flex items-center gap-1 px-2 h-5 rounded text-xs font-bold w-fit"
        style={{ color: m.fg, background: m.bg }}
      >
        {m.label}
      </span>
      <span className="text-sm tabular-nums" style={{ color: 'var(--fg-muted)' }}>
        {inv.status === 'pending' && <Clock className="w-3 h-3 inline mr-1" />}
        {inv.expiresIn}
      </span>
      <div className="flex justify-end gap-1">
        {inv.status === 'pending' && (
          <>
            <RowBtn icon={RotateCcw} label="Resend" />
            <RowBtn icon={X} label="Revoke" danger />
          </>
        )}
        {inv.status === 'expired' && (
          <RowBtn icon={RotateCcw} label="Re-invite" />
        )}
      </div>
    </div>
  );
}

function RowBtn({ icon: Icon, label, danger }: { icon: React.ComponentType<{ className?: string }>; label: string; danger?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      className="w-7 h-7 rounded inline-flex items-center justify-center transition-colors"
      style={{ color: danger ? 'var(--intent-danger-fg)' : 'var(--fg-muted)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger ? 'var(--intent-danger-bg)' : 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

