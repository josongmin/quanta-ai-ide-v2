import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  GlassCard,
  SectionHeader,
  Section,
  EmptyHint,
} from '@shared/ui';
import type {
  ImpactNarrative,
  OwnershipLayer,
  OwnershipScore,
  OwnershipZone,
  Person,
  PersonId,
  ReviewerRationale,
} from '@entities/ownership';

export interface RoutingCardProps {
  zone: OwnershipZone;
  people: Person[];
}

const LAYER_ORDER: OwnershipLayer[] = [
  'declared',
  'historical',
  'expertise',
  'impact',
];

const RATIONALE_FIELDS: ReadonlyArray<{
  key: keyof ReviewerRationale;
  label: string;
}> = [
  { key: 'touchedAreaFamiliarity', label: 'Touched area' },
  { key: 'recentReviewer', label: 'Recent reviewer' },
  { key: 'incidentResolver', label: 'Incident resolver' },
  { key: 'codeOwner', label: 'Code owner' },
];

function confidenceTone(value: number): {
  fg: string;
  bg: string;
  vivid: string;
  label: string;
} {
  if (value >= 0.7) {
    return {
      fg: 'var(--intent-success-fg)',
      bg: 'var(--intent-success-bg)',
      vivid: 'var(--intent-success-vivid)',
      label: 'High',
    };
  }
  if (value >= 0.4) {
    return {
      fg: 'var(--intent-warn-fg)',
      bg: 'var(--intent-warn-bg)',
      vivid: 'var(--intent-warn-vivid)',
      label: 'Medium',
    };
  }
  return {
    fg: 'var(--intent-danger-fg)',
    bg: 'var(--intent-danger-bg)',
    vivid: 'var(--intent-danger-vivid)',
    label: 'Low',
  };
}

function avatarStyle(person: Person | undefined, size: number): CSSProperties {
  if (!person) {
    return {
      width: size,
      height: size,
      background: 'var(--bg-surface-muted)',
      border: '1px solid var(--border-muted)',
      color: 'var(--fg-subtle)',
    };
  }
  const stale = !person.active;
  const sat = stale ? 14 : 58;
  const lightDark = stale ? 36 : 44;
  return {
    width: size,
    height: size,
    background: `hsl(${person.avatarHue} ${sat}% ${lightDark}% / ${stale ? 0.55 : 0.92})`,
    border: '1px solid var(--border-muted)',
    color: 'rgba(255,255,255,0.94)',
  };
}

