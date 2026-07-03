import type { Routine, TranslateFn } from '../types';

export function RoutineSummary({
  routine, isDark, t,
}: {
  routine: Routine;
  isDark: boolean;
  t: TranslateFn;
}) {
  const heading = isDark ? 'text-white/85' : 'text-black/85';
  const muted = isDark ? 'text-white/55' : 'text-black/55';
  const faint = isDark ? 'text-white/35' : 'text-black/40';
  const card = isDark ? 'bg-white/[0.025] border-white/[0.06]' : 'bg-black/[0.02] border-black/[0.06]';

  const m = routine.metrics;
  return (
    <div className={`rounded-lg border ${card} px-4 py-3`}>
      <div className={`text-base leading-relaxed ${heading} mb-2`}>{routine.description}</div>
      <div className="grid grid-cols-4 gap-3">
        <Stat label={t('metrics.successRate')} value={`${Math.round(m.successRate * 100)}%`} isDark={isDark} />
        <Stat label={t('metrics.merged')} value={String(m.prsMerged30d)} isDark={isDark} />
        <Stat label={t('metrics.netLoc')} value={(m.netLocDelta > 0 ? '+' : '') + String(m.netLocDelta)} isDark={isDark} />
        <Stat label={t('metrics.spent')} value={`$${m.spentUsd.toFixed(2)}`} isDark={isDark} />
      </div>
      <div className={`mt-2 text-2xs font-bold uppercase tracking-eyebrow ${faint}`}>
        {t('metrics.thirtyDay')}
      </div>
      <div className={`mt-2 flex flex-wrap gap-1.5 text-xs font-mono ${muted}`}>
        <Pill text={t('rail.memoryItems', { n: routine.memoryItemCount })} isDark={isDark} />
        <Pill text={t('rail.metricSaved', { h: m.reviewHoursSaved.toFixed(1) })} isDark={isDark} />
        <Pill text={`reviewer Δ ${m.reviewerTouches.toFixed(1)}`} isDark={isDark} />
      </div>
    </div>
  );
}

function Stat({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  const muted = isDark ? 'text-white/45' : 'text-black/55';
  const heading = isDark ? 'text-white/85' : 'text-black/85';
  return (
    <div>
      <div className={`text-2xs font-bold uppercase tracking-eyebrow ${muted}`}>{label}</div>
      <div className={`text-lg font-mono tabular-nums ${heading}`}>{value}</div>
    </div>
  );
}

function Pill({ text, isDark }: { text: string; isDark: boolean }) {
  const tone = isDark ? 'bg-white/[0.04] text-white/65' : 'bg-black/[0.04] text-black/65';
  return <span className={`inline-flex items-center px-1.5 py-px rounded-md ${tone}`}>{text}</span>;
}
