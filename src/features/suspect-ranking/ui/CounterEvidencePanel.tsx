// CounterEvidencePanel — primary surface, not an afterthought.
//
// Per the plan's Q3: "왜 *아닐* 수도 있는가" needs equal visual weight to
// confidence. The panel is therefore titled positively ("Why not this
// suspect"), uses the same glass surface as the ranking card, and never
// hides behind a disclosure toggle.
//
// Bullets are pre-rendered by `buildCounterEvidence` upstream — this
// component is purely presentational.

import type { Suspect } from '@entities/suspect';

type Props = {
  suspect: Suspect;
};

export default function CounterEvidencePanel({ suspect }: Props) {
  const items = suspect.whyNot;

  return (
    <div className="rounded-2xl px-4 py-3 backdrop-blur bg-white/40 dark:bg-white/[0.04] ring-1 ring-inset ring-black/5 dark:ring-white/5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-700 dark:text-zinc-300">
          Why not this suspect
        </span>
        <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-500">
          {suspect.commitSha.slice(0, 7)}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-500 italic">
          No counter-evidence surfaced — review the supporting signals.
        </p>
      ) : (
        <ul className="space-y-1">
          {items.map((line) => (
            <li
              key={line}
              className="text-[11px] leading-snug text-zinc-600 dark:text-zinc-400 flex gap-2"
            >
              <span aria-hidden className="text-zinc-400 dark:text-zinc-600 select-none">
                ·
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
