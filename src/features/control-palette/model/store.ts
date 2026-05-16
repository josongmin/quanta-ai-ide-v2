// Global control-palette store. Three responsibilities:
//   1. Expose `open` / `setOpen` / `toggle` so any component can drive
//      the palette (the global Cmd-K listener is one such consumer; an
//      AppShell button is another).
//   2. Maintain a *recents* MRU list of visited routes — bounded to
//      MAX_RECENTS so the palette doesn't become a history archive.
//   3. Track a tiny "last opened at" timestamp so the renderer can
//      reset its query/cursor on every fresh open without prop drilling.

import { create } from 'zustand';

const MAX_RECENTS = 5;

type State = {
  open: boolean;
  // Bumps every time `open` flips true. The renderer keys off this to
  // reset internal state (query, highlight) — equivalent to remounting
  // the panel without the cost of unmount/mount.
  openedAt: number;
  recents: string[]; // route paths, MRU first

  setOpen: (next: boolean) => void;
  toggle: () => void;
  pushRecent: (path: string) => void;
  clearRecents: () => void;
};

export const useControlPaletteStore = create<State>()((set) => ({
  open: false,
  openedAt: 0,
  recents: [],

  setOpen: (next) => {
    set((s) => (next === s.open
      ? s
      : { open: next, openedAt: next ? Date.now() : s.openedAt }));
  },
  toggle: () => {
    set((s) => ({ open: !s.open, openedAt: !s.open ? Date.now() : s.openedAt }));
  },

  pushRecent: (path) => {
    set((s) => {
      const next = [path, ...s.recents.filter((p) => p !== path)].slice(0, MAX_RECENTS);
      // Avoid pointless re-renders when the head didn't change.
      if (next.length === s.recents.length && next.every((p, i) => p === s.recents[i])) {
        return s;
      }
      return { recents: next };
    });
  },

  clearRecents: () => { set({ recents: [] }); },
}));
