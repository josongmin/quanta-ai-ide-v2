import { useEffect, useRef, type RefObject } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { STORAGE_KEY_PREFIX } from './storageKeys';
import { safeSessionGet, safeSessionSet } from './safeStorage';

const STORAGE_PREFIX = STORAGE_KEY_PREFIX.scroll;

function readKey(scope: string, routeKey: string): number | null {
  const raw = safeSessionGet(`${STORAGE_PREFIX}${scope}:${routeKey}`);
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function writeKey(scope: string, routeKey: string, top: number) {
  // Quota / disabled storage is swallowed by safeSessionSet.
  safeSessionSet(`${STORAGE_PREFIX}${scope}:${routeKey}`, String(top));
}

type Options = {
  // Tab-host visibility. The keep-mounted tab host hides inactive panels
  // with `display:none`, which DROPS the scroll container's scrollTop on
  // re-show (state/effects survive, scroll offset does not). Pass the
  // panel's visibility so we can save on hide and restore on re-show.
  // Defaults to `true` (non-tab routes are always "visible").
  visible?: boolean;
};

// Preserve the scroll position of an internal scroll container across
// navigation away-and-back and across tab-host hide/show.
//
// Keyed by `scope + pathname + search` — deliberately NOT by
// `location.state.key`. The router mints a fresh `state.key` on every
// navigation, so keying on it means a position saved on one visit can
// never be read on the next visit (the key changed) — restoration only
// ever worked for browser Back to the exact same history entry. A
// stable per-route key makes "leave the page, come back, land where I
// was" work, which is what's actually expected.
//
// `scope` namespaces the storage key — pass a stable id per container.
// The ref must point at the element that owns `overflow-y-auto`.
export function useScrollRestoration(
  scope: string,
  ref: RefObject<HTMLElement | null>,
  opts: Options = {},
) {
  const { visible = true } = opts;
  const routeKey = useRouterState({
    select: (s) => `${s.location.pathname}${s.location.searchStr}`,
  });
  const restoredFor = useRef<string | null>(null);
  const prevVisible = useRef(visible);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf1 = 0;
    let raf2 = 0;
    let writeFrame = 0;

    const restore = () => {
      const saved = readKey(scope, routeKey);
      if (saved == null) return;
      // Two rAFs: first lets React commit and lay out, second lets the
      // browser paint at the new size before we set scrollTop. Without
      // this, content height can still be 0 and the assignment is a no-op.
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          el.scrollTop = saved;
        });
      });
    };

    // (a) First mount / route changed: restore for the new route.
    if (restoredFor.current !== routeKey) {
      restore();
      restoredFor.current = routeKey;
    }

    // (b) Tab-host visibility transition. Going hidden → persist now
    // (display:none is about to discard scrollTop). Coming back visible
    // → re-apply, because the browser reset it to 0 while hidden.
    if (prevVisible.current !== visible) {
      if (!visible) {
        writeKey(scope, routeKey, el.scrollTop);
      } else {
        restore();
      }
      prevVisible.current = visible;
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
      // Only persist a *real* offset. While hidden the browser has
      // already zeroed scrollTop; writing that would clobber the good
      // value saved by the hide-transition branch above.
      if (visible) writeKey(scope, routeKey, el.scrollTop);
      el.removeEventListener('scroll', onScroll);
      if (writeFrame) cancelAnimationFrame(writeFrame);
      if (raf1) cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [scope, routeKey, ref, visible]);
}
