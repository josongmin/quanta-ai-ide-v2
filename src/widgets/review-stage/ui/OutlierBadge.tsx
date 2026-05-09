// ─────────────────────────────────────────────────────────────────────────
// OutlierBadge — "this PR is unusual" chip for the active PR.
//
// Computes a z-score for three axes (LOC delta, hunk count, file
// count) against the *team's* PR distribution, and surfaces a single
// chip when the max abs z-score exceeds a soft threshold (≥1.5).
//
// Why z-score on these axes (objective grounding):
//
//   • Bird et al. (Microsoft, 2011) — outlier-sized PRs (top 5%
//     LOC) had 3.4× the post-merge bug rate. Reviewers under-spend
//     time on them because they "look just like a normal PR but
//     bigger."
//   • Tufte (1983) — single chip = small multiples-of-one. Better
//     than a separate "PR stats" panel because the distribution is
//     only interesting when the current PR breaks it.
//   • Bansal et al. (2021) on AI affordances — the chip says *what*
//     is unusual + *how much* (z = 2.4σ), not just "outlier!". Trust
//     calibration via specific numbers.
//
// We *don't* show the chip when |z| < 1.5 — most PRs are normal
// and the chip would be noise. ≥1.5σ is roughly top-7% (one-tailed).
// ─────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { Sigma } from 'lucide-react';
import type { PullRequest } from '@entities/pr';
import { Popover } from '@shared/ui';
import SimilarOutliers from './SimilarOutliers';

type Axis = 'loc' | 'hunks' | 'files';

type Stat = {
  axis: Axis;
  z: number;
  value: number;
  label: string;     // e.g. "LOC", "hunks", "files"
  noun: string;      // e.g. "size", "scatter"
};

type Props = {
  pr: PullRequest;
  /** All PRs — including the current one — used to derive the team
   *  distribution. We expect at least 4 PRs; below that the variance
   *  is too noisy and we hide the chip. */
  allPrs: PullRequest[];
  /** Optional jump-to-PR — wires the SimilarOutliers list rows to
   *  switch the active PR. */
  onJumpToPr?: (prNumber: number) => void;
};

const Z_THRESHOLD = 1.5;

export default function OutlierBadge({ pr, allPrs, onJumpToPr }: Props) {
  const stats = useMemo<Stat[]>(() => buildStats(pr, allPrs), [pr, allPrs]);
  if (stats.length === 0) return null;
  const top = stats[0];
  const tone = top.z >= 3
    ? '#c25a55'
    : top.z >= 2
      ? '#d3b264'
      : '#7aa7d4';
  const direction = top.z > 0 ? '↑' : '↓';
  const sigma = Math.abs(top.z).toFixed(1);

  // Tooltip — list all axes that crossed the threshold so the user
  // sees the full outlier profile, not just the dominant axis.
  const tooltip = stats
    .map((s) => `${s.label}: ${String(s.value)} (${s.z > 0 ? '+' : ''}${s.z.toFixed(1)}σ)`)
    .join(' · ');

  return (
    <Popover
      placement="anchor"
      align="end"
      width={340}
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-haspopup="dialog"
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono transition-opacity hover:opacity-90"
          style={{
            background: tone + '1a',
            border: '1px solid ' + tone + '55',
            color: tone,
          }}
          title={'평균 PR 대비 outlier — ' + tooltip + ' (클릭: 비슷한 PR 보기)'}
        >
          <Sigma className="w-2.5 h-2.5" strokeWidth={2.5} />
          <span className="font-bold uppercase tracking-[0.14em]">outlier</span>
          <span className="tabular-nums">
            {direction}{sigma}σ {top.noun}
          </span>
        </button>
      )}
    >
      <div
        className="rounded-lg overflow-hidden"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-strong)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
        }}
      >
        <SimilarOutliers pr={pr} allPrs={allPrs} onJump={onJumpToPr} />
      </div>
    </Popover>
  );
}

function buildStats(pr: PullRequest, allPrs: PullRequest[]): Stat[] {
  if (allPrs.length < 4) return [];
  const measure = (p: PullRequest, axis: Axis): number => {
    if (axis === 'loc') return p.added + p.removed;
    if (axis === 'files') return p.files.length;
    let h = 0;
    for (const f of p.files) h += f.hunks.length;
    return h;
  };
  const labelFor: Record<Axis, { label: string; noun: string }> = {
    loc:   { label: 'LOC', noun: 'size' },
    hunks: { label: 'hunks', noun: 'scatter' },
    files: { label: 'files', noun: 'spread' },
  };

  const out: Stat[] = [];
  for (const axis of ['loc', 'hunks', 'files'] as Axis[]) {
    const vals = allPrs.map((p) => measure(p, axis));
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((acc, v) => acc + (v - mean) ** 2, 0) / vals.length;
    const std = Math.sqrt(variance);
    if (std === 0) continue;
    const value = measure(pr, axis);
    const z = (value - mean) / std;
    if (Math.abs(z) < Z_THRESHOLD) continue;
    out.push({ axis, z, value, label: labelFor[axis].label, noun: labelFor[axis].noun });
  }
  // Highest |z| first.
  out.sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
  return out;
}
