// Shared types + the apply* helpers that splice a ColorPalette into a
// SemanticTokens table. Used by both the dark-palette and light-palette
// collections in this directory.

import type { SemanticTokens } from '@shared/tokens';
import type { Tokens } from '../tokens-types';

export type Tone = 'dark' | 'light';

export type ColorPalette = {
  bgCanvas: string;
  bgSurface: string;
  bgSurfaceMuted: string;
  bgOverlay: string;
  bgElevated: string;
  bgPanelStrong: string;
  bgHover: string;
  bgActive: string;
  bgActiveStrong: string;
  bgSelected: string;
  bgScrim: string;
  bgStage: string;

  fgStrong: string;
  fgDefault: string;
  fgMuted: string;
  fgSubtle: string;
  fgLink: string;
  fgAccent: string;

  borderDefault: string;
  borderMuted: string;
  borderStrong: string;
  borderFocus: string;

  brandFg: string;
  brandBg: string;
  brandVivid: string;

  intentSuccessFg: string;
  intentSuccessVivid: string;
  intentWarnFg: string;
  intentWarnVivid: string;
  intentDangerFg: string;
  intentDangerVivid: string;
  intentInfoFg: string;
};

export function applyPalette(
  current: SemanticTokens,
  palette: ColorPalette,
): SemanticTokens {
  return {
    ...current,
    bgCanvas: palette.bgCanvas,
    bgSurface: palette.bgSurface,
    bgSurfaceMuted: palette.bgSurfaceMuted,
    bgOverlay: palette.bgOverlay,
    bgElevated: palette.bgElevated,
    bgPanelStrong: palette.bgPanelStrong,
    bgHover: palette.bgHover,
    bgActive: palette.bgActive,
    bgActiveStrong: palette.bgActiveStrong,
    bgSelected: palette.bgSelected,
    bgScrim: palette.bgScrim,
    bgStage: palette.bgStage,

    fgStrong: palette.fgStrong,
    fgDefault: palette.fgDefault,
    fgMuted: palette.fgMuted,
    fgSubtle: palette.fgSubtle,
    fgLink: palette.fgLink,
    fgAccent: palette.fgAccent,

    borderDefault: palette.borderDefault,
    borderMuted: palette.borderMuted,
    borderStrong: palette.borderStrong,
    borderFocus: palette.borderFocus,

    intentSuccessFg: palette.intentSuccessFg,
    intentSuccessVivid: palette.intentSuccessVivid,
    intentWarnFg: palette.intentWarnFg,
    intentWarnVivid: palette.intentWarnVivid,
    intentDangerFg: palette.intentDangerFg,
    intentDangerVivid: palette.intentDangerVivid,
    intentInfoFg: palette.intentInfoFg,
  };
}

export type ThemePreset = {
  id: string;
  tone: Tone;
  apply: (current: Tokens) => Tokens;
};

export function makeDarkPreset(id: string, palette: ColorPalette): ThemePreset {
  return {
    id,
    tone: 'dark',
    apply: (current) => ({
      ...current,
      semantic: { ...current.semantic, dark: applyPalette(current.semantic.dark, palette) },
    }),
  };
}

export function makeLightPreset(id: string, palette: ColorPalette): ThemePreset {
  return {
    id,
    tone: 'light',
    apply: (current) => ({
      ...current,
      semantic: { ...current.semantic, light: applyPalette(current.semantic.light, palette) },
    }),
  };
}
