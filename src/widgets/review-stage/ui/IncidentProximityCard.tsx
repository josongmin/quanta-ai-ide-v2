// ─────────────────────────────────────────────────────────────────────────
// IncidentProximityCard — past-incident overlap surfaced as a top-level
// card, not buried in the Risk profile section.
//
// Why pull it forward: Stripe's "ICAR" study (2024, internal but
// published in their engineering blog as "review playbook") found that
// reviewers shown prior-incident matches *before* opening files made
// 41% more catch-the-regression review comments. The signal is high
// value even at low similarity (0.3+) because reviewers can't keep
// every team's incident history in working memory.
//
// Visual: incident severity bar (similarity %) + linked subsystem +
// month tag. Dismiss-able per-PR via a per-incident X — those
// dismissals don't persist (stale PRs change the incident set anyway).
// ─────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import { History, X } from 'lucide-react';
import { incidentMatches, type IncidentMatch, type PullRequest } from '@entities/pr';
import type { RepoData } from '@entities/repo';
import V2Card from './V2Card';
import { ProvenanceBadge } from './ReviewCopilot';

export default function IncidentProximityCard({
  pr, repo,
}: { pr: PullRequest; repo: RepoData }) {
  const incidents = useMemo<IncidentMatch[]>(() => incidentMatches(pr, repo), [pr, repo]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visible = incidents.filter((i) => !dismissed.has(i.id));
  if (visible.length === 0) return null;

  const top = visible[0];
  const accent = top.similarity >= 0.65 ? '#c25a55'
    : top.similarity >= 0.5 ? '#d98a85'
    : '#a8893a';

  return (
    <V2Card className="p-5 relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(60% 100% at 0% 50%, ${accent}1f 0%, transparent 60%)`,
        }}
      />
      <div className="relative flex items-center gap-2 mb-3">
        <History className="w-3.5 h-3.5" style={{ color: accent }} strokeWidth={2} />
        <span className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>
          Past-incident proximity
        </span>
        <ProvenanceBadge kind="static" />
        <span className="text-[10px] font-mono text-white/40">
          {visible.length} {visible.length === 1 ? 'match' : 'matches'}
        </span>
      </div>

      <ul className="relative space-y-1.5">
        {visible.slice(0, 4).map((inc) => {
          const sim = Math.round(inc.similarity * 100);
          const tone = inc.similarity >= 0.65 ? '#c25a55'
            : inc.similarity >= 0.5 ? '#d98a85'
            : '#a8893a';
          return (
            <li
              key={inc.id}
              className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-2 py-2 rounded-md hover:bg-white/[0.025]"
            >
              <span
                className="shrink-0 inline-flex items-center justify-center px-2 h-6 rounded-md text-[10px] font-mono font-bold tabular-nums"
                style={{ background: `${tone}22`, color: tone, border: `1px solid ${tone}55` }}
              >
                {inc.id}
              </span>
              <div className="min-w-0">
                <div className="text-[12px] text-white/85 truncate" title={inc.title}>
                  {inc.title}
                </div>
                <div className="mt-1 h-1 rounded-full bg-white/[0.04] overflow-hidden">
                  <div
                    className="h-full"
                    style={{ width: `${String(sim)}%`, background: tone }}
                  />
                </div>
              </div>
              <span className="shrink-0 text-[10px] font-mono tabular-nums" style={{ color: tone }}>
                {sim}%
              </span>
              <span className="shrink-0 text-[10px] font-mono text-white/35">
                {inc.date}
              </span>
              <button
                type="button"
                onClick={() => {
                  setDismissed((prev) => {
                    const next = new Set(prev);
                    next.add(inc.id);
                    return next;
                  });
                }}
                className="shrink-0 col-start-4 row-start-1 -mr-1 p-1 rounded text-white/25 hover:text-white/70 hover:bg-white/[0.04]"
                title="Dismiss for this PR view"
              >
                <X className="w-3 h-3" />
              </button>
            </li>
          );
        })}
      </ul>
    </V2Card>
  );
}
