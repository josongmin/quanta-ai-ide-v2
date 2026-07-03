import { useRef, type ReactNode } from 'react';
import { Check, X } from 'lucide-react';

import { Button } from '../forms';
import { useDialogA11y } from '../useDialogA11y';
import { CopyableCode } from './CopyableCode';

// Shared "reveal-once secret" modal used across org/ws admin pages (SCIM token,
// OAuth PAT, workspace secret). A newly-minted secret value is shown exactly
// once: copy it now, acknowledge to dismiss, it can't be shown again.
//
// NOTE — intentionally NOT built on SettingsModal: it uses a heavier opaque
// scrim (rgba(0,0,0,0.55), no ModalBackdrop/blur), a centered 520px panel, and a
// primary-only footer. SettingsModal reproduces none of that, so the chrome
// stays hand-rolled here — but centralized so the 3+ call sites share one copy.
// The inner value box reuses the shared <CopyableCode />. a11y (Escape / focus
// trap / focus restore) is added via useDialogA11y, which the originals lacked.
//
// Two title placements:
//   • header bar (showClose): title sits in a bordered top bar with a close-X
//     (SCIM variant)
//   • inline (default): title sits on a Check-icon line inside the body
//     (OAuth / workspace-secret variants); `titleMono` renders it monospaced.

const DEFAULT_DESCRIPTION =
  "Copy and store this token now — for security, it can't be shown again.";

type Props = {
  /** Success title, e.g. "SCIM token created" or `Token "foo" created`. */
  title: ReactNode;
  /** The reveal-once secret value. */
  value: string;
  /** Body copy above the value box. Defaults to the standard warning line. */
  description?: ReactNode;
  /** Dismiss the modal (Escape, close-X, and the footer button all call this). */
  onDismiss: () => void;
  /**
   * When provided, the footer button acknowledges the save then dismisses, and
   * disables (showing "Saved") once `saved` is true. Omit for a plain dismiss.
   */
  onSaved?: () => void;
  /** Current saved state; only meaningful alongside `onSaved`. */
  saved?: boolean;
  /** Render a top header bar with a close-X instead of an inline title line. */
  showClose?: boolean;
  /** Render the inline title monospaced (workspace-secret variant). */
  titleMono?: boolean;
  /** Footer button label. Defaults to "I've saved it". */
  savedLabel?: string;
};

export function RevealOnceModal({
  title,
  value,
  description = DEFAULT_DESCRIPTION,
  onDismiss,
  onSaved,
  saved = false,
  showClose = false,
  titleMono = false,
  savedLabel = "I've saved it",
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(dialogRef, true, onDismiss);

  const acknowledge = () => {
    onSaved?.();
    onDismiss();
  };

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.55)' }} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[520px] rounded-lg overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
      >
        {showClose && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-muted)' }}>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" style={{ color: 'var(--intent-success-fg)' }} />
              <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>{title}</span>
            </div>
            <button type="button" onClick={onDismiss} className="w-7 h-7 inline-flex items-center justify-center" style={{ color: 'var(--fg-muted)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="p-5 flex flex-col gap-3">
          {!showClose && (
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" style={{ color: 'var(--intent-success-fg)' }} />
              <span
                className={`text-base font-semibold${titleMono ? ' font-mono' : ''}`}
                style={{ color: 'var(--fg-strong)' }}
              >
                {title}
              </span>
            </div>
          )}
          <p className="text-base leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
            {description}
          </p>
          <CopyableCode value={value} />
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}>
          <Button variant="primary" size="md" disabled={saved} onClick={acknowledge}>
            {saved ? 'Saved' : savedLabel}
          </Button>
        </div>
      </div>
    </>
  );
}
