import type { ReactNode } from 'react';
import type { AgentTurn } from '../types';
import { useCodingStage } from '../../model/CodingStageContext';

const LATENCY_PHASE_TONE: Record<string, string> = {
  thinking: 'var(--identity-out-of-scope)',
  reading: 'var(--intent-info-fg)',
  searching: 'var(--identity-out-of-scope)',
  editing: 'var(--intent-success-fg)',
  running: 'var(--intent-warn-fg)',
  planning: 'var(--intent-danger-fg)',
  writing: 'var(--intent-info-fg)',
};

export function LatencyBar({
  durations,
  baseline,
}: {
  durations: NonNullable<AgentTurn['phaseDurationsMs']>;
  baseline?: Record<string, number>;
}) {
  const { t } = useCodingStage();
  const entries = Object.entries(durations).filter((e): e is [string, number] => e[1] != null && e[1] > 0);
  if (entries.length === 0) return null;
  const total = entries.reduce((s, [, ms]) => s + ms, 0);
  const muted = 'text-[color:var(--fg-subtle)]';
  let baselineChip: ReactNode = null;

  if (baseline != null) {
    let baseTotal = 0;
    let cmpTotal = 0;
    for (const [phase, ms] of entries) {
      const b = baseline[phase];
      if (b != null && b > 0) {
        baseTotal += b;
        cmpTotal += ms;
      }
    }
    if (baseTotal > 0 && cmpTotal > 0) {
      const ratio = cmpTotal / baseTotal;
      const isMatch = ratio >= 0.85 && ratio <= 1.15;
      const toneClass = isMatch ? muted : '';
      const toneStyle: React.CSSProperties | undefined = isMatch
        ? undefined
        : ratio < 1
          ? { color: 'var(--intent-success-fg)' }
          : { color: 'var(--intent-warn-fg)' };
      const x = (ratio < 1 ? 1 / ratio : ratio).toFixed(1);
      const label = isMatch
        ? t('latencyBaseline.match')
        : ratio < 1 ? t('latencyBaseline.faster', { x }) : t('latencyBaseline.slower', { x });
      baselineChip = (
        <span
          style={toneStyle}
          className={`shrink-0 text-2xs font-mono tabular-nums ${toneClass}`}
          title={t('latencyBaseline.tooltip')}
        >
          {label}
        </span>
      );
    }
  }

  return (
    <div
      className="mt-1.5 flex items-center gap-2"
      title={t('latency.tooltip')}
      aria-label={t('latency.label')}
    >
      <div className="flex-1 coding-latency-bar">
        {entries.map(([phase, ms]) => {
          const pct = (ms / total) * 100;
          const tone = LATENCY_PHASE_TONE[phase] ?? 'var(--fg-muted)';
          return (
            <span
              key={phase}
              style={{ width: `${pct}%`, background: tone }}
              title={`${t(`phase.${phase}`)} · ${ms}ms (${pct.toFixed(0)}%)`}
            />
          );
        })}
      </div>
      <span className={`shrink-0 text-2xs font-mono tabular-nums ${muted}`}>
        {t('latency.totalLabel', { ms: total })}
      </span>
      {baselineChip}
    </div>
  );
}
