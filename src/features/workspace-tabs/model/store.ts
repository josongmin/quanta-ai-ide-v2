import { create } from 'zustand';
import {
  persist,
  createJSONStorage,
  type StateStorage,
} from 'zustand/middleware';
import { STORAGE_KEYS, systemRuntimeEnv, clamp } from '@shared/lib';
import {
  FIRST_LAUNCH_SURFACE_IDS,
  SURFACE_IDS_ORDERED,
  isKnownSurface,
  instancingFor,
  firstLaunchActiveSurfaceId,
  lastTabFallbackSurfaceId,
} from '@shared/config/surfaces';
import { migrateTabs, TAB_STATE_VERSION } from './migrateTabs';

const KNOWN_SURFACE_IDS = new Set(SURFACE_IDS_ORDERED);

// Throttle window for localStorage writes. Tab activations cluster (e.g.
// the user cycles through tabs with Cmd+Alt+Arrow) — without throttling,
// each click fires a synchronous JSON.stringify + localStorage.setItem.
// 400ms is short enough to feel instant on the next reload but long
// enough to coalesce bursts of cycling.
const PERSIST_THROTTLE_MS = 400;

// Wrap a backing storage so writes are coalesced. Reads pass through
// (rare, only on hydration). The trailing flush schedule is per key so
// concurrent throttled storages don't fight; we only have one consumer
// here but keep the pattern generic.
//
// pagehide / beforeunload flush synchronously so a tab close racing
// against an in-flight throttle window doesn't lose state. visibilitychange
// covers the same beat for mobile Safari where pagehide is unreliable.
function throttledLocalStorage(throttleMs: number): StateStorage {
  if (typeof window === 'undefined') {
    // SSR safety net — fall back to the noop storage zustand uses by
    // default when window is missing.
    return {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    };
  }
  const pending = new Map<string, string>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  function flushKey(key: string): void {
    const value = pending.get(key);
    if (value === undefined) return;
    pending.delete(key);
    const timer = timers.get(key);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.delete(key);
    }
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Quota exceeded / privacy mode / SecurityError. Persistence is a
      // nice-to-have, not load-bearing — silently drop the write rather
      // than blowing up the action that triggered it.
    }
  }

  function flushAll(): void {
    for (const key of [...pending.keys()]) flushKey(key);
  }

  // Best-effort sync flush on unload. `pagehide` is the modern hook;
  // `beforeunload` is the legacy fallback. `visibilitychange === 'hidden'`
  // covers iOS Safari which fires that more reliably than pagehide.
  window.addEventListener('pagehide', flushAll);
  window.addEventListener('beforeunload', flushAll);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushAll();
  });

  return {
    getItem: (key) => {
      // If a write is pending for this key, prefer the in-memory value
      // — a hydration triggered mid-flight should see what the user
      // just set, not the older disk copy.
      const queued = pending.get(key);
      if (queued !== undefined) return queued;
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: (key, value) => {
      pending.set(key, value);
      const existing = timers.get(key);
      if (existing !== undefined) clearTimeout(existing);
      timers.set(
        key,
        setTimeout(() => { flushKey(key); }, throttleMs),
      );
    },
    removeItem: (key) => {
      pending.delete(key);
      const timer = timers.get(key);
      if (timer !== undefined) {
        clearTimeout(timer);
        timers.delete(key);
      }
      try {
        window.localStorage.removeItem(key);
      } catch {
        // see setItem
      }
    },
  };
}

// One open tab. `id` is per-instance (a single workspace can hold two coding
// tabs, each with its own id). `surfaceId` is the sole identity — it keys the
// catalog for title/icon/view. There is no `kind`.
export type WorkspaceTab = {
  id: string;
  surfaceId: string;
  // Optional user label. Falls back to the surface title when absent.
  label?: string;
  dirty?: boolean;
  pinned?: boolean;
  lastFocusedAt?: number;
};

type State = {
  tabs: WorkspaceTab[];
  activeId: string;
};

type Actions = {
  setActive: (id: string) => void;
  openSurface: (surfaceId: string, opts?: { activate?: boolean }) => string;
  close: (id: string) => void;
  reorder: (id: string, toIndex: number) => void;
  focusRelative: (delta: number) => void;
  setLabel: (id: string, label?: string) => void;
  setDirty: (id: string, dirty: boolean) => void;
  setPinned: (id: string, pinned: boolean) => void;
  // Replaces the entire tab list — used when the user "resets" via the
  // picker's "All tabs" preset, or when migrating an out-of-date persisted
  // shape.
  setAll: (tabs: WorkspaceTab[], activeId?: string) => void;
};

export type WorkspaceTabsStore = State & Actions;

