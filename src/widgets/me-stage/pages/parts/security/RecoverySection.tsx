import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { Section, Row, Button } from '@shared/ui/forms';
import { MeModal } from '../../../parts/MeModal';
import { useGeneratedCodes, downloadCodes } from './types';

export function RecoverySection({ onShow }: { onShow: () => void }) {
  const { t } = useTranslation('me');
  return (
    <Section
      title={t('security.recovery.title')}
      hint={t('security.recovery.hint')}
    >
      <Row
        label={t('security.recovery.available')}
        sub={<span>{t('security.recovery.sub')}</span>}
      >
        <Button leading={<RefreshCw className="w-3 h-3" />} onClick={onShow}>
          {t('security.recovery.view')}
        </Button>
      </Row>
    </Section>
  );
}

export function RecoveryCodesModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('me');
  const codes = useGeneratedCodes(10);
  return (
    <MeModal onClose={onClose} widthClass="max-w-[480px]">
      <div className="flex flex-col gap-1.5">
          <h3 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
            {t('security.recovery.modalTitle')}
          </h3>
          <p className="text-sm leading-snug" style={{ color: 'var(--fg-muted)' }}>
            {t('security.recovery.modalBody')}
          </p>
        </div>
        <div
          className="grid grid-cols-2 gap-x-6 gap-y-1.5 p-3 rounded-md font-mono text-base tabular-nums"
          style={{
            background: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-muted)',
            color: 'var(--fg-strong)',
          }}
        >
          {codes.map((c, i) => (
            <div key={c} className="flex items-center gap-2">
              <span className="text-2xs" style={{ color: 'var(--fg-subtle)' }}>{String(i + 1).padStart(2, '0')}</span>
              <span>{c}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="secondary" size="md" onClick={() => { void navigator.clipboard?.writeText(codes.join('\n')); }}>
            {t('security.recovery.copyAll')}
          </Button>
          <Button variant="secondary" size="md" onClick={() => { downloadCodes(codes); }}>
            {t('security.recovery.download')}
          </Button>
          <Button variant="secondary" size="md" onClick={() => { window.print(); }}>
            {t('security.recovery.print')}
          </Button>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="primary" size="md" onClick={onClose}>{t('security.recovery.saved')}</Button>
        </div>
    </MeModal>
  );
}
