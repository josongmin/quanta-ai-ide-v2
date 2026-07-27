// Leaf token types. Extracted from TokensContext so value modules (applyTokens,
// tokenStorage) can import these without an import cycle back through the
// context module (which imports THEM at value level). Imports nothing local.
import type { SemanticTokens } from '@shared/tokens';

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
