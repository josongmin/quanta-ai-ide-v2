import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { semanticToCssVar } from '../applyTokens';

// Guards the one SILENT seam in the token pipeline.
//
// `tailwind.config.js` maps utility classes (`bg-canvas`, `text-fg-muted`, …)
// to `var(--…)` string literals. Nothing type-checks those strings against the
// tokens `applyTokens()` actually emits — a typo (`var(--bg-canvs)`) or a
// reference to a renamed/deleted token silently produces a class that resolves
// to nothing. This test fails loud if tailwind references a var the token layer
// doesn't emit.

const here = dirname(fileURLToPath(import.meta.url));
const tailwindConfigSrc = readFileSync(
  resolve(here, '../../../../tailwind.config.js'),
  'utf8',
);

// Strip comments first — the config documents past `var(--track-eyebrow)` usage
// in prose, and we only want to validate real config values.
const withoutComments = tailwindConfigSrc
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '');

// Every theme-flipping CSS var applyTokens() writes onto :root.
const EMITTED = new Set(Object.values(semanticToCssVar));

// All `var(--x)` references in the tailwind config's actual values.
const referenced = [...withoutComments.matchAll(/var\((--[a-z0-9-]+)\)/g)].map(
  (m) => m[1],
);

describe('tailwind ↔ token sync', () => {
  it('finds var() references in the tailwind config (regex sanity)', () => {
    // If this fails the extraction broke; the ⊆ assertion below would be a
    // false pass on an empty set.
    expect(referenced).toContain('--bg-canvas');
  });

  it('every var(--x) in tailwind.config maps to an emitted semantic token', () => {
    const orphans = [...new Set(referenced)].filter((v) => !EMITTED.has(v));
    expect(
      orphans,
      `tailwind.config.js references CSS vars that applyTokens() does not emit ` +
        `(typo or renamed/deleted token): ${orphans.join(', ')}`,
    ).toEqual([]);
  });
});
