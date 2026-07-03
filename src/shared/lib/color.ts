// Three-tier severity tokens. Red is reserved for *structural* failures
// that block safe automated work. Quantitative threshold misses use amber.
// Green is used sparingly — only for hero scores and the rare positive
// signal — so it doesn't compete with the severity palette.
//
// Values derive from the primitive palette (SSOT) so a palette change
// propagates here instead of drifting. This is the runtime-JS hex accessor for
// canvas/SVG viz that can't read CSS vars; CSS surfaces use --intent-* directly.
import { primitives } from '../tokens';

export const C = {
  critical: primitives.colors.red[400],
  warning:  primitives.colors.amber[400],
  ok:       primitives.colors.green[400],
} as const;

export type Tone = 'neutral' | 'warn' | 'critical' | 'ok';
