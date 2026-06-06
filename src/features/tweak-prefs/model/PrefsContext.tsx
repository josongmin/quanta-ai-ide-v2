import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
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

  const setPlan = useCallback((p: Plan) => {
    setS((cur) => ({ ...cur, plan: p }));
  }, []);
  const toggleHidden = useCallback((key: string) => {
    setS((cur) => {
      const next = new Set(cur.hidden);
      next.has(key) ? next.delete(key) : next.add(key);
      return { ...cur, hidden: next };
    });
  }, []);
  const toggleCategoryCollapsed = useCallback((k: FacetCategoryKey) => {
    setS((cur) => {
      const next = new Set(cur.collapsedCategories);
      next.has(k) ? next.delete(k) : next.add(k);
      return { ...cur, collapsedCategories: next };
    });
  }, []);
  const reset = useCallback(() => { setS(() => defaults()); }, []);

  // Mutators carry empty deps, so this object is built once and keeps a
  // stable identity for the lifetime of the provider — pulling them into a
  // static bundle means action-identity changes can never trigger a context
  // re-render on their own.
  const mutators = useMemo(
    () => ({ setPlan, toggleHidden, toggleCategoryCollapsed, reset }),
    [setPlan, toggleHidden, toggleCategoryCollapsed, reset],
  );

  // isUnlocked/isVisible read live state, so their identities must track
  // plan+hidden to stay correct when called synchronously during a
  // consumer's render in the same commit as a prefs change.
  const isUnlocked = useCallback(
    ({ requiredPlan }: { requiredPlan: Plan }) => PLAN_RANK[s.plan] >= PLAN_RANK[requiredPlan],
    [s.plan],
  );
  const isVisible = useCallback(
    (entry: FacetEntry) => PLAN_RANK[s.plan] >= PLAN_RANK[entry.requiredPlan] && !s.hidden.has(entry.key),
    [s.plan, s.hidden],
  );

  // Value identity changes only when state or the plan-dependent predicates
  // change; the stable mutators never contribute a new identity.
  const ctx = useMemo<Ctx>(
    () => ({ ...s, ...mutators, isUnlocked, isVisible }),
    [s, mutators, isUnlocked, isVisible],
  );

  return <PrefsCtx.Provider value={ctx}>{children}</PrefsCtx.Provider>;
}

export function usePrefs(): Ctx {
  const c = useContext(PrefsCtx);
  if (!c) throw new Error('usePrefs must be inside PrefsProvider');
  return c;
}
