import { GlassCard } from '@shared/ui';
import type { Person } from '@entities/ownership';
import { PersonChip } from './primitives';

export function OwnerSplit({
  implementer,
  approver,
}: {
  implementer: Person | undefined;
  approver: Person | undefined;
}) {
  const sameTeam =
    implementer && implementer.team === approver?.team;
  const samePerson =
    implementer && implementer.id === approver?.id;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-stretch">
      <GlassCard tone="inner" className="px-3 py-2.5 min-w-0">
        <div
          className="text-[9px] font-black uppercase tracking-[0.18em] mb-1.5"
          style={{ color: 'var(--fg-muted)' }}
        >
          Implements
        </div>
        <PersonChip person={implementer} size={28} emphasis />
      </GlassCard>
      <div className="flex flex-col items-center justify-center px-1">
        <span
          className="text-[14px] leading-none font-bold"
          style={{
            color: samePerson
              ? 'var(--fg-subtle)'
              : sameTeam
                ? 'var(--fg-muted)'
                : 'var(--intent-warn-fg)',
          }}
          title={
            samePerson
              ? 'Same person implements and approves'
              : sameTeam
                ? 'Same team'
                : 'Cross-team handoff'
          }
        >
          {samePerson ? '=' : '↔'}
        </span>
        {!samePerson && (
          <span
            className="mt-1 text-[8px] font-mono uppercase tracking-[0.18em]"
            style={{
              color: sameTeam ? 'var(--fg-subtle)' : 'var(--intent-warn-fg)',
            }}
          >
            {sameTeam ? 'same team' : 'cross team'}
          </span>
        )}
      </div>
      <GlassCard tone="inner" className="px-3 py-2.5 min-w-0">
        <div
          className="text-[9px] font-black uppercase tracking-[0.18em] mb-1.5"
          style={{ color: 'var(--fg-muted)' }}
        >
          Approves
        </div>
        <PersonChip person={approver} size={28} emphasis />
      </GlassCard>
    </div>
  );
}

export function RoleColumn({
  label,
  person,
  dimmed,
}: {
  label: string;
  person: Person | undefined | null;
  dimmed?: boolean;
}) {
  return (
    <div
      className="min-w-0 flex flex-col gap-1.5"
      style={{ opacity: dimmed ? 0.55 : 1 }}
    >
      <div
        className="text-[9px] font-black uppercase tracking-[0.18em]"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {label}
      </div>
      {person ? (
        <PersonChip person={person} size={24} />
      ) : (
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-flex items-center justify-center rounded-full shrink-0"
            style={{
              width: 24,
              height: 24,
              background: 'var(--bg-surface-muted)',
              border: '1px dashed var(--border-muted)',
              color: 'var(--fg-subtle)',
              fontSize: 11,
            }}
          >
            —
          </span>
          <span
            className="text-[11px] italic"
            style={{ color: 'var(--fg-subtle)' }}
          >
            none
          </span>
        </div>
      )}
    </div>
  );
}
