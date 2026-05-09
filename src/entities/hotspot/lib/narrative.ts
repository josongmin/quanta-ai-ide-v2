import type { TemporalCouplingCluster } from '@entities/temporal-coupling';
import type { HotspotEntry, SignalKey } from '../model';
import { explainHotspot } from './explain';

export type HotspotActionType =
  | 'investigate'
  | 'owner_call'
  | 'refactor_stack'
  | 'test_reinforce';

export type HotspotAction = {
  type: HotspotActionType;
  label: string;
};

export type HotspotNarrative = {
  whyHot: string;
  whoAtRisk: string;
  whereToCut: string;
  actions: HotspotAction[];
};

const SIGNAL_LABEL: Record<SignalKey, string> = {
  change_pressure: 'change pressure',
  structural_friction: 'structural friction',
  health_deficit: 'health deficit',
  coupling_pressure: 'coupling pressure',
  criticality_proxy: 'criticality',
};

function topPercentText(percentile: number): string {
  return `top ${Math.max(1, Math.round((1 - percentile) * 100))}%`;
}

function pickActions(
  entry: HotspotEntry,
  coupling: TemporalCouplingCluster | null | undefined,
): HotspotAction[] {
  const actions: HotspotAction[] = [{ type: 'investigate', label: 'Start investigation' }];
  const primary = entry.contributions[0]?.key;

  if (primary === 'health_deficit') {
    actions.push({ type: 'test_reinforce', label: 'Reinforce tests' });
  }
  if (primary === 'structural_friction' || primary === 'coupling_pressure') {
    actions.push({ type: 'refactor_stack', label: 'Create refactor stack' });
  }
  if (coupling && coupling.fileIds.length >= 2) {
    actions.push({ type: 'refactor_stack', label: 'Split coupled cluster' });
  }
  if (entry.percentile >= 0.95) {
    actions.push({ type: 'owner_call', label: 'Call owner' });
  }
  return actions;
}

export function composeHotspotNarrative(
  entry: HotspotEntry,
  coupling?: TemporalCouplingCluster | null,
): HotspotNarrative {
  const explanation = explainHotspot(entry);
  const primary = explanation.primaryDriver;
  const secondary = explanation.secondaryDriver;

  const primaryShare = Math.round(primary.share * 100);
  const whyParts = [
    `${SIGNAL_LABEL[primary.key]} drives ${primaryShare}% (${topPercentText(entry.percentile)})`,
  ];
  if (secondary) {
    whyParts.push(`${SIGNAL_LABEL[secondary.key]} ${Math.round(secondary.share * 100)}%`);
  }
  const whyHot = whyParts.join('; ');

  const whoAtRisk = coupling && coupling.fileIds.length > 1
    ? `${coupling.fileIds.length} files move together; cluster ratio ${Math.round(coupling.averageRatio * 100)}%`
    : 'Owners of recent changes on this file';

  const whereToCut = coupling && coupling.edges.length > 0
    ? `Break the seam between most-coupled pair (ratio ${Math.round(coupling.edges[0].coChangeRatio * 100)}%)`
    : primary.key === 'structural_friction'
      ? 'Split the highest-complexity function first'
      : primary.key === 'coupling_pressure'
        ? 'Reduce fan-out on the strongest dependency'
        : 'Stabilize the most-churned region first';

  return {
    whyHot,
    whoAtRisk,
    whereToCut,
    actions: pickActions(entry, coupling ?? null),
  };
}
