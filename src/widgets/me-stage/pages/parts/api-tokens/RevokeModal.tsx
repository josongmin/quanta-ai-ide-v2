import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from '@shared/ui/forms';
import { useDialogA11y } from '@shared/ui';
import type { Token } from './types';

export function RevokeModal({
  token, onClose, onConfirm,
}: { token: Token; onClose: () => void; onConfirm: () => void }) {
  const { t } = useTranslation('me');
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
            <h3 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
              {t('apiTokens.revoke.title', { name: token.name })}
            </h3>
            <p className="text-base leading-snug" style={{ color: 'var(--fg-muted)' }}>
              {t('apiTokens.revoke.body')}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" size="md" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="danger" size="md" onClick={onConfirm}>
            {t('apiTokens.revoke.confirm')}
          </Button>
        </div>
      </div>
    </div>
  );
}
