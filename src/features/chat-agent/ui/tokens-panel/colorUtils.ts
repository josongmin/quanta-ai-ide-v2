import { semantic } from '@shared/tokens';
import type { Tokens } from '../../model/TokensContext';

export function humanizeKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (char) => char.toUpperCase());
}

export function isHexColor(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

export function isCssColor(value: string): boolean {
  const v = value.trim().toLowerCase();
  return isHexColor(v) || v.startsWith('rgb(') || v.startsWith('rgba(') || v.startsWith('hsl(') || v.startsWith('hsla(');
}

export function makeStubTokens(): Tokens {
  // We only need a real SemanticTokens shape that the preset's `apply` can
  // spread into; it overwrites the colour keys it cares about. Using the
  // shipped defaults keeps the stub exactly in sync with SemanticTokens (no
  // hand-maintained shape that can drift).
  return {
    semantic: { dark: { ...semantic.dark }, light: { ...semantic.light } },
    // `global` is structurally required by Tokens but never read by any
    // preset's `apply` (and the call site only inspects `.semantic`). There
    // is no exported default GlobalTokenSections value to clone, so an empty
    // object is cast at this throwaway-stub boundary.
    global: {} as Tokens['global'],
  };
}
