import {
  createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode,
} from 'react';

import { applyTokens } from '../tokens';

type Theme = 'dark' | 'light';
type ThemeCtx = { theme: Theme; isDark: boolean; toggle: () => void };

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

  // Push the active theme onto :root so every CSS variable consumer
  // (Tailwind arbitrary values, raw `var(...)` lookups) updates atomically.
  //
  // useLayoutEffect (not useEffect) so the tokens land on :root *before*
  // the first paint after a state change — otherwise a fresh mount with
  // no tokens yet would paint a single frame against unset variables and
  // flash white where children expect `var(--bg-canvas)` to be dark.
  useLayoutEffect(() => {
    applyTokens(theme);
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

  const value = useMemo<ThemeCtx>(() => ({
    theme,
    isDark: theme === 'dark',
    toggle,
  }), [theme, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTheme must be inside ThemeProvider');
  return c;
}
