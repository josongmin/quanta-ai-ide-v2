// ── Tier 2: Semantic tokens ──
//
// Maps primitives to roles. Feature code should consume these (or the
// CSS variables emitted by `applyTokens`), not the raw primitive table.
// Light + dark are kept side-by-side so `applyTokens(theme)` can swap them.

import { colors } from './primitives';

type Theme = 'dark' | 'light';

type SemanticTokens = {
  // Surfaces
  bgCanvas: string;
  bgSurface: string;
  bgSurfaceMuted: string;
  bgOverlay: string;
  bgElevated: string;       // popover / dropdown / menu surface
  bgHover: string;          // hover state overlay
  bgActive: string;         // active / pressed state overlay
  bgActiveStrong: string;   // pressed/selected pill in toggle groups; asymmetric (heavier on light)
  bgSelected: string;       // selected row / item
  bgScrim: string;          // modal backdrop
  bgStage: string;          // intelligence-route page canvas (full-bleed stage bg)
  bgStageUniverse: string;  // universe-mode stage bg (cyanotype Prussian blue in light)

  // Foreground
  fgStrong: string;         // headings / emphasized
  fgDefault: string;
  fgMuted: string;
  fgSubtle: string;
  fgOnAccent: string;
  fgOnActiveStrong: string; // text colour atop bgActiveStrong (white-on-dark / black-on-light)
  fgLink: string;           // hyperlink / link affordance
  fgAccent: string;         // primary brand accent

  // Borders
  borderDefault: string;
  borderMuted: string;
  borderStrong: string;
  borderFocus: string;      // focus-ring color
  ringActive: string;       // 1px ring on active chip / pressed control

  // Shadows (CSS strings; theme-aware)
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;

  // Intent (status / feedback)
  intentSuccessFg: string;
  intentSuccessBg: string;
  intentSuccessVivid: string;   // brighter accent for emphasis
  intentWarnFg: string;
  intentWarnBg: string;
  intentWarnVivid: string;
  intentDangerFg: string;
  intentDangerBg: string;
  intentDangerVivid: string;    // brighter accent for emphasis
  intentInfoFg: string;
  intentInfoBg: string;
  intentNeutralFg: string;
  intentNeutralBg: string;

  // Identity (Spec §11 / Healey 4-hue palette)
  identityStable: string;
  identityModified: string;
  identityVulnerable: string;
  identityOutOfScope: string;

  // Heat / intensity ramps (single warm + single cool)
  intensityWarm: string;     // hotspot / blast / risk
  intensityCool: string;     // stale / unimportant
  intensityNeutral: string;
};

export const dark: SemanticTokens = {
  bgCanvas: '#0a0d12',
  bgSurface: '#0d1117',
  bgSurfaceMuted: 'rgba(255,255,255,0.03)',
  bgOverlay: 'rgba(13, 17, 23, 0.82)',
  bgElevated: 'rgba(255,255,255,0.06)',
  bgHover: 'rgba(255,255,255,0.04)',
  bgActive: 'rgba(255,255,255,0.08)',
  bgActiveStrong: 'rgba(255,255,255,0.15)',
  bgSelected: 'rgba(255,255,255,0.12)',
  bgScrim: 'rgba(0,0,0,0.55)',
  bgStage: '#0d1117',
  bgStageUniverse: '#020202',

  fgStrong: 'rgba(255,255,255,0.94)',
  fgDefault: 'rgba(255,255,255,0.82)',
  fgMuted: 'rgba(255,255,255,0.52)',
  fgSubtle: 'rgba(255,255,255,0.32)',
  fgOnAccent: colors.grey[1000],
  fgOnActiveStrong: '#ffffff',
  // Link / accent decoupled from intent green. Calm slate-blue avoids the
  // common pitfall of treating brand-green as a generic "interactive" hue,
  // which causes success / link / button to all collide visually.
  fgLink: '#7aa7d4',
  fgAccent: '#8aa3b8',

  borderDefault: 'rgba(255,255,255,0.08)',
  borderMuted: 'rgba(255,255,255,0.04)',
  borderStrong: 'rgba(255,255,255,0.14)',
  // Focus ring sits between link-blue and white — visible without screaming.
  borderFocus: 'rgba(122,167,212,0.55)',
  ringActive: 'rgba(255,255,255,0.40)',

  shadowSm: '0 1px 2px rgba(0,0,0,0.4)',
  shadowMd: '0 4px 12px rgba(0,0,0,0.45)',
  shadowLg: '0 16px 32px rgba(0,0,0,0.55)',

  intentSuccessFg: colors.green[400],
  intentSuccessBg: 'rgba(95, 168, 108, 0.10)',
  intentSuccessVivid: colors.green[500],
  intentWarnFg: colors.amber[300],
  intentWarnBg: 'rgba(168, 137, 58, 0.10)',
  intentWarnVivid: colors.amber[400],
  intentDangerFg: colors.red[300],
  intentDangerBg: 'rgba(194, 90, 85, 0.10)',
  intentDangerVivid: colors.red[400],
  intentInfoFg: colors.blue[300],
  intentInfoBg: 'rgba(90, 143, 206, 0.10)',
  intentNeutralFg: colors.grey[400],
  intentNeutralBg: 'rgba(255,255,255,0.05)',

  identityStable: colors.grey[500],
  identityModified: colors.green[500],
  identityVulnerable: colors.red[400],
  identityOutOfScope: colors.purple[400],

  intensityWarm: colors.red[300],
  intensityCool: colors.blue[400],
  intensityNeutral: colors.grey[500],
};

