// ─────────────────────────────────────────────────────────────────────────
// DependencyContext — "where in the dependency graph does this PR sit?"
//
// A small inline SVG that places PR-touched files on a layered
// architecture map (vendor → core → feature → ui), with edges showing
// imports between touched files and their immediate neighbours.
//
// Why this matters for review (objective grounding):
//
//   • Bacchelli & Bird (Microsoft, 2013): the #1 reviewer-reported
//     friction is "I don't know how this fits into the system." A
//      200-line PR can be safe in a leaf module and catastrophic in a
//     core import, and the diff alone doesn't tell you which.
//   • Stack-shape encoding follows clean-architecture layering — the
//     same vocabulary as @entities/repo's `layer` field, so it lines
//     up with the rest of the surface (filter facets, dot field).
//   • Edge directionality: arrowheads point *into* the file the PR
//     touches, because the consumer side is where surprises happen.
//
// Empty state: if no touched file has fileId resolution we hide the
// card entirely — no SVG outline placeholder.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo, useState, useCallback, type KeyboardEvent } from 'react';
import { Network } from 'lucide-react';
import type { PullRequest } from '@entities/pr';
import type { RepoData, Layer } from '@entities/repo';
import V2Card from './V2Card';

// Compress the 7-way Layer union into a 4-row architectural lens.
// Reviewers think in "ui / logic / data / vendor", not in framework
// roles — so we map { view, controller } → ui (top), { service, util }
// → logic, { repository } → data, { vendor } → vendor (bottom).
// `test` is filtered out before layout (test files are surfaced
// separately in the Files scene).
type Lane = 'ui' | 'logic' | 'data' | 'vendor';

function laneOf(layer: Layer): Lane | null {
  if (layer === 'view' || layer === 'controller') return 'ui';
  if (layer === 'service' || layer === 'util') return 'logic';
  if (layer === 'repository') return 'data';
  if (layer === 'vendor') return 'vendor';
  return null; // 'test' — skip
}

type Node = {
  id: number;
  name: string;
  path: string;
  lane: Lane;
  touched: boolean;     // part of the PR
  publicApi: boolean;
  blastIn: number;      // fan-in from touched
  blastOut: number;     // fan-out to neighbours
};

type Edge = {
  from: number;
  to: number;
  bothTouched: boolean;
};

const LANE_ORDER: Lane[] = ['ui', 'logic', 'data', 'vendor'];
const LANE_LABEL: Record<Lane, string> = {
  ui:     'ui',
  logic:  'logic',
  data:   'data',
  vendor: 'vendor',
};
const LANE_TONE: Record<Lane, string> = {
  ui:     '#7aa7d4',
  logic:  '#9583b8',
  data:   '#5fa86c',
  vendor: '#a8893a',
};

const PANEL_W = 720;
const PANEL_H = 200;
const LANE_PAD_TOP = 28;
const LANE_PAD_BOTTOM = 18;
const NODE_R = 5;
const NODE_R_TOUCHED = 7;

