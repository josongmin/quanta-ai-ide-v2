import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTheme } from '@shared/theme';
import { useTranslation } from '@shared/i18n';
import { useFilterStore } from '@features/filter-files';
import { useViewMode, createMode } from '@features/switch-mode';
import { useTabVisibility } from '@features/workspace-tabs';
// Deep-import the hooks rather than the slice barrels — those re-export
// heavy UI (OverlayPopover, FocusScanStack) that would otherwise ride into
// the initial chunk through this stage.
import { useOverlay } from '@features/apply-overlay/model/OverlayContext';
import { useBoundaries } from '@features/inspect-boundaries/model/BoundaryContext';
import { useStack } from '@features/inspect-target/model/StackContext';
import type { OverlaySnapshot, ViewMode } from '@entities/viz-mode';
import type { FileRecord } from '@entities/repo';

type Tooltip = { open: boolean; x: number; y: number; file: FileRecord | null };

export default function Stage() {
  const repo = useFilterStore((s) => s.repo);
  const { mode } = useViewMode();
  const { isDark } = useTheme();
  const overlay = useOverlay();
  const boundaries = useBoundaries();
  const stack = useStack();
  const visible = useTabVisibility();

  const mountRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const fileLabelsRef = useRef<HTMLDivElement>(null);

  const [tooltip, setTooltip] = useState<Tooltip>({ open: false, x: 0, y: 0, file: null });
  // Mode instance was previously exposed to React state for the AI
  // activity overlay (now removed). Kept as a no-op setter ref so the
  // mode-init effect's call sites stay structurally identical.
  const setActiveMode: (m: ViewMode | null) => void = () => { /* overlay disabled */ };

  const themeRef = useRef<'dark' | 'light'>(isDark ? 'dark' : 'light');
  const visibleRef = useRef(visible);
  const stackRef = useRef(stack);
  const overlayRef = useRef<OverlaySnapshot>({
    metric: overlay.metric, intensity: overlay.intensity, radius: overlay.radius, threshold: overlay.threshold,
    timeWindow: overlay.timeWindow, blastSeed: overlay.blastSeed,
    pathFrom: overlay.pathFrom, pathTo: overlay.pathTo,
    riskLens: overlay.riskLens, apiRing: overlay.apiRing,
    prSeed: overlay.prSeed,
    showEntry: boundaries.showEntry,
    showIngress: boundaries.showIngress,
    showEgress: boundaries.showEgress,
    ingressProtocols: boundaries.ingressProtocols,
    egressProtocols: boundaries.egressProtocols,
  });

  // Sync refs after commit. Modes read these every frame from imperative
  // animate loops, so they must be up-to-date but must never trigger a
  // re-render. useLayoutEffect with no deps runs after every commit, which
  // matches the previous 16-key dependency list without the bookkeeping.
  useLayoutEffect(() => {
    themeRef.current = isDark ? 'dark' : 'light';
    visibleRef.current = visible;
    stackRef.current = stack;
    overlayRef.current = {
      metric: overlay.metric, intensity: overlay.intensity, radius: overlay.radius, threshold: overlay.threshold,
      timeWindow: overlay.timeWindow, blastSeed: overlay.blastSeed,
      pathFrom: overlay.pathFrom, pathTo: overlay.pathTo,
      riskLens: overlay.riskLens, apiRing: overlay.apiRing,
      prSeed: overlay.prSeed,
      showEntry: boundaries.showEntry,
      showIngress: boundaries.showIngress,
      showEgress: boundaries.showEgress,
      ingressProtocols: boundaries.ingressProtocols,
      egressProtocols: boundaries.egressProtocols,
    };
  });

  // Esc clears the blast-radius preview before it tears down the focus
  // panel — overlay state outlives selection, so we want a hop-out for the
  // preview alone.
  useEffect(() => {
    if (overlay.blastSeed === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') overlay.clearBlast();
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
    // Narrow deps to the two fields actually consumed. `[overlay]` was
    // re-running this every time ANY overlay field flipped (metric /
    // intensity / radius / etc.), thrashing the keydown listener while
    // the user dragged a slider. blastSeed gates the effect; clearBlast
    // is stable but kept in deps to satisfy exhaustive-deps and document
    // the closure contract.
  }, [overlay.blastSeed, overlay.clearBlast]);

  // Mode factories live in a registry keyed by ViewModeId — adding a new
  // mode is now a one-line edit in switch-mode/lib/registry.ts; this widget
  // is closed to that change.
  //
  // `createMode` is async — the heavy three.js bundle and per-mode scene
  // code are dynamic-imported on first use (and on every mode switch, but
  // Vite caches the chunks). We track a per-effect `cancelled` flag so a
  // rapid mode toggle that resolves out of order can't init/dispose the
  // wrong instance.
  useEffect(() => {
    const mount = mountRef.current;
    const labelsEl = labelsRef.current;
    const fileLabelsEl = fileLabelsRef.current;
    if (!mount || !labelsEl || !fileLabelsEl) return;

    let cancelled = false;
    let modeInstance: ViewMode | null = null;
    let onResize: (() => void) | null = null;
    let ro: ResizeObserver | null = null;
    // Track the rAF id so we can cancel a pending resize callback during
    // teardown. Without this, a tab switch (or any rapid mode change) can
    // race a still-queued resize callback against an already-disposed mode.
    let resizeRafId = 0;

    void createMode(mode).then((instance) => {
      if (cancelled) {
        // Effect was torn down before the chunk arrived; the freshly
        // created instance never had `init` called, so just drop it.
        return;
      }
      modeInstance = instance;
      setActiveMode(instance);

      instance.init({
        mountEl: mount,
        labelsEl,
        fileLabelsEl,
        repo,
        getFilter: () => {
          const s = useFilterStore.getState();
          return { matched: s.matched, rankByFileId: s.rankByFileId, state: s.state };
        },
        getOverlay: () => overlayRef.current,
        getTheme: () => themeRef.current,
        getVisible: () => visibleRef.current,
        onHover: (id, x = 0, y = 0) => {
          if (id === null) {
            setTooltip((t) => (t.open ? { ...t, open: false } : t));
          } else {
            setTooltip({ open: true, x: x + 14, y: y + 14, file: repo.files[id] });
          }
        },
        onSelect: (id) => {
          if (id === null) {
            stackRef.current.open({ kind: 'workspace' });
            return;
          }
          stackRef.current.open({ kind: 'file', id });
        },
      });

      onResize = () => {
        const r = mount.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) instance.onResize(r.width, r.height);
      };
      window.addEventListener('resize', onResize);
      // Defer the first measurement one frame so the layout has settled,
      // but track the id so teardown can cancel it on rapid unmount.
      resizeRafId = requestAnimationFrame(onResize);
      ro = new ResizeObserver(onResize);
      ro.observe(mount);
    });

    return () => {
      cancelled = true;
      if (resizeRafId !== 0) cancelAnimationFrame(resizeRafId);
      if (onResize) window.removeEventListener('resize', onResize);
      if (ro) ro.disconnect();
      if (modeInstance) modeInstance.dispose();
      setActiveMode(null);
    };
  }, [mode, repo]);

  return (
    <div className="absolute inset-0" style={{ background: 'var(--bg-stage)' }}>
      {/* mountRef carries its own theme-coloured fill so the brief window
          between Stage mounting and DotFieldMode.init() appending the
          WebGL canvas never exposes a transparent (and thus possibly
          white) frame underneath. */}
      <div
        ref={mountRef}
        className="absolute inset-0"
        style={{ background: 'var(--bg-stage)' }}
      />
      <div ref={labelsRef} className="absolute inset-0 pointer-events-none" />
      <div ref={fileLabelsRef} className="absolute inset-0 pointer-events-none" />

      {/* AI activity overlay disabled — was bleeding through the
          FilterBar / InspectPanel as ghost toasts ("REVIEWING …",
          dashed scan zones, drifting purple dots). Re-enable by
          restoring <ActivityDemo /> + <ActivityOverlay /> below. */}

      {tooltip.open && tooltip.file && (
        <FileTooltip x={tooltip.x} y={tooltip.y} file={tooltip.file} isDark={isDark} />
      )}
      {/* FocusScanStack used to live here, but as a child of Stage its
          GlassCards lost backdrop-filter refraction — Stage root paints an
          opaque `--bg-stage` fill that becomes the nearest backdrop, so the
          dots painted on the WebGL canvas (Stage's first child) never reach
          the panel's backdrop. The stack is now mounted at the router level
          as a sibling of Stage, the same way FilterBar / overlay buttons are.
          See router.tsx. */}
    </div>
  );
}

