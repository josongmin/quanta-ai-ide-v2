// Blueprint design language — single source of truth for the workspace
// surface tones. Aligned with the existing GlassCard primitive (4% white
// fill, 10% white border, blur 22 saturate 160, radius 24) and the
// intelligence tab's faint grid background. Use this everywhere a tab
// renders its own page-level surface (admission, reviews, …).
//
// Tokens are returned as inline-style objects so we can use a CSS
// `linear-gradient` for the grid + a `1px solid` border that Tailwind
// can't express cleanly.

export type SurfaceVariant = 'page' | 'panel' | 'card' | 'inset' | 'header';

// Tones lifted directly from the intelligence dot-field canvas
// (`DotFieldMode.ts`): scene background `#0d1117`, grid lines `#161b22`
// in dark mode; `#f4f6f9` / `#c9d1d9` in light. The CSS grid uses the
// alpha-equivalent of those colour pairs so the workspace and the 3D
// canvas read as one continuous surface.

const DARK = {
  page:   '#0d1117',                          // dot-field bg — same hex
  // The dot-field grid reads as a slightly *darker* line over the page,
  // not a brighter one (the 3D GridHelper is anti-aliased and lit, but
  // perceptually the lines sit "into" the surface). On a flat HTML page
  // we mimic that by drawing the lines in black at low alpha — same
  // perceived weight, no shimmery white halo.
  grid:        'rgba(0, 0, 0, 0.45)',
  gridStrong:  'rgba(0, 0, 0, 0.45)',
  card:   'rgba(255, 255, 255, 0.04)',     // matches .glass-dark
  border: 'rgba(255, 255, 255, 0.10)',     // matches .glass-dark border
  borderSoft: 'rgba(255, 255, 255, 0.06)',
  inset:  'rgba(0, 0, 0, 0.18)',
  panel:  'rgba(255, 255, 255, 0.025)',
};

const LIGHT = {
  page:   '#f4f6f9',                          // dot-field bg
  // #c9d1d9 against #f4f6f9 ≈ -43 black → ~17% black at 1px would be
  // garish, so we taper to ~5% to match perceptual weight of the dark
  // mode grid (felt, not seen).
  grid:        'rgba(0, 0, 0, 0.025)',
  gridStrong:  'rgba(0, 0, 0, 0.05)',
  card:   'rgba(255, 255, 255, 0.65)',
  border: 'rgba(255, 255, 255, 0.4)',      // matches .glass-light
  borderSoft: 'rgba(0, 0, 0, 0.06)',
  inset:  'rgba(0, 0, 0, 0.03)',
  panel:  'rgba(255, 255, 255, 0.45)',
};

export function tokens(isDark: boolean) {
  return isDark ? DARK : LIGHT;
}

/** Page-level surface — matches the intelligence dot-field canvas:
 *  base `#0d1117`, single uniform grid at the same cadence and tone as
 *  the 3D `GridHelper` (no major/minor split — the dot-field doesn't
 *  draw one either). The 18px cell measures off the screenshot so the
 *  workspace and the canvas read as the same plane. */
export function pageBackground(isDark: boolean): React.CSSProperties {
  const t = tokens(isDark);
  return {
    backgroundColor: t.page,
    backgroundImage: `
      linear-gradient(${t.grid} 1px, transparent 1px),
      linear-gradient(90deg, ${t.grid} 1px, transparent 1px)
    `,
    backgroundSize: '10px 10px, 10px 10px',
    backgroundPosition: '-1px -1px, -1px -1px',
  };
}

/** Card surface — same tokens as `.glass-dark/.glass-light` but with a
 *  smaller 12px radius. Use for data-dense panels where the 24px hero
 *  radius would steal too much real estate. */
export function cardStyle(
  isDark: boolean,
  opts?: { strong?: boolean; radius?: number },
): React.CSSProperties {
  const t = tokens(isDark);
  return {
    backgroundColor: t.card,
    border: `1px solid ${opts?.strong ? t.border : t.borderSoft}`,
    borderRadius: opts?.radius ?? 12,
    backdropFilter: 'blur(22px) saturate(160%)',
    WebkitBackdropFilter: 'blur(22px) saturate(160%)',
  };
}

/** Inset surface — sunken area inside a card. */
export function insetStyle(isDark: boolean): React.CSSProperties {
  const t = tokens(isDark);
  return {
    backgroundColor: t.inset,
    border: `1px solid ${t.borderSoft}`,
    borderRadius: 6,
  };
}

/** Sticky group header — same hue as the page but slightly opaque so it
 *  stays legible when the grid scrolls underneath. */
export function headerStyle(isDark: boolean): React.CSSProperties {
  return {
    backgroundColor: isDark ? 'rgba(12, 18, 27, 0.85)' : 'rgba(238, 242, 248, 0.85)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    borderBottom: `1px solid ${tokens(isDark).borderSoft}`,
  };
}

export function borderColor(isDark: boolean): string {
  return tokens(isDark).borderSoft;
}
