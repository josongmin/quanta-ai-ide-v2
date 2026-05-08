import {
  createContext, useCallback, useContext, useMemo, useState, type ReactNode,
} from 'react';
import type { HeatMetricKey } from '@entities/metric';
import type { RiskLensKey, TimeWindow } from '@entities/repo';

type Ctx = {
  metric: HeatMetricKey;
  setMetric: (m: HeatMetricKey) => void;
  intensity: number;       // 0..1 multiplier for halo alpha
  setIntensity: (n: number) => void;
  radius: number;          // 0..1 multiplier for halo size
  setRadius: (n: number) => void;
  threshold: number;       // 0..1 — scores below this are clipped to 0
  setThreshold: (n: number) => void;

  // Time-axis hotspot — when active, the overlay heat is replaced by a
  // window-scaled churn×complexity score (`metric: 'time-hotspot'`). Picker
  // sits next to the metric dropdown.
  timeWindow: TimeWindow;
  setTimeWindow: (w: TimeWindow) => void;

  // Blast radius preview — id of the file whose transitive dependents
  // should be highlighted on the stage. Cleared on Esc / "clear blast".
  blastSeed: number | null;
  setBlastSeed: (id: number | null) => void;
  clearBlast: () => void;

  // Path witness — a from→to file pair whose shortest dependency path
  // should glow on the stage. Triggered from the "Trace path to…" action.
  pathFrom: number | null;
  pathTo: number | null;
  setPath: (from: number | null, to: number | null) => void;
  clearPath: () => void;

  // Risk lens — pre-baked overlay preset. Mutually exclusive with the raw
  // metric dropdown; activating a lens forces `metric` to a sentinel and
  // pins the lens key on the snapshot.
  riskLens: RiskLensKey | null;
  setRiskLens: (l: RiskLensKey | null) => void;

  // Public-API ring — a thin outer ring around files whose external fanIn
  // suggests they're widely consumed. Toggle, no payload.
  apiRing: boolean;
  setApiRing: (v: boolean) => void;

  // PR preview — when set, the stage shows a synthetic before/after diff
  // keyed by this seed. Setting null clears the diff.
  prSeed: number | null;
  setPrSeed: (s: number | null) => void;
};

const C = createContext<Ctx | null>(null);

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [metric, setMetricState] = useState<HeatMetricKey>('none');
  const [intensity, setIntensityState] = useState(0.7);
  const [radius, setRadiusState] = useState(0.7);
  const [threshold, setThresholdState] = useState(0.05);
  const [timeWindow, setTimeWindowState] = useState<TimeWindow>('90d');
  const [blastSeed, setBlastSeedState] = useState<number | null>(null);
  const [pathFrom, setPathFrom] = useState<number | null>(null);
  const [pathTo, setPathTo] = useState<number | null>(null);
  const [riskLens, setRiskLensState] = useState<RiskLensKey | null>(null);
  const [apiRing, setApiRingState] = useState<boolean>(false);
  const [prSeed, setPrSeedState] = useState<number | null>(null);

  const setMetric = useCallback((m: HeatMetricKey) => { setMetricState(() => m); }, []);
  const setIntensity = useCallback((n: number) => { setIntensityState(() => n); }, []);
  const setRadius = useCallback((n: number) => { setRadiusState(() => n); }, []);
  const setThreshold = useCallback((n: number) => { setThresholdState(() => n); }, []);
  const setTimeWindow = useCallback((w: TimeWindow) => { setTimeWindowState(() => w); }, []);
  const setBlastSeed = useCallback((id: number | null) => { setBlastSeedState(() => id); }, []);
  const setRiskLens = useCallback((l: RiskLensKey | null) => { setRiskLensState(() => l); }, []);
  const setApiRing = useCallback((v: boolean) => { setApiRingState(() => v); }, []);
  const setPrSeed = useCallback((s: number | null) => { setPrSeedState(() => s); }, []);

  const clearBlast = useCallback(() => { setBlastSeedState(null); }, []);
  const setPath = useCallback((from: number | null, to: number | null) => {
    setPathFrom(from);
    setPathTo(to);
  }, []);
  const clearPath = useCallback(() => {
    setPathFrom(null);
    setPathTo(null);
  }, []);

  const value = useMemo<Ctx>(() => ({
    metric, setMetric,
    intensity, setIntensity,
    radius, setRadius,
    threshold, setThreshold,
    timeWindow, setTimeWindow,
    blastSeed, setBlastSeed, clearBlast,
    pathFrom, pathTo, setPath, clearPath,
    riskLens, setRiskLens,
    apiRing, setApiRing,
    prSeed, setPrSeed,
  }), [
    metric, setMetric,
    intensity, setIntensity,
    radius, setRadius,
    threshold, setThreshold,
    timeWindow, setTimeWindow,
    blastSeed, setBlastSeed, clearBlast,
    pathFrom, pathTo, setPath, clearPath,
    riskLens, setRiskLens,
    apiRing, setApiRing,
    prSeed, setPrSeed,
  ]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useOverlay(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error('useOverlay must be inside OverlayProvider');
  return c;
}
