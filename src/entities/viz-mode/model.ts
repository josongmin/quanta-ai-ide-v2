import type {
  RepoData, FilterState, RiskLensKey, TimeWindow,
  IngressProtocol, EgressProtocol,
} from '@entities/repo';
import type { HeatMetricKey } from '@entities/metric';

export type FilterSnapshot = {
  state: FilterState;
  matched: Uint8Array;
  rankByFileId: Int32Array;
};

export type OverlaySnapshot = {
  metric: HeatMetricKey;
  intensity: number;   // 0..1
  radius: number;      // 0..1
  threshold: number;   // 0..1
  // Time-axis hotspot — only consulted when `metric === 'time-hotspot'`.
  timeWindow: TimeWindow;
  // Blast radius preview — when set, the mode highlights transitive
  // dependents of this file id on top of (or instead of) the heat overlay.
  blastSeed: number | null;
  // Path witness — endpoints of the shortest dependency path the mode
  // should highlight. Both must be set for anything to render.
  pathFrom: number | null;
  pathTo: number | null;
  // Risk lens preset — when non-null, the mode renders the lens-specific
  // top-N glow regardless of `metric`.
  riskLens: RiskLensKey | null;
  // Public-API ring — outer ring on files with high external fanIn.
  apiRing: boolean;
  // PR preview seed — when non-null the mode tints added/modified/deleted
  // files in distinct hues and pulses their direct ripple.
  prSeed: number | null;
  // Boundary markers — entry points / ingress / egress glyphs. Each toggle
  // is independent of the heat overlay; protocol sets gate per-kind filter.
  showEntry: boolean;
  showIngress: boolean;
  showEgress: boolean;
  ingressProtocols: ReadonlySet<IngressProtocol>;
  egressProtocols: ReadonlySet<EgressProtocol>;
};

export type ViewModeContext = {
  mountEl: HTMLDivElement;
  labelsEl: HTMLDivElement;
  fileLabelsEl: HTMLDivElement;
  repo: RepoData;
  // Imperative pull — never re-render-driven; modes call this every frame.
  getFilter: () => FilterSnapshot;
  getOverlay: () => OverlaySnapshot;
  // Set tooltip / detail card from inside the mode (mode-agnostic UI).
  onHover: (fileId: number | null, screenX?: number, screenY?: number) => void;
  onSelect: (fileId: number | null) => void;
  // Latest theme. Modes read each frame for live recoloring on toggle.
  getTheme: () => 'dark' | 'light';
  // Tab-host visibility. When the panel hosting this mode is hidden behind
  // another tab (`display:none`), the mode should skip the expensive part
  // of its rAF loop (renderer.render, DOM label updates, controls damping)
  // — keep the rAF reschedule cheap so resume is seamless when shown again.
  // Defaults to `true` if the caller has no visibility signal.
  getVisible: () => boolean;
};

export type ViewMode = {
  id: ViewModeId;
  label: string;
  init: (ctx: ViewModeContext) => void;
  dispose: () => void;
  onResize: (w: number, h: number) => void;
  // Optional projection helper — modes that have a deterministic world →
  // screen mapping (e.g. dot-field's top-down camera) implement this so
  // overlays like AI activity can pin DOM elements over file dots. Modes
  // without a stable layout (universe's zoomable starfield) leave this
  // undefined and the overlay falls back to a non-spatial readout.
  worldToScreen?: (fileId: number) => { x: number; y: number } | null;
};

// Unknown / Cycles are now heat-overlay metrics rendered inside Dot Field
// (they shared the same grid layout — separating them was a UX mistake).
// Universe stays separate because its starfield camera/layout is genuinely
// different from the Dot Field.
export type ViewModeId = 'dot-field' | 'universe';

export type ViewModeFactory = () => ViewMode;
