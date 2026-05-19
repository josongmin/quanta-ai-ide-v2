// ─────────────────────────────────────────────────────────────────────────
// AuthorVelocity — chip showing the active PR's author's typical
// review-cycle speed + LOC profile, plus a z-tag indicating where
// *this* PR sits vs. their own pattern.
//
// Sits in DecisionHeadsUp (right of the verdict cluster) — the
// reviewer reads "this author's median is 4h, this PR is 2.1σ bigger
// than they usually write" *before* deciding how much time to budget.
//
// Why this is the right place (objective grounding):
//
//   • Sadowski et al. (Google ICSE 2018) — author/reviewer rhythm
//     mismatch is a top-5 review friction. Surfacing the author's
//     median + this PR's deviation pre-aligns the reviewer's mental
//     model with the author's pattern.
//   • DeMarco & Lister "Peopleware" (1987) — velocity stats are
//     dangerous when read as productivity. We frame them as
//     *expectation-setting* (median + tail) not productivity.
//   • Bansal et al. (2021) — "this author usually takes Xh" is a
//     peer-based explanation; it reads less paternalistic than a
//     threshold (">24h is bad").
//
// Hidden when the author has fewer than 2 PRs in the sample (no
// signal). Hidden when the chip would say nothing distinctive
// (median <2h AND |z|<1) — clean PR by a fast author needs no chip.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { Gauge } from 'lucide-react';
import type { PullRequest } from '@entities/pr';
import {
  authorStatsFor, thisVsAuthorZ, formatHoursCompact,
} from '../lib/authorVelocity';

type Props = {
  pr: PullRequest;
  allPrs: PullRequest[];
};

export default function AuthorVelocity({ pr, allPrs }: Props) {
  const stats = useMemo(() => authorStatsFor(pr.author, allPrs), [pr.author, allPrs]);
  const z = useMemo(() => thisVsAuthorZ(pr, allPrs), [pr, allPrs]);

  if (stats === null) return null;
  // Suppress when the chip would say nothing distinctive.
  const isFast = stats.medianHours < 2;
  const hasZSignal = z !== null && Math.abs(z) >= 1;
  if (isFast && !hasZSignal) return null;

  // Cycle-time tone: fast median = green, slow = amber, stale-tail
  // = rose. Keys off median, not z; the z is the *secondary* tag.
  const tone = stats.medianHours >= 24
    ? 'var(--intent-danger-fg)'
    : stats.medianHours >= 8
      ? 'var(--intent-warn-fg)'
      : 'var(--intent-success-fg)';

  // Z-tag: only render when |z| ≥ 1. Keeps the chip terse for
  // average-shape PRs by the author.
  const zTag = (() => {
    if (z === null) return null;
    if (Math.abs(z) < 1) return null;
    const tone2 = Math.abs(z) >= 2.5 ? 'var(--intent-danger-fg)'
      : Math.abs(z) >= 1.5 ? 'var(--intent-warn-fg)'
      : 'var(--fg-link)';
    const sign = z > 0 ? '+' : '';
    return { text: `${sign}${z.toFixed(1)}σ vs 본인`, tone: tone2 };
  })();

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono"
      style={{
        background: `color-mix(in srgb, ${tone} 10%, transparent)`,
        border: `1px solid color-mix(in srgb, ${tone} 33%, transparent)`,
        color: tone,
      }}
      title={`@${pr.author} · 중앙값 ${formatHoursCompact(stats.medianHours)} · p95 ${formatHoursCompact(stats.p95Hours)} · 평균 ${String(Math.round(stats.meanLoc))} LOC (n=${String(stats.prCount)})`}
    >
      <Gauge className="w-2.5 h-2.5" strokeWidth={2.5} />
      <span className="font-bold uppercase tracking-[var(--track-eyebrow)]">
        @{pr.author}
      </span>
      <span className="tabular-nums">
        ~{formatHoursCompact(stats.medianHours)}
      </span>
      {zTag !== null && (
        <span
          className="tabular-nums pl-1.5 ml-0.5"
          style={{ borderLeft: `1px solid color-mix(in srgb, ${tone} 20%, transparent)`, color: zTag.tone }}
        >
          {zTag.text}
        </span>
      )}
    </span>
  );
}
