export type SignalKey =
  | 'change_pressure'
  | 'structural_friction'
  | 'health_deficit'
  | 'coupling_pressure'
  | 'criticality_proxy';

export type HotspotSignals = Record<SignalKey, number>;

export type SignalContribution = {
  key: SignalKey;
  value: number;
  share: number;
};

export type HotspotEntry = {
  fileId: number;
  score: number;
  percentile: number;
  signals: HotspotSignals;
  contributions: SignalContribution[];
};

export type HotspotExplanation = {
  primaryDriver: SignalContribution;
  secondaryDriver: SignalContribution | null;
  narrativeKey: string;
  narrativeParams: Record<string, string | number>;
};

export const HOTSPOT_VISIBLE_PERCENTILE = 0.9;
