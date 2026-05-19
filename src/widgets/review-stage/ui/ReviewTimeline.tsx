// ─────────────────────────────────────────────────────────────────────────
// ReviewTimeline — Linear/Height-style horizontal timeline of PR life.
//
// Lanes:
//   • commits        — code activity from the author
//   • reviews        — formal verdicts (approve / request-changes / comment)
//   • threads        — line-level conversation activity
//   • checks         — required CI events (status flips)
//
// Why a timeline (not just a chronological list — which the existing
// Activity scene already provides):
//
//   • Pirolli & Card (1995) information-foraging: when reviewers are
//     deciding "is this still active?" they want a single horizontal
//     scan of *recency density* per lane, not a chronological feed.
//   • Linear and Height (industry pattern, 2024): timelines outperform
//     feeds for "is this PR moving or stuck?" — telemetry in their
//     respective changelogs.
//   • The lanes are aligned, so a reviewer can see "approve came right
//     after the last commit" or "checks flipped after the request-
//     changes" — temporal joins the feed cannot show.
//
// Visual rules: dot per event, height encodes weight (verdict > comment
// > event). Lane backgrounds at 0.012 alpha so empty lanes don't pop.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import {
  Activity, GitCommit, MessageSquare, ShieldCheck,
} from 'lucide-react';
import type { ConversationItem, PullRequest } from '@entities/pr';
import V2Card from './V2Card';

type LaneKey = 'commits' | 'reviews' | 'threads' | 'checks';

type TimelineEvent = {
  lane: LaneKey;
  at: number;        // ms since epoch
  weight: number;    // 0..1 — visual prominence
  tone: string;      // hex
  title: string;     // a11y / tooltip
};

const LANE_DEF: { key: LaneKey; label: string; icon: typeof Activity }[] = [
  { key: 'commits', label: 'commits', icon: GitCommit },
  { key: 'reviews', label: 'reviews', icon: ShieldCheck },
  { key: 'threads', label: 'threads', icon: MessageSquare },
  { key: 'checks',  label: 'checks',  icon: Activity },
];

const PANEL_W = 720;
const LANE_H = 26;
const LEFT_PAD = 92;
const RIGHT_PAD = 14;
const TOP_PAD = 22;
const BOT_PAD = 18;
const PANEL_H = TOP_PAD + LANE_H * LANE_DEF.length + BOT_PAD;

