import type { Person } from '@entities/ownership';
import { PersonAvatar } from '../../../lib';

export { PersonAvatar };

function StaleDot({ days }: { days: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-[0.12em]"
      style={{ color: 'var(--fg-subtle)' }}
      title={`stale · ${days}d since active`}
    >
      <span
        className="w-1 h-1 rounded-full"
        style={{ background: 'var(--intent-warn-fg)' }}
      />
      {days}d
    </span>
  );
}

export function PersonChip({
  person,
  size = 24,
  emphasis = false,
}: {
  person: Person | undefined;
  size?: number;
  emphasis?: boolean;
}) {
  if (!person) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <PersonAvatar person={undefined} size={size} />
        <span
          className="text-[11px] truncate"
          style={{ color: 'var(--fg-subtle)' }}
        >
          Unknown
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 min-w-0">
      <PersonAvatar person={person} size={size} />
      <div className="min-w-0 flex-1">
        <div
          className={`text-[12px] leading-tight truncate ${
            emphasis ? 'font-bold' : 'font-semibold'
          }`}
          style={{
            color: person.active ? 'var(--fg-default)' : 'var(--fg-muted)',
          }}
        >
          {person.name}
        </div>
        <div
          className="text-[10px] font-mono leading-tight truncate"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {person.team}
          {!person.active && (
            <>
              {' · '}
              <span style={{ color: 'var(--intent-warn-fg)' }}>stale</span>
            </>
          )}
        </div>
      </div>
      {!person.active && size >= 28 && <StaleDot days={person.lastActiveDays} />}
    </div>
  );
}
