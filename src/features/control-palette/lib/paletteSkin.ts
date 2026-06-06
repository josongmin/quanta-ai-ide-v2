// Light-mode and dark-mode have very different ideas of how a "modal
// surface" should look. The semantic tokens get us most of the way,
// but the palette has a few spots — ⌘K chips, active-row icon wells,
// hover backgrounds — that need explicit per-theme tuning to stay
// legible. Centralised here so the JSX stays clean.
export function paletteSkin(isDark: boolean) {
  return {
    backdrop:        isDark ? 'rgba(0,0,0,0.55)' : 'rgba(15,18,26,0.32)',
    panelBg:         isDark ? 'rgba(20,24,32,0.92)' : 'rgba(255,255,255,0.97)',
    panelBorder:     isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,18,26,0.10)',
    panelShadow:     isDark
      ? '0 24px 80px -12px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04) inset'
      : '0 24px 60px -16px rgba(15,18,26,0.30), 0 0 0 1px rgba(15,18,26,0.04) inset',
    headerBorder:    isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,18,26,0.08)',
    inputColor:      isDark ? 'rgba(255,255,255,0.95)' : 'rgba(15,18,26,0.95)',
    placeholder:     isDark ? 'rgba(255,255,255,0.40)' : 'rgba(15,18,26,0.42)',
    sectionLabel:    isDark ? 'rgba(255,255,255,0.40)' : 'rgba(15,18,26,0.42)',
    rowHover:        isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,18,26,0.05)',
    rowActiveBg:     isDark ? 'rgba(122,167,212,0.16)' : 'rgba(31,91,156,0.10)',
    rowActiveText:   isDark ? '#ffffff' : 'rgba(15,18,26,0.95)',
    rowText:         isDark ? 'rgba(255,255,255,0.85)' : 'rgba(15,18,26,0.82)',
    iconWellIdleBg:  'transparent',
    iconWellActiveBg: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(31,91,156,0.14)',
    iconColorIdle:   isDark ? 'rgba(255,255,255,0.55)' : 'rgba(15,18,26,0.55)',
    iconColorActive: isDark ? '#ffffff'                : '#1f5b9c',
    chipBg:          isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,18,26,0.06)',
    chipText:        isDark ? 'rgba(255,255,255,0.65)' : 'rgba(15,18,26,0.55)',
    chipBorder:      isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,18,26,0.10)',
    footerBg:        isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,18,26,0.03)',
    footerText:      isDark ? 'rgba(255,255,255,0.50)' : 'rgba(15,18,26,0.50)',
    footerBorder:    isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,18,26,0.08)',
    emptyText:       isDark ? 'rgba(255,255,255,0.45)' : 'rgba(15,18,26,0.45)',
  };
}

export type Skin = ReturnType<typeof paletteSkin>;
