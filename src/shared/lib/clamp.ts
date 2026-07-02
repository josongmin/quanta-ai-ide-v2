// Numeric clamping. Consolidates the many hand-rolled `Math.max(min, Math.min(max, n))`
// expressions and per-slice `clamp`/`clamp01` copies into one SSOT.

/** Clamp `n` into the inclusive `[min, max]` range. */
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Clamp `n` into `[0, 1]`. */
export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
