import { useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Check, Sparkles, Clock, Receipt } from 'lucide-react';
import type { WizardData } from '../../wizard';
import { AccentBanner } from '../../primitives/AccentBanner';
import { ADDONS, type Plan } from './data';

// Summary — calculates monthly total, annual savings, trial info.
export function Summary({
  value, plan,
}: { value: WizardData['plan']; plan: Plan }) {
  const { t } = useTranslation('onboarding');
  const calc = useMemo(() => {
    const seatPrice = (value.cycle === 'annual' ? plan.annual : plan.monthly) ?? 0;
    const baseMonthly = seatPrice * value.seats;
    let addonMonthly = 0;
    for (const a of ADDONS) {
      if (value.addons[a.id] && a.availableOn.includes(plan.id)) {
        addonMonthly += a.monthlyPerSeat * value.seats;
      }
    }
    const totalMonthly = baseMonthly + addonMonthly;
    const annualEquiv = totalMonthly * 12;
    const monthlyEquivIfPaidMonthly =
      ((plan.monthly ?? 0) * value.seats
       + ADDONS.reduce((s, a) => s + (value.addons[a.id] ? a.monthlyPerSeat : 0), 0) * value.seats);
    const savedAnnual = value.cycle === 'annual'
      ? Math.max(0, monthlyEquivIfPaidMonthly * 12 - annualEquiv)
      : 0;
    return { baseMonthly, addonMonthly, totalMonthly, annualEquiv, savedAnnual };
  }, [value, plan]);

  if (plan.id === 'enterprise') {
    return (
      <AccentBanner
        icon={Sparkles}
        title={t('plan.summary.enterpriseTitle')}
        body={t('plan.summary.enterpriseBody')}
      />
    );
  }

  if (plan.id === 'free') {
    return (
      <div
        className="flex items-start gap-3 px-3 py-3 rounded-md"
        style={{ background: 'var(--intent-success-bg)', border: '1px solid var(--intent-success-fg)' }}
      >
        <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--intent-success-fg)' }} />
        <div className="flex flex-col gap-0.5 text-sm leading-snug">
          <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
            {t('plan.summary.freeTitle')}
          </span>
          <span style={{ color: 'var(--fg-muted)' }}>
            <Trans
              i18nKey="plan.summary.freeBody"
              t={t}
              components={[<span key="0" className="font-mono" />]}
            />
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-2.5 px-3 py-3 rounded-md"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div className="flex items-center gap-2">
        <Receipt className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--fg-strong)' }}>
          {value.cycle === 'annual' ? t('plan.summary.annualSubscription') : t('plan.summary.monthlySubscription')}
        </span>
        {plan.trial && (
          <span
            className="ml-auto text-2xs uppercase tracking-eyebrow font-semibold inline-flex items-center gap-1"
            style={{ color: 'var(--fg-accent)' }}
          >
            <Clock className="w-2.5 h-2.5" />
            {t('plan.summary.trialInfo', { days: plan.trial, chargeDay: plan.trial + 1 })}
          </span>
        )}
      </div>

      <dl className="grid grid-cols-1 gap-1 text-sm tabular-nums">
        <SummaryRow
          label={t('plan.summary.baseLine', { plan: t(`plan.plans.${plan.id}Name`), seats: value.seats, price: value.cycle === 'annual' ? plan.annual : plan.monthly })}
          value={`$${calc.baseMonthly.toFixed(0)}`}
        />
        {ADDONS.map((a) => value.addons[a.id] && a.availableOn.includes(plan.id) && (
          <SummaryRow
            key={a.id}
            label={t('plan.summary.addonLine', { addon: t(`plan.addonList.${a.id}Label`), seats: value.seats, price: a.monthlyPerSeat })}
            value={`$${(a.monthlyPerSeat * value.seats).toFixed(0)}`}
          />
        ))}
        <div className="h-px my-1" style={{ background: 'var(--border-muted)' }} />
        <SummaryRow label={t('plan.summary.monthly')} value={t('plan.summary.monthlyValue', { amount: calc.totalMonthly.toFixed(0) })} bold />
        {value.cycle === 'annual' && (
          <>
            <SummaryRow label={t('plan.summary.billedAnnually')} value={t('plan.summary.billedAnnuallyValue', { amount: calc.annualEquiv.toFixed(0) })} />
            {calc.savedAnnual > 0 && (
              <SummaryRow
                label={t('plan.summary.savedVsMonthly')}
                value={t('plan.summary.savedValue', { amount: calc.savedAnnual.toFixed(0) })}
                savings
              />
            )}
          </>
        )}
      </dl>

      <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
        {t('plan.summary.proRatedNote')}
      </span>
    </div>
  );
}

function SummaryRow({
  label, value, bold = false, savings = false,
}: { label: string; value: string; bold?: boolean; savings?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{
        color: bold ? 'var(--fg-strong)' : 'var(--fg-muted)',
        fontWeight: bold ? 600 : 400,
      }}>
        {label}
      </span>
      <span
        className="font-mono"
        style={{
          color: savings ? 'var(--intent-success-fg)' : bold ? 'var(--fg-strong)' : 'var(--fg-default)',
          fontWeight: bold ? 600 : 400,
        }}
      >
        {value}
      </span>
    </div>
  );
}
