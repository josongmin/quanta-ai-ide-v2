// Page-surface tones for stages that need a raw colour pair (background +
// border) without going through CSS variables. Use only when a callsite
// truly needs the JS value (e.g. inline `backgroundColor` on an absolute
// container). Anything in normal flow should reach for the semantic CSS
// vars (`var(--bg-canvas)`) directly.
//
// Note: this used to expose `pageBackground` (with a CSS-grid pattern),
// `cardStyle`, `insetStyle`, `headerStyle`, and `borderColor`. None of
// those have callers anymore — `<GlassCard>` and the semantic tokens in
// `shared/tokens` cover those use cases. They were removed to keep this
// file scoped to the single remaining responsibility: a raw page-color
// lookup.

const DARK = {
  page:       '#0d1117',
  border:     'rgba(255, 255, 255, 0.10)',
  borderSoft: 'rgba(255, 255, 255, 0.06)',
};

const LIGHT = {
  page:       '#f4f6f9',
  border:     'rgba(255, 255, 255, 0.4)',
  borderSoft: 'rgba(0, 0, 0, 0.06)',
};

export function tokens(isDark: boolean) {
  return isDark ? DARK : LIGHT;
}

/** Page-level background style. Returns just a `backgroundColor` — no
 *  grid pattern. The earlier version drew a 10px CSS-grid behind every
 *  page, but the user wanted a flat surface, so this stays a single solid
 *  fill. Kept as a helper rather than inlining the lookup so future
 *  page-level refinements (a faint vignette, a subtle aurora) have a
 *  single seam to land on. */
export function pageBackground(isDark: boolean): React.CSSProperties {
  return { backgroundColor: tokens(isDark).page };
}
