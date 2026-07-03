import type { HotspotEntry } from '@entities/hotspot';
import type { TemporalCouplingCluster } from '@entities/temporal-coupling';
import { HotspotListCard } from './HotspotListCard';

export type SeamCandidate = {
  cluster: TemporalCouplingCluster;
  topEntry: HotspotEntry;
  aggregateScore: number;
};

export type TriageRailProps = {
  top: HotspotEntry[];
  newlyEntering: HotspotEntry[];
  deteriorating: HotspotEntry[];
  seamCandidates: SeamCandidate[];
  fileLabel?: (fileId: number) => string;
};

export function TriageRail({
  top,
  newlyEntering,
  deteriorating,
  seamCandidates,
  fileLabel,
}: TriageRailProps) {
  const seamEntries = seamCandidates.map((s) => s.topEntry);
  const seamRatioByFile = new Map(
    seamCandidates.map((s) => [s.topEntry.fileId, s.cluster.averageRatio]),
  );

  return (
    <div className="space-y-3">
      <HotspotListCard
        title="Top 10 hotspots"
        entries={top}
        fileLabel={fileLabel}
        emptyText="No hotspots yet"
      />
      <HotspotListCard
        title="Newly entering"
        entries={newlyEntering}
        fileLabel={fileLabel}
        emptyText="No new entries this period"
      />
      <HotspotListCard
        title="Deteriorating"
        entries={deteriorating}
        fileLabel={fileLabel}
        emptyText="No regressions detected"
      />
      <HotspotListCard
        title="Seam candidates"
        entries={seamEntries}
        fileLabel={fileLabel}
        emptyText="No coupling clusters above threshold"
        rightSlot={(entry) => {
          const ratio = seamRatioByFile.get(entry.fileId);
          if (ratio === undefined) return null;
          return (
            <span
              className="text-2xs font-mono tabular-nums"
              style={{ color: 'var(--fg-subtle)' }}
            >
              {Math.round(ratio * 100)}%
            </span>
          );
        }}
      />
    </div>
  );
}
