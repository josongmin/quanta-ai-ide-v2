// Lightweight matcher. Two stages:
//
//   1. Tokenize the query on whitespace; every token must match somewhere
//      in `label + keywords` (case-folded). All-or-nothing per token so
//      "fix theme" doesn't surface "Open Fix Pipeline" (it would match
//      "fix" but not "theme").
//   2. Score the survivors so the renderer can rank:
//        - prefix match on the label  → strongest
//        - subsequence match (chars in order)  → weak
//        - keyword-only match  → weakest
//      The actual numeric weights are arbitrary; what matters is that
//      they're stable so the order doesn't flicker as the user types.
//
// We intentionally don't ship a fancy fuzzy library. The command set is
// tiny (≤ ~20 entries), and the user expects deterministic ranking; a
// fuzzy lib's "hidden cleverness" tends to produce surprising orders.

import type { Command } from '../model/types';

export type ScoredCommand = {
  command: Command;
  score: number;
}

export function matchCommands(commands: Command[], query: string): ScoredCommand[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) {
    // No query → preserve input order so the renderer's natural
    // grouping (recents → navigate → action) shows through.
    return commands.map((c) => ({ command: c, score: 0 }));
  }
  const tokens = q.split(/\s+/u).filter(Boolean);
  const out: ScoredCommand[] = [];

  for (const cmd of commands) {
    const label = cmd.label.toLowerCase();
    const haystack = [label, ...(cmd.keywords ?? []).map((k) => k.toLowerCase())].join('  ');
    let allHit = true;
    let score = 0;

    for (const tok of tokens) {
      if (label.startsWith(tok)) {
        score += 100;
      } else if (label.includes(tok)) {
        score += 60;
      } else if (haystack.includes(tok)) {
        // Keyword-only match — counts but ranks below label hits.
        score += 30;
      } else if (isSubsequence(tok, label)) {
        score += 12;
      } else {
        allHit = false;
        break;
      }
    }
    if (!allHit) continue;
    // Bias shorter labels slightly so "fix" beats "fix pipeline" when
    // both match equally — the more specific item wins by typing more.
    score -= label.length * 0.05;
    out.push({ command: cmd, score });
  }

  // Stable sort: primary by score desc, secondary by original order so
  // ties don't shuffle on each keystroke.
  return out
    .map((s, i) => ({ s, i }))
    .sort((a, b) => (b.s.score - a.s.score) || (a.i - b.i))
    .map(({ s }) => s);
}

// "fzf-lite" — every char in `needle` appears in `hay` in order. Used
// only when neither prefix nor substring match. Linear in `hay`.
function isSubsequence(needle: string, hay: string): boolean {
  let h = 0;
  for (const ch of needle) {
    while (h < hay.length && hay[h] !== ch) h += 1;
    if (h >= hay.length) return false;
    h += 1;
  }
  return true;
}
