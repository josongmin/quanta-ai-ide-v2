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
  modified:    'var(--fg-muted)',
  signature:   'var(--intent-warn-fg)',
  concurrency: 'var(--fg-accent)',
  new:         'var(--intent-success-fg)',
};

export default function CallGraphChangesCard({ pr, repo, isDark }: Props) {
  const rows = useMemo(() => callGraphChanges(pr, repo), [pr, repo]);

  const cardBg     = 'bg-[var(--bg-surface-muted)]';
  const cardBorder = 'border-[var(--border-muted)]';
  const title      = 'text-[var(--fg-default)]';
  const subtitle   = 'text-[var(--fg-subtle)]';

  return (
    <section className={`rounded-lg border ${cardBg} ${cardBorder}`}>
      <header className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
        <h3 className={`text-base font-bold ${title}`}>
          Call graph changes
        </h3>
        <span className={`text-sm ${subtitle}`}>
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

function CallGraphRow({ row }: { row: CallGraphChange; isDark: boolean }) {
  const symbol = 'text-[var(--fg-muted)]';
  const arrow  = 'text-[var(--fg-subtle)]';
  const hop    = 'text-[var(--fg-subtle)]';

  return (
    <div className="flex items-center gap-2 py-1 text-sm">
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
      className="inline-flex items-center px-1.5 py-0.5 rounded-md text-2xs font-bold font-mono uppercase tracking-eyebrow shrink-0"
      style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
    >
      {KIND_LABEL[kind]}
    </span>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────

function EmptyState(_props: { isDark: boolean }) {
  const muted = 'text-[var(--fg-subtle)]';
  return (
    <div className={`text-sm italic ${muted}`}>
      No call-graph movement detected
    </div>
  );
}
