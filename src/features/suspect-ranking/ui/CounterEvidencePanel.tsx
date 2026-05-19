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
    <div className="rounded-2xl px-4 py-3 bg-[var(--bg-elevated)] dark:backdrop-blur ring-1 ring-inset ring-[var(--border-muted)]">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-default)]">
          Why not this suspect
        </span>
        <span className="font-mono text-[10px] text-[var(--fg-muted)]">
          {suspect.commitSha.slice(0, 7)}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-[11px] text-[var(--fg-muted)] italic">
          No counter-evidence surfaced — review the supporting signals.
        </p>
      ) : (
        <ul className="space-y-1">
          {items.map((line) => (
            <li
              key={line}
              className="text-[11px] leading-snug text-[var(--fg-muted)] flex gap-2"
            >
              <span aria-hidden className="text-[var(--fg-subtle)] select-none">
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
