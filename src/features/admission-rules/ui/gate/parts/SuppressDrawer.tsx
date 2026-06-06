import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import type { RuleEvaluation } from '@entities/admission';
import { useOverrideAudit } from '../../../model/selectors';
import { ModalShell, Field, EXPIRY_OPTIONS } from './ModalShell';

// "Suppress" drawer — narrower bypass scoped to one (rule, file) on this
// branch. Always carries an expiry so the mute can't rot. Writes to the
// suppression ledger via the store facade.

export function SuppressDrawer({
  evaluation, prSeed, target, onClose,
}: {
  evaluation: RuleEvaluation;
  prSeed: number;
  target: { fileId: number; filePath: string };
  onClose: () => void;
}) {
  const { t } = useTranslation('admission');
  const { recordSuppression } = useOverrideAudit();
  const [reason, setReason] = useState('');
  const [expiryIdx, setExpiryIdx] = useState(1); // default 7d

  const submit = () => {
    if (!reason.trim()) return;
    const expiry = EXPIRY_OPTIONS[expiryIdx];
    if (!expiry) return;
    recordSuppression({
      prSeed,
      ruleId: evaluation.ruleId,
      ruleName: evaluation.ruleName,
      fileId: target.fileId,
      filePath: target.filePath,
      actor: 'sondoo',
      reason: reason.trim(),
      severity: evaluation.severity,
      expiresAt: Date.now() + expiry.ms,
    });
    onClose();
  };

  return (
    <ModalShell title={t('gate.suppress.title', { path: target.filePath })} onClose={onClose}>
      <div className="p-4 flex flex-col gap-3">
        <p className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>
          <Trans
            i18nKey="gate.suppress.intro"
            ns="admission"
            values={{ path: target.filePath }}
            components={[
              <code
                key="path"
                className="font-mono px-1 py-px rounded"
                style={{ background: 'var(--bg-surface-muted)', color: 'var(--fg-strong)' }}
              />,
            ]}
          />
        </p>
        <Field label={t('gate.suppress.reasonLabel')}>
          <textarea
            value={reason}
            onChange={(e) => { setReason(e.target.value); }}
            rows={2}
            placeholder={t('gate.suppress.reasonPlaceholder')}
            className="w-full text-[12px] px-2 py-1.5 rounded outline-none resize-none"
            style={{
              border: '1px solid var(--border-default)',
              background: 'var(--bg-canvas)',
              color: 'var(--fg-strong)',
            }}
          />
        </Field>
        <Field label={t('gate.suppress.expiresLabel')}>
          <div className="flex items-center gap-1">
            {EXPIRY_OPTIONS.map((opt, i) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => { setExpiryIdx(i); }}
                className="h-7 px-2.5 rounded-md text-[11px] transition-colors"
                style={{
                  border: '1px solid var(--border-default)',
                  background: i === expiryIdx ? 'var(--bg-active)' : 'transparent',
                  color: i === expiryIdx ? 'var(--fg-strong)' : 'var(--fg-muted)',
                  fontWeight: i === expiryIdx ? 600 : 400,
                }}
              >
                {t(`gate.expiry.${opt.key}`)}
              </button>
            ))}
          </div>
        </Field>
        <div className="flex items-center gap-2 mt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-7 px-3 rounded-md text-[11px]"
            style={{
              border: '1px solid var(--border-default)',
              color: 'var(--fg-muted)',
            }}
          >
            {t('gate.modal.cancel')}
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={submit}
            disabled={!reason.trim()}
            className="h-7 px-3 rounded-md text-[11px] font-medium"
            style={{
              background: 'var(--fg-strong)',
              color: 'var(--bg-canvas)',
              opacity: reason.trim() ? 1 : 0.4,
              cursor: reason.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            {t('gate.suppress.submit')}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