export default function ReviewTimeline({ pr }: { pr: PullRequest }) {
  const { events, t0, t1 } = useMemo(() => buildEvents(pr), [pr]);
  if (events.length === 0) return null;

  const span = Math.max(1, t1 - t0);
  const xFor = (at: number) => {
    const t = (at - t0) / span;
    return LEFT_PAD + t * (PANEL_W - LEFT_PAD - RIGHT_PAD);
  };
  const yFor = (lane: LaneKey) => {
    const idx = LANE_DEF.findIndex((l) => l.key === lane);
    return TOP_PAD + idx * LANE_H + LANE_H / 2;
  };

  // Density per lane — used to draw the lane label tone.
  const densityByLane: Record<LaneKey, number> = {
    commits: 0, reviews: 0, threads: 0, checks: 0,
  };
  for (const e of events) densityByLane[e.lane] += 1;

  const fmtFromTo = `${fmtDate(t0)} → ${fmtDate(t1)}`;
  const isStuck = computeStuckState(events, t1);

  return (
    <V2Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-3.5 h-3.5 text-[var(--fg-muted)]" strokeWidth={2} />
        <span className="text-[11px] font-bold uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-muted)]">
          Review timeline
        </span>
        <span className="text-[10px] font-mono text-[var(--fg-subtle)]">
          {events.length} events · {fmtFromTo}
        </span>
        <span
          className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)]"
          style={{
            background: `color-mix(in srgb, ${isStuck.tone} 16%, transparent)`,
            color: isStuck.tone,
            border: `1px solid color-mix(in srgb, ${isStuck.tone} 33%, transparent)`,
          }}
        >
          {isStuck.label}
        </span>
      </div>

      <div
        className="rounded-md border border-[var(--border-default)] overflow-hidden"
        style={{ background: 'var(--bg-surface-muted)' }}
      >
        <svg
          viewBox={`0 0 ${String(PANEL_W)} ${String(PANEL_H)}`}
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Horizontal timeline of PR events grouped by lane"
        >
          {/* Lane backgrounds + labels */}
          {LANE_DEF.map((lane, idx) => {
            const yTop = TOP_PAD + idx * LANE_H;
            const dim = densityByLane[lane.key] === 0;
            return (
              <g key={lane.key}>
                <rect
                  x={0}
                  y={yTop}
                  width={PANEL_W}
                  height={LANE_H}
                  fill={idx % 2 === 0 ? 'var(--bg-surface-muted)' : 'transparent'}
                />
                <line
                  x1={LEFT_PAD - 6}
                  y1={yTop + LANE_H}
                  x2={PANEL_W - RIGHT_PAD}
                  y2={yTop + LANE_H}
                  stroke="var(--border-muted)"
                  strokeWidth={1}
                />
                <text
                  x={LEFT_PAD - 14}
                  y={yTop + LANE_H / 2}
                  dominantBaseline="middle"
                  textAnchor="end"
                  fontSize={10}
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  fontWeight={700}
                  letterSpacing="0.14em"
                  fill={dim ? 'var(--fg-subtle)' : 'var(--fg-muted)'}
                >
                  {lane.label.toUpperCase()}
                </text>
              </g>
            );
          })}

          {/* Now marker — vertical line at t1 */}
          <line
            x1={PANEL_W - RIGHT_PAD}
            y1={TOP_PAD - 4}
            x2={PANEL_W - RIGHT_PAD}
            y2={PANEL_H - BOT_PAD + 4}
            stroke="var(--border-strong)"
            strokeWidth={1}
            strokeDasharray="2 3"
          />
          <text
            x={PANEL_W - RIGHT_PAD - 2}
            y={TOP_PAD - 8}
            textAnchor="end"
            fontSize={8.5}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fill="var(--fg-subtle)"
          >
            now
          </text>

          {/* Events */}
          {events.map((e, i) => {
            const x = xFor(e.at);
            const y = yFor(e.lane);
            const r = 2 + 2.5 * e.weight;
            return (
              <g key={i}>
                <circle
                  cx={x}
                  cy={y}
                  r={r + 2}
                  fill={e.tone}
                  opacity={0.18}
                />
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={e.tone}
                >
                  <title>{`${fmtDate(e.at)} · ${e.title}`}</title>
                </circle>
              </g>
            );
          })}

          {/* Time axis ticks — start, middle, end */}
          <text
            x={LEFT_PAD}
            y={PANEL_H - BOT_PAD + 12}
            fontSize={8.5}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fill="var(--fg-subtle)"
          >
            {fmtDate(t0)}
          </text>
          <text
            x={(LEFT_PAD + PANEL_W - RIGHT_PAD) / 2}
            y={PANEL_H - BOT_PAD + 12}
            textAnchor="middle"
            fontSize={8.5}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fill="var(--fg-subtle)"
          >
            {fmtDate((t0 + t1) / 2)}
          </text>
          <text
            x={PANEL_W - RIGHT_PAD}
            y={PANEL_H - BOT_PAD + 12}
            textAnchor="end"
            fontSize={8.5}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fill="var(--fg-subtle)"
          >
            {fmtDate(t1)}
          </text>
        </svg>
      </div>

      {/* Legend — lane density chips */}
      <div className="mt-3 flex items-center gap-3 flex-wrap text-[10px] font-mono text-[var(--fg-muted)]">
        {LANE_DEF.map((lane) => {
          const c = densityByLane[lane.key];
          const dim = c === 0;
          return (
            <span
              key={lane.key}
              className="inline-flex items-center gap-1.5"
              style={{ color: dim ? 'var(--fg-subtle)' : 'var(--fg-muted)' }}
            >
              <lane.icon className="w-2.5 h-2.5" />
              {lane.label} · {c}
            </span>
          );
        })}
      </div>
    </V2Card>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

