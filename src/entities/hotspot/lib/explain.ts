import type { HotspotEntry, HotspotExplanation, SignalKey } from '../model';

const NARRATIVE_KEY: Record<SignalKey, string> = {
  change_pressure: 'hotspot.narrative.changePressure',
  structural_friction: 'hotspot.narrative.structuralFriction',
  health_deficit: 'hotspot.narrative.healthDeficit',
  coupling_pressure: 'hotspot.narrative.couplingPressure',
  criticality_proxy: 'hotspot.narrative.criticalityProxy',
};

export function explainHotspot(entry: HotspotEntry): HotspotExplanation {
  const [primary, secondary] = entry.contributions;
  return {
    primaryDriver: primary,
    secondaryDriver: secondary ?? null,
    narrativeKey: NARRATIVE_KEY[primary.key],
    narrativeParams: {
      percentile: Math.round(entry.percentile * 100),
      primaryShare: Math.round(primary.share * 100),
      secondary: secondary ? secondary.key : '',
    },
  };
}
