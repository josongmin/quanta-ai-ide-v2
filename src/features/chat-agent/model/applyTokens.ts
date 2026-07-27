import { type SemanticTokens, type Theme } from '@shared/tokens';
import type { GlobalTokenSections, Tokens } from './tokens-types';

const SEMANTIC_TO_CSS_VAR: Record<keyof SemanticTokens, string> = {
  bgCanvas: '--bg-canvas',
  bgSurface: '--bg-surface',
  bgSurfaceMuted: '--bg-surface-muted',
  bgOverlay: '--bg-overlay',
  bgElevated: '--bg-elevated',
  bgPanelStrong: '--bg-panel-strong',
  bgHover: '--bg-hover',
  bgActive: '--bg-active',
  bgActiveStrong: '--bg-active-strong',
  bgSelected: '--bg-selected',
  bgScrim: '--bg-scrim',
  bgStage: '--bg-stage',
  bgStageUniverse: '--bg-stage-universe',
  fgStrong: '--fg-strong',
  fgDefault: '--fg-default',
  fgMuted: '--fg-muted',
  fgSubtle: '--fg-subtle',
  fgOnAccent: '--fg-on-accent',
  fgOnActiveStrong: '--fg-on-active-strong',
  fgLink: '--fg-link',
  fgAccent: '--fg-accent',
  borderDefault: '--border-default',
  borderMuted: '--border-muted',
  borderStrong: '--border-strong',
  borderFocus: '--border-focus',
  ringActive: '--ring-active',
  shadowSm: '--shadow-sm',
  shadowMd: '--shadow-md',
  shadowLg: '--shadow-lg',
  intentSuccessFg: '--intent-success-fg',
  intentSuccessBg: '--intent-success-bg',
  intentSuccessVivid: '--intent-success-vivid',
  intentWarnFg: '--intent-warn-fg',
  intentWarnBg: '--intent-warn-bg',
  intentWarnVivid: '--intent-warn-vivid',
  intentDangerFg: '--intent-danger-fg',
  intentDangerBg: '--intent-danger-bg',
  intentDangerVivid: '--intent-danger-vivid',
  intentInfoFg: '--intent-info-fg',
  intentInfoBg: '--intent-info-bg',
  intentNeutralFg: '--intent-neutral-fg',
  intentNeutralBg: '--intent-neutral-bg',
  identityStable: '--identity-stable',
  identityModified: '--identity-modified',
  identityVulnerable: '--identity-vulnerable',
  identityOutOfScope: '--identity-out-of-scope',
  intensityWarm: '--intensity-warm',
  intensityCool: '--intensity-cool',
  intensityNeutral: '--intensity-neutral',
};

export function applySemanticTheme(theme: Theme, tokens: SemanticTokens) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(tokens) as [keyof SemanticTokens, string][]) {
    root.style.setProperty(SEMANTIC_TO_CSS_VAR[key], value);
  }
  root.dataset['theme'] = theme;
  root.style.background = tokens.bgCanvas;
  root.style.backgroundColor = tokens.bgCanvas;
  root.style.colorScheme = theme;

  if (document.body) {
    document.body.style.background = tokens.bgCanvas;
    document.body.style.backgroundColor = tokens.bgCanvas;
    document.body.style.colorScheme = theme;
  }
  const appRoot = document.getElementById('root');
  if (appRoot) {
    appRoot.style.background = tokens.bgCanvas;
    appRoot.style.backgroundColor = tokens.bgCanvas;
  }
}

// Emit the glass tint triplets for both themes whenever tokens change.
// `--glass-tint-dark` / `--glass-tint-light` feed the chrome (FilterBar,
// InspectPanel, SearchBar, all GlassCard surfaces) so applying a palette
// preset (Tokyo Night, Dracula, …) propagates the panel hue — instead of
// the panels being hardcoded white. Dark pulls from a lighter surface so
// the glass reads as a tinted highlight; light uses bgSurface directly.
export function applyGlassTints(allSemantic: { dark: SemanticTokens; light: SemanticTokens }) {
  const root = document.documentElement;
  // Use the SOLID surface, not bgElevated: in this token set bgElevated
  // is a white-alpha overlay (`rgba(255,255,255,0.06)`), so deriving the
  // tint from it always yields white — the panels would never follow the
  // palette. NOTE: every dark theme's bgSurface is a near-identical
  // near-black (#21252b / #16161e / #161b22 …), so tinting from it is
  // visually indistinguishable between presets. The colour that actually
  // *characterises* a theme is the accent (Tokyo=purple, Dracula=pink,
  // Nord=blue), so dark pulls its tint from fgAccent — that makes the
  // chrome visibly track the palette. Light stays on bgSurface (light
  // surfaces vary and an accent at alpha-1 would be far too loud).
  // Both themes tint from the accent — it's the only token that
  // visibly characterises a palette (every theme's bgSurface is a
  // near-identical near-black / near-white). Light blends it into white
  // via color-mix in CSS so the panel stays opaque + readable.
  // Tint is pinned to white (memory rule): panels now take their fill
  // straight from --bg-overlay (the GNB chrome token) so they read as
  // one bright/dark layer WITH the header and follow the theme through
  // that token. --glass-tint-* only feeds the subtle GlassCard border;
  // keep it neutral so borders never pick up an accent hue.
  void allSemantic;
  root.style.removeProperty('--glass-tint-dark');
  root.style.removeProperty('--glass-tint-light');
}

