import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Row, Field, Button, Divider } from '@shared/ui/forms';
import { MeModal } from '../../../parts/MeModal';

// Demo-only account panel. Real account deletion is wired in
// me-stage/real/AccountReal.tsx (requestAccountDeletion over better-auth),
// which renders instead whenever env.useRealAuth is on. In this standalone
// demo there is no backend, so the primary action is honestly DISABLED with
// an accessible reason rather than faking a successful deletion.

export function DangerSection() {
  const { t } = useTranslation('me');
  const demoReason = t('account.danger.reason');
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [reason, setReason] = useState('');

  const required = 'delete sora@acme.com';
  const matched = confirmText.trim().toLowerCase() === required;

  const close = useCallback(() => { setOpen(false); setConfirmText(''); }, []);

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
              {t('account.danger.zone')}
            </span>
          </div>
        </div>
        <div className="px-4 py-4 flex flex-col gap-2">
          <Row
            label={t('account.danger.deleteLabel')}
            sub={t('account.danger.deleteSub')}
            danger
          >
            <Button variant="danger" onClick={() => { setOpen(true); }} leading={<Trash2 className="w-3 h-3" />}>
              {t('account.danger.deleteButton')}
            </Button>
          </Row>
        </div>
      </div>

      {open && (
        <MeModal onClose={close} widthClass="max-w-[440px]" borderColor="var(--intent-danger-fg)">
          <div className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'var(--intent-danger-bg)' }}
              >
                <AlertTriangle className="w-4 h-4" style={{ color: 'var(--intent-danger-fg)' }} />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
                  {t('account.danger.modalTitle')}
                </h3>
                <p className="text-base leading-snug" style={{ color: 'var(--fg-muted)' }}>
                  {t('account.danger.modalBodyPrefix')}<span className="font-mono">sora@acme.com</span>{t('account.danger.modalBodySuffix')}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <Field
                label={t('account.danger.confirmLabel', { phrase: required })}
                value={confirmText}
                onChange={(e) => { setConfirmText(e.target.value); }}
                placeholder={required}
                autoFocus
                error={confirmText.length > 0 && !matched ? t('account.danger.noMatch') : undefined}
              />
              <label className="flex flex-col gap-1.5">
                <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>
                  {t('account.danger.reasonLabel')}
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
                  <option value="">{t('account.danger.reasonOptions.none')}</option>
                  <option value="duplicate">{t('account.danger.reasonOptions.duplicate')}</option>
                  <option value="not-using">{t('account.danger.reasonOptions.notUsing')}</option>
                  <option value="too-expensive">{t('account.danger.reasonOptions.tooExpensive')}</option>
                  <option value="missing-feature">{t('account.danger.reasonOptions.missingFeature')}</option>
                  <option value="found-alternative">{t('account.danger.reasonOptions.foundAlternative')}</option>
                  <option value="other">{t('account.danger.reasonOptions.other')}</option>
                </select>
              </label>
            </div>

            <p className="text-sm leading-snug -mt-1" style={{ color: 'var(--fg-subtle)' }}>
              {demoReason}
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="ghost" size="md" onClick={close}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="danger"
                size="md"
                disabled
                title={demoReason}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t('account.danger.confirmDelete')}
              </Button>
            </div>
        </MeModal>
      )}
    </>
  );
}
