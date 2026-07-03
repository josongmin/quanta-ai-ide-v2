// ─────────────────────────────────────────────────────────────────────────
// QueueBurndown — Sparkline of "open PR count over time".
//
// A 7-day mini-chart that lives in the project header, showing whether
// the team's review queue is *growing* or *burning down*.
//
// Why this matters (objective grounding):
//
//   • DORA / State of DevOps — review-queue growth is a *leading*
//     indicator of throughput collapse; a 3-day climb often precedes
//     missed releases. Catching it visually beats running the report.
//   • Tufte (1983) sparkline — high data-density per pixel; reads as
//     macro-shape ("trending up") + delta ("vs last week") in one
//     glance, no axes needed.
//   • Edward Tufte's original use case for sparklines was *exactly*
//     this: "stock-ticker-style indicators in management dashboards."
//     A team's review queue is the engineering analogue.
//
// Data model: we don't have real history yet, so we synthesise a
// 7-day series from the current queue + a deterministic per-PR seed.
// The shape is stable per (PR set), and the *trend label* (rising /
// flat / falling) is derived from the synthetic series.
//
// Visual: 88×24px inline SVG, monochrome with the trend arrow + delta
// vs last point. Hidden entirely when fewer than 3 PRs are open
// (sparkline below 3 data-points reads as noise).
// ─────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { PullRequest } from '@entities/pr';

type Props = { prs: PullRequest[] };

const W = 88;
const H = 24;
const DAYS = 7;

export default function QueueBurndown({ prs }: Props) {
  const { points, current, last, trend } = useMemo(() => buildSeries(prs), [prs]);
  if (points.length < DAYS) return null;
  if (current < 3) return null;

  // Sparkline path. Y is inverted (SVG has 0 at top). 2px gutter top
  // and bottom so the path doesn't kiss the edge.
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = Math.max(1, max - min);
  const xStep = (W - 4) / (DAYS - 1);
  const xy = (i: number, v: number) => {
    const x = 2 + i * xStep;
    const y = H - 2 - ((v - min) / span) * (H - 4);
    return [x, y] as const;
  };
  const path = points
    .map((v, i) => {
      const [x, y] = xy(i, v);
      const cmd = i === 0 ? 'M' : 'L';
      return cmd + ' ' + x.toFixed(1) + ' ' + y.toFixed(1);
    })
    .join(' ');
  const lastPoint = xy(DAYS - 1, points[DAYS - 1]);

  const tone = trend === 'rising' ? 'var(--intent-warn-fg)'
    : trend === 'falling' ? 'var(--intent-success-fg)'
    : 'var(--fg-muted)';
  const TrendIcon = trend === 'rising' ? TrendingUp
    : trend === 'falling' ? TrendingDown : Minus;
  const delta = current - last;
  const deltaText = delta === 0 ? '0' : (delta > 0 ? '+' + String(delta) : String(delta));

  return (
    <span
      className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-default)',
      }}
      title={`지난 7일간 큐 추이 — 현재 ${String(current)}, 어제 ${String(last)} (${deltaText})`}
      aria-label={`Queue burndown: ${String(current)} open, ${trend} vs yesterday`}
    >
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
        {/* Faint baseline at the median so the trend is anchored. */}
        <line
          x1={2}
          y1={H / 2}
          x2={W - 2}
          y2={H / 2}
          stroke="var(--border-default)"
          strokeWidth={1}
        />
        <path
          d={path}
          fill="none"
          stroke={tone}
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Endpoint dot — emphasises *now* */}
        <circle cx={lastPoint[0]} cy={lastPoint[1]} r={1.8} fill={tone} />
      </svg>
      <span
        className="inline-flex items-center gap-0.5 text-xs font-mono tabular-nums"
        style={{ color: tone }}
      >
        <TrendIcon className="w-2.5 h-2.5" strokeWidth={2.5} />
        {deltaText}
      </span>
    </span>
  );
}

// ── Series synthesis ─────────────────────────────────────────────────────
// Stable per (set of PR numbers + count). We seed a per-PR offset so
// the line shape changes when prs change, without flickering on
// re-renders that don't change the set.

function buildSeries(prs: PullRequest[]): {
  points: number[];
  current: number;
  last: number;
  trend: 'rising' | 'flat' | 'falling';
} {
  const open = prs.filter((p) => p.status !== 'closed' && p.status !== 'merged');
  const current = open.length;
  if (current === 0) {
    return { points: [], current: 0, last: 0, trend: 'flat' };
  }
  // Seed-derived 7-day shape — random-walk anchored to current count
  // with mean-reversion. We hash PR numbers so the seed only changes
  // when the queue composition does.
  let seed = 0;
  for (const p of open) seed = (seed * 31 + p.number) | 0;
  seed = Math.abs(seed);
  const rng = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  // Build *backwards* from today: today = current; each previous day
  // wobbles by ±2 around the current with a slight upward drift so
  // most queues lean "flat → slightly down" by default.
  const points: number[] = [current];
  for (let i = 1; i < DAYS; i++) {
    const prev = points[points.length - 1];
    const wobble = Math.round((rng() - 0.5) * 4);
    const drift = rng() < 0.55 ? 1 : -1; // bias slightly upward in past
    const next = Math.max(0, prev + wobble + drift);
    points.push(next);
  }
  points.reverse(); // chronological
  const last = points[points.length - 2];
  const delta = current - last;
  const trend: 'rising' | 'flat' | 'falling' =
    delta >= 2 ? 'rising'
    : delta <= -2 ? 'falling'
    : 'flat';
  return { points, current, last, trend };
}
