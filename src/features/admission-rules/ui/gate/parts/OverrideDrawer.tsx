import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@shared/i18n';
import type { RuleEvaluation, AdmissionRule } from '@entities/admission';
import { useOverrideAudit } from '../../../model/selectors';
import { ModalShell, Field, EXPIRY_OPTIONS } from './ModalShell';

// "Override" drawer — formally bypass a fired rule on this PR with a reason
// and a required expiry. Writes to the override ledger via the store facade.

export function OverrideDrawer({
  evaluation, rule, prSeed, onClose,
}: {
  evaluation: RuleEvaluation;
  rule: AdmissionRule | undefined;
  prSeed: number;
  onClose: () => void;
}) {
  const { t } = useTranslation('admission');
  const { recordOverride } = useOverrideAudit();
  const [reason, setReason] = useState('');
  const [expiryIdx, setExpiryIdx] = useState(1); // default 7d
  const [mountedAt] = useState(() => Date.now());

  const requiresApprover = rule?.override.requiresApproverRole;
  const allowsAuthor = rule?.override.allowAuthor !== false;

  const submit = () => {
    if (!reason.trim()) return;
    const expiry = EXPIRY_OPTIONS[expiryIdx];
    if (!expiry) return;
    recordOverride({
      prSeed,
      ruleId: evaluation.ruleId,
      ruleName: evaluation.ruleName,
      actor: 'sondoo',
      severity: evaluation.severity,
      reason: reason.trim(),
      expiresAt: Date.now() + expiry.ms,
    });
    onClose();
  };

  return (
    <ModalShell title={t('gate.override.title', { rule: evaluation.ruleName })} onClose={onClose}>
      <div className="p-4 flex flex-col gap-3">
        {!allowsAuthor && requiresApprover && (
          <div
            className="text-[11px] px-3 py-2 rounded-md"
            style={{
              background: 'color-mix(in oklab, var(--intent-warn-fg) 8%, transparent)',
              color: 'var(--intent-warn-fg)',
              border: '1px solid color-mix(in oklab, var(--intent-warn-fg) 30%, transparent)',
            }}
          >
            {t('gate.override.needsApprover')}{' '}
            <strong>{requiresApprover}</strong>.
          </div>
        )}
        <Field label={t('gate.override.reasonLabel')}>
          <textarea
            value={reason}
            onChange={(e) => { setReason(e.target.value); }}
            rows={3}
            placeholder={t('gate.override.reasonPlaceholder')}
            className="w-full text-[12px] px-2 py-1.5 rounded outline-none resize-none"
            style={{
              border: '1px solid var(--border-default)',
              background: 'var(--bg-canvas)',
              color: 'var(--fg-strong)',
            }}
          />
        </Field>
        <Field label={t('gate.override.expiresLabel')}>
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
        <p className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
          {t('gate.override.ledgerNote', { date: formatDate(new Date(mountedAt + (EXPIRY_OPTIONS[expiryIdx]?.ms ?? 0))) })}
        </p>
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
            {t('gate.override.submit')}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
