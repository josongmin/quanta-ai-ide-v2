import { useEffect, useState } from 'react';
import { SkeletonText } from './Skeleton';

// Suspense fallback for lazy routes/panels. Renders NOTHING for the first
// `delayMs` so prefetched chunks (the common case) show no flash; only a slow
// load surfaces a subtle skeleton. Replaces the bare `fallback={null}` at
// lazy boundaries and is the default loading state when routes become async.
export function RouteFallback({ delayMs = 250 }: { delayMs?: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => { setShow(true); }, delayMs);
    return () => { window.clearTimeout(id); };
  }, [delayMs]);

  if (!show) return null;
  return (
    <div className="p-6 max-w-2xl">
      <SkeletonText lines={4} />
    </div>
  );
}
