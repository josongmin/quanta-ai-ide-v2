import { useEffect, useRef, type RefObject } from 'react';
import { useUIRuntime, useUiScope } from './runtime/UIRuntimeProvider';
import type { LayerKind } from './runtime/types';

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
    .filter((element) => !element.hasAttribute('inert') && element.offsetParent !== null);
}

function trapTab(root: HTMLElement, event: KeyboardEvent): boolean {
  if (event.key !== 'Tab') return false;
  const focusables = getFocusable(root);
  if (focusables.length === 0) {
    root.focus({ preventScroll: true });
    return true;
  }
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement as HTMLElement | null;
  if (event.shiftKey && (active === first || !root.contains(active))) {
    last?.focus({ preventScroll: true });
    return true;
  }
  if (!event.shiftKey && active === last) {
    first?.focus({ preventScroll: true });
    return true;
  }
  return false;
}

type Options = {
  kind?: LayerKind;
  modal?: boolean;
};

export function useDialogA11y(
  ref: RefObject<HTMLElement>,
  open: boolean,
  onClose: () => void,
  options: Options = {},
): void {
  const runtime = useUIRuntime();
  const scope = useUiScope();
  const closeRef = useRef(onClose);
  const kind = options.kind ?? 'modal';
  const modal = options.modal ?? false;

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const root = ref.current;
    if (!root) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusTimer = window.setTimeout(() => {
      const target = getFocusable(root)[0] ?? root;
      target.focus({ preventScroll: true });
    }, 0);
    const layer = runtime.layers.register({
      kind,
      modal,
      owner: scope.owner,
      onClose: () => { closeRef.current(); },
      onKeyDown: (event) => trapTab(root, event),
    });

    return () => {
      window.clearTimeout(focusTimer);
      layer.dispose();
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [kind, modal, open, ref, runtime, scope.owner]);
}
