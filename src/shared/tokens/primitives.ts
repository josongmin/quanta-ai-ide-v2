// ── Tier 1: Reference primitives ──
//
// Raw values only. Never reference these directly from feature code; go
// through the semantic tier in `./semantic.ts`. The split is the convention
// from Material Design / Primer / Salesforce Lightning: changing a brand
// color stays a one-line change here.

export const colors = {
  // Greys (GitHub Primer-aligned)
  grey: {
    0: '#ffffff',
    50: '#f6f8fa',
    100: '#eaeef2',
    200: '#d0d7de',
    300: '#afb8c1',
    400: '#8c959f',
    500: '#6e7781',
    600: '#57606a',
    700: '#424a53',
    800: '#32383f',
    850: '#21262d',
    900: '#161b22',
    950: '#0d1117',
    1000: '#020207',
  },
  // Greens — toned down (chroma ≈0.13 instead of GitHub's 0.20).
  // The bright #39d353 reads as eye-searing on large surfaces; this ramp
  // keeps the green identity but pulls saturation toward muted forest-green
  // so it can sit next to neutrals without dominating the field of view.
  green: {
    100: '#dcefe1',
    300: '#7fb98a',
    400: '#5fa86c',
    500: '#4f9a5c',
    600: '#3d8049',
    700: '#1f6b35',
  },
  // Reds — desaturated; alarm reds are still alarming at lower chroma.
  red: {
    100: '#f6dcd9',
    300: '#d98a85',
    400: '#c25a55',
    500: '#a83a3f',
    600: '#8a1f2a',
  },
  // Ambers — pulled toward warm-ochre rather than highlighter-yellow.
  amber: {
    100: '#f5edd0',
    300: '#c9a955',
    400: '#a8893a',
    500: '#8e7320',
    600: '#735a18',
  },
  // Blues — calmer, less neon. Used sparingly for info / links.
  blue: {
    100: '#dde8f4',
    300: '#86adda',
    400: '#5a8fce',
    500: '#3a72b8',
    600: '#1f5b9c',
  },
  // Purples (out-of-scope identity) — used rarely; kept low-chroma.
  purple: {
    300: '#b8a3d4',
    400: '#9583b8',
    500: '#6f5d99',
  },
} as const;

export const spacing = {
  '0': '0px',
  '0.5': '2px',
  '1': '4px',
  '1.5': '6px',
  '2': '8px',
  '3': '12px',
  '4': '16px',
  '5': '20px',
  '6': '24px',
  '8': '32px',
  '10': '40px',
  '12': '48px',
} as const;

export const radius = {
  none: '0',
  xs: '2px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  '3xl': '24px',
  pill: '9999px',
} as const;

export const fontSize = {
  '2xs': '9px',
  xs: '10px',
  sm: '11px',
  base: '12px',
  md: '13px',
  lg: '14px',
  xl: '16px',
  '2xl': '18px',
  '3xl': '22px',
  '4xl': '28px',
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  black: 900,
} as const;

export const tracking = {
  tight: '-0.01em',
  normal: '0',
  wide: '0.05em',
  wider: '0.1em',
  widest: '0.25em',
  eyebrow: '0.18em',
} as const;

export const shadow = {
  none: 'none',
  xs: '0 1px 2px rgba(0,0,0,0.20)',
  sm: '0 2px 6px rgba(0,0,0,0.25)',
  md: '0 4px 14px rgba(0,0,0,0.30)',
  lg: '0 8px 24px rgba(0,0,0,0.40)',
  xl: '0 12px 40px rgba(0,0,0,0.50)',
  '2xl': '0 20px 60px rgba(0,0,0,0.55)',
  // Focus ring — references --border-focus so it auto-themes.
  focus: '0 0 0 2px var(--border-focus)',
} as const;

export const duration = {
  instant: '0ms',
  fast: '120ms',
  base: '180ms',
  slow: '260ms',
  slower: '380ms',
} as const;

export const easing = {
  out: 'cubic-bezier(0.22, 1, 0.36, 1)',
  inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  spring: 'cubic-bezier(0.5, 1.4, 0.4, 1)',
} as const;

export const blur = {
  none: '0',
  sm: '6px',
  md: '12px',
  lg: '22px',
  xl: '32px',
} as const;

// Z-index tiers — semantic, not magic numbers. Anything floating above the
// page should pick the lowest tier that puts it above what it needs to.
// Gap of 10 between tiers leaves room for in-tier nudges.
export const zIndex = {
  base:        '0',
  raised:      '1',     // local stacking context (e.g. selected row marker)
  sticky:      '50',    // sticky table headers, footers
  chrome:      '60',    // app shell header / GNB
  dropdown:    '100',   // popover, menu, segmented thumb
  tooltip:     '110',   // tooltips above dropdowns
  drawer:      '180',   // side drawers
  modal:       '200',   // modal backdrop + dialog
  overlay:     '300',   // fullscreen overlays (admission scrims, AI activity)
  toast:       '400',   // transient toasts/banners above overlays
  devtools:    '900',   // last-mile devtools layer
} as const;
