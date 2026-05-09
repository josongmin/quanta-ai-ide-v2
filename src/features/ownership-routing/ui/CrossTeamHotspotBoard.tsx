import { Fragment } from 'react';
import type { CrossTeamHotspot } from '@entities/ownership';
import { GlassCard, SectionHeader } from '@shared/ui/GlassCard';
import { EmptyHint } from '@shared/ui/EmptyHint';

export interface CrossTeamHotspotBoardProps {
  hotspots: CrossTeamHotspot[];
  selectedZoneId?: string;
  onSelect?: (zoneId: string) => void;
}

type Severity = CrossTeamHotspot['severity'];

interface SeverityVisual {
  shortLabel: string;
  fgVar: string;
  bgVar: string;
}

const SEVERITY_VISUALS: Record<Severity, SeverityVisual> = {
  high: {
    shortLabel: 'HIGH',
    fgVar: 'var(--intent-danger-fg)',
    bgVar: 'var(--intent-danger-bg)',
  },
  medium: {
    shortLabel: 'MED',
    fgVar: 'var(--intent-warn-fg)',
    bgVar: 'var(--intent-warn-bg)',
  },
  low: {
    shortLabel: 'LOW',
    fgVar: 'var(--intent-success-fg)',
    bgVar: 'var(--intent-success-bg)',
  },
};

function looksLikePath(label: string): boolean {
  return label.includes('/') || label.includes('.');
}

function SeverityDot({ severity }: { severity: Severity }) {
  const v = SEVERITY_VISUALS[severity];
  return (
    <span
      aria-hidden
      className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
      style={{ background: v.fgVar }}
    />
  );
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const v = SEVERITY_VISUALS[severity];
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-md border"
      style={{
        background: v.bgVar,
        color: v.fgVar,
        borderColor: `color-mix(in srgb, ${v.fgVar} 35%, transparent)`,
      }}
    >
      {v.shortLabel}
    </span>
  );
}

function TeamChip({ team }: { team: string }) {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-medium tracking-[0.04em]"
      style={{
        background: 'var(--bg-surface-muted)',
        color: 'var(--fg-muted)',
      }}
    >
      {team}
    </span>
  );
}

function TeamChain({ teams }: { teams: string[] }) {
  if (teams.length === 0) return null;
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {teams.map((team, i) => (
        <Fragment key={`${team}-${i}`}>
          {i > 0 && (
            <span
              aria-hidden
              className="text-[10px] font-medium select-none"
              style={{ color: 'var(--fg-subtle)' }}
            >
              ↔
            </span>
          )}
          <TeamChip team={team} />
        </Fragment>
      ))}
    </div>
  );
}

function HotspotRow({
  hotspot,
  selected,
  onSelect,
}: {
  hotspot: CrossTeamHotspot;
  selected: boolean;
  onSelect?: (zoneId: string) => void;
}) {
  const isPath = looksLikePath(hotspot.label);
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={() => onSelect?.(hotspot.zoneId)}
      className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-md border text-left transition-colors duration-150"
      style={{
        background: selected ? 'var(--bg-surface-muted)' : 'transparent',
        borderColor: selected
          ? 'var(--border-strong)'
          : 'var(--border-muted)',
        minHeight: 56,
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
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <SeverityDot severity={hotspot.severity} />
          <span
            className={`text-[10px] font-semibold uppercase tracking-[0.10em] truncate ${
              isPath ? 'font-mono' : ''
            }`}
            style={{ color: 'var(--fg-default)' }}
          >
            {hotspot.label}
          </span>
        </div>
        <TeamChain teams={hotspot.teams} />
        <span
          className="text-[11px] leading-snug"
          style={{ color: 'var(--fg-muted)' }}
        >
          {hotspot.reason}
        </span>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <SeverityBadge severity={hotspot.severity} />
        <span
          className="text-[10px] font-mono tabular-nums"
          style={{ color: 'var(--fg-muted)' }}
        >
          <span style={{ color: 'var(--fg-default)' }}>
            {hotspot.weeklyCommits}
          </span>
          /wk
        </span>
      </div>
    </button>
  );
}

export function CrossTeamHotspotBoard({
  hotspots,
  selectedZoneId,
  onSelect,
}: CrossTeamHotspotBoardProps): JSX.Element {
  return (
    <GlassCard className="rounded-lg p-3">
      <SectionHeader
        title="Cross-team hotspots"
        badge={`${hotspots.length} detected`}
      />
      {hotspots.length === 0 ? (
        <div className="py-3">
          <EmptyHint text="No cross-team hotspots detected" />
        </div>
      ) : (
        <>
          <div role="listbox" className="flex flex-col gap-1">
            {hotspots.map((h) => (
              <HotspotRow
                key={h.id}
                hotspot={h}
                selected={h.zoneId === selectedZoneId}
                onSelect={onSelect}
              />
            ))}
          </div>
          <div
            className="mt-2 pt-2 border-t text-[10px] italic"
            style={{
              borderColor: 'var(--border-muted)',
              color: 'var(--fg-subtle)',
            }}
          >
            Detection considers approver count, team diversity, and weekly velocity.
          </div>
        </>
      )}
    </GlassCard>
  );
}
