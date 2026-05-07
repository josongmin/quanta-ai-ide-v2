import { useMemo } from 'react';
import type { CallGraphChange, PullRequest } from '@entities/pr';
import { callGraphChanges } from '@entities/pr';
import type { RepoData } from '@entities/repo';

// "Call graph changes" — a card surfacing impact paths the static engine
// extracted by walking dependencies one or two hops out from each changed
// file. Mirrors the look of the engine rail's finding cards but is a
// table-style list rather than a card-per-row.

type Props = {
  pr: PullRequest;
  repo: RepoData;
  isDark: boolean;
};

type Kind = CallGraphChange['kind'];

const KIND_LABEL: Record<Kind, string> = {
  modified:    'MODIFIED',
  signature:   'SIGNATURE',
  concurrency: 'CONCURRENCY',
  new:         'NEW',
};

const KIND_COLOR: Record<Kind, string> = {
  modified:    '#8b949e',
  signature:   '#a8893a',
  concurrency: '#9583b8',
  new:         '#4f9a5c',
};

export default function CallGraphChangesCard({ pr, repo, isDark }: Props) {
  const rows = useMemo(() => callGraphChanges(pr, repo), [pr, repo]);

  const cardBg     = isDark ? 'bg-white/[0.025]' : 'bg-black/[0.02]';
  const cardBorder = isDark ? 'border-white/5'   : 'border-black/5';
  const title      = isDark ? 'text-white/85'    : 'text-black/85';
  const subtitle   = isDark ? 'text-white/40'    : 'text-black/40';

  return (
    <section className={`rounded-lg border ${cardBg} ${cardBorder}`}>
      <header className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
        <h3 className={`text-[12px] font-bold ${title}`}>
          Call graph changes
        </h3>
        <span className={`text-[11px] ${subtitle}`}>
          Impact paths tracked by the static engine
        </span>
      </header>

      <div className="px-3 pb-3 space-y-1">
        {rows.length === 0 ? (
          <EmptyState isDark={isDark} />
        ) : (
          rows.map((r, i) => (
            <CallGraphRow key={`${r.from}->${r.to}-${String(i)}`} row={r} isDark={isDark} />
          ))
        )}
      </div>
    </section>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────

function CallGraphRow({ row, isDark }: { row: CallGraphChange; isDark: boolean }) {
  const symbol = isDark ? 'text-white/70' : 'text-black/70';
  const arrow  = isDark ? 'text-white/30' : 'text-black/30';
  const hop    = isDark ? 'text-white/40' : 'text-black/40';

  return (
    <div className="flex items-center gap-2 py-1 text-[11px]">
      <KindPill kind={row.kind} />
      <span className={`font-mono truncate ${symbol}`} title={row.from}>
        {row.from}
      </span>
      <span className={`shrink-0 font-mono ${arrow}`}>→</span>
      <span className={`font-mono truncate ${symbol}`} title={row.to}>
        {row.to}
      </span>
      <span className={`ml-auto shrink-0 font-mono ${hop}`}>
        {row.hops} hop{row.hops === 1 ? '' : 's'}
      </span>
    </div>
  );
}

function KindPill({ kind }: { kind: Kind }) {
  const color = KIND_COLOR[kind];
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold font-mono uppercase tracking-[0.18em] shrink-0"
      style={{ background: `${color}26`, color }}
    >
      {KIND_LABEL[kind]}
    </span>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────

function EmptyState({ isDark }: { isDark: boolean }) {
  const muted = isDark ? 'text-white/40' : 'text-black/40';
  return (
    <div className={`text-[11px] italic ${muted}`}>
      No call-graph movement detected
    </div>
  );
}
