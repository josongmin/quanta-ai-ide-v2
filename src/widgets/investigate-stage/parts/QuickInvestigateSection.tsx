import type { CSSProperties } from 'react';
import type { HotspotEntry } from '@entities/hotspot';
import { MOCK_SUSPECTS } from '@entities/suspect';
import { useInvestigation } from '@features/investigation';
import { InvestigateHotspotRow } from './InvestigateHotspotRow';
import { InvestigateIncidentRow } from './InvestigateIncidentRow';

type Props = {
  topHotspots: HotspotEntry[];
  fileLabel: (id: number) => string;
  incidentIds: string[];
};

export function QuickInvestigateSection({ topHotspots, fileLabel, incidentIds }: Props) {
  const { start } = useInvestigation();

  const subhead: CSSProperties = {
    color: 'var(--fg-subtle)',
    fontSize: '10px',
  };

  const colHeader: CSSProperties = {
    color: 'var(--fg-muted)',
    fontSize: '10px',
  };

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2
          className="text-[11px] uppercase tracking-[0.18em] font-black"
          style={{ color: 'var(--fg-default)' }}
        >
          Quick investigate
        </h2>
        <span style={subhead} className="uppercase tracking-[0.16em] font-semibold">
          launch the AI workspace on a target
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div
            className="font-black uppercase tracking-[0.18em]"
            style={colHeader}
          >
            Hotspots
          </div>
          <div className="space-y-1">
            {topHotspots.slice(0, 5).map((entry) => (
              <InvestigateHotspotRow
                key={entry.fileId}
                entry={entry}
                label={fileLabel(entry.fileId)}
                onInvestigate={start}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div
            className="font-black uppercase tracking-[0.18em]"
            style={colHeader}
          >
            Incidents
          </div>
          <div className="space-y-1">
            {incidentIds.map((id) => {
              const ranking = MOCK_SUSPECTS[id];
              const top = ranking?.suspects[0] ?? null;
              return (
                <InvestigateIncidentRow
                  key={id}
                  incidentId={id}
                  topSuspect={top}
                  onInvestigate={start}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default QuickInvestigateSection;
