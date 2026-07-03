import type { ReactNode } from 'react';

// Pill-style segmented control used by Plan and Language switchers.
//
// Active pill glides between options via a layered "thumb" element that
// owns a CSS transition on `transform` and `width`. The buttons themselves
// stay flat (no per-button colour transition) so the moving pill is the
// only thing the eye tracks — keeps focus on the selection, not on rows
// of buttons relighting.
//
// Why measured-width over CSS-grid: the pill needs to render before its
// items mount (so the initial frame matches the active option without a
// jump), and grid would re-flow every time labels change locale. Manual
// measurement via a ref lets us cache widths and animate from any state.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

type Option<V extends string> = {
  value: V;
  label: ReactNode;
  disabled?: boolean;
};

type Props<V extends string> = {
  options: Option<V>[];
  value: V;
  onChange: (v: V) => void;
  ariaLabel?: string;
};

export function SegmentedToggle<V extends string>({
  options, value, onChange, ariaLabel,
}: Props<V>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [thumb, setThumb] = useState<{ x: number; w: number } | null>(null);
  // Latest `value` for the ResizeObserver callback so the observer can attach
  // once (deps `[]`) instead of being torn down and rebuilt on every change.
  // Sync in a layout effect (not during render) to satisfy `react-hooks/refs`.
  const valueRef = useRef(value);
  useLayoutEffect(() => { valueRef.current = value; }, [value]);

  // Recompute thumb geometry whenever `value` changes or the container
  // resizes (locale flips can change label widths in the same layout).
  useLayoutEffect(() => {
    const container = containerRef.current;
    const el = itemRefs.current[value];
    if (!container || !el) return;
    const cRect = container.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    setThumb({ x: eRect.left - cRect.left, w: eRect.width });
  }, [value, options]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => {
      const el = itemRefs.current[valueRef.current];
      if (!el) return;
      const cRect = container.getBoundingClientRect();
      const eRect = el.getBoundingClientRect();
      setThumb({ x: eRect.left - cRect.left, w: eRect.width });
    });
    ro.observe(container);
    return () => { ro.disconnect(); };
  }, []);

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label={ariaLabel}
      className="relative inline-flex items-stretch gap-1 p-1 rounded-xl"
      style={{
        background: 'var(--bg-surface-muted, rgba(0,0,0,0.04))',
        border: '1px solid var(--border-muted, rgba(0,0,0,0.06))',
      }}
    >
      {/* Sliding thumb */}
      {thumb && (
        <div
          aria-hidden
          className="absolute top-1 bottom-1 rounded-lg pointer-events-none"
          style={{
            transform: `translateX(${thumb.x - 4}px)`,
            width: thumb.w,
            background: 'var(--fg-strong)',
            transition: 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1), width 280ms cubic-bezier(0.22, 1, 0.36, 1)',
            willChange: 'transform, width',
          }}
        />
      )}

      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <button
            ref={(el) => { itemRefs.current[opt.value] = el; }}
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={opt.disabled}
            // WAI-ARIA radiogroup: a single tab stop (the checked radio), with
            // arrow keys moving selection between the enabled options.
            tabIndex={active ? 0 : -1}
            onClick={() => { if (!opt.disabled) onChange(opt.value); }}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowRight' && e.key !== 'ArrowDown' &&
                  e.key !== 'ArrowLeft' && e.key !== 'ArrowUp') return;
              e.preventDefault();
              const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
              const n = options.length;
              for (let step = 1; step <= n; step++) {
                const next = options[(i + dir * step + n * step) % n];
                if (next && !next.disabled) {
                  onChange(next.value);
                  itemRefs.current[next.value]?.focus();
                  break;
                }
              }
            }}
            className="relative z-[1] px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-eyebrow outline-none transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[var(--fg-accent)]"
            style={{
              color: active ? 'var(--bg-canvas)' : 'var(--fg-muted)',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
