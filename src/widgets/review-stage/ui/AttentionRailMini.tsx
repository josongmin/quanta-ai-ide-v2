// ─────────────────────────────────────────────────────────────────────────
// AttentionRailMini — horizontal compact form of AttentionHeatmap, sized
// to live inside the ContextRail (the right-hand 300px column).
//
// The full sidebar version (AttentionHeatmap.tsx) is xl-only because it
// claims a fixed 18px column on the page. Below xl, the right rail is
// the only place a per-section attention indicator can live without
// stealing primary scan layout.
//
// Behaviour (mirrors AttentionHeatmap):
//   • IntersectionObserver picks the dominant section in viewport.
//   • 1s foreground tick increments active section's ms.
//   • Per-PR keyed map → no setState-in-effect on PR change.
//
// Visual differences:
//   • Horizontal bars (label left, bar right) instead of a vertical
//     mini-column. Uses ContextRail's available width for higher
//     resolution per bar.
//   • Total ms displayed in the section header rather than a footer.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';

type Props = {
  prNumber: number;
  sectionIds: string[];
  labels?: Record<string, string>;
  onJump?: (sectionId: string) => void;
};

const TICK_MS = 1000;

export default function AttentionRailMini({
  prNumber, sectionIds, labels = {}, onJump,
}: Props) {
  const [allMs, setAllMs] = useState<Record<string, Record<string, number>>>({});
  const msById = useMemo(
    () => allMs[String(prNumber)] ?? {},
    [allMs, prNumber],
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (sectionIds.length === 0) return;
    const elements: HTMLElement[] = [];
    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) elements.push(el);
    }
    if (elements.length === 0) return;
    let visible = new Map<string, number>();
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const id = (e.target as HTMLElement).id;
        if (!id) continue;
        if (e.isIntersecting) visible.set(id, e.intersectionRatio);
        else visible.delete(id);
      }
      let bestId: string | null = null;
      let bestRatio = 0;
      for (const id of sectionIds) {
        const r = visible.get(id) ?? 0;
        if (r > bestRatio) { bestId = id; bestRatio = r; }
      }
      setActiveId(bestId);
    }, { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] });
    for (const el of elements) obs.observe(el);
    return () => {
      obs.disconnect();
      visible = new Map();
    };
  }, [sectionIds]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (activeId === null) return;
      setAllMs((prev) => {
        const key = String(prNumber);
        const slice = prev[key] ?? {};
        return {
          ...prev,
          [key]: { ...slice, [activeId]: (slice[activeId] ?? 0) + TICK_MS },
        };
      });
    }, TICK_MS);
    return () => { window.clearInterval(id); };
  }, [activeId, prNumber]);

  const { totalMs, maxMs } = useMemo(() => {
    let total = 0;
    let max = 0;
    for (const id of sectionIds) {
      const v = msById[id] ?? 0;
      total += v;
      if (v > max) max = v;
    }
    return { totalMs: total, maxMs: max };
  }, [msById, sectionIds]);

  if (sectionIds.length === 0) return null;
  // Suppress until ≥10s spent — a near-empty heatmap reads as broken.
  if (totalMs < 10_000) return null;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-subtle)]">
          Attention
        </span>
        <span
          className="text-[10px] font-mono tabular-nums text-[var(--fg-muted)] ml-auto"
          title={`Total foreground time on this PR: ${formatMs(totalMs)}`}
        >
          {formatMs(totalMs)}
        </span>
      </div>
      <ul className="space-y-1">
        {sectionIds.map((id) => {
          const ms = msById[id] ?? 0;
          const ratio = maxMs > 0 ? ms / maxMs : 0;
          const isActive = id === activeId;
          const label = labels[id] ?? id;
          // Rationale for chrome-saturation curve: small ratios still
          // need a visible bar so a 5s glance shows up. Curve maps
          // 0→8% width minimum, 1→100%.
          const widthPct = Math.max(8, Math.round(ratio * 100));
          const alpha = 0.18 + ratio * 0.65;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => { onJump?.(id); }}
                aria-label={`${label} — ${formatMs(ms)} attended`}
                className="w-full flex items-center gap-2 px-1.5 py-1 rounded hover:bg-[var(--bg-surface-muted)] transition-colors group"
              >
                <span className="shrink-0 w-14 text-sm font-mono text-[var(--fg-muted)] text-left truncate">
                  {label}
                </span>
                <span
                  className="flex-1 h-1.5 rounded-sm overflow-hidden"
                  style={{ background: 'var(--bg-hover)' }}
                >
                  <span
                    className="block h-full"
                    style={{
                      width: `${widthPct}%`,
                      background: `color-mix(in srgb, var(--fg-accent) ${String(Math.round(alpha * 100))}%, transparent)`,
                      outline: isActive ? '1px solid color-mix(in srgb, var(--fg-accent) 60%, transparent)' : 'none',
                      outlineOffset: -1,
                    }}
                  />
                </span>
                <span className="shrink-0 w-9 text-xs font-mono tabular-nums text-[var(--fg-muted)] text-right">
                  {ms === 0 ? '—' : formatMsCompact(ms)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatMs(ms: number): string {
  if (ms < 1000) return '0s';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${String(s)}s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return `${String(m)}m ${rest < 10 ? `0${String(rest)}` : String(rest)}s`;
}
function formatMsCompact(ms: number): string {
  if (ms < 60_000) return `${String(Math.floor(ms / 1000))}s`;
  return `${String(Math.floor(ms / 60_000))}m`;
}
