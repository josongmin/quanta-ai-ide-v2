import { useMemo } from 'react';
import type { IncidentMatch, PullRequest } from '@entities/pr';
import { incidentMatches } from '@entities/pr';
import type { RepoData } from '@entities/repo';

// "Past incident similarity" — a card listing prior incidents whose
// fingerprints overlap with the active PR. The card is self-contained: it
// owns its title, subtitle, empty state and rows so the parent only has
// to provide PR + repo + theme.

type Props = {
  pr: PullRequest;
  repo: RepoData;
  isDark: boolean;
};

export default function PastIncidentsCard({ pr, repo, isDark }: Props) {
  const matches = useMemo(() => incidentMatches(pr, repo), [pr, repo]);

  const cardBg     = isDark ? 'bg-white/[0.025]' : 'bg-black/[0.02]';
  const cardBorder = isDark ? 'border-white/5'   : 'border-black/5';
  const title      = isDark ? 'text-white/85'    : 'text-black/85';
  const subtitle   = isDark ? 'text-white/40'    : 'text-black/40';

  return (
    <section className={`rounded-lg border ${cardBg} ${cardBorder}`}>
      <header className="px-3 pt-3 pb-2">
        <h3 className={`text-[12px] font-bold ${title}`}>
          Past incident similarity
        </h3>
        <p className={`mt-0.5 text-[11px] ${subtitle}`}>
          Prior incidents with overlapping structural patterns
        </p>
      </header>

      <div className="px-3 pb-3 space-y-1.5">
        {matches.length === 0 ? (
          <EmptyState isDark={isDark} />
        ) : (
          matches.map((m) => (
            <IncidentRow key={m.id} match={m} isDark={isDark} />
          ))
        )}
      </div>
    </section>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────

function IncidentRow({ match, isDark }: { match: IncidentMatch; isDark: boolean }) {
  const idColor      = isDark ? 'text-white/70' : 'text-black/70';
  const titleColor   = isDark ? 'text-white/85' : 'text-black/85';
  const dateColor    = isDark ? 'text-white/40' : 'text-black/40';
  const trackColor   = isDark ? 'bg-white/[0.06]' : 'bg-black/[0.05]';

  const pct = Math.round(match.similarity * 100);
  const fillColor = barColor(match.similarity);

  return (
    <div className="flex flex-col gap-1 py-1">
      <div className="flex items-center gap-2 text-[11px]">
        <span className={`font-mono shrink-0 ${idColor}`}>{match.id}</span>
        <span className={`flex-1 min-w-0 truncate ${titleColor}`}>
          {match.title}
        </span>
        <span className={`shrink-0 font-mono ${dateColor}`}>{match.date}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${trackColor}`}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${String(pct)}%`, background: fillColor }}
          />
        </div>
        <span
          className="shrink-0 text-[10px] font-mono tabular-nums"
          style={{ color: fillColor }}
        >
          {pct}%
        </span>
      </div>
    </div>
  );
}

function barColor(similarity: number): string {
  if (similarity >= 0.6) return '#4f9a5c';
  if (similarity >= 0.4) return '#a8893a';
  return '#8b949e';
}

// ─── Empty state ─────────────────────────────────────────────────────────

function EmptyState({ isDark }: { isDark: boolean }) {
  const muted = isDark ? 'text-white/40' : 'text-black/40';
  return (
    <div className={`text-[11px] italic ${muted}`}>
      No incidents match this PR&apos;s fingerprint
    </div>
  );
}
