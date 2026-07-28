import { safeLocalGet, STORAGE_KEYS } from '@shared/lib';
import {
  components, semantic,
  type SemanticTokens, type GlobalTokenSections, type Tokens,
} from '@shared/tokens';

// Bumped v2 → v3: the glass-tint / fillAlphaDark token semantics changed
// (applyGlassTints, dark alpha 0.04 → 0.5). Stale persisted v2 tokens
// would otherwise override the new defaults and freeze the chrome —
// invalidate them once so everyone picks up the new theming.
export const STORAGE_KEY = STORAGE_KEYS.tokens;
const LEGACY_STORAGE_KEY = STORAGE_KEYS.tokensLegacy;

// Shape that `mergeTokens` actually reads: every section is optional and each
// leaf section is itself a Partial. Used for persisted/migrated input which is
// not guaranteed to carry every field.
type PartialTokens = {
  semantic?: {
    dark?: Partial<SemanticTokens>;
    light?: Partial<SemanticTokens>;
  };
  global?: {
    [S in keyof GlobalTokenSections]?: Partial<GlobalTokenSections[S]>;
  };
};

export function createDefaults(): Tokens {
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

export function mergeTokens(raw: PartialTokens | null | undefined): Tokens {
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

export function migrateLegacy(raw: unknown): PartialTokens | null {
  if (raw == null || typeof raw !== 'object') return null;
  const legacy = raw as Record<string, unknown>;
  const asNumber = (value: unknown): number | undefined =>
    typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  const asString = (value: unknown): string | undefined =>
    typeof value === 'string' && value.trim().length > 0 ? value : undefined;

  // mergeTokens accepts a deep-partial shape (PartialTokens), so the migration
  // shape is built up section-by-section as partials.
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

  const next: PartialTokens = {
    global: { glass, card },
    ...(bgDark || bgLight ? { semantic: semanticPartial } : {}),
  };

  return next;
}

export function load(): Tokens {
  if (typeof window === 'undefined') return createDefaults();
  try {
    const raw = safeLocalGet(STORAGE_KEY);
    // JSON boundary: parsed persisted state is structurally a deep-partial.
    if (raw) return mergeTokens(JSON.parse(raw) as PartialTokens);
    const legacy = safeLocalGet(LEGACY_STORAGE_KEY);
    if (legacy) return mergeTokens(migrateLegacy(JSON.parse(legacy)));
  } catch {
    /* ignore malformed localStorage */
  }
  return createDefaults();
}
