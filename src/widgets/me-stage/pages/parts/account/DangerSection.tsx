import { useCallback, useRef, useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Row, Field, Button, Divider } from '@shared/ui/forms';
import { useDialogA11y } from '@shared/ui';

// Demo-only account panel. Real account deletion is wired in
// me-stage/real/AccountReal.tsx (requestAccountDeletion over better-auth),
// which renders instead whenever env.useRealAuth is on. In this standalone
// demo there is no backend, so the primary action is honestly DISABLED with
// an accessible reason rather than faking a successful deletion.
const DEMO_REASON = 'Not available in this demo build — account deletion needs a signed-in backend.';

export function DangerSection() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [reason, setReason] = useState('');

  const required = 'delete sora@acme.com';
  const matched = confirmText.trim().toLowerCase() === required;

  const dialogRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => { setOpen(false); setConfirmText(''); }, []);
  useDialogA11y(dialogRef, open, close);

  return (
    <>
      <Divider />
      <div
        className="mt-6 rounded-md overflow-hidden"
        style={{ border: '1px solid var(--intent-danger-fg)' }}
      >
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ background: 'var(--intent-danger-bg)' }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'var(--intent-danger-fg)' }} />
            <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>
              Danger zone
            </span>
          </div>
        </div>
        <div className="px-4 py-4 flex flex-col gap-2">
          <Row
            label="Delete this account"
            sub="Permanently removes your profile, comments, and tokens. You'll be removed from all organizations. This action cannot be undone."
            danger
          >
            <Button variant="danger" onClick={() => { setOpen(true); }} leading={<Trash2 className="w-3 h-3" />}>
              Delete account
            </Button>
          </Row>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 popover-backdrop-in"
          style={{ background: 'var(--bg-scrim)' }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            className="w-full max-w-[440px] rounded-md p-5 popover-panel-in flex flex-col gap-4 outline-none"
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
                <AlertTriangle className="w-4 h-4" style={{ color: 'var(--intent-danger-fg)' }} />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
                  Delete your account?
                </h3>
                <p className="text-base leading-snug" style={{ color: 'var(--fg-muted)' }}>
                  This permanently deletes <span className="font-mono">sora@acme.com</span>,
                  your reviews, comments, AI usage history, and personal access tokens. You&apos;ll be removed from
                  3 organizations. Your contributions remain attributed to a deleted user.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <Field
                label={`Type "${required}" to confirm`}
                value={confirmText}
                onChange={(e) => { setConfirmText(e.target.value); }}
                placeholder={required}
                autoFocus
                error={confirmText.length > 0 && !matched ? 'Doesn\'t match exactly.' : undefined}
              />
              <label className="flex flex-col gap-1.5">
                <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>
                  Reason for leaving (optional)
                </span>
                <select
                  value={reason}
                  onChange={(e) => { setReason(e.target.value); }}
                  className="h-8 rounded-md px-2.5 text-base outline-none cursor-pointer"
                  style={{
                    background: 'var(--bg-surface-muted)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--fg-strong)',
                  }}
                >
                  <option value="">No reason</option>
                  <option value="duplicate">I have another account</option>
                  <option value="not-using">I&apos;m not using it anymore</option>
                  <option value="too-expensive">Too expensive</option>
                  <option value="missing-feature">Missing a feature I need</option>
                  <option value="found-alternative">Found an alternative</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>

            <p className="text-sm leading-snug -mt-1" style={{ color: 'var(--fg-subtle)' }}>
              {DEMO_REASON}
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="ghost" size="md" onClick={close}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                disabled
                title={DEMO_REASON}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Permanently delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