function makeId(): string {
  return systemRuntimeEnv.createId('t');
}

function touchTab(tab: WorkspaceTab, now: number): WorkspaceTab {
  return { ...tab, lastFocusedAt: now };
}

function defaultTab(surfaceId: string, active = false): WorkspaceTab {
  return {
    id: makeId(),
    surfaceId,
    dirty: false,
    pinned: false,
    lastFocusedAt: active ? systemRuntimeEnv.now() : undefined,
  };
}

function defaultTabs(): WorkspaceTab[] {
  const active = firstLaunchActiveSurfaceId();
  return FIRST_LAUNCH_SURFACE_IDS.map((surfaceId) => defaultTab(surfaceId, surfaceId === active));
}

function sanitizeTab(raw: WorkspaceTab): WorkspaceTab {
  return {
    id: raw.id,
    surfaceId: raw.surfaceId,
    label: typeof raw.label === 'string' && raw.label.trim() ? raw.label : undefined,
    dirty: Boolean(raw.dirty),
    pinned: Boolean(raw.pinned),
    lastFocusedAt: typeof raw.lastFocusedAt === 'number' ? raw.lastFocusedAt : undefined,
  };
}

// Relocate `id` to the pinned/unpinned boundary. Callers pass `tabs` with the
// moved tab's `pinned` flag already updated, so both directions insert at the
// same spot — the first unpinned tab (or the end when everything is pinned):
//   • pinning   → the tab lands at the tail of the pinned run
//   • unpinning → the tab lands at the head of the unpinned run
// `targetPinned` is kept for call-site clarity even though the insertion math
// is identical in both cases.
function moveIntoSection(
  tabs: WorkspaceTab[],
  id: string,
  _targetPinned: boolean,
): WorkspaceTab[] {
  const from = tabs.findIndex((t) => t.id === id);
  if (from === -1) return tabs;
  const next = [...tabs];
  const [moved] = next.splice(from, 1);
  const firstUnpinned = next.findIndex((t) => !t.pinned);
  const insertAt = firstUnpinned === -1 ? next.length : firstUnpinned;
  next.splice(insertAt, 0, moved);
  return next;
}

