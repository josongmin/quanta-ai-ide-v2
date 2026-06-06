// ─────────────────────────────────────────────────────────────────────────
// Severity / tier colour + label maps for the review surface. Hoisted here
// so the root shell, the spine, and the context panel share one allocation
// (identity stays stable across renders) and the encoding stays consistent:
// blocker → red, high → red, medium → amber, low → blue.
//
// Colours are the same CSS-var intent tokens the surface used inline before
// the split — no visual change.
// ─────────────────────────────────────────────────────────────────────────

import type { EngineSeverity, RiskTier } from '@entities/pr';

export const SEV: Record<EngineSeverity, string> = {
  blocker: 'var(--intent-danger-fg)', high: 'var(--intent-danger-fg)', medium: 'var(--intent-warn-fg)', low: 'var(--intent-info-fg)',
};
export const SEV_LABEL: Record<EngineSeverity, string> = {
  blocker: 'Blocker', high: 'High', medium: 'Medium', low: 'Low',
};
export const TIER_COLOR: Record<RiskTier, string> = {
  safe: 'var(--intent-success-fg)', attention: 'var(--intent-warn-fg)', critical: 'var(--intent-danger-fg)',
};
export const TIER_LABEL: Record<RiskTier, string> = {
  safe: 'Ready', attention: 'Review', critical: 'Caution',
};

// Severity rank — module-scope so the EngineScene grouping memo doesn't
// re-allocate it on every render and React lint doesn't flag a bogus
// "missing dependency".
export const SEV_RANK: Record<EngineSeverity, number> = {
  blocker: 0, high: 1, medium: 2, low: 3,
};
