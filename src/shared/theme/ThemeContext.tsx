import {
  createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode,
} from 'react';


export type Theme = 'dark' | 'light';
type ThemeCtx = { theme: Theme; isDark: boolean; toggle: () => void; setTheme: (theme: Theme) => void };

const Ctx = createContext<ThemeCtx | null>(null);

const STORAGE_KEY = 'app:theme';

function readStored(): Theme | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === 'dark' || raw === 'light') return raw;
  } catch {
    /* localStorage unavailable (private mode, sandboxed iframe) — ignore. */
  }
  return null;
}

function readMediaQuery(): Theme | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch {
    return null;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Lazy init — read storage first (explicit user choice wins), then fall
  // back to OS-level preference, then default to dark to match the existing
  // first-paint surface in `index.html`.
  const [theme, setTheme] = useState<Theme>(() => readStored() ?? readMediaQuery() ?? 'dark');

  // Token emission is single-owner: TokensProvider (preset-aware —
  // applyTokens + applySemanticTheme for the active palette) on every
  // [theme, tokens] change, plus main.tsx for the pre-React boot paint.
  // ThemeProvider must NOT also call applyTokens here: it emits the
  // STATIC built-in palette and, as the outer provider, its layout
  // effect runs AFTER TokensProvider's (child) — so it clobbered the
  // selected preset's --bg-overlay/semantic vars back to defaults on
  // every mount and light/dark toggle. We only own the theme STATE +
  // its data-theme flag (the latter also set by applySemanticTheme).
  useLayoutEffect(() => {
    document.documentElement.dataset['theme'] = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  // Persistence is non-visual; keep it in useEffect so we don't block paint.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* swallow — best-effort persistence. */
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  const setThemeExplicit = useCallback((next: Theme) => {
    setTheme(next);
  }, []);

  const value = useMemo<ThemeCtx>(() => ({
    theme,
    isDark: theme === 'dark',
    toggle,
    setTheme: setThemeExplicit,
  }), [theme, toggle, setThemeExplicit]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTheme must be inside ThemeProvider');
  return c;
}
