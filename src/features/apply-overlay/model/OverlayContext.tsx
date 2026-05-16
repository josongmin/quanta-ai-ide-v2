import {
  createContext, useCallback, useContext, useMemo, useState, type ReactNode,
} from 'react';
import type { HeatMetricKey } from '@entities/metric';
import type { RiskLensKey, TimeWindow } from '@entities/repo';

type MetricOverlayCtx = {
  metric: HeatMetricKey;
  setMetric: (m: HeatMetricKey) => void;
  intensity: number;
  setIntensity: (n: number) => void;
  radius: number;
  setRadius: (n: number) => void;
  threshold: number;
  setThreshold: (n: number) => void;
};

type PathTracerCtx = {
  blastSeed: number | null;
  setBlastSeed: (id: number | null) => void;
  clearBlast: () => void;
  pathFrom: number | null;
  pathTo: number | null;
  setPath: (from: number | null, to: number | null) => void;
  clearPath: () => void;
  riskLens: RiskLensKey | null;
  setRiskLens: (l: RiskLensKey | null) => void;
};

type NetworkOverlayCtx = {
  timeWindow: TimeWindow;
  setTimeWindow: (w: TimeWindow) => void;
  apiRing: boolean;
  setApiRing: (v: boolean) => void;
  prSeed: number | null;
  setPrSeed: (s: number | null) => void;
};

type Ctx = MetricOverlayCtx & PathTracerCtx & NetworkOverlayCtx;

const MetricOverlayC = createContext<MetricOverlayCtx | null>(null);
const PathTracerC = createContext<PathTracerCtx | null>(null);
const NetworkOverlayC = createContext<NetworkOverlayCtx | null>(null);

function MetricOverlayProvider({ children }: { children: ReactNode }) {
  const [metric, setMetricState] = useState<HeatMetricKey>('none');
  const [intensity, setIntensityState] = useState(0.7);
  const [radius, setRadiusState] = useState(0.7);
  const [threshold, setThresholdState] = useState(0.05);

  const setMetric = useCallback((m: HeatMetricKey) => { setMetricState(() => m); }, []);
  const setIntensity = useCallback((n: number) => { setIntensityState(() => n); }, []);
  const setRadius = useCallback((n: number) => { setRadiusState(() => n); }, []);
  const setThreshold = useCallback((n: number) => { setThresholdState(() => n); }, []);

  const value = useMemo<MetricOverlayCtx>(() => ({
    metric, setMetric,
    intensity, setIntensity,
    radius, setRadius,
    threshold, setThreshold,
  }), [metric, setMetric, intensity, setIntensity, radius, setRadius, threshold, setThreshold]);

  return <MetricOverlayC.Provider value={value}>{children}</MetricOverlayC.Provider>;
}

function PathTracerProvider({ children }: { children: ReactNode }) {
  const [blastSeed, setBlastSeedState] = useState<number | null>(null);
  const [pathFrom, setPathFrom] = useState<number | null>(null);
  const [pathTo, setPathTo] = useState<number | null>(null);
  const [riskLens, setRiskLensState] = useState<RiskLensKey | null>(null);

  const setBlastSeed = useCallback((id: number | null) => { setBlastSeedState(() => id); }, []);
  const clearBlast = useCallback(() => { setBlastSeedState(null); }, []);
  const setPath = useCallback((from: number | null, to: number | null) => {
    setPathFrom(from);
    setPathTo(to);
  }, []);
  const clearPath = useCallback(() => {
    setPathFrom(null);
    setPathTo(null);
  }, []);
  const setRiskLens = useCallback((l: RiskLensKey | null) => { setRiskLensState(() => l); }, []);

  const value = useMemo<PathTracerCtx>(() => ({
    blastSeed, setBlastSeed, clearBlast,
    pathFrom, pathTo, setPath, clearPath,
    riskLens, setRiskLens,
  }), [
    blastSeed, setBlastSeed, clearBlast,
    pathFrom, pathTo, setPath, clearPath,
    riskLens, setRiskLens,
  ]);

  return <PathTracerC.Provider value={value}>{children}</PathTracerC.Provider>;
}

function NetworkOverlayProvider({ children }: { children: ReactNode }) {
  const [timeWindow, setTimeWindowState] = useState<TimeWindow>('90d');
  const [apiRing, setApiRingState] = useState<boolean>(false);
  const [prSeed, setPrSeedState] = useState<number | null>(null);

  const setTimeWindow = useCallback((w: TimeWindow) => { setTimeWindowState(() => w); }, []);
  const setApiRing = useCallback((v: boolean) => { setApiRingState(() => v); }, []);
  const setPrSeed = useCallback((s: number | null) => { setPrSeedState(() => s); }, []);

  const value = useMemo<NetworkOverlayCtx>(() => ({
    timeWindow, setTimeWindow,
    apiRing, setApiRing,
    prSeed, setPrSeed,
  }), [timeWindow, setTimeWindow, apiRing, setApiRing, prSeed, setPrSeed]);

  return <NetworkOverlayC.Provider value={value}>{children}</NetworkOverlayC.Provider>;
}

export function OverlayProvider({ children }: { children: ReactNode }) {
  return (
    <MetricOverlayProvider>
      <PathTracerProvider>
        <NetworkOverlayProvider>{children}</NetworkOverlayProvider>
      </PathTracerProvider>
    </MetricOverlayProvider>
  );
}

export function useMetricOverlay(): MetricOverlayCtx {
  const c = useContext(MetricOverlayC);
  if (!c) throw new Error('useMetricOverlay must be inside OverlayProvider');
  return c;
}

export function usePathTracer(): PathTracerCtx {
  const c = useContext(PathTracerC);
  if (!c) throw new Error('usePathTracer must be inside OverlayProvider');
  return c;
}

export function useNetworkOverlay(): NetworkOverlayCtx {
  const c = useContext(NetworkOverlayC);
  if (!c) throw new Error('useNetworkOverlay must be inside OverlayProvider');
  return c;
}

export function useOverlay(): Ctx {
  const metric = useMetricOverlay();
  const path = usePathTracer();
  const network = useNetworkOverlay();
  return useMemo<Ctx>(() => ({
    ...metric,
    ...path,
    ...network,
  }), [metric, path, network]);
}
