import { useMemo } from 'react';
import type { TFunction } from 'i18next';
import { HEAT_METRICS, type HeatMetricKey } from '@entities/metric';
import type { TimeWindow } from '@entities/repo';
import type { useOverlay } from '../../model/OverlayContext';
import {
  DetailHeader, MetricRow, Slider, SegmentedControl,
} from './shared';

type Overlay = ReturnType<typeof useOverlay>;

const TIME_WINDOWS: readonly TimeWindow[] = ['7d', '30d', '90d'] as const;

// Threshold is meaningful only for continuous-score metrics. Cycles is
// binary (in/out of an SCC) and Confidence is categorical, so a threshold
// slider would be inert for those — hide it instead of showing a knob the
// renderer ignores.
const METRICS_WITHOUT_THRESHOLD = new Set<HeatMetricKey>(['cycles', 'unknown']);

// Heat metrics + intensity/radius/threshold sliders, plus the time-window
// segmented control that only surfaces for the time-hotspot metric.
export function HeatDetail({
  t, ov,
}: {
  t: TFunction;
  ov: Overlay;
}) {
  const isOn = ov.metric !== 'none';
  const timeActive = ov.metric === 'time-hotspot';
  const showThreshold = isOn && !METRICS_WITHOUT_THRESHOLD.has(ov.metric);
  // 'Off' is a toggle, not a metric — pull it out so it doesn't read like
  // "another red dot". Clearing happens via the header clear button.
  const realMetrics = useMemo(() => HEAT_METRICS.filter((m) => m.key !== 'none'), []);

  return (
    <div>
      <DetailHeader title={t('metric')} onClear={isOn ? () => { ov.setMetric('none'); } : undefined} />
      <div className="space-y-0.5">
        {realMetrics.map((m) => (
          <MetricRow
            key={m.key}
            active={ov.metric === m.key}
            label={m.label}
            hint={m.hint}
            hue={m.hue}
            onClick={() => { ov.setMetric(m.key); }}
          />
        ))}
      </div>

      {timeActive && (
        <div className="mt-2 pt-2 border-t border-[var(--border-default)]">
          <div className="mb-1.5 px-1 text-[9px] font-black uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-subtle)]">
            {t('panel.tile.time')}
          </div>
          <SegmentedControl
            options={TIME_WINDOWS.map((w) => ({ key: w, label: w.toUpperCase() }))}
            value={ov.timeWindow}
            onChange={(v) => { ov.setTimeWindow(v); }}
          />
        </div>
      )}

      {isOn && (
        <div className="mt-2 pt-2 border-t border-[var(--border-default)] space-y-2">
          <div className="px-1.5 text-[9px] font-black uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-subtle)]">
            {t('panel.tile.controls')}
          </div>
          <Slider label={t('controls.intensity')} value={ov.intensity} onChange={ov.setIntensity} />
          <Slider label={t('controls.radius')}    value={ov.radius}    onChange={ov.setRadius} />
          {showThreshold && (
            <Slider label={t('controls.threshold')} value={ov.threshold} onChange={ov.setThreshold} />
          )}
        </div>
      )}
    </div>
  );
}
