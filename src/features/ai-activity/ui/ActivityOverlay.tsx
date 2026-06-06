import { useEffect, useMemo, useRef, useState } from 'react';
import type { ViewMode } from '@entities/viz-mode';
import { useFilterStore } from '@entities/filter-state';
import { useTabVisibility } from '@features/workspace-tabs';
import { useActivityStore } from '../model/activityStore';

// Per-tick projected positions for every (chatId, fileId) pair. Recomputed
// every animation frame because the user can pan/rotate/zoom the camera
// at any time.
type Pin = {
  chatId: string;
  fileId: number;
  x: number;
  y: number;
  hue: string;
  state: 'thinking' | 'editing' | 'done';
  folder: string;
};

const SPEED_MS: Record<'slow' | 'normal' | 'fast', number> = {
  slow: 3000, normal: 1800, fast: 1100,
};

const INTENSITY_OPACITY: Record<'subtle' | 'normal' | 'loud', number> = {
  subtle: 0.45, normal: 0.75, loud: 1,
};

// Static root style — width/height never change, so hoist it to module scope
// and merge the only dynamic bit (`--pin-period`) per render.
const SVG_ROOT_STYLE = { width: '100%', height: '100%' } as const;

// The core dot's drop-shadow filter depends only on the pin hue, and hues
// come from a small curated palette that repeats across pins. Memoise the
// computed filter string per hue so identical hues don't reallocate the
// template literal (and the wrapping style object) every frame.
const dotFilterCache = new Map<string, { filter: string }>();
function dotFilterStyle(hue: string): { filter: string } {
  let style = dotFilterCache.get(hue);
  if (!style) {
    style = { filter: `drop-shadow(0 0 4px ${hue})` };
    dotFilterCache.set(hue, style);
  }
  return style;
}