function FileTooltip({ x, y, file, isDark }: { x: number; y: number; file: FileRecord; isDark: boolean }) {
  const { t } = useTranslation('app');
  return (
    <div
      className={`fixed z-[100] pointer-events-none text-[11px] px-3 py-2.5 rounded-xl border shadow-2xl ${
        isDark
          ? 'bg-black/70 border-white/10 text-white/85 backdrop-blur-2xl'
          : 'bg-white border-black/10 text-black/85'
      }`}
      style={{ left: x, top: y }}
    >
      <div className="font-bold mb-1">{file.name}</div>
      <div className={`text-[9px] mb-2 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
        {file.folderPath || 'root'}
      </div>
      <div className={`space-y-1 border-t pt-2 text-[10px] ${isDark ? 'border-white/10' : 'border-black/10'}`}>
        <Row label={t('tooltip.loc')} value={file.metrics.loc} />
        <Row label={t('tooltip.complexity')} value={file.metrics.complexity} valueClass="text-[#4f9a5c]" />
        <Row label={t('tooltip.fanInOut')} value={`${file.metrics.fanIn} / ${file.metrics.fanOut}`} />
        <Row label={t('tooltip.blastRadius')} value={file.metrics.blastRadius} />
        <Row
          label={t('tooltip.editSafety')}
          value={`${file.metrics.editSafety}/100`}
          valueClass={safetyClass(file.metrics.editSafety, isDark)}
          valueStyle={file.metrics.editSafety >= 20 && file.metrics.editSafety < 40 ? { color: 'var(--intent-warn-vivid)' } : undefined}
        />
        <Row
          label={t('tooltip.confidence')}
          value={file.metrics.confidence.toUpperCase()}
          valueClass={confidenceClass(file.metrics.confidence)}
        />
        {file.metrics.unknownReasons.length > 0 && (
          <div
            style={{ color: 'color-mix(in srgb, var(--intent-warn-fg) 80%, transparent)' }}
            className="text-[9px] mt-1 italic"
          >
            {t('tooltip.warning', { reasons: file.metrics.unknownReasons.join(' · ') })}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, valueClass, valueStyle }: { label: string; value: string | number; valueClass?: string; valueStyle?: React.CSSProperties }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="opacity-60">{label}</span>
      <b className={valueClass ?? ''} style={valueStyle}>{value}</b>
    </div>
  );
}

function confidenceClass(c: 'exact' | 'overapprox' | 'unknown' | 'stale'): string {
  switch (c) {
    case 'exact':      return 'text-[#5fa86c]';
    case 'overapprox': return 'text-[#a8893a]';
    case 'unknown':    return 'text-[#c25a55]';
    case 'stale':      return 'text-slate-400';
  }
}
function safetyClass(s: number, isDark: boolean): string {
  void isDark;
  if (s >= 70) return 'text-[#5fa86c]';
  if (s >= 40) return 'text-[#a8893a]';
  if (s >= 20) return '';
  return 'text-[#c25a55]';
}
