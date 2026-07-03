// ─────────────────────────────────────────────────────────────────────────
// SimilarOutliers — popover showing PRs whose outlier profile is closest
// to the active PR's. Reachable from OutlierBadge: clicking the chip
// expands a list of "this is what the rest of the team did when their
// PR looked like this."
//
// Why this is the right surface (objective grounding):
//
//   • Bird et al. (Microsoft, 2011) — outlier-sized PRs have 3.4× the
//     post-merge bug rate, but the post-merge fix patterns are
//     learnable. Showing prior peers gives the reviewer a *playbook*,
//     not just a warning.
//   • Bansal et al. (2021) — explanations that cite *peers* read as
//     less paternalistic than explanations that cite *thresholds*.
//     "5 PRs were like this; 4 needed a follow-up" beats
//     "z = 2.4σ → unusual."
//
// Distance metric: euclidean distance in the (LOC, hunks, files)
// z-space. Cap at 5 results, exclude the current PR.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { Sigma, ArrowUpRight } from 'lucide-react';
import type { PullRequest } from '@entities/pr';

type Props = {
  pr: PullRequest;
  allPrs: PullRequest[];
  onJump?: (prNumber: number) => void;
};

type Peer = {
  pr: PullRequest;
  distance: number;
  zLoc: number;
  zHunks: number;
  zFiles: number;
};

export default function SimilarOutliers({ pr, allPrs, onJump }: Props) {
  const peers = useMemo<Peer[]>(() => buildPeers(pr, allPrs), [pr, allPrs]);

  if (peers.length === 0) {
    return (
      <div className="px-3 py-4 text-base text-[var(--fg-muted)] italic">
        비슷한 outlier PR이 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-default)]">
        <Sigma className="w-3 h-3 text-[var(--fg-accent)]" strokeWidth={2.5} />
        <span className="text-xs font-bold uppercase tracking-eyebrow text-[var(--fg-muted)]">
          비슷한 outlier
        </span>
        <span className="ml-auto text-xs font-mono text-[var(--fg-subtle)] tabular-nums">
          {peers.length}개
        </span>
      </div>
      <div className="max-h-[280px] overflow-auto py-1">
        {peers.map((peer) => {
          const distLabel = peer.distance.toFixed(1);
          // Highlight the dominant axis so the reviewer sees *why*
          // it's a peer (size? scatter? spread?).
          const dominantAxis = pickDominant(peer);
          return (
            <button
              key={peer.pr.number}
              type="button"
              onClick={() => { onJump?.(peer.pr.number); }}
              className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] transition-colors"
            >
              <div className="flex items-baseline gap-2">
                <span className="text-base font-medium text-[var(--fg-default)] truncate flex-1">
                  {peer.pr.title}
                </span>
                <span className="text-xs font-mono text-[var(--fg-subtle)] shrink-0">
                  #{peer.pr.number}
                </span>
                {onJump && (
                  <ArrowUpRight className="w-2.5 h-2.5 text-[var(--fg-subtle)] shrink-0" />
                )}
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs font-mono text-[var(--fg-muted)]">
                <span className="tabular-nums">
                  +{peer.pr.added}/−{peer.pr.removed}
                </span>
                <span className="text-[var(--fg-subtle)]">·</span>
                <span className="tabular-nums" title={`Euclidean distance in z-space — lower = more alike`}>
                  d={distLabel}
                </span>
                <span className="text-[var(--fg-subtle)]">·</span>
                <span
                  className="tabular-nums"
                  style={{ color: dominantAxis.tone }}
                  title={`Closest match: ${dominantAxis.axis}`}
                >
                  {dominantAxis.tag}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="px-3 py-2 border-t border-[var(--border-default)] text-xs font-mono text-[var(--fg-subtle)] italic leading-snug">
        Bansal et al. 2021 — peer-based explanations build trust
        better than threshold warnings.
      </div>
    </div>
  );
}

function buildPeers(pr: PullRequest, allPrs: PullRequest[]): Peer[] {
  if (allPrs.length < 4) return [];
  const measure = (p: PullRequest, axis: 'loc' | 'hunks' | 'files'): number => {
    if (axis === 'loc') return p.added + p.removed;
    if (axis === 'files') return p.files.length;
    let h = 0;
    for (const f of p.files) h += f.hunks.length;
    return h;
  };
  const stat = (axis: 'loc' | 'hunks' | 'files') => {
    const vals = allPrs.map((p) => measure(p, axis));
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((acc, v) => acc + (v - mean) ** 2, 0) / vals.length;
    const std = Math.sqrt(variance);
    return { mean, std: std === 0 ? 1 : std };
  };
  const sLoc = stat('loc');
  const sHunks = stat('hunks');
  const sFiles = stat('files');
  const z = (p: PullRequest, axis: 'loc' | 'hunks' | 'files', s: { mean: number; std: number }) =>
    (measure(p, axis) - s.mean) / s.std;

  const me = {
    zLoc:   z(pr, 'loc', sLoc),
    zHunks: z(pr, 'hunks', sHunks),
    zFiles: z(pr, 'files', sFiles),
  };
  // Only include other PRs that *also* cross the outlier threshold
  // on at least one axis — otherwise the list fills with normal-
  // looking PRs that happen to be close in z-space.
  const peers: Peer[] = [];
  for (const other of allPrs) {
    if (other.number === pr.number) continue;
    const oz = {
      zLoc:   z(other, 'loc', sLoc),
      zHunks: z(other, 'hunks', sHunks),
      zFiles: z(other, 'files', sFiles),
    };
    const isOutlier = Math.max(Math.abs(oz.zLoc), Math.abs(oz.zHunks), Math.abs(oz.zFiles)) >= 1.0;
    if (!isOutlier) continue;
    const d = Math.sqrt(
      (oz.zLoc - me.zLoc) ** 2
      + (oz.zHunks - me.zHunks) ** 2
      + (oz.zFiles - me.zFiles) ** 2,
    );
    peers.push({
      pr: other,
      distance: d,
      zLoc: oz.zLoc,
      zHunks: oz.zHunks,
      zFiles: oz.zFiles,
    });
  }
  peers.sort((a, b) => a.distance - b.distance);
  return peers.slice(0, 5);
}

function pickDominant(p: Peer): { axis: string; tag: string; tone: string } {
  const candidates: { axis: string; v: number }[] = [
    { axis: 'LOC', v: p.zLoc },
    { axis: 'hunks', v: p.zHunks },
    { axis: 'files', v: p.zFiles },
  ];
  candidates.sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
  const top = candidates[0];
  const sign = top.v > 0 ? '+' : '';
  const tone = Math.abs(top.v) >= 2.5 ? 'var(--intent-danger-fg)'
    : Math.abs(top.v) >= 1.5 ? 'var(--intent-warn-fg)'
    : 'var(--fg-link)';
  return {
    axis: top.axis,
    tag: top.axis + ' ' + sign + top.v.toFixed(1) + 'σ',
    tone,
  };
}
