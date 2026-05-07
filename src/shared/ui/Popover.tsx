import { useEffect, useRef, useState, type ReactNode } from 'react';

// Anchored popover. Caller renders the trigger; Popover lays its `children`
// out below (or above, when there's no room) and handles click-outside.
//
// Not a `role=dialog` — it's a transient menu/listbox. We don't trap focus
// here; instead we close when focus moves outside via Tab. The caller picks
// the appropriate `role` (default `menu`).

type Props = {
  trigger: (api: { open: boolean; toggle: () => void; close: () => void }) => ReactNode;
  children: ReactNode;
  align?: 'start' | 'end' | 'center';
  width?: number | string;
  role?: 'menu' | 'listbox' | 'dialog' | 'tooltip';
};

export function Popover({ trigger, children, align = 'end', width, role = 'menu' }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    // Tabbing past the last focusable inside the popover (or before the
    // first) should close it rather than trap. We listen on focusin at the
    // document level — if focus lands outside the wrapper, close.
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (wrapRef.current && !wrapRef.current.contains(target)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [open]);

  const alignClass =
    align === 'start' ? 'left-0' :
    align === 'center' ? 'left-1/2 -translate-x-1/2' : 'right-0';

  return (
    <div ref={wrapRef} className="relative">
      {trigger({ open, toggle: () => { setOpen((v) => !v); }, close: () => { setOpen(false); } })}
      {open && (
        <div
          ref={panelRef}
          style={{ width }}
          className={`absolute top-full mt-2 z-[150] ${alignClass}`}
          role={role}
        >
          {children}
        </div>
      )}
    </div>
  );
}