function PersonAvatar({
  person,
  size,
}: {
  person: Person | undefined;
  size: number;
}) {
  const initials = person?.initials ?? '??';
  const fontSize = Math.max(8, Math.round(size * 0.42));
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-bold tracking-[0.04em] shrink-0"
      style={{
        ...avatarStyle(person, size),
        fontSize,
      }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

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

function PersonChip({
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

function ImpactNarrativeStrip({ narrative }: { narrative: ImpactNarrative }) {
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
          className="text-[8px] font-black uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-md"
          style={{
            background: 'var(--bg-elevated)',
            color: 'var(--fg-muted)',
          }}
        >
          AI · Impact
        </span>
        <span className="flex-1 h-px" style={{ background: 'var(--border-muted)' }} />
      </div>
      <div className="text-[11px] leading-snug mb-1.5" style={{ color: 'var(--fg-default)' }}>
        {narrative.summary}
      </div>
      <div className="flex items-center flex-wrap gap-1.5 text-[9px] font-mono uppercase tracking-[0.14em]">
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

function ConfidenceHeader({ value }: { value: number }) {
  const tone = confidenceTone(value);
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-stretch gap-4">
      <div className="flex flex-col justify-center">
        <div className="flex items-baseline gap-1">
          <span
            className="text-[34px] font-black leading-none tabular-nums tracking-tight"
            style={{ color: 'var(--fg-strong)' }}
          >
            {pct}
          </span>
          <span
            className="text-[14px] font-bold leading-none"
            style={{ color: 'var(--fg-muted)' }}
          >
            %
          </span>
        </div>
        <div
          className="mt-1 text-[9px] font-black uppercase tracking-[0.18em]"
          style={{ color: 'var(--fg-muted)' }}
          title="Confidence in the recommended primary owner — combined signal across the 4 ownership layers"
        >
          Owner confidence
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-center min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span
            className="text-[9px] font-mono uppercase tracking-[0.18em]"
            style={{ color: 'var(--fg-subtle)' }}
          >
            signal strength
          </span>
          <span
            className="text-[9px] font-bold uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-md"
            style={{
              background: tone.bg,
              color: tone.fg,
            }}
          >
            {tone.label}
          </span>
        </div>
        <div
          className="h-1.5 rounded-full overflow-hidden w-full"
          style={{ background: 'var(--bg-surface-muted)' }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: tone.vivid,
            }}
          />
        </div>
        <div
          className="mt-1 flex justify-between text-[9px] font-mono tabular-nums"
          style={{ color: 'var(--fg-subtle)' }}
        >
          <span>0</span>
          <span>40</span>
          <span>70</span>
          <span>100</span>
        </div>
      </div>
    </div>
  );
}

function OwnerSplit({
  implementer,
  approver,
}: {
  implementer: Person | undefined;
  approver: Person | undefined;
}) {
  const sameTeam =
    implementer && approver && implementer.team === approver.team;
  const samePerson =
    implementer && approver && implementer.id === approver.id;
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

function StalePrimaryBanner({
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
          className="text-[9px] font-black uppercase tracking-[0.18em]"
          style={{ color: 'var(--intent-warn-fg)' }}
        >
          Primary unavailable
        </span>
      </div>
      <div className="text-[11px] leading-snug" style={{ color: 'var(--fg-default)' }}>
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

function RoleColumn({
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

function RationaleBars({ rationale }: { rationale: ReviewerRationale }) {
  const dominantKey = RATIONALE_FIELDS.reduce((acc, f) =>
    rationale[f.key] > rationale[acc.key] ? f : acc,
  ).key;
  const dominantValue = rationale[dominantKey];
  const dominantStrong = dominantValue >= 0.55;
  return (
    <div className="space-y-1.5">
      {RATIONALE_FIELDS.map(({ key, label }) => {
        const v = rationale[key];
        const pct = Math.round(v * 100);
        const isDominant = key === dominantKey && dominantStrong;
        return (
          <div
            key={key}
            className={`flex items-center gap-2 text-[11px] ${isDominant ? 'font-bold' : ''}`}
            style={{
              color: isDominant ? 'var(--fg-strong)' : 'var(--fg-default)',
            }}
          >
            <span
              className="w-[120px] shrink-0 truncate"
              style={{ color: 'var(--fg-muted)' }}
            >
              {label}
            </span>
            <div
              className="flex-1 h-1.5 rounded-full overflow-hidden"
              style={{ background: 'var(--bg-surface-muted)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: `color-mix(in srgb, var(--fg-default) ${
                    25 + Math.round(v * 55)
                  }%, transparent)`,
                }}
              />
            </div>
            <span
              className="w-8 text-right tabular-nums font-bold text-[11px]"
              style={{ color: 'var(--fg-default)' }}
            >
              {pct}%
            </span>
            {isDominant && (
              <span
                className="text-[8px] font-black uppercase tracking-[0.18em] px-1 py-0.5 rounded shrink-0"
                style={{
                  background: 'var(--bg-surface-muted)',
                  color: 'var(--fg-muted)',
                  border: '1px solid var(--border-muted)',
                }}
                title="Tiebreaker — strongest signal in this rationale"
              >
                top
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LayerBreakdown({
  scores,
  resolve,
}: {
  scores: OwnershipScore[];
  resolve: (id: PersonId) => Person | undefined;
}) {
  const grouped = useMemo(() => {
    const map = new Map<OwnershipLayer, OwnershipScore[]>();
    for (const s of scores) {
      const list = map.get(s.layer) ?? [];
      list.push(s);
      map.set(s.layer, list);
    }
    for (const [k, list] of map) {
      list.sort((a, b) => b.weight - a.weight);
      map.set(k, list);
    }
    return map;
  }, [scores]);
  const layers = LAYER_ORDER.filter((l) => grouped.has(l));

  if (layers.length === 0) {
    return <EmptyHint text="No ownership signals recorded." />;
  }

  return (
    <div className="space-y-2.5">
      {layers.map((layer) => {
        const items = grouped.get(layer) ?? [];
        return (
          <div key={layer}>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[9px] font-black uppercase tracking-[0.18em]"
                style={{ color: 'var(--fg-muted)' }}
              >
                {layer}
              </span>
              <span
                className="flex-1 h-px"
                style={{ background: 'var(--border-muted)' }}
              />
              <span
                className="text-[9px] font-mono tabular-nums"
                style={{ color: 'var(--fg-subtle)' }}
              >
                {items.length}
              </span>
            </div>
            <ul className="space-y-1">
              {items.map((item, idx) => {
                const person = resolve(item.personId);
                const pct = Math.round(item.weight * 100);
                return (
                  <li
                    key={`${item.personId}-${layer}-${idx}`}
                    className="flex items-center gap-2 min-w-0"
                  >
                    <PersonAvatar person={person} size={18} />
                    <span
                      className="text-[11px] font-semibold truncate shrink-0 max-w-[110px]"
                      style={{ color: 'var(--fg-default)' }}
                    >
                      {person?.name ?? 'Unknown'}
                    </span>
                    <span
                      className="text-[10px] font-mono tabular-nums shrink-0"
                      style={{ color: 'var(--fg-subtle)' }}
                    >
                      {pct}%
                    </span>
                    <span
                      className="text-[10px] truncate flex-1 min-w-0"
                      style={{ color: 'var(--fg-muted)' }}
                      title={item.reason}
                    >
                      {item.reason}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export function RoutingCard({ zone, people }: RoutingCardProps): JSX.Element {
  const [signalsOpen, setSignalsOpen] = useState(false);

  const personIndex = useMemo(() => {
    const m = new Map<PersonId, Person>();
    for (const p of people) m.set(p.id, p);
    return m;
  }, [people]);

  const resolve = (id: PersonId | null | undefined): Person | undefined =>
    id ? personIndex.get(id) : undefined;

  if (!zone || !zone.id || !zone.label) {
    return (
      <GlassCard className="px-3.5 py-3">
        <SectionHeader title="Smart Routing" />
        <EmptyHint text="Select a zone to see routing." />
      </GlassCard>
    );
  }

  const badge =
    zone.label.length > 28 ? `${zone.label.slice(0, 26)}…` : zone.label;

  const implementer = resolve(zone.implementationOwner);
  const approver = resolve(zone.approvalOwner);
  const primary = resolve(zone.primary);
  const backup = resolve(zone.backup);
  const reviewer = resolve(zone.recommendedReviewer);
  const escalation = resolve(zone.escalation);

  return (
    <GlassCard className="px-3.5 py-3 space-y-3.5">
      <SectionHeader title="Smart Routing" badge={badge.toUpperCase()} />

      {primary && !primary.active && (
        <StalePrimaryBanner
          primary={primary}
          escalation={escalation ?? backup ?? reviewer}
        />
      )}

      <OwnerSplit implementer={implementer} approver={approver} />

      <div className="grid grid-cols-4 gap-3">
        <RoleColumn label="Primary" person={primary} dimmed={primary && !primary.active} />
        <RoleColumn label="Backup" person={backup} />
        <RoleColumn label="Reviewer" person={reviewer} />
        <RoleColumn label="Escalation" person={escalation} />
      </div>

      <div
        className="h-px w-full"
        style={{ background: 'var(--border-muted)' }}
      />

      <ImpactNarrativeStrip narrative={zone.impactNarrative} />

      <ConfidenceHeader value={zone.routingConfidence} />

      <div
        className="h-px w-full"
        style={{ background: 'var(--border-muted)' }}
      />

      <Section
        title="Why this reviewer?"
        subtitle={reviewer ? reviewer.name : undefined}
      >
        <RationaleBars rationale={zone.reviewerRationale} />
      </Section>

      <div>
        <button
          type="button"
          onClick={() => setSignalsOpen((s) => !s)}
          className="w-full flex items-center gap-2 px-0.5 py-1 rounded-md hover:[background:var(--bg-hover)] transition-colors"
          aria-expanded={signalsOpen}
        >
          <span
            className="text-[9px] font-black uppercase tracking-[0.18em]"
            style={{ color: 'var(--fg-muted)' }}
          >
            Ownership signals
          </span>
          <span
            className="flex-1 h-px"
            style={{ background: 'var(--border-muted)' }}
          />
          <span
            className="text-[9px] font-mono tabular-nums"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {zone.scores.length}
          </span>
          <span
            className="text-[10px] font-mono"
            style={{ color: 'var(--fg-subtle)' }}
            aria-hidden="true"
          >
            {signalsOpen ? '−' : '+'}
          </span>
        </button>
        {signalsOpen && (
          <div className="mt-2">
            <GlassCard tone="inner" className="px-3 py-2.5">
              <LayerBreakdown scores={zone.scores} resolve={resolve} />
            </GlassCard>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
