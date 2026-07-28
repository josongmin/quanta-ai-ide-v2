// Emits the semantic + primitive tokens onto :root as CSS custom properties.
// Components reference them via `var(--bg-canvas)` etc., or via Tailwind
// arbitrary-value classes (`bg-[var(--bg-canvas)]`, `text-sm`).
//
// Call once per theme change from `ThemeContext` / `TokensContext`.

import {
  spacing,
  radius,
  fontSize,
  fontWeight,
  tracking,
  duration,
  easing,
  zIndex,
} from './primitives';
import { semantic, type Theme, type SemanticTokens } from './semantic';
import { glass, card, chip, panel, header, tab, dropdown, pill } from './components';
import type { GlobalTokenSections, Tokens } from './editable';

// Exported so the token↔tailwind sync test can assert every `var(--x)` the
// tailwind config references actually resolves to a token emitted here.
export const semanticToCssVar: Record<keyof typeof semantic.dark, string> = {
  // Surfaces
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

  // Foreground
  fgStrong: '--fg-strong',
  fgDefault: '--fg-default',
  fgMuted: '--fg-muted',
  fgSubtle: '--fg-subtle',
  fgOnAccent: '--fg-on-accent',
  fgOnActiveStrong: '--fg-on-active-strong',
  fgLink: '--fg-link',
  fgAccent: '--fg-accent',

  // Borders
  borderDefault: '--border-default',
  borderMuted: '--border-muted',
  borderStrong: '--border-strong',
  borderFocus: '--border-focus',
  ringActive: '--ring-active',

  // Shadows
  shadowSm: '--shadow-sm',
  shadowMd: '--shadow-md',
  shadowLg: '--shadow-lg',

  // Intent
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

  // Identity
  identityStable: '--identity-stable',
  identityModified: '--identity-modified',
  identityVulnerable: '--identity-vulnerable',
  identityOutOfScope: '--identity-out-of-scope',

  // Intensity
  intensityWarm: '--intensity-warm',
  intensityCool: '--intensity-cool',
  intensityNeutral: '--intensity-neutral',
};

// Sanitize TS scale keys (`'2xl'`, `'0.5'`) into CSS-var-safe suffixes.
// `0.5` -> `0-5`, `2xl` -> `2xl`. Dashes only, never dots.
function sanitizeKey(key: string): string {
  return key.replace(/\./g, '-');
}

let primitivesEmitted = false;

function emitPrimitivesOnce(root: HTMLElement): void {
  if (primitivesEmitted) return;
  primitivesEmitted = true;

  // Spacing scale
  for (const [k, v] of Object.entries(spacing)) {
    root.style.setProperty(`--space-${sanitizeKey(k)}`, v);
  }
  // Radius scale
  for (const [k, v] of Object.entries(radius)) {
    root.style.setProperty(`--radius-${sanitizeKey(k)}`, v);
  }
  // Font-size scale
  for (const [k, v] of Object.entries(fontSize)) {
    root.style.setProperty(`--fs-${sanitizeKey(k)}`, v);
  }
  // Font-weight scale
  for (const [k, v] of Object.entries(fontWeight)) {
    root.style.setProperty(`--fw-${sanitizeKey(k)}`, String(v));
  }
  // Tracking scale
  for (const [k, v] of Object.entries(tracking)) {
    root.style.setProperty(`--track-${sanitizeKey(k)}`, v);
  }
  // Motion — duration + easing. CSS-only consumers (raw `var(...)` lookups,
  // animations defined in index.css) need these as variables, not just as
  // Tailwind utility classes.
  for (const [k, v] of Object.entries(duration)) {
    root.style.setProperty(`--duration-${sanitizeKey(k)}`, v);
  }
  for (const [k, v] of Object.entries(easing)) {
    root.style.setProperty(`--ease-${sanitizeKey(k)}`, v);
  }
  // Z-index tiers — components reference these as `var(--z-modal)` etc.
  // Without this loop the variable resolves to empty and Tailwind's
  // `z-[var(--z-modal)]` collapses to `z-index: ;` — i.e. auto. That
  // bug surfaced as the FacetSettings modal sitting behind the chat
  // composer and the floating prompt chips. Emitting them once at
  // mount fixes the entire stacking hierarchy in one place.
  for (const [k, v] of Object.entries(zIndex)) {
    root.style.setProperty(`--z-${sanitizeKey(k)}`, v);
  }
}

