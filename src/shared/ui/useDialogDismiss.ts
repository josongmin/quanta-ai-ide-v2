import { useEffect, type RefObject } from 'react';

// Dismiss plumbing for portal-based popovers, where the panel is rendered to
// `document.body` and therefore lives *outside* the trigger wrapper in the DOM.
// The shared `useClickOutside` only knows about a single ref and would treat a
// click inside the portal panel as "outside" — so it can't be reused here.
//
// This hook wires the three dismiss concerns as a single cohesive unit, only
// while `enabled` is true:
//
//   1. Escape key      → close
//   2. focusin         → close when focus leaves both the wrapper and the panel
//   3. mousedown       → close when the click is outside both the wrapper and
//                        the portal panel
//
// `wrapRef` is the trigger wrapper; `panelRef` is the portal-rendered panel.
// Both are treated as "inside" so interacting with either keeps the popover open.
export function useDialogDismiss(
  wrapRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  onClose: () => void,
): void {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      const inWrap = wrapRef.current?.contains(target);
      const inPanel = panelRef.current?.contains(target);
      if (!inWrap && !inPanel) onClose();
    };
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (wrapRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [enabled, onClose, wrapRef, panelRef]);
}
