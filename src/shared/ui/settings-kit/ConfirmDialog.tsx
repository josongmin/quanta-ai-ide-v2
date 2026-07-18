import { useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { useScrollLock } from '@shared/lib';

import { ModalBackdrop } from '../ModalBackdrop';
import { useDialogA11y } from '../useDialogA11y';
import { Button } from '../forms';

// Confirmation dialog used 16+ times across the settings/admin stage pages
// ("Delete label?", "Remove member?", "Rotate all secrets?", "Delete org?").
//
// Reproduces the existing hand-rolled panel byte-for-byte: an elevated surface
// (`--bg-elevated` / `--border-default` / `--shadow-md` / `rounded-lg`), a
// `p-5` body with an AlertTriangle (or custom icon) + title row and a muted
// description, then a Cancel / Confirm footer on a `--bg-surface-muted` strip.
//
// Two variants from the audit:
//   • danger        — red confirm Button (the common case)
//   • requireTyped… — the GeneralPage "type the org name to confirm" gate,
//                     which disables Confirm until the typed text matches.
//
// Compose: ModalBackdrop + useDialogA11y + useScrollLock + shared <Button>.

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button. Defaults to true (most confirms are destructive). */
  danger?: boolean;
  /** Override the leading icon. Defaults to a danger-toned AlertTriangle. */
  icon?: ReactNode;
  /** Extra content between description and footer (e.g. extra warning copy). */
  children?: ReactNode;
  /** Render the title in a monospaced font (used for resource names). */
  monoTitle?: boolean;
  /** Panel width in px. Defaults to 420 (the standard confirm width). */
  width?: number;
  /**
   * When set, renders a confirmation text input and disables Confirm until the
   * typed value exactly equals this string (GeneralPage org-name pattern).
   */
  requireTypedConfirmation?: string;
  /** Disables Confirm while the action is in flight (prevents double-submit). */
  busy?: boolean;
};

export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = true,
  icon,
  children,
  monoTitle = false,
  width = 420,
  requireTypedConfirmation,
  busy = false,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [typed, setTyped] = useState('');
  useDialogA11y(dialogRef, open, onCancel);
  useScrollLock(open);

  if (!open) return null;

  const needsType = requireTypedConfirmation != null;
  const matches = !needsType || typed === requireTypedConfirmation;

  const leadingIcon = icon ?? (
    <AlertTriangle className="w-4 h-4" style={{ color: 'var(--intent-danger-fg)' }} />
  );

  return createPortal(
    <>
      <ModalBackdrop onClick={onCancel} z="z-40" alpha={0.45} label="Close dialog" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Confirm'}
        tabIndex={-1}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 rounded-lg overflow-hidden outline-none"
        style={{
          width,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            {leadingIcon}
            <span
              className={`text-base font-semibold${monoTitle ? ' font-mono' : ''}`}
              style={{ color: 'var(--fg-strong)' }}
            >
              {title}
            </span>
          </div>
          {description && (
            <p className="text-base leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
              {description}
            </p>
          )}
          {children}
          {needsType && (
            <input
              value={typed}
              onChange={(e) => { setTyped(e.target.value); }}
              placeholder={requireTypedConfirmation}
              className="h-9 rounded-md px-3 text-base outline-none font-mono"
              style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}
            />
          )}
        </div>
        <div
          className="flex items-center justify-end gap-2 px-4 py-3"
          style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}
        >
          <Button variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            size="md"
            disabled={!matches || busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </>,
    document.body,
  );
}
