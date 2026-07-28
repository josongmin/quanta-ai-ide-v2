import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, cleanup, waitFor } from '@testing-library/react';
import { useAppendedPages, type PageSlice } from '../useAppendedPages';
import type { AsyncResult } from '../useAsyncResource';

afterEach(cleanup);

type Row = { id: number };
type Page = { rows: Row[]; next: string | null };
const select = (p: Page): PageSlice<Row> => ({ items: p.rows, cursor: p.next });

function page(ids: number[], next: string | null): Page {
  return { rows: ids.map((id) => ({ id })), next };
}
const ok = (ids: number[], next: string | null): AsyncResult<PageSlice<Row>> =>
  ({ ok: true, data: { items: ids.map((id) => ({ id })), cursor: next } });

function deferred<V>() {
  let resolve!: (v: V) => void;
  const promise = new Promise<V>((r) => { resolve = r; });
  return { promise, resolve };
}

const ids = (rows: Row[]) => rows.map((r) => r.id);

describe('useAppendedPages', () => {
  it('exposes the first page items + cursor, empty when firstPage is null', () => {
    const { result, rerender } = renderHook(
      ({ fp }: { fp: Page | null }) => useAppendedPages<Page, Row>(fp, select, () => Promise.resolve(ok([], null))),
      { initialProps: { fp: null as Page | null } },
    );
    expect(result.current.items).toEqual([]);
    expect(result.current.cursor).toBeNull();

    rerender({ fp: page([1, 2], 'c1') });
    expect(ids(result.current.items)).toEqual([1, 2]);
    expect(result.current.cursor).toBe('c1');
  });

  it('appends further pages and advances the cursor on loadMore', async () => {
    const fetchMore = vi.fn((): Promise<AsyncResult<PageSlice<Row>>> => Promise.resolve(ok([3, 4], 'c2')));
    const first = page([1, 2], 'c1');
    const { result } = renderHook(() => useAppendedPages<Page, Row>(first, select, fetchMore));

    act(() => { result.current.loadMore(); });
    await waitFor(() => { expect(ids(result.current.items)).toEqual([1, 2, 3, 4]); });
    expect(fetchMore).toHaveBeenCalledWith('c1');
    expect(result.current.cursor).toBe('c2');
  });

  it('is a no-op when there is no cursor', () => {
    const fetchMore = vi.fn((): Promise<AsyncResult<PageSlice<Row>>> => Promise.resolve(ok([], null)));
    const first = page([1], null);
    const { result } = renderHook(() => useAppendedPages<Page, Row>(first, select, fetchMore));
    act(() => { result.current.loadMore(); });
    expect(fetchMore).not.toHaveBeenCalled();
  });

  it('discards appended pages when a new first-page identity lands', async () => {
    const fetchMore = vi.fn((): Promise<AsyncResult<PageSlice<Row>>> => Promise.resolve(ok([3], 'c2')));
    const { result, rerender } = renderHook(
      ({ fp }: { fp: Page }) => useAppendedPages<Page, Row>(fp, select, fetchMore),
      { initialProps: { fp: page([1, 2], 'c1') } },
    );
    act(() => { result.current.loadMore(); });
    await waitFor(() => { expect(ids(result.current.items)).toEqual([1, 2, 3]); });

    // A fresh first page (new object) resets the appended rows + cursor.
    rerender({ fp: page([9], 'c9') });
    expect(ids(result.current.items)).toEqual([9]);
    expect(result.current.cursor).toBe('c9');
  });

  it('drops an in-flight page whose first-page identity changed mid-load (stale guard)', async () => {
    const d = deferred<AsyncResult<PageSlice<Row>>>();
    const fetchMore = vi.fn(() => d.promise);
    const { result, rerender } = renderHook(
      ({ fp }: { fp: Page }) => useAppendedPages<Page, Row>(fp, select, fetchMore),
      { initialProps: { fp: page([1, 2], 'c1') } },
    );
    act(() => { result.current.loadMore(); }); // in flight against the old first page

    // Filter changes: a new first page lands before the load resolves.
    rerender({ fp: page([5, 6], 'c5') });
    // Now resolve the stale load — it must NOT append onto the new list.
    await act(async () => { d.resolve(ok([99], 'c2')); await d.promise; });

    expect(ids(result.current.items)).toEqual([5, 6]);
    expect(result.current.cursor).toBe('c5');
    expect(result.current.loadingMore).toBe(false);
  });

  it('surfaces a fetchMore error without mutating the list', async () => {
    const fetchMore = vi.fn((): Promise<AsyncResult<PageSlice<Row>>> => Promise.resolve({ ok: false, error: 'boom' }));
    const first = page([1], 'c1');
    const { result } = renderHook(() => useAppendedPages<Page, Row>(first, select, fetchMore));
    act(() => { result.current.loadMore(); });
    await waitFor(() => { expect(result.current.error).toBe('boom'); });
    expect(ids(result.current.items)).toEqual([1]);
  });

  it('clears a prior error when a later loadMore succeeds', async () => {
    const fetchMore = vi.fn<(cursor: string) => Promise<AsyncResult<PageSlice<Row>>>>()
      .mockResolvedValueOnce({ ok: false, error: 'boom' })
      .mockResolvedValueOnce(ok([3], null));
    const first = page([1], 'c1');
    const { result } = renderHook(() => useAppendedPages<Page, Row>(first, select, fetchMore));
    act(() => { result.current.loadMore(); });
    await waitFor(() => { expect(result.current.error).toBe('boom'); });
    act(() => { result.current.loadMore(); });
    await waitFor(() => { expect(ids(result.current.items)).toEqual([1, 3]); });
    expect(result.current.error).toBeNull();
  });

  it('clearError() dismisses a stale load-more error (Retry affordance)', async () => {
    const fetchMore = vi.fn((): Promise<AsyncResult<PageSlice<Row>>> => Promise.resolve({ ok: false, error: 'boom' }));
    const first = page([1], 'c1');
    const { result } = renderHook(() => useAppendedPages<Page, Row>(first, select, fetchMore));
    act(() => { result.current.loadMore(); });
    await waitFor(() => { expect(result.current.error).toBe('boom'); });
    act(() => { result.current.clearError(); });
    expect(result.current.error).toBeNull();
  });
});
