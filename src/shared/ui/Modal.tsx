import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { useDialogA11y } from './useDialogA11y';

// Centered modal with portal + scroll lock + Escape close + click-outside.
// Use for short-lived dialogs (forms, settings, confirms). For long-lived
// side panels (workspace inspector etc.), use <Drawer> instead.

type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: number | string;
  /** Caps the dialog box width; useful when `width` is `'100%'` and the
   *  dialog should still stop at a comfortable reading column. */
  maxWidth?: number | string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  /** Position along the cross-axis. `'top'` pulls the dialog ~12vh down
   *  from the top of the viewport so a long settings list doesn't have to
   *  vertical-center every time it expands. */
  align?: 'center' | 'top';
};

export function Modal({
  open, onClose, children, width = 640, maxWidth, ariaLabel = 'Dialog',
  ariaLabelledBy, ariaDescribedBy, align = 'center',
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(dialogRef, open, onClose);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const justify = align === 'top' ? 'items-start pt-[12vh]' : 'items-center';

  return createPortal(
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[var(--z-modal)] flex justify-center p-4 sm:p-6 bg-[var(--bg-scrim)] backdrop-blur-sm ${justify}`}
      onClick={onClose}
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- stops propagation so backdrop click does not dismiss; dialog focus/keyboard handled by useDialogA11y */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        {...(ariaLabelledBy ? { 'aria-labelledby': ariaLabelledBy } : { 'aria-label': ariaLabel })}
        {...(ariaDescribedBy ? { 'aria-describedby': ariaDescribedBy } : {})}
        tabIndex={-1}
        onClick={(e) => { e.stopPropagation(); }}
        style={{
          width,
          maxWidth: maxWidth ?? 'calc(100vw - 32px)',
          background: 'var(--bg-surface)',
          color: 'var(--fg-default)',
          borderColor: 'var(--border-default)',
        }}
        className="max-h-[calc(100vh-64px)] overflow-hidden rounded-2xl border shadow-xl outline-none"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