export const useWorkspaceTabsStore = create<WorkspaceTabsStore>()(
  persist(
    (set, get) => {
      const initial = defaultTabs();
      // The first-launch active surface (not merely index 0) boots focused; it
      // is the tab defaultTabs() marked with a lastFocusedAt timestamp.
      const initialActive =
        initial.find((t) => t.lastFocusedAt !== undefined) ?? initial[0];
      return {
        tabs: initial,
        activeId: initialActive.id,

        setActive: (id) => {
          set((s) => {
            if (!s.tabs.some((t) => t.id === id)) return s;
            const now = systemRuntimeEnv.now();
            return {
              activeId: id,
              tabs: s.tabs.map((t) => (t.id === id ? touchTab(t, now) : t)),
            };
          });
        },

        openSurface: (surfaceId, opts) => {
          const activate = opts?.activate !== false;
          // The descriptor's instancing policy is the sole authority: a
          // `singleton` surface focuses its existing tab instead of spawning a
          // duplicate; only `multi` surfaces get a fresh instance per open. The
          // store never overrides the descriptor (that split was the P0 defect).
          if (instancingFor(surfaceId) === 'singleton') {
            const existing = get().tabs.find((t) => t.surfaceId === surfaceId);
            if (existing) {
              if (activate) get().setActive(existing.id);
              return existing.id;
            }
          }
          const tab = defaultTab(surfaceId, activate);
          set((s) => ({
            tabs: [...s.tabs, tab],
            activeId: activate ? tab.id : s.activeId,
          }));
          return tab.id;
        },

        close: (id) => {
          set((s) => {
            // Last-tab guard — closing the only tab would strand the user.
            // Linear/Notion both replace the closed tab with a new default.
            if (s.tabs.length === 1) {
              const fresh = defaultTab(lastTabFallbackSurfaceId(), true);
              return { tabs: [fresh], activeId: fresh.id };
            }
            const idx = s.tabs.findIndex((t) => t.id === id);
            if (idx === -1) return s;
            const next = s.tabs.filter((t) => t.id !== id);
            // If we just closed the active tab, focus the neighbour to its
            // right (or the new last tab if we closed the rightmost one).
            let activeId = s.activeId;
            if (s.activeId === id) {
              const fallback = next[idx] ?? next[next.length - 1];
              activeId = fallback.id;
            }
            const now = systemRuntimeEnv.now();
            return {
              tabs: next.map((t) => (t.id === activeId ? touchTab(t, now) : t)),
              activeId,
            };
          });
        },

        reorder: (id, toIndex) => {
          set((s) => {
            const fromIndex = s.tabs.findIndex((t) => t.id === id);
            if (fromIndex === -1 || fromIndex === toIndex) return s;
            const clamped = clamp(toIndex, 0, s.tabs.length - 1);
            const next = [...s.tabs];
            const [moved] = next.splice(fromIndex, 1);
            next.splice(clamped, 0, moved);
            return { tabs: next };
          });
        },

        focusRelative: (delta) => {
          set((s) => {
            if (s.tabs.length <= 1 || delta === 0) return s;
            const currentIndex = s.tabs.findIndex((t) => t.id === s.activeId);
            if (currentIndex === -1) return s;
            const nextIndex = (currentIndex + delta + s.tabs.length) % s.tabs.length;
            const nextId = s.tabs[nextIndex].id;
            const now = systemRuntimeEnv.now();
            return {
              activeId: nextId,
              tabs: s.tabs.map((t) => (t.id === nextId ? touchTab(t, now) : t)),
            };
          });
        },

        setLabel: (id, label) => {
          set((s) => ({
            tabs: s.tabs.map((t) => (
              t.id === id
                ? { ...t, label: label?.trim() ? label.trim() : undefined }
                : t
            )),
          }));
        },

        setDirty: (id, dirty) => {
          set((s) => ({
            tabs: s.tabs.map((t) => (t.id === id ? { ...t, dirty } : t)),
          }));
        },

        setPinned: (id, pinned) => {
          set((s) => {
            const current = s.tabs.find((t) => t.id === id);
            if (!current || current.pinned === pinned) return s;
            const updated = s.tabs.map((t) => (t.id === id ? { ...t, pinned } : t));
            return {
              tabs: moveIntoSection(updated, id, pinned),
            };
          });
        },

        setAll: (tabs, activeId) => {
          if (tabs.length === 0) return;
          const sanitized = tabs
            .filter((t) => isKnownSurface(t.surfaceId))
            .map((t) => sanitizeTab(t));
          if (sanitized.length === 0) return;
          const ensuredActive =
            activeId && sanitized.some((t) => t.id === activeId)
              ? activeId
              : sanitized[0].id;
          set({ tabs: sanitized, activeId: ensuredActive });
        },
      };
    },
    {
      name: STORAGE_KEYS.workspaceTabs,
      // Throttled localStorage — bursts of activations (Cmd+Alt+Arrow
      // cycling, drag-reorder) coalesce into one disk write instead of
      // one per state mutation. See `throttledLocalStorage` above for
      // the unload-flush guarantee.
      storage: createJSONStorage(() => throttledLocalStorage(PERSIST_THROTTLE_MS)),
      partialize: (s) => ({ tabs: s.tabs, activeId: s.activeId }),
      // If the persisted shape is missing or has zero tabs (rare — corrupt
      // storage), fall back to the defaults rather than booting empty.
      merge: (persisted, current) => {
        const p = persisted as Partial<State> | undefined;
        if (!p || !Array.isArray(p.tabs) || p.tabs.length === 0) return current;
        // Filter out tabs whose kind is no longer in the registry (e.g.
        // after a kind rename) so the UI doesn't render nothing for them.
        const tabs = p.tabs
          .filter((t): t is WorkspaceTab =>
            t != null && typeof t.id === 'string' && typeof t.surfaceId === 'string' && isKnownSurface(t.surfaceId),
          )
          .map((t) => sanitizeTab(t));
        if (tabs.length === 0) return current;
        const activeId =
          typeof p.activeId === 'string' && tabs.some((t) => t.id === p.activeId)
            ? p.activeId
            : tabs[0].id;
        return { ...current, tabs, activeId };
      },
      // Legacy `{ kind }` corpus (version < 3) is migrated to canonical
      // surface-identity records via the shared, idempotent migration. Unknown/
      // corrupt tabs are quarantined; the canonical store is the only writer.
      migrate: (persisted, version) => {
        if (version >= TAB_STATE_VERSION) return persisted;
        const result = migrateTabs(persisted, KNOWN_SURFACE_IDS);
        const tabs: WorkspaceTab[] = result.tabs.map((t) => ({
          id: t.id,
          surfaceId: t.surfaceId,
          label: t.label,
          pinned: t.pinned,
          lastFocusedAt: t.lastFocusedAt,
        }));
        if (tabs.length === 0) return persisted;
        return { tabs, activeId: result.activeId ?? tabs[0].id };
      },
      version: TAB_STATE_VERSION,
    },
  ),
);

// Narrow selector helpers — keep call sites from re-rendering on unrelated
// store churn.
export function useActiveTab(): WorkspaceTab | null {
  return useWorkspaceTabsStore((s) => s.tabs.find((t) => t.id === s.activeId) ?? null);
}
