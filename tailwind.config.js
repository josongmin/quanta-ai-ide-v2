/** @type {import('tailwindcss').Config} */
//
// Tailwind theme extension. Two layers:
//
//   1. Semantic colors (var-backed) — flip with the active theme via the
//      CSS custom properties emitted by `applyTokens()`.
//   2. Static primitives (fontSize, spacing, radius, motion, shadow) —
//      mirrors of `src/shared/tokens/primitives.ts`. Tailwind config can't
//      import a `.ts` module directly, so the values are duplicated here.
//      Keep this file in sync with primitives.ts (review whenever that file
//      changes — there is no automated check).
//
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Map semantic tokens to Tailwind colour utilities. Variables are
      // emitted by `applyTokens` (src/shared/tokens/applyTokens.ts) so
      // these classes auto-flip with the active theme.
      colors: {
        canvas: 'var(--bg-canvas)',
        surface: 'var(--bg-surface)',
        'surface-muted': 'var(--bg-surface-muted)',
        overlay: 'var(--bg-overlay)',
        fg: {
          DEFAULT: 'var(--fg-default)',
          muted: 'var(--fg-muted)',
          subtle: 'var(--fg-subtle)',
          'on-accent': 'var(--fg-on-accent)',
        },
        border: {
          DEFAULT: 'var(--border-default)',
          muted: 'var(--border-muted)',
          strong: 'var(--border-strong)',
        },
        intent: {
          'success-fg': 'var(--intent-success-fg)',
          'success-bg': 'var(--intent-success-bg)',
          'warn-fg': 'var(--intent-warn-fg)',
          'warn-bg': 'var(--intent-warn-bg)',
          'danger-fg': 'var(--intent-danger-fg)',
          'danger-bg': 'var(--intent-danger-bg)',
          'info-fg': 'var(--intent-info-fg)',
          'info-bg': 'var(--intent-info-bg)',
          'neutral-fg': 'var(--intent-neutral-fg)',
          'neutral-bg': 'var(--intent-neutral-bg)',
        },
        identity: {
          stable: 'var(--identity-stable)',
          modified: 'var(--identity-modified)',
          vulnerable: 'var(--identity-vulnerable)',
          'out-of-scope': 'var(--identity-out-of-scope)',
        },
      },

      // Mirror of `primitives.fontSize`. Adds `text-2xs`, `text-md`, etc.
      fontSize: {
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
      },

      // Mirror of `primitives.tracking.eyebrow`. Added so the uppercase micro-
      // label ("eyebrow") has a first-class `tracking-eyebrow` class instead of
      // ~740 inconsistent `tracking-[0.14em]/[0.18em]/[var(--track-eyebrow)]`
      // arbitrary values. Additive only (Tailwind's tight/wide/wider/widest
      // defaults are preserved) so existing named tracking classes are unchanged.
      letterSpacing: {
        eyebrow: '0.18em',
      },

      // Mirror of `primitives.spacing`. Tailwind already ships an integer
      // scale; we override with our explicit pixel values so the visual
      // rhythm stays in sync with our tokens.
      spacing: {
        0: '0px',
        0.5: '2px',
        1: '4px',
        1.5: '6px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '20px',
        6: '24px',
        8: '32px',
        10: '40px',
        12: '48px',
      },

      // Mirror of `primitives.radius`.
      borderRadius: {
        none: '0',
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px',
        pill: '9999px',
      },

      // Mirror of `primitives.duration`.
      transitionDuration: {
        instant: '0ms',
        fast: '120ms',
        base: '180ms',
        slow: '260ms',
        slower: '380ms',
      },

      // Mirror of `primitives.easing`.
      transitionTimingFunction: {
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
        'in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
        spring: 'cubic-bezier(0.5, 1.4, 0.4, 1)',
      },

      // Mirror of `primitives.shadow`.
      boxShadow: {
        none: 'none',
        xs: '0 1px 2px rgba(0,0,0,0.20)',
        sm: '0 2px 6px rgba(0,0,0,0.25)',
        md: '0 4px 14px rgba(0,0,0,0.30)',
        lg: '0 8px 24px rgba(0,0,0,0.40)',
        xl: '0 12px 40px rgba(0,0,0,0.50)',
        '2xl': '0 20px 60px rgba(0,0,0,0.55)',
        focus: '0 0 0 2px var(--border-focus)',
      },
    },
  },
  plugins: [],
};
