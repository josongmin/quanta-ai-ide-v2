import {
  createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode,
} from 'react';
import { useTheme } from '@shared/theme';
import { applyTokens, components, semantic, type SemanticTokens, type Theme } from '@shared/tokens';

export type GlobalTokenSections = {
  glass: {
    radius: string;
    blur: string;
    fillAlphaDark: number;
    fillAlphaLight: number;
    borderDark: number;
    borderLight: number;
    borderWidth: number;
    shadow: string;
  };
  card: {
    padding: string;
    paddingCompact: string;
    radius: string;
    radiusInner: string;
    gap: string;
  };
  chip: {
    padding: string;
    paddingCompact: string;
    radius: string;
    radiusPill: string;
  };
  pill: {
    paddingX: string;
    paddingY: string;
    paddingCompactX: string;
    paddingCompactY: string;
    radius: string;
    gap: string;
  };
  panel: {
    width: string;
    inset: string;
    maxHeight: string;
  };
  header: {
    height: string;
    paddingX: string;
  };
  tab: {
    indicatorHeight: string;
    paddingX: string;
    paddingY: string;
  };
  dropdown: {
    width: string;
    offset: string;
    radius: string;
    padding: string;
  };
  tooltip: {
    paddingX: string;
    paddingY: string;
    radius: string;
    fontSize: string;
  };
  focus: {
    ring: string;
    outline: string;
  };
};

export type Tokens = {
  semantic: {
    dark: SemanticTokens;
    light: SemanticTokens;
  };
  global: GlobalTokenSections;
};

type Ctx = {
  tokens: Tokens;
  setSemantic: <K extends keyof SemanticTokens>(theme: Theme, key: K, value: SemanticTokens[K]) => void;
  setGlobal: <
    S extends keyof GlobalTokenSections,
    K extends keyof GlobalTokenSections[S],
  >(section: S, key: K, value: GlobalTokenSections[S][K]) => void;
  replace: (next: Tokens | ((current: Tokens) => Tokens)) => void;
  reset: () => void;
};

const TokensCtx = createContext<Ctx | null>(null);
// Bumped v2 → v3: the glass-tint / fillAlphaDark token semantics changed
// (applyGlassTints, dark alpha 0.04 → 0.5). Stale persisted v2 tokens
// would otherwise override the new defaults and freeze the chrome —
// invalidate them once so everyone picks up the new theming.
const STORAGE_KEY = 'cflens.tokens.v3';
const LEGACY_STORAGE_KEY = 'cflens.tokens.v1';

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

function createDefaults(): Tokens {
  return {
    semantic: {
      dark: { ...semantic.dark },
      light: { ...semantic.light },
    },
    global: {
      glass: {
        radius: '24px',
        blur: components.glass.blur,
        fillAlphaDark: 0.5,
        fillAlphaLight: 0.8,
        borderDark: 0.1,
        borderLight: 0.4,
        borderWidth: components.glass.border,
        shadow: components.glass.shadow,
      },
      card: {
        padding: components.card.padding,
        paddingCompact: components.card.paddingCompact,
        radius: components.card.radius,
        radiusInner: components.card.radiusInner,
        gap: components.card.gap,
      },
      chip: {
        padding: components.chip.padding,
        paddingCompact: components.chip.paddingCompact,
        radius: components.chip.radius,
        radiusPill: components.chip.radiusPill,
      },
      pill: {
        paddingX: components.pill.paddingX,
        paddingY: components.pill.paddingY,
        paddingCompactX: components.pill.paddingCompactX,
        paddingCompactY: components.pill.paddingCompactY,
        radius: components.pill.radius,
        gap: components.pill.gap,
      },
      panel: {
        width: components.panel.width,
        inset: components.panel.inset,
        maxHeight: components.panel.maxHeight,
      },
      header: {
        height: components.header.height,
        paddingX: components.header.paddingX,
      },
      tab: {
        indicatorHeight: components.tab.indicatorHeight,
        paddingX: components.tab.paddingX,
        paddingY: components.tab.paddingY,
      },
      dropdown: {
        width: components.dropdown.width,
        offset: components.dropdown.offset,
        radius: components.dropdown.radius,
        padding: components.dropdown.padding,
      },
      tooltip: {
        paddingX: components.tooltip.paddingX,
        paddingY: components.tooltip.paddingY,
        radius: components.tooltip.radius,
        fontSize: components.tooltip.fontSize,
      },
      focus: {
        ring: components.focus.ring,
        outline: components.focus.outline,
      },
    },
  };
}

