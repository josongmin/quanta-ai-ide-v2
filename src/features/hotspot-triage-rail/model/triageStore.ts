import type { HotspotEntry } from '@entities/hotspot';
import type { TemporalCouplingCluster } from '@entities/temporal-coupling';

export function selectTopHotspots(entries: HotspotEntry[], n = 10): HotspotEntry[] {
  return [...entries].sort((a, b) => b.score - a.score).slice(0, n);
}

export function selectNewlyEntering(
  prev: HotspotEntry[],
  curr: HotspotEntry[],
  visiblePercentile = 0.9,
): HotspotEntry[] {
  const prevHot = new Set(
    prev.filter((e) => e.percentile >= visiblePercentile).map((e) => e.fileId),
  );
  return curr
    .filter((e) => e.percentile >= visiblePercentile && !prevHot.has(e.fileId))
    .sort((a, b) => b.score - a.score);
}

export function selectDeteriorating(
  prev: HotspotEntry[],
  curr: HotspotEntry[],
  minDelta = 0.05,
): (HotspotEntry & { delta: number })[] {
  const prevById = new Map(prev.map((e) => [e.fileId, e]));
  const out: (HotspotEntry & { delta: number })[] = [];
  for (const e of curr) {
    const before = prevById.get(e.fileId);
    if (!before) continue;
    const delta = e.score - before.score;
    if (delta >= minDelta) out.push({ ...e, delta });
  }
  out.sort((a, b) => b.delta - a.delta);
  return out;
}

export function selectSeamCandidates(
  entries: HotspotEntry[],
  couplings: TemporalCouplingCluster[],
  n = 10,
): { cluster: TemporalCouplingCluster; topEntry: HotspotEntry; aggregateScore: number }[] {
  const byFile = new Map(entries.map((e) => [e.fileId, e]));
  const ranked: {
    cluster: TemporalCouplingCluster;
    topEntry: HotspotEntry;
    aggregateScore: number;
  }[] = [];

  for (const cluster of couplings) {
    let topEntry: HotspotEntry | null = null;
    let aggregate = 0;
    for (const fileId of cluster.fileIds) {
      const entry = byFile.get(fileId);
      if (!entry) continue;
      aggregate += entry.score;
      if (!topEntry || entry.score > topEntry.score) topEntry = entry;
    }
    if (!topEntry) continue;
    ranked.push({
      cluster,
      topEntry,
      aggregateScore: aggregate * cluster.averageRatio,
    });
  }

  ranked.sort((a, b) => b.aggregateScore - a.aggregateScore);
  return ranked.slice(0, n);
}
