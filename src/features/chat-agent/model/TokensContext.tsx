import {
  createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode,
} from 'react';
import { safeLocalSet } from '@shared/lib';
import { useTheme } from '@shared/theme';
import { applyTokens, type SemanticTokens, type Theme } from '@shared/tokens';
import { createDefaults, load, STORAGE_KEY } from './tokenStorage';
import { applyGlassTints, applyGlobalTokens, applySemanticTheme } from './applyTokens';
import type { GlobalTokenSections, Tokens } from './tokens-types';

// Token shapes moved to ./tokens-types (leaf) to break the value↔type cycle
// with applyTokens/tokenStorage. Re-exported here so existing consumers that
// import them from the context module keep working.
export type { GlobalTokenSections, Tokens } from './tokens-types';

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

export function TokensProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const [tokens, setTokens] = useState<Tokens>(() => load());

  useLayoutEffect(() => {
    applyTokens(theme);
    applySemanticTheme(theme, tokens.semantic[theme]);
    applyGlobalTokens(tokens.global, tokens.semantic, theme);
    applyGlassTints(tokens.semantic);
    safeLocalSet(STORAGE_KEY, JSON.stringify(tokens));
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
