// ─────────────────────────────────────────────────────────────────────────
// Theme tokens for the review surface. The widget is hard-pinned to dark
// (light tokens are not threaded through), so the surviving exports are
// all dark-mode constants. Earlier helpers (PAGE_BG, TIER_COLOR, tones())
// were trimmed once their consumers were inlined or migrated to CSS vars.
// ─────────────────────────────────────────────────────────────────────────

import type { EngineSeverity } from '@entities/pr';
import { primitives } from '@shared/tokens';

const { red, amber, blue, green } = primitives.colors;

export const SEV: Record<EngineSeverity, string> = {
  blocker: red[400], high: red[300], medium: amber[400], low: blue[400],
};

// Single OK tone — used by status/gates when something passes.
export const OK = green[400];
