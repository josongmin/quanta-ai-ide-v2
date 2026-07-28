import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AsyncResult } from './useAsyncResource';

export type PageSlice<Item> = { items: Item[]; cursor: string | null };

/**
 * Cursor "load more" on top of a useAsyncResource first page. Consolidates the
 * append-pages-keyed-to-first-page-identity pattern that AdminReal (twice) and
 * AuditReal each hand-rolled: the FIRST page (and its cursor) come from the
 * caller's useAsyncResource; further pages are appended locally; and when a NEW
 * first page lands (a filter/org change or a refetch mints a fresh object) the
 * appended pages are discarded so stale rows never bleed across.
 *
 * Semantics preserved from those hand-rolls:
 *  - the appended state resets during RENDER (React's adjust-state-on-input),
 *    never in an effect, keyed on the `firstPage` object identity;
 *  - `loadMore` snapshots the first-page identity and DROPS its result if the
 *    identity changed mid-flight (a filter changed while a page was loading), so
 *    it can't append the now-stale page onto the new list or clobber the cursor;
 *  - `cursor` is the appended cursor once any page has loaded, otherwise the
 *    first page's cursor (an `undefined` sentinel distinguishes "no page loaded
 *    yet" from "loaded, next cursor is null").
 *
 * Components that also mutate their list locally (optimistic read-toggles, etc.)
 * or track extra per-page aggregates deliberately do NOT use this — their list
 * is mutable state, not a derived append (e.g. InboxReal).
 *
 * CONTRACT: `firstPage` must have a STABLE identity across renders that changes
 * only when the underlying page actually changes — exactly what a
 * useAsyncResource `data` gives you. Passing a freshly-built object every render
 * would reset on every render (and loop).
 */
export function useAppendedPages<T, Item>(
  firstPage: T | null,
  select: (page: T) => PageSlice<Item>,
  fetchMore: (cursor: string) => Promise<AsyncResult<PageSlice<Item>>>,
): { items: Item[]; cursor: string | null; loadingMore: boolean; error: string | null; loadMore: () => void; clearError: () => void } {
  const first = useMemo<PageSlice<Item>>(
    () => (firstPage ? select(firstPage) : { items: [], cursor: null }),
    // Re-derive only when the first-page object identity changes; `select` is a
    // per-render closure and is intentionally excluded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [firstPage],
  );

  const [pages, setPages] = useState<{
    key: T | null;
    more: Item[];
    cursor: string | null | undefined;
    error: string | null;
  }>({ key: null, more: [], cursor: undefined, error: null });

  // A fresh first page discards the appended pages (adjust-state-on-input).
  if (pages.key !== firstPage) {
    setPages({ key: firstPage, more: [], cursor: undefined, error: null });
  }
  const fresh = pages.key === firstPage;

  const items = useMemo(
    () => (fresh ? [...first.items, ...pages.more] : first.items),
    [fresh, first.items, pages.more],
  );
  const cursor = fresh && pages.cursor !== undefined ? pages.cursor : first.cursor;

  const [loadingMore, setLoadingMore] = useState(false);
  // Latest first-page identity, read inside the async loadMore to detect a
  // filter/refetch that landed mid-flight. Written in an effect (not render).
  const firstRef = useRef(firstPage);
  const mountedRef = useRef(true);
  useEffect(() => {
    firstRef.current = firstPage;
  });
  useEffect(() => () => { mountedRef.current = false; }, []);

  // Clear a stale "load more failed" banner — used by a Retry affordance that
  // reloads the first page, restoring the immediate clear the hand-rolled
  // versions did (`setActionError(null); refetch()`).
  const clearError = useCallback(() => {
    setPages((prev) => (prev.error == null ? prev : { ...prev, error: null }));
  }, []);

  const loadMore = useCallback(() => {
    if (loadingMore || !cursor) return;
    const snapshot = firstRef.current;
    setLoadingMore(true);
    void fetchMore(cursor).then((res) => {
      // Unmounted mid-flight → drop (no setState on a dead component).
      if (!mountedRef.current) return;
      // Filter/refetch changed the first page while this was in flight → drop it.
      if (firstRef.current !== snapshot) { setLoadingMore(false); return; }
      setLoadingMore(false);
      setPages((prev) =>
        res.ok
          ? { ...prev, more: [...prev.more, ...res.data.items], cursor: res.data.cursor, error: null }
          : { ...prev, error: res.error },
      );
    });
  }, [loadingMore, cursor, fetchMore]);

  return { items, cursor, loadingMore, error: pages.error, loadMore, clearError };
}
