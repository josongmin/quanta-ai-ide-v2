// ── Tier 3: Component tokens ──
//
// Where a component-level decision actually lives. Feature code shouldn't
// guess how big a chip is or how blurred a glass surface should be.
// Anything that's used in more than one component should live here.

import { blur, radius, shadow, spacing } from './primitives';

export const glass = {
  blur: blur.lg,
  border: 1,                          // px
  shadow: shadow.lg,
  // alpha values; concrete fills come from semantic.bgOverlay
  fillAlphaDark: 0.5,
  fillAlphaLight: 0.85,
} as const;

export const card = {
  padding: spacing[4],
  paddingCompact: spacing[3],
  radius: radius['2xl'],
  radiusInner: radius.lg,
  gap: spacing[3],
  // Interactive state surfaces — reference the new --bg-hover / --bg-active
  // tokens so light/dark stays in sync without per-mode ternaries.
  hover: {
    background: 'var(--bg-hover)',
    borderColor: 'var(--border-strong)',
  },
  active: {
    background: 'var(--bg-active)',
    borderColor: 'var(--border-strong)',
  },
} as const;

export const pill = {
  paddingX: spacing[2],
  paddingY: spacing[0.5],
  paddingCompactX: spacing[1.5],
  paddingCompactY: spacing[0.5],
  radius: radius.pill,
  gap: spacing[1],
} as const;

export const chip = {
  padding: `${spacing[1]} ${spacing[2]}`,
  paddingCompact: `${spacing[0.5]} ${spacing[1.5]}`,
  radius: radius.sm,
  radiusPill: radius.pill,
} as const;

export const panel = {
  width: '296px',                     // left filter bar
  inset: spacing[4],
  maxHeight: 'calc(100vh - 96px)',
} as const;

export const header = {
  height: '48px',
  paddingX: spacing[4],
} as const;

export const tab = {
  indicatorHeight: '2px',
  paddingX: spacing[4],
  paddingY: spacing[2],
} as const;

export const focus = {
  // Reference the themed border-focus token instead of a brand-green hex,
  // so the ring follows the theme and stays a calm slate-blue rather than
  // an alarming green halo on every interactive element.
  ring: '0 0 0 2px var(--border-focus)',
  outline: '2px solid currentColor',
} as const;

export const dropdown = {
  width: '280px',
  offset: spacing[2],
  radius: radius.xl,
  padding: spacing[2],
} as const;

export const tooltip = {
  paddingX: spacing[2],
  paddingY: spacing[1],
  radius: radius.sm,
  fontSize: '11px',
} as const;
