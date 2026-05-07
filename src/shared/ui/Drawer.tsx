import { useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { useDialogA11y } from './useDialogA11y';

// Right-anchored slide-over panel. Used for the file inspector / workspace
// inspector. Click-outside backdrop closes; Escape closes.

// One of `ariaLabel` or `ariaLabelledBy` is required so the dialog has an
// accessible name. We deliberately do not default `ariaLabel` to a hard-coded
// English string — callers should pass an i18n-translated label, or point at
// a labelled heading via `ariaLabelledBy`.
type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: number | string;
  side?: 'right' | 'left';
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
};

export function Drawer({
  open, onClose, children, width = 360, side = 'right', ariaLabel,
  ariaLabelledBy, ariaDescribedBy,
}: Props) {
  const dialogRef = useRef<HTMLElement>(null);
  useDialogA11y(dialogRef, open, onClose);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex"
      onClick={onClose}
    >
      <div className="flex-1 bg-black/30" />
      <aside
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
        className={`h-full overflow-y-auto border-l shadow-xl outline-none ${
          side === 'right' ? '' : 'order-first border-l-0 border-r'
        }`}
      >
        {children}
      </aside>
    </div>,
    document.body,
  );
}
