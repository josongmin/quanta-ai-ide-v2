import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { safeLocalGet, safeLocalSet, STORAGE_KEYS } from '@shared/lib';

// ─── Domain ───────────────────────────────────────────────────────────
// Each "activity" is one AI chat session touching N files. Files are
// referenced by their FileRecord.id (entities/repo). A session has a hue
// so multiple chats stay visually distinct.

export type ActivityState = 'thinking' | 'editing' | 'done';

// Per-file work being done in this session. Carries the verb + an optional
// symbol so the tray can render a one-line, meaningful sentence rather than a
// bare filename. `intent` is a short human phrase explaining *why* — it's how
// the user can tell at a glance whether a worker is fixing a bug, writing
// tests, refactoring, etc.
export type ActivityAction =
  | 'reading' | 'analyzing' | 'editing' | 'refactoring'
  | 'testing' | 'reviewing' | 'fixing' | 'documenting';

export type ActivityTarget = {
  fileId: number;
  action: ActivityAction;
  symbol?: string;
  intent: string;
};

export type AiActivity = {
  chatId: string;
  agent: string;       // model / agent label, e.g. "claude-opus-4.7", "gpt-5"
  task: string;        // one-line summary of what this session is trying to do
  targets: ActivityTarget[];
  // Convenience mirror of `targets[*].fileId` so existing consumers
  // (DotFieldMode rings, ActivityOverlay) can keep their flat-list contract.
  fileIds: number[];
  state: ActivityState;
  hue: string;        // CSS color
  startedAt: number;  // epoch ms — used for fade-in / TTL
};

// Curated palette: hues that don't collide with the severity system
// (red/amber/green) or the vendor (purple) layer color. Cyan reads as
// "live/streaming" by web convention; magenta and yellow are visually
// distinct enough to support up to 3 simultaneous chats before needing
// to recycle.
export const ACTIVITY_HUES = [
  '#22d3ee', // cyan
  '#e879f9', // magenta
  '#fde047', // yellow
] as const;

export function pickHue(seed: number): string {
  return ACTIVITY_HUES[seed % ACTIVITY_HUES.length] ?? ACTIVITY_HUES[0];
}

// ─── Visualization preferences ────────────────────────────────────────
// User-tunable. Persisted to localStorage so the user's overlay choices
// survive a refresh. Three independent toggles for the three viz layers
// plus motion / intensity / cap controls.

export type Speed = 'slow' | 'normal' | 'fast';
export type Intensity = 'subtle' | 'normal' | 'loud';

export type ActivityPrefs = {
  enabled: boolean;
  showRing: boolean;
  showLine: boolean;
  showZone: boolean;
  speed: Speed;
  intensity: Intensity;
  maxConcurrent: number;
  // When true, the demo simulator synthesizes activity if no real producer
  // (e.g. ChatAgent wiring) is pushing into the store. Toggle off to see an
  // empty stage / only real activity.
  demoMode: boolean;
};

const PREFS_DEFAULTS: ActivityPrefs = {
  enabled: true,
  showRing: true,
  showLine: true,
  showZone: true,
  speed: 'normal',
  intensity: 'normal',
  maxConcurrent: 5,
  demoMode: true,
};

// Keep the v1 storage key — the spread-with-defaults loader is forward
// compatible (missing `demoMode` falls back to the default `true`).
const STORAGE_KEY = STORAGE_KEYS.aiActivityPrefs;

function loadPrefs(): ActivityPrefs {
  if (typeof window === 'undefined') return PREFS_DEFAULTS;
  // The storage read is wrapped by the helper; the try/catch remains as a
  // parse guard for malformed JSON, preserving the same defaults fallback.
  try {
    const raw = safeLocalGet(STORAGE_KEY);
    if (!raw) return PREFS_DEFAULTS;
    return { ...PREFS_DEFAULTS, ...(JSON.parse(raw) as Partial<ActivityPrefs>) };
  } catch {
    return PREFS_DEFAULTS;
  }
}

function persistPrefs(p: ActivityPrefs) {
  if (typeof window === 'undefined') return;
  safeLocalSet(STORAGE_KEY, JSON.stringify(p));
}

// ─── Store ────────────────────────────────────────────────────────────

type Store = {
  activities: AiActivity[];
  prefs: ActivityPrefs;

  // activity actions — called by ChatAgent integration or the demo simulator
  upsertActivity: (a: AiActivity) => void;
  removeActivity: (chatId: string) => void;
  clearActivities: () => void;

  // prefs actions — called by ActivityControlPanel
  setPref: <K extends keyof ActivityPrefs>(key: K, value: ActivityPrefs[K]) => void;
  resetPrefs: () => void;
};

export const useActivityStore = create<Store>()(subscribeWithSelector((set, get) => ({
  activities: [],
  prefs: loadPrefs(),

  upsertActivity: (a) => { set((s) => {
    const next = s.activities.filter((x) => x.chatId !== a.chatId);
    next.push(a);
    // Honor the cap by dropping the oldest. Keep insertion order otherwise.
    while (next.length > s.prefs.maxConcurrent) next.shift();
    return { activities: next };
  }); },

  removeActivity: (chatId) => { set((s) => ({
    activities: s.activities.filter((x) => x.chatId !== chatId),
  })); },

  clearActivities: () => { set({ activities: [] }); },

  setPref: (key, value) => {
    const next = { ...get().prefs, [key]: value };
    persistPrefs(next);
    set({ prefs: next });
  },

  resetPrefs: () => {
    persistPrefs(PREFS_DEFAULTS);
    set({ prefs: PREFS_DEFAULTS });
  },
})));
