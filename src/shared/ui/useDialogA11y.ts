import { useEffect, type RefObject } from 'react';

// Shared a11y plumbing for `<Modal>` / `<Drawer>` (and any other dialog-like
// surface). Handles four concerns:
//
//   1. Auto-focus the first focusable element when `open` flips to true.
//   2. Trap Tab / Shift+Tab inside the dialog (loop at the boundaries).
//   3. Restore focus to the previously-active element on close.
//   4. Close on Escape via `onClose`.
//
// Callers are expected to:
//   • render a wrapper with `role="dialog"` + `aria-modal="true"` (and
//     optionally `aria-labelledby` / `aria-describedby`)
//   • pass that wrapper's ref as the first arg
//   • render the dialog only when `open` is true (the hook is no-op otherwise)

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]:not([contenteditable="false"])',
].join(',');

function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((el) => !el.hasAttribute('inert') && el.offsetParent !== null);
}

export function useDialogA11y(
  ref: RefObject<HTMLElement>,
  open: boolean,
  onClose: () => void,
): void {
  useEffect(() => {
    if (!open) return;
    const root = ref.current;
    if (!root) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Defer initial focus to the next frame so the dialog has actually
    // mounted and Tailwind/transition classes have settled.
    const focusTimer = window.setTimeout(() => {
      const focusables = getFocusable(root);
      const target = focusables[0] ?? root;
      target.focus({ preventScroll: true });
    }, 0);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusables = getFocusable(root);
      if (focusables.length === 0) {
        e.preventDefault();
        root.focus({ preventScroll: true });
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (active === first || !root.contains(active)) {
          e.preventDefault();
          last?.focus({ preventScroll: true });
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first?.focus({ preventScroll: true });
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKey);
      // Restore focus to whatever opened the dialog.
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [open, onClose, ref]);
}
