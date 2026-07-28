import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Button } from '@shared/ui/forms';
import { MeModal } from '../../../parts/MeModal';
import type { Connection } from './types';

// ─────────────────────────────────────────────────────────────────────────
// Remove confirmation

export function RemoveModal({
  connection, onClose, onConfirm,
}: { connection: Connection; onClose: () => void; onConfirm: () => void }) {
  const { t } = useTranslation('me');
  return (
    <MeModal onClose={onClose} widthClass="max-w-[420px]">
      <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'var(--intent-danger-bg)' }}
          >
            <X className="w-4 h-4" style={{ color: 'var(--intent-danger-fg)' }} />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
              {t('connectedApps.remove.title', { provider: connection.provider })}
            </h3>
            <p className="text-base leading-snug" style={{ color: 'var(--fg-muted)' }}>
              {connection.category === 'identity'
                ? t('connectedApps.remove.identityBody', { provider: connection.provider })
                : t('connectedApps.remove.integrationBody', { provider: connection.provider })}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" size="md" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="danger" size="md" onClick={onConfirm}>
            {t('connectedApps.remove.confirm')}
          </Button>
        </div>
    </MeModal>
  );
}
