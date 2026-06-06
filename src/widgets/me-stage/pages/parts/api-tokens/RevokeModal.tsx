import { Trash2 } from 'lucide-react';
import { Button } from '@shared/ui/forms';
import type { Token } from './types';

export function RevokeModal({
  token, onClose, onConfirm,
}: { token: Token; onClose: () => void; onConfirm: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 popover-backdrop-in"
      style={{ background: 'var(--bg-scrim)' }}
    >
      <div
        className="w-full max-w-[420px] rounded-md p-5 popover-panel-in flex flex-col gap-4"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--intent-danger-fg)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'var(--intent-danger-bg)' }}
          >
            <Trash2 className="w-4 h-4" style={{ color: 'var(--intent-danger-fg)' }} />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-[14px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
              Revoke &quot;{token.name}&quot;?
            </h3>
            <p className="text-[12px] leading-snug" style={{ color: 'var(--fg-muted)' }}>
              Any script, CLI, or integration using this token will start failing immediately.
              We&apos;ll log the revocation in your audit trail.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" size="md" onClick={onClose}>Cancel</Button>
          <Button variant="danger" size="md" onClick={onConfirm}>
            Revoke token
          </Button>
        </div>
      </div>
    </div>
  );
}
