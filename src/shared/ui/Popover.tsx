import {
  useCallback, useLayoutEffect, useRef, useState, type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import { useDialogDismiss } from './useDialogDismiss';

// Anchored popover with viewport-aware smart positioning.
//
// Why a Portal: when the trigger lives inside a narrow column (left rail,
// nested card, etc.), an `absolute` panel sized larger than that column
// pushes off-screen or visibly clips. Portaling to `document.body` lets
// us position the panel against the viewport instead of the trigger's
// scroll/overflow ancestor — same trick Radix / Floating UI / Linear use.
//
// Smart positioning rules (all measured against the viewport):
//   • Default: open below the trigger (`top-full`).
//   • If there isn't enough room below, flip above.
//   • Horizontal alignment honours `align` ('start' / 'center' / 'end')
//     but shifts inward if the panel would clip the left/right edge.
//   • An 8px viewport margin is reserved on every side so the panel
//     never sits flush against the screen edge.
//
// Not a `role=dialog` — transient menu/listbox. Click-outside + Esc close.

const VIEWPORT_PAD = 8;
const TRIGGER_GAP = 6;

type Align = 'start' | 'end' | 'center';
type Side = 'top' | 'bottom';
// 'center' renders as a viewport-centered modal with a backdrop.
// 'anchor' (legacy) tethers the panel to the trigger with smart side/align.
type Placement = 'center' | 'anchor';

type Props = {
  trigger: (api: { open: boolean; toggle: () => void; close: () => void }) => ReactNode;
  children: ReactNode;
  align?: Align;
  width?: number | string;
  /** Preferred side to open on. Will flip if there isn't enough room. */
  side?: Side;
  role?: 'menu' | 'listbox' | 'dialog' | 'tooltip';
  /** Default 'center' — viewport-centered modal. Use 'anchor' for tethered
   *  dropdowns/menus where proximity to the trigger matters. */
  placement?: Placement;
};

type Coords = {
  top: number;
  left: number;
  /** Panel max-height after viewport-aware clamping. Prevents the panel
   *  from ever being taller than the visible window (it scrolls inside). */
  maxHeight: number;
};

export function Popover({
  trigger, children, align = 'end', width, side = 'bottom', role = 'menu',
  placement = 'center',
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerSlotRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<Coords | null>(null);

  // Esc + focus-out + click-outside close. The portal panel lives outside the
  // trigger wrapper in the DOM, so the shared `useClickOutside` (single-ref)
  // can't be reused — `useDialogDismiss` treats both refs as "inside".
  const close = useCallback(() => { setOpen(false); }, []);
  useDialogDismiss(wrapRef, panelRef, open, close);

  // Viewport-aware positioning. Recomputes on open, on every scroll
  // anywhere (capture phase catches inner scroll containers too), and on
  // resize. The panel is measured *after* a frame so its real width/height
  // are known — guards against align/side flips picking the wrong side
  // because we assumed a 0×0 box.
  useLayoutEffect(() => {
    if (!open) return;
    if (placement === 'center') return; // centered modal needs no measurement

    const measure = (): void => {
      const trig = triggerSlotRef.current;
      const panel = panelRef.current;
      if (!trig) return;

      const t = trig.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Panel measurement is best-effort — first paint may give 0×0;
      // we fall back to the requested width or a sensible default so
      // the initial position is close, then re-measure next frame.
      const pw = panel?.offsetWidth ?? (typeof width === 'number' ? width : 280);
      const ph = panel?.offsetHeight ?? 320;

      // Vertical: pick side with more room; flip if requested side too tight.
      const spaceBelow = vh - t.bottom - VIEWPORT_PAD;
      const spaceAbove = t.top - VIEWPORT_PAD;
      const fitsBelow = ph + TRIGGER_GAP <= spaceBelow;
      const fitsAbove = ph + TRIGGER_GAP <= spaceAbove;
      const useBottom = side === 'bottom' ? (fitsBelow || !fitsAbove) : !(fitsAbove || !fitsBelow);

      const top = useBottom
        ? t.bottom + TRIGGER_GAP
        : Math.max(VIEWPORT_PAD, t.top - TRIGGER_GAP - ph);

      // Vertical clamp: cap panel height to remaining viewport so it
      // scrolls internally instead of running off-screen.
      const maxHeight = useBottom
        ? Math.max(120, vh - top - VIEWPORT_PAD)
        : Math.max(120, t.top - TRIGGER_GAP - VIEWPORT_PAD);

      // Horizontal: align then shift to fit within the viewport.
      let left: number;
      if (align === 'center') {
        left = t.left + t.width / 2 - pw / 2;
      } else if (align === 'end') {
        left = t.right - pw;
      } else {
        left = t.left;
      }
      // Clamp to [pad, vw - pw - pad].
      const maxLeft = vw - pw - VIEWPORT_PAD;
      left = Math.max(VIEWPORT_PAD, Math.min(left, maxLeft));

      setCoords({ top, left, maxHeight });
    };

    // Two passes: initial estimate, then a real measurement after the
    // panel paints with its true dimensions.
    measure();
    const id = requestAnimationFrame(measure);

    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, align, side, width, placement]);

  return (
    <>
      <div ref={wrapRef} className="relative inline-flex">
        <div ref={triggerSlotRef} className="contents">
          {trigger({
            open,
            toggle: () => { setOpen((v) => !v); },
            close: () => { setOpen(false); },
          })}
        </div>
      </div>
      {open && placement === 'center' && createPortal(
        // Backdrop catches outside-clicks and dims the page so the modal
        // reads as a focused surface, not a floating menu. The panel is
        // a flex child so it stays viewport-centered without measuring.
        <div
          role="presentation"
          className="fixed inset-0 z-[var(--z-modal,var(--z-dropdown))] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.32)' }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={panelRef}
            role={role === 'menu' ? 'dialog' : role}
            aria-modal="true"
            style={{ width, maxHeight: 'calc(100vh - 32px)', overflow: 'auto' }}
          >
            {children}
          </div>
        </div>,
        document.body,
      )}
      {open && placement === 'anchor' && createPortal(
        <div
          ref={panelRef}
          role={role}
          className="fixed z-[var(--z-dropdown)]"
          style={{
            top: coords?.top ?? -9999,
            left: coords?.left ?? -9999,
            width,
            // Once positioned, expose the maxHeight so any scrolling
            // inside the panel honours the viewport. Children that need
            // their own scroll surface should set `overflow: auto`.
            maxHeight: coords?.maxHeight,
            // Hide until we have real coords to avoid a flash at (-9999).
            visibility: coords ? 'visible' : 'hidden',
            overflow: 'auto',
          }}
        >
          {children}
        </div>,
        document.body,
      )}
    </>
  );
}