export const light: SemanticTokens = {
  bgCanvas: '#f4f6f9',
  bgSurface: '#ffffff',
  bgSurfaceMuted: 'rgba(0,0,0,0.03)',
  bgOverlay: 'rgba(255, 255, 255, 0.85)',
  bgElevated: '#ffffff',
  bgHover: 'rgba(0,0,0,0.04)',
  bgActive: 'rgba(0,0,0,0.08)',
  // Asymmetric: light theme uses /10 (heavier than dark's /15 visually) so
  // the pressed state reads at the same perceived contrast on each canvas.
  bgActiveStrong: 'rgba(0,0,0,0.10)',
  bgSelected: 'rgba(0,0,0,0.12)',
  bgScrim: 'rgba(0,0,0,0.4)',
  bgStage: '#f4f6f9',
  bgStageUniverse: '#0a2545',

  fgStrong: 'rgba(0,0,0,0.92)',
  fgDefault: 'rgba(0,0,0,0.80)',
  fgMuted: 'rgba(0,0,0,0.55)',
  fgSubtle: 'rgba(0,0,0,0.40)',
  fgOnAccent: colors.grey[0],
  fgOnActiveStrong: '#000000',
  // Slate-blue accent — calmer than a saturated link-blue on long sessions.
  fgLink: '#3a72b8',
  fgAccent: '#4a6075',

  borderDefault: 'rgba(0,0,0,0.10)',
  borderMuted: 'rgba(0,0,0,0.05)',
  borderStrong: 'rgba(0,0,0,0.18)',
  borderFocus: 'rgba(58,114,184,0.55)',
  ringActive: 'rgba(0,0,0,0.40)',

  shadowSm: '0 1px 2px rgba(0,0,0,0.08)',
  shadowMd: '0 4px 12px rgba(0,0,0,0.10)',
  shadowLg: '0 16px 32px rgba(0,0,0,0.12)',

  intentSuccessFg: colors.green[700],
  intentSuccessBg: 'rgba(26, 127, 55, 0.10)',
  intentSuccessVivid: '#1a7f37',
  intentWarnFg: colors.amber[600],
  intentWarnBg: 'rgba(154, 103, 0, 0.10)',
  intentWarnVivid: '#9a6700',
  intentDangerFg: colors.red[500],
  intentDangerBg: 'rgba(207, 34, 46, 0.10)',
  intentDangerVivid: '#a83a3f',
  intentInfoFg: colors.blue[600],
  intentInfoBg: 'rgba(9, 105, 218, 0.10)',
  intentNeutralFg: colors.grey[600],
  intentNeutralBg: 'rgba(0,0,0,0.05)',

  identityStable: colors.grey[500],
  identityModified: colors.green[700],
  identityVulnerable: colors.red[500],
  identityOutOfScope: colors.purple[500],

  intensityWarm: colors.red[500],
  intensityCool: colors.blue[600],
  intensityNeutral: colors.grey[400],
};

export const semantic = { dark, light } as const;
export type { SemanticTokens, Theme };