export function applyGlobalTokens(
  tokens: GlobalTokenSections,
  semanticTokens: Tokens['semantic'],
  activeTheme: Theme,
) {
  const root = document.documentElement;
  root.style.setProperty('--glass-blur', tokens.glass.blur);
  root.style.setProperty('--glass-alpha-dark', String(tokens.glass.fillAlphaDark));
  root.style.setProperty('--glass-alpha-light', String(tokens.glass.fillAlphaLight));
  root.style.setProperty('--glass-fill-alpha-dark', String(tokens.glass.fillAlphaDark));
  root.style.setProperty('--glass-fill-alpha-light', String(tokens.glass.fillAlphaLight));
  root.style.setProperty('--glass-border-dark', String(tokens.glass.borderDark));
  root.style.setProperty('--glass-border-light', String(tokens.glass.borderLight));
  root.style.setProperty('--glass-border-width', `${tokens.glass.borderWidth}px`);
  root.style.setProperty('--glass-shadow', tokens.glass.shadow);
  root.style.setProperty('--radius', tokens.glass.radius);

  root.style.setProperty('--card-padding', tokens.card.padding);
  root.style.setProperty('--card-padding-compact', tokens.card.paddingCompact);
  root.style.setProperty('--card-radius', tokens.card.radius);
  root.style.setProperty('--card-radius-inner', tokens.card.radiusInner);
  root.style.setProperty('--card-gap', tokens.card.gap);

  root.style.setProperty('--chip-padding', tokens.chip.padding);
  root.style.setProperty('--chip-padding-compact', tokens.chip.paddingCompact);
  root.style.setProperty('--chip-radius', tokens.chip.radius);
  root.style.setProperty('--chip-radius-pill', tokens.chip.radiusPill);

  root.style.setProperty('--pill-padding', `${tokens.pill.paddingY} ${tokens.pill.paddingX}`);
  root.style.setProperty('--pill-padding-compact', `${tokens.pill.paddingCompactY} ${tokens.pill.paddingCompactX}`);
  root.style.setProperty('--pill-radius', tokens.pill.radius);
  root.style.setProperty('--pill-gap', tokens.pill.gap);

  root.style.setProperty('--panel-width', tokens.panel.width);
  root.style.setProperty('--panel-inset', tokens.panel.inset);
  root.style.setProperty('--panel-max-height', tokens.panel.maxHeight);

  root.style.setProperty('--header-height', tokens.header.height);
  root.style.setProperty('--header-padding-x', tokens.header.paddingX);

  root.style.setProperty('--tab-indicator-h', tokens.tab.indicatorHeight);
  root.style.setProperty('--tab-padding-x', tokens.tab.paddingX);
  root.style.setProperty('--tab-padding-y', tokens.tab.paddingY);

  root.style.setProperty('--dropdown-width', tokens.dropdown.width);
  root.style.setProperty('--dropdown-offset', tokens.dropdown.offset);
  root.style.setProperty('--dropdown-radius', tokens.dropdown.radius);
  root.style.setProperty('--dropdown-padding', tokens.dropdown.padding);

  root.style.setProperty('--tooltip-padding-x', tokens.tooltip.paddingX);
  root.style.setProperty('--tooltip-padding-y', tokens.tooltip.paddingY);
  root.style.setProperty('--tooltip-radius', tokens.tooltip.radius);
  root.style.setProperty('--tooltip-font-size', tokens.tooltip.fontSize);

  root.style.setProperty('--focus-ring', tokens.focus.ring);
  root.style.setProperty('--focus-outline', tokens.focus.outline);

  root.style.setProperty('--accent', semanticTokens[activeTheme].fgAccent);
  root.style.setProperty('--bg-dark', semanticTokens.dark.bgSurface);
  root.style.setProperty('--bg-light', semanticTokens.light.bgSurface);
}
