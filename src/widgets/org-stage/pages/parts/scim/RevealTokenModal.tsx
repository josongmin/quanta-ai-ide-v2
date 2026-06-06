import { Check, X } from 'lucide-react';
import { Button } from '@shared/ui/forms';
import { CopyableCode } from '@shared/ui';

// NOTE: modal chrome kept hand-rolled (not SettingsModal): it uses a plain
// `fixed inset-0` scrim at alpha 0.55 (not the shared ModalBackdrop at 0.45),
// and its footer button is disabled until the token is acknowledged. The inner
// reveal-once code block IS migrated to the shared CopyableCode.
export function RevealTokenModal({
  token, saved, onSaved, onClose,
}: { token: string; saved: boolean; onSaved: () => void; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.55)' }} />
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[520px] rounded-lg overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-muted)' }}>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" style={{ color: 'var(--intent-success-fg)' }} />
            <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>SCIM token created</span>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 inline-flex items-center justify-center" style={{ color: 'var(--fg-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-3">
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
            Copy and store this token now — for security, it can&apos;t be shown again.
          </p>
          <CopyableCode value={token} />
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}>
          <Button variant="primary" size="md" disabled={saved} onClick={() => { onSaved(); onClose(); }}>
            {saved ? 'Saved' : "I've saved it"}
          </Button>
        </div>
      </div>
    </>
  );
}