export function ActivityOverlay({ mode }: { mode: ViewMode }) {
  // One subscription instead of six: `prefs` is replaced as a unit by
  // the store, so a single selector reads exactly the same set of
  // fields without registering 6 separate subscribers (and 6 separate
  // equality comparisons per mutation).
  const { enabled, showRing, showLine, showZone, speed, intensity } =
    useActivityStore((s) => s.prefs);
  const repo = useFilterStore((s) => s.repo);
  const visible = useTabVisibility();
  const [pins, setPins] = useState<Pin[]>([]);

  const rafRef = useRef<number>(0);

  // Memoise the bound projector so the rAF effect's dependency array stays
  // stable across renders. Without this, every parent re-render produced a
  // fresh function identity, restarting the animation loop and dropping a
  // frame on every Stage tick.
  const projectFn = useMemo(
    () => mode.worldToScreen?.bind(mode) ?? null,
    [mode],
  );

  /* eslint-disable react-hooks/set-state-in-effect --
   * The synchronous `setPins` on disable is guarded with a same-value bail
   * (`prev.length === 0 ? prev : []`) so React skips the re-render. The
   * remaining setPins calls run inside requestAnimationFrame, not the
   * effect body, so the rule's cascading-render concern does not apply.
   */
  useEffect(() => {
    if (!enabled || !projectFn || !visible) {
      setPins((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    const project = projectFn;

    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const acts = useActivityStore.getState().activities;
      const out: Pin[] = [];
      for (const a of acts) {
        for (const fid of a.fileIds) {
          const p = project(fid);
          if (!p) continue;
          const f = repo.files[fid];
          if (!f) continue;
          out.push({
            chatId: a.chatId,
            fileId: fid,
            x: p.x,
            y: p.y,
            hue: a.hue,
            state: a.state,
            folder: f.folderPath,
          });
        }
      }
      setPins(out);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
    };
    // Including `visible` in deps means hiding the host tab tears the rAF
    // chain down cleanly (cleanup runs, cancelAnimationFrame fires) and
    // showing it re-creates a fresh loop on the next render — strictly
    // simpler than polling visibleRef inside `tick` every frame.
  }, [enabled, projectFn, repo, visible]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!enabled || pins.length === 0) return null;

  const period = SPEED_MS[speed];
  const baseOpacity = INTENSITY_OPACITY[intensity];
  // Precompute the two possible ring opacities once per render instead of
  // recomputing the multiply for every pin.
  const ringOpacityDone = baseOpacity * 0.3;
  const rootStyle = { ...SVG_ROOT_STYLE, '--pin-period': `${period}ms` } as React.CSSProperties;

  // Group pins by chat to draw connection lines + folder zone hulls.
  const byChat = new Map<string, Pin[]>();
  for (const p of pins) {
    const arr = byChat.get(p.chatId) ?? [];
    arr.push(p);
    byChat.set(p.chatId, arr);
  }

  return (
    <svg
      className="absolute inset-0 pointer-events-none overflow-visible"
      style={rootStyle}
      aria-hidden
    >
      <defs>
        {/* Inject the keyframes for the pulse once. SVG uses CSS animations
            via inline <style> — this is the most portable way without
            polluting the global stylesheet. */}
        <style>{`
          @keyframes ai-ring-pulse {
            0%   { transform: scale(0.6); opacity: 1; }
            100% { transform: scale(2.4); opacity: 0; }
          }
          .ai-ring {
            transform-box: fill-box;
            transform-origin: center;
            animation: ai-ring-pulse var(--pin-period) ease-out infinite;
          }
        `}</style>
      </defs>

      {/* Folder zones — convex-hull-ish outline of pins sharing a folder.
          Drawn first so rings overlay it. */}
      {showZone && Array.from(byChat.entries()).map(([chatId, group]) =>
        renderZones(chatId, group, baseOpacity * 0.4),
      )}

      {/* Connection lines — same-chat pins linked into a chain so the eye
          can group them. Reuses the chat hue. */}
      {showLine && Array.from(byChat.entries()).flatMap(([chatId, group]) =>
        renderLines(chatId, group, baseOpacity * 0.55),
      )}

      {/* Pulsing rings — one per pin. */}
      {showRing && pins.map((p) => (
        <g key={`${p.chatId}:${p.fileId}`} transform={`translate(${p.x}, ${p.y})`}>
          {/* Outer ripple — endless animation (driven by the static .ai-ring
              class + the --pin-period custom property on the root <svg>), so
              the only per-pin variation left is opacity, carried on the DOM
              attribute rather than a freshly-allocated style object. */}
          <circle
            className="ai-ring"
            r={9}
            fill="none"
            stroke={p.hue}
            strokeWidth={1.5}
            opacity={p.state === 'done' ? ringOpacityDone : baseOpacity}
          />
          {/* Static core dot for clarity at small scales */}
          <circle
            r={2.5}
            fill={p.hue}
            opacity={baseOpacity}
            style={dotFilterStyle(p.hue)}
          />
        </g>
      ))}
    </svg>
  );
}

// ─── Zone rendering ───────────────────────────────────────────────────
// For each chat, partition its pins by folder. If a folder has ≥2 pins,
// draw a soft rounded-md rect bounding box. (A real convex hull is overkill
// for this density; a padded AABB reads cleanly.)

function renderZones(chatId: string, pins: Pin[], opacity: number) {
  const byFolder = new Map<string, Pin[]>();
  for (const p of pins) {
    const arr = byFolder.get(p.folder) ?? [];
    arr.push(p);
    byFolder.set(p.folder, arr);
  }
  const out: React.ReactNode[] = [];
  for (const [folder, fp] of byFolder) {
    if (fp.length < 2) continue;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of fp) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const pad = 14;
    const hue = fp[0].hue;
    out.push(
      <rect
        key={`${chatId}:${folder}`}
        x={minX - pad}
        y={minY - pad}
        width={maxX - minX + pad * 2}
        height={maxY - minY + pad * 2}
        rx={10}
        fill="none"
        stroke={hue}
        strokeWidth={1}
        strokeDasharray="3 4"
        opacity={opacity}
      />,
    );
  }
  return out;
}

// ─── Line rendering ───────────────────────────────────────────────────
// Connect same-chat pins in their stored order. Quadratic curves give the
// chain some shape so it doesn't look like raw debug edges.

function renderLines(chatId: string, group: Pin[], opacity: number) {
  if (group.length < 2) return [];
  const out: React.ReactNode[] = [];
  for (let i = 0; i < group.length - 1; i++) {
    const a = group[i];
    const b = group[i + 1];
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2 - 18; // arch slightly upward
    out.push(
      <path
        key={`${chatId}:line:${i}`}
        d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
        fill="none"
        stroke={a.hue}
        strokeWidth={1}
        opacity={opacity}
      />,
    );
  }
  return out;
}
