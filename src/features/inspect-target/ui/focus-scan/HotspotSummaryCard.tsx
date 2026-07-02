import { useMemo } from 'react';
import { Flame } from 'lucide-react';
import { useFilterRepo } from '@entities/filter-state';
import { computeHotspots, explainHotspot, type SignalKey } from '@entities/hotspot';
import type { FileRecord } from '@entities/repo';
import { useTranslation } from '@shared/i18n';
import { Badge, type BadgeVariant } from '@shared/ui/Badge';

const SIGNAL_LABEL_KEY: Record<SignalKey, string> = {
  change_pressure: 'hotspot.signal.changePressure',
  structural_friction: 'hotspot.signal.structuralFriction',
  health_deficit: 'hotspot.signal.healthDeficit',
  coupling_pressure: 'hotspot.signal.couplingPressure',
  criticality_proxy: 'hotspot.signal.criticalityProxy',
};

function percentileColor(p: number): string {
  if (p >= 0.95) return 'var(--intent-danger-vivid)';
  if (p >= 0.85) return 'var(--intent-warn-vivid)';
  return 'var(--fg-muted)';
}

function percentileVariant(p: number): BadgeVariant {
  if (p >= 0.95) return 'danger';
  if (p >= 0.85) return 'warn';
  return 'neutral';
}

export function HotspotSummaryCard({ file }: { file: FileRecord }) {
  const repo = useFilterRepo();
  const { t } = useTranslation('inspect');
  const entry = useMemo(() => computeHotspots(repo).get(file.id) ?? null, [repo, file.id]);
  if (!entry) return null;

  const explanation = explainHotspot(entry);
  const top3 = entry.contributions.slice(0, 3);
  const pctText = `${Math.round((1 - entry.percentile) * 100)}%`;
  const chipColor = percentileColor(entry.percentile);

  return (
    <div
      className="rounded-xl border p-3 space-y-2.5"
      style={{
        background: 'var(--bg-surface-muted)',
        borderColor: 'var(--border-default)',
      }}
    >
      <div className="flex items-center gap-2">
        <Flame className="w-3 h-3" style={{ color: chipColor }} />
        <span
          className="text-[9px] font-black uppercase tracking-[var(--track-eyebrow)]"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {t('hotspot.title')}
        </span>
        <Badge variant={percentileVariant(entry.percentile)} className="ml-auto">
          {t('hotspot.topPercent', { pct: pctText })}
        </Badge>
      </div>

      <div className="space-y-1.5">
        {top3.map((c) => (
          <div key={c.key} className="flex items-center gap-2">
            <span
              className="text-[9px] font-mono uppercase tracking-[var(--track-eyebrow)] w-[88px] shrink-0 truncate"
              style={{ color: 'var(--fg-muted)' }}
            >
              {t(SIGNAL_LABEL_KEY[c.key])}
            </span>
            <div
              className="flex-1 h-[3px] rounded-full overflow-hidden"
              style={{ background: 'var(--border-muted)' }}
            >
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${Math.round(c.value * 100)}%`,
                  background: 'var(--fg-default)',
                  opacity: 0.55,
                }}
              />
            </div>
            <span
              className="text-[9px] font-mono tabular-nums w-7 text-right"
              style={{ color: 'var(--fg-subtle)' }}
            >
              {Math.round(c.value * 100)}
            </span>
          </div>
        ))}
      </div>

      <p
        className="text-[10px] leading-snug"
        style={{ color: 'var(--fg-muted)' }}
      >
        {t(explanation.narrativeKey, explanation.narrativeParams)}
      </p>
    </div>
  );
}
