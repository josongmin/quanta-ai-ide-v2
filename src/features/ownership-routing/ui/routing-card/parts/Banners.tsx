import type { ImpactNarrative, Person } from '@entities/ownership';

export function ImpactNarrativeStrip({ narrative }: { narrative: ImpactNarrative }) {
  return (
    <div
      className="rounded-lg px-3 py-2.5 border"
      style={{
        background: 'var(--bg-surface-muted)',
        borderColor: 'var(--border-muted)',
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="text-2xs font-black uppercase tracking-eyebrow px-1.5 py-0.5 rounded-md"
          style={{
            background: 'var(--bg-elevated)',
            color: 'var(--fg-muted)',
          }}
        >
          AI · Impact
        </span>
        <span className="flex-1 h-px" style={{ background: 'var(--border-muted)' }} />
      </div>
      <div className="text-sm leading-snug mb-1.5" style={{ color: 'var(--fg-default)' }}>
        {narrative.summary}
      </div>
      <div className="flex items-center flex-wrap gap-1.5 text-2xs font-mono uppercase tracking-eyebrow">
        <span style={{ color: 'var(--fg-subtle)' }}>owner</span>
        <span
          className="px-1.5 py-0.5 rounded-md font-bold"
          style={{ background: 'var(--bg-elevated)', color: 'var(--fg-default)' }}
        >
          {narrative.declaredTeam}
        </span>
        <span style={{ color: 'var(--fg-subtle)' }}>blast →</span>
        {narrative.blastTeams.map((t) => (
          <span
            key={t}
            className="px-1.5 py-0.5 rounded-md font-bold"
            style={{
              background: 'rgb(from var(--intent-warn-vivid) r g b / 0.14)',
              color: 'var(--intent-warn-fg)',
            }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export function StalePrimaryBanner({
  primary,
  escalation,
}: {
  primary: Person;
  escalation: Person | undefined;
}) {
  return (
    <div
      className="rounded-lg px-3 py-2 border"
      style={{
        background: 'rgb(from var(--intent-warn-vivid) r g b / 0.10)',
        borderColor: 'rgb(from var(--intent-warn-vivid) r g b / 0.32)',
      }}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: 'var(--intent-warn-vivid)' }}
        />
        <span
          className="text-2xs font-black uppercase tracking-eyebrow"
          style={{ color: 'var(--intent-warn-fg)' }}
        >
          Primary unavailable
        </span>
      </div>
      <div className="text-sm leading-snug" style={{ color: 'var(--fg-default)' }}>
        <span className="font-semibold">{primary.name}</span>
        <span style={{ color: 'var(--fg-muted)' }}>
          {' '}· last active {primary.lastActiveDays}d ago
        </span>
        {escalation && (
          <>
            <span style={{ color: 'var(--fg-muted)' }}> · routing to </span>
            <span className="font-semibold">{escalation.name}</span>
            <span style={{ color: 'var(--fg-muted)' }}> ({escalation.team})</span>
          </>
        )}
      </div>
    </div>
  );
}
