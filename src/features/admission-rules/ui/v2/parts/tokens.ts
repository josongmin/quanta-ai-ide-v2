import { useMemo } from 'react';
import { useTheme } from '@shared/theme';
import { SEVERITY_COLOR } from '../../sourceStyle';

// Re-export so every part can pull severity colours from one place.
export { SEVERITY_COLOR };

// ─── Theme tokens ─────────────────────────────────────────────────
// Single source of truth so light/dark theming threads through every
// component below. Calling `useV2()` in the body of a component gives
// you the right values for the active theme. Avoid hard-coding hexes
// outside this table; severity hues come from `SEVERITY_COLOR` and
// stay tone-locked across themes (red is red in either mode).

export type V2Theme = ReturnType<typeof v2Tokens>;

export function v2Tokens(isDark: boolean) {
  if (isDark) {
    return {
      isDark: true,
      // Surfaces. Sidebar matches the AppShell GNB recipe
      // (`bg-black/40 backdrop-blur-xl`) so the top header and the left
      // rail read as one continuous L-shaped chrome surface — the
      // pattern Linear / Vercel / macOS Settings all use. The strong
      // blur+saturation kills any grid bleed-through.
      page:         '#0d1117',
      sidebar:      'rgba(0, 0, 0, 0.40)',
      sidebarBlur:  'blur(24px) saturate(160%)',
      cardBacking:  'rgba(13, 17, 23, 0.78)',
      inset:        'rgba(0, 0, 0, 0.30)',
      hoverSubtle:  'rgba(255, 255, 255, 0.025)',
      hoverActive:  'rgba(255, 255, 255, 0.05)',
      // Borders
      border:       'rgba(255, 255, 255, 0.10)',
      borderSoft:   'rgba(255, 255, 255, 0.06)',
      borderHair:   'rgba(255, 255, 255, 0.05)',
      // Text — match Linear/Vercel scale
      textHi:       'rgba(255, 255, 255, 0.95)',
      textBody:     'rgba(255, 255, 255, 0.85)',
      textMuted:    'rgba(255, 255, 255, 0.55)',
      textSubtle:   'rgba(255, 255, 255, 0.40)',
      textFaint:    'rgba(255, 255, 255, 0.25)',
      // Accents
      accent:       '#7aa7d4',     // info / links / neutral indicator
      accentSoft:   '#7aa7d415',
      ok:           '#5fa86c',
      // Aurora alphas
      aurora1:      'rgba(122,167,212,0.05)',
      aurora2:      'rgba(163,113,247,0.04)',
      aurora3:      'rgba(79,154,92,0.03)',
      // Scanline
      scan:         'rgba(122,167,212,0.45)',
      // Badge bg
      badgeBg:      'rgba(255,255,255,0.06)',
    };
  }
  return {
    isDark: false,
    page:         '#f4f6f9',
    sidebar:      'rgba(255, 255, 255, 0.80)',
    sidebarBlur:  'blur(24px) saturate(160%)',
    cardBacking:  'rgba(255, 255, 255, 0.82)',
    inset:        'rgba(0, 0, 0, 0.04)',
    hoverSubtle:  'rgba(0, 0, 0, 0.03)',
    hoverActive:  'rgba(0, 0, 0, 0.06)',
    border:       'rgba(0, 0, 0, 0.10)',
    borderSoft:   'rgba(0, 0, 0, 0.07)',
    borderHair:   'rgba(0, 0, 0, 0.05)',
    textHi:       'rgba(0, 0, 0, 0.95)',
    textBody:     'rgba(0, 0, 0, 0.85)',
    textMuted:    'rgba(0, 0, 0, 0.55)',
    textSubtle:   'rgba(0, 0, 0, 0.45)',
    textFaint:    'rgba(0, 0, 0, 0.30)',
    accent:       '#1f5b9c',
    accentSoft:   '#1f5b9c18',
    ok:           '#1a7f37',
    aurora1:      'rgba(31,91,156,0.06)',
    aurora2:      'rgba(130,80,223,0.05)',
    aurora3:      'rgba(26,127,55,0.04)',
    scan:         'rgba(31,91,156,0.35)',
    badgeBg:      'rgba(0,0,0,0.06)',
  };
}

export function useV2(): V2Theme {
  const { isDark } = useTheme();
  return useMemo(() => v2Tokens(isDark), [isDark]);
}
