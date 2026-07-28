import { useCallback, useEffect, useRef, useState } from 'react';

export type AsyncResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type AsyncResource<T> = {
  data: T | null;
  isPending: boolean;
  error: string | null;
  /** Re-run the fetcher, keeping the current data visible (no skeleton flash). */
  refetch: () => void;
};

/**
 * The one data-fetch hook. Replaces ~15 hand-rolled copies of
 * `useState(data/loading/error/nonce) + refetch=setNonce(n=>n+1) + useEffect(let
 * active=true … .finally(setLoading(false)))`. Owning it once fixes the latent
 * race those copies risked (some kept the active-guard, some the keep-stale
 * behavior, some neither) and puts cross-cutting concerns (cancellation,
 * first-load-skeleton-vs-refetch) in a single place.
 *
 * Semantics (from the careful useOrg reference):
 *  - `isPending` starts true; a REFETCH keeps the previous `data` on screen
 *    (no blanking) so scroll/expand/focus survive.
 *  - when `resetKey` CHANGES the resource identity (e.g. a new slug), the data
 *    is blanked and the skeleton returns.
 *  - a stale in-flight response never lands (active-guard), so an out-of-order
 *    resolve can't clobber newer state.
 *
 * @param fetcher returns a tagged AsyncResult; also receives an `isActive()`
 *                probe for callers that want to bail early.
 * @param deps    re-fetch when any change (like a useEffect dep list).
 * @param resetKey identity of the resource; changing it blanks + shows skeleton.
 */
export function useAsyncResource<T>(
  fetcher: (isActive: () => boolean) => Promise<AsyncResult<T>>,
  deps: React.DependencyList,
  resetKey?: unknown,
): AsyncResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [isPending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const loadedKey = useRef<unknown>(Symbol('unloaded'));
  // Keep the latest fetcher without re-running the fetch on its (usually inline,
  // per-render) identity — only deps/nonce/resetKey drive a refetch.
  const fetcherRef = useRef(fetcher);
  useEffect(() => { fetcherRef.current = fetcher; });

  const refetch = useCallback(() => { setNonce((n) => n + 1); }, []);

  useEffect(() => {
    let active = true;
    const isActive = () => active;
    const firstLoadForKey = loadedKey.current !== resetKey;
    /* eslint-disable react-hooks/set-state-in-effect -- skeleton reset before the keyed/nonce fetch */
    if (firstLoadForKey) {
      setPending(true);
      setData(null);
    }
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    void fetcherRef.current(isActive)
      .then((res) => {
        if (!active) return;
        if (res.ok) setData(res.data);
        else { setError(res.error); if (firstLoadForKey) setData(null); }
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (active) { setPending(false); loadedKey.current = resetKey; }
      });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are the caller's declared inputs + our refetch nonce
  }, [...deps, nonce, resetKey]);

  return { data, isPending, error, refetch };
}
