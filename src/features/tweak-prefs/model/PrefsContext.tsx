import {
  createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react';
import type { Plan, FacetCategoryKey, FacetEntry } from '@entities/facet';

export type { Plan, FacetCategoryKey, FacetEntry };

const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, enterprise: 2 };

const STORAGE_KEY = 'cflens.prefs.v1';

export type PrefsState = {
  plan: Plan;
  hidden: Set<string>;             // per-user-hidden facet keys
  collapsedCategories: Set<FacetCategoryKey>;
};

type Ctx = PrefsState & {
  setPlan: (p: Plan) => void;
  toggleHidden: (key: string) => void;
  toggleCategoryCollapsed: (k: FacetCategoryKey) => void;
  isUnlocked: (entry: { requiredPlan: Plan }) => boolean;
  isVisible: (entry: FacetEntry) => boolean;       // unlocked AND not user-hidden
  reset: () => void;
};

const PrefsCtx = createContext<Ctx | null>(null);

function load(): PrefsState {
  if (typeof window === 'undefined') return defaults();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw) as { plan?: Plan; hidden?: string[]; collapsedCategories?: string[] };
    return {
      plan: parsed.plan ?? 'pro',
      hidden: new Set(parsed.hidden ?? []),
      collapsedCategories: new Set((parsed.collapsedCategories ?? []) as FacetCategoryKey[]),
    };
  } catch {
    return defaults();
  }
}
function defaults(): PrefsState {
  // Default to pro for the demo so most facets are visible out of the box.
  return {
    plan: 'pro',
    hidden: new Set(),
    collapsedCategories: new Set(['perf', 'docs']),
  };
}
function persist(s: PrefsState) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    plan: s.plan,
    hidden: [...s.hidden],
    collapsedCategories: [...s.collapsedCategories],
  }));
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<PrefsState>(() => load());
  // Skip the very first persist — useState's initializer already loaded
  // from localStorage, so writing the same value back on mount is wasted
  // I/O and (under StrictMode in dev) double-fires on every reload.
  const isFirstPersist = useRef(true);
  useEffect(() => {
    if (isFirstPersist.current) {
      isFirstPersist.current = false;
      return;
    }
    persist(s);
  }, [s]);

  const ctx = useMemo<Ctx>(() => ({
    ...s,
    setPlan: (p) => { setS((cur) => ({ ...cur, plan: p })); },
    toggleHidden: (key) => { setS((cur) => {
      const next = new Set(cur.hidden);
      next.has(key) ? next.delete(key) : next.add(key);
      return { ...cur, hidden: next };
    }); },
    toggleCategoryCollapsed: (k) => { setS((cur) => {
      const next = new Set(cur.collapsedCategories);
      next.has(k) ? next.delete(k) : next.add(k);
      return { ...cur, collapsedCategories: next };
    }); },
    isUnlocked: ({ requiredPlan }) => PLAN_RANK[s.plan] >= PLAN_RANK[requiredPlan],
    isVisible: (entry) => PLAN_RANK[s.plan] >= PLAN_RANK[entry.requiredPlan] && !s.hidden.has(entry.key),
    reset: () => { setS(defaults()); },
  }), [s]);

  return <PrefsCtx.Provider value={ctx}>{children}</PrefsCtx.Provider>;
}

export function usePrefs(): Ctx {
  const c = useContext(PrefsCtx);
  if (!c) throw new Error('usePrefs must be inside PrefsProvider');
  return c;
}
