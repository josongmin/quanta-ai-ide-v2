import type { DoneProps } from './types';
import { cap } from './data';

// Summary tile.
export function SummaryTile({ data }: DoneProps) {
  return (
    <dl
      className="grid grid-cols-3 gap-x-6 gap-y-3 px-4 py-3 rounded-md text-[11px]"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-muted)',
      }}
    >
      <Row label="Profile"      value={data.profile.name || 'Unnamed'} />
      <Row label="Handle"       value={`@${data.profile.handle || 'me'}`} mono />
      <Row label="Time zone"    value={data.profile.timezone} mono />
      <Row label="Organization" value={data.org.name || 'New org'} />
      <Row label="Workspace"    value={data.workspace.repo || '—'} mono />
      <Row label="Branch"       value={data.workspace.branch || 'main'} mono />
      <Row label="Invitees"     value={String(data.invite.entries.length)} />
      <Row label="Plan"         value={`${cap(data.plan.id)} · ${data.plan.cycle}`} />
      <Row label="Seats"        value={String(data.plan.seats)} />
    </dl>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <dt className="text-[9px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
        {label}
      </dt>
      <dd className={`truncate ${mono ? 'font-mono tabular-nums' : ''}`} style={{ color: 'var(--fg-default)' }}>
        {value}
      </dd>
    </div>
  );
}
