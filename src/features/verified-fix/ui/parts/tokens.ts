import { useMemo } from 'react';
import { useTheme } from '@shared/theme';

// Verified-fix surface tokens. Mirrors the admission/v2 token shape so
// the two control-room screens read as siblings. Hard-pins to dark in
// the same spirit but supports light because /fixes is reachable from
// both intelligence and review surfaces.

export type VFxTheme = ReturnType<typeof vfxTokens>;

export function vfxTokens(isDark: boolean) {
  if (isDark) {
    return {
      isDark: true,
      page:        '#0d1117',
      sidebar:     'rgba(0, 0, 0, 0.40)',
      sidebarBlur: 'blur(24px) saturate(160%)',
      cardBacking: 'rgba(13, 17, 23, 0.78)',
      inset:       'rgba(0, 0, 0, 0.30)',
      hoverSubtle: 'rgba(255, 255, 255, 0.025)',
      hoverActive: 'rgba(255, 255, 255, 0.05)',
      border:      'rgba(255, 255, 255, 0.10)',
      borderSoft:  'rgba(255, 255, 255, 0.06)',
      borderHair:  'rgba(255, 255, 255, 0.05)',
      textHi:      'rgba(255, 255, 255, 0.95)',
      textBody:    'rgba(255, 255, 255, 0.85)',
      textMuted:   'rgba(255, 255, 255, 0.55)',
      textSubtle:  'rgba(255, 255, 255, 0.40)',
      textFaint:   'rgba(255, 255, 255, 0.25)',
      ok:          '#5fa86c',
      okSoft:      'rgba(95,168,108,0.15)',
      warn:        '#d4a04f',
      warnSoft:    'rgba(212,160,79,0.15)',
      bad:         '#d96a6a',
      badSoft:     'rgba(217,106,106,0.15)',
      info:        '#7aa7d4',
      infoSoft:    'rgba(122,167,212,0.15)',
      accent:      '#7aa7d4',
      accentSoft:  '#7aa7d418',
      aurora1:     'rgba(122,167,212,0.05)',
      aurora2:     'rgba(95,168,108,0.04)',
      aurora3:     'rgba(212,160,79,0.03)',
      scan:        'rgba(122,167,212,0.45)',
      badgeBg:     'rgba(255,255,255,0.06)',
      gridDot:     'rgba(255,255,255,0.04)',
    };
  }
  return {
    isDark: false,
    page:        '#f7f8fa',
    sidebar:     '#ffffff',
    sidebarBlur: 'none',
    cardBacking: '#ffffff',
    inset:       'rgba(0, 0, 0, 0.04)',
    hoverSubtle: 'rgba(0, 0, 0, 0.03)',
    hoverActive: 'rgba(0, 0, 0, 0.06)',
    border:      'rgba(0, 0, 0, 0.08)',
    borderSoft:  'rgba(0, 0, 0, 0.06)',
    borderHair:  'rgba(0, 0, 0, 0.04)',
    textHi:      'rgba(0, 0, 0, 0.95)',
    textBody:    'rgba(0, 0, 0, 0.85)',
    textMuted:   'rgba(0, 0, 0, 0.55)',
    textSubtle:  'rgba(0, 0, 0, 0.45)',
    textFaint:   'rgba(0, 0, 0, 0.30)',
    ok:          '#1a7f37',
    okSoft:      'rgba(26,127,55,0.12)',
    warn:        '#9a6b00',
    warnSoft:    'rgba(154,107,0,0.12)',
    bad:         '#a3262c',
    badSoft:     'rgba(163,38,44,0.12)',
    info:        '#1f5b9c',
    infoSoft:    'rgba(31,91,156,0.10)',
    accent:      '#1f5b9c',
    accentSoft:  '#1f5b9c18',
    aurora1:     'rgba(31,91,156,0.06)',
    aurora2:     'rgba(26,127,55,0.05)',
    aurora3:     'rgba(154,107,0,0.04)',
    scan:        'rgba(31,91,156,0.35)',
    badgeBg:     'rgba(0,0,0,0.06)',
    gridDot:     'rgba(0,0,0,0.04)',
  };
}

export function useVfx(): VFxTheme {
  const { isDark } = useTheme();
  return useMemo(() => vfxTokens(isDark), [isDark]);
}

import type { ObligationStatus, DeliveryTier } from '../../model/types';

export function statusColor(t: VFxTheme, s: ObligationStatus): { fg: string; bg: string; label: string } {
  switch (s) {
    case 'pass':    return { fg: t.ok,   bg: t.okSoft,   label: 'pass' };
    case 'fail':    return { fg: t.bad,  bg: t.badSoft,  label: 'fail' };
    case 'partial': return { fg: t.warn, bg: t.warnSoft, label: 'partial' };
    case 'unknown': return { fg: t.info, bg: t.infoSoft, label: 'unknown' };
    case 'pending': return { fg: t.textMuted, bg: t.badgeBg, label: 'pending' };
  }
}

export function tierLabel(tier: DeliveryTier): string {
  switch (tier) {
    case 'safe-mechanical': return 'safe mechanical';
    case 'guarded':         return 'guarded';
    case 'human-required':  return 'human required';
  }
}
export function tierColor(t: VFxTheme, tier: DeliveryTier): { fg: string; bg: string } {
  switch (tier) {
    case 'safe-mechanical': return { fg: t.ok,   bg: t.okSoft };
    case 'guarded':         return { fg: t.info, bg: t.infoSoft };
    case 'human-required':  return { fg: t.warn, bg: t.warnSoft };
  }
}
