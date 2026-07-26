import { useCallback, useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { isTauri, prewarmWindowDrag, startWindowDrag } from './runtime';

const SLOP_PX = 4;

// Only elements that own a real click/press gesture opt out of the window drag,
// so the GNB behaves like a native titlebar: press+move anywhere — INCLUDING
// over a tab chip (a role=tab div, deliberately NOT excluded) — drags the
// window, while a plain click still activates the tab. Buttons/links/form
// controls keep their own gesture. Tab reorder lives behind Alt+drag (see the
// strip), and `[data-no-window-drag]` is the opt-out for any other custom-
// pointer region.
const INTERACTIVE_SELECTOR =
  'button, a, input, select, textarea, [contenteditable]:not([contenteditable="false"]), [data-no-window-drag]';

// With `dragOverControls`, buttons/avatars/etc. stay clickable but a press
// that MOVES becomes a window drag — the strongest titlebar semantics. Text
// inputs and custom-pointer regions still keep their gestures (caret drags
// and in-app DnD would otherwise be impossible).
const ALWAYS_EXEMPT_SELECTOR =
  'input, select, textarea, [contenteditable]:not([contenteditable="false"]), [data-no-window-drag]';

// Turns a container into a macOS-titlebar-grade drag handle: press and move
// past a small slop → the OS window drag takes over, regardless of what
// non-interactive child was under the pointer. A plain click (press + release
// without movement) is untouched, so children keep their click semantics.
// Alt+drag is deliberately ignored — it is the escape hatch for in-app drag
// interactions (e.g. HTML5 tab-reorder DnD). No-op outside Tauri.
export function useWindowDragHandle(
  options?: { dragOverControls?: boolean },
): (e: ReactPointerEvent) => void {
  const dragOverControls = options?.dragOverControls ?? false;
  const cleanupRef = useRef<(() => void) | null>(null);

  // The @tauri-apps/api chunk must already be resolved when the user grabs the
  // header — importing it inside the gesture misses the drag entirely.
  useEffect(() => { prewarmWindowDrag(); }, []);

  return useCallback((e: ReactPointerEvent) => {
    if (!isTauri()) return;
    if (e.button !== 0 || e.altKey) return;
    const target = e.target as Element;
    if (target.closest(dragOverControls ? ALWAYS_EXEMPT_SELECTOR : INTERACTIVE_SELECTOR)) return;

    // A previous session can linger if the OS drag swallowed pointerup.
    cleanupRef.current?.();

    const startX = e.clientX;
    const startY = e.clientY;
    const cleanup = () => {
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', cleanup, true);
      window.removeEventListener('pointercancel', cleanup, true);
      cleanupRef.current = null;
    };
    const onMove = (ev: PointerEvent) => {
      if (Math.abs(ev.clientX - startX) < SLOP_PX && Math.abs(ev.clientY - startY) < SLOP_PX) return;
      cleanup();
      void startWindowDrag();
    };
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', cleanup, true);
    window.addEventListener('pointercancel', cleanup, true);
    cleanupRef.current = cleanup;
  }, [dragOverControls]);
}
