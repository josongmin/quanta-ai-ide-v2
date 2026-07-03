import { useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@shared/ui/forms';
import { useDialogA11y } from '@shared/ui';
import type { Connection } from './types';

// ─────────────────────────────────────────────────────────────────────────
// Remove confirmation

export function RemoveModal({
  connection, onClose, onConfirm,
}: { connection: Connection; onClose: () => void; onConfirm: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(dialogRef, true, onClose);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 popover-backdrop-in"
      style={{ background: 'var(--bg-scrim)' }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="w-full max-w-[420px] rounded-md p-5 popover-panel-in flex flex-col gap-4 outline-none"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'var(--intent-danger-bg)' }}
          >
            <X className="w-4 h-4" style={{ color: 'var(--intent-danger-fg)' }} />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
              Disconnect {connection.provider}?
            </h3>
            <p className="text-base leading-snug" style={{ color: 'var(--fg-muted)' }}>
              {connection.category === 'identity'
                ? `You won't be able to sign in with ${connection.provider} after this. Make sure you have another sign-in method first.`
                : `Stops all ${connection.provider} actions and notifications. Anything queued will be canceled.`}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" size="md" onClick={onClose}>Cancel</Button>
          <Button variant="danger" size="md" onClick={onConfirm}>
            Disconnect
          </Button>
        </div>
      </div>
    </div>
  );
}
