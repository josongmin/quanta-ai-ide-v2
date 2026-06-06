// Single source of truth for semantic tone → color tokens.
//
// Replaces the nested `tone === 'ok' ? ... : tone === 'warn' ? ...` ternaries
// reimplemented across WorkspaceBody, VerifiedFixCard, TrustPanel, TriageModal,
// etc. Adding a new tone now means one entry here instead of editing N files
// (Open/Closed). All values resolve to intent CSS variables so light/dark and
// theme presets stay consistent.

import type { Tone } from './color';

// The base severity `Tone` ('neutral' | 'warn' | 'critical' | 'ok') plus an
// informational accent used by some surfaces (links, in-progress states).
export type SemanticTone = Tone | 'info';

export type ToneColors = {
  /** Solid accent — for dots, indicators, icon strokes. */
  dot: string;
  /** Low-alpha fill — for chip/badge/strip backgrounds. */
  bg: string;
  /** Readable foreground text on the page (not on `bg`). */
  fg: string;
  /** Border / ring color for outlined treatments. */
  border: string;
};

// `rgb(from <var> r g b / <a>)` keeps the alpha fill in sync with the vivid
// token without committing a second hard-coded color.
function fill(varName: string, alpha: number): string {
  return `rgb(from ${varName} r g b / ${alpha})`;
}

const TONE_TABLE: Record<SemanticTone, ToneColors> = {
  ok: {
    dot: 'var(--intent-success-vivid)',
    bg: fill('var(--intent-success-vivid)', 0.1),
    fg: 'var(--intent-success-fg)',
    border: fill('var(--intent-success-vivid)', 0.4),
  },
  warn: {
    dot: 'var(--intent-warn-vivid)',
    bg: fill('var(--intent-warn-vivid)', 0.12),
    fg: 'var(--intent-warn-fg)',
    border: fill('var(--intent-warn-vivid)', 0.4),
  },
  critical: {
    dot: 'var(--intent-danger-vivid)',
    bg: fill('var(--intent-danger-vivid)', 0.1),
    fg: 'var(--intent-danger-fg)',
    border: fill('var(--intent-danger-vivid)', 0.4),
  },
  info: {
    dot: 'var(--fg-link)',
    bg: fill('var(--fg-link)', 0.1),
    fg: 'var(--fg-link)',
    border: fill('var(--fg-link)', 0.4),
  },
  neutral: {
    dot: 'var(--fg-muted)',
    bg: fill('var(--fg-muted)', 0.1),
    fg: 'var(--fg-default)',
    border: 'var(--border-default)',
  },
};

/** Resolve a semantic tone to its color token set. Unknown tones → neutral. */
export function toneToColors(tone: SemanticTone | undefined | null): ToneColors {
  return TONE_TABLE[tone ?? 'neutral'] ?? TONE_TABLE.neutral;
}