export default function DependencyContext({
  pr, repo, onJumpToFile,
}: {
  pr: PullRequest;
  repo: RepoData;
  onJumpToFile?: (path: string) => void;
}) {
  const { nodes, edges } = useMemo(() => buildGraph(pr, repo), [pr, repo]);
  // Focused-node id for WCAG keyboard nav. Tab into the SVG → first
  // touched node is selected; ←/→ within the same lane; ↑/↓ across
  // lanes; Enter to jump to the file. Roving-tabindex pattern so a
  // single Tab moves focus into/out of the whole graph.
  const touchedNodes = useMemo(() => nodes.filter((n) => n.touched), [nodes]);
  const [focusId, setFocusId] = useState<number | null>(null);
  // Initial focus = first touched node, computed lazily on first key.
  const ensureFocus = useCallback((): number | null => {
    if (focusId !== null) return focusId;
    if (touchedNodes.length === 0) return null;
    const first = touchedNodes[0].id;
    setFocusId(first);
    return first;
  }, [focusId, touchedNodes]);

  if (nodes.length === 0) return null;

  // ── Layout: lanes by layer (rows), x by id-derived determinism ──
  const laneToNodes = new Map<Lane, Node[]>();
  for (const lane of LANE_ORDER) laneToNodes.set(lane, []);
  for (const n of nodes) {
    laneToNodes.get(n.lane)?.push(n);
  }
  const laneHeight = (PANEL_H - LANE_PAD_TOP - LANE_PAD_BOTTOM) / LANE_ORDER.length;

  // Stable x positions: sort within lane by (touched first, then id).
  const positions = new Map<number, { x: number; y: number; lane: Lane }>();
  for (let li = 0; li < LANE_ORDER.length; li++) {
    const lane = LANE_ORDER[li];
    const items = laneToNodes.get(lane) ?? [];
    items.sort((a, b) => {
      if (a.touched !== b.touched) return a.touched ? -1 : 1;
      return a.id - b.id;
    });
    const yMid = LANE_PAD_TOP + laneHeight * (li + 0.5);
    const count = items.length;
    if (count === 0) continue;
    // Spread evenly across width, leaving 60px label gutter on left
    const xLeft = 100;
    const xRight = PANEL_W - 24;
    const span = xRight - xLeft;
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      positions.set(items[i].id, { x: xLeft + t * span, y: yMid, lane });
    }
  }

  const touchedCount = nodes.filter((n) => n.touched).length;
  const laneSpread = LANE_ORDER.filter((l) => (laneToNodes.get(l) ?? []).some((n) => n.touched)).length;

  // Roving-tabindex keyboard handler. Operates on touchedNodes only
  // (neighbours are decorative — keyboard users don't need to step
  // through every grey dot). Wrap-around within axis.
  const onSvgKeyDown = (e: KeyboardEvent<SVGSVGElement>): void => {
    if (touchedNodes.length === 0) return;
    const cur = ensureFocus();
    if (cur === null) return;
    const idx = touchedNodes.findIndex((n) => n.id === cur);
    if (idx < 0) {
      setFocusId(touchedNodes[0].id);
      return;
    }
    const here = touchedNodes[idx];
    let next: typeof here | null = null;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      // Move within the same lane in id-stable order.
      const laneItems = touchedNodes.filter((n) => n.lane === here.lane);
      const li = laneItems.findIndex((n) => n.id === here.id);
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const ni = (li + dir + laneItems.length) % laneItems.length;
      next = laneItems[ni];
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      // Move across lanes — find the next/previous lane that has a
      // touched node and snap to its closest x-position.
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      const curLaneIdx = LANE_ORDER.indexOf(here.lane);
      for (let step = 1; step <= LANE_ORDER.length; step++) {
        const idxLane = (curLaneIdx + dir * step + LANE_ORDER.length) % LANE_ORDER.length;
        const targetLane = LANE_ORDER[idxLane];
        const laneItems = touchedNodes.filter((n) => n.lane === targetLane);
        if (laneItems.length === 0) continue;
        // Pick closest by index parity within sorted lane.
        next = laneItems[Math.min(laneItems.length - 1, Math.max(0, Math.floor(laneItems.length / 2)))];
        break;
      }
    } else if (e.key === 'Home') {
      next = touchedNodes[0];
    } else if (e.key === 'End') {
      next = touchedNodes[touchedNodes.length - 1];
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onJumpToFile?.(here.path);
      return;
    } else {
      return;
    }
    if (next !== null) {
      e.preventDefault();
      setFocusId(next.id);
    }
  };

  // Architectural lens — how "deep" the change reaches. data+vendor =
  // hard to reverse, ui-only = easy.
  const reachLabel = (() => {
    const touchesData = (laneToNodes.get('data') ?? []).some((n) => n.touched);
    const touchesVendor = (laneToNodes.get('vendor') ?? []).some((n) => n.touched);
    if (touchesVendor) return { text: 'reaches vendor', tone: '#c25a55' };
    if (touchesData) return { text: 'reaches data', tone: '#a8893a' };
    return { text: 'ui/logic only', tone: '#5fa86c' };
  })();

  return (
    <V2Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Network className="w-3.5 h-3.5 text-white/55" strokeWidth={2} />
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
          Dependency context
        </span>
        <span className="text-[10px] font-mono text-white/40">
          {touchedCount} touched · {laneSpread} {laneSpread === 1 ? 'layer' : 'layers'}
        </span>
        <span
          className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{
            background: `${reachLabel.tone}22`,
            color: reachLabel.tone,
            border: `1px solid ${reachLabel.tone}55`,
          }}
        >
          {reachLabel.text}
        </span>
      </div>

      <div
        className="rounded-md border border-white/[0.06] overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.015)' }}
      >
        <svg
          viewBox={`0 0 ${String(PANEL_W)} ${String(PANEL_H)}`}
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          role="application"
          aria-label="PR-touched files on the layered dependency graph. Use arrow keys to move between files, Enter or Space to open."
          tabIndex={0}
          onKeyDown={onSvgKeyDown}
          onBlur={() => { /* keep focusId so re-tab restores position */ }}
          style={{ outline: 'none' }}
        >
          <defs>
            <marker
              id="dep-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.35)" />
            </marker>
            <marker
              id="dep-arrow-hot"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#9583b8" />
            </marker>
          </defs>

          {/* Lane backgrounds + labels */}
          {LANE_ORDER.map((lane, li) => {
            const yTop = LANE_PAD_TOP + laneHeight * li;
            const yMid = yTop + laneHeight / 2;
            const tone = LANE_TONE[lane];
            return (
              <g key={lane}>
                <rect
                  x={0}
                  y={yTop}
                  width={PANEL_W}
                  height={laneHeight}
                  fill={li % 2 === 0 ? 'rgba(255,255,255,0.012)' : 'transparent'}
                />
                <line
                  x1={88}
                  y1={yTop + laneHeight}
                  x2={PANEL_W}
                  y2={yTop + laneHeight}
                  stroke="rgba(255,255,255,0.04)"
                  strokeWidth={1}
                />
                <text
                  x={14}
                  y={yMid}
                  dominantBaseline="middle"
                  fontSize={10}
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  fontWeight={700}
                  letterSpacing="0.18em"
                  fill={tone}
                >
                  {LANE_LABEL[lane].toUpperCase()}
                </text>
              </g>
            );
          })}

          {/* Edges underneath nodes */}
          {edges.map((e, i) => {
            const a = positions.get(e.from);
            const b = positions.get(e.to);
            if (!a || !b) return null;
            const stroke = e.bothTouched ? '#9583b8' : 'rgba(255,255,255,0.18)';
            const sw = e.bothTouched ? 1.5 : 0.75;
            // Curved line for visual decompression when many edges overlap.
            const midX = (a.x + b.x) / 2;
            const midY = (a.y + b.y) / 2 - Math.abs(a.x - b.x) * 0.06;
            return (
              <path
                key={i}
                d={`M ${String(a.x)} ${String(a.y)} Q ${String(midX)} ${String(midY)}, ${String(b.x)} ${String(b.y)}`}
                fill="none"
                stroke={stroke}
                strokeWidth={sw}
                opacity={e.bothTouched ? 0.85 : 0.5}
                markerEnd={e.bothTouched ? 'url(#dep-arrow-hot)' : 'url(#dep-arrow)'}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((n) => {
            const p = positions.get(n.id);
            if (!p) return null;
            const tone = LANE_TONE[n.lane];
            const r = n.touched ? NODE_R_TOUCHED : NODE_R;
            const isFocused = focusId === n.id && n.touched;
            return (
              <g
                key={n.id}
                role={n.touched ? 'button' : undefined}
                aria-label={n.touched
                  ? `${n.path} — ${n.lane} layer${n.publicApi ? ', public API' : ''}, ${String(n.blastIn)} dependents in graph. Press Enter to open.`
                  : undefined}
                style={{ cursor: n.touched && onJumpToFile ? 'pointer' : 'default' }}
                onClick={n.touched && onJumpToFile
                  ? () => { setFocusId(n.id); onJumpToFile(n.path); }
                  : undefined}
              >
                {/* Keyboard focus ring — appears only when this node is
                    the current focus target. Drawn underneath so it
                    reads as a halo, not a stroke override. */}
                {isFocused && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={r + 7}
                    fill="none"
                    stroke="#7aa7ff"
                    strokeWidth={1.5}
                    opacity={0.9}
                  >
                    <animate
                      attributeName="r"
                      values={`${String(r + 5)};${String(r + 8)};${String(r + 5)}`}
                      dur="1.6s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                {n.touched && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={r + 4}
                    fill="none"
                    stroke={tone}
                    strokeWidth={1}
                    opacity={0.45}
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r}
                  fill={n.touched ? tone : 'rgba(255,255,255,0.18)'}
                  stroke={n.publicApi ? '#fff' : 'none'}
                  strokeWidth={n.publicApi ? 1 : 0}
                />
                {n.touched && (
                  <text
                    x={p.x}
                    y={p.y - r - 6}
                    textAnchor="middle"
                    fontSize={9}
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    fill="rgba(255,255,255,0.78)"
                  >
                    {trimMid(n.name, 18)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 flex-wrap text-[10px] font-mono text-white/45">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: '#9583b8' }} />
          touched
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-white/30" />
          neighbour
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-white/30 ring-1 ring-white" />
          public API
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-px" style={{ background: '#9583b8' }} />
          touched ↔ touched
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-white/35">
          <kbd className="px-1 rounded text-[9px] font-mono bg-white/[0.06] border border-white/[0.10]">↑↓←→</kbd>
          navigate
          <kbd className="ml-1 px-1 rounded text-[9px] font-mono bg-white/[0.06] border border-white/[0.10]">↵</kbd>
          open
        </span>
      </div>
    </V2Card>
  );
}

function buildGraph(pr: PullRequest, repo: RepoData): { nodes: Node[]; edges: Edge[] } {
  const touchedIds = new Set<number>();
  for (const f of pr.files) {
    if (f.fileId !== null) touchedIds.add(f.fileId);
  }
  if (touchedIds.size === 0) return { nodes: [], edges: [] };

  // Add immediate neighbours so layered context shows even on tiny PRs.
  // Cap at 2 neighbours per touched file; keeps the SVG legible.
  const includedIds = new Set<number>(touchedIds);
  for (const id of touchedIds) {
    const file = repo.files[id];
    if (!file) continue;
    let added = 0;
    for (const dep of file.deps) {
      if (added >= 2) break;
      if (includedIds.has(dep)) continue;
      includedIds.add(dep);
      added += 1;
    }
  }

  // Precompute fan counters using the included subgraph.
  const inCount = new Map<number, number>();
  const outCount = new Map<number, number>();
  for (const id of includedIds) {
    const file = repo.files[id];
    if (!file) continue;
    for (const dep of file.deps) {
      if (!includedIds.has(dep)) continue;
      outCount.set(id, (outCount.get(id) ?? 0) + 1);
      inCount.set(dep, (inCount.get(dep) ?? 0) + 1);
    }
  }

  const nodes: Node[] = [];
  for (const id of includedIds) {
    const file = repo.files[id];
    if (!file) continue;
    const lane = laneOf(file.layer);
    if (lane === null) continue; // 'test' layer — skip
    nodes.push({
      id,
      name: file.name,
      path: file.folderPath ? `${file.folderPath}.${file.name}` : file.name,
      lane,
      touched: touchedIds.has(id),
      publicApi: file.metrics.publicApi,
      blastIn: inCount.get(id) ?? 0,
      blastOut: outCount.get(id) ?? 0,
    });
  }

  const edges: Edge[] = [];
  for (const id of includedIds) {
    const file = repo.files[id];
    if (!file) continue;
    for (const dep of file.deps) {
      if (!includedIds.has(dep)) continue;
      edges.push({
        from: id,
        to: dep,
        bothTouched: touchedIds.has(id) && touchedIds.has(dep),
      });
    }
  }
  // Sort touched-touched edges last so they paint on top.
  edges.sort((a, b) => Number(a.bothTouched) - Number(b.bothTouched));

  return { nodes, edges };
}

function trimMid(s: string, max: number): string {
  if (s.length <= max) return s;
  const head = s.slice(0, Math.floor((max - 1) / 2));
  const tail = s.slice(-(max - 1 - head.length));
  return `${head}…${tail}`;
}