function mergeTokens(raw: Partial<Tokens> | null | undefined): Tokens {
  const defaults = createDefaults();
  if (!raw) return defaults;
  return {
    semantic: {
      dark: { ...defaults.semantic.dark, ...raw.semantic?.dark },
      light: { ...defaults.semantic.light, ...raw.semantic?.light },
    },
    global: {
      glass: { ...defaults.global.glass, ...raw.global?.glass },
      card: { ...defaults.global.card, ...raw.global?.card },
      chip: { ...defaults.global.chip, ...raw.global?.chip },
      pill: { ...defaults.global.pill, ...raw.global?.pill },
      panel: { ...defaults.global.panel, ...raw.global?.panel },
      header: { ...defaults.global.header, ...raw.global?.header },
      tab: { ...defaults.global.tab, ...raw.global?.tab },
      dropdown: { ...defaults.global.dropdown, ...raw.global?.dropdown },
      tooltip: { ...defaults.global.tooltip, ...raw.global?.tooltip },
      focus: { ...defaults.global.focus, ...raw.global?.focus },
    },
  };
}

function migrateLegacy(raw: unknown): Partial<Tokens> | null {
  if (raw == null || typeof raw !== 'object') return null;
  const legacy = raw as Record<string, unknown>;
  const asNumber = (value: unknown): number | undefined =>
    typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  const asString = (value: unknown): string | undefined =>
    typeof value === 'string' && value.trim().length > 0 ? value : undefined;

  // mergeTokens accepts a deep-partial shape, so the migration shape is
  // intentionally loosely typed and cast at the boundary.
  const glass: Partial<GlobalTokenSections['glass']> = {};
  const card: Partial<GlobalTokenSections['card']> = {};

  const glassAlphaDark = asNumber(legacy['glassAlphaDark']);
  if (glassAlphaDark != null) glass.fillAlphaDark = glassAlphaDark;
  const glassAlphaLight = asNumber(legacy['glassAlphaLight']);
  if (glassAlphaLight != null) glass.fillAlphaLight = glassAlphaLight;
  const borderDark = asNumber(legacy['glassBorderAlphaDark']);
  if (borderDark != null) glass.borderDark = borderDark;
  const borderLight = asNumber(legacy['glassBorderAlphaLight']);
  if (borderLight != null) glass.borderLight = borderLight;
  const blur = asNumber(legacy['glassBlur']);
  if (blur != null) glass.blur = `${String(blur)}px`;
  const radius = asNumber(legacy['radius']);
  if (radius != null) glass.radius = `${String(radius)}px`;
  const radiusSm = asNumber(legacy['radiusSm']);
  if (radiusSm != null) card.radiusInner = `${String(radiusSm)}px`;
  const cardPad = asNumber(legacy['cardPad']);
  if (cardPad != null) card.padding = `${String(cardPad)}px`;
  const gapY = asNumber(legacy['gapY']);
  if (gapY != null) card.gap = `${String(gapY)}px`;

  const semanticPartial: { dark?: Partial<SemanticTokens>; light?: Partial<SemanticTokens> } = {};
  const bgDark = asString(legacy['bgDark']);
  const bgLight = asString(legacy['bgLight']);
  if (bgDark) semanticPartial.dark = { bgSurface: bgDark, bgStage: bgDark };
  if (bgLight) semanticPartial.light = { bgSurface: bgLight, bgStage: bgLight };

  const next = {
    global: { glass, card },
    ...(bgDark || bgLight ? { semantic: semanticPartial } : {}),
  } as unknown as Partial<Tokens>;

  return next;
}

