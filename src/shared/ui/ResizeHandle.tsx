import { useCallback, useEffect, useRef, useState } from 'react';

// Vertical edge resize handle. A 10px hit zone wraps a 1px hairline guide
// (fades in on hover/focus, stays on while dragging) and a centred 3-dot
// grip. Restrained — closer to native window separators than a feature
// accent, so it survives next to busy panel content without visual noise.
//
// `side` decides which edge the handle pins to and which drag direction
// grows the panel:
//   • side="left"  → handle on the panel's left edge;  dragging left grows it.
//                    (Used by right-anchored panels — e.g. inspector)
//   • side="right" → handle on the panel's right edge; dragging right grows it.
//                    (Used by left-anchored rails — e.g. task list)
//
// Width state lives in the parent, so persistence (localStorage, store, …)
// is the parent's call. This component just reports new widths via onChange.

type Props = {
  side: 'left' | 'right';
  width: number;
  min: number;
  /** Max width. If omitted, defaults to viewport - 96px. */
  max?: number;
  onChange: (next: number) => void;
  /** Reset target for double-click / Home key. Defaults to current width. */
  defaultWidth?: number;
  /** @deprecated Grip colours now derive from theme tokens; prop accepted for API compat but ignored. */
  isDark?: boolean;
  ariaLabel?: string;
  className?: string;
  /** Distance from the panel edge (px). Negative pushes outside the panel. */
  offset?: number;
  style?: React.CSSProperties;
};

export function ResizeHandle({
  side,
  width,
  min,
  max,
  onChange,
  defaultWidth,
  ariaLabel = 'Resize panel',
  className = '',
  offset = -5,
  style,
}: Props) {
  const [isResizing, setIsResizing] = useState(false);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  // Owns the in-flight drag's window listeners so they are torn down both on
  // pointerup AND if the handle unmounts mid-drag (otherwise they'd leak).
  const dragAbortRef = useRef<AbortController | null>(null);
  useEffect(() => () => { dragAbortRef.current?.abort(); }, []);

  const resolveMax = useCallback(
    () => max ?? Math.max(min, (typeof window !== 'undefined' ? window.innerWidth : min) - 96),
    [max, min],
  );

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startWidth: width };
    setIsResizing(true);

    const onMove = (ev: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      // For a left-edge handle, dragging LEFT (negative dx) grows the panel.
      // For a right-edge handle, dragging RIGHT (positive dx) grows it.
      const rawDelta = ev.clientX - drag.startX;
      const delta = side === 'left' ? -rawDelta : rawDelta;
      const next = Math.min(resolveMax(), Math.max(min, drag.startWidth + delta));
      onChange(next);
    };
    const onUp = (ev: PointerEvent) => {
      dragRef.current = null;
      setIsResizing(false);
      try { target.releasePointerCapture(ev.pointerId); } catch { /* already released */ }
      dragAbortRef.current?.abort();
      dragAbortRef.current = null;
    };
    dragAbortRef.current?.abort(); // defensive: end any prior drag before starting a new one
    const ac = new AbortController();
    dragAbortRef.current = ac;
    window.addEventListener('pointermove', onMove, { signal: ac.signal });
    window.addEventListener('pointerup', onUp, { signal: ac.signal });
    window.addEventListener('pointercancel', onUp, { signal: ac.signal });
  }, [width, side, min, resolveMax, onChange]);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const STEP = e.shiftKey ? 32 : 8;
    // Arrow that points AWAY from the panel grows it; toward shrinks it.
    const growKey = side === 'left' ? 'ArrowLeft' : 'ArrowRight';
    const shrinkKey = side === 'left' ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === growKey) {
      e.preventDefault();
      onChange(Math.min(resolveMax(), width + STEP));
    } else if (e.key === shrinkKey) {
      e.preventDefault();
      onChange(Math.max(min, width - STEP));
    } else if (e.key === 'Home' && defaultWidth != null) {
      e.preventDefault();
      onChange(defaultWidth);
    }
  }, [side, width, min, resolveMax, onChange, defaultWidth]);

  // Lock the cursor + suppress text selection globally while dragging so the
  // page doesn't flicker as the pointer crosses other elements.
  useEffect(() => {
    if (!isResizing) return;
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
    };
  }, [isResizing]);

  const edgeStyle: React.CSSProperties = side === 'left'
    ? { left: offset }
    : { right: offset };

  const lineColor = 'var(--border-strong)';
  const dotColor = 'var(--fg-muted)';

  return (
    // Resize-handle WAI-ARIA pattern uses role="separator" with interactive
    // pointer/key handlers — canonical pattern, but lint rule flags it.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuenow={Math.round(width)}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onDoubleClick={defaultWidth != null ? () => { onChange(defaultWidth); } : undefined}
      className={`group absolute top-0 bottom-0 pointer-events-auto outline-none ${className}`}
      style={{
        ...edgeStyle,
        width: 10,
        cursor: 'col-resize',
        touchAction: 'none',
        zIndex: 'var(--z-tooltip)',
        ...style,
      }}
    >
      <div
        className={`absolute top-0 bottom-0 left-1/2 transition-opacity duration-200 ease-out ${
          isResizing
            ? 'opacity-100'
            : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
        }`}
        style={{
          width: 1,
          transform: 'translateX(-0.5px)',
          background: lineColor,
        }}
      />
      <div
        className={`absolute left-1/2 top-1/2 flex flex-col items-center gap-[3px] transition-opacity duration-200 ease-out ${
          isResizing
            ? 'opacity-90'
            : 'opacity-0 group-hover:opacity-70 group-focus-visible:opacity-70'
        }`}
        style={{ transform: 'translate(-50%, -50%)' }}
        aria-hidden
      >
        <span className="block rounded-full" style={{ width: 2, height: 2, background: dotColor }} />
        <span className="block rounded-full" style={{ width: 2, height: 2, background: dotColor }} />
        <span className="block rounded-full" style={{ width: 2, height: 2, background: dotColor }} />
      </div>
    </div>
  );
}
