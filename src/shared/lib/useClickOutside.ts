import { useEffect, type RefObject } from 'react';

// Subscribes a mousedown listener that fires `onOutside` when the click
// target isn't inside `ref`. Listener is on window, passive, and cleans up
// only while `enabled` is true to avoid keeping handlers alive on closed popovers.
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  enabled: boolean,
  onOutside: () => void,
): void {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: MouseEvent) => {
      const el = ref.current;
      if (el && !el.contains(e.target as Node)) onOutside();
    };
    window.addEventListener('mousedown', handler);
    return () => { window.removeEventListener('mousedown', handler); };
  }, [enabled, ref, onOutside]);
}
