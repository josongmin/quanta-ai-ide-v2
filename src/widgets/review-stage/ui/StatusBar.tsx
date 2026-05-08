// ─────────────────────────────────────────────────────────────────────────
// Status bar — viewer-scoped queue stats as a static KPI strip. No
// scrolling tape, no blink. Just glanceable numbers in a fixed row.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import {
  computePrRisk, summariseChecks,
  type PullRequest,
} from '@entities/pr';
import type { RepoData } from '@entities/repo';
import { OK, SEV } from '../lib/tones';

type StatusItem = { label: string; value: string; tone?: 'block' | 'warn' | 'ok' };

export default function StatusBar({
  prs, repo, viewerLogin: viewer,
}: { prs: PullRequest[]; repo: RepoData; viewerLogin: string }) {
  const stats = useMemo(() => {
    const mineToReview = prs.filter((p) => p.reviewers.some(
      (r) => r.login === viewer && r.state === 'pending',
    ));
    const myPrs = prs.filter((p) => p.author === viewer);
    const myCritical = mineToReview.filter((p) => computePrRisk(p, repo).tier === 'critical').length;
    const conflicts = prs.filter((p) => p.hasConflicts).length;
    const failingCi = prs.filter((p) => summariseChecks(p.checks).required.failed > 0).length;
    return {
      mineToReview: mineToReview.length, myPrs: myPrs.length,
      myCritical, conflicts, failingCi,
    };
  }, [prs, repo, viewer]);

  const items: StatusItem[] = [
    { label: 'to review', value: String(stats.mineToReview), tone: stats.mineToReview > 0 ? 'warn' : 'ok' },
    { label: 'critical', value: String(stats.myCritical), tone: stats.myCritical > 0 ? 'block' : 'ok' },
    { label: 'failing CI', value: String(stats.failingCi), tone: stats.failingCi > 0 ? 'block' : 'ok' },
    { label: 'conflicts', value: String(stats.conflicts), tone: stats.conflicts > 0 ? 'warn' : 'ok' },
    { label: 'my PRs', value: String(stats.myPrs) },
  ];

  const toneColor = (t?: 'block' | 'warn' | 'ok'): string =>
    t === 'block' ? SEV.blocker
    : t === 'warn' ? SEV.medium
    : t === 'ok' ? OK
    : 'rgba(255,255,255,0.85)';

  return (
    <div
      className="shrink-0 h-7 flex items-center gap-4 px-3 border-b border-white/[0.06]"
      style={{ backgroundColor: '#0d1117' }}
    >
      <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-white/70">
        Review
      </span>
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-baseline gap-1.5">
          <span
            className="text-[11px] font-semibold tabular-nums"
            style={{ color: toneColor(it.tone) }}
          >
            {it.value}
          </span>
          <span className="text-[10px] text-white/45 lowercase">
            {it.label}
          </span>
        </span>
      ))}
      <span className="ml-auto text-[10px] font-mono text-white/35">@{viewer}</span>
    </div>
  );
}
