import type { CSSProperties } from 'react';
import {
  MOCK_PEOPLE,
  type OwnershipState,
  type OwnershipZone,
  type Person,
  type PersonId,
} from '@entities/ownership';
import { GlassCard, SectionHeader } from '@shared/ui/GlassCard';
import { EmptyHint } from '@shared/ui/EmptyHint';

export interface OwnershipHeatLayerProps {
  zones: OwnershipZone[];
  selectedZoneId?: string;
  onZoneSelect?: (zoneId: string) => void;
}

interface StateVisual {
  label: string;
  bgVar: string;
  fgVar: string;
  borderVar: string;
}

const STATE_VISUALS: Record<OwnershipState, StateVisual> = {
  orphan: {
    label: 'orphan',
    bgVar: 'var(--intent-danger-bg)',
    fgVar: 'var(--intent-danger-fg)',
    borderVar: 'var(--intent-danger-fg)',
  },
  overloaded: {
    label: 'overloaded',
    bgVar: 'var(--intent-warn-bg)',
    fgVar: 'var(--intent-warn-fg)',
    borderVar: 'var(--intent-warn-fg)',
  },
  fragmented: {
    label: 'fragmented',
    bgVar: 'color-mix(in srgb, var(--identity-out-of-scope) 12%, transparent)',
    fgVar: 'var(--identity-out-of-scope)',
    borderVar: 'var(--identity-out-of-scope)',
  },
  siloed: {
    label: 'siloed',
    // Orange-ish: blend warn vivid toward danger to bias warmer than amber.
    bgVar: 'color-mix(in srgb, var(--intent-warn-vivid) 12%, transparent)',
    fgVar: 'var(--intent-warn-vivid)',
    borderVar: 'var(--intent-warn-vivid)',
  },
  'cross-team': {
    label: 'cross-team',
    bgVar: 'color-mix(in srgb, var(--fg-link) 14%, transparent)',
    fgVar: 'var(--fg-link)',
    borderVar: 'var(--fg-link)',
  },
  healthy: {
    label: 'healthy',
    bgVar: 'var(--intent-success-bg)',
    fgVar: 'var(--intent-success-fg)',
    borderVar: 'var(--intent-success-fg)',
  },
};

const STATE_ORDER: OwnershipState[] = [
  'orphan',
  'overloaded',
  'fragmented',
  'siloed',
  'cross-team',
  'healthy',
];

function findPersonLocal(id: PersonId): Person | undefined {
  return MOCK_PEOPLE.find((p) => p.id === id);
}

// Pick top 3 owners by aggregating per-person score weights across all layers.
// We intentionally use total weight (not max) so a person consistently strong
// across declared/historical/expertise/impact ranks above a one-layer spike.
function topOwners(zone: OwnershipZone, n = 3): Person[] {
  const totals = new Map<PersonId, number>();
  for (const s of zone.scores) {
    totals.set(s.personId, (totals.get(s.personId) ?? 0) + s.weight);
  }
  const ranked = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => findPersonLocal(id))
    .filter((p): p is Person => Boolean(p));
  return ranked.slice(0, n);
}

function uniquePersonIds(zone: OwnershipZone): PersonId[] {
  return Array.from(new Set(zone.scores.map((s) => s.personId)));
}

function summaryFor(zone: OwnershipZone): string {
  const ids = uniquePersonIds(zone);
  const contributorCount = ids.length;
  const primary = findPersonLocal(zone.primary);
  const backup = zone.backup ? findPersonLocal(zone.backup) : null;
  const primaryActive = primary?.active ?? false;

  switch (zone.state) {
    case 'orphan':
      return primaryActive
        ? `${contributorCount} contributors · primary inactive`
        : 'primary left rotation · no active backup';
    case 'overloaded':
      return backup
        ? `${contributorCount} contributors · 1 carries the load`
        : `${contributorCount} contributors · no backup`;
    case 'fragmented':
      return `${contributorCount} contributors · no clear primary`;
    case 'siloed':
      return backup
        ? 'single primary · thin backup'
        : 'single team, single person';
    case 'cross-team':
      return `${contributorCount} contributors · spans multiple teams`;
    case 'healthy':
      return `${contributorCount} contributors · clear primary + backup`;
  }
}

function StateBadge({ state }: { state: OwnershipState }) {
  const v = STATE_VISUALS[state];
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-md border"
      style={{
        background: v.bgVar,
        color: v.fgVar,
        borderColor: `color-mix(in srgb, ${v.borderVar} 35%, transparent)`,
      }}
    >
      {v.label}
    </span>
  );
}

