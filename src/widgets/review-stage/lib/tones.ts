// ─────────────────────────────────────────────────────────────────────────
// Theme tokens for the review surface. The widget is hard-pinned to dark
// (light tokens are not threaded through), so most tones() returns are
// dark-mode constants — but PAGE_BG_LIGHT exists for the only switch
// the orchestrator actually flips (the outer page background).
//
// Severity hue stays constant across the surface (blocker → red,
// high → coral, med → amber, low → blue). Consistent encoding =
// less re-learning per PR.
// ─────────────────────────────────────────────────────────────────────────

import type { EngineSeverity, RiskTier } from '@entities/pr';

export const PAGE_BG = '#0d1117';
export const PAGE_BG_LIGHT = '#f4f6f9';

export const SEV: Record<EngineSeverity, string> = {
  blocker: '#c25a55', high: '#d98a85', medium: '#a8893a', low: '#5a8fce',
};

export const SEV_LABEL: Record<EngineSeverity, string> = {
  blocker: 'Blocker', high: 'High', medium: 'Medium', low: 'Low',
};

export const TIER_COLOR: Record<RiskTier, string> = {
  safe: '#4f9a5c', attention: '#a8893a', critical: '#c25a55',
};

export const TIER_LABEL: Record<RiskTier, string> = {
  safe: 'Ready', attention: 'Review', critical: 'Caution',
};

// Single OK tone — used by status/gates when something passes. Kept here
// rather than re-derived per call so swapping the green hue is one-edit.
export const OK = '#5fa86c';

export type Tones = {
  pageBg: string;
};

/**
 * Mode-aware token bag. Today only the page background flips on the
 * dark/light switch — every other tone in the widget is dark-only.
 * Centralised here so future light-mode work has a single seam.
 */
export function tones(isDark: boolean): Tones {
  return {
    pageBg: isDark ? PAGE_BG : PAGE_BG_LIGHT,
  };
}
