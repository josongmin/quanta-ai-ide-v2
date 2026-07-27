import { useTranslation } from 'react-i18next';
import { SegmentedToggle } from '../../primitives/SegmentedToggle';

const CYCLES = ['monthly', 'annual'] as const;

export function CycleToggle({
  cycle, onChange,
}: { cycle: 'monthly' | 'annual'; onChange: (c: 'monthly' | 'annual') => void }) {
  const { t } = useTranslation('onboarding');
  return (
    <SegmentedToggle
      options={CYCLES}
      value={cycle}
      onChange={onChange}
      className="self-start"
      segmentPadding="px-3"
      renderLabel={(c) => (
        c === 'annual' ? (
          <span className="flex items-center gap-1.5">
            {t('plan.cycle.annual')}
            <span
              className="text-2xs uppercase tracking-eyebrow font-semibold px-1 py-0.5 rounded"
              style={{ background: 'var(--fg-accent)', color: 'var(--bg-canvas)' }}
            >
              {t('plan.cycle.discount')}
            </span>
          </span>
        ) : t('plan.cycle.monthly')
      )}
    />
  );
}
