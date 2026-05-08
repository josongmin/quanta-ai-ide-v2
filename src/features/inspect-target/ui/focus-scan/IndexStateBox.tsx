import { Activity, RefreshCw, Zap } from 'lucide-react';
import type { FileRecord } from '@entities/repo';
import { useTranslation } from '@shared/i18n';

// Index-state box — surfaces the *incremental engine* identity. Static
// metric panels collapse "this file is analyzed" into a single boolean;
// we instead show: (a) when this file's view was last refreshed, (b)
// whether the snapshot is still in sync with disk, and (c) the cost of
// re-analyzing it given the current dependency graph. The reanalysis
// estimate is `1 + blastRadius` capped — the file itself plus everything
// downstream that would invalidate.

export function IndexStateBox({ file }: { file: FileRecord }) {
  const { t } = useTranslation('inspect');

  const state = file.metrics.indexState;
  const tone = state === 'fresh' ? 'good' : state === 'indexing' ? 'caution' : 'danger';

  // Synthetic but consistent: a deterministic pseudo-time based on
  // daysSinceTouched + indexState so the demo doesn't drift between
  // renders. In production this comes from the engine's last-built tick.
  const ageSec = state === 'fresh'
    ? 30 + (file.id % 90)
    : state === 'indexing'
      ? 0
      : 600 + (file.id % 1800);

  const ageLabel = ageSec < 60
    ? t('indexState.justNow', { defaultValue: `${ageSec}s ago`, n: ageSec })
    : ageSec < 3600
      ? t('indexState.minAgo', { defaultValue: `${Math.floor(ageSec / 60)}m ago`, n: Math.floor(ageSec / 60) })
      : t('indexState.hourAgo', { defaultValue: `${Math.floor(ageSec / 3600)}h ago`, n: Math.floor(ageSec / 3600) });

  // Cost model: log-scale on blast radius, capped at ~250 ms for demo.
  const reanalyzeMs = Math.round(8 + Math.log2(1 + file.metrics.blastRadius) * 14);

  // "Dirty descendants" — files downstream that would need re-derivation.
  // We don't have a true dirty set on the model so we surface the upper
  // bound (blast radius), which is what an architect cares about anyway.
  const downstream = file.metrics.blastRadius;

  const stateLabel =
    state === 'fresh'    ? t('indexState.fresh',    { defaultValue: 'Fresh' })    :
    state === 'indexing' ? t('indexState.indexing', { defaultValue: 'Indexing' }) :
    state === 'stale'    ? t('indexState.stale',    { defaultValue: 'Stale' })    :
                           t('indexState.timeout',  { defaultValue: 'Timed out' });

  const stateColor =
    tone === 'good'    ? 'var(--intent-success-fg)' :
    tone === 'caution' ? 'var(--intent-warn-fg)' :
                         'var(--intent-danger-fg)';

  return (
    <div
      className="rounded-xl border px-3 py-2.5"
      style={{
        background: 'var(--bg-surface-muted)',
        borderColor: 'var(--border-default)',
      }}
    >
      <div className="flex items-center gap-1.5">
        <Activity className="w-3 h-3" style={{ color: 'var(--fg-subtle)' }} />
        <div
          className="text-[9px] font-black uppercase tracking-[0.18em]"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {t('indexState.title', { defaultValue: 'Index state' })}
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${state === 'indexing' ? 'animate-pulse' : ''}`}
            style={{ background: stateColor }}
          />
          <span
            className="text-[10px] font-black uppercase tracking-[0.16em]"
            style={{ color: stateColor }}
          >
            {stateLabel}
          </span>
        </span>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <Cell
          icon={<RefreshCw className="w-2.5 h-2.5" />}
          label={t('indexState.lastBuild', { defaultValue: 'Last build' })}
          value={ageLabel}
        />
        <Cell
          icon={<Zap className="w-2.5 h-2.5" />}
          label={t('indexState.recompute', { defaultValue: 'Recompute' })}
          value={`~${reanalyzeMs}ms`}
        />
        <Cell
          label={t('indexState.downstream', { defaultValue: 'Downstream' })}
          value={`${downstream} ${t('focus.filesUnit', { defaultValue: 'files' })}`}
          tone={downstream > 30 ? 'warn' : undefined}
        />
      </div>
    </div>
  );
}

function Cell({
  icon, label, value, tone,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  tone?: 'warn';
}) {
  const valueColor = tone === 'warn' ? 'var(--intent-warn-fg)' : 'var(--fg-default)';
  return (
    <div>
      <div
        className="flex items-center gap-1 text-[8.5px] font-black uppercase tracking-[0.16em]"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div
        className="mt-0.5 text-[11px] font-mono font-bold tabular-nums"
        style={{ color: valueColor }}
      >
        {value}
      </div>
    </div>
  );
}
