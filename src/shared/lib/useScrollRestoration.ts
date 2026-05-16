import { useEffect, useRef, type RefObject } from 'react';
import { useRouterState } from '@tanstack/react-router';

const STORAGE_PREFIX = 'scroll:';

function readKey(scope: string, routeKey: string): number | null {
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${scope}:${routeKey}`);
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function writeKey(scope: string, routeKey: string, top: number) {
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${scope}:${routeKey}`, String(top));
  } catch {
    // Quota / disabled storage — silently drop.
  }
}

// Preserve the scroll position of an internal scroll container across
// unmount/remount cycles (e.g. navigating into a detail page and coming
// back). Keyed by router location, so each route gets its own slot and
// the value survives only inside the current tab session.
//
// `scope` namespaces the storage key — pass a stable id per container.
// The ref must point at the element that owns `overflow-y-auto`.
export function useScrollRestoration(
  scope: string,
  ref: RefObject<HTMLElement | null>,
) {
  const routeKey = useRouterState({
    select: (s) =>
      s.location.state.key ?? `${s.location.pathname}${s.location.searchStr}`,
  });
  const restoredFor = useRef<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf1 = 0;
    let raf2 = 0;
    let writeFrame = 0;

    if (restoredFor.current !== routeKey) {
      const saved = readKey(scope, routeKey);
      if (saved != null) {
        // Two rAFs: first lets React commit and lay out, second lets the
        // browser paint at the new size before we set scrollTop. Without
        // this, content height can still be 0 and the assignment is a no-op.
        raf1 = requestAnimationFrame(() => {
          raf2 = requestAnimationFrame(() => {
            el.scrollTop = saved;
          });
        });
      }
      restoredFor.current = routeKey;
    }

    const onScroll = () => {
      if (writeFrame) return;
      writeFrame = requestAnimationFrame(() => {
        writeFrame = 0;
        writeKey(scope, routeKey, el.scrollTop);
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      writeKey(scope, routeKey, el.scrollTop);
      el.removeEventListener('scroll', onScroll);
      if (writeFrame) cancelAnimationFrame(writeFrame);
      if (raf1) cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [scope, routeKey, ref]);
}
