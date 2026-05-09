// ─────────────────────────────────────────────────────────────────────────
// Theme tokens for the review surface. The widget is hard-pinned to dark
// (light tokens are not threaded through), so the surviving exports are
// all dark-mode constants. Earlier helpers (PAGE_BG, TIER_COLOR, tones())
// were trimmed once their consumers were inlined or migrated to CSS vars.
// ─────────────────────────────────────────────────────────────────────────

import type { EngineSeverity } from '@entities/pr';

export const SEV: Record<EngineSeverity, string> = {
  blocker: '#c25a55', high: '#d98a85', medium: '#a8893a', low: '#5a8fce',
};

// Single OK tone — used by status/gates when something passes.
export const OK = '#5fa86c';
