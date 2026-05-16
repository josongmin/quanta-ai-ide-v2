import { useCallback, useEffect, useRef, useState } from 'react';
import { Square } from 'lucide-react';

// Stop button with press-and-hold safety. Heat 0 (first 5s) is a normal
// click — the user just kicked it off, accidental cancel is cheap. Heat
// 1+ requires 400ms hold; a circular progress ring fills as the user
// holds. Releasing early surfaces the original label so the affordance
// stays discoverable. Vercel's "press to cancel" flow.
export function PressHoldStop({
  heat, onStop, styles, label, holdLabel,
}: {
  heat: 0 | 1 | 2;
  onStop?: () => void;
  styles: string;
  label: string;
  holdLabel: string;
}) {
  const HOLD_MS = 400;
  const [progress, setProgress] = useState(0); // 0..1 while holding
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const firedRef = useRef(false);

  const stopProgress = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    startRef.current = null;
    setProgress(0);
  }, []);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  function tick() {
    if (startRef.current == null) return;
    const elapsed = performance.now() - startRef.current;
    const p = Math.min(1, elapsed / HOLD_MS);
    setProgress(p);
    if (p >= 1 && !firedRef.current) {
      firedRef.current = true;
      onStop?.();
      stopProgress();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault();
    if (heat === 0) {
      onStop?.();
      return;
    }
    firedRef.current = false;
    startRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  }

  function onPointerEnd() {
    if (!firedRef.current) stopProgress();
  }

  const radius = 8;
  const circ = 2 * Math.PI * radius;
  const dash = circ * progress;

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerEnd}
      onPointerLeave={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStop?.(); }
      }}
      className={`flex items-center gap-1.5 h-7 px-3 rounded-md text-[11px] font-semibold transition-colors select-none touch-none ${styles}`}
      aria-label={heat === 0 ? label : holdLabel}
      title={heat === 0 ? label : holdLabel}
    >
      {heat === 0 ? (
        <Square className="w-2.5 h-2.5" fill="currentColor" />
      ) : (
        <span className="relative w-3 h-3 inline-flex items-center justify-center">
          {/* progress ring overlay */}
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 24 24" width="12" height="12">
            <circle
              cx="12" cy="12" r={radius}
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.25"
              strokeWidth="2.5"
            />
            <circle
              cx="12" cy="12" r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ}`}
              style={{ transition: progress === 0 ? 'stroke-dasharray 120ms ease-out' : undefined }}
            />
          </svg>
          <Square className="w-1.5 h-1.5" fill="currentColor" />
        </span>
      )}
      {heat === 0 ? label : (progress > 0.05 ? holdLabel : label)}
    </button>
  );
}