function load(): Tokens {
  if (typeof window === 'undefined') return createDefaults();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return mergeTokens(JSON.parse(raw) as Partial<Tokens>);
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) return mergeTokens(migrateLegacy(JSON.parse(legacy)));
  } catch {
    /* ignore malformed localStorage */
  }
  return createDefaults();
}

function applySemanticTheme(theme: Theme, tokens: SemanticTokens) {
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

// Parse a hex / rgb() colour into the "r, g, b" triplet form the glass
// CSS vars expect. Returns null for anything unparseable so callers can
// fall back to the default white tint.
function colorToRgbTriplet(input: string): string | null {
  const value = input.trim();
  if (value.startsWith('#')) {
    let hex = value.slice(1);
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    if (hex.length !== 6) return null;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if ([r, g, b].some(Number.isNaN)) return null;
    return `${r}, ${g}, ${b}`;
  }
  const rgbMatch = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(value);
  if (rgbMatch) {
    return `${Math.round(Number(rgbMatch[1]))}, ${Math.round(Number(rgbMatch[2]))}, ${Math.round(Number(rgbMatch[3]))}`;
  }
  return null;
}

// Emit the glass tint triplets for both themes whenever tokens change.
// `--glass-tint-dark` / `--glass-tint-light` feed the chrome (FilterBar,
// InspectPanel, SearchBar, all GlassCard surfaces) so applying a palette
// preset (Tokyo Night, Dracula, …) propagates the panel hue — instead of
// the panels being hardcoded white. Dark pulls from a lighter surface so
// the glass reads as a tinted highlight; light uses bgSurface directly.
function applyGlassTints(allSemantic: { dark: SemanticTokens; light: SemanticTokens }) {
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
  const darkSource = allSemantic.dark.fgAccent ?? allSemantic.dark.bgSurface;
  const lightSource = allSemantic.light.bgSurface;
  const darkTriplet = colorToRgbTriplet(darkSource);
  const lightTriplet = colorToRgbTriplet(lightSource);
  if (darkTriplet) root.style.setProperty('--glass-tint-dark', darkTriplet);
  else root.style.removeProperty('--glass-tint-dark');
  if (lightTriplet) root.style.setProperty('--glass-tint-light', lightTriplet);
  else root.style.removeProperty('--glass-tint-light');
}

function applyGlobalTokens(
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

export function TokensProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const [tokens, setTokens] = useState<Tokens>(() => load());

  useLayoutEffect(() => {
    applyTokens(theme);
    applySemanticTheme(theme, tokens.semantic[theme]);
    applyGlobalTokens(tokens.global, tokens.semantic, theme);
    applyGlassTints(tokens.semantic);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens)); } catch { /* ignore */ }
  }, [theme, tokens]);

  const setSemantic = useCallback(<K extends keyof SemanticTokens>(
    targetTheme: Theme,
    key: K,
    value: SemanticTokens[K],
  ) => {
    setTokens((current) => ({
      ...current,
      semantic: {
        ...current.semantic,
        [targetTheme]: {
          ...current.semantic[targetTheme],
          [key]: value,
        },
      },
    }));
  }, []);

  const setGlobal = useCallback(<
    S extends keyof GlobalTokenSections,
    K extends keyof GlobalTokenSections[S],
  >(
    section: S,
    key: K,
    value: GlobalTokenSections[S][K],
  ) => {
    setTokens((current) => ({
      ...current,
      global: {
        ...current.global,
        [section]: {
          ...current.global[section],
          [key]: value,
        },
      },
    }));
  }, []);

  const replace = useCallback((next: Tokens | ((current: Tokens) => Tokens)) => {
    setTokens((current) => (typeof next === 'function' ? next(current) : next));
  }, []);

  const reset = useCallback(() => {
    setTokens(createDefaults());
  }, []);

  const value = useMemo<Ctx>(() => ({
    tokens,
    setSemantic,
    setGlobal,
    replace,
    reset,
  }), [tokens, setSemantic, setGlobal, replace, reset]);

  return <TokensCtx.Provider value={value}>{children}</TokensCtx.Provider>;
}

export function useTokens(): Ctx {
  const c = useContext(TokensCtx);
  if (!c) throw new Error('useTokens must be inside TokensProvider');
  return c;
}
