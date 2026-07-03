import { useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useScrollLock } from '@shared/lib';

import { ModalBackdrop } from '../ModalBackdrop';
import { useDialogA11y } from '../useDialogA11y';

// Generic modal chrome for the settings/admin stage pages. Replaces the ~38
// hand-rolled `<ModalBackdrop /> + fixed left-1/2 top-1/2 -translate ... z-50`
// elevated panels scattered across org/ws/me-stage pages.
//
// Visuals are reproduced byte-for-byte from those panels (NOT from the generic
// shared <Modal>, which uses a different surface token + rounding): an elevated
// surface (`--bg-elevated`), `--border-default`, `--shadow-md`, `rounded-lg`,
// dimmed `ModalBackdrop` at alpha 0.45. Escape / focus-trap / focus-restore are
// layered on via the shared `useDialogA11y` hook for a11y parity with <Modal>.
//
// Compose:
//   • ModalBackdrop  — the dim, click-to-dismiss layer
//   • useDialogA11y  — Escape close + focus trap/restore
//   • useScrollLock  — body scroll lock while open

type Size = 'sm' | 'md' | 'lg';

// Maps to the existing per-page panel widths: 420 / 480 / 520px.
const WIDTH: Record<Size, number> = { sm: 420, md: 480, lg: 520 };

type Props = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Optional icon shown left of the title (e.g. <UserPlus />). */
  icon?: ReactNode;
  size?: Size;
  /** Body content. Rendered in a scrollable region. */
  children: ReactNode;
  /** Footer content, typically a Cancel + primary Button pair. Omit for none. */
  footer?: ReactNode;
  /** Override the panel width (number = px). Wins over `size`. */
  width?: number;
  /** Max panel height as a vh fraction. Defaults to 85 (max-h-[85vh]). */
  maxHeightVh?: number;
  /** Override the body wrapper classes (padding/gap). Defaults to `p-4 flex flex-col gap-4`. */
  bodyClassName?: string;
  ariaLabel?: string;
};

export function SettingsModal({
  open, onClose, title, icon, size = 'md', children, footer, width,
  maxHeightVh = 85, bodyClassName = 'p-4 flex flex-col gap-4', ariaLabel,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(dialogRef, open, onClose);
  useScrollLock(open);

  if (!open) return null;

  const w = width ?? WIDTH[size];

  return createPortal(
    <>
      <ModalBackdrop onClick={onClose} z="z-40" alpha={0.45} label="Close dialog" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : (ariaLabel ?? 'Dialog')}
        tabIndex={-1}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col rounded-lg overflow-hidden outline-none"
        style={{
          width: w,
          maxHeight: `${maxHeightVh}vh`,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--border-muted)' }}
        >
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>
              {title}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-md inline-flex items-center justify-center"
            style={{ color: 'var(--fg-muted)' }}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className={`${bodyClassName} overflow-y-auto`}>
          {children}
        </div>

        {footer && (
          <div
            className="flex items-center justify-end gap-2 px-4 py-3 shrink-0"
            style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </>,
    document.body,
  );
}
