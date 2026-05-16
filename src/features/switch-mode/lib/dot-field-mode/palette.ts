// Theme palettes for DotFieldMode.
//
// Designed so that perceived contrast (CIE L* delta against background) is
// roughly matched in both modes:
//   dark:  bg L*≈8,  STABLE dot L*≈14  → ΔL*≈6   on a near-black field
//   light: bg L*≈96, STABLE dot L*≈72  → ΔL*≈24  on a near-white field
// (Light needs a larger ΔL* because bright backgrounds suppress contrast more.)
//
// Hue families are preserved across themes: green=alive/highlighted, red=danger,
// neutral=stable. Light-mode green/red are GitHub Primer's *-fg tokens, which
// pass WCAG AA against the canvas-default background.
// Spec §11 / Healey 1996: identity palette is 4 hues, period. Anything
// else (intensity, highlight) lives on a different visual channel.
//   stable/modified/vulnerable + a single "out-of-scope" hue for
//   generated + vendor files (analyzer-skipped territory).

import type { StatusKey } from '@entities/repo';
import { C } from '@shared/lib';

export type Palette = {
  bg: number;
  grid: number;
  folder: number;
  status: Record<StatusKey, number>;
  outOfScope: number;     // generated / vendor — same hue regardless of status
  accent: number;
  // HTML label colors
  labelDefault: string;
  labelGlow: string;
  labelDanger: string;
  labelSelected: string;
};

export const PALETTE_DARK: Palette = {
  bg: 0x0d1117,
  grid: 0x161b22,
  folder: 0x30363d,
  status: {
    STABLE: 0x6e7681,         // neutral grey — same hue family as filter-bar muted text
    MODIFIED: 0x39d353,       // green
    NEW: 0x39d353,            // same green; "new" is just modified-from-zero
    SECURITY_ALERT: 0xf85149, // red
  },
  outOfScope: 0xa371f7,       // calm purple — generated / vendor / "not your code"
  accent: 0x39d353,
  labelDefault: '#8b949e',
  labelGlow: '#4f9a5c',
  labelDanger: C.critical,
  labelSelected: '#ffffff',
};

export const PALETTE_LIGHT: Palette = {
  bg: 0xf4f6f9,
  grid: 0xc9d1d9,
  folder: 0xafb8c1,
  status: {
    STABLE: 0x6e7681,
    MODIFIED: 0x1a7f37,
    NEW: 0x1a7f37,
    SECURITY_ALERT: 0xcf222e,
  },
  outOfScope: 0x8250df,       // Primer purple-fg
  accent: 0x1a7f37,
  labelDefault: '#59636e',
  labelGlow: '#1a7f37',
  labelDanger: '#a83a3f',
  labelSelected: '#1f2328',
};

export function paletteFor(theme: 'dark' | 'light'): Palette {
  return theme === 'light' ? PALETTE_LIGHT : PALETTE_DARK;
}
