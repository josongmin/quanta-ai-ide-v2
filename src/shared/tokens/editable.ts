// The EDITABLE token set — the shape the live token editor (chat-agent's
// TokensPanel) mutates and the preset emitters below consume. `Tokens` wraps the
// per-theme semantic tokens plus the global chrome sections.
import type { SemanticTokens } from './semantic';

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
