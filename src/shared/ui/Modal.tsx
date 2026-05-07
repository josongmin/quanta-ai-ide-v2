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
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
};

export function Modal({
  open, onClose, children, width = 640, ariaLabel = 'Dialog',
  ariaLabelledBy, ariaDescribedBy,
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

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-8 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
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
          background: 'var(--bg-surface)',
          color: 'var(--fg-default)',
          borderColor: 'var(--border-default)',
        }}
        className="max-w-[calc(100vw-32px)] max-h-[calc(100vh-64px)] overflow-hidden rounded-2xl border shadow-xl outline-none"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