export function applyTokens(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Theme-agnostic primitives — emit once per page-load.
  emitPrimitivesOnce(root);

  // Theme-specific semantics — overwrite on every call.
  const map = semantic[theme];
  for (const key of Object.keys(map) as (keyof typeof map)[]) {
    root.style.setProperty(semanticToCssVar[key], map[key]);
  }
  root.dataset['theme'] = theme;
  root.style.background = map.bgCanvas;
  root.style.backgroundColor = map.bgCanvas;
  root.style.colorScheme = theme;

  if (document.body) {
    document.body.style.background = map.bgCanvas;
    document.body.style.backgroundColor = map.bgCanvas;
    document.body.style.colorScheme = theme;
  }
  const appRoot = document.getElementById('root');
  if (appRoot) {
    appRoot.style.background = map.bgCanvas;
    appRoot.style.backgroundColor = map.bgCanvas;
  }

  // Component tokens — emitted once (theme-agnostic), but cheap to re-set.
  root.style.setProperty('--glass-blur', glass.blur);
  root.style.setProperty('--glass-fill-alpha-dark', String(glass.fillAlphaDark));
  root.style.setProperty('--glass-fill-alpha-light', String(glass.fillAlphaLight));

  root.style.setProperty('--card-padding', card.padding);
  root.style.setProperty('--card-padding-compact', card.paddingCompact);
  root.style.setProperty('--card-radius', card.radius);
  root.style.setProperty('--card-gap', card.gap);

  root.style.setProperty('--chip-padding', chip.padding);
  root.style.setProperty('--chip-radius', chip.radius);

  root.style.setProperty('--pill-padding', `${pill.paddingY} ${pill.paddingX}`);
  root.style.setProperty('--pill-padding-compact', `${pill.paddingCompactY} ${pill.paddingCompactX}`);
  root.style.setProperty('--pill-radius', pill.radius);

  root.style.setProperty('--panel-width', panel.width);
  root.style.setProperty('--panel-inset', panel.inset);

  root.style.setProperty('--header-height', header.height);
  root.style.setProperty('--header-padding-x', header.paddingX);

  root.style.setProperty('--tab-indicator-h', tab.indicatorHeight);
  root.style.setProperty('--dropdown-width', dropdown.width);
}

// ── Preset-aware emitters (was features/chat-agent/model/applyTokens) ────────
// The live token editor (TokensProvider) drives these with the user-edited token
// set. They emit the SAME :root vars as applyTokens above, reusing the ONE
// semanticToCssVar map (the editor copy used to be a byte-identical duplicate).
// Moved here so the app-wide theming primitive lives in the design-system layer,
// not inside a leaf feature.

export function applySemanticTheme(theme: Theme, tokens: SemanticTokens): void {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(tokens) as [keyof SemanticTokens, string][]) {
    root.style.setProperty(semanticToCssVar[key], value);
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

// Glass tint is pinned to the chrome token (memory rule): panels take their fill
// from --bg-overlay, so --glass-tint-* only fed a subtle border — kept neutral.
export function applyGlassTints(allSemantic: { dark: SemanticTokens; light: SemanticTokens }): void {
  const root = document.documentElement;
  void allSemantic;
  root.style.removeProperty('--glass-tint-dark');
  root.style.removeProperty('--glass-tint-light');
}

export function applyGlobalTokens(
  tokens: GlobalTokenSections,
  semanticTokens: Tokens['semantic'],
  activeTheme: Theme,
): void {
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
