import { toneToColors } from '@shared/lib';

// ─── token helpers ─────────────────────────────────────────────────────
// VerifiedFixCard is routed entirely through the global semantic CSS vars so
// it themes correctly in both light and dark (it intentionally does NOT use
// the local vfxTokens SSOT — it has no useTheme/useVfx). Forked hex hues
// map to intent / accent tokens; alpha tints use color-mix so a CSS var
// can still be lightened to a fill / border.
//
// The three severity tones resolve through the shared `toneToColors` SSOT
// (its `.fg` field is the same `--intent-*-fg` var this card already used,
// so the rendered color is unchanged). ACCENT/INFO/NEUTRAL stay as local
// tokens: they are not severity tones (or, for info, map to a different
// semantic var than `toneToColors('info')` would), so migrating them would
// alter the rendered hue.
export const ACCENT = 'var(--fg-accent)';            // purple #c2b3e0 / 149,131,184
export const SUCCESS = toneToColors('ok').fg;        // var(--intent-success-fg)
export const DANGER = toneToColors('critical').fg;   // var(--intent-danger-fg)
export const WARN = toneToColors('warn').fg;         // var(--intent-warn-fg)
export const INFO = 'var(--intent-info-fg)';         // blue #7aa7d4
export const NEUTRAL = 'var(--fg-muted)';            // grey #8b949e
export const mix = (c: string, pct: number) =>
  `color-mix(in srgb, ${c} ${String(pct)}%, transparent)`;