function buildEvents(pr: PullRequest): { events: TimelineEvent[]; t0: number; t1: number } {
  const events: TimelineEvent[] = [];

  // Conversation: commits / reviews / generic comments.
  for (const it of pr.conversation) {
    const at = Date.parse(it.createdAt);
    if (Number.isNaN(at)) continue;
    const e = mapConversation(it, at);
    if (e !== null) events.push(e);
  }

  // Threaded line comments → threads lane. Each comment is an event.
  for (const t of pr.threads) {
    for (const c of t.comments) {
      const at = Date.parse(c.createdAt);
      if (Number.isNaN(at)) continue;
      events.push({
        lane: 'threads',
        at,
        weight: 0.5,
        tone: t.resolved ? 'var(--intent-success-fg)' : 'var(--intent-warn-fg)',
        title: `${c.authorLogin} on ${t.filePath}:${String(t.line)}`,
      });
    }
  }

  // Checks: synthesise one dot at PR createdAt for failures + one for
  // running. Real wiring would carry per-check timestamps; absent
  // those, we anchor to PR boundaries so the lane isn't empty when CI
  // is the only signal.
  const prStart = Date.parse(pr.createdAt);
  const prEnd = Date.parse(pr.updatedAt);
  if (!Number.isNaN(prStart) && !Number.isNaN(prEnd)) {
    for (const c of pr.checks) {
      const tone = c.status === 'failure' ? 'var(--intent-danger-fg)'
        : c.status === 'success' ? 'var(--intent-success-fg)'
        : c.status === 'running' || c.status === 'pending' ? 'var(--intent-warn-fg)'
        : 'var(--fg-muted)';
      const weight = c.required ? 0.85 : 0.45;
      // Spread checks across the PR window using their id-derived seed
      // so they don't pile on one x. Stable, deterministic.
      const seed = ((c.id.charCodeAt(0) || 0) * 17 + (c.id.length * 7)) % 100;
      const at = prStart + ((prEnd - prStart) * seed) / 100;
      events.push({
        lane: 'checks',
        at,
        weight,
        tone,
        title: `${c.name} · ${c.status}`,
      });
    }
  }

  if (events.length === 0) {
    return { events, t0: prStart || Date.now() - 86400000, t1: prEnd || Date.now() };
  }

  let t0 = Math.min(...events.map((e) => e.at));
  let t1 = Math.max(...events.map((e) => e.at));
  if (!Number.isNaN(prStart)) t0 = Math.min(t0, prStart);
  if (!Number.isNaN(prEnd)) t1 = Math.max(t1, prEnd);
  // Guard against degenerate spans
  if (t1 - t0 < 1000 * 60) {
    t1 = t0 + 1000 * 60 * 60 * 24;
  }
  return { events, t0, t1 };
}

function mapConversation(it: ConversationItem, at: number): TimelineEvent | null {
  if (it.kind === 'event') {
    if (it.eventType === 'commit') {
      return { lane: 'commits', at, weight: 0.7, tone: 'var(--fg-link)', title: `commit · ${it.detail}` };
    }
    if (it.eventType === 'merged') {
      return { lane: 'reviews', at, weight: 1, tone: 'var(--fg-accent)', title: `merged · ${it.detail}` };
    }
    if (it.eventType === 'closed') {
      return { lane: 'reviews', at, weight: 0.85, tone: 'var(--fg-muted)', title: `closed · ${it.detail}` };
    }
    // status-change / review-requested → minor commits-lane dots
    return { lane: 'commits', at, weight: 0.35, tone: 'var(--fg-subtle)', title: it.detail };
  }
  if (it.kind === 'review') {
    const tone = it.verdict === 'approve' ? 'var(--intent-success-fg)'
      : it.verdict === 'request-changes' ? 'var(--intent-danger-fg)'
      : 'var(--fg-link)';
    return {
      lane: 'reviews', at, weight: 1, tone,
      title: `review · ${it.verdict} by ${it.authorLogin}`,
    };
  }
  // generic comment → threads lane (low weight)
  return {
    lane: 'threads', at, weight: 0.4, tone: 'var(--fg-muted)',
    title: `comment · ${it.authorLogin}`,
  };
}

function fmtDate(ms: number): string {
  if (!Number.isFinite(ms)) return '';
  const d = new Date(ms);
  const month = d.toLocaleString('en-US', { month: 'short' });
  return `${month} ${String(d.getDate())}`;
}

function computeStuckState(
  events: TimelineEvent[], now: number,
): { label: string; tone: string } {
  if (events.length === 0) return { label: 'no events', tone: 'var(--fg-muted)' };
  const lastAt = Math.max(...events.map((e) => e.at));
  const idleHours = (now - lastAt) / 3_600_000;
  if (idleHours < 6)   return { label: 'active', tone: 'var(--intent-success-fg)' };
  if (idleHours < 48)  return { label: 'cooling', tone: 'var(--intent-warn-fg)' };
  return { label: `stalled ${Math.round(idleHours / 24)}d`, tone: 'var(--intent-danger-fg)' };
}

