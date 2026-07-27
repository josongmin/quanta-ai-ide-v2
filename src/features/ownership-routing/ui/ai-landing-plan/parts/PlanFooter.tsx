import { useTranslation } from 'react-i18next';
import type { OwnershipZone, RefactorStack } from '@entities/ownership';
import { FooterButton } from './primitives';

export function PlanFooter({
  zone,
  stack,
  onClose,
}: {
  zone: OwnershipZone;
  stack: RefactorStack;
  onClose: () => void;
}) {
  const { t } = useTranslation('ownership');
  return (
    <footer
      className="px-5 py-3 border-t flex items-center justify-between gap-3 flex-wrap"
      style={{ borderColor: 'var(--border-muted)' }}
    >
      <div
        className="text-sm font-semibold"
        style={{ color: 'var(--fg-default)' }}
      >
        <span
          className="text-2xs font-black uppercase tracking-[0.22em] mr-1.5"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {t('plan.footer.planReady')}
        </span>
        {t('plan.footer.estimatedPrefix')}{' '}
        <span style={{ color: 'var(--fg-strong)' }}>
          {stack.totalEstimatedDays}
        </span>{' '}
        {t('plan.footer.dayUnit', { count: stack.totalEstimatedDays })}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <FooterButton
          label={t('plan.footer.openDrafts')}
          onClick={() => {
            console.warn('[AILandingPlanModal] open-as-draft-prs', {
              zoneId: zone.id,
              stackId: stack.id,
            });
          }}
        />
        <FooterButton
          label={t('plan.footer.copyChecklist')}
          onClick={() => {
            console.warn('[AILandingPlanModal] copy-as-checklist', {
              zoneId: zone.id,
              stackId: stack.id,
            });
          }}
        />
        <FooterButton label={t('plan.footer.close')} onClick={onClose} primary />
      </div>
    </footer>
  );
}
