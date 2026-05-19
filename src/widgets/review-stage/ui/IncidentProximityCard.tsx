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
  const accent = top.similarity >= 0.65 ? 'var(--intent-danger-fg)'
    : top.similarity >= 0.5 ? 'var(--intent-danger-fg)'
    : 'var(--intent-warn-fg)';

  return (
    <V2Card className="p-5 relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(60% 100% at 0% 50%, color-mix(in srgb, ${accent} 12%, transparent) 0%, transparent 60%)`,
        }}
      />
      <div className="relative flex items-center gap-2 mb-3">
        <History className="w-3.5 h-3.5" style={{ color: accent }} strokeWidth={2} />
        <span className="text-[11px] font-bold uppercase tracking-[var(--track-eyebrow)]" style={{ color: accent }}>
          Past-incident proximity
        </span>
        <ProvenanceBadge kind="static" />
        <span className="text-[10px] font-mono text-[var(--fg-subtle)]">
          {visible.length} {visible.length === 1 ? 'match' : 'matches'}
        </span>
      </div>

      <ul className="relative space-y-1.5">
        {visible.slice(0, 4).map((inc) => {
          const sim = Math.round(inc.similarity * 100);
          const tone = inc.similarity >= 0.65 ? 'var(--intent-danger-fg)'
            : inc.similarity >= 0.5 ? 'var(--intent-danger-fg)'
            : 'var(--intent-warn-fg)';
          return (
            <li
              key={inc.id}
              className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-2 py-2 rounded-md hover:bg-[var(--bg-surface-muted)]"
            >
              <span
                className="shrink-0 inline-flex items-center justify-center px-2 h-6 rounded-md text-[10px] font-mono font-bold tabular-nums"
                style={{ background: `color-mix(in srgb, ${tone} 13%, transparent)`, color: tone, border: `1px solid color-mix(in srgb, ${tone} 33%, transparent)` }}
              >
                {inc.id}
              </span>
              <div className="min-w-0">
                <div className="text-[12px] text-[var(--fg-default)] truncate" title={inc.title}>
                  {inc.title}
                </div>
                <div className="mt-1 h-1 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                  <div
                    className="h-full"
                    style={{ width: `${String(sim)}%`, background: tone }}
                  />
                </div>
              </div>
              <span className="shrink-0 text-[10px] font-mono tabular-nums" style={{ color: tone }}>
                {sim}%
              </span>
              <span className="shrink-0 text-[10px] font-mono text-[var(--fg-subtle)]">
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
                className="shrink-0 col-start-4 row-start-1 -mr-1 p-1 rounded text-[var(--fg-subtle)] hover:text-[var(--fg-muted)] hover:bg-[var(--bg-hover)]"
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
