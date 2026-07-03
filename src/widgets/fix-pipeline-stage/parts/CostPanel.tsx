import type { TFunction } from 'i18next';
import type { CostTelemetry, CycleCost } from '@entities/fix-pipeline';
import { GlassCard, SectionHeader } from '@shared/ui';
import { formatTokens, formatUsd } from '@features/fix-pipeline-cost';

type Props = {
  cost: CostTelemetry;
  candidateCost: CycleCost | null;
  t: TFunction;
};

// Cost telemetry — Phase 1 mandatory. The unit-economics question
// ("acceptance × value > cycles × cost") can't even be asked without
// these numbers, so we surface them now even when the cost is mocked.
export function CostPanel({ cost, candidateCost, t }: Props) {
  return (
    <GlassCard className="rounded-lg p-3">
      <SectionHeader title={t('cost.header')} badge={`${cost.cycles.toString()} ${t('cost.cycles')}`} />

      <div className="grid grid-cols-3 gap-2 mt-2">
        <Stat label={t('cost.cumulative')} value={formatUsd(cost.cumulative.usd)} />
        <Stat
          label={t('cost.tokens')}
          value={`${formatTokens(cost.cumulative.tokensIn)} / ${formatTokens(cost.cumulative.tokensOut)}`}
        />
        <Stat label={t('cost.ci')} value={`${cost.cumulative.ciSeconds.toString()}s`} />
      </div>

      {candidateCost && (
        <div
          className="mt-2 rounded-md px-2 py-1.5 text-sm flex items-center justify-between"
          style={{
            background: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-muted)',
          }}
        >
          <span style={{ color: 'var(--fg-subtle)' }}>{t('cost.thisCandidate')}</span>
          <span style={{ color: 'var(--fg-default)' }}>
            {formatUsd(candidateCost.usd)} · {formatTokens(candidateCost.tokensIn + candidateCost.tokensOut)} tok
          </span>
        </div>
      )}
    </GlassCard>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md px-2 py-1.5" style={{ background: 'var(--bg-surface-muted)' }}>
      <div className="text-2xs font-black uppercase tracking-eyebrow" style={{ color: 'var(--fg-subtle)' }}>
        {label}
      </div>
      <div className="text-base font-mono mt-0.5" style={{ color: 'var(--fg-strong)' }}>
        {value}
      </div>
    </div>
  );
}