function Avatar({
  person,
  z,
}: {
  person: Person;
  z: number;
}) {
  const stale = !person.active;
  // hsl() is permitted only for deterministic per-person identity color.
  const sat = stale ? 8 : 50;
  const light = stale ? 48 : 55;
  const alpha = stale ? 0.45 : 0.85;
  const bg = `hsl(${person.avatarHue} ${sat}% ${light}% / ${alpha})`;
  const style: CSSProperties = {
    background: bg,
    color: 'var(--fg-on-active-strong)',
    borderColor: 'var(--border-default)',
    zIndex: z,
    marginLeft: z === 100 ? 0 : -8,
  };
  return (
    <span
      title={`${person.name} · ${person.team}${stale ? ' · stale' : ''}`}
      className="relative inline-flex items-center justify-center w-6 h-6 rounded-full border text-[8.5px] font-bold uppercase tracking-tight select-none"
      style={style}
    >
      {person.initials}
      {stale && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border"
          style={{
            background: 'var(--fg-subtle)',
            borderColor: 'var(--bg-surface)',
          }}
        />
      )}
    </span>
  );
}

function AvatarStack({ owners }: { owners: Person[] }) {
  if (owners.length === 0) {
    return (
      <span
        className="text-[9px] italic"
        style={{ color: 'var(--fg-subtle)' }}
      >
        no owners
      </span>
    );
  }
  return (
    <div className="flex items-center">
      {owners.map((p, i) => (
        <Avatar key={p.id} person={p} z={100 - i} />
      ))}
    </div>
  );
}

function ZoneRow({
  zone,
  selected,
  onSelect,
}: {
  zone: OwnershipZone;
  selected: boolean;
  onSelect?: (id: string) => void;
}) {
  const owners = topOwners(zone, 3);
  const summary = summaryFor(zone);

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={() => onSelect?.(zone.id)}
      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md border text-left transition-colors duration-150 group"
      style={{
        background: selected ? 'var(--bg-surface-muted)' : 'transparent',
        borderColor: selected
          ? 'var(--border-strong)'
          : 'var(--border-muted)',
        minHeight: 48,
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.background = 'var(--bg-hover)';
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.10em] truncate"
            style={{ color: 'var(--fg-default)' }}
          >
            {zone.label}
          </span>
          <StateBadge state={zone.state} />
        </div>
        <span
          className="text-[10px] truncate"
          style={{ color: 'var(--fg-muted)' }}
        >
          {summary}
        </span>
      </div>
      <AvatarStack owners={owners} />
    </button>
  );
}

function Legend({ zones }: { zones: OwnershipZone[] }) {
  const counts = STATE_ORDER.reduce<Record<OwnershipState, number>>(
    (acc, s) => {
      acc[s] = 0;
      return acc;
    },
    { orphan: 0, overloaded: 0, fragmented: 0, siloed: 0, 'cross-team': 0, healthy: 0 },
  );
  for (const z of zones) counts[z.state] += 1;

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t"
      style={{ borderColor: 'var(--border-muted)' }}
    >
      {STATE_ORDER.map((s) => {
        const v = STATE_VISUALS[s];
        return (
          <span
            key={s}
            className="inline-flex items-center gap-1 text-[9px] font-medium uppercase tracking-[0.10em] px-1.5 py-0.5 rounded-md border"
            style={{
              background: v.bgVar,
              color: v.fgVar,
              borderColor: `color-mix(in srgb, ${v.borderVar} 30%, transparent)`,
            }}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: v.fgVar }}
            />
            {v.label}
            <span style={{ color: 'var(--fg-subtle)' }}>
              {counts[s]}
            </span>
          </span>
        );
      })}
    </div>
  );
}

export function OwnershipHeatLayer({
  zones,
  selectedZoneId,
  onZoneSelect,
}: OwnershipHeatLayerProps): JSX.Element {
  return (
    <GlassCard className="rounded-lg p-3">
      <SectionHeader
        title="Ownership Heat"
        badge={`${zones.length} zones`}
      />
      {zones.length === 0 ? (
        <div className="py-3">
          <EmptyHint text="No ownership zones available" />
        </div>
      ) : (
        <>
          <div role="listbox" className="flex flex-col gap-1">
            {zones.map((z) => (
              <ZoneRow
                key={z.id}
                zone={z}
                selected={z.id === selectedZoneId}
                onSelect={onZoneSelect}
              />
            ))}
          </div>
          <Legend zones={zones} />
        </>
      )}
    </GlassCard>
  );
}
