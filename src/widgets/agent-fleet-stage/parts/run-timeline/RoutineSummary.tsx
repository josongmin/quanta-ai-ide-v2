import type { Routine, TranslateFn } from '../types';

export function RoutineSummary({
  routine, t,
}: {
  routine: Routine;
  t: TranslateFn;
}) {
  const heading = 'text-[var(--fg-default)]';
  const muted = 'text-[var(--fg-muted)]';
  const faint = 'text-[var(--fg-subtle)]';
  const card = 'bg-[var(--bg-surface-muted)] border-[var(--border-default)]';

  const m = routine.metrics;
  return (
    <div className={`rounded-lg border ${card} px-4 py-3`}>
      <div className={`text-base leading-relaxed ${heading} mb-2`}>{routine.description}</div>
      <div className="grid grid-cols-4 gap-3">
        <Stat label={t('metrics.successRate')} value={`${Math.round(m.successRate * 100)}%`} />
        <Stat label={t('metrics.merged')} value={String(m.prsMerged30d)} />
        <Stat label={t('metrics.netLoc')} value={(m.netLocDelta > 0 ? '+' : '') + String(m.netLocDelta)} />
        <Stat label={t('metrics.spent')} value={`$${m.spentUsd.toFixed(2)}`} />
      </div>
      <div className={`mt-2 text-2xs font-bold uppercase tracking-eyebrow ${faint}`}>
        {t('metrics.thirtyDay')}
      </div>
      <div className={`mt-2 flex flex-wrap gap-1.5 text-xs font-mono ${muted}`}>
        <Pill text={t('rail.memoryItems', { n: routine.memoryItemCount })} />
        <Pill text={t('rail.metricSaved', { h: m.reviewHoursSaved.toFixed(1) })} />
        <Pill text={`${t('metrics.reviewerTouches')} Δ ${m.reviewerTouches.toFixed(1)}`} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const muted = 'text-[var(--fg-subtle)]';
  const heading = 'text-[var(--fg-default)]';
  return (
    <div>
      <div className={`text-2xs font-bold uppercase tracking-eyebrow ${muted}`}>{label}</div>
      <div className={`text-lg font-mono tabular-nums ${heading}`}>{value}</div>
    </div>
  );
}

function Pill({ text }: { text: string }) {
  const tone = 'bg-[var(--bg-hover)] text-[var(--fg-muted)]';
  return <span className={`inline-flex items-center px-1.5 py-px rounded-md ${tone}`}>{text}</span>;
}
