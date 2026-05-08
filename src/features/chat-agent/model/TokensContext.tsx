import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';

export type Tokens = {
  // Color
  accent: string;            // CSS color
  bgDark: string;
  bgLight: string;
  // Glass
  glassAlphaDark: number;    // 0..1
  glassAlphaLight: number;
  glassBorderAlphaDark: number;
  glassBorderAlphaLight: number;
  glassBlur: number;         // px
  // Shape
  radius: number;            // px (large card radius)
  radiusSm: number;          // px (small)
  // Type scale (multiplier)
  fontScale: number;         // 0.85..1.2
  // Density
  cardPad: number;           // px
  gapY: number;              // px
};

const DEFAULTS: Tokens = {
  accent: '#4f9a5c',
  bgDark: '#0d1117',
  bgLight: '#ffffff',
  glassAlphaDark: 0.04,
  glassAlphaLight: 0.8,
  glassBorderAlphaDark: 0.1,
  glassBorderAlphaLight: 0.4,
  glassBlur: 22,
  radius: 24,
  radiusSm: 12,
  fontScale: 1,
  cardPad: 16,
  gapY: 12,
};

type Ctx = {
  tokens: Tokens;
  set: <K extends keyof Tokens>(k: K, v: Tokens[K]) => void;
  reset: () => void;
};

const TokensCtx = createContext<Ctx | null>(null);
const STORAGE_KEY = 'cflens.tokens.v1';

function load(): Tokens {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Tokens>) };
  } catch {
    return DEFAULTS;
  }
}

function applyToRoot(t: Tokens) {
  const root = document.documentElement;
  root.style.setProperty('--accent', t.accent);
  root.style.setProperty('--bg-dark', t.bgDark);
  root.style.setProperty('--bg-light', t.bgLight);
  root.style.setProperty('--glass-alpha-dark', String(t.glassAlphaDark));
  root.style.setProperty('--glass-alpha-light', String(t.glassAlphaLight));
  root.style.setProperty('--glass-border-dark', String(t.glassBorderAlphaDark));
  root.style.setProperty('--glass-border-light', String(t.glassBorderAlphaLight));
  root.style.setProperty('--glass-blur', `${t.glassBlur}px`);
  root.style.setProperty('--radius', `${t.radius}px`);
  root.style.setProperty('--radius-sm', `${t.radiusSm}px`);
  root.style.setProperty('--font-scale', String(t.fontScale));
  root.style.setProperty('--card-pad', `${t.cardPad}px`);
  root.style.setProperty('--gap-y', `${t.gapY}px`);
}

export function TokensProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = useState<Tokens>(() => load());

  useEffect(() => {
    applyToRoot(tokens);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens)); } catch { /* ignore */ }
  }, [tokens]);

  const set = useCallback(<K extends keyof Tokens>(k: K, v: Tokens[K]) => {
    setTokens((t) => ({ ...t, [k]: v }));
  }, []);
  const reset = useCallback(() => { setTokens(() => DEFAULTS); }, []);

  const value = useMemo<Ctx>(() => ({
    tokens,
    set,
    reset,
  }), [tokens, set, reset]);

  return <TokensCtx.Provider value={value}>{children}</TokensCtx.Provider>;
}

export function useTokens(): Ctx {
  const c = useContext(TokensCtx);
  if (!c) throw new Error('useTokens must be inside TokensProvider');
  return c;
}
