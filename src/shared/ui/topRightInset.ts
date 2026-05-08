import { useEffect } from 'react';
import { create } from 'zustand';

// Coordinates the top-right "safe zone" between floating UI surfaces.
//
// Multiple components live in the absolute top-right corner of the app
// (PR preview bar, AI chat triggers, the inspector panel, etc.). They
// don't know about each other directly — without coordination they pile
// up on the same z-index and the later-mounted one occludes whatever sits
// underneath, hiding click targets the user can't get to.
//
// Each occluder calls `useReserveTopRightInset(width, when)` to publish
// how many pixels of the right edge it occupies (panel width + outer
// margin). Other surfaces read `useTopRightInset()` and shift their
// `right` offset by that amount, so they stay visible to the left of the
// occluder.
//
// Multiple reservers stack — the *largest* current claim wins (callers
// overlapping at the same x already overlap each other; we just need to
// clear the broadest one).

type Inset = { id: string; width: number };

type State = {
  insets: Inset[];
  reserve: (id: string, width: number) => void;
  release: (id: string) => void;
};

const useStore = create<State>((set) => ({
  insets: [],
  reserve: (id, width) => { set((s) => {
    const others = s.insets.filter((i) => i.id !== id);
    return { insets: [...others, { id, width }] };
  }); },
  release: (id) => { set((s) => ({ insets: s.insets.filter((i) => i.id !== id) })); },
}));

/** Read the current top-right inset (px). */
export function useTopRightInset(): number {
  return useStore((s) => s.insets.reduce((m, i) => Math.max(m, i.width), 0));
}

/**
 * Publish that this component occupies `width` pixels along the right edge
 * (panel + outer margin). Pass a stable `id` so updates replace your prior
 * claim rather than stacking. Pass `width <= 0` (or `enabled === false`)
 * to release the claim without unmounting.
 */
export function useReserveTopRightInset(id: string, width: number, enabled = true): void {
  const reserve = useStore((s) => s.reserve);
  const release = useStore((s) => s.release);
  useEffect(() => {
    if (!enabled || width <= 0) {
      release(id);
      return;
    }
    reserve(id, width);
    return () => { release(id); };
  }, [id, width, enabled, reserve, release]);
}
