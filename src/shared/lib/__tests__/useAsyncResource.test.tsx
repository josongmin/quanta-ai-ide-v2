import { describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAsyncResource, type AsyncResult } from '../useAsyncResource';

// A fetcher whose resolution the test controls, so we can assert ordering.
function deferred<T>() {
  let resolve!: (v: AsyncResult<T>) => void;
  const promise = new Promise<AsyncResult<T>>((r) => { resolve = r; });
  return { promise, resolve };
}

describe('useAsyncResource', () => {
  it('first load: pending → data, no error', async () => {
    const { result } = renderHook(() =>
      useAsyncResource<number>(async () => ({ ok: true, data: 42 }), []),
    );
    expect(result.current.isPending).toBe(true);
    expect(result.current.data).toBeNull();
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.data).toBe(42);
    expect(result.current.error).toBeNull();
  });

  it('surfaces a tagged error and leaves data null on first load', async () => {
    const { result } = renderHook(() =>
      useAsyncResource<number>(async () => ({ ok: false, error: 'boom' }), []),
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.error).toBe('boom');
    expect(result.current.data).toBeNull();
  });

  it('refetch KEEPS the current data on screen (no skeleton flash)', async () => {
    let value = 1;
    const { result } = renderHook(() =>
      useAsyncResource<number>(async () => ({ ok: true, data: value }), []),
    );
    await waitFor(() => expect(result.current.data).toBe(1));
    value = 2;
    act(() => { result.current.refetch(); });
    // data stays 1 while the refetch is in flight — never blanks to null
    expect(result.current.data).toBe(1);
    await waitFor(() => expect(result.current.data).toBe(2));
  });

  it('changing resetKey BLANKS data and shows the skeleton again', async () => {
    let key = 'a';
    const { result, rerender } = renderHook(() =>
      useAsyncResource<string>(async () => ({ ok: true, data: `data-${key}` }), [key], key),
    );
    await waitFor(() => expect(result.current.data).toBe('data-a'));
    key = 'b';
    rerender();
    // identity changed → blank + skeleton, not stale 'data-a'
    expect(result.current.data).toBeNull();
    expect(result.current.isPending).toBe(true);
    await waitFor(() => expect(result.current.data).toBe('data-b'));
  });

  it('active-guard: an out-of-order stale resolve never clobbers newer state', async () => {
    const slow = deferred<string>();
    let phase: 'slow' | 'fast' = 'slow';
    const { result, rerender } = renderHook(() =>
      useAsyncResource<string>(
        () => (phase === 'slow' ? slow.promise : Promise.resolve({ ok: true, data: 'fast' })),
        [phase],
        phase,
      ),
    );
    // switch to the fast resource before the slow one resolves
    phase = 'fast';
    rerender();
    await waitFor(() => expect(result.current.data).toBe('fast'));
    // now the stale slow fetch resolves — must be ignored
    act(() => { slow.resolve({ ok: true, data: 'STALE' }); });
    await Promise.resolve();
    expect(result.current.data).toBe('fast');
  });
});
