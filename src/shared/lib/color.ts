// Three-tier severity tokens. Red is reserved for *structural* failures
// that block safe automated work. Quantitative threshold misses use amber.
// Green is used sparingly — only for hero scores and the rare positive
// signal — so it doesn't compete with the severity palette.
export const C = {
  critical: '#c25a55',
  warning:  '#a8893a',
  ok:       '#5fa86c',
} as const;

export type Tone = 'neutral' | 'warn' | 'critical' | 'ok';
