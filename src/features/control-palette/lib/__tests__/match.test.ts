import { describe, it, expect } from 'vitest';
import { matchCommands } from '../match';
import type { Command } from '../../model/types';

// The command palette's ranking is deterministic-by-design (no fuzzy lib). This
// locks the all-tokens-must-match filter + the prefix > substring > keyword >
// subsequence order + stable tie-breaking users feel on every keystroke.

const nav = (label: string, keywords?: string[]): Command => ({
  kind: 'navigate', id: label, label, path: `/${label}`, keywords,
});

const labels = (cmds: Command[], q: string) =>
  matchCommands(cmds, q).map((s) => s.command.label);

describe('matchCommands', () => {
  it('preserves input order and scores 0 on an empty query', () => {
    const cmds = [nav('Beta'), nav('Alpha')];
    const res = matchCommands(cmds, '  ');
    expect(res.map((s) => s.command.label)).toEqual(['Beta', 'Alpha']);
    expect(res.every((s) => s.score === 0)).toBe(true);
  });

  it('requires every token to match (all-or-nothing)', () => {
    const cmds = [nav('Open Fix Pipeline'), nav('Fix theme tokens')];
    // "fix theme" must exclude the pipeline command (matches "fix", not "theme").
    expect(labels(cmds, 'fix theme')).toEqual(['Fix theme tokens']);
  });

  it('ranks prefix > substring > keyword > subsequence', () => {
    const cmds = [
      nav('zzz theme'),                 // substring "theme"
      nav('Theme settings'),            // prefix "theme"
      nav('Colors', ['theme palette']), // keyword-only "theme"
    ];
    expect(labels(cmds, 'theme')).toEqual(['Theme settings', 'zzz theme', 'Colors']);
  });

  it('biases shorter labels so the more specific item wins on a tie', () => {
    const cmds = [nav('Fix Pipeline'), nav('Fix')];
    expect(labels(cmds, 'fix')).toEqual(['Fix', 'Fix Pipeline']);
  });

  it('keeps ties in original order (no flicker)', () => {
    const cmds = [nav('Alpha'), nav('Album')]; // both prefix "al", equal length → true tie
    expect(labels(cmds, 'al')).toEqual(['Alpha', 'Album']);
  });
});
