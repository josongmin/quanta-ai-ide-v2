import { useEffect, type KeyboardEvent, type RefObject } from 'react';

// WAI-ARIA roving focus for a `role="menu"` container: Arrow Up/Down wrap,
// Home/End jump, and (optionally) focus moves to the first item on mount.
// Extracted from three verbatim copies (settings-kit RowMenu, public-stage
// admin RowMenu, coding-stage TurnContextMenu).
//
//   const menuRef = useRef<HTMLDivElement>(null);
//   const { onKeyDown: onRove } = useRovingMenuFocus(menuRef);
//   const onKeyDown = (e) => {
//     if (onRove(e)) return;          // consumed an arrow/home/end key
//     if (e.key === 'Escape') close();
//   };
//
// Escape / Tab / close are deliberately left to the caller — they're 1-3 lines
// and genuinely per-menu policy (restore focus to trigger, unmount, etc.).
export function useRovingMenuFocus(
  containerRef: RefObject<HTMLElement | null>,
  opts: { focusOnMount?: boolean; skipDisabled?: boolean } = {},
): { onKeyDown: (e: KeyboardEvent) => boolean } {
  const { focusOnMount = true, skipDisabled = true } = opts;
  const selector = skipDisabled
    ? '[role="menuitem"]:not([disabled])'
    : '[role="menuitem"]';

  // Menus in this codebase mount only while open, so mount === open: move focus
  // to the first item so keyboard users land inside the menu.
  useEffect(() => {
    if (!focusOnMount) return;
    containerRef.current?.querySelector<HTMLElement>(selector)?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onKeyDown = (e: KeyboardEvent): boolean => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' &&
        e.key !== 'Home' && e.key !== 'End') {
      return false;
    }
    e.preventDefault();
    const nodes = Array.from(
      containerRef.current?.querySelectorAll<HTMLElement>(selector) ?? [],
    );
    if (nodes.length === 0) return true;
    const idx = nodes.indexOf(document.activeElement as HTMLElement);
    const n = nodes.length;
    if (e.key === 'ArrowDown') nodes[(idx + 1 + n) % n]?.focus();
    else if (e.key === 'ArrowUp') nodes[(idx - 1 + n) % n]?.focus();
    else if (e.key === 'Home') nodes[0]?.focus();
    else nodes[n - 1]?.focus();
    return true;
  };

  return { onKeyDown };
}
