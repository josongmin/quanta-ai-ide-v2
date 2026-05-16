// SuspectRankingCard — top-3 suspects for a single incident.
//
// Surface rules pulled directly from Feature 02's UX section:
//   1. Blame tone forbidden — copy reads "most explanatory change", not
//      "who broke this". The card title is "Suspect ranking", never
//      "Blame".
//   2. Confidence pills are visible at-a-glance (3 tiers only).
//   3. NO left-edge coloured stripes anywhere. Confidence is conveyed by
//      a small inline pill, not by a column rule.
//   4. Top 3 only — anything beyond that is fallback noise.
//
// Style: presentational, no store. Glass surface uses
// `bg-white/40 dark:bg-white/[0.04]` so the panel can sit on either the
// light or dark review chrome without alpha bumps.

import type { ReactNode } from 'react';
import type { Suspect, SuspectConfidence, SuspectRanking } from '@entities/suspect';

type Props = {
  ranking: SuspectRanking;
  onSelect?: (suspect: Suspect) => void;
};

const CONFIDENCE_LABEL: Record<SuspectConfidence, string> = {
  exact: 'Exact',
  strong_inferred: 'Strong inferred',
  weak_inferred: 'Weak inferred',
};

function ConfidencePill({ confidence }: { confidence: SuspectConfidence }) {
  // Tone via text + ring, never via a left bar. Three tiers, three weights.
  const style: React.CSSProperties =
    confidence === 'exact'
      ? { color: 'var(--intent-success-fg)', boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--intent-success-vivid) 30%, transparent)' }
      : confidence === 'strong_inferred'
        ? { color: 'var(--intent-warn-fg)', boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--intent-warn-vivid) 30%, transparent)' }
        : { color: 'var(--fg-muted)', boxShadow: 'inset 0 0 0 1px var(--border-default)' };
  return (
    <span
      style={style}
      className="inline-flex items-center px-1.5 h-5 rounded-md text-[9px] font-bold uppercase tracking-[0.14em] bg-white/30 dark:bg-white/[0.03]"
    >
      {CONFIDENCE_LABEL[confidence]}
    </span>
  );
}

function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

function Row({
  suspect,
  index,
  onSelect,
}: {
  suspect: Suspect;
  index: number;
  onSelect?: (s: Suspect) => void;
}): ReactNode {
  const reasons = suspect.whyRanked.slice(0, 2);
  const isInteractive = typeof onSelect === 'function';
  const handleClick = () => onSelect?.(suspect);

  const content = (
    <>
      <div className="flex items-center gap-2 min-w-0">
        <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-mono font-bold tabular-nums bg-black/5 dark:bg-white/[0.05] text-zinc-700 dark:text-zinc-300">
          {String(index + 1)}
        </span>
        <span className="font-mono text-[11px] text-zinc-700 dark:text-zinc-200 tabular-nums">
          {shortSha(suspect.commitSha)}
        </span>
        {typeof suspect.prNumber === 'number' && (
          <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
            #{String(suspect.prNumber)}
          </span>
        )}
        <span className="text-[11px] text-zinc-600 dark:text-zinc-300 truncate">
          {suspect.authorId}
        </span>
        {suspect.suspectSymbol && (
          <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-500 truncate">
            {suspect.suspectSymbol}
          </span>
        )}
        <span className="ml-auto shrink-0">
          <ConfidencePill confidence={suspect.confidence} />
        </span>
      </div>
      {reasons.length > 0 && (
        <ul className="mt-1.5 pl-7 space-y-0.5">
          {reasons.map((r) => (
            <li
              key={r}
              className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug"
            >
              {r}
            </li>
          ))}
        </ul>
      )}
    </>
  );

  const baseClass =
    'block w-full text-left px-3 py-2 rounded-lg transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03]';

  if (isInteractive) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`${baseClass} cursor-pointer`}
      >
        {content}
      </button>
    );
  }
  return <div className={baseClass}>{content}</div>;
}

export default function SuspectRankingCard({ ranking, onSelect }: Props) {
  const suspects = ranking.suspects.slice(0, 3);
  if (suspects.length === 0) {
    return (
      <div className="rounded-2xl px-4 py-4 backdrop-blur bg-white/40 dark:bg-white/[0.04] ring-1 ring-inset ring-black/5 dark:ring-white/5">
        <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
          No suspects ranked above the inference threshold for {ranking.incidentId}.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl px-3 py-3 backdrop-blur bg-white/40 dark:bg-white/[0.04] ring-1 ring-inset ring-black/5 dark:ring-white/5">
      <div className="flex items-center gap-2 px-1 mb-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-700 dark:text-zinc-300">
          Suspect ranking
        </span>
        <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-500">
          {ranking.incidentId}
        </span>
        <span className="ml-auto font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
          top {String(suspects.length)}
        </span>
      </div>

      <div className="flex flex-col gap-0.5">
        {suspects.map((s, i) => (
          <Row key={s.id} suspect={s} index={i} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
